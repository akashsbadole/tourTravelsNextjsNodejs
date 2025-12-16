import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { 
  getManyDocs,
  getOneDoc
} from "@/lib/db/operations";
import { PriceAlert, PriceHistory, NotificationTracking } from "@/lib/db/models";

// Validation schema for query parameters
const analyticsQuerySchema = z.object({
  timeframe: z.enum(['24h', '7d', '30d', '90d', '1y']).default('30d'),
  alertId: z.string().optional(),
  type: z.enum(['overview', 'performance', 'trends', 'notifications']).default('overview'),
  format: z.enum(['json', 'csv']).default('json'),
});

/**
 * GET /api/price-alerts/analytics - Get price alert analytics
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { timeframe, alertId, type, format } = analyticsQuerySchema.parse(Object.fromEntries(searchParams));

    // Calculate date range based on timeframe
    const { startDate, endDate } = getDateRange(timeframe);

    // Get analytics based on type
    let analyticsData;
    switch (type) {
      case 'overview':
        analyticsData = await getOverviewAnalytics(session.user.id, startDate, endDate, alertId);
        break;
      case 'performance':
        analyticsData = await getPerformanceAnalytics(session.user.id, startDate, endDate, alertId);
        break;
      case 'trends':
        analyticsData = await getTrendsAnalytics(session.user.id, startDate, endDate, alertId);
        break;
      case 'notifications':
        analyticsData = await getNotificationAnalytics(session.user.id, startDate, endDate, alertId);
        break;
      default:
        analyticsData = await getOverviewAnalytics(session.user.id, startDate, endDate, alertId);
    }

    // Format response based on format parameter
    if (format === 'csv') {
      const csvData = convertToCSV(analyticsData);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="price-alerts-analytics-${timeframe}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: analyticsData,
      meta: {
        timeframe,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching price alert analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

/**
 * Get overview analytics
 * @param {string} userId - User ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} alertId - Optional alert ID
 */
async function getOverviewAnalytics(userId, startDate, endDate, alertId = null) {
  try {
    // Build query filter
    const alertFilter = { userId };
    if (alertId) {
      alertFilter._id = alertId;
    }

    // Get alerts
    const alerts = await getManyDocs("PriceAlert", alertFilter);
    
    // Get price history
    const priceHistoryFilter = {
      'priceHistory.timestamp': { $gte: startDate, $lte: endDate },
    };
    if (alertId) {
      // Would need to join with alerts to get flight IDs
    }
    const priceHistory = await getManyDocs("PriceHistory", priceHistoryFilter);

    // Get notification tracking
    const notificationFilter = {
      userId,
      processedAt: { $gte: startDate, $lte: endDate },
    };
    if (alertId) {
      notificationFilter.alertId = alertId;
    }
    const notifications = await getManyDocs("NotificationTracking", notificationFilter);

    // Calculate overview metrics
    const overview = {
      alerts: {
        total: alerts.length,
        active: alerts.filter(a => a.status === 'active').length,
        triggered: alerts.filter(a => a.status === 'triggered').length,
        expired: alerts.filter(a => a.status === 'expired').length,
        paused: alerts.filter(a => a.status === 'paused').length,
      },
      priceChanges: {
        totalDrops: 0,
        averageDrop: 0,
        largestDrop: 0,
        totalIncreases: 0,
        averageIncrease: 0,
        largestIncrease: 0,
      },
      notifications: {
        total: notifications.length,
        sent: notifications.filter(n => n.status === 'completed').length,
        failed: notifications.filter(n => n.status === 'failed').length,
        pending: notifications.filter(n => n.status === 'pending').length,
        successRate: 0,
      },
      savings: {
        totalSavings: 0,
        averageSavings: 0,
        largestSaving: 0,
      },
    };

    // Calculate price change metrics
    for (const history of priceHistory) {
      if (history.priceHistory && history.priceHistory.length > 1) {
        const prices = history.priceHistory
          .filter(p => new Date(p.timestamp) >= startDate && new Date(p.timestamp) <= endDate)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        for (let i = 1; i < prices.length; i++) {
          const change = prices[i].price - prices[i-1].price;
          if (change < 0) {
            overview.priceChanges.totalDrops++;
            overview.priceChanges.averageDrop += Math.abs(change);
            overview.priceChanges.largestDrop = Math.max(overview.priceChanges.largestDrop, Math.abs(change));
          } else if (change > 0) {
            overview.priceChanges.totalIncreases++;
            overview.priceChanges.averageIncrease += change;
            overview.priceChanges.largestIncrease = Math.max(overview.priceChanges.largestIncrease, change);
          }
        }
      }
    }

    // Calculate averages
    if (overview.priceChanges.totalDrops > 0) {
      overview.priceChanges.averageDrop /= overview.priceChanges.totalDrops;
    }
    if (overview.priceChanges.totalIncreases > 0) {
      overview.priceChanges.averageIncrease /= overview.priceChanges.totalIncreases;
    }

    // Calculate notification success rate
    if (overview.notifications.total > 0) {
      overview.notifications.successRate = (overview.notifications.sent / overview.notifications.total) * 100;
    }

    // Calculate savings from triggered alerts
    for (const alert of alerts.filter(a => a.status === 'triggered' && a.metrics?.savings)) {
      overview.savings.totalSavings += alert.metrics.savings.amount || 0;
      overview.savings.averageSavings += alert.metrics.savings.amount || 0;
      overview.savings.largestSaving = Math.max(overview.savings.largestSaving, alert.metrics.savings.amount || 0);
    }

    if (alerts.filter(a => a.status === 'triggered').length > 0) {
      overview.savings.averageSavings /= alerts.filter(a => a.status === 'triggered').length;
    }

    return overview;
  } catch (error) {
    console.error('Error getting overview analytics:', error);
    throw error;
  }
}

