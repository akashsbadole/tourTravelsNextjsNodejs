import { getManyDocs, updateOneDoc, createDoc } from "@/lib/db/operations";
import { getNotificationService } from "./notifications";
import { getAlertAnalyticsService } from "./alertAnalytics";

/**
 * Notification Delivery Tracking Service
 * Tracks and analyzes notification delivery across all channels
 */
export class NotificationDeliveryTracking {
  constructor(options = {}) {
    this.options = {
      // Tracking settings
      enableRealTimeTracking: true,       // Track delivery in real-time
      enableRetryLogic: true,            // Automatically retry failed deliveries
      enableDeliveryOptimization: true,   // Optimize delivery based on patterns
      maxRetryAttempts: 3,              // Maximum retry attempts
      retryBackoffMultiplier: 2,           // Exponential backoff for retries
      
      // Performance settings
      enableMetrics: true,               // Track delivery metrics
      enableAITesting: false,            // A/B test delivery strategies
      enablePredictiveScheduling: true,   // Schedule based on user patterns
      
      // Channel-specific settings
      channels: {
        email: {
          provider: 'mailjet',           // Email service provider
          batchLimit: 100,               // Max emails per batch
          rateLimitPerSecond: 10,         // Rate limit
          deliveryTimeout: 30 * 1000      // 30 seconds timeout
        },
        push: {
          provider: 'fcm',               // Firebase Cloud Messaging
          batchLimit: 500,               // Max push notifications per batch
          rateLimitPerSecond: 50,         // Rate limit
          deliveryTimeout: 10 * 1000       // 10 seconds timeout
        },
        sms: {
          provider: 'twilio',             // SMS service provider
          batchLimit: 100,               // Max SMS per batch
          rateLimitPerSecond: 5,          // Rate limit
          deliveryTimeout: 15 * 1000       // 15 seconds timeout
        },
        webhook: {
          provider: 'custom',             // Custom webhook provider
          batchLimit: 50,                // Max webhooks per batch
          rateLimitPerSecond: 2,           // Rate limit
          deliveryTimeout: 20 * 1000       // 20 seconds timeout
        }
      },
      ...options
    };
    
    this.notificationService = getNotificationService();
    this.analyticsService = getAlertAnalyticsService();
    
    // Delivery tracking state
    this.activeDeliveries = new Map();
    this.deliveryQueue = [];
    this.retryQueue = [];
    
    // Performance metrics
    this.metrics = {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      retriedDeliveries: 0,
      averageDeliveryTime: 0,
      channelPerformance: {
        email: { sent: 0, delivered: 0, failed: 0, averageTime: 0 },
        push: { sent: 0, delivered: 0, failed: 0, averageTime: 0 },
        sms: { sent: 0, delivered: 0, failed: 0, averageTime: 0 },
        webhook: { sent: 0, delivered: 0, failed: 0, averageTime: 0 }
      },
      deliveryPatterns: {
        bestDeliveryTimes: {},
        worstDeliveryTimes: {},
        optimalSendTimes: {},
        channelPreferences: {}
      }
    };
    
    // Start background processes
    this.startTime = Date.now();
    this.startBackgroundProcesses();
  }

