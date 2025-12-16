import { getFlightProviderManager } from "@/lib/integrations/flight-providers/provider-manager";
import { getRedisClient } from "@/lib/cache/redis-client";
import { getFlightCacheManager } from "@/lib/cache/flight-cache";
import analyticsIntegrationService from "@/lib/services/analyticsIntegration";
import { 
  ErrorFactory, 
  errorRecoveryManager 
} from "@/lib/errors/flight-search-errors";
import { 
  edgeCaseHandler 
} from "@/lib/flight-search/edge-case-handler";
import { 
  gracefulDegradationManager 
} from "@/lib/flight-search/graceful-degradation";
import { 
  flightSearchMonitoring,
  EventType,
  LogLevel 
} from "@/lib/monitoring/flight-search-monitoring";
import { NextResponse } from "next/server";

/**
 * Enhanced Flight Search API Endpoint
 * Provides comprehensive error handling, validation, and graceful degradation
 */
export async function GET(req) {
  const traceId = flightSearchMonitoring.logger.generateTraceId();
  const startTime = Date.now();
  
  flightSearchMonitoring.logger.setTraceId(traceId);
  flightSearchMonitoring.logger.info('Enhanced flight search initiated', {
    traceId,
    url: req.url
  });

  try {
    // Parse and validate search parameters
    const { searchParams, error: validationError } = await parseAndValidateSearchParams(req);
    
    if (validationError) {
      flightSearchMonitoring.logger.warn('Search parameter validation failed', {
        traceId,
        error: validationError.message,
        searchParams
      });

      return NextResponse.json(
        validationError.toResponse(),
        { status: validationError.statusCode || 400 }
      );
    }

    // Initialize monitoring
    flightSearchMonitoring.metricsCollector.incrementCounter('search_initiated', {
      origin: searchParams.origin,
      destination: searchParams.destination,
      tripType: searchParams.tripType
    });

    // Initialize cache if available
    let cacheManager = null;
    try {
      const redisClient = await getRedisClient();
      cacheManager = getFlightCacheManager(redisClient);
      flightSearchMonitoring.logger.debug('Cache initialized successfully', { traceId });
    } catch (cacheError) {
      flightSearchMonitoring.logger.warn('Cache initialization failed, proceeding without cache', {
        traceId,
        error: cacheError.message
      });
    }

    // Try cache first
    if (cacheManager) {
      try {
        const cachedResults = await cacheManager.getCachedSearchResults(searchParams);
        if (cachedResults) {
          flightSearchMonitoring.logger.info('Cache hit for flight search', {
            traceId,
            searchParams
          });
          
          flightSearchMonitoring.metricsCollector.incrementCounter('cache_hit', {
            origin: searchParams.origin,
            destination: searchParams.destination
          });

          analyticsIntegrationService.trackFlightSearch(
            { ...searchParams, source: 'cache' },
            cachedResults.data || []
          ).catch(error => flightSearchMonitoring.logger.error('Analytics tracking failed', {
            traceId,
            error: error.message
          }));

          const duration = Date.now() - startTime;
          flightSearchMonitoring.logger.info('Flight search completed from cache', {
            traceId,
            duration,
            resultCount: cachedResults.data?.length || 0
          });

          return NextResponse.json({
            success: true,
            data: cachedResults.data,
            metadata: {
              ...cachedResults.metadata,
              source: 'cache',
              duration,
              traceId
            }
          });
        }
      } catch (cacheError) {
        flightSearchMonitoring.logger.warn('Cache read failed, proceeding with API call', {
          traceId,
          error: cacheError.message
        });
      }
    }

    flightSearchMonitoring.metricsCollector.incrementCounter('cache_miss', {
      origin: searchParams.origin,
      destination: searchParams.destination
    });

    // Cache miss - proceed with API search
    try {
      // Cache the search results
      const cacheResults = await cacheManager.cacheSearchResults(
        searchParams,
        { data: [], metadata: {} },
        600 // 10 minutes TTL
      );

      // Execute search with monitoring and graceful degradation
      const results = await flightSearchMonitoring.monitorSearch(
        searchParams,
        async (params) => {
          const providerManager = getFlightProviderManager();
          return await providerManager.searchFlights(params);
        }
      );

      // Update cache with fresh results
      if (cacheManager && results.data) {
        try {
          await cacheManager.cacheSearchResults(searchParams, results, 600);
        } catch (cacheError) {
          flightSearchMonitoring.logger.warn('Failed to cache search results', {
            traceId,
            error: cacheError.message
          });
        }
      }

      // Track analytics
      analyticsIntegrationService.trackFlightSearch(
        { ...searchParams, source: results.source || 'api' },
        results.data || []
      ).catch(error => flightSearchMonitoring.logger.error('Analytics tracking failed', {
        traceId,
        error: error.message
      }));

      const duration = Date.now() - startTime;
      flightSearchMonitoring.logger.info('Flight search completed successfully', {
        traceId,
        duration,
        resultCount: results.data?.length || 0,
        source: results.source
      });

      return NextResponse.json({
        success: true,
        data: results.data,
        metadata: {
          ...results.metadata,
          duration,
          traceId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (searchError) {
      flightSearchMonitoring.logger.error('Flight search failed', {
        traceId,
        error: searchError.message,
        stack: searchError.stack
      });

      // Track error
      flightSearchMonitoring.errorTracker.trackError(searchError, {
        traceId,
        searchParams,
        operation: 'flight_search'
      });

      // Attempt error recovery
      const recovery = await errorRecoveryManager.handleRecovery(searchError, {
        searchParams,
        traceId
      });

      flightSearchMonitoring.logger.info('Error recovery attempted', {
        traceId,
        recovery,
        originalError: searchError.message
      });

      if (recovery.success) {
        // Recovery successful - return fallback results
        return NextResponse.json({
          success: true,
          data: recovery.data || [],
          metadata: {
            ...recovery.metadata,
            fallbackUsed: true,
            originalError: searchError.message,
            traceId,
            recoveryStrategy: recovery.strategy
          }
        });
      }

      // Recovery failed - return structured error
      const structuredError = searchError instanceof Error ? 
        ErrorFactory.genericError(searchError.message, {
          context: { originalError: searchError.message, traceId }
        }) : 
        searchError;

      return NextResponse.json(
        structuredError.toResponse(),
        { status: structuredError.statusCode || 500 }
      );
    }

  } catch (error) {
    flightSearchMonitoring.logger.fatal('Critical error in flight search API', {
      traceId,
      error: error.message,
      stack: error.stack
    });

    const structuredError = ErrorFactory.systemError('Flight search system error', {
      context: { originalError: error.message, traceId }
    });

    // Log error completion
    flightSearchMonitoring.logger.error('Flight search failed', {
      traceId,
      error: structuredError.message,
      duration: Date.now() - startTime
    });

    return NextResponse.json(
      structuredError.toResponse(),
      { status: 500 }
    );
  } finally {
    flightSearchMonitoring.logger.setTraceId(null);
  }
}

/**
 * POST endpoint for alternative searches
 */
export async function POST(req) {
  const traceId = flightSearchMonitoring.logger.generateTraceId();
  flightSearchMonitoring.logger.setTraceId(traceId);

  try {
    const body = await req.json();
    const { searchParams, alternativeType } = body;

    flightSearchMonitoring.logger.info('Alternative flight search requested', {
      traceId,
      alternativeType,
      originalParams: searchParams
    });

    // Validate alternative search parameters
    const validation = await edgeCaseHandler.validateSearchParams(searchParams);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters for alternative search',
        details: validation.errors
      }, { status: 400 });
    }

    // Generate alternative search options
    const alternatives = await edgeCaseHandler.getAlternativeSearchSuggestions(searchParams);
    
    flightSearchMonitoring.metricsCollector.incrementCounter('alternative_search_requested', {
      type: alternativeType,
      traceId
    });

    return NextResponse.json({
      success: true,
      data: alternatives,
      metadata: {
        type: 'alternatives',
        originalParams: searchParams,
        alternativeType,
        traceId
      }
    });

  } catch (error) {
    flightSearchMonitoring.logger.error('Alternative search failed', {
      traceId,
      error: error.message
    });

    return NextResponse.json({
      success: false,
      error: 'Alternative search failed',
      details: error.message
    }, { status: 500 });
  } finally {
    flightSearchMonitoring.logger.setTraceId(null);
  }
}

/**
 * Parse and validate search parameters
 */
async function parseAndValidateSearchParams(req) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Extract and validate parameters
    const params = {
      origin: searchParams.get('origin'),
      destination: searchParams.get('destination'),
      departureDate: searchParams.get('departureDate'),
      returnDate: searchParams.get('returnDate'),
      tripType: searchParams.get('tripType') || 'one_way',
      cabinClass: searchParams.get('cabinClass') || 'economy',
      passengers: {
        adults: parseInt(searchParams.get('adults')) || 1,
        children: parseInt(searchParams.get('children')) || 0,
        infants: parseInt(searchParams.get('infants')) || 0
      }
    };

    // Validate using edge case handler
    const validation = await edgeCaseHandler.validateSearchParams(params);
    
    if (!validation.valid) {
      const validationError = ErrorFactory.validationError(
        `Validation failed: ${validation.errors.map(e => e.error).join(', ')}`,
        {
          errorCode: 'VALIDATION_FAILED',
          suggestions: validation.errors.flatMap(e => e.suggestions || [])
        }
      );
      
      return { searchParams: null, error: validationError };
    }

    return { searchParams: validation.validParams, error: null };

  } catch (error) {
    const parseError = ErrorFactory.validationError(
      'Failed to parse search parameters',
      {
        errorCode: 'PARSE_ERROR',
        context: { originalError: error.message }
      }
    );
    
    return { searchParams: null, error: parseError };
  }
}

