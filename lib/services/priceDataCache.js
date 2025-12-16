import { getManyDocs } from "@/lib/db/operations";

/**
 * Price Data Cache Service
 * Provides intelligent caching for frequently accessed price data
 */
export class PriceDataCache {
  constructor(options = {}) {
    this.options = {
      // Cache configuration
      maxSize: 10000,                    // Maximum number of cached items
      ttl: 15 * 60 * 1000,            // 15 minutes default TTL
      cleanupInterval: 5 * 60 * 1000,       // 5 minutes cleanup interval
      
      // Cache strategies
      enablePredictiveCaching: true,         // Pre-cache likely-to-be-accessed data
      enableSmartEviction: true,            // Intelligently evict based on usage patterns
      enableCompression: false,               // Compress cached data for memory efficiency
      
      // Performance monitoring
      enableMetrics: true,                  // Track cache performance
      metricsInterval: 60 * 1000,          // Report metrics every minute
      
      ...options
    };
    
    // Multi-level cache (hot, warm, cold)
    this.cache = {
      hot: new Map(),    // Frequently accessed data
      warm: new Map(),   // Moderately accessed data
      cold: new Map()    // Infrequently accessed data
    };
    
    // Cache metadata
    this.metadata = new Map();
    this.accessPatterns = new Map();
    this.lastCleanup = Date.now();
    this.startTime = Date.now();
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      predictiveHits: 0,
      predictiveMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      hotHitRate: 0,
      warmHitRate: 0,
      coldHitRate: 0
    };
    
