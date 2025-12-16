import { getManyDocs, updateOneDoc, createDoc } from "@/lib/db/operations";
import { getAlertAnalyticsService } from "./alertAnalytics";
import { getNotificationDeliveryTracking } from "./notificationDeliveryTracking";

/**
 * Alert Success Metrics and Reporting Service
 * Tracks and analyzes the success of price alerts across multiple dimensions
 */
export class AlertSuccessMetrics {
  constructor(options = {}) {
    this.options = {
      // Metrics calculation settings
      enableRealTimeMetrics: true,        // Calculate metrics in real-time
      enableHistoricalAnalysis: true,     // Analyze historical trends
      enablePredictiveMetrics: true,      // Predict future success rates
      enableComparativeAnalysis: true,    // Compare across segments
      
      // Success criteria
      successThresholds: {
        notificationDelivery: 0.85,       // 85% delivery rate
        userEngagement: 0.25,             // 25% engagement rate
        priceAccuracy: 0.90,              // 90% price accuracy
        alertRelevance: 0.70,             // 70% relevance score
        userSatisfaction: 0.80            // 80% satisfaction score
      },
      
      // Reporting settings
      enableAutomatedReports: true,      // Generate automated reports
      reportFrequency: 'weekly',          // Daily, weekly, monthly
      enableDetailedAnalytics: true,      // Include detailed analytics
      enableTrendAnalysis: true,          // Include trend analysis
      
      // Performance settings
      metricsRetentionDays: 365,          // Keep metrics for 1 year
      aggregationInterval: 'hourly',      // Aggregate metrics hourly
      enableCaching: true,                // Cache metrics calculations
      
      ...options
    };
    
    this.analyticsService = getAlertAnalyticsService();
    this.deliveryTracking = getNotificationDeliveryTracking();
    
    // Metrics cache
    this.metricsCache = new Map();
    this.lastCacheUpdate = 0;
    
    // Start background processes
    this.startTime = Date.now();
    this.startBackgroundProcesses();
  }

