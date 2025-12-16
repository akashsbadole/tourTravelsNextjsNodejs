import { getManyDocs, createDoc, updateOneDoc } from "@/lib/db/operations";

/**
 * Alert Analytics Service
 * Provides analytics and reporting for price alerts
 */
export class AlertAnalyticsService {
  constructor(options = {}) {
    this.options = {
      // Cache duration in milliseconds
      cacheDuration: 5 * 60 * 1000, // 5 minutes
      // Default time ranges for analytics
      defaultTimeRanges: {
        week: 7,
        month: 30,
        quarter: 90,
        year: 365
      },
      ...options
    };
    
    this.cache = new Map();
  }

  /**
   * Get comprehensive alert analytics for a user
   * @param {string} userId - User ID
   * @param {Object} options - Analytics options
   * @returns {Object} Alert analytics data
   */
  async getUserAlertAnalytics(userId, options = {}) {
    try {
      const {
        timeRange = 'month',
        includeDetails = false,
        includeHistory = false
      } = options;

      // Check cache first
      const cacheKey = `user_analytics_${userId}_${timeRange}_${includeDetails}_${includeHistory}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.options.cacheDuration) {
          return cached.data;
        }
      }

      // Get user's alerts
      const alerts = await getManyDocs("PriceAlert", { userId });
      
      // Calculate basic metrics
      const analytics = {
        overview: await this.getAlertOverview(alerts),
        performance: await this.getAlertPerformance(alerts, timeRange),
        trends: await this.getAlertTrends(alerts, timeRange),
        routes: await this.getRouteAnalytics(alerts),
        notifications: await this.getNotificationAnalytics(alerts, timeRange),
        savings: await this.getSavingsAnalytics(alerts, timeRange)
      };

      // Add detailed data if requested
      if (includeDetails) {
        analytics.details = {
          activeAlerts: alerts.filter(a => a.status === 'active'),
          triggeredAlerts: alerts.filter(a => a.status === 'triggered'),
          expiredAlerts: alerts.filter(a => a.status === 'expired')
        };
      }

      // Add historical data if requested
      if (includeHistory) {
        analytics.history = await this.getHistoricalAnalytics(userId, timeRange);
      }

      // Cache the results
      this.cache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      return analytics;
    } catch (error) {
      console.error('Error getting user alert analytics:', error);
      throw error;
    }
  }

  /**
   * Get alert overview metrics
   * @param {Array} alerts - Array of alert objects
   * @returns {Object} Overview metrics
   */
  async getAlertOverview(alerts) {
    try {
      const total = alerts.length;
      const active = alerts.filter(a => a.status === 'active').length;
      const triggered = alerts.filter(a => a.status === 'triggered').length;
      const expired = alerts.filter(a => a.status === 'expired').length;
      const paused = alerts.filter(a => a.status === 'paused').length;

      // Calculate success rate
      const successRate = total > 0 ? (triggered / total) * 100 : 0;

      // Get average time to trigger
      const triggeredAlerts = alerts.filter(a => a.status === 'triggered' && a.triggeredAt);
      const avgTimeToTrigger = triggeredAlerts.length > 0 
        ? triggeredAlerts.reduce((sum, alert) => {
            const created = new Date(alert.createdAt);
            const triggered = new Date(alert.triggeredAt);
            return sum + (triggered - created);
          }, 0) / triggeredAlerts.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      return {
        total,
        active,
        triggered,
        expired,
        paused,
        successRate: Math.round(successRate * 100) / 100,
        avgTimeToTrigger: Math.round(avgTimeToTrigger * 100) / 100,
        statusDistribution: {
          active: (active / total) * 100,
          triggered: (triggered / total) * 100,
          expired: (expired / total) * 100,
          paused: (paused / total) * 100
        }
      };
    } catch (error) {
      console.error('Error getting alert overview:', error);
      return {
        total: 0,
        active: 0,
        triggered: 0,
        expired: 0,
        paused: 0,
        successRate: 0,
        avgTimeToTrigger: 0,
        statusDistribution: {}
      };
    }
  }

  /**
   * Get alert performance metrics
   * @param {Array} alerts - Array of alert objects
   * @param {string} timeRange - Time range (week, month, quarter, year)
   * @returns {Object} Performance metrics
   */
  async getAlertPerformance(alerts, timeRange) {
    try {
      const days = this.options.defaultTimeRanges[timeRange] || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Filter alerts within time range
      const recentAlerts = alerts.filter(alert => 
        new Date(alert.createdAt) >= cutoffDate
      );

      const recentTriggered = recentAlerts.filter(a => 
        a.status === 'triggered' && 
        a.triggeredAt && 
        new Date(a.triggeredAt) >= cutoffDate
      );

      // Calculate trigger rate
      const triggerRate = recentAlerts.length > 0 
        ? (recentTriggered.length / recentAlerts.length) * 100 
        : 0;

      // Get notification data for triggered alerts
      const notificationIds = recentTriggered
        .flatMap(alert => alert.notificationHistory || [])
        .map(n => n.notificationId);

      const notifications = notificationIds.length > 0 
        ? await getManyDocs("NotificationTracking", { 
            notificationId: { $in: notificationIds }
          })
        : [];

      // Calculate delivery metrics
      const delivered = notifications.filter(n => 
        n.delivery.some(d => d.status === 'delivered')
      ).length;

      const opened = notifications.filter(n => 
        n.metrics.engagement.opened
      ).length;

      const clicked = notifications.filter(n => 
        n.metrics.engagement.clicked
      ).length;

      const deliveryRate = notifications.length > 0 ? (delivered / notifications.length) * 100 : 0;
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
      const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;

      return {
        timeRange,
        totalAlerts: recentAlerts.length,
        triggeredAlerts: recentTriggered.length,
        triggerRate: Math.round(triggerRate * 100) / 100,
        notifications: {
          sent: notifications.length,
          delivered,
          opened,
          clicked,
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100
        }
      };
    } catch (error) {
      console.error('Error getting alert performance:', error);
      return {
        timeRange,
        totalAlerts: 0,
        triggeredAlerts: 0,
        triggerRate: 0,
        notifications: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0
        }
      };
    }
  }

  /**
   * Get alert trends over time
   * @param {Array} alerts - Array of alert objects
   * @param {string} timeRange - Time range (week, month, quarter, year)
   * @returns {Object} Trend data
   */
  async getAlertTrends(alerts, timeRange) {
    try {
      const days = this.options.defaultTimeRanges[timeRange] || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Filter alerts within time range
      const recentAlerts = alerts.filter(alert => 
        new Date(alert.createdAt) >= cutoffDate
      );

      // Group by day/week/month based on time range
      const groupBy = this.getGroupingPeriod(timeRange);
      const groupedData = this.groupAlertsByPeriod(recentAlerts, groupBy, cutoffDate);

      // Calculate trend metrics
      const trendMetrics = this.calculateTrendMetrics(groupedData);

      return {
        timeRange,
        groupBy,
        data: groupedData,
        metrics: trendMetrics
      };
    } catch (error) {
      console.error('Error getting alert trends:', error);
      return {
        timeRange,
        groupBy: 'day',
        data: [],
        metrics: {
          direction: 'stable',
          changeRate: 0,
          confidence: 0
        }
      };
    }
  }

  /**
   * Get route-specific analytics
   * @param {Array} alerts - Array of alert objects
   * @returns {Object} Route analytics
   */
  async getRouteAnalytics(alerts) {
    try {
      // Group alerts by route
      const routeGroups = {};
      
      for (const alert of alerts) {
        const routeKey = this.getRouteKey(alert.searchCriteria);
        if (!routeGroups[routeKey]) {
          routeGroups[routeKey] = {
            route: {
              origin: alert.searchCriteria.origin,
              destination: alert.searchCriteria.destination
            },
            alerts: [],
            totalSavings: 0,
            triggerCount: 0
          };
        }
        
        routeGroups[routeKey].alerts.push(alert);
        
        if (alert.status === 'triggered' && alert.priceChange?.amount) {
          routeGroups[routeKey].triggerCount++;
          routeGroups[routeKey].totalSavings += alert.priceChange.amount;
        }
      }

      // Calculate metrics for each route
      const routeAnalytics = Object.values(routeGroups).map(route => {
        const total = route.alerts.length;
        const triggered = route.triggerCount;
        const successRate = total > 0 ? (triggered / total) * 100 : 0;
        const avgSavings = triggered > 0 ? route.totalSavings / triggered : 0;

        return {
          route: route.route,
          totalAlerts: total,
          triggeredAlerts: triggered,
          successRate: Math.round(successRate * 100) / 100,
          totalSavings: Math.round(route.totalSavings * 100) / 100,
          avgSavings: Math.round(avgSavings * 100) / 100
        };
      });

      // Sort by total savings
      routeAnalytics.sort((a, b) => b.totalSavings - a.totalSavings);

      return {
        routes: routeAnalytics,
        topRoutes: routeAnalytics.slice(0, 5),
        totalRoutes: routeAnalytics.length
      };
    } catch (error) {
      console.error('Error getting route analytics:', error);
      return {
        routes: [],
        topRoutes: [],
        totalRoutes: 0
      };
    }
  }

  /**
   * Get notification analytics
   * @param {Array} alerts - Array of alert objects
   * @param {string} timeRange - Time range
   * @returns {Object} Notification analytics
   */
  async getNotificationAnalytics(alerts, timeRange) {
    try {
      const days = this.options.defaultTimeRanges[timeRange] || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get notification IDs from alerts
      const notificationIds = alerts
        .flatMap(alert => alert.notificationHistory || [])
        .map(n => n.notificationId)
        .filter(id => id); // Filter out null/undefined

      if (notificationIds.length === 0) {
        return {
          total: 0,
          byChannel: {},
          byType: {},
          deliveryMetrics: {
            sent: 0,
            delivered: 0,
            failed: 0,
            deliveryRate: 0
          },
          engagementMetrics: {
            opened: 0,
            clicked: 0,
            openRate: 0,
            clickRate: 0
          }
        };
      }

      // Get notifications
      const notifications = await getManyDocs("NotificationTracking", { 
        notificationId: { $in: notificationIds },
        createdAt: { $gte: cutoffDate }
      });

      // Group by channel
      const byChannel = {};
      notifications.forEach(notification => {
        notification.delivery.forEach(delivery => {
          if (!byChannel[delivery.channel]) {
            byChannel[delivery.channel] = {
              sent: 0,
              delivered: 0,
              failed: 0
            };
          }
          
          byChannel[delivery.channel].sent++;
          
          if (delivery.status === 'delivered') {
            byChannel[delivery.channel].delivered++;
          } else if (delivery.status === 'failed') {
            byChannel[delivery.channel].failed++;
          }
        });
      });

      // Group by type
      const byType = {};
      notifications.forEach(notification => {
        if (!byType[notification.type]) {
          byType[notification.type] = 0;
        }
        byType[notification.type]++;
      });

      // Calculate delivery metrics
      const totalDelivered = notifications.filter(n => 
        n.delivery.some(d => d.status === 'delivered')
      ).length;

      const totalFailed = notifications.filter(n => 
        n.delivery.some(d => d.status === 'failed')
      ).length;

      const deliveryRate = notifications.length > 0 
        ? (totalDelivered / notifications.length) * 100 
        : 0;

      // Calculate engagement metrics
      const opened = notifications.filter(n => n.metrics.engagement.opened).length;
      const clicked = notifications.filter(n => n.metrics.engagement.clicked).length;
      
      const openRate = totalDelivered > 0 ? (opened / totalDelivered) * 100 : 0;
      const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;

      return {
        total: notifications.length,
        byChannel,
        byType,
        deliveryMetrics: {
          sent: notifications.length,
          delivered: totalDelivered,
          failed: totalFailed,
          deliveryRate: Math.round(deliveryRate * 100) / 100
        },
        engagementMetrics: {
          opened,
          clicked,
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100
        }
      };
    } catch (error) {
      console.error('Error getting notification analytics:', error);
      return {
        total: 0,
        byChannel: {},
        byType: {},
        deliveryMetrics: {
          sent: 0,
          delivered: 0,
          failed: 0,
          deliveryRate: 0
        },
        engagementMetrics: {
          opened: 0,
          clicked: 0,
          openRate: 0,
          clickRate: 0
        }
      };
    }
  }

  /**
   * Get savings analytics
   * @param {Array} alerts - Array of alert objects
   * @param {string} timeRange - Time range
   * @returns {Object} Savings analytics
   */
  async getSavingsAnalytics(alerts, timeRange) {
    try {
      const days = this.options.defaultTimeRanges[timeRange] || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Filter triggered alerts within time range
      const triggeredAlerts = alerts.filter(alert => 
        alert.status === 'triggered' &&
        alert.triggeredAt &&
        new Date(alert.triggeredAt) >= cutoffDate &&
        alert.priceChange?.amount > 0
      );

      // Calculate total and average savings
      const totalSavings = triggeredAlerts.reduce((sum, alert) => 
        sum + alert.priceChange.amount, 0
      );

      const avgSavings = triggeredAlerts.length > 0 
        ? totalSavings / triggeredAlerts.length 
        : 0;

      // Calculate savings by route
      const savingsByRoute = {};
      triggeredAlerts.forEach(alert => {
        const routeKey = this.getRouteKey(alert.searchCriteria);
        if (!savingsByRoute[routeKey]) {
          savingsByRoute[routeKey] = {
            route: {
              origin: alert.searchCriteria.origin,
              destination: alert.searchCriteria.destination
            },
            totalSavings: 0,
            count: 0
          };
        }
        
        savingsByRoute[routeKey].totalSavings += alert.priceChange.amount;
        savingsByRoute[routeKey].count++;
      });

      // Calculate savings by condition type
      const savingsByCondition = {};
      triggeredAlerts.forEach(alert => {
        if (alert.lastTrigger?.condition) {
          const condition = alert.lastTrigger.condition;
          if (!savingsByCondition[condition]) {
            savingsByCondition[condition] = {
              totalSavings: 0,
              count: 0
            };
          }
          
          savingsByCondition[condition].totalSavings += alert.priceChange.amount;
          savingsByCondition[condition].count++;
        }
      });

      // Sort routes by savings
      const topRoutes = Object.values(savingsByRoute)
        .sort((a, b) => b.totalSavings - a.totalSavings)
        .slice(0, 5);

      return {
        timeRange,
        totalSavings: Math.round(totalSavings * 100) / 100,
        avgSavings: Math.round(avgSavings * 100) / 100,
        alertsWithSavings: triggeredAlerts.length,
        savingsByRoute: Object.values(savingsByRoute)
          .sort((a, b) => b.totalSavings - a.totalSavings),
        topRoutes,
        savingsByCondition
      };
    } catch (error) {
      console.error('Error getting savings analytics:', error);
      return {
        timeRange,
        totalSavings: 0,
        avgSavings: 0,
        alertsWithSavings: 0,
        savingsByRoute: [],
        topRoutes: [],
        savingsByCondition: {}
      };
    }
  }

  /**
   * Get historical analytics for a user
   * @param {string} userId - User ID
   * @param {string} timeRange - Time range
   * @returns {Object} Historical analytics
   */
  async getHistoricalAnalytics(userId, timeRange) {
    try {
      const days = this.options.defaultTimeRanges[timeRange] || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get analytics snapshots (would be stored periodically)
      const snapshots = await getManyDocs("AlertAnalyticsSnapshot", {
        userId,
        date: { $gte: cutoffDate }
      }, [], { sort: { date: 1 } });

      return {
        snapshots,
        trend: this.calculateHistoricalTrend(snapshots)
      };
    } catch (error) {
      console.error('Error getting historical analytics:', error);
      return {
        snapshots: [],
        trend: {
          direction: 'stable',
          changeRate: 0
        }
      };
    }
  }

  /**
   * Get route key from search criteria
   * @param {Object} searchCriteria - Search criteria object
   * @returns {string} Route key
   */
  getRouteKey(searchCriteria) {
    const { origin, destination } = searchCriteria.route || {};
    return `${origin?.airportCode}-${destination?.airportCode}`;
  }

  /**
   * Get grouping period based on time range
   * @param {string} timeRange - Time range
   * @returns {string} Grouping period
   */
  getGroupingPeriod(timeRange) {
    switch (timeRange) {
      case 'week':
        return 'day';
      case 'month':
        return 'day';
      case 'quarter':
        return 'week';
      case 'year':
        return 'month';
      default:
        return 'day';
    }
  }

  /**
   * Group alerts by time period
   * @param {Array} alerts - Array of alert objects
   * @param {string} period - Grouping period
   * @param {Date} cutoffDate - Cutoff date
   * @returns {Array} Grouped data
   */
  groupAlertsByPeriod(alerts, period, cutoffDate) {
    const grouped = {};
    
    alerts.forEach(alert => {
      const date = new Date(alert.createdAt);
      const key = this.getPeriodKey(date, period);
      
      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          date: date,
          created: 0,
          triggered: 0
        };
      }
      
      grouped[key].created++;
      
      if (alert.status === 'triggered') {
        grouped[key].triggered++;
      }
    });
    
    return Object.values(grouped).sort((a, b) => a.date - b.date);
  }

  /**
   * Get period key for date
   * @param {Date} date - Date
   * @param {string} period - Period type
   * @returns {string} Period key
   */
  getPeriodKey(date, period) {
    switch (period) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'month':
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  /**
   * Calculate trend metrics
   * @param {Array} data - Grouped data
   * @returns {Object} Trend metrics
   */
  calculateTrendMetrics(data) {
    if (data.length < 2) {
      return {
        direction: 'stable',
        changeRate: 0,
        confidence: 0
      };
    }

    // Simple linear regression for trend
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    data.forEach((point, index) => {
      sumX += index;
      sumY += point.created;
      sumXY += index * point.created;
      sumX2 += index * index;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    const changeRate = avgY > 0 ? (slope / avgY) * 100 : 0;
    
    let direction = 'stable';
    if (Math.abs(changeRate) > 5) {
      direction = changeRate > 0 ? 'increasing' : 'decreasing';
    }
    
    // Simple confidence calculation
    const confidence = Math.min(data.length / 10, 1) * 100;
    
    return {
      direction,
      changeRate: Math.round(changeRate * 100) / 100,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Calculate historical trend
   * @param {Array} snapshots - Analytics snapshots
   * @returns {Object} Trend data
   */
  calculateHistoricalTrend(snapshots) {
    if (snapshots.length < 2) {
      return {
        direction: 'stable',
        changeRate: 0
      };
    }

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    
    const change = last.totalAlerts - first.totalAlerts;
    const changeRate = first.totalAlerts > 0 
      ? (change / first.totalAlerts) * 100 
      : 0;
    
    let direction = 'stable';
    if (Math.abs(changeRate) > 5) {
      direction = changeRate > 0 ? 'increasing' : 'decreasing';
    }
    
    return {
      direction,
      changeRate: Math.round(changeRate * 100) / 100
    };
  }
}

// Singleton instance
let alertAnalyticsServiceInstance = null;

/**
 * Get or create alert analytics service instance
 * @param {Object} options - Configuration options
 * @returns {AlertAnalyticsService} Service instance
 */
export function getAlertAnalyticsService(options) {
  if (!alertAnalyticsServiceInstance) {
    alertAnalyticsServiceInstance = new AlertAnalyticsService(options);
  }
  return alertAnalyticsServiceInstance;
}

/**
 * Get user alert analytics (convenience function)
 * @param {string} userId - User ID
 * @param {Object} options - Analytics options
 */
export async function getUserAlertAnalytics(userId, options) {
  const service = getAlertAnalyticsService();
  return await service.getUserAlertAnalytics(userId, options);
}