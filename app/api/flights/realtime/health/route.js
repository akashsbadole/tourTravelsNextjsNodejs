import { getFlightProviderManager } from "@/lib/integrations/flight-providers/provider-manager";
import { getRedisClientManager } from "@/lib/cache/redis-client";
import { getFlightCacheManager } from "@/lib/cache/flight-cache";

/**
 * Real-time flight system health check endpoint
 * Monitors health of all components: providers, cache, database
 */
export async function GET(req) {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      components: {
        providers: {},
        cache: {},
        database: {},
        overall: {}
      }
    };

    // Check flight providers health
    try {
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
      const providerHealth = await providerManager.getHealthStatus();
      
      healthStatus.components.providers = providerHealth;
      
      // Determine if any providers are unhealthy
      const unhealthyProviders = Object.entries(providerHealth.providers)
        .filter(([_, health]) => !health.healthy)
        .map(([name, _]) => name);

      if (unhealthyProviders.length > 0) {
        healthStatus.components.providers.status = 'degraded';
        healthStatus.components.providers.unhealthy = unhealthyProviders;
      } else {
        healthStatus.components.providers.status = 'healthy';
      }

    } catch (error) {
      healthStatus.components.providers = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Check Redis cache health
    if (process.env.REDIS_ENABLED === 'true') {
      try {
        const redisManager = await getRedisClientManager();
        const redisHealth = await redisManager.healthCheck();
        
        if (redisHealth.healthy) {
          healthStatus.components.cache = {
            status: 'healthy',
            responseTime: redisHealth.responseTime,
            config: redisHealth.config
          };

          // Check cache manager health
          const cacheManager = getFlightCacheManager(redisManager.getClient());
          const cacheStats = await cacheManager.getCacheStats();
          healthStatus.components.cache.stats = cacheStats;
        } else {
          healthStatus.components.cache = {
            status: 'unhealthy',
            error: redisHealth.error
          };
        }
      } catch (error) {
        healthStatus.components.cache = {
          status: 'unhealthy',
          error: error.message
        };
      }
    } else {
      healthStatus.components.cache = {
        status: 'disabled',
        message: 'Redis caching is disabled'
      };
    }

    // Check database health (using existing models)
    try {
      const { FlightItinerary } = await import("@/lib/db/models");
      const startTime = Date.now();
      
      // Simple database connectivity test
      await FlightItinerary.findOne({}).limit(1).lean();
      
      const responseTime = Date.now() - startTime;
      
      healthStatus.components.database = {
        status: 'healthy',
        responseTime,
        type: 'mongodb'
      };
    } catch (error) {
      healthStatus.components.database = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Determine overall system health
    const componentStatuses = [
      healthStatus.components.providers.status,
      healthStatus.components.cache.status,
      healthStatus.components.database.status
    ];

    if (componentStatuses.includes('unhealthy')) {
      healthStatus.status = 'unhealthy';
    } else if (componentStatuses.includes('degraded')) {
      healthStatus.status = 'degraded';
    }

    // Add system configuration info
    healthStatus.configuration = {
      flightProviderPrimary: process.env.FLIGHT_PROVIDER_PRIMARY || 'static',
      flightProviderFallback: process.env.FLIGHT_PROVIDER_FALLBACK || 'static',
      amadeusEnabled: process.env.AMADEUS_ENABLED === 'true',
      redisEnabled: process.env.REDIS_ENABLED === 'true',
      cacheEnabled: process.env.FLIGHT_CACHE_ENABLED === 'true',
      environment: process.env.NODE_ENV || 'development'
    };

    // Determine HTTP status code
    let statusCode = 200;
    if (healthStatus.status === 'unhealthy') {
      statusCode = 503;
    } else if (healthStatus.status === 'degraded') {
      statusCode = 200; // Still serve traffic but indicate degradation
    }

    return Response.json(healthStatus, { status: statusCode });

  } catch (error) {
    console.error('Health check error:', error);
    
    return Response.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 503 });
  }
}

/**
 * Handle POST requests for detailed health checks
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const options = {
      detailed: body.detailed === true,
      component: body.component || 'all'
    };

    // Get basic health first
    const basicHealth = await GET(req);
    const healthData = await basicHealth.json();

    // Add detailed information if requested
    if (options.detailed) {
      // Add provider metadata
      if (options.component === 'all' || options.component === 'providers') {
        const providerConfig = {
          amadeus: {
            enabled: process.env.AMADEUS_ENABLED === 'true',
            options: {
              rateLimit: parseInt(process.env.AMADEUS_RATE_LIMIT) || 100
            }
          },
          static: {}
        };

        const providerManager = getFlightProviderManager(providerConfig);
        healthData.components.providers.metadata = providerManager.getAvailableProviders().map(name => ({
          name,
          metadata: providerManager.getProvider(name)?.getMetadata()
        }));
      }

      // Add detailed cache statistics
      if (options.component === 'all' || options.component === 'cache') {
        if (process.env.REDIS_ENABLED === 'true') {
          try {
            const redisManager = await getRedisClientManager();
            const cacheManager = getFlightCacheManager(redisManager.getClient());
            
            healthData.components.cache.detailedStats = await cacheManager.getCacheStats();
            
            // Add Redis info
            const redisInfo = await redisManager.getInfo();
            healthData.components.cache.redisInfo = {
              version: redisInfo.redis_version,
              uptime: redisInfo.uptime_in_seconds,
              memory: {
                used: redisInfo.used_memory,
                peak: redisInfo.used_memory_peak,
                rss: redisInfo.used_memory_rss
              },
              connections: {
                current: redisInfo.connected_clients,
                total: redisInfo.total_connections_received
              }
            };
          } catch (error) {
            healthData.components.cache.detailedError = error.message;
          }
        }
      }
    }

    return Response.json(healthData, { status: basicHealth.status });
  } catch (error) {
    console.error('Detailed health check error:', error);
    
    return Response.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 503 });
  }
}