import { 
  getManyDocs, 
  createDoc, 
  updateOneDoc 
} from "@/lib/db/operations";
import { PriceAlert } from "@/lib/db/models";
import { getPriceTrackingEngine } from "./priceTracking";
import { getNotificationService } from "./notifications";
import { getSocialSharingService } from "./socialSharing";

/**
 * Flight Search Integration Service
 * Integrates price alerts with the existing flight search system
 */
export class FlightSearchIntegration {
  constructor(options = {}) {
    this.options = {
      enableAutoAlerts: true,
      maxAlertSuggestions: 3,
      priceDropThreshold: 5, // 5% drop to suggest alert
      ...options
    };
    
    this.priceTrackingEngine = getPriceTrackingEngine();
    this.notificationService = getNotificationService();
    this.socialSharingService = getSocialSharingService();
  }

  /**
   * Process flight search results and provide alert suggestions
   * @param {Object} searchResults - Flight search results
   * @param {Object} searchCriteria - Flight search criteria
   * @param {Object} user - User object
   * @returns {Object} Processed results with alert suggestions
   */
  async processFlightSearchResults(searchResults, searchCriteria, user) {
    try {
      // Analyze search results for alert opportunities
      const analysis = await this.analyzeSearchResults(searchResults, searchCriteria, user);
      
      // Enhance search results with price alert data
      const enhancedResults = await this.enrichSearchResults(searchResults, searchCriteria, user);
      
      // Generate alert suggestions if enabled
      let alertSuggestions = [];
      if (this.options.enableAutoAlerts) {
        alertSuggestions = await this.generateAlertSuggestions(analysis, searchCriteria, user);
      }
      
      // Track search behavior for analytics
      await this.trackSearchBehavior(searchCriteria, user, analysis);

      return {
        originalResults: searchResults,
        enhancedResults,
        analysis,
        alertSuggestions,
        userContext: {
          existingAlerts: analysis.existingAlerts,
          searchHistory: analysis.searchHistory,
          preferences: user.priceAlertPreferences || {},
        },
      };
    } catch (error) {
      console.error('Error processing flight search results:', error);
      return {
        originalResults: searchResults,
        enhancedResults: searchResults,
        analysis: null,
        alertSuggestions: [],
        error: error.message,
      };
    }
  }

  /**
   * Analyze search results for insights
   * @param {Object} searchResults - Flight search results
   * @param {Object} searchCriteria - Flight search criteria
   * @param {Object} user - User object
   * @returns {Object} Analysis results
   */
  async analyzeSearchResults(searchResults, searchCriteria, user) {
    try {
      // Get user's existing alerts for this route
      const existingAlerts = await getManyDocs("PriceAlert", {
        userId: user._id,
        "searchCriteria.origin.airportCode": searchCriteria.origin?.airportCode,
        "searchCriteria.destination.airportCode": searchCriteria.destination?.airportCode,
        status: { $in: ['active', 'triggered'] },
      });

      // Analyze price distribution
      const priceAnalysis = this.analyzePriceDistribution(searchResults);
      
      // Check for price volatility
      const volatilityAnalysis = await this.analyzePriceVolatility(searchCriteria);
      
      // Identify best value options
      const valueAnalysis = this.identifyBestValueOptions(searchResults);

      return {
        existingAlerts,
        priceAnalysis,
        volatilityAnalysis,
        valueAnalysis,
        searchHistory: await this.getSearchHistory(user._id, searchCriteria),
        recommendations: this.generateRecommendations(priceAnalysis, volatilityAnalysis, existingAlerts),
      };
    } catch (error) {
      console.error('Error analyzing search results:', error);
      return {
        existingAlerts: [],
        priceAnalysis: {},
        volatilityAnalysis: {},
        valueAnalysis: {},
        searchHistory: [],
        recommendations: [],
      };
    }
  }

