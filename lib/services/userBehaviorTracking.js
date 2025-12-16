import "server-only";
import { 
  UserAnalytics, 
  AggregatedAnalytics 
} from "../db/models";
import { createOneDoc, updateOneDoc } from "../db/createOperationDB";
import { getOneDoc, getManyDocs } from "../db/getOperationDB";

/**
 * User Behavior Tracking Service
 * Analyzes and tracks user behavior patterns, preferences, and engagement
 */

class UserBehaviorTrackingService {
  /**
   * Track user behavior event
   */
  async trackBehavior(behaviorData) {
    try {
      const {
        userId,
        sessionId,
        eventType,
        page,
        context = {},
        metadata = {}
      } = behaviorData;

      // Get or create user analytics
      let userAnalytics = await getOneDoc("UserAnalytics", { userId });
      
      if (!userAnalytics) {
        userAnalytics = await this.createUserAnalytics(userId);
      }

      // Add behavior event
      const behaviorEvent = {
        eventType,
        timestamp: new Date(),
        sessionId,
        page,
        referrer: context.referrer || null,
        userAgent: context.userAgent || null,
        ipAddress: context.ipAddress || null,
        deviceType: context.deviceType || 'desktop',
        browser: context.browser || null,
        os: context.os || null,
        location: context.location || {},
        metadata,
        duration: metadata.duration || null,
        scrollDepth: metadata.scrollDepth || null,
        viewport: context.viewport || {}
      };

      await updateOneDoc(
        "UserAnalytics",
        { userId },
        {
          $push: { behaviors: behaviorEvent },
          $set: { 'aggregatedMetrics.lastActivity': new Date() }
        }
      );

      // Update behavior patterns
      await this.updateBehaviorPatterns(userId, behaviorEvent);

      // Update aggregated metrics
      await this.updateAggregatedBehaviorMetrics(behaviorEvent);

      return behaviorEvent;
    } catch (error) {
      console.error("Error tracking user behavior:", error);
      throw error;
    }
  }

  /**
   * Track user journey
   */
  async trackJourney(journeyData) {
    try {
      const {
        userId,
        journeyId,
        goal,
        step,
        stepData,
        context = {}
      } = journeyData;

      const userAnalytics = await getOneDoc("UserAnalytics", { userId });
      
      if (!userAnalytics) {
        await this.createUserAnalytics(userId);
      }

      const journeyStep = {
        step,
        timestamp: new Date(),
        page: context.page,
        metadata: stepData
      };

      // Find existing journey or create new one
      const existingJourney = userAnalytics?.journeys?.find(j => j.journeyId === journeyId);
      
      if (existingJourney) {
        await updateOneDoc(
          "UserAnalytics",
          { userId, "journeys.journeyId": journeyId },
          {
            $push: { "journeys.$.steps": journeyStep },
            $set: { "journeys.$.status": 'in_progress' }
          }
        );
      } else {
        await updateOneDoc(
          "UserAnalytics",
          { userId },
          {
            $push: {
              journeys: {
                journeyId,
                goal,
                status: 'in_progress',
                steps: [journeyStep],
                startTime: new Date()
              }
            }
          }
        );
      }

      return journeyStep;
    } catch (error) {
      console.error("Error tracking user journey:", error);
      throw error;
    }
  }

  /**
   * Complete user journey
   */
  async completeJourney(journeyData) {
    try {
      const {
        userId,
        journeyId,
        conversionValue = 0,
        dropOffPoint = null
      } = journeyData;

      const userAnalytics = await getOneDoc("UserAnalytics", { userId });
      const journey = userAnalytics?.journeys?.find(j => j.journeyId === journeyId);
      
      if (!journey) {
        throw new Error('Journey not found');
      }

      const totalDuration = new Date() - new Date(journey.startTime);
      
      await updateOneDoc(
        "UserAnalytics",
        { userId, "journeys.journeyId": journeyId },
        {
          $set: {
            "journeys.$.status": 'completed',
            "journeys.$.endTime": new Date(),
            "journeys.$.totalDuration": totalDuration,
            "journeys.$.conversionValue": conversionValue,
            "journeys.$.dropOffPoint": dropOffPoint
          },
          $inc: { 'aggregatedMetrics.totalValue': conversionValue }
        }
      );

      // Update user preferences based on journey
      await this.updateUserPreferencesFromJourney(userId, journey, conversionValue);

      return true;
    } catch (error) {
      console.error("Error completing journey:", error);
      throw error;
    }
  }