/**
 * Get performance analytics
 * @param {string} userId - User ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} alertId - Optional alert ID
 */
async function getPerformanceAnalytics(userId, startDate, endDate, alertId = null) {
  try {
    // Get alerts with performance metrics
    const alertFilter = { userId };
    if (alertId) {
      alertFilter._id = alertId;
    }
    const alerts = await getManyDocs("PriceAlert", alertFilter);

    // Calculate performance metrics
    const performance = {
      alerts: [],
      summary: {
        averageResponseTime: 0,
        averageTriggerTime: 0,
        totalChecks: 0,
        successfulChecks: 0,
        checkSuccessRate: 0,
        averagePriceAccuracy: 0,
      },
      byRoute: {},
      byAirline: {},
      byTimeOfDay: {},
    };

    let totalResponseTime = 0;
    let totalTriggerTime = 0;
    let totalChecks = 0;
    let successfulChecks = 0;
    let totalAccuracy = 0;
    let accuracyCount = 0;

    for (const alert of alerts) {
      const alertPerformance = {
        id: alert._id,
        summary: `${alert.searchCriteria.origin.airportCode} → ${alert.searchCriteria.destination.airportCode}`,
        status: alert.status,
        createdAt: alert.createdAt,
        lastTriggered: alert.lastTriggeredAt,
        triggerCount: alert.triggerCount || 0,
        metrics: {
          totalChecks: alert.metrics?.totalChecks || 0,
          averageCheckDuration: alert.metrics?.averageCheckDuration || 0,
          lastCheckedAt: alert.metrics?.lastCheckedAt,
          priceHistory: alert.metrics?.priceHistory?.length || 0,
          savings: alert.metrics?.savings || { amount: 0, currency: 'USD' },
        },
      };

      // Aggregate performance metrics
      totalChecks += alertPerformance.metrics.totalChecks;
      if (alertPerformance.metrics.totalChecks > 0) {
        successfulChecks += alertPerformance.metrics.totalChecks; // Assuming all checks are successful for now
        totalResponseTime += alertPerformance.metrics.averageCheckDuration;
      }

      if (alert.lastTriggeredAt && alert.createdAt) {
        const triggerTime = new Date(alert.lastTriggeredAt) - new Date(alert.createdAt);
        totalTriggerTime += triggerTime;
      }

      // Group by route
      const route = `${alert.searchCriteria.origin.airportCode}-${alert.searchCriteria.destination.airportCode}`;
      if (!performance.byRoute[route]) {
        performance.byRoute[route] = {
          alerts: 0,
          triggers: 0,
          totalSavings: 0,
          averageResponseTime: 0,
        };
      }
      performance.byRoute[route].alerts++;
      performance.byRoute[route].triggers += alertPerformance.triggerCount;
      performance.byRoute[route].totalSavings += alertPerformance.metrics.savings.amount;

      performance.alerts.push(alertPerformance);
    }

    // Calculate summary metrics
    if (alerts.length > 0) {
      performance.summary.averageResponseTime = totalResponseTime / alerts.length;
      performance.summary.averageTriggerTime = totalTriggerTime / alerts.length;
    }
    performance.summary.totalChecks = totalChecks;
    performance.summary.successfulChecks = successfulChecks;
    performance.summary.checkSuccessRate = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    return performance;
  } catch (error) {
    console.error('Error getting performance analytics:', error);
    throw error;
  }
}