  /**
   * Enrich search results with price alert information
   * @param {Object} searchResults - Flight search results
   * @param {Object} searchCriteria - Flight search criteria
   * @param {Object} user - User object
   * @returns {Object} Enriched search results
   */
  async enrichSearchResults(searchResults, searchCriteria, user) {
    try {
      // Get price history for this route
      const priceHistory = await this.getPriceHistory(searchCriteria);
      
      // Enrich each flight with price context
      const enrichedFlights = searchResults.flights?.map(flight => {
        const flightPriceHistory = priceHistory.filter(h => h.flightId === flight._id);
        const priceContext = this.calculatePriceContext(flight, flightPriceHistory);
        
        return {
          ...flight,
          priceAlert: {
            isBelowAverage: priceContext.isBelowAverage,
            priceTrend: priceContext.trend,
            recommendation: priceContext.recommendation,
            potentialSavings: priceContext.potentialSavings,
            alertLikelihood: this.calculateAlertLikelihood(flight, priceContext),
          },
          socialProof: {
            totalBookings: this.getBookingCount(flight._id),
            recentActivity: this.getRecentActivity(flight._id),
          },
        };
      }) || [];

      return {
        ...searchResults,
        flights: enrichedFlights,
        priceAlertContext: {
          routeVolatility: await this.analyzePriceVolatility(searchCriteria),
          bestTimeToBuy: await this.getBestTimeToBuy(searchCriteria),
          priceTrend: await this.getPriceTrend(searchCriteria),
        },
      };
    } catch (error) {
      console.error('Error enriching search results:', error);
      return searchResults;
    }
  }

  /**
   * Generate alert suggestions based on search analysis
   * @param {Object} analysis - Search analysis
   * @param {Object} searchCriteria - Flight search criteria
   * @param {Object} user - User object
   * @returns {Array} Alert suggestions
   */
  async generateAlertSuggestions(analysis, searchCriteria, user) {
    try {
      const suggestions = [];
      
      // Don't suggest if user already has active alerts for this route
      if (analysis.existingAlerts.length > 0) {
        return suggestions;
      }

      // Suggest based on price volatility
      if (analysis.volatilityAnalysis.highVolatility) {
        suggestions.push({
          type: 'volatility',
          title: 'High Price Volatility Detected',
          description: `Prices for this route are highly volatile. Set up an alert to catch price drops.`,
          recommendedConditions: {
            percentageDrop: { enabled: true, threshold: 10 },
            dailyChange: { enabled: true, threshold: 5 },
          },
          priority: 'high',
          estimatedSavings: analysis.priceAnalysis.averagePrice * 0.15,
        });
      }

      // Suggest based on price trend
      if (analysis.priceAnalysis.trend === 'decreasing') {
        suggestions.push({
          type: 'trend',
          title: 'Prices Are Dropping',
          description: `Prices for this route have been decreasing. Set an alert to catch the lowest prices.`,
          recommendedConditions: {
            specificPrice: { 
              enabled: true, 
              targetPrice: analysis.priceAnalysis.currentPrice * 0.9 
            },
          },
          priority: 'medium',
          estimatedSavings: analysis.priceAnalysis.currentPrice * 0.1,
        });
      }

      // Suggest based on seasonal patterns
      if (analysis.priceAnalysis.seasonalLow) {
        suggestions.push({
          type: 'seasonal',
          title: 'Seasonal Low Price Period',
          description: `This route typically has lower prices during this period. Set an alert to maximize savings.`,
          recommendedConditions: {
            percentageDrop: { enabled: true, threshold: 5 },
            priceTrend: { enabled: true, direction: 'decreasing' },
          },
          priority: 'medium',
          estimatedSavings: analysis.priceAnalysis.averagePrice * 0.08,
        });
      }

      // Limit suggestions
      return suggestions.slice(0, this.options.maxAlertSuggestions);
    } catch (error) {
      console.error('Error generating alert suggestions:', error);
      return [];
    }
  }