  /**
   * Analyze user behavior patterns
   */
  async analyzeUserBehavior(userId, options = {}) {
    try {
      const { 
        period = '30d', 
        includePredictions = true 
      } = options;

      const userAnalytics = await getOneDoc("UserAnalytics", { userId });
      
      if (!userAnalytics || !userAnalytics.behaviors) {
        return {
          patterns: {},
          preferences: {},
          predictions: {},
          insights: []
        };
      }

      const behaviors = this.filterBehaviorsByPeriod(userAnalytics.behaviors, period);
      
      const analysis = {
        patterns: this.analyzeBehaviorPatterns(behaviors),
        preferences: this.analyzeUserPreferences(userAnalytics),
        engagement: this.analyzeEngagementMetrics(behaviors),
        predictions: includePredictions ? await this.generatePredictions(userId, behaviors) : {},
        insights: this.generateInsights(behaviors, userAnalytics)
      };

      return analysis;
    } catch (error) {
      console.error("Error analyzing user behavior:", error);
      throw error;
    }
  }

  /**
   * Create user analytics document
   */
  async createUserAnalytics(userId) {
    const userAnalyticsData = {
      userId,
      consent: {
        analytics: true,
        marketing: false,
        personalization: false,
        consentDate: new Date(),
        consentVersion: "1.0"
      },
      behaviors: [],
      sessions: [],
      journeys: [],
      engagementMetrics: [],
      aggregatedMetrics: {
        totalSessions: 0,
        totalPageViews: 0,
        totalEvents: 0,
        averageSessionDuration: 0,
        bounceRate: 0,
        conversionRate: 0,
        lastActivity: new Date(),
        firstActivity: new Date(),
        totalValue: 0,
        favoriteCategories: [],
        preferredDestinations: [],
        priceSensitivity: 'mid_range',
        bookingFrequency: 'occasional',
        loyaltyScore: 0,
        churnRisk: 'low'
      },
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        content: {
          language: 'en',
          currency: 'USD',
          timezone: null
        },
        travel: {
          preferredAirlines: [],
          preferredHotels: [],
          travelClass: 'economy',
          roomType: 'standard'
        }
      },
      privacy: {
        dataRetentionPeriod: 365,
        anonymizedAt: null,
        deletedAt: null,
        dataProcessingConsent: false
      }
    };

