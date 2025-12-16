/**
 * Storage Quota Manager
 * Manages storage usage, cleanup, and quota optimization
 */

import indexedDBManager from './indexedDB';
import cacheManager from './cacheManager';

// Storage thresholds
const STORAGE_THRESHOLDS = {
  WARNING: 0.8,    // 80% - Show warning
  CRITICAL: 0.95,   // 95% - Critical, immediate cleanup
  EMERGENCY: 0.98    // 98% - Emergency cleanup
};

// Cleanup strategies
const CLEANUP_STRATEGIES = {
  AGGRESSIVE: 'aggressive',
  MODERATE: 'moderate',
  CONSERVATIVE: 'conservative'
};

// Data priorities
const DATA_PRIORITIES = {
  CRITICAL: 1,    // User data, bookings, preferences
  HIGH: 2,        // Recent search results
  MEDIUM: 3,      // Older search results
  LOW: 4           // Old cache, analytics
};

class StorageQuotaManager {
  constructor() {
    this.quotaInfo = null;
    this.cleanupInProgress = false;
    this.lastCleanup = Date.now();
    this.monitoringInterval = null;
    
    this.init();
  }

  /**
   * Initialize storage quota manager
   */
  async init() {
    await this.updateQuotaInfo();
    this.setupMonitoring();
    console.log('[StorageQuota] Initialized');
  }