  /**
   * Create price alert from search results
   * @param {Object} alertData - Alert configuration
   * @param {Object} searchCriteria - Flight search criteria
   * @param {Object} user - User object
   * @returns {Object} Created alert
   */
  async createAlertFromSearch(alertData, searchCriteria, user) {
    try {
      // Create alert with search context
      const alert = await createDoc("PriceAlert", {
        userId: user._id,
        email: user.email,
        searchCriteria,
        alertConditions: alertData.alertConditions || {
          percentageDrop: { enabled: true, threshold: 10 },
        },
        notificationPreferences: alertData.notificationPreferences || {
          email: { enabled: true, frequency: 'immediate' },
          push: { enabled: true },
          sms: { enabled: false },
        },
        currentBestPrice: alertData.currentPrice || null,
        status: 'active',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        source: 'search_integration',
        metadata: {
          searchId: alertData.searchId,
          flightIds: alertData.selectedFlights || [],
          userAgent: alertData.userAgent,
        },
      });

      // Add to tracking engine
      this.priceTrackingEngine.addAlert(alert);

      // Send confirmation notification
      await this.notificationService.sendPriceAlertNotification(alert, null, []);

      return alert;
    } catch (error) {
      console.error('Error creating alert from search:', error);
      throw error;
    }
  }

  /**
   * Track user search behavior for analytics
   * @param {Object} searchCriteria - Flight search criteria
   * @param {Object} user - User object
   * @param {Object} analysis - Search analysis
   */
  async trackSearchBehavior(searchCriteria, user, analysis) {
    try {
      await createDoc("SearchBehavior", {
        userId: user._id,
        searchCriteria,
        timestamp: new Date(),
        resultsCount: analysis.priceAnalysis.resultCount || 0,
        averagePrice: analysis.priceAnalysis.averagePrice || 0,
        priceRange: analysis.priceAnalysis.priceRange || {},
        existingAlertsCount: analysis.existingAlerts.length,
        alertSuggestionsGenerated: analysis.recommendations.length || 0,
        userAgent: 'web', // Would be extracted from request
        sessionId: 'session_' + Date.now(), // Would be from session management
      });
    } catch (error) {
      console.error('Error tracking search behavior:', error);
    }
  }

