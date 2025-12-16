import "server-only";

/**
 * Flight Data Cache Manager
 * Handles caching of flight data with Redis
 */
export class FlightCacheManager {
  constructor(redisClient, config = {}) {
    this.redis = redisClient;
    this.config = {
      defaultTTL: 300, // 5 minutes
      searchTTL: 600, // 10 minutes
      availabilityTTL: 60, // 1 minute
      pricingTTL: 180, // 3 minutes
      keyPrefix: 'flight:',
      ...config
    };
  }

  /**
   * Generate cache key
   * @param {string} type - Cache type (search, availability, pricing)
   * @param {Object} params - Parameters to create unique key
   * @returns {string} Cache key
   */
  generateKey(type, params) {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    const hash = Buffer.from(paramString).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    return `${this.config.keyPrefix}${type}:${hash}`;
  }

  /**
   * Cache flight search results
   * @param {Object} searchParams - Search parameters
   * @param {Object} results - Search results
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async cacheSearchResults(searchParams, results, ttl = this.config.searchTTL) {
    try {
      const key = this.generateKey('search', searchParams);
      const value = JSON.stringify({
        ...results,
        cached: true,
        cachedAt: new Date().toISOString(),
        ttl
      });

      await this.redis.setex(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Failed to cache search results:', error);
      return false;
    }
  }

  /**
   * Get cached flight search results
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object|null>} Cached results or null
   */
  async getCachedSearchResults(searchParams) {
    try {
      const key = this.generateKey('search', searchParams);
      const cached = await this.redis.get(key);

      if (cached) {
        const results = JSON.parse(cached);
        return results;
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached search results:', error);
      return null;
    }
  }

  /**
   * Cache flight availability data
   * @param {Array} flightIds - Flight IDs
   * @param {Object} availabilityData - Availability data
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async cacheAvailability(flightIds, availabilityData, ttl = this.config.availabilityTTL) {
    try {
      const key = this.generateKey('availability', { flightIds: flightIds.sort() });
      const value = JSON.stringify({
        ...availabilityData,
        cached: true,
        cachedAt: new Date().toISOString(),
        ttl
      });

      await this.redis.setex(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Failed to cache availability:', error);
      return false;
    }
  }

  /**
   * Get cached flight availability data
   * @param {Array} flightIds - Flight IDs
   * @returns {Promise<Object|null>} Cached availability or null
   */
  async getCachedAvailability(flightIds) {
    try {
      const key = this.generateKey('availability', { flightIds: flightIds.sort() });
      const cached = await this.redis.get(key);

      if (cached) {
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached availability:', error);
      return null;
    }
  }

  /**
   * Cache flight pricing data
   * @param {Array} flightIds - Flight IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @param {Object} pricingData - Pricing data
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async cachePricing(flightIds, passengerCounts, cabinClass, pricingData, ttl = this.config.pricingTTL) {
    try {
      const key = this.generateKey('pricing', {
        flightIds: flightIds.sort(),
        passengerCounts,
        cabinClass
      });
      const value = JSON.stringify({
        ...pricingData,
        cached: true,
        cachedAt: new Date().toISOString(),
        ttl
      });

      await this.redis.setex(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Failed to cache pricing:', error);
      return false;
    }
  }

  /**
   * Get cached flight pricing data
   * @param {Array} flightIds - Flight IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @returns {Promise<Object|null>} Cached pricing or null
   */
  async getCachedPricing(flightIds, passengerCounts, cabinClass) {
    try {
      const key = this.generateKey('pricing', {
        flightIds: flightIds.sort(),
        passengerCounts,
        cabinClass
      });
      const cached = await this.redis.get(key);

      if (cached) {
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached pricing:', error);
      return null;
    }
  }

  /**
   * Cache fare class availability
   * @param {string} flightId - Flight ID
   * @param {Object} fareClassData - Fare class data
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async cacheFareClassAvailability(flightId, fareClassData, ttl = this.config.availabilityTTL) {
    try {
      const key = this.generateKey('fareclass', { flightId });
      const value = JSON.stringify({
        ...fareClassData,
        cached: true,
        cachedAt: new Date().toISOString(),
        ttl
      });

      await this.redis.setex(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Failed to cache fare class availability:', error);
      return false;
    }
  }

  /**
   * Get cached fare class availability
   * @param {string} flightId - Flight ID
   * @returns {Promise<Object|null>} Cached fare class data or null
   */
  async getCachedFareClassAvailability(flightId) {
    try {
      const key = this.generateKey('fareclass', { flightId });
      const cached = await this.redis.get(key);

      if (cached) {
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached fare class availability:', error);
      return null;
    }
  }

  /**
   * Invalidate cache for specific flights
   * @param {Array} flightIds - Flight IDs to invalidate
   * @returns {Promise<boolean>} Success status
   */
  async invalidateFlightCache(flightIds) {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);

      const keysToDelete = keys.filter(key => {
        // Check if key contains any of the flight IDs
        return flightIds.some(id => key.includes(id));
      });

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
      }

      return true;
    } catch (error) {
      console.error('Failed to invalidate flight cache:', error);
      return false;
    }
  }

  /**
   * Invalidate all flight cache
   * @returns {Promise<boolean>} Success status
   */
  async invalidateAllFlightCache() {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      return true;
    } catch (error) {
      console.error('Failed to invalidate all flight cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats() {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      const stats = {
        totalKeys: keys.length,
        keysByType: {},
        memoryUsage: 0
      };

      // Group keys by type
      keys.forEach(key => {
        const type = key.split(':')[1] || 'unknown';
        stats.keysByType[type] = (stats.keysByType[type] || 0) + 1;
      });

      // Get memory usage if available
      try {
        const info = await this.redis.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        if (match) {
          stats.memoryUsage = parseInt(match[1]);
        }
      } catch (e) {
        // Memory info not available
      }

      return stats;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalKeys: 0,
        keysByType: {},
        memoryUsage: 0,
        error: error.message
      };
    }
  }

  /**
   * Check if cache is healthy
   * @returns {Promise<boolean>} Health status
   */
  async healthCheck() {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Stale-while-revalidate pattern for search results
   * @param {Object} searchParams - Search parameters
   * @param {Function} revalidateFunction - Function to revalidate data
   * @returns {Promise<Object>} Results with stale data if available
   */
  async staleWhileRevalidate(searchParams, revalidateFunction) {
    try {
      const cached = await this.getCachedSearchResults(searchParams);
      
      if (cached) {
        // Check if data is stale (older than 1 minute)
        const cachedTime = new Date(cached.cachedAt);
        const now = new Date();
        const ageSeconds = (now - cachedTime) / 1000;
        
        if (ageSeconds < 60) {
          // Fresh data
          return {
            ...cached,
            source: 'cache',
            fresh: true
          };
        } else {
          // Stale data, trigger revalidation in background
          revalidateFunction().catch(error => {
            console.error('Background revalidation failed:', error);
          });
          
          return {
            ...cached,
            source: 'cache',
            fresh: false,
            stale: true
          };
        }
      }

      // No cached data, fetch fresh
      const fresh = await revalidateFunction();
      await this.cacheSearchResults(searchParams, fresh);
      
      return {
        ...fresh,
        source: 'api',
        fresh: true
      };

    } catch (error) {
      console.error('Stale-while-revalidate failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let cacheManagerInstance = null;

/**
 * Get or create flight cache manager instance
 * @param {Object} redisClient - Redis client instance
 * @param {Object} config - Configuration
 * @returns {FlightCacheManager} Cache manager instance
 */
export function getFlightCacheManager(redisClient, config) {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new FlightCacheManager(redisClient, config);
  }
  return cacheManagerInstance;
}