  /**
   * Track notification delivery
   * @param {Object} notification - Notification to track
   * @param {Array} channels - Delivery channels
   * @returns {Object} Tracking result
   */
  async trackDelivery(notification, channels) {
    try {
      const trackingId = this.generateTrackingId();
      
      // Create delivery tracking record
      const tracking = {
        trackingId,
        notificationId: notification._id || notification.notificationId,
        alertId: notification.alertId,
        userId: notification.userId,
        type: notification.type,
        priority: notification.priority,
        channels: channels.map(channel => ({
          channel,
          status: 'pending',
          attempts: 0,
          sentAt: null,
          deliveredAt: null,
          failedAt: null,
          error: null,
          responseTime: null,
          provider: this.options.channels[channel]?.provider
        })),
        createdAt: Date.now(),
        scheduledAt: notification.scheduledAt || Date.now(),
        content: notification.content,
        recipient: notification.recipient
      };

      // Store tracking record
      await this.createTrackingRecord(tracking);
      
      // Start delivery process
      const deliveryResult = await this.processDelivery(tracking, channels);
      
      // Update metrics
      this.updateMetrics(deliveryResult);
      
      return {
        success: true,
        trackingId,
        deliveryResult,
        estimatedDeliveryTime: this.estimateDeliveryTime(channels)
      };
    } catch (error) {
      console.error('Error tracking notification delivery:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process notification delivery
   * @param {Object} tracking - Delivery tracking record
   * @param {Array} channels - Delivery channels
   * @returns {Object} Delivery result
   */
  async processDelivery(tracking, channels) {
    const startTime = Date.now();
    const results = [];
    
    try {
      // Process each channel
      for (const channel of channels) {
        const channelConfig = this.options.channels[channel];
        if (!channelConfig) {
          results.push({
            channel,
            success: false,
            error: 'Unsupported channel'
          });
          continue;
        }

        const channelResult = await this.deliverToChannel(tracking, channel, channelConfig);
        results.push(channelResult);
        
        // Update tracking record
        await this.updateChannelTracking(tracking.trackingId, channel, channelResult);
      }

      // Update overall tracking status
      const allDelivered = results.every(r => r.success);
      const overallStatus = allDelivered ? 'delivered' : 'partial';
      
      await this.updateOverallTracking(tracking.trackingId, overallStatus);
      
      return {
        success: allDelivered,
        status: overallStatus,
        results,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error processing delivery:', error);
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  /**
   * Deliver notification to specific channel
   * @param {Object} tracking - Delivery tracking record
   * @param {string} channel - Channel name
   * @param {Object} channelConfig - Channel configuration
   * @returns {Object} Delivery result
   */
  async deliverToChannel(tracking, channel, channelConfig) {
    const startTime = Date.now();
    
    try {
      // Get channel tracking info
      const channelTracking = tracking.channels.find(c => c.channel === channel);
      if (!channelTracking) {
        throw new Error(`Channel ${channel} not found in tracking`);
      }

      // Update attempt count
      channelTracking.attempts++;
      
      // Prepare delivery data
      const deliveryData = {
        trackingId: tracking.trackingId,
        notificationId: tracking.notificationId,
        type: tracking.type,
        priority: tracking.priority,
        recipient: tracking.recipient,
        content: tracking.content,
        scheduledAt: tracking.scheduledAt
      };

      // Deliver based on channel type
      let result;
      switch (channel) {
        case 'email':
          result = await this.deliverEmail(deliveryData, channelConfig);
          break;
        case 'push':
          result = await this.deliverPush(deliveryData, channelConfig);
          break;
        case 'sms':
          result = await this.deliverSMS(deliveryData, channelConfig);
          break;
        case 'webhook':
          result = await this.deliverWebhook(deliveryData, channelConfig);
          break;
        default:
          throw new Error(`Unknown channel: ${channel}`);
      }

      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Handle delivery result
      if (result.success) {
        channelTracking.status = 'delivered';
        channelTracking.deliveredAt = new Date();
        channelTracking.responseTime = responseTime;
      } else {
        channelTracking.status = 'failed';
        channelTracking.failedAt = new Date();
        channelTracking.error = result.error;
        
        // Schedule retry if enabled
        if (this.options.enableRetryLogic && 
            channelTracking.attempts < this.options.maxRetryAttempts) {
          await this.scheduleRetry(tracking, channel, result.error);
        }
      }

      // Update channel metrics
      this.updateChannelMetrics(channel, result.success, responseTime);
      
      return {
        channel,
        success: result.success,
        responseTime,
        attempts: channelTracking.attempts,
        error: result.error
      };
    } catch (error) {
      console.error(`Error delivering to ${channel}:`, error);
      
      // Update tracking with error
      const channelTracking = tracking.channels.find(c => c.channel === channel);
      if (channelTracking) {
        channelTracking.status = 'failed';
        channelTracking.failedAt = new Date();
        channelTracking.error = error.message;
      }
      
      return {
        channel,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deliver email notification
   * @param {Object} deliveryData - Delivery data
   * @param {Object} config - Channel configuration
   * @returns {Object} Delivery result
   */
  async deliverEmail(deliveryData, config) {
    try {
      // This would integrate with the actual email service (Mailjet, SendGrid, etc.)
      // For now, simulate delivery
      const deliveryTime = 500 + Math.random() * 1000; // 0.5-1.5 seconds
      
      // Simulate success/failure
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        // Track engagement
        await this.trackEmailEngagement(deliveryData.trackingId, deliveryData.recipient.email);
      }
      
      return {
        success,
        deliveryTime,
        provider: config.provider,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      console.error('Error delivering email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deliver push notification
   * @param {Object} deliveryData - Delivery data
   * @param {Object} config - Channel configuration
   * @returns {Object} Delivery result
   */
  async deliverPush(deliveryData, config) {
    try {
      // This would integrate with FCM or other push service
      // For now, simulate delivery
      const deliveryTime = 200 + Math.random() * 300; // 0.2-0.5 seconds
      
      // Simulate success/failure
      const success = Math.random() > 0.05; // 95% success rate
      
      return {
        success,
        deliveryTime,
        provider: config.provider,
        deviceId: `device_${Date.now()}`
      };
    } catch (error) {
      console.error('Error delivering push:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deliver SMS notification
   * @param {Object} deliveryData - Delivery data
   * @param {Object} config - Channel configuration
   * @returns {Object} Delivery result
   */
  async deliverSMS(deliveryData, config) {
    try {
      // This would integrate with Twilio or other SMS service
      // For now, simulate delivery
      const deliveryTime = 1000 + Math.random() * 2000; // 1-3 seconds
      
      // Simulate success/failure
      const success = Math.random() > 0.08; // 92% success rate
      
      return {
        success,
        deliveryTime,
        provider: config.provider,
        smsId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      console.error('Error delivering SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deliver webhook notification
   * @param {Object} deliveryData - Delivery data
   * @param {Object} config - Channel configuration
   * @returns {Object} Delivery result
   */
  async deliverWebhook(deliveryData, config) {
    try {
      // This would make HTTP request to webhook URL
      // For now, simulate delivery
      const deliveryTime = 300 + Math.random() * 700; // 0.3-1 second
      
      // Simulate success/failure
      const success = Math.random() > 0.15; // 85% success rate
      
      return {
        success,
        deliveryTime,
        provider: config.provider,
        webhookId: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      console.error('Error delivering webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Track email engagement
   * @param {string} trackingId - Tracking ID
   * @param {string} email - Email address
   */
  async trackEmailEngagement(trackingId, email) {
    try {
      // This would track opens, clicks, etc. using tracking pixels or links
      // For now, simulate engagement tracking
      const engagement = {
        trackingId,
        email,
        opened: Math.random() > 0.6, // 40% open rate
        clicked: Math.random() > 0.8, // 20% click rate
        openedAt: Math.random() > 0.6 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null,
        clickedAt: Math.random() > 0.8 ? new Date(Date.now() - Math.random() * 60 * 60 * 1000) : null,
        timeToOpen: Math.random() > 0.6 ? Math.floor(Math.random() * 60 * 60) : null, // minutes to open
        timeToClick: Math.random() > 0.8 ? Math.floor(Math.random() * 24 * 60) : null // hours to click
      };

      // Store engagement data
      await this.createEngagementRecord(engagement);
      
      return engagement;
    } catch (error) {
      console.error('Error tracking email engagement:', error);
    }
  }

  /**
   * Schedule retry for failed delivery
   * @param {Object} tracking - Delivery tracking record
   * @param {string} channel - Channel to retry
   * @param {string} originalError - Original error
   */
  async scheduleRetry(tracking, channel, originalError) {
    try {
      const channelConfig = this.options.channels[channel];
      const backoffDelay = this.options.retryBackoffMultiplier * 
                           Math.pow(2, tracking.channels.find(c => c.channel === channel).attempts - 1) * 1000;
      
      const retryJob = {
        trackingId: tracking.trackingId,
        channel,
        originalError,
        retryAt: Date.now() + backoffDelay,
        provider: channelConfig.provider
      };

      this.retryQueue.push(retryJob);
      this.metrics.retriedDeliveries++;
      
      console.log(`Scheduled retry for ${channel} delivery in ${backoffDelay}ms`);
    } catch (error) {
      console.error('Error scheduling retry:', error);
    }
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    if (this.retryQueue.length === 0) {
      return;
    }

    const now = Date.now();
    const readyToRetry = this.retryQueue.filter(job => job.retryAt <= now);
    
    for (const job of readyToRetry) {
      try {
        // Get original tracking record
        const tracking = await this.getTrackingRecord(job.trackingId);
        if (!tracking) continue;

        // Update channel tracking
        const channelTracking = tracking.channels.find(c => c.channel === job.channel);
        if (channelTracking) {
          channelTracking.attempts++;
          channelTracking.status = 'retrying';
        }

        // Retry delivery
        await this.deliverToChannel(tracking, job.channel, this.options.channels[job.channel]);
        
        // Remove from retry queue
        const index = this.retryQueue.indexOf(job);
        if (index > -1) {
          this.retryQueue.splice(index, 1);
        }
      } catch (error) {
        console.error(`Error retrying delivery ${job.trackingId}:`, error);
      }
    }
  }

  /**
   * Create tracking record
   * @param {Object} tracking - Tracking data
   */
  async createTrackingRecord(tracking) {
    try {
      await createDoc("NotificationTracking", {
        notificationId: tracking.notificationId,
        trackingId: tracking.trackingId,
        alertId: tracking.alertId,
        userId: tracking.userId,
        type: tracking.type,
        priority: tracking.priority,
        recipient: tracking.recipient,
        content: tracking.content,
        delivery: tracking.channels,
        status: 'pending',
        createdAt: tracking.createdAt,
        scheduledAt: tracking.scheduledAt
      });
    } catch (error) {
      console.error('Error creating tracking record:', error);
    }
  }

  /**
   * Update channel tracking
   * @param {string} trackingId - Tracking ID
   * @param {string} channel - Channel name
   * @param {Object} result - Delivery result
   */
  async updateChannelTracking(trackingId, channel, result) {
    try {
      await updateOneDoc("NotificationTracking", { trackingId }, {
        $set: {
          'delivery.$[elem].status': result.success ? 'delivered' : 'failed',
          'delivery.$[elem].responseTime': result.responseTime,
          'delivery.$[elem].attempts': result.attempts,
          'delivery.$[elem].error': result.error || null,
          'delivery.$[elem].sentAt': result.success ? new Date() : null,
          'delivery.$[elem].deliveredAt': result.success ? new Date() : null,
          'delivery.$[elem].failedAt': result.success ? null : new Date()
        }
      });
    } catch (error) {
      console.error('Error updating channel tracking:', error);
    }
  }

  /**
   * Update overall tracking status
   * @param {string} trackingId - Tracking ID
   * @param {string} status - Overall status
   */
  async updateOverallTracking(trackingId, status) {
    try {
      await updateOneDoc("NotificationTracking", { trackingId }, {
        $set: {
          status,
          completedAt: status === 'delivered' ? new Date() : null
        }
      });
    } catch (error) {
      console.error('Error updating overall tracking:', error);
    }
  }

  /**
   * Get tracking record
   * @param {string} trackingId - Tracking ID
   * @returns {Object} Tracking record
   */
  async getTrackingRecord(trackingId) {
    try {
      const records = await getManyDocs("NotificationTracking", { trackingId });
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('Error getting tracking record:', error);
      return null;
    }
  }

  /**
   * Create engagement record
   * @param {Object} engagement - Engagement data
   */
  async createEngagementRecord(engagement) {
    try {
      await createDoc("NotificationEngagement", {
        trackingId: engagement.trackingId,
        email: engagement.email,
        opened: engagement.opened,
        clicked: engagement.clicked,
        openedAt: engagement.openedAt,
        clickedAt: engagement.clickedAt,
        timeToOpen: engagement.timeToOpen,
        timeToClick: engagement.timeToClick
      });
    } catch (error) {
      console.error('Error creating engagement record:', error);
    }
  }

  /**
   * Update channel metrics
   * @param {string} channel - Channel name
   * @param {boolean} success - Delivery success
   * @param {number} responseTime - Response time
   */
  updateChannelMetrics(channel, success, responseTime) {
    const metrics = this.metrics.channelPerformance[channel];
    
    metrics.sent++;
    
    if (success) {
      metrics.delivered++;
    } else {
      metrics.failed++;
    }
    
    // Update average response time
    const totalResponseTime = metrics.averageResponseTime * (metrics.sent - 1) + responseTime;
    metrics.averageResponseTime = totalResponseTime / metrics.sent;
  }

  /**
   * Update overall metrics
   * @param {Object} deliveryResult - Delivery result
   */
  updateMetrics(deliveryResult) {
    this.metrics.totalDeliveries++;
    
    if (deliveryResult.success) {
      this.metrics.successfulDeliveries++;
    } else {
      this.metrics.failedDeliveries++;
    }
    
    // Update average processing time
    const totalTime = this.metrics.averageDeliveryTime * (this.metrics.totalDeliveries - 1) + deliveryResult.processingTime;
    this.metrics.averageDeliveryTime = totalTime / this.metrics.totalDeliveries;
    
    // Update delivery patterns
    this.updateDeliveryPatterns(deliveryResult);
  }

  /**
   * Update delivery patterns
   * @param {Object} deliveryResult - Delivery result
   */
  updateDeliveryPatterns(deliveryResult) {
    // This would analyze patterns and update optimal delivery times
    // For now, just log the delivery
    console.log('Delivery patterns updated:', deliveryResult);
  }

  /**
   * Estimate delivery time for channels
   * @param {Array} channels - Channel list
   * @returns {number} Estimated time in milliseconds
   */
  estimateDeliveryTime(channels) {
    let maxTime = 0;
    
    for (const channel of channels) {
      const config = this.options.channels[channel];
      if (config && config.deliveryTimeout) {
        maxTime = Math.max(maxTime, config.deliveryTimeout);
      }
    }
    
    return maxTime;
  }

  /**
   * Generate unique tracking ID
   * @returns {string} Tracking ID
   */
  generateTrackingId() {
    return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get delivery metrics
   * @returns {Object} Current metrics
   */
  getDeliveryMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      activeDeliveries: this.activeDeliveries.size,
      retryQueueSize: this.retryQueue.length,
      deliveryRate: this.metrics.totalDeliveries > 0 ? 
        (this.metrics.successfulDeliveries / this.metrics.totalDeliveries) * 100 : 0,
      averageResponseTime: this.metrics.averageDeliveryTime,
      channelBreakdown: this.metrics.channelPerformance
    };
  }

  /**
   * Get channel-specific metrics
   * @param {string} channel - Channel name
   * @returns {Object} Channel metrics
   */
  getChannelMetrics(channel) {
    return this.metrics.channelPerformance[channel] || {
      sent: 0,
      delivered: 0,
      failed: 0,
      averageTime: 0
    };
  }

  /**
   * Get delivery analytics for time range
   * @param {Object} options - Analytics options
   * @returns {Object} Analytics data
   */
  async getDeliveryAnalytics(options = {}) {
    try {
      const {
        timeRange = '24h',           // Default to last 24 hours
        channels = ['email', 'push', 'sms', 'webhook'],
        includeEngagement = true,
        includePatterns = true
      } = options;

      // Calculate time cutoff
      const cutoffDate = this.calculateTimeCutoff(timeRange);
      
      // Get tracking records
      const records = await getManyDocs("NotificationTracking", {
        createdAt: { $gte: cutoffDate }
      }, [], { 
        sort: { createdAt: -1 },
        limit: 10000
      });

      // Analyze by channel
      const channelAnalytics = {};
      for (const channel of channels) {
        const channelRecords = records.filter(r => 
          r.delivery.some(d => d.channel === channel)
        );
        
        channelAnalytics[channel] = this.analyzeChannelData(channelRecords, channel, includeEngagement);
      }

      // Overall analytics
      const overall = {
        totalNotifications: records.length,
        successfulDeliveries: records.filter(r => r.status === 'delivered').length,
        failedDeliveries: records.filter(r => r.status === 'failed').length,
        averageDeliveryTime: this.calculateAverageDeliveryTime(records),
        bestPerformingChannel: this.findBestPerformingChannel(channelAnalytics),
        deliveryTrends: includePatterns ? this.analyzeDeliveryTrends(records) : null
      };

      return {
        timeRange,
        cutoffDate,
        channelAnalytics,
        overall,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting delivery analytics:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Analyze channel data
   * @param {Array} records - Channel records
   * @param {string} channel - Channel name
   * @param {boolean} includeEngagement - Include engagement data
   * @returns {Object} Channel analysis
   */
  analyzeChannelData(records, channel, includeEngagement) {
    const channelRecords = records.filter(r => 
      r.delivery.some(d => d.channel === channel)
    );

    const total = channelRecords.length;
    const successful = channelRecords.filter(r => r.status === 'delivered').length;
    const failed = channelRecords.filter(r => r.status === 'failed').length;
    const deliveryRate = total > 0 ? (successful / total) * 100 : 0;

    // Calculate average response time
    const deliveredRecords = channelRecords.filter(r => r.status === 'delivered');
    const avgResponseTime = deliveredRecords.length > 0 ? 
      deliveredRecords.reduce((sum, r) => {
        const delivery = r.delivery.find(d => d.channel === channel);
        return sum + (delivery?.responseTime || 0);
      }, 0) / deliveredRecords.length : 0;

    const analysis = {
      total,
      successful,
      failed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      averageResponseTime: Math.round(avgResponseTime),
      errors: this.analyzeChannelErrors(channelRecords, channel)
    };

    // Add engagement data if requested
    if (includeEngagement && channel === 'email') {
      analysis.engagement = await this.getEmailEngagement(channelRecords);
    }

    return analysis;
  }

  /**
   * Analyze channel errors
   * @param {Array} records - Channel records
   * @param {string} channel - Channel name
   * @returns {Object} Error analysis
   */
  analyzeChannelErrors(records, channel) {
    const channelRecords = records.filter(r => 
      r.delivery.some(d => d.channel === channel)
    );

    const failedRecords = channelRecords.filter(r => r.status === 'failed');
    const errors = {};
    
    // Categorize errors
    for (const record of failedRecords) {
      const delivery = record.delivery.find(d => d.channel === channel);
      if (delivery && delivery.error) {
        const errorType = this.categorizeError(delivery.error);
        if (!errors[errorType]) {
          errors[errorType] = { count: 0, examples: [] };
        }
        errors[errorType].count++;
        errors[errorType].examples.push(delivery.error);
      }
    }

    return errors;
  }

  /**
   * Categorize error type
   * @param {string} error - Error message
   * @returns {string} Error category
   */
  categorizeError(error) {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('timeout')) return 'timeout';
    if (errorLower.includes('rate limit')) return 'rate_limit';
    if (errorLower.includes('invalid')) return 'invalid_recipient';
    if (errorLower.includes('network')) return 'network_error';
    if (errorLower.includes('provider')) return 'provider_error';
    
    return 'other';
  }

  /**
   * Get email engagement data
   * @param {Array} records - Email records
   * @returns {Object} Engagement data
   */
  async getEmailEngagement(records) {
    try {
      // This would query the NotificationEngagement collection
      // For now, simulate engagement data
      const totalEmails = records.length;
      const openedCount = Math.floor(totalEmails * 0.4); // 40% open rate
      const clickedCount = Math.floor(totalEmails * 0.2); // 20% click rate
      
      return {
        totalEmails,
        openedCount,
        clickedCount,
        openRate: Math.round((openedCount / totalEmails) * 100) / 100,
        clickRate: Math.round((clickedCount / totalEmails) * 100) / 100,
        averageTimeToOpen: 120, // 2 minutes average
        averageTimeToClick: 180 // 3 minutes average
      };
    } catch (error) {
      console.error('Error getting email engagement:', error);
      return {
        totalEmails: 0,
        openedCount: 0,
        clickedCount: 0,
        openRate: 0,
        clickRate: 0
      };
    }
  }

  /**
   * Find best performing channel
   * @param {Object} channelAnalytics - Channel analytics
   * @returns {string} Best channel
   */
  findBestPerformingChannel(channelAnalytics) {
    let bestChannel = null;
    let bestScore = -1;
    
    for (const [channel, analytics] of Object.entries(channelAnalytics)) {
      // Calculate performance score
      const score = (analytics.deliveryRate * 0.6) + 
                   ((100 - analytics.averageResponseTime / 100) * 0.4);
      
      if (score > bestScore) {
        bestScore = score;
        bestChannel = channel;
      }
    }
    
    return bestChannel;
  }

  /**
   * Analyze delivery trends
   * @param {Array} records - All records
   * @returns {Object} Trend analysis
   */
  analyzeDeliveryTrends(records) {
    // Group by hour
    const hourlyData = {};
    const dailyData = {};
    
    for (const record of records) {
      const date = new Date(record.createdAt);
      const hour = date.getHours();
      const day = date.toDateString();
      
      if (!hourlyData[hour]) hourlyData[hour] = { total: 0, successful: 0 };
      if (!dailyData[day]) dailyData[day] = { total: 0, successful: 0 };
      
      hourlyData[hour].total++;
      dailyData[day].total++;
      
      if (record.status === 'delivered') {
        hourlyData[hour].successful++;
        dailyData[day].successful++;
      }
    }
    
    // Find peak hours and days
    const peakHour = Object.entries(hourlyData)
      .sort((a, b) => b[1].successful - a[1].successful)[0]?.[0];
    
    const peakDay = Object.entries(dailyData)
      .sort((a, b) => b[1].successful - a[1].successful)[0]?.[0];
    
    return {
      hourlyDistribution: hourlyData,
      dailyDistribution: dailyData,
      peakHour,
      peakDay,
      recommendations: this.generateDeliveryRecommendations(hourlyData, dailyData)
    };
  }

  /**
   * Generate delivery recommendations
   * @param {Object} hourlyData - Hourly distribution
   * @param {Object} dailyData - Daily distribution
   * @returns {Array} Recommendations
   */
  generateDeliveryRecommendations(hourlyData, dailyData) {
    const recommendations = [];
    
    // Analyze optimal send times
    const bestHours = Object.entries(hourlyData)
      .filter(([hour, data]) => data.total > 10) // Minimum threshold
      .sort((a, b) => (b[1].successful / b[1].total) - (a[1].successful / a[1].total))
      .slice(0, 3)
      .map(([hour]) => hour);
    
    if (bestHours.length > 0) {
      recommendations.push({
        type: 'optimal_send_times',
        message: `Best times to send notifications: ${bestHours.join(', ')}:00`,
        priority: 'medium'
      });
    }
    
    // Check for consistent failure patterns
    const consistentlyFailingHours = Object.entries(hourlyData)
      .filter(([hour, data]) => data.total > 5 && (data.successful / data.total) < 0.5)
      .map(([hour]) => hour);
    
    if (consistentlyFailingHours.length > 0) {
      recommendations.push({
        type: 'avoid_send_times',
        message: `Avoid sending during: ${consistentlyFailingHours.join(', ')}:00`,
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate time cutoff
   * @param {string} timeRange - Time range (1h, 24h, 7d, 30d)
   * @returns {Date} Cutoff date
   */
  calculateTimeCutoff(timeRange) {
    const now = new Date();
    const match = timeRange.match(/(\d+)([hd])/);
    
    if (!match) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24 hours
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h':
        return new Date(now.getTime() - value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'H':
        return new Date(now.getTime() - value * 60 * 60 * 1000); // Same as 'h'
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Calculate average delivery time
   * @param {Array} records - Delivery records
   * @returns {number} Average time
   */
  calculateAverageDeliveryTime(records) {
    const deliveredRecords = records.filter(r => r.status === 'delivered');
    
    if (deliveredRecords.length === 0) return 0;
    
    const totalTime = deliveredRecords.reduce((sum, record) => {
      const delivery = record.delivery.find(d => d.status === 'delivered');
      return sum + (delivery?.responseTime || 0);
    }, 0);
    
    return totalTime / deliveredRecords.length;
  }

  /**
   * Start background processes
   */
  startBackgroundProcesses() {
    // Process retry queue
    setInterval(() => {
      this.processRetryQueue();
    }, 5000); // Every 5 seconds

    // Report metrics
    if (this.options.enableMetrics) {
      setInterval(() => {
        this.reportMetrics();
      }, 60 * 1000); // Every minute
    }
  }

  /**
   * Report delivery metrics
   */
  reportMetrics() {
    const metrics = this.getDeliveryMetrics();
    console.log('Notification Delivery Metrics:', metrics);
    
    // Store metrics for analytics
    this.storeMetrics(metrics);
  }

  /**
   * Store metrics for analytics
   * @param {Object} metrics - Metrics to store
   */
  async storeMetrics(metrics) {
    try {
      await createDoc("NotificationMetrics", {
        timestamp: new Date(),
        ...metrics
      });
    } catch (error) {
      console.error('Error storing metrics:', error);
    }
  }
}

// Singleton instance
let notificationDeliveryTrackingInstance = null;

/**
 * Get or create notification delivery tracking instance
 * @param {Object} options - Configuration options
 * @returns {NotificationDeliveryTracking} Tracking instance
 */
export function getNotificationDeliveryTracking(options) {
  if (!notificationDeliveryTrackingInstance) {
    notificationDeliveryTrackingInstance = new NotificationDeliveryTracking(options);
  }
  return notificationDeliveryTrackingInstance;
}

/**
 * Track notification delivery (convenience function)
 * @param {Object} notification - Notification to track
 * @param {Array} channels - Delivery channels
 */
export async function trackNotificationDelivery(notification, channels) {
  const tracker = getNotificationDeliveryTracking();
  return await tracker.trackDelivery(notification, channels);
}

/**
 * Get delivery metrics (convenience function)
 */
export function getDeliveryMetrics() {
  const tracker = getNotificationDeliveryTracking();
  return tracker.getDeliveryMetrics();
}

/**
 * Get delivery analytics (convenience function)
 * @param {Object} options - Analytics options
 */
export async function getDeliveryAnalytics(options) {
  const tracker = getNotificationDeliveryTracking();
  return await tracker.getDeliveryAnalytics(options);
}