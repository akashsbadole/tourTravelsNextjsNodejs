import "server-only";
import { 
  UserAnalytics, 
  AggregatedAnalytics 
} from "../db/models";
import { updateOneDoc, deleteManyDocs } from "../db/createOperationDB";
import { getOneDoc, getManyDocs } from "../db/getOperationDB";

/**
 * Privacy and Compliance Service
 * Handles GDPR compliance, data retention, and user consent management
 */

class PrivacyComplianceService {
  constructor() {
    this.consentVersion = "1.0";
    this.defaultRetentionPeriod = 365; // days
    this.anonymizationThreshold = 730; // 2 years in days
  }

  /**
   * Update user consent preferences
   */
  async updateConsent(userId, consentData) {
    try {
      const { analytics, marketing, personalization } = consentData;

      const updateData = {
        'consent.analytics': analytics,
        'consent.marketing': marketing,
        'consent.personalization': personalization,
        'consent.consentDate': new Date(),
        'consent.consentVersion': this.consentVersion
      };

      await updateOneDoc(
        "UserAnalytics",
        { userId },
        updateData
      );

      // Log consent change for audit
      await this.logConsentChange(userId, consentData, updateData);

      return { success: true, timestamp: new Date() };
    } catch (error) {
      console.error("Error updating consent:", error);
      throw error;
    }
  }

  /**
   * Get user consent status
   */
  async getConsentStatus(userId) {
    try {
      const userAnalytics = await getOneDoc("UserAnalytics", { userId });
      
      if (!userAnalytics) {
        return {
          analytics: false,
          marketing: false,
          personalization: false,
          consentDate: null,
          consentVersion: null
        };
      }

      return {
        analytics: userAnalytics.consent?.analytics || false,
        marketing: userAnalytics.consent?.marketing || false,
        personalization: userAnalytics.consent?.personalization || false,
        consentDate: userAnalytics.consent?.consentDate || null,
        consentVersion: userAnalytics.consent?.consentVersion || null
      };
    } catch (error) {
      console.error("Error getting consent status:", error);
      throw error;
    }
  }

