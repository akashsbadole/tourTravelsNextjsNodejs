import { 
  getManyDocs, 
  createDoc, 
  updateOneDoc 
} from "@/lib/db/operations";
import { PriceHistory, PriceAlert } from "@/lib/db/models";
import { getPerformanceOptimizer } from "./performanceOptimizer";

/**
 * Price Trend Analysis and Prediction Service
 * Analyzes historical price data and generates predictions
 */
export class PriceTrendAnalysis {
  constructor(options = {}) {
    this.options = {
      minDataPoints: 10, // Minimum data points for analysis
      predictionDays: 30, // Days to predict ahead
      confidenceThreshold: 0.7, // Minimum confidence for predictions
      seasonalityAnalysis: true,
      volatilityAnalysis: true,
      ...options
    };
    
    this.performanceOptimizer = getPerformanceOptimizer();
    this.trendModels = new Map();
  }

  /**
   * Analyze price trends for a route
   * @param {Object} searchCriteria - Flight search criteria
   * @returns {Object} Trend analysis results
   */
  async analyzePriceTrends(searchCriteria) {
    try {
      // Get price history for the route
      const priceHistory = await this.getPriceHistory(searchCriteria);
      
      if (priceHistory.length === 0) {
        return {
          success: false,
          error: 'No price history available for this route',
        };
      }

      // Extract price points from history
      const pricePoints = this.extractPricePoints(priceHistory);
      
      if (pricePoints.length < this.options.minDataPoints) {
        return {
          success: false,
          error: `Insufficient data points. Need at least ${this.options.minDataPoints} points, got ${pricePoints.length}`,
        };
      }

      // Perform various analyses
      const linearRegression = this.calculateLinearRegression(pricePoints);
      const movingAverage = this.calculateMovingAverage(pricePoints);
      const volatility = this.calculateVolatility(pricePoints);
      const seasonality = this.options.seasonalityAnalysis ? 
        this.analyzeSeasonality(pricePoints) : null;
      const trendStrength = this.calculateTrendStrength(pricePoints);
      
      // Generate predictions
      const predictions = await this.generatePredictions(pricePoints, {
        linearRegression,
        movingAverage,
        volatility,
        seasonality,
      });

      // Calculate best time to buy
      const bestTimeToBuy = await this.calculateBestTimeToBuy(pricePoints, predictions);

      // Generate insights
      const insights = this.generateTrendInsights({
        linearRegression,
        movingAverage,
        volatility,
        seasonality,
        trendStrength,
        predictions,
      });

      return {
        success: true,
        route: `${searchCriteria.origin.airportCode}-${searchCriteria.destination.airportCode}`,
        analysis: {
          dataPoints: pricePoints.length,
          dateRange: {
            start: pricePoints[0].timestamp,
            end: pricePoints[pricePoints.length - 1].timestamp,
          },
          linearRegression,
          movingAverage,
          volatility,
          seasonality,
          trendStrength,
        },
        predictions,
        bestTimeToBuy,
        insights,
        confidence: this.calculateOverallConfidence(pricePoints.length, volatility),
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error analyzing price trends:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get price history for a route
   * @param {Object} searchCriteria - Flight search criteria
   * @returns {Array} Price history documents
   */
  async getPriceHistory(searchCriteria) {
    try {
      const cacheKey = `trend_analysis:${searchCriteria.origin.airportCode}-${searchCriteria.destination.airportCode}-${searchCriteria.cabinClass || 'economy'}`;
      
      // Try to get from cache first
      const { data: cachedHistory, fromCache } = await this.performanceOptimizer.getCachedPriceData(cacheKey);
      
      if (fromCache && cachedHistory) {
        return cachedHistory;
      }
      
      // Get fresh data
      const history = await getManyDocs("PriceHistory", {
        "route.origin.airportCode": searchCriteria.origin?.airportCode,
        "route.destination.airportCode": searchCriteria.destination?.airportCode,
        cabinClass: searchCriteria.cabinClass || 'economy',
      });

      // Cache the results
      await this.performanceOptimizer.redis.set(cacheKey, history, 1800); // 30 minutes cache
      
      return history;
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    }
  }

  /**
   * Extract price points from history documents
   * @param {Array} priceHistory - Price history documents
   * @returns {Array} Price points
   */
  extractPricePoints(priceHistory) {
    const pricePoints = [];
    
    for (const history of priceHistory) {
      if (history.priceHistory && Array.isArray(history.priceHistory)) {
        for (const point of history.priceHistory) {
          pricePoints.push({
            price: point.price,
            timestamp: new Date(point.timestamp),
            source: point.source || 'unknown',
            flightId: point.flightId || history.flightId,
          });
        }
      }
      
      // Also include current price
      if (history.currentPrice && history.currentPrice.amount) {
        pricePoints.push({
          price: history.currentPrice.amount,
          timestamp: new Date(history.currentPrice.recordedAt),
          source: 'current',
          flightId: history.flightId,
        });
      }
    }
    
    // Sort by timestamp
    pricePoints.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove duplicates (same timestamp, keep lowest price)
    const uniquePoints = new Map();
    for (const point of pricePoints) {
      const key = point.timestamp.getTime();
      if (!uniquePoints.has(key) || point.price < uniquePoints.get(key).price) {
        uniquePoints.set(key, point);
      }
    }
    
    return Array.from(uniquePoints.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculate linear regression for price trend
   * @param {Array} pricePoints - Price points
   * @returns {Object} Linear regression results
   */
  calculateLinearRegression(pricePoints) {
    const n = pricePoints.length;
    if (n < 2) {
      return { slope: 0, intercept: 0, rSquared: 0, trend: 'unknown' };
    }

    // Convert timestamps to numeric values (days since first point)
    const firstTimestamp = pricePoints[0].timestamp.getTime();
    const xValues = pricePoints.map((point, index) => index);
    const yValues = pricePoints.map(point => point.price);

    // Calculate regression coefficients
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, index) => sum + x * yValues[index], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    
    for (let i = 0; i < n; i++) {
      const predicted = slope * xValues[i] + intercept;
      ssTotal += Math.pow(yValues[i] - meanY, 2);
      ssResidual += Math.pow(yValues[i] - predicted, 2);
    }

    const rSquared = 1 - (ssResidual / ssTotal);

    // Determine trend
    let trend = 'stable';
    const priceChange = slope * n; // Total change over the period
    const priceChangePercent = (priceChange / yValues[0]) * 100;
    
    if (Math.abs(priceChangePercent) < 3) {
      trend = 'stable';
    } else if (priceChangePercent > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return {
      slope,
      intercept,
      rSquared,
      trend,
      priceChange,
      priceChangePercent,
      confidence: Math.max(0, Math.min(1, rSquared)),
    };
  }

  /**
   * Calculate moving average
   * @param {Array} pricePoints - Price points
   * @param {number} period - Moving average period (default: 7)
   * @returns {Object} Moving average results
   */
  calculateMovingAverage(pricePoints, period = 7) {
    if (pricePoints.length < period) {
      return { values: [], current: null, trend: 'unknown' };
    }

    const values = [];
    
    for (let i = period - 1; i < pricePoints.length; i++) {
      const sum = pricePoints
        .slice(i - period + 1, i + 1)
        .reduce((sum, point) => sum + point.price, 0);
      
      values.push({
        timestamp: pricePoints[i].timestamp,
        value: sum / period,
      });
    }

    const current = values.length > 0 ? values[values.length - 1].value : null;

    // Determine trend from moving average
    let trend = 'stable';
    if (values.length >= 3) {
      const recent = values.slice(-3);
      const first = recent[0].value;
      const last = recent[recent.length - 1].value;
      const changePercent = ((last - first) / first) * 100;
      
      if (Math.abs(changePercent) < 2) {
        trend = 'stable';
      } else if (changePercent > 0) {
        trend = 'increasing';
      } else {
        trend = 'decreasing';
      }
    }

    return {
      period,
      values,
      current,
      trend,
    };
  }

  /**
   * Calculate price volatility
   * @param {Array} pricePoints - Price points
   * @returns {Object} Volatility metrics
   */
  calculateVolatility(pricePoints) {
    if (pricePoints.length < 2) {
      return { volatility: 0, standardDeviation: 0, coefficient: 0, level: 'low' };
    }

    const prices = pricePoints.map(point => point.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Calculate standard deviation
    const squaredDifferences = prices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate coefficient of variation
    const coefficient = mean > 0 ? (standardDeviation / mean) * 100 : 0;

    // Determine volatility level
    let level = 'low';
    if (coefficient > 20) {
      level = 'high';
    } else if (coefficient > 10) {
      level = 'medium';
    }

    // Calculate daily volatility
    const dailyChanges = [];
    for (let i = 1; i < pricePoints.length; i++) {
      const change = Math.abs(pricePoints[i].price - pricePoints[i-1].price);
      const changePercent = (change / pricePoints[i-1].price) * 100;
      dailyChanges.push(changePercent);
    }

    const averageDailyChange = dailyChanges.reduce((sum, change) => sum + change, 0) / dailyChanges.length;
    const maxDailyChange = Math.max(...dailyChanges);

    return {
      volatility: coefficient,
      standardDeviation,
      coefficient,
      level,
      mean,
      min: Math.min(...prices),
      max: Math.max(...prices),
      range: Math.max(...prices) - Math.min(...prices),
      averageDailyChange,
      maxDailyChange,
    };
  }

  /**
   * Analyze seasonality in price data
   * @param {Array} pricePoints - Price points
   * @returns {Object} Seasonality analysis
   */
  analyzeSeasonality(pricePoints) {
    if (pricePoints.length < 30) {
      return { detected: false, reason: 'Insufficient data for seasonality analysis' };
    }

    // Group by month
    const monthlyPrices = {};
    const monthlyAverages = {};
    
    for (const point of pricePoints) {
      const date = new Date(point.timestamp);
      const month = date.getMonth(); // 0-11
      
      if (!monthlyPrices[month]) {
        monthlyPrices[month] = [];
      }
      monthlyPrices[month].push(point.price);
    }

    // Calculate monthly averages
    for (const [month, prices] of Object.entries(monthlyPrices)) {
      monthlyAverages[month] = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }

    // Find seasonal patterns
    const sortedMonths = Object.entries(monthlyAverages)
      .sort((a, b) => a[1] - b[1])
      .map(([month, avg]) => ({ month: parseInt(month), average: avg }));

    const cheapestMonth = sortedMonths[0];
    const mostExpensiveMonth = sortedMonths[sortedMonths.length - 1];
    const seasonalSpread = mostExpensiveMonth.average - cheapestMonth.average;
    const seasonalSpreadPercent = (seasonalSpread / cheapestMonth.average) * 100;

    // Determine if seasonality is significant
    const detected = seasonalSpreadPercent > 15; // 15% threshold

    // Group by day of week
    const dayOfWeekPrices = {};
    const dayOfWeekAverages = {};
    
    for (const point of pricePoints) {
      const date = new Date(point.timestamp);
      const dayOfWeek = date.getDay(); // 0-6
      
      if (!dayOfWeekPrices[dayOfWeek]) {
        dayOfWeekPrices[dayOfWeek] = [];
      }
      dayOfWeekPrices[dayOfWeek].push(point.price);
    }

    // Calculate day of week averages
    for (const [day, prices] of Object.entries(dayOfWeekPrices)) {
      dayOfWeekAverages[day] = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sortedDays = Object.entries(dayOfWeekAverages)
      .sort((a, b) => a[1] - b[1])
      .map(([day, avg]) => ({ day: parseInt(day), dayName: dayNames[day], average: avg }));

    return {
      detected,
      monthly: {
        averages: monthlyAverages,
        cheapestMonth,
        mostExpensiveMonth,
        seasonalSpread,
        seasonalSpreadPercent,
      },
      dayOfWeek: {
        averages: dayOfWeekAverages,
        cheapestDay: sortedDays[0],
        mostExpensiveDay: sortedDays[sortedDays.length - 1],
      },
      recommendations: detected ? this.generateSeasonalRecommendations(sortedMonths, sortedDays) : [],
    };
  }

  /**
   * Calculate trend strength
   * @param {Array} pricePoints - Price points
   * @returns {Object} Trend strength metrics
   */
  calculateTrendStrength(pricePoints) {
    if (pricePoints.length < 10) {
      return { strength: 'unknown', confidence: 0 };
    }

    // Use multiple methods to assess trend strength
    const linearRegression = this.calculateLinearRegression(pricePoints);
    const movingAverage = this.calculateMovingAverage(pricePoints, Math.min(14, Math.floor(pricePoints.length / 3)));
    
    // Calculate trend consistency
    let consistentDirection = 0;
    let totalChanges = 0;
    
    for (let i = 1; i < pricePoints.length; i++) {
      const change = pricePoints[i].price - pricePoints[i-1].price;
      totalChanges++;
      
      if ((linearRegression.trend === 'increasing' && change > 0) ||
          (linearRegression.trend === 'decreasing' && change < 0)) {
        consistentDirection++;
      }
    }

    const consistency = totalChanges > 0 ? (consistentDirection / totalChanges) : 0;

    // Calculate momentum
    const recentPrices = pricePoints.slice(-7);
    const olderPrices = pricePoints.slice(-14, -7);
    
    let momentum = 0;
    if (recentPrices.length > 0 && olderPrices.length > 0) {
      const recentAvg = recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;
      const olderAvg = olderPrices.reduce((sum, p) => sum + p.price, 0) / olderPrices.length;
      momentum = ((recentAvg - olderAvg) / olderAvg) * 100;
    }

    // Determine overall strength
    let strength = 'weak';
    let confidence = 0;
    
    if (linearRegression.confidence > 0.7 && consistency > 0.6 && Math.abs(momentum) > 3) {
      strength = 'strong';
      confidence = Math.min(0.95, linearRegression.confidence + 0.2);
    } else if (linearRegression.confidence > 0.5 && consistency > 0.5 && Math.abs(momentum) > 1) {
      strength = 'moderate';
      confidence = Math.min(0.8, linearRegression.confidence + 0.1);
    } else if (linearRegression.confidence > 0.3) {
      strength = 'weak';
      confidence = linearRegression.confidence;
    }

    return {
      strength,
      confidence,
      consistency,
      momentum,
      direction: linearRegression.trend,
    };
  }

  /**
   * Generate price predictions
   * @param {Array} pricePoints - Historical price points
   * @param {Object} analysisComponents - Analysis components
   * @returns {Object} Price predictions
   */
  async generatePredictions(pricePoints, analysisComponents) {
    const { linearRegression, movingAverage, volatility, seasonality } = analysisComponents;
    
    const predictions = {
      shortTerm: [], // 1-7 days
      mediumTerm: [], // 8-30 days
      longTerm: [], // 31-90 days
      confidence: 0,
    };

    const lastPrice = pricePoints[pricePoints.length - 1].price;
    const lastTimestamp = pricePoints[pricePoints.length - 1].timestamp;

    // Generate predictions for different timeframes
    for (let days = 1; days <= 90; days++) {
      const predictedPrice = this.calculatePredictedPrice(
        days, lastPrice, linearRegression, movingAverage, seasonality
      );
      
      const confidence = this.calculatePredictionConfidence(
        days, pricePoints.length, volatility, linearRegression
      );

      const prediction = {
        date: new Date(lastTimestamp.getTime() + days * 24 * 60 * 60 * 1000),
        price: predictedPrice,
        confidence,
        priceChange: predictedPrice - lastPrice,
        priceChangePercent: ((predictedPrice - lastPrice) / lastPrice) * 100,
      };

      // Categorize by timeframe
      if (days <= 7) {
        predictions.shortTerm.push(prediction);
      } else if (days <= 30) {
        predictions.mediumTerm.push(prediction);
      } else {
        predictions.longTerm.push(prediction);
      }
    }

    // Calculate overall confidence
    const shortTermConfidence = predictions.shortTerm.length > 0 ? 
      predictions.shortTerm.reduce((sum, p) => sum + p.confidence, 0) / predictions.shortTerm.length : 0;
    
    predictions.confidence = shortTermConfidence;

    return predictions;
  }

  /**
   * Calculate predicted price for a specific day
   * @param {number} days - Days ahead to predict
   * @param {number} lastPrice - Last known price
   * @param {Object} linearRegression - Linear regression analysis
   * @param {Object} movingAverage - Moving average analysis
   * @param {Object} seasonality - Seasonality analysis
   * @returns {number} Predicted price
   */
  calculatePredictedPrice(days, lastPrice, linearRegression, movingAverage, seasonality) {
    // Base prediction from linear regression
    let predictedPrice = lastPrice + (linearRegression.slope * days);

    // Apply moving average adjustment
    if (movingAverage.current && movingAverage.trend !== 'stable') {
      const maAdjustment = (movingAverage.current - lastPrice) * (days / 7);
      predictedPrice += maAdjustment;
    }

    // Apply seasonal adjustment
    if (seasonality && seasonality.detected) {
      const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const month = futureDate.getMonth();
      const dayOfWeek = futureDate.getDay();
      
      if (seasonality.monthly.averages[month] !== undefined) {
        const monthlyAvg = seasonality.monthly.averages[month];
        const overallAvg = Object.values(seasonality.monthly.averages)
          .reduce((sum, avg) => sum + avg, 0) / 12;
        const seasonalFactor = monthlyAvg / overallAvg;
        predictedPrice *= seasonalFactor;
      }

      if (seasonality.dayOfWeek.averages[dayOfWeek] !== undefined) {
        const dayAvg = seasonality.dayOfWeek.averages[dayOfWeek];
        const overallDayAvg = Object.values(seasonality.dayOfWeek.averages)
          .reduce((sum, avg) => sum + avg, 0) / 7;
        const dayFactor = dayAvg / overallDayAvg;
        predictedPrice *= dayFactor;
      }
    }

    return predictedPrice;
  }

  /**
   * Calculate prediction confidence
   * @param {number} days - Days ahead
   * @param {number} dataPoints - Number of historical data points
   * @param {Object} volatility - Volatility analysis
   * @param {Object} linearRegression - Linear regression analysis
   * @returns {number} Confidence (0-1)
   */
  calculatePredictionConfidence(days, dataPoints, volatility, linearRegression) {
    let confidence = linearRegression.confidence || 0.5;

    // Reduce confidence for longer-term predictions
    const timeDecay = Math.exp(-days / 30); // Exponential decay
    confidence *= timeDecay;

    // Adjust based on data quality
    const dataQuality = Math.min(1, dataPoints / 100); // More data = higher confidence
    confidence *= dataQuality;

    // Adjust based on volatility
    const volatilityAdjustment = volatility.level === 'low' ? 1.0 : 
                             volatility.level === 'medium' ? 0.8 : 0.6;
    confidence *= volatilityAdjustment;

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Calculate best time to buy
   * @param {Array} pricePoints - Historical price points
   * @param {Object} predictions - Price predictions
   * @returns {Object} Best time to buy recommendations
   */
  async calculateBestTimeToBuy(pricePoints, predictions) {
    if (pricePoints.length < 10) {
      return { recommendation: 'insufficient_data', confidence: 0 };
    }

    // Analyze historical patterns
    const historicalBest = this.findHistoricalBestTimes(pricePoints);
    
    // Analyze predictions
    const predictionBest = this.findPredictedBestTimes(predictions);

    // Combine insights
    const recommendations = [];
    
    // Short-term recommendation
    if (predictions.shortTerm.length > 0) {
      const shortTermBest = predictions.shortTerm
        .filter(p => p.confidence > this.options.confidenceThreshold)
        .sort((a, b) => a.price - b.price)[0];
      
      if (shortTermBest) {
        recommendations.push({
          timeframe: 'short_term',
          date: shortTermBest.date,
          price: shortTermBest.price,
          savings: pricePoints[pricePoints.length - 1].price - shortTermBest.price,
          confidence: shortTermBest.confidence,
          reasoning: 'Based on short-term price trends',
        });
      }
    }

    // Medium-term recommendation
    if (predictions.mediumTerm.length > 0) {
      const mediumTermBest = predictions.mediumTerm
        .filter(p => p.confidence > this.options.confidenceThreshold)
        .sort((a, b) => a.price - b.price)[0];
      
      if (mediumTermBest) {
        recommendations.push({
          timeframe: 'medium_term',
          date: mediumTermBest.date,
          price: mediumTermBest.price,
          savings: pricePoints[pricePoints.length - 1].price - mediumTermBest.price,
          confidence: mediumTermBest.confidence,
          reasoning: 'Based on medium-term price trends',
        });
      }
    }

    // Determine overall best recommendation
    let overallRecommendation = null;
    if (recommendations.length > 0) {
      // Prioritize by confidence and savings
      recommendations.sort((a, b) => 
        (b.confidence * b.savings) - (a.confidence * a.savings)
      );
      overallRecommendation = recommendations[0];
    }

    return {
      recommendation: overallRecommendation ? 'optimal_time_found' : 'no_clear_optimum',
      overall: overallRecommendation,
      alternatives: recommendations.slice(1),
      historical: historicalBest,
      confidence: overallRecommendation ? overallRecommendation.confidence : 0,
    };
  }

  /**
   * Find historically best times to buy
   * @param {Array} pricePoints - Historical price points
   * @returns {Object} Historical best times
   */
  findHistoricalBestTimes(pricePoints) {
    // Group by month and day of week
    const monthlyBest = {};
    const dayOfWeekBest = {};
    
    for (const point of pricePoints) {
      const date = new Date(point.timestamp);
      const month = date.getMonth();
      const dayOfWeek = date.getDay();
      
      if (!monthlyBest[month] || point.price < monthlyBest[month].price) {
        monthlyBest[month] = { date: point.timestamp, price: point.price };
      }
      
      if (!dayOfWeekBest[dayOfWeek] || point.price < dayOfWeekBest[dayOfWeek].price) {
        dayOfWeekBest[dayOfWeek] = { date: point.timestamp, price: point.price };
      }
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      byMonth: Object.entries(monthlyBest)
        .map(([month, data]) => ({ month: parseInt(month), monthName: monthNames[month], ...data })),
      byDayOfWeek: Object.entries(dayOfWeekBest)
        .map(([day, data]) => ({ day: parseInt(day), dayName: dayNames[day], ...data })),
    };
  }

  /**
   * Find predicted best times to buy
   * @param {Object} predictions - Price predictions
   * @returns {Object} Predicted best times
   */
  findPredictedBestTimes(predictions) {
    const shortTermBest = predictions.shortTerm.length > 0 ? 
      predictions.shortTerm.reduce((best, current) => 
        current.price < best.price ? current : best
      ) : null;

    const mediumTermBest = predictions.mediumTerm.length > 0 ? 
      predictions.mediumTerm.reduce((best, current) => 
        current.price < best.price ? current : best
      ) : null;

    return {
      shortTerm: shortTermBest,
      mediumTerm: mediumTermBest,
    };
  }

  /**
   * Generate trend insights
   * @param {Object} analysisComponents - Analysis components
   * @returns {Array} Insights
   */
  generateTrendInsights(analysisComponents) {
    const insights = [];
    const { linearRegression, movingAverage, volatility, seasonality, trendStrength, predictions } = analysisComponents;

    // Trend direction insight
    if (trendStrength.direction !== 'stable') {
      insights.push({
        type: 'trend_direction',
        title: `Prices are ${trendStrength.direction}`,
        description: `Based on historical data, prices for this route are ${trendStrength.direction} with ${trendStrength.strength} confidence.`,
        priority: trendStrength.strength === 'strong' ? 'high' : 'medium',
        actionable: true,
      });
    }

    // Volatility insight
    if (volatility.level !== 'low') {
      insights.push({
        type: 'volatility',
        title: `${volatility.level.charAt(0).toUpperCase() + volatility.level.slice(1)} Price Volatility`,
        description: `Prices for this route show ${volatility.level} volatility with an average daily change of ${volatility.averageDailyChange.toFixed(1)}%.`,
        priority: volatility.level === 'high' ? 'high' : 'medium',
        actionable: true,
        recommendation: volatility.level === 'high' ? 'set_price_alerts' : 'monitor_closely',
      });
    }

    // Seasonality insight
    if (seasonality && seasonality.detected) {
      insights.push({
        type: 'seasonality',
        title: 'Seasonal Price Patterns Detected',
        description: `Prices vary by season with ${seasonality.monthly.seasonalSpreadPercent.toFixed(1)}% difference between cheapest and most expensive months.`,
        priority: 'medium',
        actionable: true,
        recommendation: `Best time to travel: ${seasonality.monthly.cheapestMonth.monthName}`,
      });
    }

    // Prediction confidence insight
    if (predictions.confidence < this.options.confidenceThreshold) {
      insights.push({
        type: 'prediction_confidence',
        title: 'Low Prediction Confidence',
        description: `Price predictions have low confidence (${(predictions.confidence * 100).toFixed(1)}%). Consider monitoring prices closely.`,
        priority: 'medium',
        actionable: true,
        recommendation: 'set_frequent_alerts',
      });
    }

    // Best time to buy insight
    if (predictions.shortTerm.length > 0) {
      const next7Days = predictions.shortTerm.slice(0, 7);
      const minPrice = Math.min(...next7Days.map(p => p.price));
      const maxPrice = Math.max(...next7Days.map(p => p.price));
      const priceRange = maxPrice - minPrice;
      
      if (priceRange > minPrice * 0.1) { // 10% variation
        insights.push({
          type: 'price_opportunity',
          title: 'Price Opportunity in Next 7 Days',
          description: `Prices are expected to vary by ${((priceRange / minPrice) * 100).toFixed(1)}% in the next week.`,
          priority: 'high',
          actionable: true,
          recommendation: 'set_alerts_for_drops',
        });
      }
    }

    return insights;
  }

  /**
   * Generate seasonal recommendations
   * @param {Array} sortedMonths - Months sorted by price
   * @param {Array} sortedDays - Days sorted by price
   * @returns {Array} Recommendations
   */
  generateSeasonalRecommendations(sortedMonths, sortedDays) {
    const recommendations = [];
    
    if (sortedMonths.length > 0) {
      const cheapestMonth = sortedMonths[0];
      recommendations.push({
        type: 'seasonal_month',
        title: `Book in ${cheapestMonth.monthName}`,
        description: `${cheapestMonth.monthName} typically has the lowest prices for this route.`,
        priority: 'medium',
      });
    }

    if (sortedDays.length > 0) {
      const cheapestDay = sortedDays[0];
      recommendations.push({
        type: 'seasonal_day',
        title: `Fly on ${cheapestDay.dayName}`,
        description: `${cheapestDay.dayName} flights are typically cheaper for this route.`,
        priority: 'low',
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall confidence
   * @param {number} dataPoints - Number of data points
   * @param {Object} volatility - Volatility analysis
   * @returns {number} Overall confidence (0-1)
   */
  calculateOverallConfidence(dataPoints, volatility) {
    let confidence = 0.5; // Base confidence

    // Adjust based on data volume
    const dataConfidence = Math.min(1, dataPoints / 50); // More data = higher confidence
    confidence = Math.max(confidence, dataConfidence);

    // Adjust based on volatility
    const volatilityAdjustment = volatility.level === 'low' ? 0.2 : 
                             volatility.level === 'medium' ? 0 : -0.2;
    confidence += volatilityAdjustment;

    return Math.max(0.1, Math.min(0.95, confidence));
  }
}

// Singleton instance
let priceTrendAnalysisInstance = null;

/**
 * Get or create price trend analysis instance
 * @param {Object} options - Configuration options
 * @returns {PriceTrendAnalysis} Analysis instance
 */
export function getPriceTrendAnalysis(options) {
  if (!priceTrendAnalysisInstance) {
    priceTrendAnalysisInstance = new PriceTrendAnalysis(options);
  }
  return priceTrendAnalysisInstance;
}

/**
 * Analyze price trends for a route (convenience function)
 * @param {Object} searchCriteria - Flight search criteria
 */
export async function analyzePriceTrends(searchCriteria) {
  const analysis = getPriceTrendAnalysis();
  return await analysis.analyzePriceTrends(searchCriteria);
}

/**
 * Generate price predictions for a route (convenience function)
 * @param {Object} searchCriteria - Flight search criteria
 */
export async function generatePricePredictions(searchCriteria) {
  const analysis = getPriceTrendAnalysis();
  const trendAnalysis = await analysis.analyzePriceTrends(searchCriteria);
  return trendAnalysis.success ? trendAnalysis.predictions : null;
}