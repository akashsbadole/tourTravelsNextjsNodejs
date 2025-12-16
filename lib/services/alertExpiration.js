import { getManyDocs, updateOneDoc, createDoc } from "@/lib/db/operations";
import { getNotificationService } from "./notifications";
import { alertExpiringEmailTemplate } from "@/lib/email/priceAlertTemplates";
import { getTimeRemaining } from "@/lib/utils/priceAlertUtils";

/**
 * Alert Expiration Service
 * Handles alert expiration, cleanup, and renewal notifications
 */
export class AlertExpirationService {
  constructor(options = {}) {
    this.options = {
      // Warning periods before expiration (in days)
      warningPeriods: [7, 3, 1],
      // Default extension period (in days)
      defaultExtensionDays: 30,
      // Maximum number of extensions
      maxExtensions: 3,
      // Auto-cleanup delay after expiration (in days)
      cleanupDelayDays: 7,
      ...options
    };
    
    this.notificationService = getNotificationService();
  }

  /**
   * Check for expiring alerts and send warnings
   * @returns {Object} Results of the expiration check
   */
  async checkExpiringAlerts() {
    try {
      const results = {
        warningsSent: 0,
        expiredAlerts: 0,
        extendedAlerts: 0,
        errors: []
      };

      // Get all active alerts
      const activeAlerts = await getManyDocs("PriceAlert", {
        status: 'active',
        expiresAt: { $exists: true }
      });

      const now = new Date();
      
      for (const alert of activeAlerts) {
        try {
          const expiresAt = new Date(alert.expiresAt);
          const timeRemaining = getTimeRemaining(expiresAt, now);
          const daysRemaining = Math.ceil(timeRemaining.totalHours / 24);

          // Check if alert is expiring soon and needs warning
          if (this.options.warningPeriods.includes(daysRemaining)) {
            await this.sendExpirationWarning(alert, daysRemaining);
            results.warningsSent++;
          }

          // Check if alert has expired
          if (expiresAt <= now) {
            await this.handleExpiredAlert(alert);
            results.expiredAlerts++;
          }
        } catch (error) {
          console.error(`Error processing alert ${alert._id}:`, error);
          results.errors.push({
            alertId: alert._id,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error checking expiring alerts:', error);
      throw error;
    }
  }

  /**
   * Send expiration warning notification
   * @param {Object} alert - Alert object
   * @param {number} daysRemaining - Days remaining until expiration
   */
  async sendExpirationWarning(alert, daysRemaining) {
    try {
      // Check if we already sent a warning for this period
      const lastWarning = alert.metadata?.lastWarningSent;
      if (lastWarning && lastWarning.daysRemaining === daysRemaining) {
        return; // Already sent warning for this period
      }

      // Prepare notification data
      const notificationData = {
        userId: alert.userId,
        type: 'price_alert_expiring',
        recipient: {
          email: alert.email
        },
        content: {
          subject: `Price Alert Expiring in ${daysRemaining} Day${daysRemaining > 1 ? 's' : ''}`,
          template: 'alertExpiringEmailTemplate',
          variables: {
            main: {
              alertSummary: alert.summary || this.generateAlertSummary(alert),
              timeRemaining: `${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
              expiresAt: new Date(alert.expiresAt).toLocaleDateString(),
              currentPrice: alert.currentBestPrice ? 
                `$${alert.currentBestPrice.amount.toFixed(2)}` : null,
              extendAlertUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${alert._id}/extend`,
              unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${alert._id}/unsubscribe`
            },
            branding: {
              logoImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
              currentYear: new Date().getFullYear()
            },
            currentDate: new Date().toLocaleDateString()
          }
        },
        priority: daysRemaining <= 1 ? 'high' : 'normal',
        scheduledAt: new Date()
      };

      // Send notification
      await this.notificationService.sendNotification(notificationData);

      // Update alert metadata
      await updateOneDoc("PriceAlert", alert._id, {
        $set: {
          'metadata.lastWarningSent': {
            daysRemaining,
            sentAt: new Date()
          }
        }
      });

      console.log(`Sent expiration warning for alert ${alert._id} (${daysRemaining} days remaining)`);
    } catch (error) {
      console.error('Error sending expiration warning:', error);
      throw error;
    }
  }

  /**
   * Handle expired alert
   * @param {Object} alert - Expired alert object
   */
  async handleExpiredAlert(alert) {
    try {
      // Update alert status to expired
      await updateOneDoc("PriceAlert", alert._id, {
        $set: {
          status: 'expired',
          'metadata.expiredAt': new Date(),
          'metadata.expiredReason': 'time_limit'
        }
      });

      // Send expiration notification
      await this.sendExpirationNotification(alert);

      // Schedule cleanup
      await this.scheduleCleanup(alert._id);

      console.log(`Handled expired alert ${alert._id}`);
    } catch (error) {
      console.error('Error handling expired alert:', error);
      throw error;
    }
  }

  /**
   * Send notification when alert expires
   * @param {Object} alert - Expired alert object
   */
  async sendExpirationNotification(alert) {
    try {
      const notificationData = {
        userId: alert.userId,
        type: 'price_alert_expiring',
        recipient: {
          email: alert.email
        },
        content: {
          subject: 'Your Price Alert Has Expired',
          template: 'alertExpiringEmailTemplate',
          variables: {
            main: {
              alertSummary: alert.summary || this.generateAlertSummary(alert),
              timeRemaining: 'Expired',
              expiresAt: new Date(alert.expiresAt).toLocaleDateString(),
              currentPrice: alert.currentBestPrice ? 
                `$${alert.currentBestPrice.amount.toFixed(2)}` : null,
              extendAlertUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${alert._id}/extend`,
              unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${alert._id}/unsubscribe`
            },
            branding: {
              logoImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
              currentYear: new Date().getFullYear()
            },
            currentDate: new Date().toLocaleDateString()
          }
        },
        priority: 'normal',
        scheduledAt: new Date()
      };

      await this.notificationService.sendNotification(notificationData);
    } catch (error) {
      console.error('Error sending expiration notification:', error);
      // Don't throw here as this is not critical
    }
  }

  /**
   * Extend an alert's expiration date
   * @param {string} alertId - Alert ID
   * @param {number} extensionDays - Number of days to extend (optional)
   * @param {string} reason - Reason for extension
   * @returns {Object} Updated alert
   */
  async extendAlert(alertId, extensionDays = null, reason = 'user_request') {
    try {
      const alert = await getManyDocs("PriceAlert", { _id: alertId });
      if (!alert || alert.length === 0) {
        throw new Error('Alert not found');
      }

      const alertData = alert[0];
      
      // Check if alert can be extended
      const extensionCount = alertData.metadata?.extensionCount || 0;
      if (extensionCount >= this.options.maxExtensions) {
        throw new Error(`Maximum extensions (${this.options.maxExtensions}) reached`);
      }

      // Calculate new expiration date
      const days = extensionDays || this.options.defaultExtensionDays;
      const currentExpiresAt = new Date(alertData.expiresAt);
      const newExpiresAt = new Date(currentExpiresAt.getTime() + (days * 24 * 60 * 60 * 1000));

      // Update alert
      const updatedAlert = await updateOneDoc("PriceAlert", alertId, {
        $set: {
          status: 'active',
          expiresAt: newExpiresAt,
          'metadata.extendedAt': new Date(),
          'metadata.extensionReason': reason,
          'metadata.extensionCount': extensionCount + 1
        }
      });

      // Send confirmation notification
      await this.sendExtensionConfirmation(alertData, days);

      return updatedAlert;
    } catch (error) {
      console.error('Error extending alert:', error);
      throw error;
    }
  }

  /**
   * Send confirmation notification for alert extension
   * @param {Object} alert - Alert object
   * @param {number} days - Number of days extended
   */
  async sendExtensionConfirmation(alert, days) {
    try {
      const notificationData = {
        userId: alert.userId,
        type: 'price_alert_created',
        recipient: {
          email: alert.email
        },
        content: {
          subject: 'Price Alert Extended',
          template: 'priceAlertEmailTemplate',
          variables: {
            main: {
              alertSummary: alert.summary || this.generateAlertSummary(alert),
              flightDetails: {
                route: alert.searchCriteria.route,
                departureDate: alert.searchCriteria.departureDate,
                passengers: alert.searchCriteria.passengers,
                cabinClass: alert.searchCriteria.cabinClass
              },
              currentPrice: alert.currentBestPrice ? 
                `$${alert.currentBestPrice.amount.toFixed(2)}` : null,
              manageAlertsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts`,
              unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${alert._id}/unsubscribe`,
              createdAt: new Date().toLocaleDateString()
            },
            branding: {
              logoImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
              currentYear: new Date().getFullYear()
            }
          }
        },
        priority: 'normal',
        scheduledAt: new Date()
      };

      await this.notificationService.sendNotification(notificationData);
    } catch (error) {
      console.error('Error sending extension confirmation:', error);
      // Don't throw here as this is not critical
    }
  }

  /**
   * Schedule cleanup of expired alert
   * @param {string} alertId - Alert ID
   */
  async scheduleCleanup(alertId) {
    try {
      const cleanupDate = new Date();
      cleanupDate.setDate(cleanupDate.getDate() + this.options.cleanupDelayDays);

      // In a real implementation, this would use a job scheduler
      // For now, we'll just log it
      console.log(`Scheduled cleanup for alert ${alertId} on ${cleanupDate.toISOString()}`);
    } catch (error) {
      console.error('Error scheduling cleanup:', error);
    }
  }

  /**
   * Clean up expired alerts
   * @returns {Object} Cleanup results
   */
  async cleanupExpiredAlerts() {
    try {
      const results = {
        alertsDeleted: 0,
        errors: []
      };

      // Find alerts that expired beyond the cleanup delay
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.cleanupDelayDays);

      const expiredAlerts = await getManyDocs("PriceAlert", {
        status: 'expired',
        'metadata.expiredAt': { $lte: cutoffDate }
      });

      for (const alert of expiredAlerts) {
        try {
          // In a real implementation, this would delete the alert
          // For now, we'll just mark it as cleaned up
          await updateOneDoc("PriceAlert", alert._id, {
            $set: {
              status: 'deleted',
              'metadata.cleanedUpAt': new Date()
            }
          });
          
          results.alertsDeleted++;
        } catch (error) {
          console.error(`Error cleaning up alert ${alert._id}:`, error);
          results.errors.push({
            alertId: alert._id,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error cleaning up expired alerts:', error);
      throw error;
    }
  }

  /**
   * Get expiration statistics
   * @returns {Object} Expiration statistics
   */
  async getExpirationStats() {
    try {
      const now = new Date();
      
      // Get counts by status
      const activeAlerts = await getManyDocs("PriceAlert", { status: 'active' });
      const expiredAlerts = await getManyDocs("PriceAlert", { status: 'expired' });
      
      // Count alerts expiring soon
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      const expiringSoon = activeAlerts.filter(alert => 
        new Date(alert.expiresAt) <= sevenDaysFromNow
      );

      // Count expired alerts ready for cleanup
      const cutoffDate = new Date(now.getTime() - (this.options.cleanupDelayDays * 24 * 60 * 60 * 1000));
      const readyForCleanup = expiredAlerts.filter(alert =>
        new Date(alert.metadata?.expiredAt) <= cutoffDate
      );

      return {
        active: activeAlerts.length,
        expired: expiredAlerts.length,
        expiringSoon: expiringSoon.length,
        readyForCleanup: readyForCleanup.length,
        warningPeriods: this.options.warningPeriods,
        cleanupDelayDays: this.options.cleanupDelayDays
      };
    } catch (error) {
      console.error('Error getting expiration stats:', error);
      throw error;
    }
  }

  /**
   * Generate alert summary
   * @param {Object} alert - Alert object
   * @returns {string} Alert summary
   */
  generateAlertSummary(alert) {
    const { origin, destination } = alert.searchCriteria.route || {};
    return `${origin?.airportCode} → ${destination?.airportCode}`;
  }
}

// Singleton instance
let alertExpirationServiceInstance = null;

/**
 * Get or create alert expiration service instance
 * @param {Object} options - Configuration options
 * @returns {AlertExpirationService} Service instance
 */
export function getAlertExpirationService(options) {
  if (!alertExpirationServiceInstance) {
    alertExpirationServiceInstance = new AlertExpirationService(options);
  }
  return alertExpirationServiceInstance;
}

/**
 * Check for expiring alerts (convenience function)
 */
export async function checkExpiringAlerts() {
  const service = getAlertExpirationService();
  return await service.checkExpiringAlerts();
}

/**
 * Extend an alert (convenience function)
 * @param {string} alertId - Alert ID
 * @param {number} extensionDays - Number of days to extend
 * @param {string} reason - Reason for extension
 */
export async function extendAlert(alertId, extensionDays, reason) {
  const service = getAlertExpirationService();
  return await service.extendAlert(alertId, extensionDays, reason);
}

/**
 * Clean up expired alerts (convenience function)
 */
export async function cleanupExpiredAlerts() {
  const service = getAlertExpirationService();
  return await service.cleanupExpiredAlerts();
}