import { getManyDocs, updateOneDoc } from "@/lib/db/operations";
import { getPriceTrackingEngine } from "./priceTracking";
import { getAlertAnalyticsService } from "./alertAnalytics";

/**
 * Real-time Price Monitoring Service
 * Optimizes price monitoring for performance and efficiency
 */
export class RealTimePriceMonitoring {
  constructor(options = {}) {
    this.options = {
      // Monitoring intervals (in milliseconds)
      intervals: {
        critical: 1 * 60 * 1000,      // 1 minute for critical alerts
        high: 5 * 60 * 1000,          // 5 minutes for high priority
        normal: 15 * 60 * 1000,        // 15 minutes for normal priority
        low: 30 * 60 * 1000           // 30 minutes for low priority
      },
      // Batch processing settings
      batch: {
        maxSize: 100,                     // Max alerts per batch
        maxProcessingTime: 5 * 60 * 1000, // Max 5 minutes per batch
        concurrency: 5                      // Process 5 alerts concurrently
      },
      // Cache settings
      cache: {
        ttl: 5 * 60 * 1000,            // 5 minutes cache TTL
        maxSize: 1000,                    // Max 1000 cached items
        cleanupInterval: 10 * 60 * 1000    // Cleanup every 10 minutes
      },
      // Performance optimization
      performance: {
        enableSmartScheduling: true,       // Intelligently schedule checks
        enablePredictiveCaching: true,     // Cache likely-to-be-accessed data
        enableBatchOptimization: true,      // Optimize batch processing
        enableAdaptiveIntervals: true       // Adjust intervals based on activity
      },
      ...options
    };
    
    this.priceTrackingEngine = getPriceTrackingEngine();
    this.analyticsService = getAlertAnalyticsService();
    this.cache = new Map();
    this.monitoringJobs = new Map();
    this.lastCleanup = Date.now();
    this.performanceMetrics = {
      totalChecks: 0,
      averageCheckTime: 0,
      cacheHitRate: 0,
      batchProcessingTime: 0
    };
    
    // Start background processes
    this.startBackgroundProcesses();
  }

