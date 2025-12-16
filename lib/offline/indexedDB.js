/**
 * IndexedDB Manager for Offline Storage
 * Handles client-side storage for offline functionality
 */

const DB_NAME = 'GolobTravelOffline';
const DB_VERSION = 1;

// Object store names
const STORES = {
  SEARCH_RESULTS: 'searchResults',
  PENDING_SEARCHES: 'pendingSearches',
  FLIGHT_DATA: 'flightData',
  HOTEL_DATA: 'hotelData',
  USER_PREFERENCES: 'userPreferences',
  ANALYTICS_EVENTS: 'analyticsEvents',
  SYNC_QUEUE: 'syncQueue',
  CACHE_METADATA: 'cacheMetadata'
};

// Cache configuration
const CACHE_CONFIG = {
  SEARCH_RESULTS: {
    maxAge: 10 * 60 * 1000, // 10 minutes
    maxEntries: 50
  },
  FLIGHT_DATA: {
    maxAge: 30 * 60 * 1000, // 30 minutes
    maxEntries: 100
  },
  HOTEL_DATA: {
    maxAge: 30 * 60 * 1000, // 30 minutes
    maxEntries: 100
  },
  USER_PREFERENCES: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 10
  }
};

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    if (this.isInitialized) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[IndexedDB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.SEARCH_RESULTS)) {
          const searchStore = db.createObjectStore(STORES.SEARCH_RESULTS, { keyPath: 'id' });
          searchStore.createIndex('timestamp', 'timestamp', { unique: false });
          searchStore.createIndex('searchType', 'searchType', { unique: false });
          searchStore.createIndex('query', 'query', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_SEARCHES)) {
          const pendingStore = db.createObjectStore(STORES.PENDING_SEARCHES, { keyPath: 'id' });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.FLIGHT_DATA)) {
          const flightStore = db.createObjectStore(STORES.FLIGHT_DATA, { keyPath: 'id' });
          flightStore.createIndex('flightId', 'flightId', { unique: false });
          flightStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.HOTEL_DATA)) {
          const hotelStore = db.createObjectStore(STORES.HOTEL_DATA, { keyPath: 'id' });
          hotelStore.createIndex('hotelId', 'hotelId', { unique: false });
          hotelStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) {
          const prefsStore = db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'key' });
          prefsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.ANALYTICS_EVENTS)) {
          const analyticsStore = db.createObjectStore(STORES.ANALYTICS_EVENTS, { keyPath: 'id' });
          analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
          analyticsStore.createIndex('eventType', 'eventType', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('syncType', 'syncType', { unique: false });
        }

        if (!db.objectStore.names.contains(STORES.CACHE_METADATA)) {
          const metadataStore = db.createObjectStore(STORES.CACHE_METADATA, { keyPath: 'key' });
          metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        console.log('[IndexedDB] Database schema created');
      };
    });
  }

  /**
   * Get object store
   */
  getObjectStore(storeName, mode = 'readonly') {
    if (!this.db) {
      throw new Error('[IndexedDB] Database not initialized');
    }
    
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  /**
   * Store search results
   */
  async storeSearchResults(searchParams, results, searchType = 'flight') {
    await this.init();
    
    const id = this.generateSearchId(searchParams, searchType);
    const data = {
      id,
      searchType,
      searchParams,
      results,
      timestamp: Date.now(),
      cachedAt: new Date().toISOString()
    };

    try {
      await this.put(STORES.SEARCH_RESULTS, data);
      
      // Update metadata
      await this.updateCacheMetadata(STORES.SEARCH_RESULTS, 1);
      
      // Clean up old entries
      await this.cleanupOldEntries(STORES.SEARCH_RESULTS, CACHE_CONFIG.SEARCH_RESULTS);
      
      console.log(`[IndexedDB] Stored ${searchType} search results:`, id);
      return id;
    } catch (error) {
      console.error('[IndexedDB] Failed to store search results:', error);
      throw error;
    }
  }

  /**
   * Get cached search results
   */
  async getSearchResults(searchParams, searchType = 'flight') {
    await this.init();
    
    const id = this.generateSearchId(searchParams, searchType);
    
    try {
      const data = await this.get(STORES.SEARCH_RESULTS, id);
      
      if (!data) return null;
      
      // Check if data is still valid
      const age = Date.now() - data.timestamp;
      if (age > CACHE_CONFIG.SEARCH_RESULTS.maxAge) {
        console.log(`[IndexedDB] Cache expired for ${id}`);
        await this.delete(STORES.SEARCH_RESULTS, id);
        return null;
      }
      
      console.log(`[IndexedDB] Cache hit for ${searchType} search:`, id);
      return data;
    } catch (error) {
      console.error('[IndexedDB] Failed to get search results:', error);
      return null;
    }
  }

  /**
   * Store flight data
   */
  async storeFlightData(flightId, data) {
    await this.init();
    
    const id = `flight_${flightId}`;
    const flightData = {
      id,
      flightId,
      data,
      timestamp: Date.now(),
      cachedAt: new Date().toISOString()
    };

    try {
      await this.put(STORES.FLIGHT_DATA, flightData);
      
      // Update metadata
      await this.updateCacheMetadata(STORES.FLIGHT_DATA, 1);
      
      // Clean up old entries
      await this.cleanupOldEntries(STORES.FLIGHT_DATA, CACHE_CONFIG.FLIGHT_DATA);
      
      console.log('[IndexedDB] Stored flight data:', flightId);
      return id;
    } catch (error) {
      console.error('[IndexedDB] Failed to store flight data:', error);
      throw error;
    }
  }

  /**
   * Get cached flight data
   */
  async getFlightData(flightId) {
    await this.init();
    
    const id = `flight_${flightId}`;
    
    try {
      const data = await this.get(STORES.FLIGHT_DATA, id);
      
      if (!data) return null;
      
      // Check if data is still valid
      const age = Date.now() - data.timestamp;
      if (age > CACHE_CONFIG.FLIGHT_DATA.maxAge) {
        console.log(`[IndexedDB] Flight data expired for ${flightId}`);
        await this.delete(STORES.FLIGHT_DATA, id);
        return null;
      }
      
      console.log('[IndexedDB] Cache hit for flight:', flightId);
      return data.data;
    } catch (error) {
      console.error('[IndexedDB] Failed to get flight data:', error);
      return null;
    }
  }

  /**
   * Store hotel data
   */
  async storeHotelData(hotelId, data) {
    await this.init();
    
    const id = `hotel_${hotelId}`;
    const hotelData = {
      id,
      hotelId,
      data,
      timestamp: Date.now(),
      cachedAt: new Date().toISOString()
    };

    try {
      await this.put(STORES.HOTEL_DATA, hotelData);
      
      // Update metadata
      await this.updateCacheMetadata(STORES.HOTEL_DATA, 1);
      
      // Clean up old entries
      await this.cleanupOldEntries(STORES.HOTEL_DATA, CACHE_CONFIG.HOTEL_DATA);
      
      console.log('[IndexedDB] Stored hotel data:', hotelId);
      return id;
    } catch (error) {
      console.error('[IndexedDB] Failed to store hotel data:', error);
      throw error;
    }
  }

  /**
   * Get cached hotel data
   */
  async getHotelData(hotelId) {
    await this.init();
    
    const id = `hotel_${hotelId}`;
    
    try {
      const data = await this.get(STORES.HOTEL_DATA, id);
      
      if (!data) return null;
      
      // Check if data is still valid
      const age = Date.now() - data.timestamp;
      if (age > CACHE_CONFIG.HOTEL_DATA.maxAge) {
        console.log(`[IndexedDB] Hotel data expired for ${hotelId}`);
        await this.delete(STORES.HOTEL_DATA, id);
        return null;
      }
      
      console.log('[IndexedDB] Cache hit for hotel:', hotelId);
      return data.data;
    } catch (error) {
      console.error('[IndexedDB] Failed to get hotel data:', error);
      return null;
    }
  }

  /**
   * Store user preferences
   */
  async setUserPreference(key, value) {
    await this.init();
    
    const preference = {
      key,
      value,
      timestamp: Date.now(),
      cachedAt: new Date().toISOString()
    };

    try {
      await this.put(STORES.USER_PREFERENCES, preference);
      console.log('[IndexedDB] Stored user preference:', key);
      return true;
    } catch (error) {
      console.error('[IndexedDB] Failed to store user preference:', error);
      throw error;
    }
  }

  /**
   * Get user preference
   */
  async getUserPreference(key) {
    await this.init();
    
    try {
      const data = await this.get(STORES.USER_PREFERENCES, key);
      
      if (!data) return null;
      
      // Check if preference is still valid
      const age = Date.now() - data.timestamp;
      if (age > CACHE_CONFIG.USER_PREFERENCES.maxAge) {
        console.log(`[IndexedDB] User preference expired for ${key}`);
        await this.delete(STORES.USER_PREFERENCES, key);
        return null;
      }
      
      console.log('[IndexedDB] Cache hit for user preference:', key);
      return data.value;
    } catch (error) {
      console.error('[IndexedDB] Failed to get user preference:', error);
      return null;
    }
  }

  /**
   * Add analytics event to sync queue
   */
  async addAnalyticsEvent(event) {
    await this.init();
    
    const eventData = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      timestamp: Date.now(),
      synced: false
    };

    try {
      await this.put(STORES.ANALYTICS_EVENTS, eventData);
      console.log('[IndexedDB] Added analytics event to queue:', eventData.id);
      return eventData.id;
    } catch (error) {
      console.error('[IndexedDB] Failed to add analytics event:', error);
      throw error;
    }
  }

  /**
   * Get pending analytics events
   */
  async getPendingAnalyticsEvents() {
    await this.init();
    
    try {
      const events = await this.getAll(STORES.ANALYTICS_EVENTS);
      return events.filter(event => !event.synced);
    } catch (error) {
      console.error('[IndexedDB] Failed to get pending analytics events:', error);
      return [];
    }
  }

  /**
   * Mark analytics event as synced
   */
  async markAnalyticsEventSynced(eventId) {
    await this.init();
    
    try {
      const event = await this.get(STORES.ANALYTICS_EVENTS, eventId);
      if (event) {
        event.synced = true;
        event.syncedAt = Date.now();
        await this.put(STORES.ANALYTICS_EVENTS, event);
        console.log('[IndexedDB] Marked analytics event as synced:', eventId);
      }
    } catch (error) {
      console.error('[IndexedDB] Failed to mark analytics event as synced:', error);
    }
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(item, syncType) {
    await this.init();
    
    const queueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      item,
      syncType,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };

    try {
      await this.put(STORES.SYNC_QUEUE, queueItem);
      console.log('[IndexedDB] Added item to sync queue:', queueItem.id);
      return queueItem.id;
    } catch (error) {
      console.error('[IndexedDB] Failed to add item to sync queue:', error);
      throw error;
    }
  }

  /**
   * Get items from sync queue
   */
  async getSyncQueue(syncType = null) {
    await this.init();
    
    try {
      const items = await this.getAll(STORES.SYNC_QUEUE);
      const filteredItems = syncType 
        ? items.filter(item => item.syncType === syncType && item.attempts < item.maxAttempts)
        : items.filter(item => item.attempts < item.maxAttempts);
      
      return filteredItems.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('[IndexedDB] Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Remove item from sync queue
   */
  async removeFromSyncQueue(itemId) {
    await this.init();
    
    try {
      await this.delete(STORES.SYNC_QUEUE, itemId);
      console.log('[IndexedDB] Removed item from sync queue:', itemId);
    } catch (error) {
      console.error('[IndexedDB] Failed to remove item from sync queue:', error);
    }
  }

  /**
   * Increment sync attempt count
   */
  async incrementSyncAttempts(itemId) {
    await this.init();
    
    try {
      const item = await this.get(STORES.SYNC_QUEUE, itemId);
      if (item) {
        item.attempts += 1;
        item.lastAttempt = Date.now();
        await this.put(STORES.SYNC_QUEUE, item);
      }
    } catch (error) {
      console.error('[IndexedDB] Failed to increment sync attempts:', error);
    }
  }

  /**
   * Get storage usage
   */
  async getStorageUsage() {
    await this.init();
    
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          usageDetails: estimate.usageDetails || {},
          percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
        };
      }
      
      return null;
    } catch (error) {
      console.error('[IndexedDB] Failed to get storage usage:', error);
      return null;
    }
  }

  /**
   * Clear all data
   */
  async clearAll() {
    await this.init();
    
    try {
      const stores = Object.values(STORES);
      for (const store of stores) {
        await this.clear(store);
      }
      console.log('[IndexedDB] Cleared all data');
    } catch (error) {
      console.error('[IndexedDB] Failed to clear all data:', error);
      throw error;
    }
  }

  /**
   * Clear specific store
   */
  async clearStore(storeName) {
    await this.init();
    
    try {
      await this.clear(storeName);
      console.log(`[IndexedDB] Cleared store: ${storeName}`);
    } catch (error) {
      console.error(`[IndexedDB] Failed to clear store ${storeName}:`, error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Generate search ID from parameters
   */
  generateSearchId(searchParams, searchType) {
    const paramString = JSON.stringify(searchParams, Object.keys(searchParams).sort());
    const hash = this.simpleHash(paramString);
    return `${searchType}_${hash}`;
  }

  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Update cache metadata
   */
  async updateCacheMetadata(storeName, count) {
    const key = `${storeName}_count`;
    try {
      const metadata = await this.get(STORES.CACHE_METADATA, key) || { key, count: 0 };
      metadata.count += count;
      metadata.timestamp = Date.now();
      await this.put(STORES.CACHE_METADATA, metadata);
    } catch (error) {
      console.error('[IndexedDB] Failed to update cache metadata:', error);
    }
  }

  /**
   * Clean up old entries
   */
  async cleanupOldEntries(storeName, config) {
    try {
      const allEntries = await this.getAll(storeName);
      const now = Date.now();
      
      // Filter entries that are too old or exceed max count
      const validEntries = allEntries.filter(entry => {
        const age = now - entry.timestamp;
        return age <= config.maxAge;
      });
      
      // Sort by timestamp and keep only the most recent
      validEntries.sort((a, b) => b.timestamp - a.timestamp);
      const entriesToKeep = validEntries.slice(0, config.maxEntries);
      
      // Delete old entries
      const entriesToDelete = allEntries.filter(entry => 
        !entriesToKeep.some(keep => keep.id === entry.id)
      );
      
      for (const entry of entriesToDelete) {
        await this.delete(storeName, entry.id);
      }
      
      if (entriesToDelete.length > 0) {
        console.log(`[IndexedDB] Cleaned up ${entriesToDelete.length} old entries from ${storeName}`);
      }
    } catch (error) {
      console.error('[IndexedDB] Failed to cleanup old entries:', error);
    }
  }

  // IndexedDB operation wrappers

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(storeName, 'readwrite');
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(storeName, 'readwrite');
      const request = store.delete(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(storeName, 'readwrite');
      const request = store.clear();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Create singleton instance
const indexedDBManager = new IndexedDBManager();

export default indexedDBManager;
export { STORES, CACHE_CONFIG };