/**
 * Offline Manager
 * Handles offline detection, management, and fallback strategies
 */

import { useState, useEffect, useCallback } from 'react';
import cacheManager from './cacheManager';
import indexedDBManager from './indexedDB';

// Connection status types
const CONNECTION_TYPES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  SLOW: 'slow',
  UNSTABLE: 'unstable'
};

// Network quality thresholds
const NETWORK_THRESHOLDS = {
  FAST: { rtt: 100, downlink: 1.5 }, // RTT < 100ms, Downlink > 1.5 Mbps
  SLOW: { rtt: 300, downlink: 0.5 }, // RTT < 300ms, Downlink > 0.5 Mbps
  VERY_SLOW: { rtt: 1000, downlink: 0.1 } // RTT < 1000ms, Downlink > 0.1 Mbps
};

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.connectionType = CONNECTION_TYPES.ONLINE;
    this.networkQuality = 'unknown';
    this.listeners = [];
    this.connectionMonitor = null;
    this.retryQueue = [];
    this.syncInProgress = false;
    
    this.init();
  }

  /**
   * Initialize offline manager
   */
  init() {
    // Set up online/offline event listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Set up network connection monitoring
    this.setupConnectionMonitoring();
    
    // Set up periodic connectivity checks
    this.setupPeriodicChecks();
    
    console.log('[OfflineManager] Initialized');
  }

  /**
   * Set up network connection monitoring
   */
  setupConnectionMonitoring() {
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        this.connectionMonitor = connection;
        
        const updateConnectionInfo = () => {
          this.updateNetworkQuality(connection);
          this.notifyListeners();
        };
        
        connection.addEventListener('change', updateConnectionInfo);
        connection.addEventListener('typechange', updateConnectionInfo);
        
        // Initial update
        this.updateNetworkQuality(connection);
      }
    }
  }

  /**
   * Update network quality assessment
   */
  updateNetworkQuality(connection) {
    const { effectiveType, downlink, rtt } = connection;
    
    // Determine quality based on connection info
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      this.networkQuality = 'very-slow';
    } else if (effectiveType === '3g') {
      this.networkQuality = 'slow';
    } else if (effectiveType === '4g') {
      this.networkQuality = 'fast';
    } else {
      // Use RTT and downlink for more precise assessment
      if (rtt < NETWORK_THRESHOLDS.FAST.rtt && downlink > NETWORK_THRESHOLDS.FAST.downlink) {
        this.networkQuality = 'fast';
      } else if (rtt < NETWORK_THRESHOLDS.SLOW.rtt && downlink > NETWORK_THRESHOLDS.SLOW.downlink) {
        this.networkQuality = 'slow';
      } else if (rtt < NETWORK_THRESHOLDS.VERY_SLOW.rtt && downlink > NETWORK_THRESHOLDS.VERY_SLOW.downlink) {
        this.networkQuality = 'very-slow';
      } else {
        this.networkQuality = 'poor';
      }
    }
    
    // Update connection type based on quality
    if (this.isOnline) {
      if (this.networkQuality === 'very-slow' || this.networkQuality === 'poor') {
        this.connectionType = CONNECTION_TYPES.SLOW;
      } else if (this.networkQuality === 'slow') {
        this.connectionType = CONNECTION_TYPES.UNSTABLE;
      } else {
        this.connectionType = CONNECTION_TYPES.ONLINE;
      }
    }
  }

  /**
   * Set up periodic connectivity checks
   */
  setupPeriodicChecks() {
    // Check connectivity every 30 seconds
    setInterval(async () => {
      await this.checkConnectivity();
    }, 30000);
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('[OfflineManager] Connection restored');
    this.isOnline = true;
    this.updateConnectionType();
    this.processRetryQueue();
    this.notifyListeners();
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('[OfflineManager] Connection lost');
    this.isOnline = false;
    this.updateConnectionType();
    this.notifyListeners();
  }

  /**
   * Update connection type based on current state
   */
  updateConnectionType() {
    if (!this.isOnline) {
      this.connectionType = CONNECTION_TYPES.OFFLINE;
    } else {
      this.updateNetworkQuality(this.connectionMonitor);
    }
  }

  /**
   * Check connectivity with a simple request
   */
  async checkConnectivity() {
    try {
      // Use a lightweight endpoint for connectivity check
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      });
      
      const wasOffline = !this.isOnline;
      
      if (response.ok) {
        if (!this.isOnline) {
          this.handleOnline();
        }
      } else {
        if (this.isOnline) {
          this.handleOffline();
        }
      }
      
      return this.isOnline;
    } catch (error) {
      if (this.isOnline) {
        this.handleOffline();
      }
      return false;
    }
  }

  /**
   * Add event listener
   */
  addListener(callback) {
    this.listeners.push(callback);
    
    // Call immediately with current state
    callback(this.getStatus());
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[OfflineManager] Listener error:', error);
      }
    });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      connectionType: this.connectionType,
      networkQuality: this.networkQuality,
      connectionInfo: this.getConnectionInfo(),
      retryQueueLength: this.retryQueue.length,
      syncInProgress: this.syncInProgress
    };
  }

  /**
   * Get connection information
   */
  getConnectionInfo() {
    if (!this.connectionMonitor) {
      return { type: 'unknown' };
    }
    
    return {
      type: this.connectionMonitor.effectiveType,
      downlink: this.connectionMonitor.downlink,
      rtt: this.connectionMonitor.rtt,
      saveData: this.connectionMonitor.saveData,
      downlinkMax: this.connectionMonitor.downlinkMax
    };
  }

  /**
   * Execute request with offline support
   */
  async executeRequest(requestFn, options = {}) {
    const {
      cacheKey,
      cacheType = 'FLIGHT_SEARCH',
      retryOnFailure = true,
      maxRetries = 3,
      fallbackToCache = true,
      timeout = 10000
    } = options;

    try {
      // If online, try to execute request
      if (this.isOnline) {
        try {
          const result = await this.executeWithTimeout(requestFn(), timeout);
          
          // Cache the result if successful
          if (cacheKey) {
            await cacheManager.setCache(cacheType, cacheKey, result, cacheManager.CACHE_TYPES[cacheType]);
          }
          
          return result;
        } catch (error) {
          console.error('[OfflineManager] Request failed:', error);
          
          // Check if it's a network error
          if (this.isNetworkError(error)) {
            await this.handleNetworkError();
            
            // Try fallback to cache if enabled
            if (fallbackToCache && cacheKey) {
              const cached = await cacheManager.getFromCache(cacheType, cacheKey);
              if (cached && cacheManager.isCacheValid(cached, cacheManager.CACHE_TYPES[cacheType])) {
                console.log('[OfflineManager] Using cached fallback');
                return cached.data;
              }
            }
            
            // Add to retry queue if retry is enabled
            if (retryOnFailure) {
              this.addToRetryQueue({ requestFn, options, attempts: 0, maxRetries });
            }
          }
          
          throw error;
        }
      } else {
        // Offline, try cache first
        if (cacheKey) {
          const cached = await cacheManager.getFromCache(cacheType, cacheKey);
          if (cached && cacheManager.isCacheValid(cached, cacheManager.CACHE_TYPES[cacheType])) {
            console.log('[OfflineManager] Using cached data (offline)');
            return cached.data;
          }
        }
        
        // Add to retry queue if retry is enabled
        if (retryOnFailure) {
          this.addToRetryQueue({ requestFn, options, attempts: 0, maxRetries });
        }
        
        throw new Error('No network connection and no cached data available');
      }
    } catch (error) {
      console.error('[OfflineManager] Request execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute request with timeout
   */
  async executeWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      })
    ]);
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(error) {
    return (
      error instanceof TypeError ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      !navigator.onLine
    );
  }

  /**
   * Handle network error
   */
  async handleNetworkError() {
    // Check actual connectivity
    const isActuallyOnline = await this.checkConnectivity();
    
    if (!isActuallyOnline && this.isOnline) {
      this.handleOffline();
    }
  }

  /**
   * Add request to retry queue
   */
  addToRetryQueue(request) {
    const retryItem = {
      ...request,
      id: `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    this.retryQueue.push(retryItem);
    console.log('[OfflineManager] Added to retry queue:', retryItem.id);
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    if (this.syncInProgress || this.retryQueue.length === 0) {
      return;
    }
    
    this.syncInProgress = true;
    console.log('[OfflineManager] Processing retry queue');
    
    try {
      const itemsToProcess = [...this.retryQueue];
      
      for (const item of itemsToProcess) {
        if (item.attempts >= item.maxRetries) {
          // Remove item after max retries
          const index = this.retryQueue.indexOf(item);
          if (index > -1) {
            this.retryQueue.splice(index, 1);
          }
          continue;
        }
        
        try {
          // Wait a bit between retries
          if (item.attempts > 0) {
            await this.delay(Math.pow(2, item.attempts) * 1000);
          }
          
          const result = await this.executeWithTimeout(item.requestFn(), 10000);
          
          // Success - remove from queue
          const index = this.retryQueue.indexOf(item);
          if (index > -1) {
            this.retryQueue.splice(index, 1);
          }
          
          // Cache result if cache key provided
          if (item.options.cacheKey) {
            await cacheManager.setCache(
              item.options.cacheType,
              item.options.cacheKey,
              result,
              cacheManager.CACHE_TYPES[item.options.cacheType]
            );
          }
          
          console.log('[OfflineManager] Retry successful:', item.id);
        } catch (error) {
          console.error(`[OfflineManager] Retry failed for ${item.id}:`, error);
          item.attempts++;
          item.lastError = error.message;
          item.lastAttempt = Date.now();
        }
      }
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  /**
   * Clear retry queue
   */
  clearRetryQueue() {
    this.retryQueue = [];
    console.log('[OfflineManager] Cleared retry queue');
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus() {
    return {
      length: this.retryQueue.length,
      items: this.retryQueue.map(item => ({
        id: item.id,
        attempts: item.attempts,
        maxRetries: item.maxRetries,
        lastError: item.lastError,
        timestamp: item.timestamp
      }))
    };
  }

  /**
   * Force sync
   */
  async forceSync() {
    if (this.isOnline && !this.syncInProgress) {
      await this.processRetryQueue();
    }
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get network performance metrics
   */
  getNetworkMetrics() {
    return {
      connectionType: this.connectionType,
      networkQuality: this.networkQuality,
      connectionInfo: this.getConnectionInfo(),
      isOnline: this.isOnline,
      retryQueueLength: this.retryQueue.length,
      syncInProgress: this.syncInProgress
    };
  }

  /**
   * Estimate request time based on network quality
   */
  estimateRequestTime(baseTime = 1000) {
    const multipliers = {
      'fast': 1,
      'slow': 2,
      'very-slow': 5,
      'poor': 10
    };
    
    const multiplier = multipliers[this.networkQuality] || 1;
    return baseTime * multiplier;
  }

  /**
   * Check if should use offline mode
   */
  shouldUseOfflineMode() {
    return (
      !this.isOnline ||
      this.connectionType === CONNECTION_TYPES.OFFLINE ||
      this.connectionType === CONNECTION_TYPES.SLOW
    );
  }

  /**
   * Get adaptive timeout based on network quality
   */
  getAdaptiveTimeout(baseTimeout = 10000) {
    const multipliers = {
      'fast': 1,
      'slow': 1.5,
      'very-slow': 2,
      'poor': 3
    };
    
    const multiplier = multipliers[this.networkQuality] || 1;
    return baseTimeout * multiplier;
  }
}

// Create singleton instance
const offlineManager = new OfflineManager();

// React hook for offline functionality
export function useOfflineManager() {
  const [status, setStatus] = useState(offlineManager.getStatus());
  
  useEffect(() => {
    const unsubscribe = offlineManager.addListener((newStatus) => {
      setStatus(newStatus);
    });
    
    return unsubscribe;
  }, []);
  
  const executeRequest = useCallback(async (requestFn, options) => {
    return await offlineManager.executeRequest(requestFn, options);
  }, []);
  
  const forceSync = useCallback(async () => {
    await offlineManager.forceSync();
  }, []);
  
  const clearRetryQueue = useCallback(() => {
    offlineManager.clearRetryQueue();
  }, []);
  
  return {
    ...status,
    executeRequest,
    forceSync,
    clearRetryQueue,
    getNetworkMetrics: offlineManager.getNetworkMetrics.bind(offlineManager),
    estimateRequestTime: offlineManager.estimateRequestTime.bind(offlineManager),
    shouldUseOfflineMode: offlineManager.shouldUseOfflineMode.bind(offlineManager),
    getAdaptiveTimeout: offlineManager.getAdaptiveTimeout.bind(offlineManager)
  };
}

export default offlineManager;
export { CONNECTION_TYPES, NETWORK_THRESHOLDS };