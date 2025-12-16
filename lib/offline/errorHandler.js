/**
 * Offline Error Handler
 * Comprehensive error handling for offline scenarios and network failures
 */

import { useOfflineManager } from './offlineManager';
import cacheManager from './cacheManager';
import backgroundSyncManager from './backgroundSync';

// Error types
const ERROR_TYPES = {
  NETWORK: 'network',
  OFFLINE: 'offline',
  TIMEOUT: 'timeout',
  SERVER: 'server',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  QUOTA: 'quota',
  CACHE: 'cache',
  SYNC: 'sync'
};

// Error severity levels
const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Recovery strategies
const RECOVERY_STRATEGIES = {
  RETRY: 'retry',
  FALLBACK: 'fallback',
  OFFLINE_MODE: 'offline-mode',
  USER_ACTION: 'user-action',
  ESCALATE: 'escalate'
};

class OfflineErrorHandler {
  constructor() {
    this.errorLog = [];
    this.errorListeners = [];
    this.recoveryActions = new Map();
    this.retryAttempts = new Map();
    
    this.setupErrorHandlers();
  }

  /**
   * Set up global error handlers
   */
  setupErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Handle uncaught errors
    window.addEventListener('error', this.handleUncaughtError.bind(this));
    
    console.log('[ErrorHandler] Error handlers initialized');
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(event) {
    const error = {
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.MEDIUM,
      message: event.reason?.message || 'Unhandled promise rejection',
      originalError: event.reason,
      timestamp: Date.now(),
      context: { unhandled: true }
    };
    
    this.handleError(error);
    event.preventDefault();
  }

  /**
   * Handle uncaught errors
   */
  handleUncaughtError(event) {
    const error = {
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.MEDIUM,
      message: event.message || 'Uncaught error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      originalError: event.error,
      timestamp: Date.now(),
      context: { uncaught: true }
    };
    
    this.handleError(error);
    event.preventDefault();
  }

  /**
   * Handle API/network errors
   */
  async handleApiError(error, context = {}) {
    const errorInfo = this.analyzeError(error, context);
    
    // Log error
    this.handleError(errorInfo);
    
    // Attempt recovery
    const recovery = await this.attemptRecovery(errorInfo, context);
    
    return {
      error: errorInfo,
      recovery,
      shouldRetry: recovery.strategy === RECOVERY_STRATEGIES.RETRY,
      canContinueOffline: recovery.strategy === RECOVERY_STRATEGIES.OFFLINE_MODE
    };
  }

  /**
   * Analyze and categorize error
   */
  analyzeError(error, context = {}) {
    const errorInfo = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      originalError: error,
      context
    };