/**
 * Health check endpoint
 */
export async function HEAD(req) {
  try {
    // Check all dependencies
    const healthChecks = {
      database: await checkDatabaseHealth(),
      cache: await checkCacheHealth(),
      externalProviders: await checkExternalProvidersHealth(),
      timestamp: new Date().toISOString()
    };

    const isHealthy = Object.values(healthChecks).every(check => check.healthy);
    
    return new NextResponse(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Health-Status': isHealthy ? 'healthy' : 'unhealthy'
      }
    });

  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Health-Status': 'unhealthy',
        'X-Error': error.message
      }
    });
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  try {
    // Simple database connectivity check
    const { getManyDocs } = await import("@/lib/db/getOperationDB");
    await getManyDocs("FlightItinerary", {}, [], 0, 1);
    
    return { healthy: true, responseTime: Date.now() };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Check cache health
 */
async function checkCacheHealth() {
  try {
    const redisClient = await getRedisClient();
    await redisClient.ping();
    
    return { healthy: true, responseTime: Date.now() };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Check external providers health
 */
async function checkExternalProvidersHealth() {
  try {
    const providerManager = getFlightProviderManager();
    const healthStatus = await providerManager.healthCheck();
    
    return { healthy: healthStatus.healthy, providers: healthStatus.providers };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}