/**
 * Get trends analytics
 * @param {string} userId - User ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} alertId - Optional alert ID
 */
async function getTrendsAnalytics(userId, startDate, endDate, alertId = null) {
  try {
    // Get price history for trend analysis
    const priceHistoryFilter = {
      'priceHistory.timestamp': { $gte: startDate, $lte: endDate },
    };
    const priceHistory = await getManyDocs("PriceHistory", priceHistoryFilter);

    // Process trend data
    const trends = {
      priceTrends: [],
      volatility: {},
      seasonalPatterns: {},
      bestTimeToBuy: {},
      predictions: {},
    };

    // Group price history by route
    const routeHistory = {};
    for (const history of priceHistory) {
      const route = `${history.route.origin.airportCode}-${history.route.destination.airportCode}`;
      if (!routeHistory[route]) {
        routeHistory[route] = [];
      }
      
      // Filter price points within date range
      const relevantPrices = history.priceHistory.filter(p => 
        new Date(p.timestamp) >= startDate && new Date(p.timestamp) <= endDate
      );
      
      routeHistory[route].push(...relevantPrices);
    }

    // Analyze trends for each route
    for (const [route, prices] of Object.entries(routeHistory)) {
      if (prices.length < 2) continue;

      // Sort by timestamp
      prices.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Calculate trend metrics
      const trendData = calculateTrendMetrics(prices);
      trends.priceTrends.push({
        route,
        ...trendData,
      });

      // Calculate volatility
      trends.volatility[route] = calculateVolatility(prices);

      // Analyze seasonal patterns
      trends.seasonalPatterns[route] = analyzeSeasonalPatterns(prices);

      // Find best time to buy
      trends.bestTimeToBuy[route] = findBestTimeToBuy(prices);

      // Generate simple predictions
      trends.predictions[route] = generatePricePrediction(prices);
    }

    return trends;
  } catch (error) {
    console.error('Error getting trends analytics:', error);
    throw error;
  }
}

/**
 * Get notification analytics
 * @param {string} userId - User ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} alertId - Optional alert ID
 */
async function getNotificationAnalytics(userId, startDate, endDate, alertId = null) {
  try {
    // Get notification tracking data
    const notificationFilter = {
      userId,
      processedAt: { $gte: startDate, $lte: endDate },
    };
    if (alertId) {
      notificationFilter.alertId = alertId;
    }
    const notifications = await getManyDocs("NotificationTracking", notificationFilter);

    // Process notification analytics
    const notificationAnalytics = {
      summary: {
        total: notifications.length,
        byType: {},
        byChannel: {},
        byStatus: {},
        byPriority: {},
        averageDeliveryTime: 0,
        successRate: 0,
      },
      timeline: [],
      engagement: {
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
      },
      failures: [],
    };

    let totalDeliveryTime = 0;
    let deliveryCount = 0;

    // Process notifications
    for (const notification of notifications) {
      // By type
      notificationAnalytics.summary.byType[notification.type] = 
        (notificationAnalytics.summary.byType[notification.type] || 0) + 1;

      // By priority
      notificationAnalytics.summary.byPriority[notification.priority] = 
        (notificationAnalytics.summary.byPriority[notification.priority] || 0) + 1;

      // Process delivery results
      for (const delivery of notification.delivery || []) {
        // By channel
        notificationAnalytics.summary.byChannel[delivery.channel] = 
          (notificationAnalytics.summary.byChannel[delivery.channel] || 0) + 1;

        // By status
        notificationAnalytics.summary.byStatus[delivery.status] = 
          (notificationAnalytics.summary.byStatus[delivery.status] || 0) + 1;

        // Calculate delivery time
        if (delivery.sentAt && notification.processedAt) {
          const deliveryTime = new Date(delivery.sentAt) - new Date(notification.processedAt);
          totalDeliveryTime += deliveryTime;
          deliveryCount++;
        }

        // Track failures
        if (delivery.status === 'failed') {
          notificationAnalytics.failures.push({
            notificationId: notification.notificationId,
            channel: delivery.channel,
            failureReason: delivery.failureReason,
            timestamp: delivery.sentAt,
          });
        }
      }

      // Add to timeline
      notificationAnalytics.timeline.push({
        date: new Date(notification.processedAt).toISOString().split('T')[0],
        type: notification.type,
        status: notification.status,
        channels: notification.delivery?.map(d => d.channel) || [],
      });
    }

    // Calculate summary metrics
    if (deliveryCount > 0) {
      notificationAnalytics.summary.averageDeliveryTime = totalDeliveryTime / deliveryCount;
    }

    const successfulDeliveries = Object.values(notificationAnalytics.summary.byStatus)
      .filter((status, index) => ['sent', 'delivered'].includes(Object.keys(notificationAnalytics.summary.byStatus)[index]))
      .reduce((sum, count) => sum + count, 0);

    if (notificationAnalytics.summary.total > 0) {
      notificationAnalytics.summary.successRate = (successfulDeliveries / notificationAnalytics.summary.total) * 100;
    }

    // Sort timeline by date
    notificationAnalytics.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    return notificationAnalytics;
  } catch (error) {
    console.error('Error getting notification analytics:', error);
    throw error;
  }
}

