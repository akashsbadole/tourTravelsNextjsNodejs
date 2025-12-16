import "server-only";
import { createDoc } from "@/lib/db/operations";
import { NotificationTracking } from "@/lib/db/models";
import { sendEmail } from "@/lib/email/sendEmail";
import {
  priceAlertEmailTemplate,
  priceDropEmailTemplate,
  dailyDigestEmailTemplate
} from "@/lib/email/priceAlertTemplates";
import { formatPrice, generateAlertSummary } from "@/lib/utils/priceAlertUtils";
import { v4 as uuidv4 } from "uuid";
import { getPerformanceOptimizer } from "@/lib/services/performanceOptimizer";

/**
 * Notification Service
 * Handles sending notifications for price alerts
 */
export class NotificationService {
  constructor(options = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      batchSize: 10,
      enableBatching: true,
      ...options
    };
    
    this.notificationQueue = [];
    this.processingQueue = false;
    
    // Initialize performance optimizer
    this.performanceOptimizer = getPerformanceOptimizer();
  }

  /**
   * Send price alert notification
   * @param {Object} alert - Price alert object
   * @param {Object} bestPrice - Current best price
   * @param {Array} triggers - Array of triggered conditions
   * @returns {Object} Notification result
   */
  async sendPriceAlertNotification(alert, bestPrice, triggers) {
    try {
      const notificationId = uuidv4();
      const notificationData = {
        notificationId,
        userId: alert.userId,
        alertId: alert._id,
        recipient: {
          email: alert.email,
        },
        type: this.determineNotificationType(triggers),
        priority: this.determineNotificationPriority(triggers),
        content: this.generateNotificationContent(alert, bestPrice, triggers),
        flightContext: {
          flightId: bestPrice.flightId,
          flightCode: bestPrice.flightCode,
          airlineCode: bestPrice.airlineCode,
          route: {
            origin: alert.searchCriteria.origin,
            destination: alert.searchCriteria.destination,
          },
          departureDate: alert.searchCriteria.departureDate,
          price: bestPrice,
          priceChange: this.calculatePriceChange(alert.currentBestPrice, bestPrice),
        },
        userPreferences: alert.notificationPreferences,
      };

      // Send notifications based on user preferences
      const results = await this.sendNotificationsByChannel(notificationData);

      // Track notification
      await this.trackNotification(notificationData, results);

      return {
        success: true,
        notificationId,
        results,
      };
    } catch (error) {
      console.error('Error sending price alert notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send notifications by different channels
   * @param {Object} notificationData - Notification data
   * @returns {Array} Results for each channel
   */
  async sendNotificationsByChannel(notificationData) {
    // Use performance optimizer for batch processing if enabled
    if (this.options.enableBatching && this.performanceOptimizer) {
      try {
        const batchResults = await this.performanceOptimizer.batchNotifications([notificationData]);
        if (batchResults.success) {
          return batchResults.results;
        }
      } catch (error) {
        console.warn('Performance optimizer batch processing failed, falling back to individual processing:', error);
      }
    }
    
    // Fallback to individual processing
    const results = [];
    const preferences = notificationData.userPreferences;

    // Email notification
    if (preferences?.email?.enabled) {
      const emailResult = await this.sendEmailNotification(notificationData);
      results.push({ channel: 'email', ...emailResult });
    }

    // Push notification (would integrate with push service)
    if (preferences?.push?.enabled) {
      const pushResult = await this.sendPushNotification(notificationData);
      results.push({ channel: 'push', ...pushResult });
    }

    // SMS notification (would integrate with SMS service)
    if (preferences?.sms?.enabled && preferences?.sms?.phoneNumber) {
      const smsResult = await this.sendSMSNotification(notificationData);
      results.push({ channel: 'sms', ...smsResult });
    }

    return results;
  }

  /**
   * Send email notification
   * @param {Object} notificationData - Notification data
   * @returns {Object} Email result
   */
  async sendEmailNotification(notificationData) {
    try {
      const { content, recipient, flightContext } = notificationData;
      
      let emailTemplate;
      if (notificationData.type === 'price_drop') {
        emailTemplate = priceDropEmailTemplate;
      } else {
        emailTemplate = priceAlertEmailTemplate;
      }

      const emailBody = emailTemplate({
        branding: {
          logoImageUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        },
        main: {
          alertSummary: generateAlertSummary(notificationData.alertId),
          currentPrice: formatPrice(flightContext.price.amount, flightContext.price.currency),
          previousPrice: notificationData.alertId?.currentBestPrice ? 
            formatPrice(notificationData.alertId.currentBestPrice.amount, notificationData.alertId.currentBestPrice.currency) : 
            'N/A',
          priceChange: flightContext.priceChange,
          flightDetails: flightContext,
          manageAlertsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/user/price-alerts`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe/${notificationData.alertId}`,
        },
      });

      await sendEmail(
        [{
          Email: recipient.email,
          Name: notificationData.userId?.name || 'Traveler',
        }],
        content.subject,
        emailBody
      );

      return {
        success: true,
        sentAt: new Date(),
        externalId: `email_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error sending email notification:', error);
      return {
        success: false,
        error: error.message,
        sentAt: new Date(),
      };
    }
  }

  /**
   * Send push notification
   * @param {Object} notificationData - Notification data
   * @returns {Object} Push result
   */
  async sendPushNotification(notificationData) {
    try {
      // This would integrate with a push notification service
      // For now, simulate successful push
      console.log('Push notification sent:', notificationData.notificationId);
      
      return {
        success: true,
        sentAt: new Date(),
        externalId: `push_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return {
        success: false,
        error: error.message,
        sentAt: new Date(),
      };
    }
  }

  /**
   * Send SMS notification
   * @param {Object} notificationData - Notification data
   * @returns {Object} SMS result
   */
  async sendSMSNotification(notificationData) {
    try {
      // This would integrate with an SMS service like Twilio
      // For now, simulate successful SMS
      console.log('SMS notification sent:', notificationData.notificationId);
      
      return {
        success: true,
        sentAt: new Date(),
        externalId: `sms_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      return {
        success: false,
        error: error.message,
        sentAt: new Date(),
      };
    }
  }

  /**
   * Send daily digest notification
   * @param {Array} alerts - Array of alerts for digest
   * @param {Object} user - User object
   * @returns {Object} Digest result
   */
  async sendDailyDigest(alerts, user) {
    try {
      const notificationId = uuidv4();
      
      const digestContent = this.generateDigestContent(alerts);
      
      const emailBody = dailyDigestEmailTemplate({
        branding: {
          logoImageUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        },
        main: {
          digestSummary: digestContent.summary,
          alertDetails: digestContent.alerts,
          manageAlertsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/user/price-alerts`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe/daily/${user._id}`,
        },
      });

      await sendEmail(
        [{
          Email: user.email,
          Name: user.firstName,
        }],
        'Daily Price Alert Digest',
        emailBody
      );

      // Track notification
      await this.trackNotification({
        notificationId,
        userId: user._id,
        type: 'daily_digest',
        recipient: { email: user.email },
        content: {
          subject: 'Daily Price Alert Digest',
          body: emailBody,
        },
        flightContext: {
          digestAlerts: alerts.length,
        },
        userPreferences: {
          email: { enabled: true, frequency: 'daily' },
        },
      }, [{ channel: 'email', success: true, sentAt: new Date() }]);

      return {
        success: true,
        notificationId,
        alertsIncluded: alerts.length,
      };
    } catch (error) {
      console.error('Error sending daily digest:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Determine notification type based on triggers
   * @param {Array} triggers - Array of triggered conditions
   * @returns {string} Notification type
   */
  determineNotificationType(triggers) {
    if (!triggers || triggers.length === 0) {
      return 'price_alert_created';
    }

    const triggerTypes = triggers.map(t => t.type);
    
    if (triggerTypes.includes('percentage_drop')) {
      return 'price_drop';
    }
    
    if (triggerTypes.includes('specific_price')) {
      return 'specific_price';
    }
    
    if (triggerTypes.includes('daily_change')) {
      return 'daily_change';
    }
    
    if (triggerTypes.includes('price_trend')) {
      return 'price_trend_change';
    }
    
    if (triggerTypes.includes('competitive_price')) {
      return 'competitive_price';
    }
    
    return 'price_drop'; // Default
  }

  /**
   * Determine notification priority based on triggers
   * @param {Array} triggers - Array of triggered conditions
   * @returns {string} Notification priority
   */
  determineNotificationPriority(triggers) {
    if (!triggers || triggers.length === 0) {
      return 'normal';
    }

    const triggerTypes = triggers.map(t => t.type);
    
    // High priority for significant price drops
    if (triggerTypes.includes('percentage_drop')) {
      const dropTrigger = triggers.find(t => t.type === 'percentage_drop');
      if (dropTrigger && dropTrigger.value >= 20) { // 20% or more drop
        return 'high';
      }
    }
    
    // Urgent for very specific price targets
    if (triggerTypes.includes('specific_price')) {
      return 'urgent';
    }
    
    return 'normal';
  }

  /**
   * Generate notification content
   * @param {Object} alert - Price alert object
   * @param {Object} bestPrice - Current best price
   * @param {Array} triggers - Array of triggered conditions
   * @returns {Object} Notification content
   */
  generateNotificationContent(alert, bestPrice, triggers) {
    const priceChange = this.calculatePriceChange(alert.currentBestPrice, bestPrice);
    
    let subject, body;
    
    if (triggers && triggers.length > 0) {
      const triggerTypes = triggers.map(t => t.type).join(', ');
      subject = `Price Alert Triggered: ${alert.searchCriteria.origin.airportCode} → ${alert.searchCriteria.destination.airportCode}`;
      body = `Your price alert has been triggered due to: ${triggerTypes}. Current price: ${formatPrice(bestPrice.amount, bestPrice.currency)}`;
    } else {
      subject = `New Price Alert: ${alert.searchCriteria.origin.airportCode} → ${alert.searchCriteria.destination.airportCode}`;
      body = `Your price alert has been created. We'll notify you when prices drop.`;
    }

    return {
      subject,
      body,
      template: 'price_alert',
      variables: {
        alertId: alert._id,
        priceChange,
        triggers,
      },
    };
  }

  /**
   * Generate digest content
   * @param {Array} alerts - Array of alerts for digest
   * @returns {Object} Digest content
   */
  generateDigestContent(alerts) {
    const summary = {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      triggeredAlerts: alerts.filter(a => a.status === 'triggered').length,
      routes: [...new Set(alerts.map(a => `${a.searchCriteria.origin.airportCode}-${a.searchCriteria.destination.airportCode}`))].length,
    };

    const alertDetails = alerts.map(alert => ({
      id: alert._id,
      summary: generateAlertSummary(alert),
      status: alert.status,
      currentPrice: alert.currentBestPrice ? 
        formatPrice(alert.currentBestPrice.amount, alert.currentBestPrice.currency) : 
        'N/A',
      lastTriggered: alert.lastTriggeredAt,
    }));

    return {
      summary,
      alerts: alertDetails,
    };
  }

  /**
   * Calculate price change
   * @param {Object} previousPrice - Previous price
   * @param {Object} currentPrice - Current price
   * @returns {Object} Price change information
   */
  calculatePriceChange(previousPrice, currentPrice) {
    if (!previousPrice || !currentPrice) {
      return {
        amount: 0,
        percentage: 0,
        direction: 'unchanged',
      };
    }

    const amountDiff = currentPrice.amount - previousPrice.amount;
    const percentageChange = previousPrice.amount > 0 ? 
      (amountDiff / previousPrice.amount) * 100 : 0;

    return {
      amount: Math.abs(amountDiff),
      percentage: Math.abs(percentageChange),
      direction: amountDiff > 0 ? 'increase' : amountDiff < 0 ? 'decrease' : 'unchanged',
      previousPrice: previousPrice.amount,
      currentPrice: currentPrice.amount,
      currency: currentPrice.currency,
    };
  }

  /**
   * Track notification in database
   * @param {Object} notificationData - Notification data
   * @param {Array} results - Delivery results
   */
  async trackNotification(notificationData, results) {
    try {
      const delivery = results.map(result => ({
        channel: result.channel,
        status: result.success ? 'sent' : 'failed',
        sentAt: result.sentAt,
        failureReason: result.error,
        externalId: result.externalId,
      }));

      await createDoc("NotificationTracking", {
        notificationId: notificationData.notificationId,
        userId: notificationData.userId,
        alertId: notificationData.alertId,
        recipient: notificationData.recipient,
        content: notificationData.content,
        type: notificationData.type,
        priority: notificationData.priority,
        delivery,
        status: 'completed',
        processedAt: new Date(),
        flightContext: notificationData.flightContext,
        userPreferences: notificationData.userPreferences,
        metrics: {
          totalDeliveryTime: Date.now() - new Date().getTime(),
        },
      });
    } catch (error) {
      console.error('Error tracking notification:', error);
    }
  }

  /**
   * Queue notification for batch processing
   * @param {Object} notificationData - Notification data
   */
  queueNotification(notificationData) {
    this.notificationQueue.push(notificationData);
    
    if (!this.processingQueue && this.options.enableBatching) {
      this.processQueue();
    }
  }

  /**
   * Process notification queue
   */
  async processQueue() {
    if (this.processingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      const batch = this.notificationQueue.splice(0, this.options.batchSize);
      
      await Promise.all(
        batch.map(notification => this.sendNotificationsByChannel(notification))
      );

      if (this.notificationQueue.length > 0) {
        // Process remaining notifications after a short delay
        setTimeout(() => this.processQueue(), 1000);
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Get notification statistics
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Object} Notification statistics
   */
  async getNotificationStats(userId, filters = {}) {
    try {
      const query = { userId, ...filters };
      
      const notifications = await getManyDocs("NotificationTracking", query);
      
      const stats = {
        total: notifications.length,
        byType: {},
        byChannel: {},
        byStatus: {},
        successRate: 0,
        averageDeliveryTime: 0,
      };

      notifications.forEach(notification => {
        // By type
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        
        // By channel
        notification.delivery.forEach(delivery => {
          stats.byChannel[delivery.channel] = (stats.byChannel[delivery.channel] || 0) + 1;
          
          // By status
          stats.byStatus[delivery.status] = (stats.byStatus[delivery.status] || 0) + 1;
        });
      });

      // Calculate success rate
      const successfulDeliveries = Object.values(stats.byStatus).reduce((sum, count) => 
        sum + (['sent', 'delivered'].includes(status) ? count : 0), 0
      );
      stats.successRate = notifications.length > 0 ? (successfulDeliveries / notifications.length) * 100 : 0;

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {};
    }
  }
}

// Singleton instance
let notificationServiceInstance = null;

/**
 * Get or create notification service instance
 * @param {Object} options - Configuration options
 * @returns {NotificationService} Notification service instance
 */
export function getNotificationService(options) {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService(options);
  }
  return notificationServiceInstance;
}

/**
 * Send price alert notification (convenience function)
 * @param {Object} alert - Price alert object
 * @param {Object} bestPrice - Current best price
 * @param {Array} triggers - Array of triggered conditions
 */
export async function sendPriceAlertNotification(alert, bestPrice, triggers) {
  const service = getNotificationService();
  return await service.sendPriceAlertNotification(alert, bestPrice, triggers);
}

export { NotificationService };