  /**
   * Start optimized price monitoring for an alert
   * @param {Object} alert - Alert to monitor
   * @returns {Object} Monitoring job info
   */
  async startMonitoring(alert) {
    try {
      const jobId = this.generateJobId(alert);
      
      // Check if already monitoring
      if (this.monitoringJobs.has(jobId)) {
        return this.monitoringJobs.get(jobId);
      }

      // Determine optimal monitoring strategy
      const strategy = this.determineMonitoringStrategy(alert);
      
      // Create monitoring job
      const job = {
        id: jobId,
        alertId: alert._id,
        alert,
        strategy,
        status: 'active',
        createdAt: Date.now(),
        lastCheck: null,
        nextCheck: Date.now(),
        checkCount: 0,
        triggersCount: 0,
        errorsCount: 0,
        performance: {
          averageCheckTime: 0,
          totalCheckTime: 0,
          cacheHits: 0,
          cacheMisses: 0
        }
      };

      this.monitoringJobs.set(jobId, job);
      
      // Schedule first check
      this.scheduleNextCheck(job);
      
      console.log(`Started monitoring for alert ${alert._id} with strategy ${strategy.type}`);
      return job;
    } catch (error) {
      console.error('Error starting monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring for an alert
   * @param {string} alertId - Alert ID to stop monitoring
   * @returns {boolean} Success status
   */
  async stopMonitoring(alertId) {
    try {
      // Find and remove monitoring job
      let removedJob = null;
      for (const [jobId, job] of this.monitoringJobs.entries()) {
        if (job.alertId === alertId) {
          removedJob = job;
          this.monitoringJobs.delete(jobId);
          break;
        }
      }

      if (removedJob) {
        // Clear any pending timeout
        if (removedJob.timeoutId) {
          clearTimeout(removedJob.timeoutId);
        }

        // Log final metrics
        this.logJobCompletion(removedJob);
        
        console.log(`Stopped monitoring for alert ${alertId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      return false;
    }
  }

  /**
   * Determine optimal monitoring strategy for an alert
   * @param {Object} alert - Alert object
   * @returns {Object} Monitoring strategy
   */
  determineMonitoringStrategy(alert) {
    const priority = alert.alertConditions?.priority || 'normal';
    const conditions = Object.keys(alert.alertConditions || {});
    const hasTimeSensitiveConditions = conditions.some(c => 
      ['percentage_drop', 'specific_price'].includes(c)
    );

    // Base strategy on priority and conditions
    let strategy = {
      type: 'standard',
      interval: this.options.intervals[priority] || this.options.intervals.normal,
      batchGroup: 'normal',
      cacheLevel: 'standard'
    };

    // Optimize for high-priority or time-sensitive alerts
    if (priority === 'critical' || priority === 'urgent' || hasTimeSensitiveConditions) {
      strategy.type = 'real-time';
      strategy.interval = this.options.intervals.critical;
      strategy.batchGroup = 'priority';
      strategy.cacheLevel = 'minimal';
    }

    // Optimize for complex conditions (requires more data)
    if (conditions.length > 2 || conditions.includes('trend')) {
      strategy.type = 'enhanced';
      strategy.cacheLevel = 'enhanced';
      strategy.batchGroup = 'complex';
    }

    // Apply adaptive intervals if enabled
    if (this.options.performance.enableAdaptiveIntervals) {
      strategy.interval = this.calculateAdaptiveInterval(alert, strategy);
    }

    return strategy;
  }

  /**
   * Calculate adaptive monitoring interval based on alert history
   * @param {Object} alert - Alert object
   * @param {Object} baseStrategy - Base strategy
   * @returns {number} Adaptive interval in milliseconds
   */
  calculateAdaptiveInterval(alert, baseStrategy) {
    // Get alert history to determine optimal interval
    const daysSinceCreation = (Date.now() - new Date(alert.createdAt)) / (1000 * 60 * 60 * 24);
    const triggerHistory = alert.triggerHistory || [];
    const recentTriggers = triggerHistory.filter(t => 
      (Date.now() - new Date(t.timestamp)) / (1000 * 60 * 60 * 24) <= 7
    );

    let adaptiveInterval = baseStrategy.interval;

    // Reduce interval if recently triggered (high activity period)
    if (recentTriggers.length > 0) {
      adaptiveInterval *= 0.5; // Check twice as often
    }

    // Increase interval if no triggers for a while (stable period)
    if (daysSinceCreation > 14 && triggerHistory.length === 0) {
      adaptiveInterval *= 2; // Check half as often
    }

    // Adjust based on departure date
    const departureDate = new Date(alert.searchCriteria?.departureDate);
    const daysToDeparture = (departureDate - Date.now()) / (1000 * 60 * 60 * 24);
    
    if (daysToDeparture < 7) {
      adaptiveInterval *= 0.25; // Check very frequently close to departure
    } else if (daysToDeparture > 60) {
      adaptiveInterval *= 1.5; // Check less frequently for far future
    }

    // Ensure interval stays within reasonable bounds
    const minInterval = 30 * 1000; // 30 seconds minimum
    const maxInterval = 60 * 60 * 1000; // 1 hour maximum
    
    return Math.max(minInterval, Math.min(maxInterval, adaptiveInterval));
  }

  /**
   * Schedule next price check for a monitoring job
   * @param {Object} job - Monitoring job
   */
  scheduleNextCheck(job) {
    // Clear any existing timeout
    if (job.timeoutId) {
      clearTimeout(job.timeoutId);
    }

    // Calculate next check time
    const now = Date.now();
    const nextCheck = Math.max(now, job.nextCheck || now);
    const delay = nextCheck - now;

    // Schedule the check
    job.timeoutId = setTimeout(async () => {
      await this.executePriceCheck(job);
    }, delay);

    job.nextCheck = nextCheck + job.strategy.interval;
  }

  /**
   * Execute price check for a monitoring job
   * @param {Object} job - Monitoring job
   */
  async executePriceCheck(job) {
    const startTime = Date.now();
    
    try {
      job.checkCount++;
      job.lastCheck = startTime;

      // Check cache first
      const cacheKey = this.generateCacheKey(job.alert);
      let priceData = this.getFromCache(cacheKey);
      
      if (priceData) {
        job.performance.cacheHits++;
      } else {
        job.performance.cacheMisses++;
        
        // Fetch fresh price data
        priceData = await this.fetchPriceData(job.alert);
        
        // Cache the result
        this.setInCache(cacheKey, priceData);
      }

      // Check alert conditions
      const checkResult = await this.priceTrackingEngine.checkAlertConditions(
        job.alert, 
        priceData
      );

      // Handle triggered alerts
      if (checkResult.triggered) {
        job.triggersCount++;
        await this.handleTriggeredAlert(job.alert, checkResult);
      }

      // Update performance metrics
      const checkTime = Date.now() - startTime;
      job.performance.totalCheckTime += checkTime;
      job.performance.averageCheckTime = job.performance.totalCheckTime / job.checkCount;

      // Schedule next check
      this.scheduleNextCheck(job);

      // Update job status if needed
      if (checkResult.shouldPause) {
        job.status = 'paused';
      } else if (checkResult.shouldStop) {
        await this.stopMonitoring(job.alertId);
      }

    } catch (error) {
      job.errorsCount++;
      console.error(`Error in price check for job ${job.id}:`, error);
      
      // Implement exponential backoff for errors
      const backoffInterval = job.strategy.interval * Math.pow(2, Math.min(job.errorsCount, 5));
      job.nextCheck = Date.now() + backoffInterval;
      this.scheduleNextCheck(job);
    }
  }

  /**
   * Fetch price data with optimizations
   * @param {Object} alert - Alert object
   * @returns {Object} Price data
   */
  async fetchPriceData(alert) {
    try {
      // Use batch fetching if enabled
      if (this.options.performance.enableBatchOptimization) {
        return await this.batchFetchPriceData(alert);
      }

      // Standard fetch
      return await this.priceTrackingEngine.getCurrentPriceData(alert);
    } catch (error) {
      console.error('Error fetching price data:', error);
      throw error;
    }
  }

  /**
   * Batch fetch price data for multiple alerts
   * @param {Object} alert - Alert object
   * @returns {Object} Price data
   */
  async batchFetchPriceData(alert) {
    try {
      // Find similar alerts for batching
      const similarAlerts = this.findSimilarAlerts(alert);
      
      if (similarAlerts.length === 0) {
        return await this.priceTrackingEngine.getCurrentPriceData(alert);
      }

      // Process batch
      const batch = [alert, ...similarAlerts].slice(0, this.options.batch.maxSize);
      const batchStartTime = Date.now();
      
      // Fetch prices for batch
      const batchResults = await this.priceTrackingEngine.batchGetCurrentPrices(batch);
      
      // Update performance metrics
      const batchTime = Date.now() - batchStartTime;
      this.performanceMetrics.batchProcessingTime = 
        (this.performanceMetrics.batchProcessingTime + batchTime) / 2;
      
      // Return result for this specific alert
      return batchResults.find(r => r.alertId === alert._id) || null;
    } catch (error) {
      console.error('Error in batch fetch:', error);
      throw error;
    }
  }

  /**
   * Find similar alerts for batch processing
   * @param {Object} alert - Alert to find matches for
   * @returns {Array} Similar alerts
   */
  findSimilarAlerts(alert) {
    const similar = [];
    const routeKey = this.generateRouteKey(alert);
    
    for (const job of this.monitoringJobs.values()) {
      if (job.alertId === alert._id || job.status !== 'active') {
        continue;
      }

      const jobRouteKey = this.generateRouteKey(job.alert);
      
      // Check if routes match and can be batched
      if (routeKey === jobRouteKey && 
          Math.abs(Date.now() - job.nextCheck) < 5000) { // Within 5 seconds
        similar.push(job.alert);
      }
    }

    return similar;
  }

  /**
   * Handle triggered alert
   * @param {Object} alert - Triggered alert
   * @param {Object} checkResult - Check result details
   */
  async handleTriggeredAlert(alert, checkResult) {
    try {
      // Update alert status
      await updateOneDoc("PriceAlert", alert._id, {
        $set: {
          status: 'triggered',
          triggeredAt: new Date(),
          lastTrigger: {
            condition: checkResult.triggeredCondition,
            value: checkResult.triggeredValue,
            priceAtTrigger: checkResult.currentPrice,
            timestamp: new Date()
          }
        }
      });

      // Send notifications
      await this.priceTrackingEngine.sendTriggeredNotification(alert, checkResult);
      
      // Update analytics
      await this.analyticsService.recordAlertTrigger(alert._id, checkResult);
      
      console.log(`Alert ${alert._id} triggered: ${checkResult.triggeredCondition}`);
    } catch (error) {
      console.error('Error handling triggered alert:', error);
    }
  }

  /**
   * Start background processes
   */
  startBackgroundProcesses() {
    // Cache cleanup process
    setInterval(() => {
      this.cleanupCache();
    }, this.options.cache.cleanupInterval);

    // Performance monitoring process
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 60 * 1000); // Every minute

    // Batch optimization process
    if (this.options.performance.enableSmartScheduling) {
      setInterval(() => {
        this.optimizeMonitoringSchedule();
      }, 5 * 60 * 1000); // Every 5 minutes
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.options.cache.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics() {
    const totalJobs = this.monitoringJobs.size;
    let totalCheckTime = 0;
    let totalCacheHits = 0;
    let totalCacheMisses = 0;

    for (const job of this.monitoringJobs.values()) {
      totalCheckTime += job.performance.totalCheckTime;
      totalCacheHits += job.performance.cacheHits;
      totalCacheMisses += job.performance.cacheMisses;
    }

    const totalChecks = totalCacheHits + totalCacheMisses;
    
    this.performanceMetrics = {
      totalChecks,
      averageCheckTime: totalChecks > 0 ? totalCheckTime / totalChecks : 0,
      cacheHitRate: totalChecks > 0 ? (totalCacheHits / totalChecks) * 100 : 0,
      batchProcessingTime: this.performanceMetrics.batchProcessingTime,
      activeJobs: totalJobs
    };
  }

  /**
   * Optimize monitoring schedule based on performance
   */
  optimizeMonitoringSchedule() {
    const jobs = Array.from(this.monitoringJobs.values());
    
    // Group jobs by batch group
    const batchGroups = {};
    jobs.forEach(job => {
      const group = job.strategy.batchGroup || 'normal';
      if (!batchGroups[group]) {
        batchGroups[group] = [];
      }
      batchGroups[group].push(job);
    });

    // Optimize each batch group
    Object.entries(batchGroups).forEach(([group, groupJobs]) => {
      this.optimizeBatchGroup(group, groupJobs);
    });
  }

  /**
   * Optimize a specific batch group
   * @param {string} group - Batch group name
   * @param {Array} jobs - Jobs in the group
   */
  optimizeBatchGroup(group, jobs) {
    // Sort jobs by next check time
    jobs.sort((a, b) => a.nextCheck - b.nextCheck);
    
    // Stagger checks to avoid spikes
    const staggerInterval = 1000; // 1 second between jobs
    let baseTime = jobs[0]?.nextCheck || Date.now();
    
    jobs.forEach((job, index) => {
      job.nextCheck = baseTime + (index * staggerInterval);
      this.scheduleNextCheck(job);
    });
  }

  /**
   * Log job completion metrics
   * @param {Object} job - Completed job
   */
  logJobCompletion(job) {
    const duration = Date.now() - job.createdAt;
    const successRate = job.checkCount > 0 ? 
      ((job.checkCount - job.errorsCount) / job.checkCount) * 100 : 0;
    
    console.log(`Job ${job.id} completed:`, {
      duration: `${(duration / 1000 / 60).toFixed(1)} minutes`,
      checks: job.checkCount,
      triggers: job.triggersCount,
      errors: job.errorsCount,
      successRate: `${successRate.toFixed(1)}%`,
      avgCheckTime: `${job.performance.averageCheckTime.toFixed(1)}ms`
    });
  }

  /**
   * Generate unique job ID
   * @param {Object} alert - Alert object
   * @returns {string} Job ID
   */
  generateJobId(alert) {
    return `${alert._id}-${Date.now()}`;
  }

  /**
   * Generate cache key
   * @param {Object} alert - Alert object
   * @returns {string} Cache key
   */
  generateCacheKey(alert) {
    const route = alert.searchCriteria?.route || {};
    return `${route.origin?.airportCode}-${route.destination?.airportCode}-${alert.searchCriteria?.departureDate}-${alert.searchCriteria?.cabinClass}`;
  }

  /**
   * Generate route key
   * @param {Object} alert - Alert object
   * @returns {string} Route key
   */
  generateRouteKey(alert) {
    const route = alert.searchCriteria?.route || {};
    return `${route.origin?.airportCode}-${route.destination?.airportCode}-${alert.searchCriteria?.cabinClass}`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  getFromCache(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.options.cache.ttl) {
      return entry.data;
    }
    return null;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  setInCache(key, value) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.options.cache.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  /**
   * Get current performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.cache.size,
      activeJobs: this.monitoringJobs.size,
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  /**
   * Get monitoring status for all alerts
   * @returns {Object} Monitoring status
   */
  getMonitoringStatus() {
    const jobs = Array.from(this.monitoringJobs.values());
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'active').length,
      pausedJobs: jobs.filter(j => j.status === 'paused').length,
      jobsByStrategy: jobs.reduce((acc, job) => {
        const strategy = job.strategy.type;
        acc[strategy] = (acc[strategy] || 0) + 1;
        return acc;
      }, {}),
      averageChecksPerJob: jobs.length > 0 ? 
        jobs.reduce((sum, job) => sum + job.checkCount, 0) / jobs.length : 0,
      totalTriggers: jobs.reduce((sum, job) => sum + job.triggersCount, 0),
      totalErrors: jobs.reduce((sum, job) => sum + job.errorsCount, 0)
    };
  }
}

// Singleton instance
let realTimePriceMonitoringInstance = null;

/**
 * Get or create real-time price monitoring instance
 * @param {Object} options - Configuration options
 * @returns {RealTimePriceMonitoring} Monitoring instance
 */
export function getRealTimePriceMonitoring(options) {
  if (!realTimePriceMonitoringInstance) {
    realTimePriceMonitoringInstance = new RealTimePriceMonitoring(options);
  }
  return realTimePriceMonitoringInstance;
}

/**
 * Start monitoring for alert (convenience function)
 * @param {Object} alert - Alert to monitor
 */
export async function startAlertMonitoring(alert) {
  const monitoring = getRealTimePriceMonitoring();
  return await monitoring.startMonitoring(alert);
}

/**
 * Stop monitoring for alert (convenience function)
 * @param {string} alertId - Alert ID to stop
 */
export async function stopAlertMonitoring(alertId) {
  const monitoring = getRealTimePriceMonitoring();
  return await monitoring.stopMonitoring(alertId);
}

/**
 * Get monitoring status (convenience function)
 */
export function getMonitoringStatus() {
  const monitoring = getRealTimePriceMonitoring();
  return monitoring.getMonitoringStatus();
}

/**
 * Get performance metrics (convenience function)
 */
export function getMonitoringPerformance() {
  const monitoring = getRealTimePriceMonitoring();
  return monitoring.getPerformanceMetrics();
}