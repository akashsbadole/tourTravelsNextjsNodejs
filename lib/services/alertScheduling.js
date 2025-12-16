import { getManyDocs, updateOneDoc, createDoc } from "@/lib/db/operations";
import { getNotificationService } from "./notifications";
import { getAlertAnalyticsService } from "./alertAnalytics";

/**
 * Alert Scheduling and Batching Service
 * Manages intelligent scheduling and batch processing of price alerts
 */
export class AlertSchedulingService {
  constructor(options = {}) {
    this.options = {
      // Batch processing settings
      batch: {
        maxSize: 100,                     // Maximum alerts per batch
        maxProcessingTime: 5 * 60 * 1000, // 5 minutes max processing time
        concurrency: 5,                      // Concurrent batches
        cooldownPeriod: 30 * 1000           // 30 seconds between batches
      },
      
      // Scheduling settings
      scheduling: {
        enableSmartScheduling: true,       // Intelligently schedule based on patterns
        enablePriorityQueue: true,        // Process high priority first
        enableLoadBalancing: true,        // Distribute load across time
        maxQueueSize: 10000,            // Maximum alerts in queue
        retryAttempts: 3,                  // Max retry attempts
        retryBackoffMultiplier: 2,         // Exponential backoff
      },
      
      // Performance settings
      performance: {
        enableMetrics: true,               // Track performance metrics
        enableAdaptiveProcessing: true,    // Adjust processing based on load
        enablePredictiveScheduling: true,  // Schedule based on predictions
        optimizationInterval: 5 * 60 * 1000, // Re-optimize every 5 minutes
      },
      
      ...options
    };
    
    this.notificationService = getNotificationService();
    this.analyticsService = getAlertAnalyticsService();
    
    // Processing queues
    this.queues = {
      immediate: [],      // Immediate processing
      high: [],           // High priority
      normal: [],         // Normal priority
      low: [],            // Low priority
      batch: []           // Batch processing
    };
    
    // Active batches
    this.activeBatches = new Map();
    
    // Scheduling state
    this.schedulerState = {
      isRunning: false,
      lastOptimization: Date.now(),
      currentLoad: 0,
      averageProcessingTime: 0,
      queueSizes: {
        immediate: 0,
        high: 0,
        normal: 0,
        low: 0,
        batch: 0
      }
    };
    
    // Performance metrics
    this.metrics = {
      totalProcessed: 0,
      totalBatches: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      successRate: 0,
      errorRate: 0,
      queueUtilization: 0,
      throughput: 0
    };
    
    // Start background processes
    this.startBackgroundProcesses();
  }

