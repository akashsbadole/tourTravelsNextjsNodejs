import { createHash } from 'crypto';

/**
 * Performance optimization service for high-volume price monitoring
 * Implements caching, batch processing, and query optimization
 */
export class PerformanceOptimizer {
  constructor(options = {}) {
    this.options = {
      // Redis configuration
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        keyPrefix: 'price_alerts:',
        ttl: {
          priceData: 300, // 5 minutes
          flightData: 1800, // 30 minutes
          userData: 3600, // 1 hour
          analytics: 900, // 15 minutes
        },
      },
      // Batch processing configuration
      batching: {
        enabled: true,
        maxBatchSize: 100,
        batchTimeout: 5000, // 5 seconds
        maxConcurrentBatches: 5,
        priorityQueues: {
          high: 'price_alerts:batch:high',
          normal: 'price_alerts:batch:normal',
          low: 'price_alerts:batch:low',
        },
      },
      // Database optimization
      database: {
        connectionPoolSize: 20,
        queryTimeout: 30000,
        indexOptimization: true,
        readPreference: 'secondaryPreferred',
        writeConcern: { w: 1, j: true },
      },
      // Monitoring configuration
      monitoring: {
        enabled: true,
        metricsInterval: 60000, // 1 minute
        alertThresholds: {
          responseTime: 5000, // 5 seconds
          errorRate: 0.05, // 5%
          queueSize: 1000,
        },
      },
      ...options,
    };

    // Initialize Redis client (would be actual Redis client in production)
    this.redis = this.initializeRedis();
    
    // Initialize batch processors
    this.batchProcessors = {
      priceChecks: new BatchProcessor({
        name: 'priceChecks',
        ...this.options.batching,
        processor: this.processPriceCheckBatch.bind(this),
      }),
      notifications: new BatchProcessor({
        name: 'notifications',
        ...this.options.batching,
        processor: this.processNotificationBatch.bind(this),
      }),
      analytics: new BatchProcessor({
        name: 'analytics',
        ...this.options.batching,
        processor: this.processAnalyticsBatch.bind(this),
      }),
    };

    // Performance metrics
    this.metrics = new PerformanceMetrics(this.options.monitoring);
    
