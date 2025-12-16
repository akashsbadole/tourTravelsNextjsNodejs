import { getFlightProviderManager } from "@/lib/integrations/flight-providers/provider-manager";
import { getRedisClient } from "@/lib/cache/redis-client";
import { getFlightCacheManager } from "@/lib/cache/flight-cache";

/**
 * Real-time flight pricing API endpoint
 * Gets pricing information for specific flights
 */
export async function GET(req) {
  try {
    const searchParams = Object.fromEntries(new URL(req.url).searchParams);
    
    // Validate required parameters
    if (!searchParams.flightIds) {
      return Response.json({
        success: false,
        error: 'Missing required parameter: flightIds'
      }, { status: 400 });
    }

    // Parse flight IDs
    const flightIds = searchParams.flightIds.split(',').map(id => id.trim()).filter(id => id);
    
    if (flightIds.length === 0) {
      return Response.json({
        success: false,
        error: 'No valid flight IDs provided'
      }, { status: 400 });
    }

    // Parse passenger counts
    let passengerCounts = { adults: 1, children: 0, infants: 0 };
    if (searchParams.passengerCounts) {
      try {
        passengerCounts = JSON.parse(searchParams.passengerCounts);
      } catch (error) {
        return Response.json({
          success: false,
          error: 'Invalid passengerCounts format'
        }, { status: 400 });
      }
    }

    const cabinClass = searchParams.cabinClass || 'economy';

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
          pricingTTL: parseInt(process.env.FLIGHT_CACHE_TTL_PRICING) || 180
        });
      } catch (error) {
        console.warn('Redis cache initialization failed, proceeding without cache:', error);
      }
    }

    // Check cache first
    if (cacheManager) {
      try {
        const cachedPricing = await cacheManager.getCachedPricing(flightIds, passengerCounts, cabinClass);
        if (cachedPricing) {
          return Response.json({
            success: true,
            data: cachedPricing.data,
            metadata: {
              cached: true,
              cachedAt: cachedPricing.cachedAt,
              source: 'cache',
              provider: cachedPricing.provider
            }
          });
        }
      } catch (error) {
        console.warn('Cache read failed, proceeding with API call:', error);
      }
    }

    // Get pricing from provider
    const pricingResults = await providerManager.getPricing(flightIds, passengerCounts, cabinClass);

    // Cache results if successful
    if (pricingResults.success && cacheManager) {
      try {
        await cacheManager.cachePricing(flightIds, passengerCounts, cabinClass, pricingResults);
      } catch (error) {
        console.warn('Failed to cache pricing:', error);
      }
    }

    // Return response
    return Response.json({
      success: pricingResults.success,
      data: pricingResults.data || {},
      metadata: {
        cached: false,
        source: 'api',
        provider: pricingResults.provider,
        requestedAt: new Date().toISOString(),
        flightIds: flightIds,
        passengerCounts: passengerCounts,
        cabinClass: cabinClass
      },
      error: pricingResults.error || null
    });

  } catch (error) {
    console.error('Real-time flight pricing error:', error);
    
    return Response.json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * Handle POST requests for complex pricing requests
 */
export async function POST(req) {
  try {
    const body = await req.json();
    
    if (!body.flightIds || !Array.isArray(body.flightIds)) {
      return Response.json({
        success: false,
        error: 'flightIds must be an array'
      }, { status: 400 });
    }

    // Forward to GET handler with query parameters
    const url = new URL(req.url);
    url.searchParams.set('flightIds', body.flightIds.join(','));
    
    if (body.passengerCounts) {
      url.searchParams.set('passengerCounts', JSON.stringify(body.passengerCounts));
    }
    
    if (body.cabinClass) {
      url.searchParams.set('cabinClass', body.cabinClass);
    }

    // Create a new request with same method but updated URL
    const newReq = new Request(url.toString(), {
      method: 'GET',
      headers: req.headers
    });

    return GET(newReq);
  } catch (error) {
    console.error('Real-time flight pricing POST error:', error);
    
    return Response.json({
      success: false,
      error: 'Invalid request body',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 400 });
  }
}