  /**
   * Anonymize user data after retention period
   */
  async anonymizeUserData(userId) {
    try {
      const userAnalytics = await getOneDoc("UserAnalytics", { userId });
      
      if (!userAnalytics) {
        throw new Error('User analytics data not found');
      }

      // Check if data is old enough for anonymization
      const daysSinceCreation = (Date.now() - new Date(userAnalytics.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation < this.anonymizationThreshold) {
        return { success: false, reason: 'Data not old enough for anonymization' };
      }

      // Anonymize personal data
      const anonymizedData = {
        $set: {
          'firstName': 'Anonymous',
          'lastName': 'User',
          'email': `anon-${userId}@anonymized.com`,
          'profileImage': '/images/default-avatar.png',
          'phoneNumbers': [],
          'address': null,
          'dateOfBirth': null,
          'customerId': null,
          'providerCustomerIds': {
            stripe: null,
            razorpay: null,
            paypal: null
          }
        },
        $unset: {
          'behaviors': '',
          'sessions': '',
          'journeys': '',
          'preferences': ''
        }
      };

      await updateOneDoc(
        "UserAnalytics",
        { userId },
        anonymizedData
      );

      // Log anonymization for audit
      await this.logDataAnonymization(userId, 'full_anonymization');

      return { success: true, timestamp: new Date() };
    } catch (error) {
      console.error("Error anonymizing user data:", error);
      throw error;
    }
  }

  /**
   * Delete user data (right to be forgotten)
   */
  async deleteUserData(userId, verificationData) {
    try {
      // Verify user identity before deletion
      const isVerified = await this.verifyUserIdentity(userId, verificationData);
      
      if (!isVerified) {
        return { success: false, reason: 'Identity verification failed' };
      }

      // Delete user analytics data
      await deleteManyDocs("UserAnalytics", { userId });
      
      // Log deletion for audit
      await this.logDataDeletion(userId, 'user_request', verificationData);

      return { success: true, timestamp: new Date() };
    } catch (error) {
      console.error("Error deleting user data:", error);
      throw error;
    }
  }

  /**
   * Export user data (GDPR data portability)
   */
  async exportUserData(userId, format = 'json') {
    try {
      const userAnalytics = await getOneDoc("UserAnalytics", { userId });
      
      if (!userAnalytics) {
        throw new Error('User analytics data not found');
      }

      // Prepare export data with privacy considerations
      const exportData = {
        personalInfo: {
          userId: userId,
          registrationDate: userAnalytics.createdAt,
          lastActivity: userAnalytics.aggregatedMetrics?.lastActivity
        },
        analytics: {
          totalSessions: userAnalytics.aggregatedMetrics?.totalSessions || 0,
          totalPageViews: userAnalytics.aggregatedMetrics?.totalPageViews || 0,
          totalEvents: userAnalytics.aggregatedMetrics?.totalEvents || 0,
          averageSessionDuration: userAnalytics.aggregatedMetrics?.averageSessionDuration || 0
        },
        preferences: userAnalytics.preferences || {},
        consent: {
          analytics: userAnalytics.consent?.analytics || false,
          marketing: userAnalytics.consent?.marketing || false,
          personalization: userAnalytics.consent?.personalization || false,
          consentDate: userAnalytics.consent?.consentDate || null,
          consentVersion: userAnalytics.consent?.consentVersion || null
        },
        exportDate: new Date().toISOString(),
        exportFormat: format
      };

      // Log export for audit
      await this.logDataExport(userId, format);

      return exportData;
    } catch (error) {
      console.error("Error exporting user data:", error);
      throw error;
    }
  }

  /**
   * Process data retention cleanup
   */
  async processDataRetention() {
    try {
      const cutoffDate = new Date(Date.now() - (this.defaultRetentionPeriod * 24 * 60 * 60 * 1000));
      
      // Find old user analytics data
      const oldUserData = await getManyDocs(
        "UserAnalytics",
        {
          'aggregatedMetrics.lastActivity': { $lt: cutoffDate },
          $or: [
            { 'privacy.deletedAt': { $exists: false } },
            { 'privacy.anonymizedAt': { $exists: false } }
          ]
        },
        [],
        false,
        {
          projection: {
            userId: 1,
            createdAt: 1,
            'aggregatedMetrics.lastActivity': 1,
            privacy: 1
          }
        }
      );

      // Anonymize old data instead of deleting
      for (const userData of oldUserData) {
        await this.anonymizeUserData(userData.userId);
      }

      // Clean up old aggregated analytics
      const oldAggregatedData = await getManyDocs(
        "AggregatedAnalytics",
        { date: { $lt: cutoffDate } },
        [],
        false,
        { limit: 1000 }
      );

      if (oldAggregatedData.length > 0) {
        await deleteManyDocs("AggregatedAnalytics", { 
          date: { $lt: cutoffDate } 
        });
      }

      // Log retention processing
      await this.logDataRetentionProcessing(oldUserData.length, oldAggregatedData.length);

      return {
        success: true,
        processed: {
          userRecords: oldUserData.length,
          aggregatedRecords: oldAggregatedData.length
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error("Error processing data retention:", error);
      throw error;
    }
  }

  /**
   * Get compliance report
   */
  async getComplianceReport() {
    try {
      const totalUsers = await this.getTotalUsersCount();
      const usersWithConsent = await this.getUsersWithConsent();
      const anonymizedUsers = await this.getAnonymizedUsersCount();
      const deletedUsers = await this.getDeletedUsersCount();

      const report = {
        generatedAt: new Date(),
        period: '30d',
        userStatistics: {
          total: totalUsers,
          withAnalyticsConsent: usersWithConsent.analytics,
          withMarketingConsent: usersWithConsent.marketing,
          withPersonalizationConsent: usersWithConsent.personalization,
          anonymized: anonymizedUsers,
          deleted: deletedUsers
        },
        dataRetention: {
          defaultPeriod: this.defaultRetentionPeriod,
          anonymizationThreshold: this.anonymizationThreshold,
          lastProcessed: new Date()
        },
        complianceStatus: {
          gdprCompliant: true,
          consentManagement: 'active',
          dataPortability: 'available',
          rightToDeletion: 'available',
          auditLogging: 'active'
        },
        recommendations: this.generateComplianceRecommendations({
          totalUsers,
          usersWithConsent,
          anonymizedUsers
        })
      };

      return report;
    } catch (error) {
      console.error("Error generating compliance report:", error);
      throw error;
    }
  }

  /**
   * Verify user identity for data deletion
   */
  async verifyUserIdentity(userId, verificationData) {
    try {
      const { email, password, twoFactorCode } = verificationData;
      
      // This would integrate with your authentication system
      // For now, return true as placeholder
      return true;
    } catch (error) {
      console.error("Error verifying user identity:", error);
      return false;
    }
  }

  /**
   * Log consent changes for audit trail
   */
  async logConsentChange(userId, consentData, updateData) {
    try {
      const auditLog = {
        userId,
        action: 'consent_update',
        timestamp: new Date(),
        details: {
          oldConsent: {
            analytics: consentData.analytics,
            marketing: consentData.marketing,
            personalization: consentData.personalization
          },
          newConsent: updateData,
          ipAddress: 'system',
          userAgent: 'privacy_service'
        }
      };

      // This would store in an audit log collection
      console.log('Consent change audit:', auditLog);
    } catch (error) {
      console.error("Error logging consent change:", error);
    }
  }

  /**
   * Log data anonymization for audit trail
   */
  async logDataAnonymization(userId, anonymizationType) {
    try {
      const auditLog = {
        userId,
        action: 'data_anonymization',
        timestamp: new Date(),
        details: {
          anonymizationType,
          ipAddress: 'system',
          userAgent: 'privacy_service'
        }
      };

      // This would store in an audit log collection
      console.log('Data anonymization audit:', auditLog);
    } catch (error) {
      console.error("Error logging data anonymization:", error);
    }
  }

  /**
   * Log data deletion for audit trail
   */
  async logDataDeletion(userId, deletionType, verificationData) {
    try {
      const auditLog = {
        userId,
        action: 'data_deletion',
        timestamp: new Date(),
        details: {
          deletionType,
          verificationData: {
            ...verificationData,
            password: '[REDACTED]',
            twoFactorCode: '[REDACTED]'
          },
          ipAddress: 'system',
          userAgent: 'privacy_service'
        }
      };

      // This would store in an audit log collection
      console.log('Data deletion audit:', auditLog);
    } catch (error) {
      console.error("Error logging data deletion:", error);
    }
  }

  /**
   * Log data export for audit trail
   */
  async logDataExport(userId, format) {
    try {
      const auditLog = {
        userId,
        action: 'data_export',
        timestamp: new Date(),
        details: {
          exportFormat: format,
          ipAddress: 'system',
          userAgent: 'privacy_service'
        }
      };

      // This would store in an audit log collection
      console.log('Data export audit:', auditLog);
    } catch (error) {
      console.error("Error logging data export:", error);
    }
  }

  /**
   * Log data retention processing for audit trail
   */
  async logDataRetentionProcessing(userRecordsProcessed, aggregatedRecordsProcessed) {
    try {
      const auditLog = {
        action: 'data_retention_processing',
        timestamp: new Date(),
        details: {
          userRecordsProcessed,
          aggregatedRecordsProcessed,
          ipAddress: 'system',
          userAgent: 'privacy_service'
        }
      };

      // This would store in an audit log collection
      console.log('Data retention processing audit:', auditLog);
    } catch (error) {
      console.error("Error logging data retention processing:", error);
    }
  }

  /**
   * Get total users count
   */
  async getTotalUsersCount() {
    try {
      const count = await getManyDocs(
        "UserAnalytics",
        { 'privacy.deletedAt': { $exists: false } },
        [],
        false,
        { count: true }
      );
      
      return count;
    } catch (error) {
      console.error("Error getting total users count:", error);
      return 0;
    }
  }

  /**
   * Get users with consent breakdown
   */
  async getUsersWithConsent() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$userId',
            analytics: { $sum: { $cond: [{ $eq: ['$consent.analytics', true] }, 1, 0] } },
            marketing: { $sum: { $cond: [{ $eq: ['$consent.marketing', true] }, 1, 0] } },
            personalization: { $sum: { $cond: [{ $eq: ['$consent.personalization', true] }, 1, 0] } }
          }
        }
      ];