    // Query optimizer
    this.queryOptimizer = new QueryOptimizer(this.options.database);
  }

  /**
   * Initialize Redis client
   */
  initializeRedis() {
    // In production, this would be an actual Redis client
    // For now, we'll simulate with a simple in-memory cache
    return {
      cache: new Map(),
      async get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (item.expiresAt < Date.now()) {
          this.cache.delete(key);
          return null;
        }
        
        return item.value;
      },
      
      async set(key, value, ttl = 300) {
        this.cache.set(key, {
          value,
          expiresAt: Date.now() + (ttl * 1000),
        });
        return 'OK';
      },
      
      async del(key) {
        this.cache.delete(key);
        return 1;
      },
      
      async exists(key) {
        const item = this.cache.get(key);
        if (!item) return 0;
        
        if (item.expiresAt < Date.now()) {
          this.cache.delete(key);
          return 0;
        }
        
        return 1;
      },
      
      async expire(key, ttl) {
        const item = this.cache.get(key);
        if (!item) return 0;
        
        item.expiresAt = Date.now() + (ttl * 1000);
        return 1;
      },
      
      async incr(key) {
        const current = await this.get(key) || 0;
        const newValue = current + 1;
        await this.set(key, newValue);
        return newValue;
      },
      
      async hget(hash, field) {
        const item = await this.get(hash);
        return item ? item[field] : null;
      },
      
      async hset(hash, field, value) {
        const item = (await this.get(hash)) || {};
        item[field] = value;
        await this.set(hash, item);
        return 1;
      },
      
      async hincrby(hash, field, increment) {
        const current = await this.hget(hash, field) || 0;
        const newValue = current + increment;
        await this.hset(hash, field, newValue);
        return newValue;
      },
    };
  }

  /**
   * Get cached price data
   * @param {string} flightId - Flight ID
   * @param {Object} options - Cache options
   */
  async getCachedPriceData(flightId, options = {}) {
    const startTime = Date.now();
    const cacheKey = `${this.options.redis.keyPrefix}price:${flightId}`;
    
    try {
      // Try to get from cache first
      let data = await this.redis.get(cacheKey);
      
      if (data) {
        this.metrics.recordCacheHit('priceData');
        return { data, fromCache: true };
      }
      
      // Cache miss - fetch from database
      this.metrics.recordCacheMiss('priceData');
      
      // Use optimized query
      const query = this.queryOptimizer.buildPriceQuery(flightId, options);
      data = await this.executeOptimizedQuery(query);
      
      // Cache the result
      const ttl = options.ttl || this.options.redis.ttl.priceData;
      await this.redis.set(cacheKey, data, ttl);
      
      const duration = Date.now() - startTime;
      this.metrics.recordQuery('priceData', duration, true);
      
      return { data, fromCache: false };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.recordQuery('priceData', duration, false);
      throw error;
    }
  }

  /**
   * Batch price check processing
   * @param {Array} alertIds - Array of alert IDs
   */
  async batchPriceChecks(alertIds) {
    return this.batchProcessors.priceChecks.process(alertIds);
  }

  /**
   * Process a batch of price checks
   * @param {Array} batch - Batch of alert IDs
   */
  async processPriceCheckBatch(batch) {
    const startTime = Date.now();
    const results = [];
    
    try {
      // Group alerts by flight ID for efficient querying
      const alertsByFlight = await this.groupAlertsByFlight(batch);
      
      // Process each flight group
      for (const [flightId, alerts] of Object.entries(alertsByFlight)) {
        // Get cached price data
        const { data: priceData, fromCache } = await this.getCachedPriceData(flightId);
        
        // Check if we need fresh data
        if (!fromCache || this.shouldRefreshPriceData(priceData)) {
          // Fetch fresh data in background
          this.refreshPriceDataInBackground(flightId);
        }
        
        // Process alerts for this flight
        const flightResults = await this.processAlertsForFlight(alerts, priceData);
        results.push(...flightResults);
      }
      
      const duration = Date.now() - startTime;
      this.metrics.recordBatchProcessing('priceChecks', batch.length, duration, true);
      
      return { success: true, results };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.recordBatchProcessing('priceChecks', batch.length, duration, false);
      throw error;
    }
  }

  /**
   * Group alerts by flight ID for efficient processing
   * @param {Array} alertIds - Array of alert IDs
   */
  async groupAlertsByFlight(alertIds) {
    // In a real implementation, this would query the database
    // For now, we'll simulate the grouping
    const groups = {};
    
    for (const alertId of alertIds) {
      // Simulate getting alert data
      const alert = await this.getAlertData(alertId);
      const flightId = this.extractFlightId(alert);
      
      if (!groups[flightId]) {
        groups[flightId] = [];
      }
      groups[flightId].push(alert);
    }
    
    return groups;
  }

  /**
   * Process notifications in batches
   * @param {Array} notifications - Array of notifications
   */
  async batchNotifications(notifications) {
    return this.batchProcessors.notifications.process(notifications);
  }

  /**
   * Process a batch of notifications
   * @param {Array} batch - Batch of notifications
   */
  async processNotificationBatch(batch) {
    const startTime = Date.now();
    const results = [];
    
    try {
      // Group notifications by channel and user
      const groupedNotifications = this.groupNotificationsByChannel(batch);
      
      // Process each channel group
      for (const [channel, notifications] of Object.entries(groupedNotifications)) {
        const channelResults = await this.processNotificationsByChannel(channel, notifications);
        results.push(...channelResults);
      }
      
      const duration = Date.now() - startTime;
      this.metrics.recordBatchProcessing('notifications', batch.length, duration, true);
      
      return { success: true, results };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.recordBatchProcessing('notifications', batch.length, duration, false);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      performance: this.metrics.getMetrics(),
      cache: this.getCacheMetrics(),
      batches: this.getBatchMetrics(),
      database: this.getDatabaseMetrics(),
    };
  }

  /**
   * Optimize database queries
   * @param {Object} query - Query to optimize
   */
  optimizeQuery(query) {
    return this.queryOptimizer.optimize(query);
  }

  /**
   * Warm up cache with frequently accessed data
   * @param {Array} flightIds - Array of flight IDs to warm up
   */
  async warmUpCache(flightIds) {
    const promises = flightIds.map(async (flightId) => {
      try {
        await this.getCachedPriceData(flightId);
      } catch (error) {
        console.error(`Failed to warm up cache for flight ${flightId}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
  }

  /**
   * Clear cache for specific flight
   * @param {string} flightId - Flight ID
   */
  async clearFlightCache(flightId) {
    const cacheKey = `${this.options.redis.keyPrefix}price:${flightId}`;
    await this.redis.del(cacheKey);
  }

  /**
   * Should refresh price data based on age and volatility
   * @param {Object} priceData - Price data object
   */
  shouldRefreshPriceData(priceData) {
    if (!priceData || !priceData.lastUpdated) return true;
    
    const age = Date.now() - new Date(priceData.lastUpdated).getTime();
    const maxAge = this.options.redis.ttl.priceData * 1000;
    
    // Refresh if data is old
    if (age > maxAge) return true;
    
    // Refresh more frequently for volatile routes
    if (priceData.volatility && priceData.volatility > 0.1) {
      const volatileMaxAge = maxAge * 0.5;
      return age > volatileMaxAge;
    }
    
    return false;
  }

  /**
   * Refresh price data in background
   * @param {string} flightId - Flight ID
   */
  async refreshPriceDataInBackground(flightId) {
    // This would be implemented as a background job
    // For now, we'll just clear the cache
    await this.clearFlightCache(flightId);
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics() {
    return {
      hitRate: this.metrics.getCacheHitRate(),
      missRate: this.metrics.getCacheMissRate(),
      size: this.redis.cache.size,
      keys: Array.from(this.redis.cache.keys()),
    };
  }

  /**
   * Get batch processing metrics
   */
  getBatchMetrics() {
    return {
      priceChecks: this.batchProcessors.priceChecks.getMetrics(),
      notifications: this.batchProcessors.notifications.getMetrics(),
      analytics: this.batchProcessors.analytics.getMetrics(),
    };
  }

  /**
   * Get database metrics
   */
  getDatabaseMetrics() {
    return this.queryOptimizer.getMetrics();
  }
}

/**
 * Batch processor for handling large volumes of operations
 */
class BatchProcessor {
  constructor(options) {
    this.name = options.name;
    this.maxBatchSize = options.maxBatchSize;
    this.batchTimeout = options.batchTimeout;
    this.processor = options.processor;
    this.priorityQueues = options.priorityQueues;
    
    this.queues = {
      high: [],
      normal: [],
      low: [],
    };
    
    this.processing = false;
    this.metrics = {
      totalProcessed: 0,
      totalBatches: 0,
      averageProcessingTime: 0,
      errors: 0,
    };
  }

  /**
   * Add item to batch queue
   * @param {*} item - Item to process
   * @param {string} priority - Priority level (high, normal, low)
   */
  async add(item, priority = 'normal') {
    this.queues[priority].push(item);
    
    // Start processing if not already running
    if (!this.processing) {
      this.process();
    }
  }

  /**
   * Process multiple items
   * @param {Array} items - Items to process
   */
  async process(items) {
    // Add items to normal priority queue
    for (const item of items) {
      this.queues.normal.push(item);
    }
    
    // Start processing if not already running
    if (!this.processing) {
      await this.process();
    }
  }

  /**
   * Main processing loop
   */
  async process() {
    if (this.processing) return;
    
    this.processing = true;
    
    try {
      while (this.hasItems()) {
        const batch = this.createBatch();
        if (batch.length === 0) break;
        
        const startTime = Date.now();
        
        try {
          await this.processor(batch);
          
          const duration = Date.now() - startTime;
          this.updateMetrics(batch.length, duration, true);
          
        } catch (error) {
          const duration = Date.now() - startTime;
          this.updateMetrics(batch.length, duration, false);
          console.error(`Batch processing error in ${this.name}:`, error);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Create batch from queues
   */
  createBatch() {
    const batch = [];
    
    // Process high priority first
    while (batch.length < this.maxBatchSize && this.queues.high.length > 0) {
      batch.push(this.queues.high.shift());
    }
    
    // Then normal priority
    while (batch.length < this.maxBatchSize && this.queues.normal.length > 0) {
      batch.push(this.queues.normal.shift());
    }
    
    // Finally low priority
    while (batch.length < this.maxBatchSize && this.queues.low.length > 0) {
      batch.push(this.queues.low.shift());
    }
    
    return batch;
  }

  /**
   * Check if there are items to process
   */
  hasItems() {
    return this.queues.high.length > 0 || 
           this.queues.normal.length > 0 || 
           this.queues.low.length > 0;
  }

  /**
   * Update processing metrics
   * @param {number} batchSize - Size of the batch
   * @param {number} duration - Processing duration
   * @param {boolean} success - Whether processing was successful
   */
  updateMetrics(batchSize, duration, success) {
    this.metrics.totalProcessed += batchSize;
    this.metrics.totalBatches++;
    
    if (!success) {
      this.metrics.errors++;
    }
    
    // Update average processing time
    const totalProcessingTime = this.metrics.averageProcessingTime * (this.metrics.totalBatches - 1) + duration;
    this.metrics.averageProcessingTime = totalProcessingTime / this.metrics.totalBatches;
  }

  /**
   * Get processor metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueSizes: {
        high: this.queues.high.length,
        normal: this.queues.normal.length,
        low: this.queues.low.length,
      },
      processing: this.processing,
    };
  }
}

/**
 * Performance metrics collector
 */
class PerformanceMetrics {
  constructor(options) {
    this.options = options;
    this.metrics = {
      cache: {
        hits: 0,
        misses: 0,
      },
      queries: {
        total: 0,
        totalTime: 0,
        errors: 0,
      },
      batches: {
        total: 0,
        totalTime: 0,
        errors: 0,
      },
    };
    
    if (this.options.enabled) {
      this.startMetricsCollection();
    }
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.options.metricsInterval);
  }

  /**
   * Record cache hit
   * @param {string} type - Cache type
   */
  recordCacheHit(type) {
    this.metrics.cache.hits++;
  }

  /**
   * Record cache miss
   * @param {string} type - Cache type
   */
  recordCacheMiss(type) {
    this.metrics.cache.misses++;
  }

  /**
   * Record query execution
   * @param {string} type - Query type
   * @param {number} duration - Execution duration
   * @param {boolean} success - Whether query was successful
   */
  recordQuery(type, duration, success) {
    this.metrics.queries.total++;
    this.metrics.queries.totalTime += duration;
    
    if (!success) {
      this.metrics.queries.errors++;
    }
    
    // Check alert thresholds
    if (duration > this.options.alertThresholds.responseTime) {
      console.warn(`Slow query detected: ${type} took ${duration}ms`);
    }
  }

  /**
   * Record batch processing
   * @param {string} type - Batch type
   * @param {number} size - Batch size
   * @param {number} duration - Processing duration
   * @param {boolean} success - Whether processing was successful
   */
  recordBatchProcessing(type, size, duration, success) {
    this.metrics.batches.total++;
    this.metrics.batches.totalTime += duration;
    
    if (!success) {
      this.metrics.batches.errors++;
    }
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    return total > 0 ? this.metrics.cache.hits / total : 0;
  }

  /**
   * Get cache miss rate
   */
  getCacheMissRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    return total > 0 ? this.metrics.cache.misses / total : 0;
  }

  /**
   * Get average query time
   */
  getAverageQueryTime() {
    return this.metrics.queries.total > 0 
      ? this.metrics.queries.totalTime / this.metrics.queries.total 
      : 0;
  }

  /**
   * Get query error rate
   */
  getQueryErrorRate() {
    return this.metrics.queries.total > 0 
      ? this.metrics.queries.errors / this.metrics.queries.total 
      : 0;
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    // This would collect system-level metrics like CPU, memory, etc.
    // For now, we'll just log current metrics
    const metrics = this.getMetrics();
    
    // Check alert thresholds
    if (metrics.queries.errorRate > this.options.alertThresholds.errorRate) {
      console.warn(`High query error rate: ${metrics.queries.errorRate}`);
    }
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      cache: {
        hitRate: this.getCacheHitRate(),
        missRate: this.getCacheMissRate(),
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
      },
      queries: {
        total: this.metrics.queries.total,
        averageTime: this.getAverageQueryTime(),
        errorRate: this.getQueryErrorRate(),
        errors: this.metrics.queries.errors,
      },
      batches: {
        total: this.metrics.batches.total,
        averageTime: this.metrics.batches.total > 0 
          ? this.metrics.batches.totalTime / this.metrics.batches.total 
          : 0,
        errorRate: this.metrics.batches.total > 0 
          ? this.metrics.batches.errors / this.metrics.batches.total 
          : 0,
      },
    };
  }
}

/**
 * Query optimizer for database operations
 */
class QueryOptimizer {
  constructor(options) {
    this.options = options;
    this.metrics = {
      optimizations: 0,
      queryCount: 0,
      totalTime: 0,
    };
    
    this.queryTemplates = {
      priceData: {
        collection: 'priceHistory',
        pipeline: [
          { $match: { flightId: '$flightId' } },
          { $sort: { timestamp: -1 } },
          { $limit: 100 },
          {
            $project: {
              price: 1,
              timestamp: 1,
              airline: 1,
              source: 1,
            }
          },
        ],
      },
      alerts: {
        collection: 'priceAlerts',
        pipeline: [
          { $match: { isActive: true } },
          { $sort: { createdAt: -1 } },
          {
            $project: {
              searchCriteria: 1,
              alertConditions: 1,
              currentBestPrice: 1,
              lastTriggered: 1,
            }
          },
        ],
      },
    };
  }

  /**
   * Optimize a query
   * @param {Object} query - Query to optimize
   */
  optimize(query) {
    this.metrics.queryCount++;
    
    // Apply optimization strategies
    const optimized = {
      ...query,
      // Add index hints
      hint: this.getIndexHint(query),
      // Add read preference
      readPreference: this.options.readPreference,
      // Add query timeout
      maxTimeMS: this.options.queryTimeout,
      // Optimize projection
      projection: this.optimizeProjection(query.projection),
    };
    
    this.metrics.optimizations++;
    return optimized;
  }

  /**
   * Build optimized price query
   * @param {string} flightId - Flight ID
   * @param {Object} options - Query options
   */
  buildPriceQuery(flightId, options = {}) {
    const query = {
      collection: 'priceHistory',
      filter: { flightId },
      sort: { timestamp: -1 },
      limit: options.limit || 100,
      projection: options.projection || {
        price: 1,
        timestamp: 1,
        airline: 1,
        source: 1,
      },
    };
    
    return this.optimize(query);
  }

  /**
   * Get index hint for query
   * @param {Object} query - Query object
   */
  getIndexHint(query) {
    // Return appropriate index based on query pattern
    if (query.filter?.flightId) {
      return { flightId: 1, timestamp: -1 };
    }
    
    if (query.filter?.userId) {
      return { userId: 1, isActive: 1 };
    }
    
    return null;
  }

  /**
   * Optimize query projection
   * @param {Object} projection - Original projection
   */
  optimizeProjection(projection) {
    if (!projection) return null;
    
    // Remove unnecessary fields
    const optimized = { ...projection };
    
    // Always include _id unless explicitly excluded
    if (!optimized._id) {
      optimized._id = 1;
    }
    
    return optimized;
  }

  /**
   * Get optimizer metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      optimizationRate: this.metrics.queryCount > 0 
        ? this.metrics.optimizations / this.metrics.queryCount 
        : 0,
      averageQueryTime: this.metrics.queryCount > 0 
        ? this.metrics.totalTime / this.metrics.queryCount 
        : 0,
    };
  }
}

// Singleton instance
let performanceOptimizerInstance = null;

/**
 * Get performance optimizer instance
 */
export function getPerformanceOptimizer(options = {}) {
  if (!performanceOptimizerInstance) {
    performanceOptimizerInstance = new PerformanceOptimizer(options);
  }
  return performanceOptimizerInstance;
}

/**
 * Reset performance optimizer instance (for testing)
 */
export function resetPerformanceOptimizer() {
  performanceOptimizerInstance = null;
}