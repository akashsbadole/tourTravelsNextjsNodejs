/**
 * Performance Monitor for Offline Functionality
 * Monitors cache performance, hit rates, and optimization opportunities
 */

import indexedDBManager from './indexedDB';
import cacheManager from './cacheManager';

// Performance metrics
const METRICS = {
  CACHE_HIT_RATE: 'cache-hit-rate',
  RESPONSE_TIME: 'response-time',
  OFFLINE_USAGE: 'offline-usage',
  STORAGE_EFFICIENCY: 'storage-efficiency',
  SYNC_PERFORMANCE: 'sync-performance',
  NETWORK_QUALITY: 'network-quality',
  USER_BEHAVIOR: 'user-behavior'
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  CACHE_HIT_RATE: {
    EXCELLENT: 0.8,    // 80%+
    GOOD: 0.6,           // 60-80%
    POOR: 0.4,           // 40-60%
    CRITICAL: 0.2         // <40%
  },
  RESPONSE_TIME: {
    EXCELLENT: 500,       // <500ms
    GOOD: 1000,            // 500-1000ms
    POOR: 2000,            // 1000-2000ms
    CRITICAL: 3000          // >2000ms
  },
  STORAGE_USAGE: {
    OPTIMAL: 0.5,         // <50%
    GOOD: 0.7,              // 50-70%
    WARNING: 0.85,          // 70-85%
    CRITICAL: 0.95          // >85%
  }
};

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.performanceData = [];
    this.monitoringActive = false;
    this.observers = [];
    
    this.init();
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    this.setupPerformanceObservers();
    this.loadStoredMetrics();
    this.startMonitoring();
    console.log('[PerformanceMonitor] Initialized');
  }

  /**
   * Set up performance observers
   */
  setupPerformanceObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
              this.recordNavigationTiming(entry);
            }
          });
        });
        
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('[PerformanceMonitor] Navigation observer not supported:', error);
      }

      // Observe resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'resource') {
              this.recordResourceTiming(entry);
            }
          });
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('[PerformanceMonitor] Resource observer not supported:', error);
      }
    }
  }

  /**
   * Load stored metrics
   */
  async loadStoredMetrics() {
    try {
      const storedMetrics = await indexedDBManager.getUserPreference('performanceMetrics');
      
      if (storedMetrics) {
        this.metrics = new Map(Object.entries(storedMetrics.metrics || {}));
        this.performanceData = storedMetrics.performanceData || [];
        console.log('[PerformanceMonitor] Loaded stored metrics');
      }
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to load stored metrics:', error);
    }
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    this.monitoringActive = true;
    
    // Set up periodic metric collection
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute

    // Set up storage of metrics
    setInterval(() => {
      this.storeMetrics();
    }, 5 * 60000); // Every 5 minutes
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheType, responseTime, fromCache = true) {
    const metric = this.metrics.get(METRICS.CACHE_HIT_RATE) || {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      byType: {}
    };

    metric.totalRequests++;
    
    if (fromCache) {
      metric.hits++;
      metric.byType[cacheType] = {
        ...(metric.byType[cacheType] || {}),
        hits: (metric.byType[cacheType]?.hits || 0) + 1,
        totalRequests: (metric.byType[cacheType]?.totalRequests || 0) + 1
      };
    } else {
      metric.misses++;
      metric.byType[cacheType] = {
        ...(metric.byType[cacheType] || {}),
        misses: (metric.byType[cacheType]?.misses || 0) + 1,
        totalRequests: (metric.byType[cacheType]?.totalRequests || 0) + 1
      };
    }

    this.metrics.set(METRICS.CACHE_HIT_RATE, metric);

    // Record response time
    this.recordResponseTime(cacheType, responseTime, fromCache);
  }

  /**
   * Record response time
   */
  recordResponseTime(cacheType, responseTime, fromCache) {
    const metric = this.metrics.get(METRICS.RESPONSE_TIME) || {
      samples: [],
      byType: {},
      average: 0,
      p50: 0,
      p95: 0
    };

    const sample = {
      cacheType,
      responseTime,
      fromCache,
      timestamp: Date.now()
    };

    metric.samples.push(sample);
    
    // Keep only last 1000 samples
    if (metric.samples.length > 1000) {
      metric.samples = metric.samples.slice(-1000);
    }

    // Update type-specific metrics
    if (!metric.byType[cacheType]) {
      metric.byType[cacheType] = {
        samples: [],
        average: 0,
        p50: 0,
        p95: 0
      };
    }

    metric.byType[cacheType].samples.push(sample);
    
    if (metric.byType[cacheType].samples.length > 100) {
      metric.byType[cacheType].samples = metric.byType[cacheType].samples.slice(-100);
    }

    // Calculate statistics
    this.calculateResponseTimeStats(metric);
    this.calculateResponseTimeStats(metric.byType[cacheType]);

    this.metrics.set(METRICS.RESPONSE_TIME, metric);
  }

  /**
   * Calculate response time statistics
   */
  calculateResponseTimeStats(metric) {
    const times = metric.samples.map(s => s.responseTime).sort((a, b) => a - b);
    
    if (times.length === 0) return;

    metric.average = times.reduce((sum, time) => sum + time, 0) / times.length;
    metric.p50 = times[Math.floor(times.length * 0.5)];
    metric.p95 = times[Math.floor(times.length * 0.95)];
  }

  /**
   * Record offline usage
   */
  recordOfflineUsage(duration, actions) {
    const metric = this.metrics.get(METRICS.OFFLINE_USAGE) || {
      totalOfflineTime: 0,
      sessions: [],
      actionsPerSession: []
    };

    const session = {
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      actions
    };

    metric.sessions.push(session);
    metric.totalOfflineTime += duration;
    metric.actionsPerSession.push(actions);

    // Keep only last 50 sessions
    if (metric.sessions.length > 50) {
      metric.sessions = metric.sessions.slice(-50);
      metric.actionsPerSession = metric.actionsPerSession.slice(-50);
    }

    this.metrics.set(METRICS.OFFLINE_USAGE, metric);
  }

  /**
   * Record storage efficiency
   */
  async recordStorageEfficiency() {
    try {
      const storageStats = await indexedDBManager.getStorageUsage();
      
      if (!storageStats) return;

      const metric = this.metrics.get(METRICS.STORAGE_EFFICIENCY) || {
        samples: [],
        averageUsage: 0,
        peakUsage: 0,
        efficiency: 0
      };

      const sample = {
        timestamp: Date.now(),
        usage: storageStats.usage,
        quota: storageStats.quota,
        percentage: parseFloat(storageStats.percentage)
      };

      metric.samples.push(sample);
      
      if (metric.samples.length > 100) {
        metric.samples = metric.samples.slice(-100);
      }

      // Calculate statistics
      const percentages = metric.samples.map(s => s.percentage);
      metric.averageUsage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
      metric.peakUsage = Math.max(...percentages);
      metric.efficiency = this.calculateStorageEfficiency(storageStats);

      this.metrics.set(METRICS.STORAGE_EFFICIENCY, metric);
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to record storage efficiency:', error);
    }
  }

  /**
   * Record sync performance
   */
  recordSyncPerformance(syncType, duration, success, itemsProcessed) {
    const metric = this.metrics.get(METRICS.SYNC_PERFORMANCE) || {
      operations: [],
      successRate: 0,
      averageDuration: 0,
      itemsPerSecond: 0
    };

    const operation = {
      syncType,
      duration,
      success,
      itemsProcessed,
      timestamp: Date.now(),
      itemsPerSecond: itemsProcessed / (duration / 1000)
    };

    metric.operations.push(operation);
    
    if (metric.operations.length > 100) {
      metric.operations = metric.operations.slice(-100);
    }

    // Calculate statistics
    const successfulOps = metric.operations.filter(op => op.success);
    metric.successRate = successfulOps.length / metric.operations.length;
    metric.averageDuration = metric.operations.reduce((sum, op) => sum + op.duration, 0) / metric.operations.length;
    metric.itemsPerSecond = metric.operations.reduce((sum, op) => sum + op.itemsPerSecond, 0) / metric.operations.length;

    this.metrics.set(METRICS.SYNC_PERFORMANCE, metric);
  }

  /**
   * Record user behavior
   */
  recordUserBehavior(action, context = {}) {
    const metric = this.metrics.get(METRICS.USER_BEHAVIOR) || {
      actions: [],
      patterns: {},
      sessionStart: Date.now()
    };

    const actionRecord = {
      action,
      context,
      timestamp: Date.now(),
      sessionDuration: Date.now() - metric.sessionStart
    };

    metric.actions.push(actionRecord);
    
    if (metric.actions.length > 1000) {
      metric.actions = metric.actions.slice(-1000);
    }

    // Analyze patterns
    this.analyzeUserPatterns(metric);

    this.metrics.set(METRICS.USER_BEHAVIOR, metric);
  }

  /**
   * Analyze user patterns
   */
  analyzeUserPatterns(metric) {
    const recentActions = metric.actions.slice(-50); // Last 50 actions
    
    // Count action types
    const actionCounts = {};
    recentActions.forEach(action => {
      actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
    });

    metric.patterns = {
      mostCommonAction: Object.keys(actionCounts).reduce((a, b) => 
        actionCounts[a] > actionCounts[b] ? a : b
      ),
      actionFrequency: actionCounts,
      sessionLength: Date.now() - metric.sessionStart
    };
  }

  /**
   * Record navigation timing
   */
  recordNavigationTiming(entry) {
    const timing = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      firstPaint: entry.responseStart - entry.requestStart,
      totalLoadTime: entry.loadEventEnd - entry.navigationStart,
      timestamp: Date.now()
    };

    this.recordUserBehavior('page_load', { timing });
  }

  /**
   * Record resource timing
   */
  recordResourceTiming(entry) {
    if (entry.name.includes('/api/')) {
      this.recordResponseTime(
        this.getCacheTypeFromUrl(entry.name),
        entry.responseEnd - entry.requestStart,
        entry.transferSize === 0 // Cached if transferSize is 0
      );
    }
  }

  /**
   * Get cache type from URL
   */
  getCacheTypeFromUrl(url) {
    if (url.includes('/flights/search')) return 'FLIGHT_SEARCH';
    if (url.includes('/hotels/search')) return 'HOTEL_SEARCH';
    if (url.includes('/flights/')) return 'FLIGHT_DETAILS';
    if (url.includes('/hotels/')) return 'HOTEL_DETAILS';
    return 'UNKNOWN';
  }

  /**
   * Calculate storage efficiency
   */
  calculateStorageEfficiency(storageStats) {
    // Simple efficiency calculation based on usage vs. data freshness
    const usagePercentage = parseFloat(storageStats.percentage);
    
    if (usagePercentage < 50) return 1.0; // Excellent
    if (usagePercentage < 70) return 0.8; // Good
    if (usagePercentage < 85) return 0.6; // Fair
    return 0.4; // Poor
  }

  /**
   * Collect metrics
   */
  async collectMetrics() {
    try {
      await this.recordStorageEfficiency();
      
      // Collect performance data point
      const dataPoint = {
        timestamp: Date.now(),
        metrics: {}
      };

      // Convert Map to object for storage
      this.metrics.forEach((value, key) => {
        dataPoint.metrics[key] = value;
      });

      this.performanceData.push(dataPoint);
      
      // Keep only last 100 data points
      if (this.performanceData.length > 100) {
        this.performanceData = this.performanceData.slice(-100);
      }
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to collect metrics:', error);
    }
  }

  /**
   * Store metrics
   */
  async storeMetrics() {
    try {
      const metricsObject = {};
      this.metrics.forEach((value, key) => {
        metricsObject[key] = value;
      });

      await indexedDBManager.setUserPreference('performanceMetrics', {
        metrics: metricsObject,
        performanceData: this.performanceData,
        lastUpdated: Date.now()
      });

      console.log('[PerformanceMonitor] Metrics stored');
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to store metrics:', error);
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      summary: {},
      recommendations: []
    };

    // Cache hit rate analysis
    const cacheMetric = this.metrics.get(METRICS.CACHE_HIT_RATE);
    if (cacheMetric) {
      const hitRate = cacheMetric.hits / cacheMetric.totalRequests;
      report.summary.cacheHitRate = hitRate;
      
      if (hitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE.CRITICAL) {
        report.recommendations.push({
          type: 'cache-performance',
          severity: 'critical',
          title: 'Very Low Cache Hit Rate',
          description: `Cache hit rate is ${(hitRate * 100).toFixed(1)}%. Consider reviewing cache strategies.`
        });
      } else if (hitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE.POOR) {
        report.recommendations.push({
          type: 'cache-performance',
          severity: 'warning',
          title: 'Low Cache Hit Rate',
          description: `Cache hit rate is ${(hitRate * 100).toFixed(1)}%. Optimize cache TTL and strategies.`
        });
      }
    }

    // Response time analysis
    const responseMetric = this.metrics.get(METRICS.RESPONSE_TIME);
    if (responseMetric) {
      report.summary.averageResponseTime = responseMetric.average;
      report.summary.p95ResponseTime = responseMetric.p95;
      
      if (responseMetric.p95 > PERFORMANCE_THRESHOLDS.RESPONSE_TIME.CRITICAL) {
        report.recommendations.push({
          type: 'response-time',
          severity: 'critical',
          title: 'Very Slow Response Times',
          description: `95th percentile response time is ${responseMetric.p95}ms. Investigate performance bottlenecks.`
        });
      } else if (responseMetric.p95 > PERFORMANCE_THRESHOLDS.RESPONSE_TIME.POOR) {
        report.recommendations.push({
          type: 'response-time',
          severity: 'warning',
          title: 'Slow Response Times',
          description: `95th percentile response time is ${responseMetric.p95}ms. Consider optimization.`
        });
      }
    }

    // Storage efficiency analysis
    const storageMetric = this.metrics.get(METRICS.STORAGE_EFFICIENCY);
    if (storageMetric) {
      report.summary.storageEfficiency = storageMetric.efficiency;
      report.summary.storageUsage = storageMetric.averageUsage;
      
      if (storageMetric.averageUsage > PERFORMANCE_THRESHOLDS.STORAGE_USAGE.CRITICAL) {
        report.recommendations.push({
          type: 'storage-usage',
          severity: 'critical',
          title: 'Critical Storage Usage',
          description: `Storage usage is ${storageMetric.averageUsage.toFixed(1)}%. Immediate cleanup required.`
        });
      }
    }

    // Sync performance analysis
    const syncMetric = this.metrics.get(METRICS.SYNC_PERFORMANCE);
    if (syncMetric) {
      report.summary.syncSuccessRate = syncMetric.successRate;
      
      if (syncMetric.successRate < 0.8) {
        report.recommendations.push({
          type: 'sync-performance',
          severity: 'warning',
          title: 'Low Sync Success Rate',
          description: `Sync success rate is ${(syncMetric.successRate * 100).toFixed(1)}%. Check network connectivity.`
        });
      }
    }

    return report;
  }

  /**
   * Get metrics by type
   */
  getMetrics(metricType) {
    return this.metrics.get(metricType);
  }

  /**
   * Get historical data
   */
  getHistoricalData(metricType, timeRange = '24h') {
    const now = Date.now();
    let cutoffTime;

    switch (timeRange) {
      case '1h':
        cutoffTime = now - 60 * 60 * 1000;
        break;
      case '24h':
        cutoffTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        cutoffTime = now - 24 * 60 * 60 * 1000;
    }

    return this.performanceData
      .filter(dataPoint => dataPoint.timestamp > cutoffTime)
      .map(dataPoint => dataPoint.metrics[metricType])
      .filter(Boolean);
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics.clear();
    this.performanceData = [];
    console.log('[PerformanceMonitor] Metrics reset');
  }

  /**
   * Export metrics
   */
  exportMetrics() {
    const exportData = {
      timestamp: Date.now(),
      metrics: {},
      performanceData: this.performanceData
    };

    this.metrics.forEach((value, key) => {
      exportData.metrics[key] = value;
    });

    return exportData;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.monitoringActive = false;
    
    // Disconnect observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
    
    console.log('[PerformanceMonitor] Cleaned up');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [performanceReport, setPerformanceReport] = useState(null);
  const [metrics, setMetrics] = useState({});

  const recordCacheHit = useCallback((cacheType, responseTime, fromCache) => {
    performanceMonitor.recordCacheHit(cacheType, responseTime, fromCache);
  }, []);

  const recordUserBehavior = useCallback((action, context) => {
    performanceMonitor.recordUserBehavior(action, context);
  }, []);

  const getReport = useCallback(() => {
    const report = performanceMonitor.getPerformanceReport();
    setPerformanceReport(report);
    return report;
  }, []);

  const getMetrics = useCallback((metricType) => {
    const metric = performanceMonitor.getMetrics(metricType);
    setMetrics(prev => ({ ...prev, [metricType]: metric }));
    return metric;
  }, []);

  const getHistoricalData = useCallback((metricType, timeRange) => {
    return performanceMonitor.getHistoricalData(metricType, timeRange);
  }, []);

  const resetMetrics = useCallback(() => {
    performanceMonitor.resetMetrics();
    setMetrics({});
    setPerformanceReport(null);
  }, []);

  return {
    performanceReport,
    metrics,
    recordCacheHit,
    recordUserBehavior,
    getReport,
    getMetrics,
    getHistoricalData,
    resetMetrics
  };
}

export default performanceMonitor;
export { METRICS, PERFORMANCE_THRESHOLDS };