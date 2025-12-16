/**
 * Flight Search Monitoring and Logging System
 * Provides comprehensive monitoring, error tracking, and analytics
 */

/**
 * Log Levels
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

/**
 * Event Types
 */
export const EventType = {
  SEARCH_INITIATED: 'search_initiated',
  SEARCH_COMPLETED: 'search_completed',
  SEARCH_FAILED: 'search_failed',
  CACHE_HIT: 'cache_hit',
  CACHE_MISS: 'cache_miss',
  ERROR_OCCURRED: 'error_occurred',
  RETRY_ATTEMPTED: 'retry_attempted',
  FALLBACK_USED: 'fallback_used',
  PERFORMANCE_ISSUE: 'performance_issue'
};

/**
 * Structured Logger
 */
export class StructuredLogger {
  constructor(config = {}) {
    this.config = {
      logLevel: config.logLevel || LogLevel.INFO,
      enableConsole: config.enableConsole !== false,
      enableRemote: config.enableRemote || false,
      remoteEndpoint: config.remoteEndpoint || '/api/logs',
      batchSize: config.batchSize || 10,
      batchTimeout: config.batchTimeout || 5000,
      ...config
    };

    this.logQueue = [];
    this.batchTimer = null;
    this.traceId = null;
  }

  /**
   * Generate unique trace ID
   */
  generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set trace ID for current operation
   */
  setTraceId(traceId) {
    this.traceId = traceId;
  }

  /**
   * Create structured log entry
   */
  createLogEntry(level, message, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: this.getLevelName(level),
      message,
      traceId: this.traceId,
      context: {
        ...context,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server'
      }
    };
  }

  /**
   * Get level name
   */
  getLevelName(level) {
    return Object.keys(LogLevel).find(key => LogLevel[key] === level);
  }

  /**
   * Check if level should be logged
   */
  shouldLog(level) {
    return level >= this.config.logLevel;
  }

  /**
   * Log debug message
   */
  debug(message, context = {}) {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message, context = {}) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message, context = {}) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message, context = {}) {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log fatal message
   */
  fatal(message, context = {}) {
    this.log(LogLevel.FATAL, message, context);
  }

  /**
   * Main log method
   */
  log(level, message, context = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, context);

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Remote logging
    if (this.config.enableRemote) {
      this.addToBatch(entry);
    }
  }

  /**
   * Log to console
   */
  logToConsole(entry) {
    const method = entry.level.toLowerCase();
    const message = `[${entry.timestamp}] [${entry.traceId || 'no-trace'}] ${entry.message}`;
    
    if (console[method]) {
      console[method](message, entry.context);
    } else {
      console.log(message, entry.context);
    }
  }

  /**
   * Add to batch for remote logging
   */
  addToBatch(entry) {
    this.logQueue.push(entry);

    if (this.logQueue.length >= this.config.batchSize) {
      this.flushBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBatch(), this.config.batchTimeout);
    }
  }

  /**
   * Flush batch to remote endpoint
   */
  async flushBatch() {
    if (this.logQueue.length === 0) {
      return;
    }

    const batch = [...this.logQueue];
    this.logQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs: batch,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'flight-search-monitoring'
          }
        })
      });
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      // Re-add logs to queue for retry
      this.logQueue.unshift(...batch);
    }
  }

  /**
   * Destroy logger and flush remaining logs
   */
  async destroy() {
    await this.flushBatch();
  }
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
  constructor(logger) {
    this.logger = logger;
    this.operations = new Map();
    this.metrics = new Map();
    this.thresholds = {
      search: 5000, // 5 seconds
      api: 2000, // 2 seconds
      cache: 100 // 100ms
    };
  }

  /**
   * Start monitoring an operation
   */
  startOperation(operationId, operationType, metadata = {}) {
    const operation = {
      id: operationId,
      type: operationType,
      startTime: Date.now(),
      metadata
    };

    this.operations.set(operationId, operation);
    
    this.logger.debug(`Operation started: ${operationType}`, {
      operationId,
      metadata
    });

    return operationId;
  }

  /**
   * End monitoring an operation
   */
  endOperation(operationId, result = null, error = null) {
    const operation = this.operations.get(operationId);
    
    if (!operation) {
      this.logger.warn(`Operation not found: ${operationId}`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - operation.startTime;

    const metric = {
      operationId,
      type: operation.type,
      startTime: operation.startTime,
      endTime,
      duration,
      success: !error,
      result,
      error: error ? error.message : null,
      metadata: operation.metadata
    };

    // Store metric
    if (!this.metrics.has(operation.type)) {
      this.metrics.set(operation.type, []);
    }
    this.metrics.get(operation.type).push(metric);

    // Clean up operation
    this.operations.delete(operationId);

    // Check performance thresholds
    const threshold = this.thresholds[operation.type] || this.thresholds.api;
    if (duration > threshold) {
      this.logger.warn(`Performance issue detected: ${operation.type} took ${duration}ms`, {
        operationId,
        threshold,
        actual: duration,
        metadata: operation.metadata
      });
    }

    this.logger.debug(`Operation completed: ${operation.type}`, {
      operationId,
      duration,
      success: metric.success
    });

    return metric;
  }

  /**
   * Get performance statistics
   */
  getStats(operationType = null) {
    const stats = {};

    if (operationType) {
      const metrics = this.metrics.get(operationType) || [];
      stats[operationType] = this.calculateStats(metrics);
    } else {
      for (const [type, metrics] of this.metrics.entries()) {
        stats[type] = this.calculateStats(metrics);
      }
    }

    return stats;
  }

  /**
   * Calculate statistics for metrics
   */
  calculateStats(metrics) {
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0
      };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successful = metrics.filter(m => m.success).length;

    return {
      totalOperations: metrics.length,
      successRate: successful / metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)]
    };
  }

  /**
   * Clear old metrics
   */
  clearMetrics(olderThan = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = Date.now() - olderThan;

    for (const [type, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.endTime > cutoff);
      this.metrics.set(type, filtered);
    }
  }
}

