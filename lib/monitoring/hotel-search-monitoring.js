/**
 * Hotel Search Monitoring System
 * Provides comprehensive monitoring and analytics for hotel search operations
 */

import { HotelErrorFactory } from '@/lib/errors/hotel-search-errors';

/**
 * Hotel Search Metrics Collector
 * Collects and analyzes hotel search performance metrics
 */
export class HotelSearchMetricsCollector {
  constructor() {
    this.metrics = {
      searchRequests: {
        total: 0,
        successful: 0,
        failed: 0,
        cached: 0,
        fallback: 0
      },
      responseTime: {
        total: 0,
        average: 0,
        min: Infinity,
        max: 0,
        samples: []
      },
      errors: {
        validation: 0,
        network: 0,
        api: 0,
        data: 0,
        business: 0,
        unknown: 0
      },
      destinations: new Map(),
      dateRanges: new Map(),
      guestConfigurations: new Map()
    };
    this.startTime = Date.now();
  }

  /**
   * Record search request start
   */
  recordSearchStart(searchParams, requestId) {
    this.metrics.searchRequests.total++;
    
    // Track destination popularity
    if (searchParams.destination) {
      const dest = searchParams.destination.toLowerCase();
      this.metrics.destinations.set(dest, (this.metrics.destinations.get(dest) || 0) + 1);
    }

    // Track date ranges
    if (searchParams.checkIn && searchParams.checkOut) {
      const nights = Math.ceil((new Date(searchParams.checkOut) - new Date(searchParams.checkIn)) / (1000 * 60 * 60 * 24));
      const rangeKey = `${nights}nights`;
      this.metrics.dateRanges.set(rangeKey, (this.metrics.dateRanges.get(rangeKey) || 0) + 1);
    }

    // Track guest configurations
    if (searchParams.guests) {
      const { adults = 1, children = 0, rooms = 1 } = searchParams.guests;
      const configKey = `${adults}a${children}c${rooms}r`;
      this.metrics.guestConfigurations.set(configKey, (this.metrics.guestConfigurations.get(configKey) || 0) + 1);
    }

    return {
      requestId,
      startTime: Date.now()
    };
  }

