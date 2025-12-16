import "server-only";

/**
 * Flight Performance Optimizer
 * Optimizes flight data operations for better performance
 */
export class FlightPerformanceOptimizer {
  constructor(options = {}) {
    this.options = {
      batchSize: 50,
      maxConcurrentRequests: 5,
      cacheThreshold: 100, // items
      compressionEnabled: true,
      deduplicationEnabled: true,
      ...options
    };
    
    this.requestQueue = [];
    this.activeRequests = 0;
    this.cache = new Map();
    this.deduplicationCache = new Map();
  }

  /**
   * Batch flight requests for better performance
   * @param {Array} requests - Array of flight requests
   * @returns {Promise<Array>} Batched results
   */
  async batchRequests(requests) {
    const batches = this.createBatches(requests, this.options.batchSize);
    const results = [];

    for (const batch of batches) {
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Process batch with concurrency control
   * @param {Array} batch - Batch of requests
   * @returns {Promise<Array>} Batch results
   */
  async processBatch(batch) {
    // Limit concurrent requests
    const semaphore = new Array(this.options.maxConcurrentRequests).fill(null);
    const promises = batch.map(async (request, index) => {
      const slot = index % this.options.maxConcurrentRequests;
      
      // Wait for available slot
      while (semaphore[slot] !== null) {
        await new Promise(resolve => {
          const checkSlot = () => {
            if (semaphore[slot] === null) {
              resolve();
            } else {
              setTimeout(checkSlot, 10);
            }
          };
          checkSlot();
        });
      }

      // Occupy slot
      semaphore[slot] = this.processRequest(request);
      
      try {
        const result = await semaphore[slot];
        return result;
      } finally {
        // Release slot
        semaphore[slot] = null;
      }
    });

    return Promise.all(promises);
  }

  /**
   * Process individual request with optimizations
   * @param {Object} request - Flight request
   * @returns {Promise<Object>} Request result
   */
  async processRequest(request) {
    // Check deduplication cache
    if (this.options.deduplicationEnabled) {
      const cacheKey = this.generateRequestKey(request);
      const cached = this.deduplicationCache.get(cacheKey);
      
      if (cached) {
        return cached;
      }
    }

    // Add request to queue for rate limiting
    this.requestQueue.push(request);
    
    try {
      // Process the actual request
      const result = await this.executeRequest(request);
      
      // Cache result if within threshold
      if (this.shouldCacheResult(request, result)) {
        const cacheKey = this.generateRequestKey(request);
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          accessCount: 1
        });
      }

      // Cache for deduplication
      if (this.options.deduplicationEnabled) {
        const dedupKey = this.generateRequestKey(request);
        this.deduplicationCache.set(dedupKey, result);
        
        // Clear deduplication cache after 5 minutes
        setTimeout(() => {
          this.deduplicationCache.delete(dedupKey);
        }, 5 * 60 * 1000);
      }

      return result;

    } finally {
      // Remove from queue
      const index = this.requestQueue.indexOf(request);
      if (index > -1) {
        this.requestQueue.splice(index, 1);
      }
    }
  }

