"use client";

import { useState, useEffect, useCallback } from 'react';
import { OfflineIndicator } from './OfflineIndicator';
import { OfflineBanner } from './OfflineBanner';
import { useOfflineManager } from '@/lib/offline/offlineManager';
import { useErrorHandler } from '@/lib/offline/errorHandler';
import { usePerformanceMonitor } from '@/lib/offline/performanceMonitor';
import storageQuotaManager from '@/lib/offline/storageQuota';

export function OfflineProvider({ children }) {
  const { isOnline, connectionType, forceSync } = useOfflineManager();
  const { errors, handleError } = useErrorHandler();
  const { recordCacheHit, recordUserBehavior } = usePerformanceMonitor();
  const [storageWarning, setStorageWarning] = useState(null);
  const [showStorageDialog, setShowStorageDialog] = useState(false);

  // Monitor storage usage
  useEffect(() => {
    const checkStorage = async () => {
      try {
        const stats = await storageQuotaManager.getStorageStats();
        
        if (stats.quota && stats.quota.percentage > 80) {
          setStorageWarning({
            percentage: stats.quota.percentage,
            recommendations: stats.recommendations
          });
        } else {
          setStorageWarning(null);
        }
      } catch (error) {
        console.error('Failed to check storage:', error);
      }
    };

    // Check storage every 30 seconds
    const interval = setInterval(checkStorage, 30000);
    checkStorage(); // Initial check

    return () => clearInterval(interval);
  }, []);

  // Record user behavior
  useEffect(() => {
    recordUserBehavior('session_start', {
      isOnline,
      connectionType,
      timestamp: Date.now()
    });
  }, [isOnline, connectionType, recordUserBehavior]);

  // Handle storage cleanup
  const handleStorageCleanup = useCallback(async (strategy = 'moderate') => {
    try {
      const result = await storageQuotaManager.performCleanup(strategy);
      
      if (result) {
        setStorageWarning(null);
        setShowStorageDialog(false);
        
        // Record cleanup action
        recordUserBehavior('storage_cleanup', {
          strategy,
          freedSpace: result.freedSpace,
          newUsagePercentage: result.newUsagePercentage
        });
      }
    } catch (error) {
      handleError(error, { context: 'storage-cleanup' });
    }
  }, [handleError, recordUserBehavior]);

  // Handle force sync
  const handleForceSync = useCallback(async () => {
    try {
      await forceSync();
      recordUserBehavior('manual_sync', {
        timestamp: Date.now()
      });
    } catch (error) {
      handleError(error, { context: 'force-sync' });
    }
  }, [forceSync, handleError, recordUserBehavior]);

  // Wrap fetch with offline support
  const offlineFetch = useCallback(async (url, options = {}) => {
    const startTime = Date.now();
    const cacheKey = options.cacheKey || url;
    
    try {
      // Record cache hit if available
      if (options.fromCache) {
        recordCacheHit(options.cacheType || 'unknown', Date.now() - startTime, true);
      }

      const response = await fetch(url, {
        ...options,
        signal: options.signal
      });

      const responseTime = Date.now() - startTime;
      
      // Record cache miss
      if (!options.fromCache) {
        recordCacheHit(options.cacheType || 'unknown', responseTime, false);
      }

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Handle error with offline support
      const errorResult = await handleError(error, {
        url,
        options,
        responseTime,
        isOnline
      });

      if (errorResult.shouldRetry && !options._retryCount) {
        // Retry with exponential backoff
        const retryOptions = {
          ...options,
          _retryCount: (options._retryCount || 0) + 1
        };
        
        const delay = Math.pow(2, retryOptions._retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return offlineFetch(url, retryOptions);
      }

      if (errorResult.canContinueOffline) {
        // Return a mock response for offline mode
        return new Response(JSON.stringify({
          success: false,
          offline: true,
          message: 'Using offline mode',
          fallbackData: options.fallbackData || null
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      throw error;
    }
  }, [isOnline, handleError, recordCacheHit]);

  // Context value
  const contextValue = {
    isOnline,
    connectionType,
    storageWarning,
    showStorageDialog,
    offlineFetch,
    handleStorageCleanup,
    handleForceSync,
    setShowStorageDialog
  };

  return (
    <div className="relative">
      {/* Offline Banner */}
      <OfflineBanner />
      
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Storage Warning Dialog */}
      {storageWarning && showStorageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Storage Space Running Low
              </h3>
              <p className="text-gray-600">
                Your storage usage is at {storageWarning.percentage.toFixed(1)}%. 
                Consider clearing old data to maintain optimal performance.
              </p>
            </div>

            {storageWarning.recommendations && storageWarning.recommendations.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Recommendations:</h4>
                <ul className="space-y-2">
                  {storageWarning.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 mt-1.5 ${
                        rec.priority === 'critical' ? 'bg-red-500' :
                        rec.priority === 'high' ? 'bg-orange-500' :
                        rec.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{rec.title}</p>
                        <p className="text-sm text-gray-600">{rec.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => handleStorageCleanup('conservative')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded transition-colors"
              >
                Quick Cleanup
              </button>
              <button
                onClick={() => handleStorageCleanup('moderate')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Moderate Cleanup
              </button>
              <button
                onClick={() => handleStorageCleanup('aggressive')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Aggressive Cleanup
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowStorageDialog(false)}
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                Remind Me Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provide context to children */}
      <OfflineContext.Provider value={contextValue}>
        {children}
      </OfflineContext.Provider>
    </div>
  );
}

// Context for offline functionality
const OfflineContext = createContext({
  isOnline: true,
  connectionType: 'online',
  storageWarning: null,
  showStorageDialog: false,
  offlineFetch: () => {},
  handleStorageCleanup: () => {},
  handleForceSync: () => {},
  setShowStorageDialog: () => {}
});

// Hook to use offline context
export function useOffline() {
  const context = useContext(OfflineContext);
  
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  
  return context;
}

export { OfflineContext };
export default OfflineProvider;