  /**
   * Record search request completion
   */
  recordSearchComplete(startTime, result, requestId) {
    const responseTime = Date.now() - startTime;
    
    // Update response time metrics
    this.metrics.responseTime.total += responseTime;
    this.metrics.responseTime.samples.push(responseTime);
    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, responseTime);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, responseTime);
    this.metrics.responseTime.average = this.metrics.responseTime.total / this.metrics.searchRequests.total;

    // Keep only last 1000 samples for memory efficiency
    if (this.metrics.responseTime.samples.length > 1000) {
      this.metrics.responseTime.samples = this.metrics.responseTime.samples.slice(-1000);
    }

    // Update success metrics
    if (result.success) {
      this.metrics.searchRequests.successful++;
      
      if (result.isCached) {
        this.metrics.searchRequests.cached++;
      }
      
      if (result.isFallback) {
        this.metrics.searchRequests.fallback++;
      }
    } else {
      this.metrics.searchRequests.failed++;
      
      // Track error types
      if (result.error && result.error.code) {
        const errorType = this.getErrorType(result.error.code);
        this.metrics.errors[errorType]++;
      }
    }

    return {
      requestId,
      responseTime,
      success: result.success,
      isCached: result.isCached,
      isFallback: result.isFallback
    };
  }

  /**
   * Get error type from error code
   */
  getErrorType(errorCode) {
    if (errorCode.startsWith('VALIDATION')) return 'validation';
    if (errorCode.startsWith('NETWORK')) return 'network';
    if (errorCode.startsWith('API')) return 'api';
    if (errorCode.startsWith('DATA')) return 'data';
    if (errorCode.startsWith('BUSINESS')) return 'business';
    return 'unknown';
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const successRate = this.metrics.searchRequests.total > 0 
      ? (this.metrics.searchRequests.successful / this.metrics.searchRequests.total) * 100 
      : 0;
    
    const cacheHitRate = this.metrics.searchRequests.total > 0 
      ? (this.metrics.searchRequests.cached / this.metrics.searchRequests.total) * 100 
      : 0;
    
    const fallbackRate = this.metrics.searchRequests.total > 0 
      ? (this.metrics.searchRequests.fallback / this.metrics.searchRequests.total) * 100 
      : 0;

    return {
      uptime,
      totalRequests: this.metrics.searchRequests.total,
      successRate: successRate.toFixed(2),
      cacheHitRate: cacheHitRate.toFixed(2),
      fallbackRate: fallbackRate.toFixed(2),
      averageResponseTime: Math.round(this.metrics.responseTime.average),
      minResponseTime: this.metrics.responseTime.min === Infinity ? 0 : this.metrics.responseTime.min,
      maxResponseTime: this.metrics.responseTime.max,
      errorBreakdown: { ...this.metrics.errors },
      topDestinations: Array.from(this.metrics.destinations.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      popularDateRanges: Array.from(this.metrics.dateRanges.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      commonGuestConfigs: Array.from(this.metrics.guestConfigurations.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      searchRequests: {
        total: 0,
        successful: 0,
        failed: 0,
        cached: 0,
        fallback: 0
      },
      responseTime: {
        total: 0,
        average: 0,
        min: Infinity,
        max: 0,
        samples: []
      },
      errors: {
        validation: 0,
        network: 0,
        api: 0,
        data: 0,
        business: 0,
        unknown: 0
      },
      destinations: new Map(),
      dateRanges: new Map(),
      guestConfigurations: new Map()
    };
    this.startTime = Date.now();
  }
}

/**
 * Hotel Search Logger
 * Provides structured logging for hotel search operations
 */
export class HotelSearchLogger {
  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
    this.logs = [];
    this.maxLogSize = 1000;
  }

  /**
   * Log search request
   */
  logSearch(searchParams, requestId, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'hotel_search_request',
      requestId,
      searchParams: this.sanitizeSearchParams(searchParams),
      metadata,
      userAgent: metadata.userAgent,
      ip: metadata.ip
    };

    this.addLog(logEntry);
    console.log(`[HOTEL_SEARCH] ${requestId}: Search request for ${searchParams.destination}`);
  }

  /**
   * Log search response
   */
  logSearchResponse(requestId, result, responseTime) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: result.success ? 'info' : 'error',
      type: 'hotel_search_response',
      requestId,
      success: result.success,
      responseTime,
      hotelCount: result.data?.hotels?.length || 0,
      isCached: result.isCached,
      isFallback: result.isFallback,
      error: result.error ? {
        code: result.error.code,
        message: result.error.message
      } : null
    };

    this.addLog(logEntry);
    
    if (result.success) {
      console.log(`[HOTEL_SEARCH] ${requestId}: Success - ${result.data?.hotels?.length || 0} hotels in ${responseTime}ms`);
    } else {
      console.error(`[HOTEL_SEARCH] ${requestId}: Failed - ${result.error?.message}`);
    }
  }

  /**
   * Log error
   */
  logError(error, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'hotel_search_error',
      error: {
        code: error.code,
        message: error.message,
        stack: error.stack
      },
      context
    };

    this.addLog(logEntry);
    console.error(`[HOTEL_SEARCH_ERROR] ${error.code}: ${error.message}`, context);
  }

  /**
   * Log performance metrics
   */
  logPerformance(metrics) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'hotel_search_performance',
      metrics
    };

    this.addLog(logEntry);
    console.log(`[HOTEL_SEARCH_PERFORMANCE] Success rate: ${metrics.successRate}%, Avg response: ${metrics.averageResponseTime}ms`);
  }

  /**
   * Add log entry
   */
  addLog(logEntry) {
    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit = 100) {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs by type
   */
  getLogsByType(type, limit = 100) {
    return this.logs
      .filter(log => log.type === type)
      .slice(-limit);
  }

  /**
   * Sanitize search params for logging
   */
  sanitizeSearchParams(searchParams) {
    const sanitized = { ...searchParams };
    
    // Remove sensitive data
    if (sanitized.guests) {
      // Keep guest counts but remove any PII
      sanitized.guests = {
        adults: sanitized.guests.adults,
        children: sanitized.guests.children,
        rooms: sanitized.guests.rooms
      };
    }
    
    return sanitized;
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }
}