  /**
   * Execute the actual request
   * @param {Object} request - Flight request
   * @returns {Promise<Object>} Request result
   */
  async executeRequest(request) {
    this.activeRequests++;
    
    try {
      let result;
      
      switch (request.type) {
        case 'search':
          result = await this.executeSearchRequest(request);
          break;
        case 'availability':
          result = await this.executeAvailabilityRequest(request);
          break;
        case 'pricing':
          result = await this.executePricingRequest(request);
          break;
        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }

      // Compress result if enabled
      if (this.options.compressionEnabled && result.data) {
        result.compressed = this.compressData(result.data);
        result.originalSize = JSON.stringify(result.data).length;
        result.compressedSize = result.compressed.length;
      }

      return result;

    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Execute search request with performance tracking
   * @param {Object} request - Search request
   * @returns {Promise<Object>} Search result
   */
  async executeSearchRequest(request) {
    const startTime = Date.now();
    
    try {
      const { getFlightProviderManager } = await import("@/lib/integrations/flight-providers/provider-manager");
      const providerManager = getFlightProviderManager(request.providerConfig);
      
      const result = await providerManager.searchFlights(request.params, request.options);
      
      const duration = Date.now() - startTime;
      
      return {
        ...result,
        performance: {
          duration,
          type: 'search',
          resultCount: result.data?.length || 0,
          cacheHit: result.metadata?.cached || false
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        performance: {
          duration,
          type: 'search',
          error: true
        }
      };
    }
  }

  /**
   * Execute availability request with performance tracking
   * @param {Object} request - Availability request
   * @returns {Promise<Object>} Availability result
   */
  async executeAvailabilityRequest(request) {
    const startTime = Date.now();
    
    try {
      const { getFlightProviderManager } = await import("@/lib/integrations/flight-providers/provider-manager");
      const providerManager = getFlightProviderManager(request.providerConfig);
      
      const result = await providerManager.checkAvailability(request.params.flightIds, request.options);
      
      const duration = Date.now() - startTime;
      
      return {
        ...result,
        performance: {
          duration,
          type: 'availability',
          flightCount: request.params.flightIds.length,
          cacheHit: result.metadata?.cached || false
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        performance: {
          duration,
          type: 'availability',
          error: true
        }
      };
    }
  }

  /**
   * Execute pricing request with performance tracking
   * @param {Object} request - Pricing request
   * @returns {Promise<Object>} Pricing result
   */
  async executePricingRequest(request) {
    const startTime = Date.now();
    
    try {
      const { getFlightProviderManager } = await import("@/lib/integrations/flight-providers/provider-manager");
      const providerManager = getFlightProviderManager(request.providerConfig);
      
      const result = await providerManager.getPricing(
        request.params.flightIds,
        request.params.passengerCounts,
        request.params.cabinClass
      );
      
      const duration = Date.now() - startTime;
      
      return {
        ...result,
        performance: {
          duration,
          type: 'pricing',
          flightCount: request.params.flightIds.length,
          cacheHit: result.metadata?.cached || false
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        performance: {
          duration,
          type: 'pricing',
          error: true
        }
      };
    }
  }

  /**
   * Create batches from array
   * @param {Array} items - Items to batch
   * @param {number} batchSize - Batch size
   * @returns {Array<Array>} Array of batches
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Generate request key for caching
   * @param {Object} request - Flight request
   * @returns {string} Request key
   */
  generateRequestKey(request) {
    const keyData = {
      type: request.type,
      params: request.params,
      options: request.options
    };
    
    return JSON.stringify(keyData, Object.keys(keyData).sort());
  }

  /**
   * Check if result should be cached
   * @param {Object} request - Flight request
   * @param {Object} result - Request result
   * @returns {boolean} Whether to cache
   */
  shouldCacheResult(request, result) {
    // Don't cache errors
    if (!result.success) {
      return false;
    }

    // Don't cache large results
    const resultSize = JSON.stringify(result.data).length;
    if (resultSize > this.options.cacheThreshold * 1024) { // Convert KB to bytes
      return false;
    }

    // Cache successful results
    return true;
  }

  /**
   * Compress data for storage/transmission
   * @param {Object} data - Data to compress
   * @returns {string} Compressed data
   */
  compressData(data) {
    // Simple compression for demonstration
    // In production, use proper compression library
    const jsonString = JSON.stringify(data);
    
    // Remove redundant whitespace
    let compressed = jsonString.replace(/\s+/g, ' ');
    
    // Replace common patterns
    const commonPatterns = {
      '"flightCode":': '"fc":',
      '"airline":': '"al":',
      '"departure":': '"dep":',
      '"arrival":': '"arr":',
      '"available":': '"avail":'
    };
    
    for (const [pattern, replacement] of Object.entries(commonPatterns)) {
      compressed = compressed.replace(new RegExp(pattern, 'g'), replacement);
    }
    
    return compressed;
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getPerformanceStats() {
    return {
      cache: {
        size: this.cache.size,
        threshold: this.options.cacheThreshold
      },
      requests: {
        queued: this.requestQueue.length,
        active: this.activeRequests,
        maxConcurrent: this.options.maxConcurrentRequests,
        batchSize: this.options.batchSize
      },
      optimization: {
        compressionEnabled: this.options.compressionEnabled,
        deduplicationEnabled: this.options.deduplicationEnabled,
        deduplicationCacheSize: this.deduplicationCache.size
      }
    };
  }

  /**
   * Clear caches
   */
  clearCaches() {
    this.cache.clear();
    this.deduplicationCache.clear();
    this.requestQueue = [];
  }

  /**
   * Optimize flight search results
   * @param {Array} flights - Flight results
   * @param {Object} options - Optimization options
   * @returns {Array} Optimized results
   */
  optimizeSearchResults(flights, options = {}) {
    if (!flights || flights.length === 0) {
      return flights;
    }

    let optimized = [...flights];

    // Sort by price if requested
    if (options.sortBy === 'price') {
      optimized.sort((a, b) => {
        const priceA = this.extractPrice(a);
        const priceB = this.extractPrice(b);
        return priceA - priceB;
      });
    }

    // Sort by duration if requested
    if (options.sortBy === 'duration') {
      optimized.sort((a, b) => {
        const durationA = this.extractDuration(a);
        const durationB = this.extractDuration(b);
        return durationA - durationB;
      });
    }

    // Sort by departure time if requested
    if (options.sortBy === 'departure') {
      optimized.sort((a, b) => {
        const timeA = this.extractDepartureTime(a);
        const timeB = this.extractDepartureTime(b);
        return timeA - timeB;
      });
    }

    // Filter by price range if specified
    if (options.priceRange) {
      optimized = optimized.filter(flight => {
        const price = this.extractPrice(flight);
        return price >= options.priceRange.min && price <= options.priceRange.max;
      });
    }

    // Filter by airlines if specified
    if (options.allowedAirlines && options.allowedAirlines.length > 0) {
      optimized = optimized.filter(flight => {
        const airline = this.extractAirline(flight);
        return options.allowedAirlines.includes(airline);
      });
    }

    // Limit results if specified
    if (options.limit && options.limit > 0) {
      optimized = optimized.slice(0, options.limit);
    }

    return optimized;
  }

  /**
   * Extract price from flight result
   * @param {Object} flight - Flight result
   * @returns {number} Price
   */
  extractPrice(flight) {
    return flight.pricing?.total || flight.fareBreakdowns?.total || 0;
  }

  /**
   * Extract duration from flight result
   * @param {Object} flight - Flight result
   * @returns {number} Duration in minutes
   */
  extractDuration(flight) {
    return flight.totalDurationMinutes || flight.duration || 0;
  }

  /**
   * Extract departure time from flight result
   * @param {Object} flight - Flight result
   * @returns {number} Departure timestamp
   */
  extractDepartureTime(flight) {
    const departureTime = flight.departure?.scheduledTime || 
                          flight.segments?.[0]?.from?.scheduledDeparture ||
                          flight.date;
    
    return new Date(departureTime).getTime();
  }

  /**
   * Extract airline from flight result
   * @param {Object} flight - Flight result
   * @returns {string} Airline code
   */
  extractAirline(flight) {
    return flight.airline?.code || 
           flight.carrierInCharge?._id || 
           flight.carrierInCharge || 
           '';
  }
}

// Singleton instance
let performanceOptimizerInstance = null;

/**
 * Get or create flight performance optimizer instance
 * @param {Object} options - Configuration options
 * @returns {FlightPerformanceOptimizer} Optimizer instance
 */
export function getFlightPerformanceOptimizer(options) {
  if (!performanceOptimizerInstance) {
    performanceOptimizerInstance = new FlightPerformanceOptimizer(options);
  }
  return performanceOptimizerInstance;
}

export { FlightPerformanceOptimizer };