  /**
   * Schedule an alert for processing
   * @param {Object} alert - Alert to schedule
   * @param {Object} options - Scheduling options
   * @returns {Object} Scheduling result
   */
  async scheduleAlert(alert, options = {}) {
    try {
      const priority = this.determinePriority(alert, options);
      const queue = this.getQueueForPriority(priority);
      
      // Create scheduling job
      const job = {
        id: this.generateJobId(),
        alertId: alert._id,
        alert,
        priority,
        options,
        status: 'queued',
        queuedAt: Date.now(),
        scheduledAt: options.scheduledAt || Date.now(),
        retryCount: 0,
        maxRetries: this.options.scheduling.retryAttempts
      };

      // Add to appropriate queue
      queue.push(job);
      this.updateQueueSizes();
      
      // Trigger processing if needed
      this.triggerProcessing();
      
      console.log(`Scheduled alert ${alert._id} with priority ${priority}`);
      return {
        success: true,
        jobId: job.id,
        priority,
        queuePosition: queue.length,
        estimatedProcessingTime: this.estimateProcessingTime(alert, priority)
      };
    } catch (error) {
      console.error('Error scheduling alert:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Schedule multiple alerts for batch processing
   * @param {Array} alerts - Alerts to schedule
   * @param {Object} options - Batch options
   * @returns {Object} Batch scheduling result
   */
  async scheduleBatch(alerts, options = {}) {
    try {
      const batchSize = Math.min(alerts.length, this.options.batch.maxSize);
      const batchAlerts = alerts.slice(0, batchSize);
      
      // Create batch job
      const batchJob = {
        id: this.generateJobId(),
        type: 'batch',
        alerts: batchAlerts,
        options,
        status: 'queued',
        queuedAt: Date.now(),
        scheduledAt: options.scheduledAt || Date.now(),
        retryCount: 0,
        maxRetries: this.options.scheduling.retryAttempts
      };

      // Add to batch queue
      this.queues.batch.push(batchJob);
      this.updateQueueSizes();
      
      // Trigger batch processing
      this.triggerBatchProcessing();
      
      console.log(`Scheduled batch of ${batchAlerts.length} alerts`);
      return {
        success: true,
        batchId: batchJob.id,
        alertCount: batchAlerts.length,
        remainingAlerts: alerts.length - batchSize,
        estimatedProcessingTime: this.estimateBatchProcessingTime(batchAlerts)
      };
    } catch (error) {
      console.error('Error scheduling batch:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancel a scheduled alert
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} Success status
   */
  async cancelScheduledAlert(jobId) {
    try {
      // Find and remove job from all queues
      let removedJob = null;
      
      for (const [queueName, queue] of Object.entries(this.queues)) {
        const index = queue.findIndex(job => job.id === jobId);
        if (index !== -1) {
          removedJob = queue.splice(index, 1)[0];
          break;
        }
      }

      if (removedJob) {
        // Update job status
        removedJob.status = 'cancelled';
        removedJob.cancelledAt = Date.now();
        
        // Update analytics
        await this.analyticsService.recordAlertCancellation(removedJob);
        
        console.log(`Cancelled scheduled alert ${jobId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error cancelling scheduled alert:', error);
      return false;
    }
  }

  /**
   * Determine processing priority for an alert
   * @param {Object} alert - Alert object
   * @param {Object} options - Scheduling options
   * @returns {string} Priority level
   */
  determinePriority(alert, options) {
    // Use explicit priority if provided
    if (options.priority) {
      return options.priority;
    }

    // Determine based on alert conditions
    const conditions = alert.alertConditions || {};
    const hasTimeSensitive = Object.keys(conditions).some(c => 
      ['percentage_drop', 'specific_price'].includes(c)
    );

    const hasComplexConditions = Object.keys(conditions).length > 2;
    const isUrgent = conditions.priority === 'urgent' || conditions.priority === 'critical';

    // Calculate priority score
    let priorityScore = 5; // Default to normal

    if (isUrgent) {
      priorityScore = 10; // High priority
    } else if (hasTimeSensitive) {
      priorityScore = 7; // Elevated priority
    } else if (hasComplexConditions) {
      priorityScore = 6; // Slightly elevated
    } else if (conditions.priority === 'low') {
      priorityScore = 3; // Low priority
    }

    // Adjust based on user preferences
    if (options.immediate) {
      priorityScore = 10; // Force immediate
    }

    // Convert score to priority level
    if (priorityScore >= 9) return 'immediate';
    if (priorityScore >= 7) return 'high';
    if (priorityScore >= 6) return 'normal';
    return 'low';
  }

  /**
   * Get appropriate queue for priority level
   * @param {string} priority - Priority level
   * @returns {Array} Queue
   */
  getQueueForPriority(priority) {
    switch (priority) {
      case 'immediate':
        return this.queues.immediate;
      case 'high':
        return this.queues.high;
      case 'normal':
        return this.queues.normal;
      case 'low':
        return this.queues.low;
      default:
        return this.queues.normal;
    }
  }

  /**
   * Trigger alert processing
   */
  triggerProcessing() {
    if (this.schedulerState.isRunning) {
      return;
    }

    // Process immediate queue first
    this.processImmediateQueue();
    
    // Process priority queues
    this.processPriorityQueues();
    
    // Process batch queue
    this.processBatchQueue();
  }

  /**
   * Process immediate queue
   */
  async processImmediateQueue() {
    if (this.queues.immediate.length === 0) {
      return;
    }

    const job = this.queues.immediate.shift();
    this.updateQueueSizes();

    try {
      await this.processAlertJob(job);
    } catch (error) {
      console.error('Error processing immediate job:', error);
      await this.handleJobError(job, error);
    }
  }

  /**
   * Process priority queues
   */
  async processPriorityQueues() {
    const queues = [
      { name: 'high', queue: this.queues.high },
      { name: 'normal', queue: this.queues.normal },
      { name: 'low', queue: this.queues.low }
    ];

    for (const { name, queue } of queues) {
      if (queue.length === 0) {
        continue;
      }

      // Process jobs based on available capacity
      const capacity = this.getProcessingCapacity();
      const jobsToProcess = queue.splice(0, capacity);
      this.updateQueueSizes();

      // Process jobs concurrently
      const promises = jobsToProcess.map(job => 
        this.processAlertJob(job).catch(error => this.handleJobError(job, error))
      );

      await Promise.allSettled(promises);
    }
  }

  /**
   * Process batch queue
   */
  async processBatchQueue() {
    if (this.queues.batch.length === 0) {
      return;
    }

    const batchJob = this.queues.batch.shift();
    this.updateQueueSizes();

    try {
      await this.processBatchJob(batchJob);
    } catch (error) {
      console.error('Error processing batch job:', error);
      await this.handleJobError(batchJob, error);
    }
  }

  /**
   * Process individual alert job
   * @param {Object} job - Alert job
   */
  async processAlertJob(job) {
    const startTime = Date.now();
    
    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = startTime;

      // Check alert conditions
      const priceData = await this.getPriceData(job.alert);
      const checkResult = await this.checkAlertConditions(job.alert, priceData);

      // Handle triggered alerts
      if (checkResult.triggered) {
        await this.handleTriggeredAlert(job.alert, checkResult);
        job.status = 'completed';
        job.result = 'triggered';
      } else {
        job.status = 'completed';
        job.result = 'no_trigger';
      }

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, true);
      
      // Record analytics
      await this.analyticsService.recordAlertProcessing(job, checkResult, processingTime);
      
      return checkResult;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process batch job
   * @param {Object} batchJob - Batch job
   */
  async processBatchJob(batchJob) {
    const startTime = Date.now();
    
    try {
      // Update job status
      batchJob.status = 'processing';
      batchJob.startedAt = startTime;

      // Track active batch
      this.activeBatches.set(batchJob.id, {
        ...batchJob,
        startTime,
        processedCount: 0,
        errorCount: 0
      });

      // Process alerts in batch
      const results = [];
      for (const alert of batchJob.alerts) {
        try {
          const priceData = await this.getPriceData(alert);
          const checkResult = await this.checkAlertConditions(alert, priceData);
          results.push({ alert, checkResult });
          
          if (checkResult.triggered) {
            await this.handleTriggeredAlert(alert, checkResult);
          }

          // Update batch progress
          const batch = this.activeBatches.get(batchJob.id);
          batch.processedCount++;
        } catch (error) {
          console.error(`Error processing alert ${alert._id} in batch:`, error);
          results.push({ alert, error });
          
          // Update batch error count
          const batch = this.activeBatches.get(batchJob.id);
          batch.errorCount++;
        }
      }

      // Complete batch
      const processingTime = Date.now() - startTime;
      this.activeBatches.delete(batchJob.id);
      
      batchJob.status = 'completed';
      batchJob.completedAt = Date.now();
      batchJob.results = results;
      batchJob.processingTime = processingTime;

      // Update metrics
      this.updateMetrics(processingTime, true, batchJob.alerts.length);
      
      // Record batch analytics
      await this.analyticsService.recordBatchProcessing(batchJob, results, processingTime);
      
      return results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle triggered alert
   * @param {Object} alert - Triggered alert
   * @param {Object} checkResult - Check result
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
      await this.notificationService.sendTriggeredNotification(alert, checkResult);
      
      console.log(`Alert ${alert._id} triggered: ${checkResult.triggeredCondition}`);
    } catch (error) {
      console.error('Error handling triggered alert:', error);
    }
  }

  /**
   * Handle job error
   * @param {Object} job - Failed job
   * @param {Error} error - Error object
   */
  async handleJobError(job, error) {
    try {
      job.retryCount++;
      job.lastError = error.message;
      job.lastErrorAt = Date.now();

      // Determine if should retry
      const shouldRetry = job.retryCount < job.maxRetries;
      
      if (shouldRetry) {
        // Calculate backoff delay
        const backoffDelay = this.options.scheduling.retryBackoffMultiplier * 
                           Math.pow(2, job.retryCount - 1) * 1000;
        
        // Schedule retry
        job.status = 'retrying';
        job.scheduledAt = Date.now() + backoffDelay;
        
        // Add back to appropriate queue
        const queue = this.getQueueForPriority(job.priority);
        queue.push(job);
        
        console.log(`Retrying job ${job.id} in ${backoffDelay}ms (attempt ${job.retryCount})`);
      } else {
        // Mark as failed
        job.status = 'failed';
        job.failedAt = Date.now();
        
        // Record failure analytics
        await this.analyticsService.recordAlertFailure(job, error);
        
        console.error(`Job ${job.id} failed after ${job.retryCount} attempts:`, error);
      }
      
      // Update metrics
      this.updateMetrics(0, false);
    } catch (handlingError) {
      console.error('Error handling job error:', handlingError);
    }
  }

  /**
   * Get processing capacity based on current load
   * @returns {number} Processing capacity
   */
  getProcessingCapacity() {
    const activeBatches = this.activeBatches.size;
    const maxConcurrency = this.options.batch.concurrency;
    
    // Adjust capacity based on load
    let capacity = Math.floor(maxConcurrency / Math.max(1, activeBatches));
    
    // Consider average processing time
    if (this.metrics.averageProcessingTime > 0) {
      const processingTimeRatio = this.metrics.averageProcessingTime / (60 * 1000); // Convert to minutes
      if (processingTimeRatio > 2) { // If average processing time > 2 minutes
        capacity = Math.max(1, Math.floor(capacity * 0.5)); // Reduce capacity
      }
    }
    
    return Math.max(1, capacity);
  }

  /**
   * Estimate processing time for an alert
   * @param {Object} alert - Alert object
   * @param {string} priority - Priority level
   * @returns {number} Estimated time in milliseconds
   */
  estimateProcessingTime(alert, priority) {
    let baseTime = 1000; // 1 second base
    
    // Adjust based on priority
    switch (priority) {
      case 'immediate':
        baseTime = 500; // 0.5 seconds
        break;
      case 'high':
        baseTime = 750; // 0.75 seconds
        break;
      case 'normal':
        baseTime = 1000; // 1 second
        break;
      case 'low':
        baseTime = 1500; // 1.5 seconds
        break;
    }

    // Adjust based on alert complexity
    const conditions = Object.keys(alert.alertConditions || {});
    const complexityMultiplier = 1 + (conditions.length * 0.1);
    
    return Math.floor(baseTime * complexityMultiplier);
  }

  /**
   * Estimate batch processing time
   * @param {Array} alerts - Alerts in batch
   * @returns {number} Estimated time in milliseconds
   */
  estimateBatchProcessingTime(alerts) {
    const baseTime = this.estimateProcessingTime({}, 'normal');
    const batchOverhead = 200; // 200ms batch overhead
    return baseTime * alerts.length + batchOverhead;
  }

  /**
   * Get price data for an alert
   * @param {Object} alert - Alert object
   * @returns {Object} Price data
   */
  async getPriceData(alert) {
    try {
      // This would integrate with the price tracking engine
      // For now, return mock data
      return {
        currentPrice: {
          amount: 250 + Math.random() * 100,
          currency: 'USD',
          recordedAt: new Date()
        },
        priceHistory: [],
        marketData: {}
      };
    } catch (error) {
      console.error('Error getting price data:', error);
      return null;
    }
  }

  /**
   * Check alert conditions
   * @param {Object} alert - Alert object
   * @param {Object} priceData - Price data
   * @returns {Object} Check result
   */
  async checkAlertConditions(alert, priceData) {
    try {
      // This would integrate with the actual condition checking logic
      // For now, return mock result
      const triggered = Math.random() > 0.7; // 30% chance of trigger
      
      return {
        triggered,
        triggeredCondition: triggered ? 'mock_condition' : null,
        triggeredValue: priceData?.currentPrice?.amount || 0,
        currentPrice: priceData?.currentPrice,
        reason: triggered ? 'Mock trigger for testing' : 'Conditions not met'
      };
    } catch (error) {
      console.error('Error checking alert conditions:', error);
      return {
        triggered: false,
        reason: 'Error checking conditions'
      };
    }
  }

  /**
   * Update queue sizes
   */
  updateQueueSizes() {
    this.schedulerState.queueSizes = {
      immediate: this.queues.immediate.length,
      high: this.queues.high.length,
      normal: this.queues.normal.length,
      low: this.queues.low.length,
      batch: this.queues.batch.length
    };
    
    // Update queue utilization
    const totalQueued = Object.values(this.schedulerState.queueSizes).reduce((sum, size) => sum + size, 0);
    this.schedulerState.queueUtilization = (totalQueued / this.options.scheduling.maxQueueSize) * 100;
  }

  /**
   * Update performance metrics
   * @param {number} processingTime - Processing time in milliseconds
   * @param {boolean} success - Whether processing was successful
   * @param {number} batchSize - Batch size (if applicable)
   */
  updateMetrics(processingTime, success, batchSize = 1) {
    this.metrics.totalProcessed += batchSize;
    
    if (success) {
      this.metrics.successRate = 
        ((this.metrics.totalProcessed - batchSize) * this.metrics.successRate + batchSize) / 
        this.metrics.totalProcessed;
    }
    
    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalProcessed - batchSize) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.totalProcessed;
    
    // Update throughput (alerts per second)
    this.metrics.throughput = this.metrics.totalProcessed / ((Date.now() - this.startTime) / 1000);
  }

  /**
   * Start background processes
   */
  startBackgroundProcesses() {
    // Optimization process
    setInterval(() => {
      this.optimizeScheduling();
    }, this.options.performance.optimizationInterval);

    // Metrics reporting
    if (this.options.performance.enableMetrics) {
      setInterval(() => {
        this.reportMetrics();
      }, 60 * 1000); // Every minute
    }
  }

  /**
   * Optimize scheduling based on performance
   */
  optimizeScheduling() {
    try {
      // Analyze current performance
      const { queueUtilization, averageProcessingTime } = this.schedulerState;
      
      // Adjust batch sizes based on load
      if (queueUtilization > 80) {
        // High load - increase batch size
        this.options.batch.maxSize = Math.min(200, this.options.batch.maxSize * 1.2);
      } else if (queueUtilization < 30) {
        // Low load - decrease batch size
        this.options.batch.maxSize = Math.max(50, this.options.batch.maxSize * 0.8);
      }
      
      // Adjust concurrency based on processing time
      if (averageProcessingTime > 3000) { // > 3 seconds
        this.options.batch.concurrency = Math.max(2, this.options.batch.concurrency - 1);
      } else if (averageProcessingTime < 500) { // < 0.5 seconds
        this.options.batch.concurrency = Math.min(10, this.options.batch.concurrency + 1);
      }
      
      this.schedulerState.lastOptimization = Date.now();
      console.log('Optimized scheduling parameters');
    } catch (error) {
      console.error('Error optimizing scheduling:', error);
    }
  }

  /**
   * Report performance metrics
   */
  reportMetrics() {
    const metrics = {
      ...this.metrics,
      queueSizes: this.schedulerState.queueSizes,
      queueUtilization: this.schedulerState.queueUtilization,
      activeBatches: this.activeBatches.size,
      uptime: Date.now() - this.startTime,
      lastOptimization: this.schedulerState.lastOptimization
    };
    
    console.log('Alert Scheduling Metrics:', metrics);
    return metrics;
  }

  /**
   * Generate unique job ID
   * @returns {string} Job ID
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get scheduling status
   * @returns {Object} Current status
   */
  getSchedulingStatus() {
    return {
      state: this.schedulerState,
      metrics: this.metrics,
      activeBatches: Array.from(this.activeBatches.values()),
      queueSizes: this.schedulerState.queueSizes
    };
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  getQueueStats() {
    return {
      immediate: {
        size: this.queues.immediate.length,
        oldestJob: this.queues.immediate[0]?.queuedAt,
        averageWaitTime: this.calculateAverageWaitTime(this.queues.immediate)
      },
      high: {
        size: this.queues.high.length,
        oldestJob: this.queues.high[0]?.queuedAt,
        averageWaitTime: this.calculateAverageWaitTime(this.queues.high)
      },
      normal: {
        size: this.queues.normal.length,
        oldestJob: this.queues.normal[0]?.queuedAt,
        averageWaitTime: this.calculateAverageWaitTime(this.queues.normal)
      },
      low: {
        size: this.queues.low.length,
        oldestJob: this.queues.low[0]?.queuedAt,
        averageWaitTime: this.calculateAverageWaitTime(this.queues.low)
      },
      batch: {
        size: this.queues.batch.length,
        oldestJob: this.queues.batch[0]?.queuedAt,
        averageWaitTime: this.calculateAverageWaitTime(this.queues.batch)
      }
    };
  }

  /**
   * Calculate average wait time for a queue
   * @param {Array} queue - Queue array
   * @returns {number} Average wait time in milliseconds
   */
  calculateAverageWaitTime(queue) {
    if (queue.length === 0) return 0;
    
    const now = Date.now();
    const totalWaitTime = queue.reduce((sum, job) => {
      return sum + (now - job.queuedAt);
    }, 0);
    
    return totalWaitTime / queue.length;
  }
}

// Singleton instance
let alertSchedulingServiceInstance = null;

/**
 * Get or create alert scheduling service instance
 * @param {Object} options - Configuration options
 * @returns {AlertSchedulingService} Scheduling instance
 */
export function getAlertSchedulingService(options) {
  if (!alertSchedulingServiceInstance) {
    alertSchedulingServiceInstance = new AlertSchedulingService(options);
  }
  return alertSchedulingServiceInstance;
}

/**
 * Schedule alert for processing (convenience function)
 * @param {Object} alert - Alert to schedule
 * @param {Object} options - Scheduling options
 */
export async function scheduleAlert(alert, options) {
  const scheduler = getAlertSchedulingService();
  return await scheduler.scheduleAlert(alert, options);
}

/**
 * Schedule batch of alerts (convenience function)
 * @param {Array} alerts - Alerts to schedule
 * @param {Object} options - Batch options
 */
export async function scheduleBatch(alerts, options) {
  const scheduler = getAlertSchedulingService();
  return await scheduler.scheduleBatch(alerts, options);
}

/**
 * Cancel scheduled alert (convenience function)
 * @param {string} jobId - Job ID to cancel
 */
export async function cancelScheduledAlert(jobId) {
  const scheduler = getAlertSchedulingService();
  return await scheduler.cancelScheduledAlert(jobId);
}

/**
 * Get scheduling status (convenience function)
 */
export function getSchedulingStatus() {
  const scheduler = getAlertSchedulingService();
  return scheduler.getSchedulingStatus();
}

/**
 * Get queue statistics (convenience function)
 */
export function getQueueStats() {
  const scheduler = getAlertSchedulingService();
  return scheduler.getQueueStats();
}