/**
 * Hotel Search Alert Manager
 * Manages alerts for hotel search issues
 */
export class HotelSearchAlertManager {
  constructor() {
    this.alerts = [];
    this.alertThresholds = {
      errorRate: 0.1, // 10%
      responseTime: 5000, // 5 seconds
      fallbackRate: 0.2, // 20%
      consecutiveFailures: 5
    };
    this.alertHistory = [];
    this.cooldownPeriod = 300000; // 5 minutes
  }

  /**
   * Check for alerts based on metrics
   */
  checkAlerts(metrics) {
    const newAlerts = [];

    // Check error rate
    const errorRate = 1 - (metrics.successRate / 100);
    if (errorRate > this.alertThresholds.errorRate) {
      newAlerts.push({
        id: `high_error_rate_${Date.now()}`,
        type: 'HIGH_ERROR_RATE',
        severity: 'critical',
        message: `Hotel search error rate is ${(errorRate * 100).toFixed(2)}%`,
        threshold: `${(this.alertThresholds.errorRate * 100)}%`,
        currentValue: `${(errorRate * 100).toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Check response time
    if (metrics.averageResponseTime > this.alertThresholds.responseTime) {
      newAlerts.push({
        id: `slow_response_${Date.now()}`,
        type: 'SLOW_RESPONSE',
        severity: 'warning',
        message: `Hotel search average response time is ${metrics.averageResponseTime}ms`,
        threshold: `${this.alertThresholds.responseTime}ms`,
        currentValue: `${metrics.averageResponseTime}ms`,
        timestamp: new Date().toISOString()
      });
    }

    // Check fallback rate
    if (parseFloat(metrics.fallbackRate) > this.alertThresholds.fallbackRate * 100) {
      newAlerts.push({
        id: `high_fallback_rate_${Date.now()}`,
        type: 'HIGH_FALLBACK_RATE',
        severity: 'warning',
        message: `Hotel search fallback rate is ${metrics.fallbackRate}%`,
        threshold: `${(this.alertThresholds.fallbackRate * 100)}%`,
        currentValue: `${metrics.fallbackRate}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Filter out alerts that are in cooldown
    const filteredAlerts = newAlerts.filter(alert => 
      !this.isInCooldown(alert.type)
    );

    // Add new alerts
    filteredAlerts.forEach(alert => {
      this.alerts.push(alert);
      this.alertHistory.push({
        ...alert,
        resolved: false,
        acknowledged: false
      });
    });

    // Keep only active alerts
    this.alerts = this.alerts.filter(alert => 
      !this.isResolved(alert.id) && !this.isExpired(alert)
    );

    return filteredAlerts;
  }

  /**
   * Check if alert type is in cooldown
   */
  isInCooldown(alertType) {
    const recentAlerts = this.alertHistory
      .filter(alert => alert.type === alertType)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (recentAlerts.length === 0) return false;

    const lastAlert = recentAlerts[0];
    const timeSinceLastAlert = Date.now() - new Date(lastAlert.timestamp).getTime();
    
    return timeSinceLastAlert < this.cooldownPeriod;
  }

  /**
   * Check if alert is resolved
   */
  isResolved(alertId) {
    const alert = this.alertHistory.find(a => a.id === alertId);
    return alert?.resolved || false;
  }

  /**
   * Check if alert is expired
   */
  isExpired(alert) {
    const alertAge = Date.now() - new Date(alert.timestamp).getTime();
    return alertAge > 3600000; // 1 hour
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId) {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
    }
    
    // Remove from active alerts
    this.alerts = this.alerts.filter(a => a.id !== alertId);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.alerts;
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
  }
}

/**
 * Main Hotel Search Monitor
 * Coordinates all monitoring components
 */
export class HotelSearchMonitor {
  constructor() {
    this.metricsCollector = new HotelSearchMetricsCollector();
    this.logger = new HotelSearchLogger();
    this.alertManager = new HotelSearchAlertManager();
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start monitoring
   */
  startMonitoring(intervalMs = 60000) { // 1 minute
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);

    console.log('Hotel search monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Hotel search monitoring stopped');
  }

  /**
   * Monitor search request
   */
  monitorSearch(searchParams, requestId, metadata = {}) {
    this.logger.logSearch(searchParams, requestId, metadata);
    return this.metricsCollector.recordSearchStart(searchParams, requestId);
  }

  /**
   * Monitor search response
   */
  monitorSearchResponse(requestId, result, startTime) {
    const responseTime = Date.now() - startTime;
    
    this.logger.logSearchResponse(requestId, result, responseTime);
    return this.metricsCollector.recordSearchComplete(startTime, result, requestId);
  }

  /**
   * Monitor error
   */
  monitorError(error, context = {}) {
    this.logger.logError(error, context);
  }

  /**
   * Perform health check
   */
  performHealthCheck() {
    const metrics = this.metricsCollector.getMetrics();
    this.logger.logPerformance(metrics);
    
    const alerts = this.alertManager.checkAlerts(metrics);
    
    if (alerts.length > 0) {
      console.warn('Hotel search alerts triggered:', alerts);
      // Here you could send notifications to external systems
    }

    return {
      healthy: alerts.filter(a => a.severity === 'critical').length === 0,
      metrics,
      alerts
    };
  }

  /**
   * Get monitoring dashboard data
   */
  getDashboardData() {
    const metrics = this.metricsCollector.getMetrics();
    const activeAlerts = this.alertManager.getActiveAlerts();
    const recentLogs = this.logger.getRecentLogs(50);

    return {
      metrics,
      alerts: activeAlerts,
      logs: recentLogs,
      systemHealth: {
        isMonitoring: this.isMonitoring,
        uptime: metrics.uptime,
        healthy: activeAlerts.filter(a => a.severity === 'critical').length === 0
      }
    };
  }

  /**
   * Get detailed analytics
   */
  getAnalytics(timeRange = '24h') {
    const metrics = this.metricsCollector.getMetrics();
    const alertHistory = this.alertManager.getAlertHistory(100);
    const errorLogs = this.logger.getLogsByType('hotel_search_error', 100);

    return {
      timeRange,
      metrics,
      alerts: alertHistory,
      errors: errorLogs,
      performance: {
        responseTime: {
          average: metrics.averageResponseTime,
          min: metrics.minResponseTime,
          max: metrics.maxResponseTime
        },
        successRate: metrics.successRate,
        cacheHitRate: metrics.cacheHitRate,
        fallbackRate: metrics.fallbackRate
      },
      usage: {
        topDestinations: metrics.topDestinations,
        popularDateRanges: metrics.popularDateRanges,
        commonGuestConfigs: metrics.commonGuestConfigs
      }
    };
  }

  /**
   * Reset all monitoring data
   */
  resetMonitoring() {
    this.metricsCollector.resetMetrics();
    this.logger.clearLogs();
    this.alertManager.alerts = [];
    this.alertManager.alertHistory = [];
  }
}

// Create singleton instance
export const hotelSearchMonitor = new HotelSearchMonitor();

export default {
  HotelSearchMetricsCollector,
  HotelSearchLogger,
  HotelSearchAlertManager,
  HotelSearchMonitor,
  hotelSearchMonitor
};