    // Start background processes
    this.startBackgroundProcesses();
  }

  /**
   * Get price data from cache
   * @param {string} key - Cache key
   * @returns {Object} Cached data or null
   */
  async get(key) {
    const startTime = Date.now();
    
    try {
      this.metrics.totalRequests++;
      
      // Check each cache level
      let cachedData = this.checkCacheLevel('hot', key);
      let cacheLevel = 'hot';
      
      if (!cachedData) {
        cachedData = this.checkCacheLevel('warm', key);
        cacheLevel = 'warm';
      }
      
      if (!cachedData) {
        cachedData = this.checkCacheLevel('cold', key);
        cacheLevel = 'cold';
      }

      if (cachedData) {
        // Update access patterns
        this.updateAccessPattern(key, cacheLevel);
        
        // Update metrics
        this.metrics.hits++;
        this.metrics[`${cacheLevel}HitRate`] = 
          (this.metrics[`${cacheLevel}HitRate`] || 0) + 1;
        
        // Promote to warmer cache if accessed frequently
        if (this.options.enableSmartEviction) {
          this.considerPromotion(key, cachedData, cacheLevel);
        }
        
        // Update response time metric
        const responseTime = Date.now() - startTime;
        this.updateAverageResponseTime(responseTime);
        
        return cachedData.data;
      }

      // Cache miss - try predictive caching
      if (this.options.enablePredictiveCaching) {
        const predictiveData = await this.getPredictiveData(key);
        if (predictiveData) {
          this.metrics.predictiveHits++;
          return predictiveData;
        }
        this.metrics.predictiveMisses++;
      }

      this.metrics.misses++;
      this.updateAverageResponseTime(Date.now() - startTime);
      
      return null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set price data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {Object} options - Cache options
   */
  set(key, data, options = {}) {
    try {
      const ttl = options.ttl || this.options.ttl;
      const priority = options.priority || this.calculatePriority(key);
      const compressed = this.options.enableCompression ? 
        this.compressData(data) : data;
      
      const cacheEntry = {
        data: compressed,
        timestamp: Date.now(),
        ttl,
        priority,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: this.calculateSize(compressed)
      };

      // Determine cache level based on priority
      let cacheLevel = 'cold';
      if (priority >= 8) {
        cacheLevel = 'hot';
      } else if (priority >= 5) {
        cacheLevel = 'warm';
      }

      // Check if eviction is needed
      this.ensureCapacity(cacheLevel);
      
      // Store in appropriate cache level
      this.cache[cacheLevel].set(key, cacheEntry);
      
      // Store metadata
      this.metadata.set(key, {
        level: cacheLevel,
        createdAt: Date.now(),
        priority,
        originalSize: this.calculateSize(data),
        compressedSize: cacheEntry.size
      });

      return true;
    } catch (error) {
      console.error('Error setting cache:', error);
      return false;
    }
  }

  /**
   * Check specific cache level for data
   * @param {string} level - Cache level (hot, warm, cold)
   * @param {string} key - Cache key
   * @returns {Object} Cache entry or null
   */
  checkCacheLevel(level, key) {
    const cache = this.cache[level];
    const entry = cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key);
      this.metadata.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Calculate cache priority for a key
   * @param {string} key - Cache key
   * @returns {number} Priority score (0-10)
   */
  calculatePriority(key) {
    // Base priority on key pattern
    let priority = 5; // Default medium priority
    
    // Higher priority for popular routes
    if (this.isPopularRoute(key)) {
      priority += 3;
    }
    
    // Higher priority for upcoming departures
    if (this.isUpcomingDeparture(key)) {
      priority += 2;
    }
    
    // Higher priority for frequently accessed
    const pattern = this.accessPatterns.get(key);
    if (pattern && pattern.frequency > 5) {
      priority += 2;
    }
    
    return Math.min(10, priority);
  }

  /**
   * Check if key represents a popular route
   * @param {string} key - Cache key
   * @returns {boolean} Is popular route
   */
  isPopularRoute(key) {
    // In a real implementation, this would check against route popularity data
    // For now, we'll use a simple heuristic
    const popularRoutes = [
      'NYC-LAX', 'LAX-NYC', 'LHR-JFK', 'JFK-LHR',
      'SFO-LAX', 'LAX-SFO', 'ORD-LGA', 'LGA-ORD'
    ];
    
    return popularRoutes.some(route => key.includes(route));
  }

  /**
   * Check if key represents an upcoming departure
   * @param {string} key - Cache key
   * @returns {boolean} Is upcoming departure
   */
  isUpcomingDeparture(key) {
    // Extract date from key (simplified)
    const dateMatch = key.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) return false;
    
    const departureDate = new Date(dateMatch[1]);
    const daysUntilDeparture = (departureDate - Date.now()) / (1000 * 60 * 60 * 24);
    
    return daysUntilDeparture >= 0 && daysUntilDeparture <= 30;
  }

  /**
   * Update access patterns for a key
   * @param {string} key - Cache key
   * @param {string} level - Cache level accessed
   */
  updateAccessPattern(key, level) {
    const now = Date.now();
    let pattern = this.accessPatterns.get(key);
    
    if (!pattern) {
      pattern = {
        firstAccess: now,
        lastAccess: now,
        accessCount: 0,
        frequency: 0,
        levelHistory: []
      };
      this.accessPatterns.set(key, pattern);
    }
    
    pattern.lastAccess = now;
    pattern.accessCount++;
    pattern.levelHistory.push({ level, timestamp: now });
    
    // Keep only recent history (last 20 accesses)
    if (pattern.levelHistory.length > 20) {
      pattern.levelHistory = pattern.levelHistory.slice(-20);
    }
    
    // Calculate access frequency (accesses per hour)
    const hoursSinceFirst = (now - pattern.firstAccess) / (1000 * 60 * 60);
    pattern.frequency = hoursSinceFirst > 0 ? pattern.accessCount / hoursSinceFirst : 0;
  }

  /**
   * Consider promotion of cache entry to warmer level
   * @param {string} key - Cache key
   * @param {Object} entry - Cache entry
   * @param {string} currentLevel - Current cache level
   */
  considerPromotion(key, entry, currentLevel) {
    const pattern = this.accessPatterns.get(key);
    if (!pattern || pattern.accessCount < 3) {
      return; // Need more access history
    }

    // Promote if frequently accessed from colder level
    if (currentLevel === 'cold' && pattern.accessCount >= 5) {
      this.promoteEntry(key, entry, 'cold', 'warm');
    } else if (currentLevel === 'warm' && pattern.accessCount >= 10) {
      this.promoteEntry(key, entry, 'warm', 'hot');
    }
  }

  /**
   * Promote entry to warmer cache level
   * @param {string} key - Cache key
   * @param {Object} entry - Cache entry
   * @param {string} fromLevel - Source level
   * @param {string} toLevel - Target level
   */
  promoteEntry(key, entry, fromLevel, toLevel) {
    // Remove from source level
    this.cache[fromLevel].delete(key);
    
    // Add to target level
    this.cache[toLevel].set(key, {
      ...entry,
      promotedAt: Date.now()
    });
    
    // Update metadata
    const meta = this.metadata.get(key);
    if (meta) {
      meta.level = toLevel;
      meta.promotions = (meta.promotions || 0) + 1;
    }
  }

  /**
   * Ensure cache capacity at specified level
   * @param {string} level - Cache level
   */
  ensureCapacity(level) {
    const cache = this.cache[level];
    const maxSize = this.getMaxSizeForLevel(level);
    
    if (cache.size >= maxSize) {
      // Evict least recently used entries
      const entries = Array.from(cache.entries());
      
      // Sort by last accessed time
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      // Evict oldest entries until capacity is available
      const toEvict = entries.slice(0, Math.max(1, cache.size - maxSize + 1));
      
      toEvict.forEach(([key]) => {
        cache.delete(key);
        this.metadata.delete(key);
        this.metrics.evictions++;
      });
    }
  }

  /**
   * Get maximum size for cache level
   * @param {string} level - Cache level
   * @returns {number} Maximum size
   */
  getMaxSizeForLevel(level) {
    switch (level) {
      case 'hot':
        return Math.floor(this.options.maxSize * 0.1); // 10% for hot cache
      case 'warm':
        return Math.floor(this.options.maxSize * 0.3); // 30% for warm cache
      case 'cold':
        return Math.floor(this.options.maxSize * 0.6); // 60% for cold cache
      default:
        return this.options.maxSize;
    }
  }

  /**
   * Get predictive data for a key
   * @param {string} key - Cache key
   * @returns {Object} Predictive data or null
   */
  async getPredictiveData(key) {
    try {
      // Extract route information from key
      const routeInfo = this.parseRouteKey(key);
      
      if (!routeInfo) {
        return null;
      }

      // Check for similar routes in cache
      const similarKeys = this.findSimilarRoutes(routeInfo);
      
      if (similarKeys.length === 0) {
        return null;
      }

      // Aggregate data from similar routes
      const similarData = [];
      for (const similarKey of similarKeys) {
        const data = await this.get(similarKey);
        if (data) {
          similarData.push({
            key: similarKey,
            price: data.price,
            timestamp: data.timestamp
          });
        }
      }

      if (similarData.length === 0) {
        return null;
      }

      // Calculate predictive price based on similar routes
      const prices = similarData.map(d => d.price);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const trend = this.calculateSimpleTrend(similarData);

      return {
        key,
        predictive: true,
        price: avgPrice,
        minPrice,
        maxPrice,
        trend,
        confidence: Math.min(0.8, similarData.length / 10),
        basedOn: similarData.length,
        generatedAt: Date.now()
      };
    } catch (error) {
      console.error('Error getting predictive data:', error);
      return null;
    }
  }

  /**
   * Parse route information from cache key
   * @param {string} key - Cache key
   * @returns {Object} Route information
   */
  parseRouteKey(key) {
    // Simple parsing - in a real implementation, this would be more sophisticated
    const parts = key.split('-');
    if (parts.length < 2) return null;
    
    return {
      origin: parts[0],
      destination: parts[1],
      route: `${parts[0]}-${parts[1]}`
    };
  }

  /**
   * Find similar routes in cache
   * @param {Object} routeInfo - Route information
   * @returns {Array} Similar route keys
   */
  findSimilarRoutes(routeInfo) {
    const similar = [];
    const route = routeInfo.route;
    
    // Find routes with same origin or destination
    for (const key of this.metadata.keys()) {
      if (key.includes(route) && key !== route) {
        similar.push(key);
      }
    }
    
    return similar.slice(0, 5); // Limit to 5 similar routes
  }

  /**
   * Calculate simple trend from data
   * @param {Array} data - Data points
   * @returns {string} Trend direction
   */
  calculateSimpleTrend(data) {
    if (data.length < 2) return 'stable';
    
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.price, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.price, 0) / secondHalf.length;
    
    const change = secondAvg - firstAvg;
    const threshold = firstAvg * 0.05; // 5% threshold
    
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Compress data for storage
   * @param {any} data - Data to compress
   * @returns {any} Compressed data
   */
  compressData(data) {
    // In a real implementation, this would use actual compression
    // For now, just return the data
    return data;
  }

  /**
   * Calculate size of data
   * @param {any} data - Data to measure
   * @returns {number} Size in bytes
   */
  calculateSize(data) {
    // Simple size calculation - in a real implementation, this would be more accurate
    return JSON.stringify(data).length * 2; // Rough estimate
  }

  /**
   * Update average response time metric
   * @param {number} responseTime - Response time in milliseconds
   */
  updateAverageResponseTime(responseTime) {
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageResponseTime = 
      alpha * responseTime + (1 - alpha) * this.metrics.averageResponseTime;
  }

  /**
   * Start background processes
   */
  startBackgroundProcesses() {
    // Cache cleanup process
    setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);

    // Metrics reporting process
    if (this.options.enableMetrics) {
      setInterval(() => {
        this.reportMetrics();
      }, this.options.metricsInterval);
    }

    // Predictive caching process
    if (this.options.enablePredictiveCaching) {
      setInterval(() => {
        this.preloadLikelyData();
      }, 10 * 60 * 1000); // Every 10 minutes
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    ['hot', 'warm', 'cold'].forEach(level => {
      const cache = this.cache[level];
      const toDelete = [];
      
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          toDelete.push(key);
        }
      }
      
      toDelete.forEach(key => {
        cache.delete(key);
        this.metadata.delete(key);
        cleanedCount++;
      });
    });

    this.lastCleanup = now;
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Preload likely-to-be-accessed data
   */
  async preloadLikelyData() {
    try {
      // Get most accessed routes from patterns
      const mostAccessed = Array.from(this.accessPatterns.entries())
        .filter(([key, pattern]) => pattern.frequency > 2)
        .sort((a, b) => b[1].frequency - a[1].frequency)
        .slice(0, 10)
        .map(([key]) => key);

      // Preload price data for these routes
      for (const route of mostAccessed) {
        const routeInfo = this.parseRouteKey(route);
        if (routeInfo) {
          try {
            // Fetch current price data
            const priceData = await this.fetchPriceData(routeInfo);
            if (priceData) {
              this.set(route, priceData, { 
                priority: 8, // High priority for preloaded data
                ttl: this.options.ttl * 2 // Longer TTL for preloaded data
              });
            }
          } catch (error) {
            console.error(`Error preloading route ${route}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in preload process:', error);
    }
  }

  /**
   * Fetch price data for a route
   * @param {Object} routeInfo - Route information
   * @returns {Object} Price data
   */
  async fetchPriceData(routeInfo) {
    try {
      // Get price history from database
      const priceHistory = await getManyDocs("PriceHistory", {
        "route.origin.airportCode": routeInfo.origin,
        "route.destination.airportCode": routeInfo.destination
      }, [], { 
        sort: { "currentPrice.recordedAt": -1 },
        limit: 1
      });

      if (priceHistory.length === 0) {
        return null;
      }

      const latestPrice = priceHistory[0];
      
      return {
        price: latestPrice.currentPrice.amount,
        currency: latestPrice.currentPrice.currency,
        recordedAt: latestPrice.currentPrice.recordedAt,
        flightCode: latestPrice.flightCode,
        airlineCode: latestPrice.airlineCode
      };
    } catch (error) {
      console.error('Error fetching price data:', error);
      return null;
    }
  }

  /**
   * Report performance metrics
   */
  reportMetrics() {
    const hitRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.hits / this.metrics.totalRequests) * 100 : 0;
    
    const predictiveHitRate = (this.metrics.predictiveHits + this.metrics.predictiveMisses) > 0 ? 
      (this.metrics.predictiveHits / (this.metrics.predictiveHits + this.metrics.predictiveMisses)) * 100 : 0;
    
    const totalSize = this.cache.hot.size + this.cache.warm.size + this.cache.cold.size;
    this.metrics.memoryUsage = totalSize;

    const metrics = {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      predictiveHitRate: Math.round(predictiveHitRate * 100) / 100,
      cacheSize: totalSize,
      hotSize: this.cache.hot.size,
      warmSize: this.cache.warm.size,
      coldSize: this.cache.cold.size,
      uptime: Date.now() - this.startTime
    };

    console.log('Cache Performance Metrics:', metrics);
    return metrics;
  }

  /**
   * Get comprehensive cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.hits / this.metrics.totalRequests) * 100 : 0;
    
    const totalSize = this.cache.hot.size + this.cache.warm.size + this.cache.cold.size;
    
    return {
      size: totalSize,
      maxSize: this.options.maxSize,
      utilization: (totalSize / this.options.maxSize) * 100,
      hitRate: Math.round(hitRate * 100) / 100,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      evictions: this.metrics.evictions,
      predictiveHits: this.metrics.predictiveHits,
      predictiveMisses: this.metrics.predictiveMisses,
      levels: {
        hot: {
          size: this.cache.hot.size,
          maxSize: this.getMaxSizeForLevel('hot'),
          utilization: (this.cache.hot.size / this.getMaxSizeForLevel('hot')) * 100
        },
        warm: {
          size: this.cache.warm.size,
          maxSize: this.getMaxSizeForLevel('warm'),
          utilization: (this.cache.warm.size / this.getMaxSizeForLevel('warm')) * 100
        },
        cold: {
          size: this.cache.cold.size,
          maxSize: this.getMaxSizeForLevel('cold'),
          utilization: (this.cache.cold.size / this.getMaxSizeForLevel('cold')) * 100
        }
      },
      uptime: Date.now() - this.startTime,
      lastCleanup: this.lastCleanup
    };
  }

  /**
   * Clear all cache data
   */
  clear() {
    this.cache.hot.clear();
    this.cache.warm.clear();
    this.cache.cold.clear();
    this.metadata.clear();
    this.accessPatterns.clear();
    
    // Reset metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      predictiveHits: 0,
      predictiveMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      hotHitRate: 0,
      warmHitRate: 0,
      coldHitRate: 0
    };
    
    console.log('Cache cleared');
  }
}

// Singleton instance
let priceDataCacheInstance = null;

/**
 * Get or create price data cache instance
 * @param {Object} options - Configuration options
 * @returns {PriceDataCache} Cache instance
 */
export function getPriceDataCache(options) {
  if (!priceDataCacheInstance) {
    priceDataCacheInstance = new PriceDataCache(options);
  }
  return priceDataCacheInstance;
}

/**
 * Get cached price data (convenience function)
 * @param {string} key - Cache key
 */
export async function getCachedPriceData(key) {
  const cache = getPriceDataCache();
  return await cache.get(key);
}

/**
 * Set cached price data (convenience function)
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {Object} options - Cache options
 */
export function setCachedPriceData(key, data, options) {
  const cache = getPriceDataCache();
  return cache.set(key, data, options);
}

/**
 * Get cache statistics (convenience function)
 */
export function getCacheStats() {
  const cache = getPriceDataCache();
  return cache.getStats();
}