/**
 * Get date range based on timeframe
 * @param {string} timeframe - Timeframe string
 * @returns {Object} Date range with startDate and endDate
 */
function getDateRange(timeframe) {
  const endDate = new Date();
  const startDate = new Date();

  switch (timeframe) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  return { startDate, endDate };
}

/**
 * Calculate trend metrics from price data
 * @param {Array} prices - Array of price points
 * @returns {Object} Trend metrics
 */
function calculateTrendMetrics(prices) {
  if (prices.length < 2) {
    return { trend: 'insufficient_data', direction: 'unknown', change: 0, percentage: 0 };
  }

  const firstPrice = prices[0].price;
  const lastPrice = prices[prices.length - 1].price;
  const change = lastPrice - firstPrice;
  const percentage = firstPrice > 0 ? (change / firstPrice) * 100 : 0;

  let trend = 'stable';
  let direction = 'unknown';

  if (Math.abs(percentage) < 2) {
    trend = 'stable';
    direction = 'stable';
  } else if (percentage > 0) {
    trend = 'increasing';
    direction = 'up';
  } else {
    trend = 'decreasing';
    direction = 'down';
  }

  return {
    trend,
    direction,
    change: Math.abs(change),
    percentage: Math.abs(percentage),
    firstPrice,
    lastPrice,
    dataPoints: prices.length,
  };
}

/**
 * Calculate price volatility
 * @param {Array} prices - Array of price points
 * @returns {Object} Volatility metrics
 */
function calculateVolatility(prices) {
  if (prices.length < 2) {
    return { volatility: 0, standardDeviation: 0, coefficient: 0 };
  }

  const priceValues = prices.map(p => p.price);
  const mean = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
  
  const squaredDifferences = priceValues.map(price => Math.pow(price - mean, 2));
  const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / priceValues.length;
  const standardDeviation = Math.sqrt(variance);
  
  const coefficient = mean > 0 ? (standardDeviation / mean) * 100 : 0;

  return {
    volatility: coefficient,
    standardDeviation,
    coefficient,
    mean,
    min: Math.min(...priceValues),
    max: Math.max(...priceValues),
  };
}

/**
 * Analyze seasonal patterns
 * @param {Array} prices - Array of price points
 * @returns {Object} Seasonal patterns
 */
function analyzeSeasonalPatterns(prices) {
  // Group by day of week
  const byDayOfWeek = {};
  const byMonth = {};

  for (const price of prices) {
    const date = new Date(price.timestamp);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const month = date.getMonth(); // 0 = January, 11 = December

    if (!byDayOfWeek[dayOfWeek]) {
      byDayOfWeek[dayOfWeek] = [];
    }
    byDayOfWeek[dayOfWeek].push(price.price);

    if (!byMonth[month]) {
      byMonth[month] = [];
    }
    byMonth[month].push(price.price);
  }

  // Calculate averages
  const dayOfWeekAverages = {};
  for (const [day, dayPrices] of Object.entries(byDayOfWeek)) {
    dayOfWeekAverages[day] = dayPrices.reduce((sum, price) => sum + price, 0) / dayPrices.length;
  }

  const monthAverages = {};
  for (const [month, monthPrices] of Object.entries(byMonth)) {
    monthAverages[month] = monthPrices.reduce((sum, price) => sum + price, 0) / monthPrices.length;
  }

  // Find best and worst days/months
  const bestDay = Object.entries(dayOfWeekAverages).reduce((best, [day, avg]) => 
    !best || avg < best.average ? { day: parseInt(day), average: avg } : best, null);
  const worstDay = Object.entries(dayOfWeekAverages).reduce((worst, [day, avg]) => 
    !worst || avg > worst.average ? { day: parseInt(day), average: avg } : worst, null);

  const bestMonth = Object.entries(monthAverages).reduce((best, [month, avg]) => 
    !best || avg < best.average ? { month: parseInt(month), average: avg } : best, null);
  const worstMonth = Object.entries(monthAverages).reduce((worst, [month, avg]) => 
    !worst || avg > worst.average ? { month: parseInt(month), average: avg } : worst, null);

  return {
    byDayOfWeek: dayOfWeekAverages,
    byMonth: monthAverages,
    bestDay,
    worstDay,
    bestMonth,
    worstMonth,
  };
}