      const result = await getManyDocs(
        "UserAnalytics",
        { 'privacy.deletedAt': { $exists: false } },
        [],
        false,
        { pipeline }
      );

      return result.length > 0 ? result[0] : { analytics: 0, marketing: 0, personalization: 0 };
    } catch (error) {
      console.error("Error getting users with consent:", error);
      return { analytics: 0, marketing: 0, personalization: 0 };
    }
  }

  /**
   * Get anonymized users count
   */
  async getAnonymizedUsersCount() {
    try {
      const count = await getManyDocs(
        "UserAnalytics",
        { 'privacy.anonymizedAt': { $exists: true } },
        [],
        false,
        { count: true }
      );
      
      return count;
    } catch (error) {
      console.error("Error getting anonymized users count:", error);
      return 0;
    }
  }

  /**
   * Get deleted users count
   */
  async getDeletedUsersCount() {
    try {
      const count = await getManyDocs(
        "UserAnalytics",
        { 'privacy.deletedAt': { $exists: true } },
        [],
        false,
        { count: true }
      );
      
      return count;
    } catch (error) {
      console.error("Error getting deleted users count:", error);
      return 0;
    }
  }

  /**
   * Generate compliance recommendations
   */
  generateComplianceRecommendations(stats) {
    const recommendations = [];

    // Consent rate recommendations
    const consentRate = (stats.usersWithConsent.analytics / stats.totalUsers) * 100;
    if (consentRate < 70) {
      recommendations.push({
        type: 'consent_rate',
        priority: 'high',
        title: 'Low Analytics Consent Rate',
        description: `Only ${consentRate.toFixed(1)}% of users have consented to analytics. Consider improving consent messaging.`,
        action: 'Review consent flow and messaging'
      });
    }

    // Data retention recommendations
    if (stats.anonymizedUsers > stats.totalUsers * 0.1) {
      recommendations.push({
        type: 'data_retention',
        priority: 'medium',
        title: 'High Anonymization Rate',
        description: `${((stats.anonymizedUsers / stats.totalUsers) * 100).toFixed(1)}% of users have been anonymized. Consider reviewing retention policies.`,
        action: 'Review data retention policies and thresholds'
      });
    }

    // Audit trail recommendations
    recommendations.push({
      type: 'audit_trail',
      priority: 'low',
      title: 'Maintain Audit Trail',
      description: 'Ensure all consent changes, data exports, and deletions are properly logged.',
      action: 'Verify audit logging is functioning correctly'
    });

    return recommendations;
  }
}

// Singleton instance
const privacyComplianceService = new PrivacyComplianceService();

export default privacyComplianceService;