/**
 * Error Tracker
 */
export class ErrorTracker {
  constructor(logger) {
    this.logger = logger;
    this.errors = new Map();
    this.patterns = new Map();
    this.errorCounts = new Map();
  }

  /**
   * Track an error
   */
  trackError(error, context = {}) {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    const errorEntry = {
      id: errorId,
      message: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name || 'Error',
      timestamp,
      context: {
        ...context,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server'
      },
      category: error.category || 'unknown',
      severity: error.severity || 'medium',
      errorCode: error.errorCode || 'UNKNOWN'
    };

    // Store error
    this.errors.set(errorId, errorEntry);

    // Update error counts
    const category = errorEntry.category;
    this.errorCounts.set(category, (this.errorCounts.get(category) || 0) + 1);

    // Detect patterns
    const pattern = this.detectPattern(errorEntry);
    if (pattern) {
      errorEntry.pattern = pattern;
      this.patterns.set(pattern, (this.patterns.get(pattern) || 0) + 1);
    }

    this.logger.error(`Error tracked: ${errorEntry.message}`, {
      errorId,
      category,
      severity,
      context: errorEntry.context
    });

    return errorEntry;
  }

  /**
   * Generate error ID
   */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detect error patterns
   */
  detectPattern(errorEntry) {
    const message = errorEntry.message.toLowerCase();

    // Common patterns
    if (message.includes('network') || message.includes('connection')) {
      return 'network_error';
    }

    if (message.includes('timeout')) {
      return 'timeout_error';
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation_error';
    }

    if (message.includes('airport') && message.includes('code')) {
      return 'airport_code_error';
    }

    if (message.includes('date') && (message.includes('past') || message.includes('invalid'))) {
      return 'date_validation_error';
    }

    if (message.includes('passenger')) {
      return 'passenger_error';
    }

    if (message.includes('rate limit') || message.includes('too many')) {
      return 'rate_limit_error';
    }

    if (message.includes('service') && message.includes('unavailable')) {
      return 'service_unavailable_error';
    }

    return null;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const totalErrors = this.errors.size;
    const errorsByCategory = Object.fromEntries(this.errorCounts);
    const commonPatterns = Object.fromEntries(
      Array.from(this.patterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    );

    return {
      totalErrors,
      errorsByCategory,
      commonPatterns,
      recentErrors: this.getRecentErrors(10)
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10) {
    const errors = Array.from(this.errors.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return errors;
  }

  /**
   * Clear old errors
   */
  clearErrors(olderThan = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = new Date(Date.now() - olderThan);

    for (const [id, error] of this.errors.entries()) {
      if (new Date(error.timestamp) < cutoff) {
        this.errors.delete(id);
      }
    }
  }
}

/**
 * Alert Manager
 */
export class AlertManager {
  constructor(logger, config = {}) {
    this.logger = logger;
    this.config = {
      errorThreshold: config.errorThreshold || 10, // Alert after 10 errors
      performanceThreshold: config.performanceThreshold || 5000, // Alert after 5 seconds
      timeWindow: config.timeWindow || 5 * 60 * 1000, // 5 minutes
      alertEndpoints: config.alertEndpoints || [],
      ...config
    };

    this.alertCounts = new Map();
    this.lastAlerts = new Map();
  }

  /**
   * Check for alerts based on error tracker
   */
  checkAlerts(errorStats) {
    const alerts = [];

    // Error rate alert
    if (errorStats.totalErrors >= this.config.errorThreshold) {
      alerts.push(this.createAlert(
        'high_error_rate',
        `High error rate detected: ${errorStats.totalErrors} errors`,
        'warning',
        {
          errorCount: errorStats.totalErrors,
          threshold: this.config.errorThreshold
        }
      ));
    }

    // Category-specific alerts
    for (const [category, count] of Object.entries(errorStats.errorsByCategory)) {
      if (count >= Math.ceil(this.config.errorThreshold / 2)) {
        alerts.push(this.createAlert(
          'category_error_spike',
          `High ${category} error rate: ${count} errors`,
          'warning',
          {
            category,
            count,
            threshold: Math.ceil(this.config.errorThreshold / 2)
          }
        ));
      }
    }

    // Send alerts
    alerts.forEach(alert => this.sendAlert(alert));

    return alerts;
  }

  /**
   * Check performance alerts
   */
  checkPerformanceAlerts(performanceStats) {
    const alerts = [];

    for (const [operation, stats] of Object.entries(performanceStats)) {
      if (stats.averageDuration > this.config.performanceThreshold) {
        alerts.push(this.createAlert(
          'performance_degradation',
          `Performance degradation in ${operation}: ${stats.averageDuration}ms average`,
          'warning',
          {
            operation,
            averageDuration: stats.averageDuration,
            threshold: this.config.performanceThreshold
          }
        ));
      }
    }

    alerts.forEach(alert => this.sendAlert(alert));
    return alerts;
  }

  /**
   * Create alert object
   */
  createAlert(type, message, severity, context = {}) {
    const alertId = this.generateAlertId(type);
    const timestamp = new Date().toISOString();

    return {
      id: alertId,
      type,
      message,
      severity,
      timestamp,
      context,
      resolved: false
    };
  }

  /**
   * Generate alert ID
   */
  generateAlertId(type) {
    return `alert_${type}_${Date.now()}`;
  }

  /**
   * Send alert
   */
  async sendAlert(alert) {
    const alertKey = alert.type;
    const now = Date.now();

    // Check if we recently sent this alert
    if (this.lastAlerts.has(alertKey)) {
      const lastSent = this.lastAlerts.get(alertKey);
      if (now - lastSent < this.config.timeWindow) {
        return; // Don't spam alerts
      }
    }

    // Update last sent time
    this.lastAlerts.set(alertKey, now);

    this.logger.warn(`Alert triggered: ${alert.message}`, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      context: alert.context
    });

    // Send to configured endpoints
    for (const endpoint of this.config.alertEndpoints) {
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(alert)
        });
      } catch (error) {
        this.logger.error(`Failed to send alert to ${endpoint}:`, error);
      }
    }
  }
}