/**
 * Find best time to buy based on price history
 * @param {Array} prices - Array of price points
 * @returns {Object} Best time to buy recommendations
 */
function findBestTimeToBuy(prices) {
  if (prices.length < 7) {
    return { recommendation: 'insufficient_data', confidence: 0 };
  }

  // Analyze by day of week and time of day
  const byDayOfWeek = {};
  const byHour = {};

  for (const price of prices) {
    const date = new Date(price.timestamp);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    if (!byDayOfWeek[dayOfWeek]) {
      byDayOfWeek[dayOfWeek] = [];
    }
    byDayOfWeek[dayOfWeek].push(price.price);

    if (!byHour[hour]) {
      byHour[hour] = [];
    }
    byHour[hour].push(price.price);
  }

  // Calculate averages
  const dayOfWeekAverages = {};
  for (const [day, dayPrices] of Object.entries(byDayOfWeek)) {
    dayOfWeekAverages[day] = dayPrices.reduce((sum, price) => sum + price, 0) / dayPrices.length;
  }

  const hourAverages = {};
  for (const [hour, hourPrices] of Object.entries(byHour)) {
    hourAverages[hour] = hourPrices.reduce((sum, price) => sum + price, 0) / hourPrices.length;
  }

  // Find best day and hour
  const bestDay = Object.entries(dayOfWeekAverages).reduce((best, [day, avg]) => 
    !best || avg < best.average ? { day: parseInt(day), average: avg } : best, null);
  const bestHour = Object.entries(hourAverages).reduce((best, [hour, avg]) => 
    !best || avg < best.average ? { hour: parseInt(hour), average: avg } : best, null);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    recommendation: 'optimal_time_found',
    bestDay: {
      day: bestDay.day,
      name: dayNames[bestDay.day],
      averagePrice: bestDay.average,
    },
    bestHour: {
      hour: bestHour.hour,
      averagePrice: bestHour.average,
    },
    confidence: Math.min(prices.length / 30, 1) * 100, // Confidence based on data points
  };
}

/**
 * Generate simple price prediction
 * @param {Array} prices - Array of price points
 * @returns {Object} Price prediction
 */
function generatePricePrediction(prices) {
  if (prices.length < 5) {
    return { prediction: 'insufficient_data', confidence: 0 };
  }

  // Simple linear regression for prediction
  const n = prices.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let i = 0; i < prices.length; i++) {
    const x = i; // Time index
    const y = prices[i].price;
    
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict next price
  const nextIndex = n;
  const predictedPrice = slope * nextIndex + intercept;

  // Calculate confidence based on R-squared
  const meanY = sumY / n;
  let ssTotal = 0, ssResidual = 0;

  for (let i = 0; i < prices.length; i++) {
    const predicted = slope * i + intercept;
    ssTotal += Math.pow(prices[i].price - meanY, 2);
    ssResidual += Math.pow(prices[i].price - predicted, 2);
  }

  const rSquared = 1 - (ssResidual / ssTotal);
  const confidence = Math.max(0, Math.min(100, rSquared * 100));

  return {
    prediction: 'linear_regression',
    currentPrice: prices[prices.length - 1].price,
    predictedPrice,
    trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
    changeAmount: predictedPrice - prices[prices.length - 1].price,
    changePercentage: prices[prices.length - 1].price > 0 ? 
      ((predictedPrice - prices[prices.length - 1].price) / prices[prices.length - 1].price) * 100 : 0,
    confidence,
    dataPoints: prices.length,
  };
}

/**
 * Convert analytics data to CSV format
 * @param {Object} data - Analytics data
 * @returns {string} CSV string
 */
function convertToCSV(data) {
  // This is a simplified CSV conversion
  // In a real implementation, you'd want to handle nested objects and arrays properly
  const headers = Object.keys(data);
  const values = headers.map(header => {
    const value = data[header];
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  });

  return [headers.join(','), values.join(',')].join('\n');
}