    // Determine error type
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      errorInfo.type = ERROR_TYPES.NETWORK;
      errorInfo.severity = ERROR_SEVERITY.HIGH;
    } else if (error.message.includes('timeout')) {
      errorInfo.type = ERROR_TYPES.TIMEOUT;
      errorInfo.severity = ERROR_SEVERITY.MEDIUM;
    } else if (!navigator.onLine) {
      errorInfo.type = ERROR_TYPES.OFFLINE;
      errorInfo.severity = ERROR_SEVERITY.HIGH;
    } else if (error.status >= 500) {
      errorInfo.type = ERROR_TYPES.SERVER;
      errorInfo.severity = ERROR_SEVERITY.HIGH;
    } else if (error.status >= 400) {
      errorInfo.type = ERROR_TYPES.VALIDATION;
      errorInfo.severity = ERROR_SEVERITY.MEDIUM;
    } else if (error.name === 'QuotaExceededError') {
      errorInfo.type = ERROR_TYPES.QUOTA;
      errorInfo.severity = ERROR_SEVERITY.CRITICAL;
    } else if (error.message.includes('permission')) {
      errorInfo.type = ERROR_TYPES.PERMISSION;
      errorInfo.severity = ERROR_SEVERITY.HIGH;
    } else if (error.message.includes('cache')) {
      errorInfo.type = ERROR_TYPES.CACHE;
      errorInfo.severity = ERROR_SEVERITY.LOW;
    } else {
      errorInfo.type = ERROR_TYPES.NETWORK;
      errorInfo.severity = ERROR_SEVERITY.MEDIUM;
    }

    errorInfo.message = error.message || 'Unknown error occurred';
    errorInfo.userMessage = this.getUserFriendlyMessage(errorInfo);
    errorInfo.recoverySuggestions = this.getRecoverySuggestions(errorInfo);

    return errorInfo;
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(errorInfo) {
    switch (errorInfo.type) {
      case ERROR_TYPES.OFFLINE:
        return 'You appear to be offline. Please check your internet connection.';
      
      case ERROR_TYPES.NETWORK:
        return 'Network connection issue. Please check your connection and try again.';
      
      case ERROR_TYPES.TIMEOUT:
        return 'Request timed out. The server is taking too long to respond.';
      
      case ERROR_TYPES.SERVER:
        return 'Server error occurred. Our team has been notified.';
      
      case ERROR_TYPES.VALIDATION:
        return 'Invalid request. Please check your input and try again.';
      
      case ERROR_TYPES.PERMISSION:
        return 'Permission denied. Please check your browser settings.';
      
      case ERROR_TYPES.QUOTA:
        return 'Storage space full. Please clear some data and try again.';
      
      case ERROR_TYPES.CACHE:
        return 'Cache error occurred. Trying alternative methods.';
      
      case ERROR_TYPES.SYNC:
        return 'Sync error occurred. Data will be synced when connection is restored.';
      
      default:
        return 'An error occurred. Please try again.';
    }
  }

  /**
   * Get recovery suggestions
   */
  getRecoverySuggestions(errorInfo) {
    const suggestions = [];

    switch (errorInfo.type) {
      case ERROR_TYPES.OFFLINE:
        suggestions.push({
          strategy: RECOVERY_STRATEGIES.OFFLINE_MODE,
          title: 'Use Offline Mode',
          description: 'Continue using cached data while offline'
        });
        suggestions.push({
          strategy: RECOVERY_STRATEGIES.USER_ACTION,
          title: 'Check Connection',
          description: 'Verify your internet connection'
        });
        break;

      case ERROR_TYPES.NETWORK:
        suggestions.push({
          strategy: RECOVERY_STRATEGIES.RETRY,
          title: 'Retry Request',
          description: 'Try the request again'
        });
        suggestions.push({
          strategy: RECOVERY_STRATEGIES.FALLBACK,
          title: 'Use Cached Data',
          description: 'Show previously cached information'
        });
        break;

      case ERROR_TYPES.TIMEOUT:
        suggestions.push({
          strategy: RECOVERY_STRATEGIES.RETRY,
          title: 'Retry with Longer Timeout',
          description: 'Try again with extended timeout'
        });
        break;

      case ERROR_TYPES.SERVER:
        suggestions.push({
          strategy: RECOVERY_STRATEGIES.FALLBACK,
          title: 'Use Fallback Data',
          description: 'Show cached or alternative data'
        });
        suggestions.push({
          strategy: RECOVERY_STRATEGIES.ESCALATE,
          title: 'Report Issue',
          description: 'Notify support team'
        });
        break;

      case ERROR_TYPES.QUOTA:
        suggestions.push({
          strategy: RECOVERY_STRATEGIES.USER_ACTION,
          title: 'Clear Storage',
          description: 'Remove old data to free up space'
        });
        break;

      default:
        suggestions.push({
          strategy: RECOVERY_STRATEGIES.RETRY,
          title: 'Try Again',
          description: 'Retry the operation'
        });
    }

    return suggestions;
  }

  /**
   * Attempt error recovery
   */
  async attemptRecovery(errorInfo, context) {
    const suggestions = errorInfo.recoverySuggestions;
    const primaryStrategy = suggestions[0]?.strategy;

    switch (primaryStrategy) {
      case RECOVERY_STRATEGIES.RETRY:
        return await this.attemptRetry(errorInfo, context);
      
      case RECOVERY_STRATEGIES.FALLBACK:
        return await this.attemptFallback(errorInfo, context);
      
      case RECOVERY_STRATEGIES.OFFLINE_MODE:
        return await this.enableOfflineMode(errorInfo, context);
      
      case RECOVERY_STRATEGIES.USER_ACTION:
        return await this.requestUserAction(errorInfo, context);
      
      default:
        return { strategy: RECOVERY_STRATEGIES.ESCALATE, success: false };
    }
  }

  /**
   * Attempt retry strategy
   */
  async attemptRetry(errorInfo, context) {
    const retryKey = `${context.requestId || 'default'}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    const maxRetries = context.maxRetries || 3;

    if (currentAttempts >= maxRetries) {
      return { 
        strategy: RECOVERY_STRATEGIES.RETRY, 
        success: false, 
        reason: 'Max retries exceeded' 
      };
    }

    // Increment retry count
    this.retryAttempts.set(retryKey, currentAttempts + 1);

    // Calculate backoff delay
    const delay = Math.pow(2, currentAttempts) * 1000; // Exponential backoff

    return {
      strategy: RECOVERY_STRATEGIES.RETRY,
      success: true,
      delay,
      nextAttempt: currentAttempts + 1,
      maxRetries
    };
  }

  /**
   * Attempt fallback strategy
   */
  async attemptFallback(errorInfo, context) {
    try {
      if (context.cacheKey) {
        const cached = await cacheManager.getFromCache(context.cacheType, context.cacheKey);
        
        if (cached) {
          return {
            strategy: RECOVERY_STRATEGIES.FALLBACK,
            success: true,
            data: cached.data,
            fromCache: true
          };
        }
      }

      return { 
        strategy: RECOVERY_STRATEGIES.FALLBACK, 
        success: false, 
        reason: 'No fallback data available' 
      };
    } catch (error) {
      return { 
        strategy: RECOVERY_STRATEGIES.FALLBACK, 
        success: false, 
        reason: 'Fallback failed' 
      };
    }
  }

  /**
   * Enable offline mode
   */
  async enableOfflineMode(errorInfo, context) {
    try {
      // Add to sync queue for later
      if (context.requestData) {
        await backgroundSyncManager.addToSyncQueue(
          context.requestData,
          backgroundSyncManager.SYNC_TYPES.SEARCH_RESULTS,
          backgroundSyncManager.SYNC_PRIORITIES.HIGH
        );
      }

      return {
        strategy: RECOVERY_STRATEGIES.OFFLINE_MODE,
        success: true,
        message: 'Offline mode enabled. Data will sync when connection is restored.'
      };
    } catch (error) {
      return { 
        strategy: RECOVERY_STRATEGIES.OFFLINE_MODE, 
        success: false, 
        reason: 'Failed to enable offline mode' 
      };
    }
  }

  /**
   * Request user action
   */
  async requestUserAction(errorInfo, context) {
    return {
      strategy: RECOVERY_STRATEGIES.USER_ACTION,
      success: true,
      requiresUserAction: true,
      action: errorInfo.recoverySuggestions[0],
      message: errorInfo.userMessage
    };
  }

  /**
   * Handle error
   */
  handleError(errorInfo) {
    // Add to error log
    this.errorLog.unshift(errorInfo);
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(0, 100);
    }

    // Notify listeners
    this.notifyListeners(errorInfo);

    // Log to console
    console.error('[ErrorHandler]', errorInfo);
  }

  /**
   * Add error listener
   */
  addErrorListener(callback) {
    this.errorListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Remove error listener
   */
  removeErrorListener(callback) {
    const index = this.errorListeners.indexOf(callback);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Notify error listeners
   */
  notifyListeners(errorInfo) {
    this.errorListeners.forEach(callback => {
      try {
        callback(errorInfo);
      } catch (error) {
        console.error('[ErrorHandler] Listener error:', error);
      }
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      bySeverity: {},
      recent: this.errorLog.slice(0, 10),
      lastHour: this.errorLog.filter(error => 
        Date.now() - error.timestamp < 60 * 60 * 1000
      ).length
    };

    // Count by type and severity
    this.errorLog.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    this.retryAttempts.clear();
    console.log('[ErrorHandler] Error log cleared');
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10) {
    return this.errorLog.slice(0, limit);
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type, limit = 10) {
    return this.errorLog
      .filter(error => error.type === type)
      .slice(0, limit);
  }
}

// Create singleton instance
const offlineErrorHandler = new OfflineErrorHandler();

// React hook for error handling
export function useErrorHandler() {
  const [errors, setErrors] = useState([]);
  const [errorStats, setErrorStats] = useState(null);

  useEffect(() => {
    const unsubscribe = offlineErrorHandler.addErrorListener((errorInfo) => {
      setErrors(prev => [errorInfo, ...prev.slice(0, 9)]); // Keep last 10
    });

    return unsubscribe;
  }, []);

  const handleError = useCallback(async (error, context = {}) => {
    return await offlineErrorHandler.handleApiError(error, context);
  }, []);

  const getStats = useCallback(() => {
    const stats = offlineErrorHandler.getErrorStats();
    setErrorStats(stats);
    return stats;
  }, []);

  const clearErrors = useCallback(() => {
    offlineErrorHandler.clearErrorLog();
    setErrors([]);
    setErrorStats(null);
  }, []);

  return {
    errors,
    errorStats,
    handleError,
    getStats,
    clearErrors
  };
}

export default offlineErrorHandler;
export { ERROR_TYPES, ERROR_SEVERITY, RECOVERY_STRATEGIES };