  /**
   * Calculate comprehensive alert success metrics
   * @param {Object} options - Calculation options
   * @returns {Object} Success metrics
   */
  async calculateSuccessMetrics(options = {}) {
    try {
      const {
        timeRange = '30d',               // Default to last 30 days
        alertTypes = ['price_drop', 'price_trend', 'daily_change', 'specific_price'],
        includeSegmentation = true,
        includeTrends = true,
        includePredictions = true
      } = options;

      // Check cache first
      const cacheKey = this.generateCacheKey(timeRange, alertTypes, options);
      if (this.options.enableCaching && this.metricsCache.has(cacheKey)) {
        const cached = this.metricsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes cache
          return cached.metrics;
        }
      }

      // Calculate time cutoff
      const cutoffDate = this.calculateTimeCutoff(timeRange);
      
      // Get alert data
      const alertData = await this.getAlertData(cutoffDate, alertTypes);
      
      // Calculate core metrics
      const coreMetrics = await this.calculateCoreMetrics(alertData);
      
      // Calculate success scores
      const successScores = await this.calculateSuccessScores(coreMetrics);
      
      // Calculate engagement metrics
      const engagementMetrics = await this.calculateEngagementMetrics(alertData);
      
      // Calculate performance metrics
      const performanceMetrics = await this.calculatePerformanceMetrics(alertData);
      
      // Calculate financial impact
      const financialImpact = await this.calculateFinancialImpact(alertData);
      
      // Segment analysis
      const segmentation = includeSegmentation ? 
        await this.calculateSegmentationMetrics(alertData) : null;
      
      // Trend analysis
      const trends = includeTrends ? 
        await this.analyzeSuccessTrends(alertData, timeRange) : null;
      
      // Predictive metrics
      const predictions = includePredictions ? 
        await this.generatePredictiveMetrics(alertData) : null;
      
      // Compile comprehensive metrics
      const comprehensiveMetrics = {
        timeRange,
        cutoffDate,
        totalAlerts: alertData.length,
        coreMetrics,
        successScores,
        engagementMetrics,
        performanceMetrics,
        financialImpact,
        segmentation,
        trends,
        predictions,
        generatedAt: new Date(),
        recommendations: await this.generateRecommendations(successScores, trends)
      };

      // Update cache
      if (this.options.enableCaching) {
        this.metricsCache.set(cacheKey, {
          metrics: comprehensiveMetrics,
          timestamp: Date.now()
        });
      }

      return comprehensiveMetrics;
    } catch (error) {
      console.error('Error calculating success metrics:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Calculate core metrics
   * @param {Array} alertData - Alert data
   * @returns {Object} Core metrics
   */
  async calculateCoreMetrics(alertData) {
    const total = alertData.length;
    if (total === 0) {
      return {
        total: 0,
        triggered: 0,
        delivered: 0,
        engaged: 0,
        converted: 0,
        triggerRate: 0,
        deliveryRate: 0,
        engagementRate: 0,
        conversionRate: 0
      };
    }

    const triggered = alertData.filter(a => a.status === 'triggered').length;
    const delivered = alertData.filter(a => a.status === 'delivered').length;
    const engaged = alertData.filter(a => a.engagement?.opened || a.engagement?.clicked).length;
    const converted = alertData.filter(a => a.conversion?.booked || a.conversion?.saved).length;

    return {
      total,
      triggered,
      delivered,
      engaged,
      converted,
      triggerRate: Math.round((triggered / total) * 100) / 100,
      deliveryRate: Math.round((delivered / total) * 100) / 100,
      engagementRate: Math.round((engaged / total) * 100) / 100,
      conversionRate: Math.round((converted / total) * 100) / 100
    };
  }

  /**
   * Calculate success scores
   * @param {Object} coreMetrics - Core metrics
   * @returns {Object} Success scores
   */
  async calculateSuccessScores(coreMetrics) {
    const thresholds = this.options.successThresholds;
    
    // Calculate individual scores
    const deliveryScore = this.normalizeScore(coreMetrics.deliveryRate, thresholds.notificationDelivery);
    const engagementScore = this.normalizeScore(coreMetrics.engagementRate, thresholds.userEngagement);
    const accuracyScore = await this.calculateAccuracyScore();
    const relevanceScore = await this.calculateRelevanceScore();
    const satisfactionScore = await this.calculateSatisfactionScore();
    
    // Calculate overall success score
    const overallScore = (
      deliveryScore * 0.25 +
      engagementScore * 0.20 +
      accuracyScore * 0.25 +
      relevanceScore * 0.15 +
      satisfactionScore * 0.15
    );
    
    return {
      overall: Math.round(overallScore * 100) / 100,
      delivery: Math.round(deliveryScore * 100) / 100,
      engagement: Math.round(engagementScore * 100) / 100,
      accuracy: Math.round(accuracyScore * 100) / 100,
      relevance: Math.round(relevanceScore * 100) / 100,
      satisfaction: Math.round(satisfactionScore * 100) / 100,
      grade: this.calculateSuccessGrade(overallScore)
    };
  }

  /**
   * Calculate accuracy score
   * @returns {number} Accuracy score (0-1)
   */
  async calculateAccuracyScore() {
    try {
      // Get price history and compare with predictions
      const priceHistory = await getManyDocs("PriceHistory", {}, [], { limit: 1000 });
      
      if (priceHistory.length === 0) return 0.5; // Default score
      
      let accuratePredictions = 0;
      let totalPredictions = 0;
      
      for (const record of priceHistory) {
        if (record.predictedPrice && record.actualPrice) {
          const accuracy = 1 - Math.abs(record.predictedPrice - record.actualPrice) / record.actualPrice;
          if (accuracy > 0.8) accuratePredictions++; // 80% accuracy threshold
          totalPredictions++;
        }
      }
      
      return totalPredictions > 0 ? accuratePredictions / totalPredictions : 0.5;
    } catch (error) {
      console.error('Error calculating accuracy score:', error);
      return 0.5;
    }
  }

  /**
   * Calculate relevance score
   * @returns {number} Relevance score (0-1)
   */
  async calculateRelevanceScore() {
    try {
      // Get user feedback on alerts
      const feedback = await getManyDocs("AlertFeedback", {}, [], { limit: 1000 });
      
      if (feedback.length === 0) return 0.7; // Default score
      
      const relevantFeedback = feedback.filter(f => f.relevance >= 4).length;
      return relevantFeedback / feedback.length;
    } catch (error) {
      console.error('Error calculating relevance score:', error);
      return 0.7;
    }
  }

  /**
   * Calculate satisfaction score
   * @returns {number} Satisfaction score (0-1)
   */
  async calculateSatisfactionScore() {
    try {
      // Get user satisfaction ratings
      const satisfaction = await getManyDocs("UserSatisfaction", {}, [], { limit: 1000 });
      
      if (satisfaction.length === 0) return 0.8; // Default score
      
      const satisfiedUsers = satisfaction.filter(s => s.rating >= 4).length;
      return satisfiedUsers / satisfaction.length;
    } catch (error) {
      console.error('Error calculating satisfaction score:', error);
      return 0.8;
    }
  }

  /**
   * Calculate engagement metrics
   * @param {Array} alertData - Alert data
   * @returns {Object} Engagement metrics
   */
  async calculateEngagementMetrics(alertData) {
    const engagedAlerts = alertData.filter(a => a.engagement);
    
    if (engagedAlerts.length === 0) {
      return {
        openRate: 0,
        clickRate: 0,
        averageTimeToOpen: 0,
        averageTimeToClick: 0,
        engagementByChannel: {},
        engagementByType: {}
      };
    }
    
    // Calculate overall engagement rates
    const totalAlerts = alertData.length;
    const openedAlerts = engagedAlerts.filter(a => a.engagement.opened).length;
    const clickedAlerts = engagedAlerts.filter(a => a.engagement.clicked).length;
    
    // Calculate time metrics
    const timeToOpen = engagedAlerts
      .filter(a => a.engagement.timeToOpen)
      .map(a => a.engagement.timeToOpen);
    
    const timeToClick = engagedAlerts
      .filter(a => a.engagement.timeToClick)
      .map(a => a.engagement.timeToClick);
    
    // Channel breakdown
    const engagementByChannel = {};
    for (const alert of engagedAlerts) {
      const channel = alert.channel || 'email';
      if (!engagementByChannel[channel]) {
        engagementByChannel[channel] = { total: 0, opened: 0, clicked: 0 };
      }
      engagementByChannel[channel].total++;
      if (alert.engagement.opened) engagementByChannel[channel].opened++;
      if (alert.engagement.clicked) engagementByChannel[channel].clicked++;
    }
    
    // Type breakdown
    const engagementByType = {};
    for (const alert of engagedAlerts) {
      const type = alert.type || 'unknown';
      if (!engagementByType[type]) {
        engagementByType[type] = { total: 0, opened: 0, clicked: 0 };
      }
      engagementByType[type].total++;
      if (alert.engagement.opened) engagementByType[type].opened++;
      if (alert.engagement.clicked) engagementByType[type].clicked++;
    }
    
    return {
      openRate: Math.round((openedAlerts / totalAlerts) * 100) / 100,
      clickRate: Math.round((clickedAlerts / totalAlerts) * 100) / 100,
      averageTimeToOpen: timeToOpen.length > 0 ? 
        Math.round(timeToOpen.reduce((a, b) => a + b, 0) / timeToOpen.length) : 0,
      averageTimeToClick: timeToClick.length > 0 ? 
        Math.round(timeToClick.reduce((a, b) => a + b, 0) / timeToClick.length) : 0,
      engagementByChannel,
      engagementByType
    };
  }

  /**
   * Calculate performance metrics
   * @param {Array} alertData - Alert data
   * @returns {Object} Performance metrics
   */
  async calculatePerformanceMetrics(alertData) {
    // Get delivery tracking data
    const deliveryMetrics = this.deliveryTracking.getDeliveryMetrics();
    
    // Calculate timing metrics
    const triggeredAlerts = alertData.filter(a => a.triggeredAt && a.createdAt);
    const alertToTriggerTimes = triggeredAlerts.map(a => 
      new Date(a.triggeredAt) - new Date(a.createdAt)
    );
    
    // Calculate processing metrics
    const processedAlerts = alertData.filter(a => a.processingTime);
    const processingTimes = processedAlerts.map(a => a.processingTime);
    
    // Calculate system performance
    const systemMetrics = {
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      activeAlerts: alertData.filter(a => a.status === 'active').length,
      processingQueue: alertData.filter(a => a.status === 'processing').length
    };
    
    return {
      delivery: {
        overallRate: deliveryMetrics.deliveryRate,
        averageResponseTime: deliveryMetrics.averageResponseTime,
        channelPerformance: deliveryMetrics.channelBreakdown
      },
      timing: {
        averageAlertToTrigger: alertToTriggerTimes.length > 0 ? 
          Math.round(alertToTriggerTimes.reduce((a, b) => a + b, 0) / alertToTriggerTimes.length) : 0,
        fastestAlertToTrigger: alertToTriggerTimes.length > 0 ? Math.min(...alertToTriggerTimes) : 0,
        slowestAlertToTrigger: alertToTriggerTimes.length > 0 ? Math.max(...alertToTriggerTimes) : 0
      },
      processing: {
        averageProcessingTime: processingTimes.length > 0 ? 
          Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) : 0,
        fastestProcessingTime: processingTimes.length > 0 ? Math.min(...processingTimes) : 0,
        slowestProcessingTime: processingTimes.length > 0 ? Math.max(...processingTimes) : 0
      },
      system: systemMetrics
    };
  }

  /**
   * Calculate financial impact
   * @param {Array} alertData - Alert data
   * @returns {Object} Financial impact
   */
  async calculateFinancialImpact(alertData) {
    const convertedAlerts = alertData.filter(a => a.conversion);
    
    if (convertedAlerts.length === 0) {
      return {
        totalSavings: 0,
        averageSavingsPerAlert: 0,
        totalRevenue: 0,
        averageRevenuePerAlert: 0,
        roi: 0,
        savingsByType: {},
        revenueByType: {}
      };
    }
    
    // Calculate savings
    const totalSavings = convertedAlerts.reduce((sum, alert) => 
      sum + (alert.conversion.savings || 0), 0
    );
    
    // Calculate revenue
    const totalRevenue = convertedAlerts.reduce((sum, alert) => 
      sum + (alert.conversion.revenue || 0), 0
    );
    
    // Calculate costs (simplified)
    const totalAlerts = alertData.length;
    const costPerAlert = 0.05; // $0.05 per alert (email, processing, etc.)
    const totalCosts = totalAlerts * costPerAlert;
    
    // Calculate ROI
    const roi = totalCosts > 0 ? ((totalRevenue - totalCosts) / totalCosts) * 100 : 0;
    
    // Breakdown by type
    const savingsByType = {};
    const revenueByType = {};
    
    for (const alert of convertedAlerts) {
      const type = alert.type || 'unknown';
      
      if (!savingsByType[type]) savingsByType[type] = 0;
      if (!revenueByType[type]) revenueByType[type] = 0;
      
      savingsByType[type] += alert.conversion.savings || 0;
      revenueByType[type] += alert.conversion.revenue || 0;
    }
    
    return {
      totalSavings: Math.round(totalSavings * 100) / 100,
      averageSavingsPerAlert: Math.round((totalSavings / convertedAlerts.length) * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageRevenuePerAlert: Math.round((totalRevenue / convertedAlerts.length) * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      savingsByType,
      revenueByType
    };
  }

  /**
   * Calculate segmentation metrics
   * @param {Array} alertData - Alert data
   * @returns {Object} Segmentation metrics
   */
  async calculateSegmentationMetrics(alertData) {
    const segments = {};
    
    // Segment by user type
    const userSegments = await this.segmentByUserType(alertData);
    segments.userType = userSegments;
    
    // Segment by alert type
    const alertTypeSegments = await this.segmentByAlertType(alertData);
    segments.alertType = alertTypeSegments;
    
    // Segment by price range
    const priceRangeSegments = await this.segmentByPriceRange(alertData);
    segments.priceRange = priceRangeSegments;
    
    // Segment by destination
    const destinationSegments = await this.segmentByDestination(alertData);
    segments.destination = destinationSegments;
    
    // Segment by time of day
    const timeSegments = await this.segmentByTimeOfDay(alertData);
    segments.timeOfDay = timeSegments;
    
    return segments;
  }

  /**
   * Segment by user type
   * @param {Array} alertData - Alert data
   * @returns {Object} User type segments
   */
  async segmentByUserType(alertData) {
    const segments = {
      new: { total: 0, triggered: 0, converted: 0, successRate: 0 },
      regular: { total: 0, triggered: 0, converted: 0, successRate: 0 },
      premium: { total: 0, triggered: 0, converted: 0, successRate: 0 }
    };
    
    for (const alert of alertData) {
      const userType = alert.userType || 'regular';
      
      segments[userType].total++;
      if (alert.status === 'triggered') segments[userType].triggered++;
      if (alert.conversion) segments[userType].converted++;
    }
    
    // Calculate success rates
    for (const type in segments) {
      const segment = segments[type];
      segment.successRate = segment.total > 0 ? 
        Math.round((segment.converted / segment.total) * 100) / 100 : 0;
    }
    
    return segments;
  }

  /**
   * Segment by alert type
   * @param {Array} alertData - Alert data
   * @returns {Object} Alert type segments
   */
  async segmentByAlertType(alertData) {
    const segments = {};
    
    for (const alert of alertData) {
      const type = alert.type || 'unknown';
      
      if (!segments[type]) {
        segments[type] = { total: 0, triggered: 0, converted: 0, successRate: 0 };
      }
      
      segments[type].total++;
      if (alert.status === 'triggered') segments[type].triggered++;
      if (alert.conversion) segments[type].converted++;
    }
    
    // Calculate success rates
    for (const type in segments) {
      const segment = segments[type];
      segment.successRate = segment.total > 0 ? 
        Math.round((segment.converted / segment.total) * 100) / 100 : 0;
    }
    
    return segments;
  }

  /**
   * Segment by price range
   * @param {Array} alertData - Alert data
   * @returns {Object} Price range segments
   */
  async segmentByPriceRange(alertData) {
    const segments = {
      budget: { total: 0, triggered: 0, converted: 0, successRate: 0, range: '< $500' },
      mid: { total: 0, triggered: 0, converted: 0, successRate: 0, range: '$500 - $1000' },
      premium: { total: 0, triggered: 0, converted: 0, successRate: 0, range: '$1000 - $2000' },
      luxury: { total: 0, triggered: 0, converted: 0, successRate: 0, range: '> $2000' }
    };
    
    for (const alert of alertData) {
      const price = alert.targetPrice || 0;
      let range;
      
      if (price < 500) range = 'budget';
      else if (price < 1000) range = 'mid';
      else if (price < 2000) range = 'premium';
      else range = 'luxury';
      
      segments[range].total++;
      if (alert.status === 'triggered') segments[range].triggered++;
      if (alert.conversion) segments[range].converted++;
    }
    
    // Calculate success rates
    for (const range in segments) {
      const segment = segments[range];
      segment.successRate = segment.total > 0 ? 
        Math.round((segment.converted / segment.total) * 100) / 100 : 0;
    }
    
    return segments;
  }

  /**
   * Segment by destination
   * @param {Array} alertData - Alert data
   * @returns {Object} Destination segments
   */
  async segmentByDestination(alertData) {
    const segments = {};
    
    for (const alert of alertData) {
      const destination = alert.destination || 'unknown';
      
      if (!segments[destination]) {
        segments[destination] = { total: 0, triggered: 0, converted: 0, successRate: 0 };
      }
      
      segments[destination].total++;
      if (alert.status === 'triggered') segments[destination].triggered++;
      if (alert.conversion) segments[destination].converted++;
    }
    
    // Calculate success rates
    for (const dest in segments) {
      const segment = segments[dest];
      segment.successRate = segment.total > 0 ? 
        Math.round((segment.converted / segment.total) * 100) / 100 : 0;
    }
    
    // Sort by total alerts
    const sortedSegments = Object.entries(segments)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10) // Top 10 destinations
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
    
    return sortedSegments;
  }

  /**
   * Segment by time of day
   * @param {Array} alertData - Alert data
   * @returns {Object} Time segments
   */
  async segmentByTimeOfDay(alertData) {
    const segments = {
      morning: { total: 0, triggered: 0, converted: 0, successRate: 0, hours: '6-12' },
      afternoon: { total: 0, triggered: 0, converted: 0, successRate: 0, hours: '12-18' },
      evening: { total: 0, triggered: 0, converted: 0, successRate: 0, hours: '18-24' },
      night: { total: 0, triggered: 0, converted: 0, successRate: 0, hours: '0-6' }
    };
    
    for (const alert of alertData) {
      const hour = new Date(alert.createdAt).getHours();
      let period;
      
      if (hour >= 6 && hour < 12) period = 'morning';
      else if (hour >= 12 && hour < 18) period = 'afternoon';
      else if (hour >= 18 && hour < 24) period = 'evening';
      else period = 'night';
      
      segments[period].total++;
      if (alert.status === 'triggered') segments[period].triggered++;
      if (alert.conversion) segments[period].converted++;
    }
    
    // Calculate success rates
    for (const period in segments) {
      const segment = segments[period];
      segment.successRate = segment.total > 0 ? 
        Math.round((segment.converted / segment.total) * 100) / 100 : 0;
    }
    
    return segments;
  }

  /**
   * Analyze success trends
   * @param {Array} alertData - Alert data
   * @param {string} timeRange - Time range
   * @returns {Object} Trend analysis
   */
  async analyzeSuccessTrends(alertData, timeRange) {
    // Group data by time periods
    const timeGroups = this.groupDataByTime(alertData, timeRange);
    
    // Calculate trends
    const trends = {
      overall: this.calculateTrend(timeGroups.map(g => g.successRate)),
      delivery: this.calculateTrend(timeGroups.map(g => g.deliveryRate)),
      engagement: this.calculateTrend(timeGroups.map(g => g.engagementRate)),
      conversion: this.calculateTrend(timeGroups.map(g => g.conversionRate))
    };
    
    // Identify patterns
    const patterns = this.identifySuccessPatterns(timeGroups);
    
    return {
      timeGroups,
      trends,
      patterns,
      insights: this.generateTrendInsights(trends, patterns)
    };
  }

  /**
   * Group data by time periods
   * @param {Array} alertData - Alert data
   * @param {string} timeRange - Time range
   * @returns {Array} Time groups
   */
  groupDataByTime(alertData, timeRange) {
    const groups = {};
    const groupSize = this.determineGroupSize(timeRange);
    
    for (const alert of alertData) {
      const date = new Date(alert.createdAt);
      const groupKey = this.getGroupKey(date, groupSize);
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          period: groupKey,
          total: 0,
          triggered: 0,
          delivered: 0,
          engaged: 0,
          converted: 0
        };
      }
      
      groups[groupKey].total++;
      if (alert.status === 'triggered') groups[groupKey].triggered++;
      if (alert.status === 'delivered') groups[groupKey].delivered++;
      if (alert.engagement) groups[groupKey].engaged++;
      if (alert.conversion) groups[groupKey].converted++;
    }
    
    // Calculate rates for each group
    const timeGroups = Object.values(groups).map(group => ({
      ...group,
      successRate: group.total > 0 ? group.converted / group.total : 0,
      deliveryRate: group.total > 0 ? group.delivered / group.total : 0,
      engagementRate: group.total > 0 ? group.engaged / group.total : 0,
      conversionRate: group.total > 0 ? group.converted / group.total : 0
    }));
    
    return timeGroups.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Determine group size based on time range
   * @param {string} timeRange - Time range
   * @returns {string} Group size
   */
  determineGroupSize(timeRange) {
    if (timeRange.includes('d')) {
      const days = parseInt(timeRange);
      if (days <= 7) return 'hourly';
      if (days <= 30) return 'daily';
      return 'weekly';
    }
    return 'daily';
  }

  /**
   * Get group key for date
   * @param {Date} date - Date
   * @param {string} groupSize - Group size
   * @returns {string} Group key
   */
  getGroupKey(date, groupSize) {
    switch (groupSize) {
      case 'hourly':
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
      case 'daily':
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
      default:
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }
  }

  /**
   * Calculate trend
   * @param {Array} values - Values over time
   * @returns {Object} Trend analysis
   */
  calculateTrend(values) {
    if (values.length < 2) {
      return { direction: 'stable', slope: 0, confidence: 0 };
    }
    
    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Determine direction
    let direction;
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }
    
    // Calculate confidence (simplified)
    const avgY = sumY / n;
    const variance = y.reduce((sum, yi) => sum + Math.pow(yi - avgY, 2), 0) / n;
    const confidence = Math.max(0, Math.min(1, 1 - variance));
    
    return {
      direction,
      slope: Math.round(slope * 1000) / 1000,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Identify success patterns
   * @param {Array} timeGroups - Time groups
   * @returns {Array} Patterns
   */
  identifySuccessPatterns(timeGroups) {
    const patterns = [];
    
    // Check for seasonal patterns
    if (timeGroups.length >= 12) {
      const monthlyAverages = this.calculateMonthlyAverages(timeGroups);
      const seasonalPattern = this.detectSeasonalPattern(monthlyAverages);
      if (seasonalPattern) {
        patterns.push({
          type: 'seasonal',
          description: seasonalPattern.description,
          peakMonths: seasonalPattern.peakMonths,
          lowMonths: seasonalPattern.lowMonths
        });
      }
    }
    
    // Check for weekly patterns
    const weeklyPattern = this.detectWeeklyPattern(timeGroups);
    if (weeklyPattern) {
      patterns.push({
        type: 'weekly',
        description: weeklyPattern.description,
        bestDays: weeklyPattern.bestDays,
        worstDays: weeklyPattern.worstDays
      });
    }
    
    // Check for growth patterns
    const growthPattern = this.detectGrowthPattern(timeGroups);
    if (growthPattern) {
      patterns.push({
        type: 'growth',
        description: growthPattern.description,
        growthRate: growthPattern.growthRate,
        acceleration: growthPattern.acceleration
      });
    }
    
    return patterns;
  }

  /**
   * Calculate monthly averages
   * @param {Array} timeGroups - Time groups
   * @returns {Array} Monthly averages
   */
  calculateMonthlyAverages(timeGroups) {
    const monthlyData = {};
    
    for (const group of timeGroups) {
      const month = parseInt(group.period.split('-')[1]) - 1; // 0-11
      if (!monthlyData[month]) {
        monthlyData[month] = { total: 0, count: 0 };
      }
      monthlyData[month].total += group.successRate;
      monthlyData[month].count++;
    }
    
    return Array.from({ length: 12 }, (_, month) => {
      const data = monthlyData[month];
      return data ? data.total / data.count : 0;
    });
  }

  /**
   * Detect seasonal pattern
   * @param {Array} monthlyAverages - Monthly averages
   * @returns {Object|null} Seasonal pattern
   */
  detectSeasonalPattern(monthlyAverages) {
    const avg = monthlyAverages.reduce((a, b) => a + b, 0) / monthlyAverages.length;
    const threshold = 0.1; // 10% above/below average
    
    const peakMonths = [];
    const lowMonths = [];
    
    monthlyAverages.forEach((value, month) => {
      if (value > avg * (1 + threshold)) {
        peakMonths.push(month);
      } else if (value < avg * (1 - threshold)) {
        lowMonths.push(month);
      }
    });
    
    if (peakMonths.length > 0 || lowMonths.length > 0) {
      return {
        description: `Seasonal variation detected with peaks in ${this.getMonthNames(peakMonths)} and lows in ${this.getMonthNames(lowMonths)}`,
        peakMonths: this.getMonthNames(peakMonths),
        lowMonths: this.getMonthNames(lowMonths)
      };
    }
    
    return null;
  }

  /**
   * Get month names
   * @param {Array} months - Month indices
   * @returns {Array} Month names
   */
  getMonthNames(months) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(m => monthNames[m]);
  }

  /**
   * Detect weekly pattern
   * @param {Array} timeGroups - Time groups
   * @returns {Object|null} Weekly pattern
   */
  detectWeeklyPattern(timeGroups) {
    // This would analyze day-of-week patterns
    // For now, return null as placeholder
    return null;
  }

  /**
   * Detect growth pattern
   * @param {Array} timeGroups - Time groups
   * @returns {Object|null} Growth pattern
   */
  detectGrowthPattern(timeGroups) {
    if (timeGroups.length < 3) return null;
    
    const recent = timeGroups.slice(-3);
    const older = timeGroups.slice(-6, -3);
    
    if (older.length === 0) return null;
    
    const recentAvg = recent.reduce((sum, g) => sum + g.successRate, 0) / recent.length;
    const olderAvg = older.reduce((sum, g) => sum + g.successRate, 0) / older.length;
    
    const growthRate = (recentAvg - olderAvg) / olderAvg;
    
    if (Math.abs(growthRate) > 0.05) { // 5% threshold
      return {
        description: growthRate > 0 ? 
          `Positive growth trend detected with ${Math.round(growthRate * 100)}% growth` :
          `Declining trend detected with ${Math.round(Math.abs(growthRate) * 100)}% decrease`,
        growthRate: Math.round(growthRate * 100) / 100,
        acceleration: 0 // Would need more complex calculation
      };
    }
    
    return null;
  }

  /**
   * Generate trend insights
   * @param {Object} trends - Trend analysis
   * @param {Array} patterns - Patterns
   * @returns {Array} Insights
   */
  generateTrendInsights(trends, patterns) {
    const insights = [];
    
    // Overall trend insights
    if (trends.overall.direction === 'increasing') {
      insights.push({
        type: 'positive',
        title: 'Improving Success Rate',
        description: 'Alert success rate is trending upward, indicating improving effectiveness.'
      });
    } else if (trends.overall.direction === 'decreasing') {
      insights.push({
        type: 'concern',
        title: 'Declining Success Rate',
        description: 'Alert success rate is trending downward and may require attention.'
      });
    }
    
    // Pattern-based insights
    for (const pattern of patterns) {
      if (pattern.type === 'seasonal') {
        insights.push({
          type: 'opportunity',
          title: 'Seasonal Optimization',
          description: `Optimize alert volume during ${pattern.peakMonths.join(', ')} for maximum impact.`
        });
      }
    }
    
    return insights;
  }

  /**
   * Generate predictive metrics
   * @param {Array} alertData - Alert data
   * @returns {Object} Predictive metrics
   */
  async generatePredictiveMetrics(alertData) {
    // This would use machine learning models for predictions
    // For now, provide simplified predictions based on trends
    
    const historicalData = this.groupDataByTime(alertData, '90d');
    const recentTrend = this.calculateTrend(historicalData.map(g => g.successRate));
    
    // Predict next period
    const currentRate = historicalData[historicalData.length - 1]?.successRate || 0;
    const predictedRate = Math.max(0, Math.min(1, currentRate + recentTrend.slope));
    
    // Predict volume
    const volumeTrend = this.calculateTrend(historicalData.map(g => g.total));
    const currentVolume = historicalData[historicalData.length - 1]?.total || 0;
    const predictedVolume = Math.max(0, Math.round(currentVolume + volumeTrend.slope));
    
    return {
      nextPeriod: {
        predictedSuccessRate: Math.round(predictedRate * 100) / 100,
        predictedVolume,
        confidence: recentTrend.confidence
      },
      recommendations: this.generatePredictiveRecommendations(recentTrend, predictedRate)
    };
  }

  /**
   * Generate predictive recommendations
   * @param {Object} trend - Trend analysis
   * @param {number} predictedRate - Predicted success rate
   * @returns {Array} Recommendations
   */
  generatePredictiveRecommendations(trend, predictedRate) {
    const recommendations = [];
    
    if (trend.direction === 'decreasing' && predictedRate < 0.5) {
      recommendations.push({
        priority: 'high',
        action: 'Review alert criteria',
        description: 'Alert success rate is declining and predicted to be low. Review and adjust alert criteria.'
      });
    }
    
    if (trend.direction === 'increasing' && predictedRate > 0.8) {
      recommendations.push({
        priority: 'medium',
        action: 'Scale alert volume',
        description: 'Alert success rate is improving. Consider increasing alert volume to maximize impact.'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate recommendations
   * @param {Object} successScores - Success scores
   * @param {Object} trends - Trend analysis
   * @returns {Array} Recommendations
   */
  async generateRecommendations(successScores, trends) {
    const recommendations = [];
    const thresholds = this.options.successThresholds;
    
    // Success score recommendations
    if (successScores.delivery < thresholds.notificationDelivery) {
      recommendations.push({
        type: 'improvement',
        category: 'delivery',
        priority: 'high',
        title: 'Improve Notification Delivery',
        description: `Delivery rate (${Math.round(successScores.delivery * 100)}%) is below target (${Math.round(thresholds.notificationDelivery * 100)}%). Review delivery channels and provider settings.`,
        action: 'Review delivery configuration and provider performance'
      });
    }
    
    if (successScores.engagement < thresholds.userEngagement) {
      recommendations.push({
        type: 'improvement',
        category: 'engagement',
        priority: 'medium',
        title: 'Increase User Engagement',
        description: `Engagement rate (${Math.round(successScores.engagement * 100)}%) is below target (${Math.round(thresholds.userEngagement * 100)}%). Consider improving content and timing.`,
        action: 'Optimize notification content and send times'
      });
    }
    
    if (successScores.accuracy < thresholds.priceAccuracy) {
      recommendations.push({
        type: 'improvement',
        category: 'accuracy',
        priority: 'high',
        title: 'Improve Price Accuracy',
        description: `Price accuracy (${Math.round(successScores.accuracy * 100)}%) is below target (${Math.round(thresholds.priceAccuracy * 100)}%). Review price prediction algorithms.`,
        action: 'Enhance price prediction models and data sources'
      });
    }
    
    // Trend-based recommendations
    if (trends && trends.trends) {
      if (trends.trends.overall.direction === 'decreasing') {
        recommendations.push({
          type: 'urgent',
          category: 'trend',
          priority: 'high',
          title: 'Address Declining Performance',
          description: 'Overall success rate is trending downward. Immediate action required.',
          action: 'Conduct comprehensive performance review and implement corrective measures'
        });
      }
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get alert data
   * @param {Date} cutoffDate - Cutoff date
   * @param {Array} alertTypes - Alert types
   * @returns {Array} Alert data
   */
  async getAlertData(cutoffDate, alertTypes) {
    try {
      const query = {
        createdAt: { $gte: cutoffDate }
      };
      
      if (alertTypes && alertTypes.length > 0) {
        query.type = { $in: alertTypes };
      }
      
      const alerts = await getManyDocs("PriceAlert", query, [], {
        sort: { createdAt: -1 },
        limit: 10000
      });
      
      // Enrich with engagement and conversion data
      const enrichedAlerts = await Promise.all(alerts.map(async alert => {
        const engagement = await this.getAlertEngagement(alert._id);
        const conversion = await this.getAlertConversion(alert._id);
        
        return {
          ...alert,
          engagement,
          conversion
        };
      }));
      
      return enrichedAlerts;
    } catch (error) {
      console.error('Error getting alert data:', error);
      return [];
    }
  }

  /**
   * Get alert engagement
   * @param {string} alertId - Alert ID
   * @returns {Object|null} Engagement data
   */
  async getAlertEngagement(alertId) {
    try {
      const engagement = await getManyDocs("NotificationEngagement", { alertId });
      return engagement.length > 0 ? engagement[0] : null;
    } catch (error) {
      console.error('Error getting alert engagement:', error);
      return null;
    }
  }

  /**
   * Get alert conversion
   * @param {string} alertId - Alert ID
   * @returns {Object|null} Conversion data
   */
  async getAlertConversion(alertId) {
    try {
      const conversion = await getManyDocs("AlertConversion", { alertId });
      return conversion.length > 0 ? conversion[0] : null;
    } catch (error) {
      console.error('Error getting alert conversion:', error);
      return null;
    }
  }

  /**
   * Normalize score to 0-1 range
   * @param {number} value - Value to normalize
   * @param {number} target - Target value
   * @returns {number} Normalized score
   */
  normalizeScore(value, target) {
    return Math.min(1, Math.max(0, value / target));
  }

  /**
   * Calculate success grade
   * @param {number} score - Success score
   * @returns {string} Grade
   */
  calculateSuccessGrade(score) {
    if (score >= 0.9) return 'A+';
    if (score >= 0.85) return 'A';
    if (score >= 0.8) return 'A-';
    if (score >= 0.75) return 'B+';
    if (score >= 0.7) return 'B';
    if (score >= 0.65) return 'B-';
    if (score >= 0.6) return 'C+';
    if (score >= 0.55) return 'C';
    if (score >= 0.5) return 'C-';
    return 'D';
  }

  /**
   * Calculate time cutoff
   * @param {string} timeRange - Time range
   * @returns {Date} Cutoff date
   */
  calculateTimeCutoff(timeRange) {
    const now = new Date();
    const match = timeRange.match(/(\d+)([hd])/);
    
    if (!match) {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h':
        return new Date(now.getTime() - value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Generate cache key
   * @param {string} timeRange - Time range
   * @param {Array} alertTypes - Alert types
   * @param {Object} options - Options
   * @returns {string} Cache key
   */
  generateCacheKey(timeRange, alertTypes, options) {
    return `${timeRange}_${alertTypes.join(',')}_${JSON.stringify(options)}`;
  }

  /**
   * Generate automated report
   * @param {string} reportType - Report type
   * @returns {Object} Report data
   */
  async generateAutomatedReport(reportType = 'weekly') {
    try {
      const timeRange = reportType === 'daily' ? '1d' : 
                       reportType === 'weekly' ? '7d' : '30d';
      
      const metrics = await this.calculateSuccessMetrics({ timeRange });
      
      const report = {
        type: reportType,
        generatedAt: new Date(),
        timeRange,
        summary: {
          totalAlerts: metrics.totalAlerts,
          overallSuccessScore: metrics.successScores.overall,
          successGrade: metrics.successScores.grade,
          totalSavings: metrics.financialImpact.totalSavings,
          roi: metrics.financialImpact.roi
        },
        highlights: this.extractReportHighlights(metrics),
        concerns: this.extractReportConcerns(metrics),
        recommendations: metrics.recommendations.slice(0, 5), // Top 5 recommendations
        detailedMetrics: metrics
      };
      
      // Store report
      await this.storeReport(report);
      
      return report;
    } catch (error) {
      console.error('Error generating automated report:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Extract report highlights
   * @param {Object} metrics - Metrics data
   * @returns {Array} Highlights
   */
  extractReportHighlights(metrics) {
    const highlights = [];
    
    if (metrics.successScores.overall >= 0.8) {
      highlights.push({
        type: 'achievement',
        title: 'Excellent Performance',
        description: `Overall success score of ${Math.round(metrics.successScores.overall * 100)}% exceeds expectations.`
      });
    }
    
    if (metrics.financialImpact.totalSavings > 1000) {
      highlights.push({
        type: 'financial',
        title: 'Significant Savings',
        description: `Generated $${metrics.financialImpact.totalSavings.toFixed(2)} in savings for users.`
      });
    }
    
    if (metrics.engagementMetrics.openRate > 0.3) {
      highlights.push({
        type: 'engagement',
        title: 'High Engagement',
        description: `${Math.round(metrics.engagementMetrics.openRate * 100)}% open rate indicates strong user interest.`
      });
    }
    
    return highlights;
  }

  /**
   * Extract report concerns
   * @param {Object} metrics - Metrics data
   * @returns {Array} Concerns
   */
  extractReportConcerns(metrics) {
    const concerns = [];
    const thresholds = this.options.successThresholds;
    
    if (metrics.successScores.delivery < thresholds.notificationDelivery) {
      concerns.push({
        type: 'delivery',
        title: 'Low Delivery Rate',
        description: `Delivery rate of ${Math.round(metrics.successScores.delivery * 100)}% is below target.`
      });
    }
    
    if (metrics.successScores.engagement < thresholds.userEngagement) {
      concerns.push({
        type: 'engagement',
        title: 'Low Engagement',
        description: `Engagement rate of ${Math.round(metrics.successScores.engagement * 100)}% needs improvement.`
      });
    }
    
    if (metrics.trends && metrics.trends.trends.overall.direction === 'decreasing') {
      concerns.push({
        type: 'trend',
        title: 'Declining Performance',
        description: 'Success metrics are trending downward and require attention.'
      });
    }
    
    return concerns;
  }

  /**
   * Store report
   * @param {Object} report - Report data
   */
  async storeReport(report) {
    try {
      await createDoc("AlertSuccessReport", {
        type: report.type,
        generatedAt: report.generatedAt,
        timeRange: report.timeRange,
        summary: report.summary,
        highlights: report.highlights,
        concerns: report.concerns,
        recommendations: report.recommendations
      });
    } catch (error) {
      console.error('Error storing report:', error);
    }
  }

  /**
   * Start background processes
   */
  startBackgroundProcesses() {
    // Generate automated reports
    if (this.options.enableAutomatedReports) {
      const interval = this.options.reportFrequency === 'daily' ? 24 * 60 * 60 * 1000 :
                      this.options.reportFrequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 :
                      30 * 24 * 60 * 60 * 1000;
      
      setInterval(() => {
        this.generateAutomatedReport(this.options.reportFrequency);
      }, interval);
    }
    
    // Clean up old metrics
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Clean up old metrics
   */
  async cleanupOldMetrics() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.metricsRetentionDays);
      
      // This would delete old metrics records
      // For now, just log the cleanup
      console.log(`Cleaning up metrics older than ${cutoffDate}`);
    } catch (error) {
      console.error('Error cleaning up old metrics:', error);
    }
  }
}

// Singleton instance
let alertSuccessMetricsInstance = null;

/**
 * Get or create alert success metrics instance
 * @param {Object} options - Configuration options
 * @returns {AlertSuccessMetrics} Metrics instance
 */
export function getAlertSuccessMetrics(options) {
  if (!alertSuccessMetricsInstance) {
    alertSuccessMetricsInstance = new AlertSuccessMetrics(options);
  }
  return alertSuccessMetricsInstance;
}

/**
 * Calculate success metrics (convenience function)
 * @param {Object} options - Calculation options
 */
export async function calculateSuccessMetrics(options) {
  const metrics = getAlertSuccessMetrics();
  return await metrics.calculateSuccessMetrics(options);
}

/**
 * Generate automated report (convenience function)
 * @param {string} reportType - Report type
 */
export async function generateAutomatedReport(reportType) {
  const metrics = getAlertSuccessMetrics();
  return await metrics.generateAutomatedReport(reportType);
}