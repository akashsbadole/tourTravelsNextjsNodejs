/**
 * Background Sync Manager
 * Handles background synchronization of offline data
 */

import indexedDBManager from './indexedDB';
import cacheManager from './cacheManager';

// Sync types
const SYNC_TYPES = {
  SEARCH_RESULTS: 'search-results',
  USER_PREFERENCES: 'user-preferences',
  ANALYTICS: 'analytics',
  BOOKINGS: 'bookings',
  REVIEWS: 'reviews'
};

// Sync priorities
const SYNC_PRIORITIES = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4
};

// Sync status
const SYNC_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

class BackgroundSyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncQueue = [];
    this.syncHistory = [];
    this.eventListeners = [];
    this.syncInProgress = new Map();
    
    this.init();
  }

  /**
   * Initialize background sync
   */
  init() {
    // Set up periodic sync
    this.setupPeriodicSync();
    
    // Set up online event listener
    window.addEventListener('online', this.handleOnline.bind(this));
    
    // Process any pending sync items
    this.processPendingSyncs();
    
    console.log('[BackgroundSync] Initialized');
  }

  /**
   * Set up periodic sync
   */
  setupPeriodicSync() {
    // Sync every 5 minutes when online
    setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.processPendingSyncs();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('[BackgroundSync] Connection restored, processing sync queue');
    setTimeout(() => {
      this.processPendingSyncs();
    }, 1000); // Wait a bit for connection to stabilize
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(item, syncType, priority = SYNC_PRIORITIES.MEDIUM) {
    const syncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: syncType,
      item,
      priority,
      status: SYNC_STATUS.PENDING,
      attempts: 0,
      maxAttempts: 3,
      timestamp: Date.now(),
      lastAttempt: null,
      error: null
    };

    try {
      // Store in IndexedDB
      await indexedDBManager.addToSyncQueue(syncItem, syncType);
      
      // Add to in-memory queue
      this.syncQueue.push(syncItem);
      this.syncQueue.sort((a, b) => a.priority - b.priority);
      
      console.log(`[BackgroundSync] Added to sync queue: ${syncItem.id}`);
      
      // Trigger sync if online
      if (navigator.onLine && !this.isSyncing) {
        this.processPendingSyncs();
      }
      
      return syncItem.id;
    } catch (error) {
      console.error('[BackgroundSync] Failed to add to sync queue:', error);
      throw error;
    }
  }

  /**
   * Process pending syncs
   */
  async processPendingSyncs() {
    if (this.isSyncing) {
      console.log('[BackgroundSync] Sync already in progress');
      return;
    }

    try {
      // Get pending items from IndexedDB
      const pendingItems = await indexedDBManager.getSyncQueue();
      
      if (pendingItems.length === 0) {
        console.log('[BackgroundSync] No pending sync items');
        return;
      }

      this.isSyncing = true;
      console.log(`[BackgroundSync] Processing ${pendingItems.length} sync items`);

      // Process items by priority
      const sortedItems = pendingItems.sort((a, b) => a.priority - b.priority);
      
      for (const syncItem of sortedItems) {
        if (this.syncInProgress.has(syncItem.id)) {
          continue; // Skip if already processing
        }

        try {
          await this.processSyncItem(syncItem);
        } catch (error) {
          console.error(`[BackgroundSync] Failed to process sync item ${syncItem.id}:`, error);
        }
      }

      console.log('[BackgroundSync] Sync processing completed');
    } catch (error) {
      console.error('[BackgroundSync] Sync processing failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process individual sync item
   */
  async processSyncItem(syncItem) {
    this.syncInProgress.set(syncItem.id, true);
    
    try {
      // Update status to in-progress
      syncItem.status = SYNC_STATUS.IN_PROGRESS;
      syncItem.lastAttempt = Date.now();
      syncItem.attempts += 1;
      
      await indexedDBManager.put(STORES.SYNC_QUEUE, syncItem);
      
      // Process based on type
      let result;
      switch (syncItem.type) {
        case SYNC_TYPES.SEARCH_RESULTS:
          result = await this.syncSearchResults(syncItem.item);
          break;
        case SYNC_TYPES.USER_PREFERENCES:
          result = await this.syncUserPreferences(syncItem.item);
          break;
        case SYNC_TYPES.ANALYTICS:
          result = await this.syncAnalytics(syncItem.item);
          break;
        case SYNC_TYPES.BOOKINGS:
          result = await this.syncBookings(syncItem.item);
          break;
        case SYNC_TYPES.REVIEWS:
          result = await this.syncReviews(syncItem.item);
          break;
        default:
          throw new Error(`Unknown sync type: ${syncItem.type}`);
      }

      // Mark as completed
      syncItem.status = SYNC_STATUS.COMPLETED;
      syncItem.completedAt = Date.now();
      
      await indexedDBManager.put(STORES.SYNC_QUEUE, syncItem);
      await indexedDBManager.removeFromSyncQueue(syncItem.id);
      
      // Add to history
      this.addToHistory(syncItem, result);
      
      // Notify listeners
      this.notifyListeners('sync-completed', {
        syncItem,
        result
      });
      
      console.log(`[BackgroundSync] Sync completed: ${syncItem.id}`);
      
    } catch (error) {
      console.error(`[BackgroundSync] Sync failed for ${syncItem.id}:`, error);
      
      syncItem.error = error.message;
      syncItem.lastError = error.message;
      
      if (syncItem.attempts >= syncItem.maxAttempts) {
        // Max attempts reached, mark as failed
        syncItem.status = SYNC_STATUS.FAILED;
        syncItem.failedAt = Date.now();
        
        await indexedDBManager.put(STORES.SYNC_QUEUE, syncItem);
        
        // Add to history
        this.addToHistory(syncItem, null);
        
        // Notify listeners
        this.notifyListeners('sync-failed', {
          syncItem,
          error
        });
      } else {
        // Retry later
        syncItem.status = SYNC_STATUS.PENDING;
        await indexedDBManager.put(STORES.SYNC_QUEUE, syncItem);
        
        // Calculate backoff delay
        const delay = Math.pow(2, syncItem.attempts) * 1000; // Exponential backoff
        setTimeout(() => {
          this.processSyncItem(syncItem);
        }, delay);
      }
    } finally {
      this.syncInProgress.delete(syncItem.id);
    }
  }

  /**
   * Sync search results
   */
  async syncSearchResults(item) {
    const { searchParams, results, timestamp } = item;
    
    // Re-execute search to get fresh results
    const endpoint = item.searchType === 'flight' 
      ? '/api/flights/search/enhanced'
      : '/api/hotels/search/enhanced';
    
    const queryString = new URLSearchParams(searchParams).toString();
    const response = await fetch(`${endpoint}?${queryString}`);
    
    if (!response.ok) {
      throw new Error(`Search sync failed: ${response.statusText}`);
    }
    
    const freshResults = await response.json();
    
    // Compare with cached results and handle conflicts
    const conflictResolution = this.resolveSearchConflicts(results, freshResults);
    
    // Update cache with resolved results
    const cacheKey = this.generateCacheKey(searchParams, item.searchType);
    await cacheManager.setCache(
      item.searchType === 'flight' ? 'FLIGHT_SEARCH' : 'HOTEL_SEARCH',
      cacheKey,
      conflictResolution.resolvedData,
      cacheManager.CACHE_TYPES[item.searchType === 'flight' ? 'FLIGHT_SEARCH' : 'HOTEL_SEARCH']
    );
    
    return {
      type: 'search-results',
      conflicts: conflictResolution.conflicts,
      resolved: conflictResolution.resolved
    };
  }

  /**
   * Sync user preferences
   */
  async syncUserPreferences(item) {
    const { key, value, timestamp } = item;
    
    // Send preferences to server
    const response = await fetch('/api/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key, value, timestamp })
    });
    
    if (!response.ok) {
      throw new Error(`Preferences sync failed: ${response.statusText}`);
    }
    
    // Update local cache
    await indexedDBManager.setUserPreference(key, value);
    
    return {
      type: 'user-preferences',
      synced: true
    };
  }

  /**
   * Sync analytics events
   */
  async syncAnalytics(item) {
    const { events } = item;
    
    // Send analytics events to server
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ events })
    });
    
    if (!response.ok) {
      throw new Error(`Analytics sync failed: ${response.statusText}`);
    }
    
    // Mark events as synced in IndexedDB
    for (const event of events) {
      if (event.id) {
        await indexedDBManager.markAnalyticsEventSynced(event.id);
      }
    }
    
    return {
      type: 'analytics',
      eventsCount: events.length,
      synced: true
    };
  }

  /**
   * Sync bookings
   */
  async syncBookings(item) {
    const { booking, action } = item;
    
    let endpoint;
    switch (action) {
      case 'create':
        endpoint = '/api/bookings/create';
        break;
      case 'update':
        endpoint = '/api/bookings/update';
        break;
      case 'cancel':
        endpoint = '/api/bookings/cancel';
        break;
      default:
        throw new Error(`Unknown booking action: ${action}`);
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(booking)
    });
    
    if (!response.ok) {
      throw new Error(`Booking sync failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      type: 'bookings',
      action,
      bookingId: booking.id,
      result
    };
  }

  /**
   * Sync reviews
   */
  async syncReviews(item) {
    const { review, action } = item;
    
    let endpoint;
    switch (action) {
      case 'create':
        endpoint = '/api/reviews/create';
        break;
      case 'update':
        endpoint = '/api/reviews/update';
        break;
      case 'delete':
        endpoint = '/api/reviews/delete';
        break;
      default:
        throw new Error(`Unknown review action: ${action}`);
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(review)
    });
    
    if (!response.ok) {
      throw new Error(`Review sync failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      type: 'reviews',
      action,
      reviewId: review.id,
      result
    };
  }

  /**
   * Resolve search result conflicts
   */
  resolveSearchConflicts(cachedResults, freshResults) {
    const conflicts = [];
    const resolved = [];
    
    // Simple conflict resolution: prefer fresh results, but keep cached if fresh is empty
    if (!freshResults || (Array.isArray(freshResults) && freshResults.length === 0)) {
      return {
        conflicts: [],
        resolved: cachedResults,
        resolved: true
      };
    }
    
    // For array results, merge and deduplicate
    if (Array.isArray(freshResults)) {
      const merged = [...freshResults];
      
      if (Array.isArray(cachedResults)) {
        for (const cached of cachedResults) {
          const exists = freshResults.some(fresh => 
            fresh.id === cached.id || 
            (fresh.flightId && cached.flightId && fresh.flightId === cached.flightId)
          );
          
          if (!exists) {
            merged.push(cached);
            conflicts.push({
              type: 'missing-in-fresh',
              item: cached,
              resolution: 'kept-from-cache'
            });
          }
        }
      }
      
      return {
        conflicts,
        resolvedData: merged,
        resolved: true
      };
    }
    
    // For object results, merge properties
    if (typeof freshResults === 'object' && typeof cachedResults === 'object') {
      const merged = { ...freshResults, ...cachedResults };
      
      return {
        conflicts: [],
        resolvedData: merged,
        resolved: true
      };
    }
    
    // Default to fresh results
    return {
      conflicts: [],
      resolvedData: freshResults,
      resolved: true
    };
  }

  /**
   * Generate cache key for search
   */
  generateCacheKey(searchParams, searchType) {
    const paramString = JSON.stringify(searchParams, Object.keys(searchParams).sort());
    const hash = btoa(paramString).replace(/[^a-zA-Z0-9]/g, '');
    return `${searchType}_${hash}`;
  }

  /**
   * Add sync item to history
   */
  addToHistory(syncItem, result) {
    const historyItem = {
      ...syncItem,
      result,
      addedToHistory: Date.now()
    };
    
    this.syncHistory.unshift(historyItem);
    
    // Keep only last 100 items in history
    if (this.syncHistory.length > 100) {
      this.syncHistory = this.syncHistory.slice(0, 100);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    if (!this.eventListeners[event]) return;
    
    const index = this.eventListeners[event].indexOf(callback);
    if (index > -1) {
      this.eventListeners[event].splice(index, 1);
    }
  }

  /**
   * Notify event listeners
   */
  notifyListeners(event, data) {
    if (!this.eventListeners[event]) return;
    
    this.eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[BackgroundSync] Event listener error:', error);
      }
    });
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      inProgress: this.syncInProgress.size,
      historyLength: this.syncHistory.length
    };
  }

  /**
   * Get sync history
   */
  getSyncHistory(limit = 50) {
    return this.syncHistory.slice(0, limit);
  }

  /**
   * Force sync
   */
  async forceSync() {
    if (navigator.onLine) {
      await this.processPendingSyncs();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue() {
    try {
      await indexedDBManager.clearStore(STORES.SYNC_QUEUE);
      this.syncQueue = [];
      this.syncInProgress.clear();
      console.log('[BackgroundSync] Cleared sync queue');
    } catch (error) {
      console.error('[BackgroundSync] Failed to clear sync queue:', error);
    }
  }

  /**
   * Retry failed syncs
   */
  async retryFailedSyncs() {
    try {
      const failedItems = await indexedDBManager.getAll(STORES.SYNC_QUEUE);
      const itemsToRetry = failedItems.filter(item => 
        item.status === SYNC_STATUS.FAILED && 
        item.attempts < item.maxAttempts
      );
      
      for (const item of itemsToRetry) {
        item.status = SYNC_STATUS.PENDING;
        item.attempts = 0;
        await indexedDBManager.put(STORES.SYNC_QUEUE, item);
      }
      
      if (itemsToRetry.length > 0) {
        await this.processPendingSyncs();
      }
      
      return itemsToRetry.length;
    } catch (error) {
      console.error('[BackgroundSync] Failed to retry failed syncs:', error);
      return 0;
    }
  }
}

// Create singleton instance
const backgroundSyncManager = new BackgroundSyncManager();

export default backgroundSyncManager;
export { SYNC_TYPES, SYNC_PRIORITIES, SYNC_STATUS };