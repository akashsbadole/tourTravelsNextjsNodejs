import "server-only";
import { getFlightProviderManager } from "@/lib/integrations/flight-providers/provider-manager";
import { getRedisClient } from "@/lib/cache/redis-client";
import { getFlightCacheManager } from "@/lib/cache/flight-cache";
import { RealtimeFlightData } from "@/lib/db/models";
import { getFlightPerformanceOptimizer } from "@/lib/performance/flight-performance";

/**
 * Flight Data Synchronization Job
 * Background job to sync flight data and maintain cache freshness
 */
export class FlightDataSyncJob {
  constructor(options = {}) {
    this.options = {
      syncInterval: 5 * 60 * 1000, // 5 minutes
      batchSize: 100,
      maxConcurrentSyncs: 3,
      enableBackgroundSync: true,
      cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
      ...options
    };
    
    this.isRunning = false;
    this.syncTimer = null;
    this.cleanupTimer = null;
    this.performanceOptimizer = getFlightPerformanceOptimizer({
      batchSize: this.options.batchSize,
      maxConcurrentRequests: this.options.maxConcurrentSyncs
    });
  }

  /**
   * Start the synchronization job
   */
  async start() {
    if (this.isRunning) {
      console.warn('Flight data sync job is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting flight data synchronization job');

    try {
      // Initialize providers and cache
      await this.initializeComponents();

      // Start periodic sync
      if (this.options.enableBackgroundSync) {
        this.syncTimer = setInterval(async () => {
          await this.performSync();
        }, this.options.syncInterval);

        // Perform initial sync
        await this.performSync();
      }

      // Start cleanup job
      this.cleanupTimer = setInterval(async () => {
        await this.performCleanup();
      }, this.options.cleanupInterval);

      console.log('Flight data synchronization job started successfully');
    } catch (error) {
      console.error('Failed to start flight data sync job:', error);
      this.stop();
    }
  }

  /**
   * Stop the synchronization job
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    console.log('Flight data synchronization job stopped');
  }

  /**
   * Initialize components for synchronization
   */
  async initializeComponents() {
    // Initialize provider manager
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

    this.providerManager = getFlightProviderManager(providerConfig);

    // Initialize cache if enabled
    if (process.env.REDIS_ENABLED === 'true') {
      const redisClient = await getRedisClient();
      this.cacheManager = getFlightCacheManager(redisClient, {
        searchTTL: parseInt(process.env.FLIGHT_CACHE_TTL_SEARCH) || 600,
        availabilityTTL: parseInt(process.env.FLIGHT_CACHE_TTL_AVAILABILITY) || 60,
        pricingTTL: parseInt(process.env.FLIGHT_CACHE_TTL_PRICING) || 180
      });
    }
  }

  /**
   * Perform synchronization cycle
   */
  async performSync() {
    if (!this.isRunning) return;

    const syncStartTime = Date.now();
    let syncStats = {
      flightsUpdated: 0,
      flightsAdded: 0,
      errors: 0,
      duration: 0
    };

    try {
      console.log('Starting flight data synchronization cycle');

      // Get flights that need updating
      const flightsToUpdate = await this.getFlightsNeedingUpdate();
      
      if (flightsToUpdate.length === 0) {
        console.log('No flights need updating');
        return;
      }

      console.log(`Updating ${flightsToUpdate.length} flights`);

      // Process in batches for performance
      const batches = this.performanceOptimizer.createBatches(
        flightsToUpdate,
        this.options.batchSize
      );

      for (const batch of batches) {
        const batchResults = await this.processBatch(batch);
        
        syncStats.flightsUpdated += batchResults.updated || 0;
        syncStats.flightsAdded += batchResults.added || 0;
        syncStats.errors += batchResults.errors || 0;

        // Small delay between batches to avoid overwhelming providers
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      syncStats.duration = Date.now() - syncStartTime;

      console.log('Flight synchronization completed:', {
        flightsProcessed: flightsToUpdate.length,
        ...syncStats
      });

      // Update sync statistics
      await this.updateSyncStats(syncStats);

    } catch (error) {
      console.error('Flight synchronization error:', error);
      syncStats.errors++;
      syncStats.duration = Date.now() - syncStartTime;
      
      await this.updateSyncStats({
        ...syncStats,
        error: error.message
      });
    }
  }

  /**
   * Process a batch of flights
   * @param {Array} batch - Batch of flights to process
   * @returns {Promise<Object>} Batch processing results
   */
  async processBatch(batch) {
    const batchResults = {
      updated: 0,
      added: 0,
      errors: 0
    };

    try {
      // Group flights by provider for efficient processing
      const flightsByProvider = this.groupFlightsByProvider(batch);

      for (const [providerName, flights] of Object.entries(flightsByProvider)) {
        try {
          const results = await this.syncFlightsWithProvider(flights, providerName);
          
          batchResults.updated += results.updated || 0;
          batchResults.added += results.added || 0;
          batchResults.errors += results.errors || 0;

        } catch (error) {
          console.error(`Error syncing flights with ${providerName}:`, error);
          batchResults.errors++;
        }
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      batchResults.errors++;
    }

    return batchResults;
  }

  /**
   * Sync flights with specific provider
   * @param {Array} flights - Flights to sync
   * @param {string} providerName - Provider name
   * @returns {Promise<Object>} Sync results
   */
  async syncFlightsWithProvider(flights, providerName) {
    const provider = this.providerManager.getProvider(providerName);
    
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    const results = {
      updated: 0,
      added: 0,
      errors: 0
    };

    // Get flight IDs for batch operations
    const flightIds = flights.map(flight => flight.flightId || flight._id?.toString());

    try {
      // Check availability for all flights
      const availabilityResults = await provider.checkAvailability(flightIds);
      
      if (availabilityResults.success) {
        // Update database with real-time data
        await this.updateFlightData(flights, availabilityResults.data);
        results.updated = flights.length;
      } else {
        results.errors = flights.length;
        console.error(`Availability check failed for ${providerName}:`, availabilityResults.error);
      }

    } catch (error) {
      console.error(`Provider sync error for ${providerName}:`, error);
      results.errors = flights.length;
    }

    return results;
  }

  /**
   * Update flight data in database
   * @param {Array} flights - Flights to update
   * @param {Object} availabilityData - Availability data
   */
  async updateFlightData(flights, availabilityData) {
    const operations = flights.map(flight => {
      const flightId = flight.flightId || flight._id?.toString();
      const availability = availabilityData[flightId];

      return {
        updateOne: {
          filter: { flightId },
          update: {
            $set: {
              availability: availability ? {
                totalSeats: availability.totalSeats || flight.availability?.totalSeats || 0,
                availableSeats: availability.availableSeats || flight.availability?.availableSeats || 0,
                bookedSeats: availability.bookedSeats || flight.availability?.bookedSeats || 0,
                lastChecked: new Date(),
                status: availability.status || 'scheduled'
              } : flight.availability,
              pricing: availability?.pricing || flight.pricing,
              lastUpdated: new Date(),
              syncStatus: 'synced'
            }
          },
          upsert: true
        }
      };
    });

    await RealtimeFlightData.bulkWrite(operations);
  }

  /**
   * Get flights that need updating
   * @returns {Promise<Array>} Flights needing update
   */
  async getFlightsNeedingUpdate() {
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    const flights = await RealtimeFlightData.find({
      $or: [
        { lastUpdated: { $lt: cutoffTime } },
        { lastChecked: { $lt: cutoffTime } },
        { syncStatus: { $ne: 'synced' } },
        { syncStatus: { $exists: false } }
      ]
    })
    .limit(this.options.batchSize)
    .lean()
    .exec();

    return flights;
  }

  /**
   * Group flights by provider
   * @param {Array} flights - Flights to group
   * @returns {Object} Flights grouped by provider
   */
  groupFlightsByProvider(flights) {
    const grouped = {};

    flights.forEach(flight => {
      const provider = flight.provider || 'static';
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push(flight);
    });

    return grouped;
  }

  /**
   * Perform cleanup operations
   */
  async performCleanup() {
    try {
      console.log('Starting flight data cleanup');

      // Clean up old cache entries
      if (this.cacheManager) {
        const cacheStats = await this.cacheManager.getCacheStats();
        
        if (cacheStats.totalKeys > 10000) { // Arbitrary threshold
          console.log('Cleaning up old cache entries');
          await this.cacheManager.invalidateAllFlightCache();
        }
      }

      // Clean up old flight data
      const oldDataCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const deleteResult = await RealtimeFlightData.deleteMany({
        lastUpdated: { $lt: oldDataCutoff }
      });

      if (deleteResult.deletedCount > 0) {
        console.log(`Cleaned up ${deleteResult.deletedCount} old flight records`);
      }

      // Clean up performance optimizer caches
      this.performanceOptimizer.clearCaches();

      console.log('Flight data cleanup completed');

    } catch (error) {
      console.error('Flight data cleanup error:', error);
    }
  }

  /**
   * Update synchronization statistics
   * @param {Object} stats - Sync statistics
   */
  async updateSyncStats(stats) {
    try {
      // Store in database or monitoring system
      console.log('Sync statistics:', stats);
      
      // Could store in analytics collection or monitoring dashboard
      // For now, just log to console
      
    } catch (error) {
      console.error('Failed to update sync stats:', error);
    }
  }

  /**
   * Get job status
   * @returns {Object} Job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      options: this.options,
      lastSync: this.lastSyncTime,
      performance: this.performanceOptimizer.getPerformanceStats()
    };
  }

  /**
   * Force immediate synchronization
   */
  async forceSync() {
    console.log('Forcing immediate flight data synchronization');
    await this.performSync();
  }
}

// Singleton instance
let syncJobInstance = null;

/**
 * Get or create flight data sync job instance
 * @param {Object} options - Configuration options
 * @returns {FlightDataSyncJob} Sync job instance
 */
export function getFlightDataSyncJob(options) {
  if (!syncJobInstance) {
    syncJobInstance = new FlightDataSyncJob(options);
  }
  return syncJobInstance;
}

export { FlightDataSyncJob };