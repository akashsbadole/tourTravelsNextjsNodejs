import { getFlightProviderManager } from "@/lib/integrations/flight-providers/provider-manager";
import { getRedisClient } from "@/lib/cache/redis-client";
import { getFlightCacheManager } from "@/lib/cache/flight-cache";
import analyticsIntegrationService from "@/lib/services/analyticsIntegration";
import { 
  ErrorFactory, 
  FlightSearchError, 
  ValidationError, 
  NetworkError, 
  APIError,
  errorRecoveryManager 
} from "@/lib/errors/flight-search-errors";
import { 
  edgeCaseHandler, 
  AirportCodeValidator, 
  DateValidator, 
  PassengerValidator 
} from "@/lib/flight-search/edge-case-handler";
import { 
  gracefulDegradationManager,
  RetryManager 
} from "@/lib/flight-search/graceful-degradation";
import { 
  flightSearchMonitoring,
  EventType,
  LogLevel 
} from "@/lib/monitoring/flight-search-monitoring";

/**
 * Real-time flight search API endpoint
 * Integrates with external flight providers with caching and fallback
 * Enhanced with comprehensive error handling
 */
export async function GET(req) {
  const traceId = flightSearchMonitoring.logger.generateTraceId();
  const startTime = Date.now();
  
  try {
    const searchParams = Object.fromEntries(new URL(req.url).searchParams);
    const sessionId = req.headers.get('x-session-id') || null;
    const userAgent = req.headers.get('user-agent') || null;
    const referrer = req.headers.get('referer') || null;

    // Initialize monitoring
    flightSearchMonitoring.logger.info('Flight search initiated', {
      traceId,
      searchParams: sanitizeSearchParams(searchParams),
      sessionId,
      userAgent,
      referrer
    });

    // Validate search parameters with comprehensive edge case handling
    const validation = await edgeCaseHandler.validateSearchParams(searchParams);
    if (!validation.valid) {
      const validationError = new ValidationError(
        'Search parameters validation failed',
        'search_params',
        {
          context: { 
            errors: validation.errors,
            searchParams: sanitizeSearchParams(searchParams) 
          },
          suggestions: validation.errors.map(e => e.suggestions).flat()
        }
      );

      flightSearchMonitoring.errorTracker.trackError(validationError, {
        traceId,
        sessionId,
        searchParams: sanitizeSearchParams(searchParams)
      });

      return createErrorResponse(validationError, 400, traceId);
    }

    // Parse and validate search parameters
    const searchRequest = {
      origin: validation.validParams.origin.toUpperCase(),
      destination: validation.validParams.destination.toUpperCase(),
      departureDate: validation.validParams.departureDate,
      returnDate: validation.validParams.returnDate,
      tripType: searchParams.tripType || 'one_way',
      passengers: validation.validParams.passengers,
      cabinClass: validation.validParams.cabinClass || 'economy',
      filters: searchParams.filters ? JSON.parse(searchParams.filters) : {},
      currency: validation.validParams.currency || 'USD'
    };

    // Initialize providers and cache
    const providerConfig = {
      amadeus: {
        enabled: process.env.AMADEUS_ENABLED === 'true',
        apiKey: process.env.AMADEUS_API_KEY,
        apiSecret: process.env.AMADEUS_API_SECRET,
        baseUrl: process.env.AMADEUS_BASE_URL,
        options: {
          rateLimit: parseInt(process.env.AMADEUS_RATE_LIMIT) || 100
        }
      },
      static: {}
    };

    const providerManager = getFlightProviderManager(providerConfig);
    
    let cacheManager = null;
    let redisClient = null;

    // Initialize cache if enabled
    if (process.env.REDIS_ENABLED === 'true') {
      try {
        redisClient = await getRedisClient();
        cacheManager = getFlightCacheManager(redisClient, {
          searchTTL: parseInt(process.env.FLIGHT_CACHE_TTL_SEARCH) || 600,
          availabilityTTL: parseInt(process.env.FLIGHT_CACHE_TTL_AVAILABILITY) || 60,
          pricingTTL: parseInt(process.env.FLIGHT_CACHE_TTL_PRICING) || 180
        });

        flightSearchMonitoring.logger.debug('Cache initialized successfully', { traceId });
      } catch (cacheError) {
        flightSearchMonitoring.logger.warn('Cache initialization failed, proceeding without cache', {
          traceId,
          error: cacheError.message
        });
      }
    }

    // Execute search with graceful degradation
    const searchFunction = async () => {
      // Check cache first
      if (cacheManager) {
        try {
          const cacheKey = gracefulDegradationManager.generateCacheKey(searchRequest);
          const cachedResults = await cacheManager.getCachedSearchResults(searchRequest);
          
          if (cachedResults) {
            flightSearchMonitoring.metricsCollector.incrementCounter('cache_hit', {
              origin: searchRequest.origin,
              destination: searchRequest.destination
            });

            // Track analytics for cached results (non-blocking)
            const analyticsData = {
              ...searchRequest,
              sessionId,
              userAgent,
              referrer,
              source: 'cache',
              resultCount: cachedResults.data?.length || 0
            };

            analyticsIntegrationService.trackFlightSearch(analyticsData, cachedResults.data || [])
              .catch(error => flightSearchMonitoring.logger.error('Analytics tracking failed', {
                traceId,
                error: error.message
              }));

            return {
              success: true,
              data: cachedResults.data,
              metadata: {
                ...cachedResults.metadata,
                cached: true,
                cachedAt: cachedResults.cachedAt,
                source: 'cache'
              }
            };
          }
        } catch (cacheError) {
          flightSearchMonitoring.logger.warn('Cache read failed, proceeding with API call', {
            traceId,
            error: cacheError.message
          });
        }
      }

      flightSearchMonitoring.metricsCollector.incrementCounter('cache_miss', {
        origin: searchRequest.origin,
        destination: searchRequest.destination
      });

      // Perform search with provider manager
      const searchResults = await providerManager.searchFlights(searchRequest, {
        useCache: !!cacheManager,
        timeout: 30000
      });

      // Cache results if successful
      if (searchResults.success && cacheManager && searchResults.data.length > 0) {
        try {
          await cacheManager.cacheSearchResults(searchRequest, searchResults);
        } catch (cacheError) {
          flightSearchMonitoring.logger.warn('Failed to cache search results', {
            traceId,
            error: cacheError.message
          });
        }
      }

      return searchResults;
    };

    // Execute search with monitoring and graceful degradation
    const results = await flightSearchMonitoring.monitorSearch(
      searchRequest,
      () => gracefulDegradationManager.executeSearch(searchRequest, searchFunction)
    );

    // Track analytics for successful search (non-blocking)
    const analyticsData = {
      ...searchRequest,
      sessionId,
      userAgent,
      referrer,
      source: results.source || 'api',
      resultCount: results.data?.length || 0,
      degraded: results.degraded || false
    };

    analyticsIntegrationService.trackFlightSearch(analyticsData, results.data || [])
      .catch(error => flightSearchMonitoring.logger.error('Analytics tracking failed', {
        traceId,
        error: error.message
      }));

    // Log successful completion
    const duration = Date.now() - startTime;
    flightSearchMonitoring.logger.info('Flight search completed successfully', {
      traceId,
      duration,
      resultCount: results.data?.length || 0,
      source: results.source,
      degraded: results.degraded
    });

    // Return response
    return Response.json({
      success: true,
      data: results.data || [],
      metadata: {
        ...results.metadata,
        traceId,
        duration,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle different error types
    let structuredError;
    if (error instanceof FlightSearchError) {
      structuredError = error;
    } else if (error.message.includes('validation')) {
      structuredError = new ValidationError(error.message, 'search', {
        context: { originalError: error.message }
      });
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      structuredError = new NetworkError(error.message, {
        context: { originalError: error.message }
      });
    } else {
      structuredError = new APIError(
        error.message || 'Internal server error',
        500,
        {
          context: { originalError: error.message, stack: error.stack }
        }
      );
    }

    // Track error
    flightSearchMonitoring.errorTracker.trackError(structuredError, {
      traceId,
      duration,
      searchParams: sanitizeSearchParams(searchParams)
    });

    // Try error recovery
    const recovery = await errorRecoveryManager.handleRecovery(structuredError, {
      searchParams,
      traceId
    });

    flightSearchMonitoring.logger.info('Error recovery attempted', {
      traceId,
      recovery,
      errorType: structuredError.errorCode
    });

    // Log error completion
    flightSearchMonitoring.logger.error('Flight search failed', {
      traceId,
      duration,
      error: structuredError.message,
      errorCode: structuredError.errorCode,
      recovery: recovery.success
    });

    return createErrorResponse(structuredError, getStatusCodeForError(structuredError), traceId);
  }
}

/**
 * Handle POST requests for complex search parameters
 */
export async function POST(req) {
  const traceId = flightSearchMonitoring.logger.generateTraceId();
  
  try {
    const body = await req.json();
    
    flightSearchMonitoring.logger.debug('Flight search POST request', {
      traceId,
      bodyKeys: Object.keys(body)
    });
    
    // Forward to GET handler with query parameters
    const url = new URL(req.url);
    Object.keys(body).forEach(key => {
      if (typeof body[key] === 'object') {
        url.searchParams.set(key, JSON.stringify(body[key]));
      } else {
        url.searchParams.set(key, body[key]);
      }
    });

    // Create a new request with same method but updated URL
    const newReq = new Request(url.toString(), {
      method: 'GET',
      headers: req.headers
    });

    return GET(newReq);
  } catch (error) {
    const structuredError = new ValidationError(
      'Invalid request body',
      'request_body',
      {
        context: { originalError: error.message }
      }
    );

    flightSearchMonitoring.errorTracker.trackError(structuredError, {
      traceId,
      error: error.message
    });

    return createErrorResponse(structuredError, 400, traceId);
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(error, statusCode, traceId) {
  const errorResponse = error.toResponse();
  
  return Response.json({
    ...errorResponse,
    metadata: {
      traceId,
      timestamp: new Date().toISOString()
    }
  }, { 
    status: statusCode,
    headers: {
      'X-Trace-ID': traceId,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Get appropriate HTTP status code for error
 */
function getStatusCodeForError(error) {
  const statusCodeMap = {
    'VALIDATION_ERROR': 400,
    'NETWORK_ERROR': 503,
    'API_ERROR': error.statusCode || 500,
    'DATA_ERROR': 404,
    'BUSINESS_ERROR': 422,
    'SYSTEM_ERROR': 500,
    'EXTERNAL_SERVICE_ERROR': 502
  };

  return statusCodeMap[error.errorCode] || 500;
}

/**
 * Sanitize search parameters for logging
 */
function sanitizeSearchParams(params) {
  const sanitized = { ...params };
  
  // Remove sensitive information
  if (sanitized.filters) {
    try {
      const filters = typeof sanitized.filters === 'string' 
        ? JSON.parse(sanitized.filters) 
        : sanitized.filters;
      
      // Remove any sensitive filter data
      if (filters.passengerInfo) {
        delete filters.passengerInfo;
      }
      if (filters.paymentInfo) {
        delete filters.paymentInfo;
      }
      
      sanitized.filters = filters;
    } catch (e) {
      // If filters can't be parsed, remove them entirely
      delete sanitized.filters;
    }
  }

  return sanitized;
}