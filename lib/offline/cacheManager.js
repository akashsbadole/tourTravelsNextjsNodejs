/**
 * Cache Manager for Offline Functionality
 * Handles intelligent caching strategies for different data types
 */

import indexedDBManager from './indexedDB';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Cache configuration for different data types
const CACHE_TYPES = {
  FLIGHT_SEARCH: {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    maxAge: 10 * 60 * 1000, // 10 minutes
    maxEntries: 50,
    priority: 'high'
  },
  HOTEL_SEARCH: {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    maxAge: 10 * 60 * 1000, // 10 minutes
    maxEntries: 50,
    priority: 'high'
  },
  FLIGHT_DETAILS: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    maxAge: 30 * 60 * 1000, // 30 minutes
    maxEntries: 100,
    priority: 'medium'
  },
  HOTEL_DETAILS: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    maxAge: 30 * 60 * 1000, // 30 minutes
    maxEntries: 100,
    priority: 'medium'
  },
  USER_PREFERENCES: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 10,
    priority: 'low'
  },
  STATIC_ASSETS: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 200,
    priority: 'low'
  }
};

class CacheManager {
  constructor() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      lastCleanup: Date.now()
    };
    
    this.pendingRequests = new Map();
  }

  /**
   * Get data with appropriate caching strategy
   */
  async get(cacheType, key, fetchFunction, options = {}) {
    const config = CACHE_TYPES[cacheType] || CACHE_TYPES.FLIGHT_SEARCH;
    const strategy = options.strategy || config.strategy;
    
    try {
      switch (strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
          return await this.cacheFirst(cacheType, key, fetchFunction, config, options);
        case CACHE_STRATEGIES.NETWORK_FIRST:
          return await this.networkFirst(cacheType, key, fetchFunction, config, options);
        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
          return await this.staleWhileRevalidate(cacheType, key, fetchFunction, config, options);
        case CACHE_STRATEGIES.NETWORK_ONLY:
          return await this.networkOnly(fetchFunction, options);
        case CACHE_STRATEGIES.CACHE_ONLY:
          return await this.cacheOnly(cacheType, key, config, options);
        default:
          return await this.networkFirst(cacheType, key, fetchFunction, config, options);
      }
    } catch (error) {
      this.cacheStats.errors++;
      console.error(`[CacheManager] Error getting ${cacheType}:`, error);
      throw error;
    }
  }

  /**
   * Cache-first strategy
   */
  async cacheFirst(cacheType, key, fetchFunction, config, options) {
    // Try cache first
    const cached = await this.getFromCache(cacheType, key);
    
    if (cached && this.isCacheValid(cached, config)) {
      this.cacheStats.hits++;
      
      // Update cache in background if stale
      if (this.isCacheStale(cached, config)) {
        this.updateCacheInBackground(cacheType, key, fetchFunction, config);
      }
      
      return cached.data;
    }
    
    // Cache miss or invalid, fetch from network
    this.cacheStats.misses++;
    const data = await this.networkOnly(fetchFunction, options);
    
    // Store in cache
    await this.setCache(cacheType, key, data, config);
    
    return data;
  }

  /**
   * Network-first strategy
   */
  async networkFirst(cacheType, key, fetchFunction, config, options) {
    try {
      // Try network first
      const data = await this.networkOnly(fetchFunction, options);
      
      // Store in cache
      await this.setCache(cacheType, key, data, config);
      
      return data;
    } catch (error) {
      // Network failed, try cache
      const cached = await this.getFromCache(cacheType, key);
      
      if (cached && this.isCacheValid(cached, config)) {
        this.cacheStats.hits++;
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Stale-while-revalidate strategy
   */
  async staleWhileRevalidate(cacheType, key, fetchFunction, config, options) {
    // Check cache first
    const cached = await this.getFromCache(cacheType, key);
    
    if (cached) {
      this.cacheStats.hits++;
      
      // Check if cache is stale
      if (this.isCacheStale(cached, config)) {
        // Update in background
        this.updateCacheInBackground(cacheType, key, fetchFunction, config);
      }
      
      return cached.data;
    }
    
    // Cache miss, fetch from network
    this.cacheStats.misses++;
    const data = await this.networkOnly(fetchFunction, options);
    
    // Store in cache
    await this.setCache(cacheType, key, data, config);
    
    return data;
  }

  /**
   * Network-only strategy
   */
  async networkOnly(fetchFunction, options) {
    // Check for pending requests to avoid duplicate calls
    const requestKey = JSON.stringify(options);
    
    if (this.pendingRequests.has(requestKey)) {
      return await this.pendingRequests.get(requestKey);
    }
    
    const promise = fetchFunction(options);
    this.pendingRequests.set(requestKey, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Cache-only strategy
   */
  async cacheOnly(cacheType, key, config, options) {
    const cached = await this.getFromCache(cacheType, key);
    
    if (cached && this.isCacheValid(cached, config)) {
      this.cacheStats.hits++;
      return cached.data;
    }
    
    this.cacheStats.misses++;
    throw new Error('No valid cache available');
  }

  /**
   * Get data from cache
   */
  async getFromCache(cacheType, key) {
    try {
      switch (cacheType) {
        case 'FLIGHT_SEARCH':
        case 'HOTEL_SEARCH':
          return await indexedDBManager.getSearchResults(key, cacheType.toLowerCase().split('_')[0]);
        case 'FLIGHT_DETAILS':
          return await indexedDBManager.getFlightData(key);
        case 'HOTEL_DETAILS':
          return await indexedDBManager.getHotelData(key);
        case 'USER_PREFERENCES':
          const value = await indexedDBManager.getUserPreference(key);
          return value ? { data: value, timestamp: Date.now() } : null;
        default:
          return null;
      }
    } catch (error) {
      console.error(`[CacheManager] Error getting from cache:`, error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async setCache(cacheType, key, data, config) {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        cachedAt: new Date().toISOString(),
        cacheType,
        key
      };

      switch (cacheType) {
        case 'FLIGHT_SEARCH':
        case 'HOTEL_SEARCH':
          await indexedDBManager.storeSearchResults(key, data, cacheType.toLowerCase().split('_')[0]);
          break;
        case 'FLIGHT_DETAILS':
          await indexedDBManager.storeFlightData(key, data);
          break;
        case 'HOTEL_DETAILS':
          await indexedDBManager.storeHotelData(key, data);
          break;
        case 'USER_PREFERENCES':
          await indexedDBManager.setUserPreference(key, data);
          break;
        default:
          console.warn(`[CacheManager] Unknown cache type: ${cacheType}`);
      }
    } catch (error) {
      console.error(`[CacheManager] Error setting cache:`, error);
    }
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(cached, config) {
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age <= config.maxAge;
  }

  /**
   * Check if cache is stale (but still usable)
   */
  isCacheStale(cached, config) {
    if (!cached) return true;
    
    const age = Date.now() - cached.timestamp;
    const staleThreshold = config.maxAge * 0.8; // 80% of max age
    return age > staleThreshold;
  }

  /**
   * Update cache in background
   */
  async updateCacheInBackground(cacheType, key, fetchFunction, config) {
    try {
      const data = await this.networkOnly(fetchFunction, {});
      await this.setCache(cacheType, key, data, config);
      console.log(`[CacheManager] Background cache updated for ${cacheType}:${key}`);
    } catch (error) {
      console.error(`[CacheManager] Background cache update failed:`, error);
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidateCache(cacheType, key) {
    try {
      switch (cacheType) {
        case 'FLIGHT_SEARCH':
        case 'HOTEL_SEARCH':
        case 'FLIGHT_DETAILS':
        case 'HOTEL_DETAILS':
          // IndexedDB doesn't have direct invalidation, but we can set to null
          await indexedDBManager.delete(cacheType.toLowerCase().replace('_', ''), key);
          break;
        case 'USER_PREFERENCES':
          await indexedDBManager.delete(STORES.USER_PREFERENCES, key);
          break;
        default:
          console.warn(`[CacheManager] Unknown cache type for invalidation: ${cacheType}`);
      }
    } catch (error) {
      console.error(`[CacheManager] Error invalidating cache:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(cacheType = null) {
    try {
      if (cacheType) {
        await indexedDBManager.clearStore(cacheType.toLowerCase().replace('_', ''));
      } else {
        await indexedDBManager.clearAll();
      }
      console.log(`[CacheManager] Cleared cache: ${cacheType || 'all'}`);
    } catch (error) {
      console.error(`[CacheManager] Error clearing cache:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const storageUsage = await indexedDBManager.getStorageUsage();
      
      return {
        ...this.cacheStats,
        storageUsage,
        hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100 || 0
      };
    } catch (error) {
      console.error('[CacheManager] Error getting cache stats:', error);
      return this.cacheStats;
    }
  }

  /**
   * Perform cache cleanup
   */
  async cleanup() {
    try {
      const now = Date.now();
      const timeSinceLastCleanup = now - this.cacheStats.lastCleanup;
      
      // Run cleanup every hour
      if (timeSinceLastCleanup < 60 * 60 * 1000) {
        return;
      }
      
      console.log('[CacheManager] Running cache cleanup');
      
      // Cleanup old entries for each cache type
      for (const [cacheType, config] of Object.entries(CACHE_TYPES)) {
        await this.cleanupCacheType(cacheType, config);
      }
      
      this.cacheStats.lastCleanup = now;
      console.log('[CacheManager] Cache cleanup completed');
    } catch (error) {
      console.error('[CacheManager] Error during cleanup:', error);
    }
  }

  /**
   * Cleanup specific cache type
   */
  async cleanupCacheType(cacheType, config) {
    try {
      // This is handled by IndexedDB manager's cleanupOldEntries method
      // which is called when storing new data
      console.log(`[CacheManager] Cleanup completed for ${cacheType}`);
    } catch (error) {
      console.error(`[CacheManager] Error cleaning up ${cacheType}:`, error);
    }
  }

  /**
   * Prefetch data
   */
  async prefetch(cacheType, key, fetchFunction, priority = 'low') {
    try {
      // Check if already cached and valid
      const cached = await this.getFromCache(cacheType, key);
      
      if (cached && this.isCacheValid(cached, CACHE_TYPES[cacheType])) {
        return cached.data;
      }
      
      // Fetch and cache in background
      if (priority === 'high') {
        const data = await this.networkOnly(fetchFunction, {});
        await this.setCache(cacheType, key, data, CACHE_TYPES[cacheType]);
      } else {
        // Low priority - use requestIdleCallback if available
        if ('requestIdleCallback' in window) {
          requestIdleCallback(async () => {
            try {
              const data = await this.networkOnly(fetchFunction, {});
              await this.setCache(cacheType, key, data, CACHE_TYPES[cacheType]);
            } catch (error) {
              console.error('[CacheManager] Prefetch failed:', error);
            }
          });
        } else {
          // Fallback to setTimeout
          setTimeout(async () => {
            try {
              const data = await this.networkOnly(fetchFunction, {});
              await this.setCache(cacheType, key, data, CACHE_TYPES[cacheType]);
            } catch (error) {
              console.error('[CacheManager] Prefetch failed:', error);
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('[CacheManager] Error prefetching:', error);
    }
  }

  /**
   * Batch prefetch multiple items
   */
  async batchPrefetch(items, concurrency = 3) {
    const results = [];
    
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const promises = batch.map(item => 
        this.prefetch(item.cacheType, item.key, item.fetchFunction, item.priority)
      );
      
      try {
        const batchResults = await Promise.allSettled(promises);
        results.push(...batchResults);
      } catch (error) {
        console.error('[CacheManager] Batch prefetch error:', error);
      }
    }
    
    return results;
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

export default cacheManager;
export { CACHE_STRATEGIES, CACHE_TYPES };