    return await createOneDoc("UserAnalytics", userAnalyticsData);
  }

  /**
   * Update behavior patterns
   */
  async updateBehaviorPatterns(userId, behaviorEvent) {
    try {
      const { eventType, page, deviceType, metadata } = behaviorEvent;

      // Update page visit patterns
      if (eventType === 'page_view') {
        await this.updatePagePatterns(userId, page, deviceType);
      }

      // Update interaction patterns
      if (eventType === 'click') {
        await this.updateClickPatterns(userId, page, metadata);
      }

      // Update search patterns
      if (eventType === 'search') {
        await this.updateSearchPatterns(userId, metadata);
      }

      // Update booking patterns
      if (eventType.includes('booking')) {
        await this.updateBookingPatterns(userId, eventType, metadata);
      }

    } catch (error) {
      console.error("Error updating behavior patterns:", error);
    }
  }

  /**
   * Update aggregated behavior metrics
   */
  async updateAggregatedBehaviorMetrics(behaviorEvent) {
    try {
      const { eventType } = behaviorEvent;
      const today = new Date().toISOString().split('T')[0];
      const analyticsId = `${today}:daily`;

      const updateData = {
        $inc: {}
      };

      // Update event counters
      updateData.$inc[`overview.totalEvents`] = 1;
      
      if (eventType === 'page_view') {
        updateData.$inc[`overview.pageViews`] = 1;
      } else if (eventType === 'search') {
        updateData.$inc[`overview.totalSearches`] = 1;
      } else if (eventType.includes('booking')) {
        updateData.$inc[`overview.totalBookings`] = 1;
        if (eventType === 'booking_completed') {
          updateData.$inc[`overview.totalRevenue`] = behaviorEvent.metadata.value || 0;
        }
      }

      await updateOneDoc(
        "AggregatedAnalytics",
        { _id: analyticsId },
        updateData,
        { upsert: true }
      );

    } catch (error) {
      console.error("Error updating aggregated metrics:", error);
    }
  }

  /**
   * Analyze behavior patterns
   */
  analyzeBehaviorPatterns(behaviors) {
    const patterns = {
      timeOfDay: {},
      dayOfWeek: {},
      deviceUsage: {},
      pageFlow: [],
      sessionDuration: {
        average: 0,
        median: 0,
        min: 0,
        max: 0
      },
      pageViewsPerSession: {
        average: 0,
        median: 0
      },
      bounceRate: 0,
      returnVisits: 0
    };

    // Analyze time patterns
    behaviors.forEach(behavior => {
      const date = new Date(behavior.timestamp);
      const hour = date.getHours();
      const day = date.getDay();

      patterns.timeOfDay[hour] = (patterns.timeOfDay[hour] || 0) + 1;
      patterns.dayOfWeek[day] = (patterns.dayOfWeek[day] || 0) + 1;
      patterns.deviceUsage[behavior.deviceType] = (patterns.deviceUsage[behavior.deviceType] || 0) + 1;
    });

    // Analyze page flow
    const pageSequence = behaviors
      .filter(b => b.eventType === 'page_view')
      .map(b => b.page);
    
    for (let i = 0; i < pageSequence.length - 1; i++) {
      patterns.pageFlow.push({
        from: pageSequence[i],
        to: pageSequence[i + 1],
        count: 1
      });
    }

    // Group and count page flows
    const flowMap = {};
    patterns.pageFlow.forEach(flow => {
      const key = `${flow.from} -> ${flow.to}`;
      flowMap[key] = (flowMap[key] || 0) + 1;
    });

    patterns.pageFlow = Object.entries(flowMap)
      .map(([key, count]) => {
        const [from, to] = key.split(' -> ');
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return patterns;
  }

  /**
   * Analyze user preferences
   */
  analyzeUserPreferences(userAnalytics) {
    const preferences = {
      device: this.getPreferredDevice(userAnalytics.behaviors),
      timePreferences: this.getTimePreferences(userAnalytics.behaviors),
      contentPreferences: this.getContentPreferences(userAnalytics.behaviors),
      travelPreferences: userAnalytics.preferences?.travel || {},
      priceSensitivity: this.analyzePriceSensitivity(userAnalytics.behaviors),
      bookingFrequency: this.analyzeBookingFrequency(userAnalytics.behaviors)
    };

    return preferences;
  }

  /**
   * Analyze engagement metrics
   */
  analyzeEngagementMetrics(behaviors) {
    const sessions = this.groupBehaviorsBySession(behaviors);
    const sessionDurations = sessions.map(session => 
      session.length > 1 ? 
        new Date(session[session.length - 1].timestamp) - new Date(session[0].timestamp) : 
        0
    );

    const pageViews = behaviors.filter(b => b.eventType === 'page_view').length;
    const totalEvents = behaviors.length;

    return {
      totalSessions: sessions.length,
      averageSessionDuration: sessionDurations.length > 0 ? 
        sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length : 0,
      medianSessionDuration: this.calculateMedian(sessionDurations),
      pageViewsPerSession: sessions.length > 0 ? pageViews / sessions.length : 0,
      eventsPerSession: sessions.length > 0 ? totalEvents / sessions.length : 0,
      bounceRate: this.calculateBounceRate(sessions),
      engagementScore: this.calculateEngagementScore(behaviors)
    };
  }

  /**
   * Generate user predictions
   */
  async generatePredictions(userId, behaviors) {
    const predictions = {
      nextBooking: await this.predictNextBooking(userId, behaviors),
      likelyDestinations: this.predictDestinations(behaviors),
      priceRange: this.predictPriceRange(behaviors),
      churnRisk: this.predictChurnRisk(behaviors),
      bestContactTime: this.predictBestContactTime(behaviors)
    };

    return predictions;
  }

  /**
   * Generate insights
   */
  generateInsights(behaviors, userAnalytics) {
    const insights = [];

    // Analyze booking patterns
    const bookingBehaviors = behaviors.filter(b => b.eventType.includes('booking'));
    if (bookingBehaviors.length > 0) {
      const conversionRate = this.calculateConversionRate(behaviors);
      
      if (conversionRate > 10) {
        insights.push({
          type: 'high_conversion',
          title: 'High Conversion Rate',
          description: 'User has a high booking conversion rate, showing strong purchase intent.',
          priority: 'high'
        });
      } else if (conversionRate < 2) {
        insights.push({
          type: 'low_conversion',
          title: 'Low Conversion Rate',
          description: 'User has a low booking conversion rate. Consider offering assistance or promotions.',
          priority: 'medium'
        });
      }
    }

    // Analyze engagement patterns
    const engagement = this.analyzeEngagementMetrics(behaviors);
    if (engagement.engagementScore > 80) {
      insights.push({
        type: 'highly_engaged',
        title: 'Highly Engaged User',
        description: 'User shows high engagement levels. Good candidate for loyalty programs.',
        priority: 'high'
      });
    } else if (engagement.engagementScore < 20) {
      insights.push({
        type: 'low_engagement',
        title: 'Low Engagement',
        description: 'User engagement is low. Consider re-engagement campaigns.',
        priority: 'medium'
      });
    }

    // Analyze device preferences
    const deviceUsage = this.analyzeDeviceUsage(behaviors);
    if (deviceUsage.mobile > 70) {
      insights.push({
        type: 'mobile_preference',
        title: 'Mobile-First User',
        description: 'User primarily uses mobile devices. Ensure mobile experience is optimized.',
        priority: 'medium'
      });
    }

    return insights;
  }

  /**
   * Helper methods
   */
  filterBehaviorsByPeriod(behaviors, period) {
    const days = parseInt(period.replace('d', '')) || 30;
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    return behaviors.filter(behavior => 
      new Date(behavior.timestamp) >= cutoffDate
    );
  }

  groupBehaviorsBySession(behaviors) {
    const sessions = {};
    
    behaviors.forEach(behavior => {
      const sessionId = behavior.sessionId;
      if (!sessions[sessionId]) {
        sessions[sessionId] = [];
      }
      sessions[sessionId].push(behavior);
    });

    return Object.values(sessions);
  }

  calculateMedian(values) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 ? 
      (sorted[middle - 1] + sorted[middle]) / 2 : 
      sorted[middle];
  }

  calculateBounceRate(sessions) {
    if (sessions.length === 0) return 0;
    
    const bouncedSessions = sessions.filter(session => 
      session.length === 1 && session[0].eventType === 'page_view'
    ).length;
    
    return (bouncedSessions / sessions.length) * 100;
  }

  calculateConversionRate(behaviors) {
    const totalSearches = behaviors.filter(b => b.eventType === 'search').length;
    if (totalSearches === 0) return 0;
    
    const conversions = behaviors.filter(b => 
      b.eventType === 'booking_completed'
    ).length;
    
    return (conversions / totalSearches) * 100;
  }

  calculateEngagementScore(behaviors) {
    const weights = {
      page_view: 1,
      search: 3,
      click: 2,
      booking_initiated: 5,
      booking_completed: 10
    };

    const totalScore = behaviors.reduce((sum, behavior) => {
      return sum + (weights[behavior.eventType] || 1);
    }, 0);

    // Normalize to 0-100 scale
    return Math.min(100, totalScore / behaviors.length * 10);
  }

  analyzeDeviceUsage(behaviors) {
    const usage = { desktop: 0, mobile: 0, tablet: 0 };
    const total = behaviors.length;

    behaviors.forEach(behavior => {
      if (usage[behavior.deviceType] !== undefined) {
        usage[behavior.deviceType]++;
      }
    });

    Object.keys(usage).forEach(device => {
      usage[device] = total > 0 ? (usage[device] / total) * 100 : 0;
    });

    return usage;
  }

  // Additional helper methods for predictions and analysis
  async predictNextBooking(userId, behaviors) {
    // This would implement ML-based prediction
    // For now, return placeholder
    return {
      likelihood: 0.7,
      timeframe: '7d',
      confidence: 0.6
    };
  }

  predictDestinations(behaviors) {
    const destinations = {};
    
    behaviors
      .filter(b => b.eventType === 'search' && b.metadata.destination)
      .forEach(b => {
        const dest = b.metadata.destination;
        destinations[dest] = (destinations[dest] || 0) + 1;
      });

    return Object.entries(destinations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([destination, count]) => ({ destination, probability: count / behaviors.length }));
  }

  predictPriceRange(behaviors) {
    const prices = behaviors
      .filter(b => b.metadata.priceRange)
      .map(b => b.metadata.priceRange.average)
      .filter(price => price > 0);

    if (prices.length === 0) {
      return { min: 0, max: 0, likely: 0 };
    }

    prices.sort((a, b) => a - b);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      likely: this.calculateMedian(prices)
    };
  }

  predictChurnRisk(behaviors) {
    const lastActivity = behaviors.length > 0 ? 
      new Date(behaviors[behaviors.length - 1].timestamp) : 
      new Date(0);

    const daysSinceLastActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastActivity > 30) {
      return { risk: 'high', score: 0.8 };
    } else if (daysSinceLastActivity > 14) {
      return { risk: 'medium', score: 0.5 };
    } else {
      return { risk: 'low', score: 0.2 };
    }
  }

  predictBestContactTime(behaviors) {
    const hourCounts = {};
    
    behaviors.forEach(behavior => {
      const hour = new Date(behavior.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const bestHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 10;

    return {
      hour: bestHour,
      day: 'weekday', // Simplified - could be enhanced with day analysis
      confidence: 0.7
    };
  }

  // Additional methods for updating specific patterns
  async updatePagePatterns(userId, page, deviceType) {
    // Implementation for page pattern updates
  }

  async updateClickPatterns(userId, page, metadata) {
    // Implementation for click pattern updates
  }

  async updateSearchPatterns(userId, metadata) {
    // Implementation for search pattern updates
  }

  async updateBookingPatterns(userId, eventType, metadata) {
    // Implementation for booking pattern updates
  }

  getPreferredDevice(behaviors) {
    const usage = this.analyzeDeviceUsage(behaviors);
    return Object.entries(usage)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'desktop';
  }

  getTimePreferences(behaviors) {
    const hourCounts = {};
    behaviors.forEach(behavior => {
      const hour = new Date(behavior.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 10;

    return {
      peakHour,
      timeOfDay: peakHour < 12 ? 'morning' : peakHour < 18 ? 'afternoon' : 'evening'
    };
  }

  getContentPreferences(behaviors) {
    const pages = behaviors
      .filter(b => b.eventType === 'page_view')
      .map(b => b.page);

    const pageCategories = {};
    pages.forEach(page => {
      const category = this.categorizePage(page);
      pageCategories[category] = (pageCategories[category] || 0) + 1;
    });

    return Object.entries(pageCategories)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({ category, count }));
  }

  categorizePage(page) {
    if (page.includes('/flights')) return 'flights';
    if (page.includes('/hotels')) return 'hotels';
    if (page.includes('/user/profile')) return 'profile';
    if (page.includes('/user/my_bookings')) return 'bookings';
    if (page.includes('/search')) return 'search';
    return 'other';
  }

  analyzePriceSensitivity(behaviors) {
    const prices = behaviors
      .filter(b => b.metadata.priceRange)
      .map(b => b.metadata.priceRange.average)
      .filter(price => price > 0);

    if (prices.length === 0) return 'mid_range';

    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    if (avgPrice < 100) return 'budget';
    if (avgPrice < 300) return 'mid_range';
    if (avgPrice < 600) return 'premium';
    return 'luxury';
  }

  analyzeBookingFrequency(behaviors) {
    const bookings = behaviors.filter(b => b.eventType === 'booking_completed');
    const daysSinceFirst = bookings.length > 0 ? 
      (Date.now() - new Date(bookings[0].timestamp).getTime()) / (1000 * 60 * 60 * 24) : 
      0;

    const frequency = daysSinceFirst > 0 ? bookings.length / (daysSinceFirst / 30) : 0;
    
    if (frequency < 0.5) return 'rare';
    if (frequency < 1) return 'occasional';
    if (frequency < 2) return 'regular';
    return 'frequent';
  }

  async updateUserPreferencesFromJourney(userId, journey, conversionValue) {
    // Update user preferences based on successful journey
    const preferences = {
      $set: {}
    };

    if (journey.goal.includes('booking') && conversionValue > 0) {
      preferences.$set['preferences.travel.priceSensitivity'] = this.analyzePriceSensitivityFromValue(conversionValue);
      preferences.$inc['aggregatedMetrics.totalValue'] = conversionValue;
    }

    await updateOneDoc("UserAnalytics", { userId }, preferences);
  }

  analyzePriceSensitivityFromValue(value) {
    if (value < 200) return 'budget';
    if (value < 500) return 'mid_range';
    if (value < 1000) return 'premium';
    return 'luxury';
  }
}

// Singleton instance
const userBehaviorTrackingService = new UserBehaviorTrackingService();

export default userBehaviorTrackingService;