/**
 * Metrics Collector
 */
export class MetricsCollector {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }

  /**
   * Increment counter
   */
  incrementCounter(name, labels = {}, value = 1) {
    const key = this.createKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Set gauge value
   */
  setGauge(name, labels = {}, value) {
    const key = this.createKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Record histogram value
   */
  recordHistogram(name, labels = {}, value) {
    const key = this.createKey(name, labels);
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        values: []
      });
    }

    const histogram = this.histograms.get(key);
    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);
    histogram.values.push(value);

    // Keep only last 1000 values to avoid memory issues
    if (histogram.values.length > 1000) {
      histogram.values.shift();
    }
  }

  /**
   * Create key with labels
   */
  createKey(name, labels) {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: this.getHistogramStats()
    };
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats() {
    const stats = {};

    for (const [key, histogram] of this.histograms.entries()) {
      const values = [...histogram.values].sort((a, b) => a - b);
      
      stats[key] = {
        count: histogram.count,
        sum: histogram.sum,
        min: histogram.min === Infinity ? 0 : histogram.min,
        max: histogram.max === -Infinity ? 0 : histogram.max,
        avg: histogram.count > 0 ? histogram.sum / histogram.count : 0,
        p50: this.percentile(values, 0.5),
        p95: this.percentile(values, 0.95),
        p99: this.percentile(values, 0.99)
      };
    }

    return stats;
  }

  /**
   * Calculate percentile
   */
  percentile(sortedValues, percentile) {
    if (sortedValues.length === 0) return 0;
    
    const index = percentile * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

/**
 * Main Flight Search Monitoring System
 */
export class FlightSearchMonitoring {
  constructor(config = {}) {
    this.logger = new StructuredLogger(config.logger);
    this.performanceMonitor = new PerformanceMonitor(this.logger);
    this.errorTracker = new ErrorTracker(this.logger);
    this.alertManager = new AlertManager(this.logger, config.alerts);
    this.metricsCollector = new MetricsCollector();
    
    this.setupCleanupInterval();
  }

  /**
   * Monitor a search operation
   */
  async monitorSearch(searchParams, searchFunction) {
    const traceId = this.logger.generateTraceId();
    this.logger.setTraceId(traceId);

    const operationId = this.performanceMonitor.startOperation(
      traceId,
      'search',
      { searchParams }
    );

    this.metricsCollector.incrementCounter('search_initiated', {
      origin: searchParams.origin,
      destination: searchParams.destination
    });

    try {
      this.logger.info('Flight search initiated', {
        traceId,
        searchParams
      });

      const result = await searchFunction(searchParams);

      this.performanceMonitor.endOperation(operationId, result);
      this.metricsCollector.incrementCounter('search_completed', {
        origin: searchParams.origin,
        destination: searchParams.destination
      });

      this.logger.info('Flight search completed successfully', {
        traceId,
        resultCount: result.data?.length || 0
      });

      return result;

    } catch (error) {
      this.performanceMonitor.endOperation(operationId, null, error);
      this.errorTracker.trackError(error, {
        traceId,
        searchParams,
        operation: 'flight_search'
      });

      this.metricsCollector.incrementCounter('search_failed', {
        origin: searchParams.origin,
        destination: searchParams.destination,
        errorType: error.category || 'unknown'
      });

      this.logger.error('Flight search failed', {
        traceId,
        error: error.message
      });

      throw error;
    } finally {
      this.logger.setTraceId(null);
    }
  }

  /**
   * Get dashboard data
   */
  getDashboardData() {
    return {
      errors: this.errorTracker.getErrorStats(),
      performance: this.performanceMonitor.getStats(),
      metrics: this.metricsCollector.getMetrics(),
      alerts: this.alertManager.getRecentAlerts?.() || []
    };
  }

  /**
   * Setup cleanup interval
   */
  setupCleanupInterval() {
    setInterval(() => {
      this.performanceMonitor.clearMetrics();
      this.errorTracker.clearErrors();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Destroy monitoring system
   */
  async destroy() {
    await this.logger.destroy();
  }
}

// Create singleton instance
export const flightSearchMonitoring = new FlightSearchMonitoring({
  logger: {
    logLevel: LogLevel.INFO,
    enableConsole: true,
    enableRemote: true
  },
  alerts: {
    errorThreshold: 5,
    performanceThreshold: 3000,
    alertEndpoints: ['/api/alerts']
  }
});

export default {
  LogLevel,
  EventType,
  StructuredLogger,
  PerformanceMonitor,
  ErrorTracker,
  AlertManager,
  MetricsCollector,
  FlightSearchMonitoring,
  flightSearchMonitoring
};