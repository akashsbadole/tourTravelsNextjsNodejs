import { getFlightProviderManager } from "@/lib/integrations/flight-providers/provider-manager";
import { getRedisClient } from "@/lib/cache/redis-client";
import { getFlightCacheManager } from "@/lib/cache/flight-cache";
import analyticsIntegrationService from "@/lib/services/analyticsIntegration";

/**
 * Real-time flight search API endpoint
 * Integrates with external flight providers with caching and fallback
 */
export async function GET(req) {
  try {
    const searchParams = Object.fromEntries(new URL(req.url).searchParams);
    
    // Validate required parameters
    const requiredParams = ['origin', 'destination', 'departureDate'];
    for (const param of requiredParams) {
      if (!searchParams[param]) {
        return Response.json({
          success: false,
          error: `Missing required parameter: ${param}`
        }, { status: 400 });
      }
    }

    // Parse and validate search parameters
    const searchRequest = {
      origin: searchParams.origin.toUpperCase(),
      destination: searchParams.destination.toUpperCase(),
      departureDate: new Date(searchParams.departureDate),
      returnDate: searchParams.returnDate ? new Date(searchParams.returnDate) : null,
      tripType: searchParams.tripType || 'one_way',
      passengers: {
        adults: parseInt(searchParams.adults) || 1,
        children: parseInt(searchParams.children) || 0,
        infants: parseInt(searchParams.infants) || 0
      },
      cabinClass: searchParams.cabinClass || 'economy',
      filters: searchParams.filters ? JSON.parse(searchParams.filters) : {}
    };

    // Validate dates
    if (isNaN(searchRequest.departureDate.getTime())) {
      return Response.json({
        success: false,
        error: 'Invalid departure date'
      }, { status: 400 });
    }

    if (searchRequest.returnDate && isNaN(searchRequest.returnDate.getTime())) {
      return Response.json({
        success: false,
        error: 'Invalid return date'
      }, { status: 400 });
    }

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
      } catch (error) {
        console.warn('Redis cache initialization failed, proceeding without cache:', error);
      }
    }

    // Check cache first
    if (cacheManager) {
      try {
        const cachedResults = await cacheManager.getCachedSearchResults(searchRequest);
        if (cachedResults) {
          // Track search analytics for cached results (non-blocking)
          const analyticsData = {
            ...searchRequest,
            sessionId: req.headers.get('x-session-id') || null,
            userAgent: req.headers.get('user-agent') || null,
            referrer: req.headers.get('referer') || null
          };

          // Don't wait for analytics to complete
          analyticsIntegrationService.trackFlightSearch(analyticsData, cachedResults.data || [])
            .catch(error => console.error('Analytics tracking failed:', error));

          return Response.json({
            success: true,
            data: cachedResults.data,
            metadata: {
              ...cachedResults.metadata,
              cached: true,
              cachedAt: cachedResults.cachedAt,
              source: 'cache'
            }
          });
        }
      } catch (error) {
        console.warn('Cache read failed, proceeding with API call:', error);
      }
    }

    // Perform search with provider manager
    const searchResults = await providerManager.searchFlights(searchRequest, {
      useCache: !!cacheManager,
      timeout: 30000
    });

    // Cache results if successful
    if (searchResults.success && cacheManager && searchResults.data.length > 0) {
      try {
        await cacheManager.cacheSearchResults(searchRequest, searchResults);
      } catch (error) {
        console.warn('Failed to cache search results:', error);
      }
    }

    // Track search analytics (non-blocking)
    const analyticsData = {
      ...searchRequest,
      sessionId: req.headers.get('x-session-id') || null,
      userAgent: req.headers.get('user-agent') || null,
      referrer: req.headers.get('referer') || null
    };

    // Don't wait for analytics to complete
    analyticsIntegrationService.trackFlightSearch(analyticsData, searchResults.data || [])
      .catch(error => console.error('Analytics tracking failed:', error));

    // Return response
    return Response.json({
      success: searchResults.success,
      data: searchResults.data || [],
      metadata: {
        ...searchResults.metadata,
        cached: false,
        source: 'api',
        providers: {
          primary: providerManager.primaryProvider?.name,
          fallback: providerManager.fallbackProvider?.name
        }
      },
      error: searchResults.error || null
    });

  } catch (error) {
    console.error('Real-time flight search error:', error);
    
    return Response.json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * Handle POST requests for complex search parameters
 */
export async function POST(req) {
  try {
    const body = await req.json();
    
    // Forward to GET handler with query parameters
    const url = new URL(req.url);
    Object.keys(body).forEach(key => {
      if (typeof body[key] === 'object') {
        url.searchParams.set(key, JSON.stringify(body[key]));
      } else {
        url.searchParams.set(key, body[key]);
      }
    });

    // Create a new request with the same method but updated URL
    const newReq = new Request(url.toString(), {
      method: 'GET',
      headers: req.headers
    });

    return GET(newReq);
  } catch (error) {
    console.error('Real-time flight search POST error:', error);
    
    return Response.json({
      success: false,
      error: 'Invalid request body',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 400 });
  }
}