  /**
   * Analyze price distribution in search results
   * @param {Object} searchResults - Flight search results
   * @returns {Object} Price analysis
   */
  analyzePriceDistribution(searchResults) {
    if (!searchResults.flights || searchResults.flights.length === 0) {
      return {
        resultCount: 0,
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        priceRange: {},
        trend: 'unknown',
        seasonalLow: false,
      };
    }

    const prices = searchResults.flights.map(f => f.fareBreakdowns?.total || 0).filter(p => p > 0);
    
    if (prices.length === 0) {
      return {
        resultCount: searchResults.flights.length,
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        priceRange: {},
        trend: 'unknown',
        seasonalLow: false,
      };
    }

    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const medianPrice = this.calculateMedian(prices);

    // Simple trend analysis (would be more sophisticated with historical data)
    let trend = 'stable';
    if (maxPrice - minPrice > averagePrice * 0.3) {
      trend = 'volatile';
    } else if (minPrice < averagePrice * 0.8) {
      trend = 'decreasing';
    }

    return {
      resultCount: prices.length,
      averagePrice,
      minPrice,
      maxPrice,
      medianPrice,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        spread: maxPrice - minPrice,
        spreadPercentage: averagePrice > 0 ? ((maxPrice - minPrice) / averagePrice) * 100 : 0,
      },
      trend,
      seasonalLow: false, // Would be determined by historical data
    };
  }

  /**
   * Analyze price volatility for a route
   * @param {Object} searchCriteria - Flight search criteria
   * @returns {Object} Volatility analysis
   */
  async analyzePriceVolatility(searchCriteria) {
    try {
      // Get price history for this route
      const priceHistory = await this.getPriceHistory(searchCriteria);
      
      if (priceHistory.length < 5) {
        return {
          highVolatility: false,
          volatilityScore: 0,
          recommendation: 'insufficient_data',
        };
      }

      // Calculate volatility metrics
      const prices = priceHistory.map(h => h.currentPrice?.amount || 0).filter(p => p > 0);
      const volatilityScore = this.calculateVolatilityScore(prices);
      
      return {
        highVolatility: volatilityScore > 20, // 20% volatility threshold
        volatilityScore,
        recommendation: volatilityScore > 20 ? 'set_alert' : 'monitor',
        bestTimeToBuy: await this.getBestTimeToBuy(searchCriteria),
      };
    } catch (error) {
      console.error('Error analyzing price volatility:', error);
      return {
        highVolatility: false,
        volatilityScore: 0,
        recommendation: 'error',
      };
    }
  }

  /**
   * Identify best value options in search results
   * @param {Object} searchResults - Flight search results
   * @returns {Object} Value analysis
   */
  identifyBestValueOptions(searchResults) {
    if (!searchResults.flights || searchResults.flights.length === 0) {
      return {
        bestValue: null,
        topValues: [],
        valueScore: {},
      };
    }

    // Calculate value scores for each flight
    const flightsWithValue = searchResults.flights.map(flight => {
      const price = flight.fareBreakdowns?.total || 0;
      const duration = flight.totalDuration || 0;
      const stops = flight.segmentIds?.length - 1 || 0;
      
      // Simple value score (lower is better for price, higher is better for speed/directness)
      const valueScore = this.calculateValueScore(price, duration, stops);
      
      return {
        flight,
        valueScore,
        priceRank: 0, // Would be calculated
        durationRank: 0, // Would be calculated
      };
    });

    // Sort by value score
    flightsWithValue.sort((a, b) => b.valueScore - a.valueScore);

    return {
      bestValue: flightsWithValue[0],
      topValues: flightsWithValue.slice(0, 5),
      valueScore: flightsWithValue.reduce((acc, f) => {
        acc[f.flight._id] = f.valueScore;
        return acc;
      }, {}),
    };
  }

  /**
   * Get price history for a route
   * @param {Object} searchCriteria - Flight search criteria
   * @returns {Array} Price history
   */
  async getPriceHistory(searchCriteria) {
    try {
      const history = await getManyDocs("PriceHistory", {
        "route.origin.airportCode": searchCriteria.origin?.airportCode,
        "route.destination.airportCode": searchCriteria.destination?.airportCode,
        cabinClass: searchCriteria.cabinClass || 'economy',
      });

      return history;
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    }
  }

  /**
   * Get user's search history
   * @param {string} userId - User ID
   * @param {Object} searchCriteria - Current search criteria
   * @returns {Array} Search history
   */
  async getSearchHistory(userId, searchCriteria) {
    try {
      const history = await getManyDocs("SearchBehavior", {
        userId,
        "searchCriteria.origin.airportCode": searchCriteria.origin?.airportCode,
        "searchCriteria.destination.airportCode": searchCriteria.destination?.airportCode,
      }, [], { limit: 10, sort: { timestamp: -1 } });

      return history;
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }

  /**
   * Calculate price context for a flight
   * @param {Object} flight - Flight object
   * @param {Array} priceHistory - Price history for this flight
   * @returns {Object} Price context
   */
  calculatePriceContext(flight, priceHistory) {
    const currentPrice = flight.fareBreakdowns?.total || 0;
    
    if (priceHistory.length === 0) {
      return {
        isBelowAverage: false,
        trend: 'unknown',
        recommendation: 'monitor',
        potentialSavings: 0,
      };
    }

    const historicalPrices = priceHistory.map(h => h.currentPrice?.amount || 0).filter(p => p > 0);
    const averagePrice = historicalPrices.reduce((sum, price) => sum + price, 0) / historicalPrices.length;
    
    const isBelowAverage = currentPrice < averagePrice;
    const trend = this.calculateSimpleTrend(historicalPrices);
    
    let recommendation = 'monitor';
    if (isBelowAverage && trend === 'decreasing') {
      recommendation = 'book_now';
    } else if (isBelowAverage) {
      recommendation = 'consider_booking';
    }

    const potentialSavings = isBelowAverage ? averagePrice - currentPrice : 0;

    return {
      isBelowAverage,
      trend,
      recommendation,
      potentialSavings,
      historicalAverage: averagePrice,
    };
  }

  /**
   * Calculate alert likelihood for a flight
   * @param {Object} flight - Flight object
   * @param {Object} priceContext - Price context
   * @returns {number} Alert likelihood (0-100)
   */
  calculateAlertLikelihood(flight, priceContext) {
    let likelihood = 0;
    
    // Higher likelihood for volatile routes
    if (priceContext.trend === 'volatile') {
      likelihood += 30;
    }
    
    // Higher likelihood if price is trending down
    if (priceContext.trend === 'decreasing') {
      likelihood += 25;
    }
    
    // Higher likelihood for below-average prices
    if (priceContext.isBelowAverage) {
      likelihood += 20;
    }
    
    // Higher likelihood for significant potential savings
    if (priceContext.potentialSavings > 100) {
      likelihood += 25;
    }
    
    return Math.min(likelihood, 100);
  }

  /**
   * Calculate median value
   * @param {Array} values - Array of values
   * @returns {number} Median value
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  /**
   * Calculate volatility score
   * @param {Array} prices - Array of prices
   * @returns {number} Volatility score (percentage)
   */
  calculateVolatilityScore(prices) {
    if (prices.length < 2) return 0;
    
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);
    
    return mean > 0 ? (standardDeviation / mean) * 100 : 0;
  }

  /**
   * Calculate simple trend
   * @param {Array} prices - Array of prices
   * @returns {string} Trend direction
   */
  calculateSimpleTrend(prices) {
    if (prices.length < 3) return 'unknown';
    
    const recent = prices.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const change = last - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;
    
    if (Math.abs(changePercent) < 5) return 'stable';
    return changePercent > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate value score for a flight
   * @param {number} price - Flight price
   * @param {number} duration - Flight duration in minutes
   * @param {number} stops - Number of stops
   * @returns {number} Value score
   */
  calculateValueScore(price, duration, stops) {
    // Normalize factors (lower is better for all)
    const priceScore = Math.max(0, 100 - (price / 100)); // Assuming average price is $100
    const durationScore = Math.max(0, 100 - (duration / 10)); // Assuming 10 minutes per point
    const stopsScore = Math.max(0, 100 - (stops * 25)); // 25 points per stop
    
    // Weighted average
    return (priceScore * 0.5) + (durationScore * 0.3) + (stopsScore * 0.2);
  }

  /**
   * Get best time to buy for a route
   * @param {Object} searchCriteria - Flight search criteria
   * @returns {Object} Best time to buy recommendation
   */
  async getBestTimeToBuy(searchCriteria) {
    try {
      const priceHistory = await this.getPriceHistory(searchCriteria);
      
      if (priceHistory.length < 10) {
        return { recommendation: 'insufficient_data', confidence: 0 };
      }
      
      // Analyze by day of week and month
      const byDayOfWeek = {};
      const byMonth = {};
      
      for (const history of priceHistory) {
        if (history.priceHistory) {
          for (const pricePoint of history.priceHistory) {
            const date = new Date(pricePoint.timestamp);
            const dayOfWeek = date.getDay();
            const month = date.getMonth();
            
            if (!byDayOfWeek[dayOfWeek]) {
              byDayOfWeek[dayOfWeek] = [];
            }
            byDayOfWeek[dayOfWeek].push(pricePoint.price);
            
            if (!byMonth[month]) {
              byMonth[month] = [];
            }
            byMonth[month].push(pricePoint.price);
          }
        }
      }
      
      // Find best day and month
      const bestDay = this.findBestPeriod(byDayOfWeek);
      const bestMonth = this.findBestPeriod(byMonth);
      
      return {
        recommendation: 'optimal_time_found',
        bestDay,
        bestMonth,
        confidence: Math.min(priceHistory.length / 50, 1) * 100,
      };
    } catch (error) {
      console.error('Error getting best time to buy:', error);
      return { recommendation: 'error', confidence: 0 };
    }
  }

  /**
   * Find best period from price data
   * @param {Object} periodData - Price data by period
   * @returns {Object} Best period
   */
  findBestPeriod(periodData) {
    let bestPeriod = null;
    let lowestAverage = Infinity;
    
    for (const [period, prices] of Object.entries(periodData)) {
      if (prices.length > 0) {
        const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        if (average < lowestAverage) {
          lowestAverage = average;
          bestPeriod = {
            period: parseInt(period),
            averagePrice: average,
            dataPoints: prices.length,
          };
        }
      }
    }
    
    return bestPeriod;
  }

  /**
   * Get price trend for a route
   * @param {Object} searchCriteria - Flight search criteria
   * @returns {Object} Price trend
   */
  async getPriceTrend(searchCriteria) {
    try {
      const priceHistory = await this.getPriceHistory(searchCriteria);
      
      if (priceHistory.length < 5) {
        return { trend: 'unknown', confidence: 0 };
      }
      
      // Aggregate all price points
      const allPrices = [];
      for (const history of priceHistory) {
        if (history.priceHistory) {
          allPrices.push(...history.priceHistory);
        }
      }
      
      // Sort by timestamp
      allPrices.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Simple trend analysis
      const firstPrice = allPrices[0].price;
      const lastPrice = allPrices[allPrices.length - 1].price;
      const change = lastPrice - firstPrice;
      const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
      
      let trend = 'stable';
      if (Math.abs(changePercent) < 3) {
        trend = 'stable';
      } else if (changePercent > 0) {
        trend = 'increasing';
      } else {
        trend = 'decreasing';
      }
      
      return {
        trend,
        changePercent,
        confidence: Math.min(allPrices.length / 30, 1) * 100,
        dataPoints: allPrices.length,
      };
    } catch (error) {
      console.error('Error getting price trend:', error);
      return { trend: 'unknown', confidence: 0 };
    }
  }

  /**
   * Get booking count for a flight (mock implementation)
   * @param {string} flightId - Flight ID
   * @returns {number} Booking count
   */
  getBookingCount(flightId) {
    // In a real implementation, this would query the booking database
    return Math.floor(Math.random() * 100) + 10;
  }

  /**
   * Get recent activity for a flight (mock implementation)
   * @param {string} flightId - Flight ID
   * @returns {Object} Recent activity
   */
  getRecentActivity(flightId) {
    // In a real implementation, this would query activity logs
    return {
      bookings: Math.floor(Math.random() * 10) + 1,
      alerts: Math.floor(Math.random() * 5),
      views: Math.floor(Math.random() * 50) + 10,
    };
  }

  /**
   * Generate recommendations based on analysis
   * @param {Object} priceAnalysis - Price analysis
   * @param {Object} volatilityAnalysis - Volatility analysis
   * @param {Array} existingAlerts - Existing alerts
   * @returns {Array} Recommendations
   */
  generateRecommendations(priceAnalysis, volatilityAnalysis, existingAlerts) {
    const recommendations = [];
    
    // Don't recommend if user already has alerts
    if (existingAlerts.length > 0) {
      recommendations.push({
        type: 'manage_existing',
        title: 'Manage Your Alerts',
        description: 'You already have price alerts for this route. Check your alert dashboard.',
        action: 'manage_alerts',
      });
      return recommendations;
    }
    
    // Recommend based on volatility
    if (volatilityAnalysis.highVolatility) {
      recommendations.push({
        type: 'set_alert',
        title: 'Set Price Alert',
        description: 'This route has high price volatility. Set an alert to catch price drops.',
        action: 'create_alert',
        priority: 'high',
      });
    }
    
    // Recommend based on price trend
    if (priceAnalysis.trend === 'decreasing') {
      recommendations.push({
        type: 'monitor_prices',
        title: 'Monitor Prices',
        description: 'Prices are trending down. Set an alert to book at the right time.',
        action: 'create_alert',
        priority: 'medium',
      });
    }
    
    return recommendations;
  }
}

// Singleton instance
let flightSearchIntegrationInstance = null;

/**
 * Get or create flight search integration instance
 * @param {Object} options - Configuration options
 * @returns {FlightSearchIntegration} Integration instance
 */
export function getFlightSearchIntegration(options) {
  if (!flightSearchIntegrationInstance) {
    flightSearchIntegrationInstance = new FlightSearchIntegration(options);
  }
  return flightSearchIntegrationInstance;
}

/**
 * Process flight search results with price alert integration (convenience function)
 * @param {Object} searchResults - Flight search results
 * @param {Object} searchCriteria - Flight search criteria
 * @param {Object} user - User object
 */
export async function processFlightSearchWithAlerts(searchResults, searchCriteria, user) {
  const integration = getFlightSearchIntegration();
  return await integration.processFlightSearchResults(searchResults, searchCriteria, user);
}

/**
 * Create price alert from search results (convenience function)
 * @param {Object} alertData - Alert configuration
 * @param {Object} searchCriteria - Flight search criteria
 * @param {Object} user - User object
 */
export async function createAlertFromSearch(alertData, searchCriteria, user) {
  const integration = getFlightSearchIntegration();
  return await integration.createAlertFromSearch(alertData, searchCriteria, user);
}