  /**
   * Set up storage monitoring
   */
  setupMonitoring() {
    // Monitor storage usage every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.updateQuotaInfo();
      await this.checkStorageThresholds();
    }, 5 * 60 * 1000);

    // Listen for storage events
    if ('storage' in window) {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  /**
   * Update quota information
   */
  async updateQuotaInfo() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        
        this.quotaInfo = {
          quota: estimate.quota,
          usage: estimate.usage,
          usageDetails: estimate.usageDetails || {},
          percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2),
          available: estimate.quota - estimate.usage,
          lastUpdated: Date.now()
        };
        
        console.log('[StorageQuota] Updated quota info:', this.quotaInfo);
      }
    } catch (error) {
      console.error('[StorageQuota] Failed to update quota info:', error);
    }
  }

  /**
   * Check storage thresholds and trigger cleanup if needed
   */
  async checkStorageThresholds() {
    if (!this.quotaInfo || this.cleanupInProgress) return;

    const percentage = parseFloat(this.quotaInfo.percentage);
    
    if (percentage >= STORAGE_THRESHOLDS.EMERGENCY) {
      console.warn('[StorageQuota] Emergency storage threshold reached');
      await this.performCleanup(CLEANUP_STRATEGIES.AGGRESSIVE);
    } else if (percentage >= STORAGE_THRESHOLDS.CRITICAL) {
      console.warn('[StorageQuota] Critical storage threshold reached');
      await this.performCleanup(CLEANUP_STRATEGIES.MODERATE);
    } else if (percentage >= STORAGE_THRESHOLDS.WARNING) {
      console.warn('[StorageQuota] Warning storage threshold reached');
      await this.performCleanup(CLEANUP_STRATEGIES.CONSERVATIVE);
    }
  }

  /**
   * Perform storage cleanup
   */
  async performCleanup(strategy = CLEANUP_STRATEGIES.MODERATE) {
    if (this.cleanupInProgress) {
      console.log('[StorageQuota] Cleanup already in progress');
      return;
    }

    this.cleanupInProgress = true;
    console.log(`[StorageQuota] Starting ${strategy} cleanup`);

    try {
      const cleanupActions = this.getCleanupActions(strategy);
      let freedSpace = 0;

      for (const action of cleanupActions) {
        try {
          const result = await this.executeCleanupAction(action);
          freedSpace += result.freedSpace;
          
          console.log(`[StorageQuota] Cleanup action completed:`, {
            action: action.type,
            freedSpace: result.freedSpace,
            itemsRemoved: result.itemsRemoved
          });
        } catch (error) {
          console.error(`[StorageQuota] Cleanup action failed:`, {
            action: action.type,
            error: error.message
          });
        }
      }

      // Update quota info after cleanup
      await this.updateQuotaInfo();
      
      this.lastCleanup = Date.now();
      
      console.log(`[StorageQuota] Cleanup completed:`, {
        strategy,
        totalFreedSpace: freedSpace,
        newUsagePercentage: this.quotaInfo.percentage
      });

      return {
        strategy,
        freedSpace,
        newUsagePercentage: this.quotaInfo.percentage
      };
    } catch (error) {
      console.error('[StorageQuota] Cleanup failed:', error);
      throw error;
    } finally {
      this.cleanupInProgress = false;
    }
  }

  /**
   * Get cleanup actions based on strategy
   */
  getCleanupActions(strategy) {
    const actions = [];

    switch (strategy) {
      case CLEANUP_STRATEGIES.AGGRESSIVE:
        actions.push(
          { type: 'clear-analytics', priority: DATA_PRIORITIES.LOW },
          { type: 'clear-old-searches', priority: DATA_PRIORITIES.MEDIUM, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
          { type: 'clear-cache-metadata', priority: DATA_PRIORITIES.LOW },
          { type: 'clear-expired-cache', priority: DATA_PRIORITIES.MEDIUM },
          { type: 'compress-data', priority: DATA_PRIORITIES.LOW }
        );
        break;

      case CLEANUP_STRATEGIES.MODERATE:
        actions.push(
          { type: 'clear-analytics', priority: DATA_PRIORITIES.LOW },
          { type: 'clear-old-searches', priority: DATA_PRIORITIES.MEDIUM, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
          { type: 'clear-expired-cache', priority: DATA_PRIORITIES.MEDIUM }
        );
        break;

      case CLEANUP_STRATEGIES.CONSERVATIVE:
        actions.push(
          { type: 'clear-analytics', priority: DATA_PRIORITIES.LOW },
          { type: 'clear-old-searches', priority: DATA_PRIORITIES.MEDIUM, maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
        );
        break;
    }

    // Sort by priority (lower number = higher priority)
    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute cleanup action
   */
  async executeCleanupAction(action) {
    switch (action.type) {
      case 'clear-analytics':
        return await this.clearAnalyticsData();
      
      case 'clear-old-searches':
        return await this.clearOldSearches(action.maxAge);
      
      case 'clear-cache-metadata':
        return await this.clearCacheMetadata();
      
      case 'clear-expired-cache':
        return await this.clearExpiredCache();
      
      case 'compress-data':
        return await this.compressStoredData();
      
      default:
        throw new Error(`Unknown cleanup action: ${action.type}`);
    }
  }

  /**
   * Clear analytics data
   */
  async clearAnalyticsData() {
    try {
      const pendingEvents = await indexedDBManager.getPendingAnalyticsEvents();
      const itemsToRemove = pendingEvents.filter(event => 
        event.synced || (Date.now() - event.timestamp > 7 * 24 * 60 * 60 * 1000) // 7 days old
      );

      for (const event of itemsToRemove) {
        await indexedDBManager.delete(STORES.ANALYTICS_EVENTS, event.id);
      }

      return {
        freedSpace: itemsToRemove.length * 1024, // Estimate 1KB per event
        itemsRemoved: itemsToRemove.length
      };
    } catch (error) {
      console.error('[StorageQuota] Failed to clear analytics data:', error);
      return { freedSpace: 0, itemsRemoved: 0 };
    }
  }

  /**
   * Clear old search results
   */
  async clearOldSearches(maxAge) {
    try {
      const allSearches = await indexedDBManager.getAll(STORES.SEARCH_RESULTS);
      const cutoffTime = Date.now() - maxAge;
      
      const itemsToRemove = allSearches.filter(search => 
        search.timestamp < cutoffTime
      );

      for (const search of itemsToRemove) {
        await indexedDBManager.delete(STORES.SEARCH_RESULTS, search.id);
      }

      return {
        freedSpace: itemsToRemove.length * 10 * 1024, // Estimate 10KB per search
        itemsRemoved: itemsToRemove.length
      };
    } catch (error) {
      console.error('[StorageQuota] Failed to clear old searches:', error);
      return { freedSpace: 0, itemsRemoved: 0 };
    }
  }

  /**
   * Clear cache metadata
   */
  async clearCacheMetadata() {
    try {
      const metadata = await indexedDBManager.getAll(STORES.CACHE_METADATA);
      
      for (const item of metadata) {
        await indexedDBManager.delete(STORES.CACHE_METADATA, item.key);
      }

      return {
        freedSpace: metadata.length * 512, // Estimate 512B per metadata item
        itemsRemoved: metadata.length
      };
    } catch (error) {
      console.error('[StorageQuota] Failed to clear cache metadata:', error);
      return { freedSpace: 0, itemsRemoved: 0 };
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache() {
    try {
      let totalFreedSpace = 0;
      let totalItemsRemoved = 0;

      // Clear expired search results
      const searches = await indexedDBManager.getAll(STORES.SEARCH_RESULTS);
      const expiredSearches = searches.filter(search => 
        Date.now() - search.timestamp > 10 * 60 * 1000 // 10 minutes
      );

      for (const search of expiredSearches) {
        await indexedDBManager.delete(STORES.SEARCH_RESULTS, search.id);
      }

      totalFreedSpace += expiredSearches.length * 10 * 1024;
      totalItemsRemoved += expiredSearches.length;

      // Clear expired flight data
      const flights = await indexedDBManager.getAll(STORES.FLIGHT_DATA);
      const expiredFlights = flights.filter(flight => 
        Date.now() - flight.timestamp > 30 * 60 * 1000 // 30 minutes
      );

      for (const flight of expiredFlights) {
        await indexedDBManager.delete(STORES.FLIGHT_DATA, flight.id);
      }

      totalFreedSpace += expiredFlights.length * 5 * 1024;
      totalItemsRemoved += expiredFlights.length;

      // Clear expired hotel data
      const hotels = await indexedDBManager.getAll(STORES.HOTEL_DATA);
      const expiredHotels = hotels.filter(hotel => 
        Date.now() - hotel.timestamp > 30 * 60 * 1000 // 30 minutes
      );

      for (const hotel of expiredHotels) {
        await indexedDBManager.delete(STORES.HOTEL_DATA, hotel.id);
      }

      totalFreedSpace += expiredHotels.length * 5 * 1024;
      totalItemsRemoved += expiredHotels.length;

      return {
        freedSpace: totalFreedSpace,
        itemsRemoved: totalItemsRemoved
      };
    } catch (error) {
      console.error('[StorageQuota] Failed to clear expired cache:', error);
      return { freedSpace: 0, itemsRemoved: 0 };
    }
  }

  /**
   * Compress stored data
   */
  async compressStoredData() {
    try {
      // This is a placeholder for data compression
      // In a real implementation, you might compress large text fields
      // or optimize data structures
      
      let compressedSpace = 0;
      
      // Example: Remove unnecessary fields from cached data
      const searches = await indexedDBManager.getAll(STORES.SEARCH_RESULTS);
      
      for (const search of searches) {
        if (search.results && Array.isArray(search.results)) {
          // Remove large fields that aren't needed offline
          const originalSize = JSON.stringify(search.results).length;
          
          // Keep only essential fields
          const compressedResults = search.results.map(item => ({
            id: item.id,
            price: item.price,
            departureTime: item.departureTime,
            arrivalTime: item.arrivalTime,
            // Remove large descriptions, images, etc.
          }));
          
          const compressedSize = JSON.stringify(compressedResults).length;
          const spaceSaved = originalSize - compressedSize;
          
          if (spaceSaved > 0) {
            search.results = compressedResults;
            await indexedDBManager.put(STORES.SEARCH_RESULTS, search);
            compressedSpace += spaceSaved;
          }
        }
      }

      return {
        freedSpace: compressedSpace,
        itemsRemoved: 0
      };
    } catch (error) {
      console.error('[StorageQuota] Failed to compress data:', error);
      return { freedSpace: 0, itemsRemoved: 0 };
    }
  }

  /**
   * Handle storage change events
   */
  handleStorageChange(event) {
    console.log('[StorageQuota] Storage changed:', event);
    
    // Update quota info after a delay to allow for changes to settle
    setTimeout(async () => {
      await this.updateQuotaInfo();
      await this.checkStorageThresholds();
    }, 1000);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    await this.updateQuotaInfo();
    
    if (!this.quotaInfo) {
      return null;
    }

    try {
      // Get detailed storage breakdown
      const searchResults = await indexedDBManager.getAll(STORES.SEARCH_RESULTS);
      const flightData = await indexedDBManager.getAll(STORES.FLIGHT_DATA);
      const hotelData = await indexedDBManager.getAll(STORES.HOTEL_DATA);
      const analyticsEvents = await indexedDBManager.getAll(STORES.ANALYTICS_EVENTS);
      const userPreferences = await indexedDBManager.getAll(STORES.USER_PREFERENCES);

      const breakdown = {
        searchResults: {
          count: searchResults.length,
          estimatedSize: searchResults.length * 10 * 1024 // 10KB per search
        },
        flightData: {
          count: flightData.length,
          estimatedSize: flightData.length * 5 * 1024 // 5KB per flight
        },
        hotelData: {
          count: hotelData.length,
          estimatedSize: hotelData.length * 5 * 1024 // 5KB per hotel
        },
        analyticsEvents: {
          count: analyticsEvents.length,
          estimatedSize: analyticsEvents.length * 1024 // 1KB per event
        },
        userPreferences: {
          count: userPreferences.length,
          estimatedSize: userPreferences.length * 512 // 512B per preference
        }
      };

      const totalEstimatedSize = Object.values(breakdown).reduce(
        (sum, item) => sum + item.estimatedSize, 0
      );

      return {
        quota: this.quotaInfo,
        breakdown,
        totalEstimatedSize,
        lastCleanup: this.lastCleanup,
        cleanupInProgress: this.cleanupInProgress,
        recommendations: this.getOptimizationRecommendations(this.quotaInfo.percentage)
      };
    } catch (error) {
      console.error('[StorageQuota] Failed to get storage stats:', error);
      return {
        quota: this.quotaInfo,
        error: error.message
      };
    }
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(usagePercentage) {
    const recommendations = [];

    if (usagePercentage >= STORAGE_THRESHOLDS.EMERGENCY) {
      recommendations.push({
        type: 'emergency',
        title: 'Storage Nearly Full',
        description: 'Immediate cleanup required. Consider clearing old data.',
        action: 'perform-cleanup',
        priority: 'critical'
      });
    } else if (usagePercentage >= STORAGE_THRESHOLDS.CRITICAL) {
      recommendations.push({
        type: 'critical',
        title: 'Storage Critical',
        description: 'Storage is critically low. Automatic cleanup will run.',
        action: 'perform-cleanup',
        priority: 'high'
      });
    } else if (usagePercentage >= STORAGE_THRESHOLDS.WARNING) {
      recommendations.push({
        type: 'warning',
        title: 'Storage Running Low',
        description: 'Consider clearing old search results and cache.',
        action: 'perform-cleanup',
        priority: 'medium'
      });
    }

    if (usagePercentage < STORAGE_THRESHOLDS.WARNING) {
      recommendations.push({
        type: 'optimization',
        title: 'Storage Optimization',
        description: 'Storage usage is good. Consider periodic cleanup.',
        action: 'schedule-cleanup',
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Request more storage quota (if available)
   */
  async requestMoreQuota() {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const isPersistent = await navigator.storage.persist();
        console.log('[StorageQuota] Storage persistence:', isPersistent);
        return isPersistent;
      }
      
      return false;
    } catch (error) {
      console.error('[StorageQuota] Failed to request more quota:', error);
      return false;
    }
  }

  /**
   * Optimize storage layout
   */
  async optimizeStorageLayout() {
    try {
      console.log('[StorageQuota] Optimizing storage layout');
      
      // Reorganize data for better storage efficiency
      const optimizations = [
        this.removeDuplicateEntries(),
        this.compressLargeFields(),
        this.removeUnusedIndexes()
      ];

      const results = await Promise.allSettled(optimizations);
      
      let totalOptimized = 0;
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          totalOptimized += result.value.optimizedItems || 0;
        }
      });

      console.log('[StorageQuota] Storage optimization completed:', {
        totalOptimized,
        results: results.map(r => r.status)
      });

      return { totalOptimized, results };
    } catch (error) {
      console.error('[StorageQuota] Storage optimization failed:', error);
      throw error;
    }
  }

  /**
   * Remove duplicate entries
   */
  async removeDuplicateEntries() {
    // Implementation for removing duplicates
    return { optimizedItems: 0 };
  }

  /**
   * Compress large fields
   */
  async compressLargeFields() {
    // Implementation for compressing large fields
    return { optimizedItems: 0 };
  }

  /**
   * Remove unused indexes
   */
  async removeUnusedIndexes() {
    // Implementation for removing unused indexes
    return { optimizedItems: 0 };
  }

  /**
   * Cleanup monitoring interval
   */
  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Create singleton instance
const storageQuotaManager = new StorageQuotaManager();

export default storageQuotaManager;
export { STORAGE_THRESHOLDS, CLEANUP_STRATEGIES, DATA_PRIORITIES };