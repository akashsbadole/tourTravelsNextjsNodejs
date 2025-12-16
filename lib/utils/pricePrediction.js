/**
 * Price Prediction Utilities
 * Advanced algorithms for predicting flight prices and best time to buy
 */

/**
 * Linear Regression Model
 * Simple linear regression for price trend prediction
 */
export class LinearRegressionModel {
  constructor() {
    this.slope = 0;
    this.intercept = 0;
    this.r2 = 0;
  }

  /**
   * Train the model with historical price data
   * @param {Array} data - Array of {x: timestamp, y: price} objects
   */
  train(data) {
    if (data.length < 2) return;

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    data.forEach(point => {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumX2 += point.x * point.x;
      sumY2 += point.y * point.y;
    });

    // Calculate slope and intercept
    this.slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    this.intercept = (sumY - this.slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;

    data.forEach(point => {
      const predicted = this.predict(point.x);
      ssTotal += Math.pow(point.y - meanY, 2);
      ssResidual += Math.pow(point.y - predicted, 2);
    });

    this.r2 = 1 - (ssResidual / ssTotal);
  }

  /**
   * Predict price at a given time
   * @param {number} x - Timestamp
   * @returns {number} Predicted price
   */
  predict(x) {
    return this.slope * x + this.intercept;
  }

  /**
   * Get model confidence
   * @returns {number} R-squared value
   */
  getConfidence() {
    return Math.max(0, Math.min(1, this.r2));
  }
}

/**
 * Seasonal Decomposition Model
 * Analyzes seasonal patterns in price data
 */
export class SeasonalDecompositionModel {
  constructor() {
    this.seasonalPatterns = {};
    this.trend = null;
    this.seasonality = 0;
  }

  /**
   * Analyze seasonal patterns
   * @param {Array} data - Array of price history objects
   */
  analyze(data) {
    if (data.length < 30) return;

    // Group by day of week
    const byDayOfWeek = this.groupByDayOfWeek(data);
    const byMonth = this.groupByMonth(data);
    const byDaysBeforeDeparture = this.groupByDaysBeforeDeparture(data);

    // Calculate seasonal patterns
    this.seasonalPatterns = {
      dayOfWeek: this.calculatePattern(byDayOfWeek),
      month: this.calculatePattern(byMonth),
      daysBeforeDeparture: this.calculatePattern(byDaysBeforeDeparture)
    };

    // Calculate overall seasonality strength
    this.seasonality = this.calculateSeasonalityStrength(data);
  }

  /**
   * Group data by day of week
   * @param {Array} data - Price history data
   * @returns {Object} Grouped data
   */
  groupByDayOfWeek(data) {
    const grouped = {};
    for (let i = 0; i < 7; i++) {
      grouped[i] = [];
    }

    data.forEach(point => {
      const dayOfWeek = new Date(point.timestamp).getDay();
      grouped[dayOfWeek].push(point.price);
    });

    return grouped;
  }

  /**
   * Group data by month
   * @param {Array} data - Price history data
   * @returns {Object} Grouped data
   */
  groupByMonth(data) {
    const grouped = {};
    for (let i = 0; i < 12; i++) {
      grouped[i] = [];
    }

    data.forEach(point => {
      const month = new Date(point.timestamp).getMonth();
      grouped[month].push(point.price);
    });

    return grouped;
  }

  /**
   * Group data by days before departure
   * @param {Array} data - Price history data
   * @returns {Object} Grouped data
   */
  groupByDaysBeforeDeparture(data) {
    const grouped = {};
    const maxDays = 90; // Maximum days to consider

    for (let i = 0; i <= maxDays; i++) {
      grouped[i] = [];
    }

    data.forEach(point => {
      if (point.daysBeforeDeparture !== undefined && point.daysBeforeDeparture >= 0) {
        const days = Math.min(Math.floor(point.daysBeforeDeparture), maxDays);
        grouped[days].push(point.price);
      }
    });

    return grouped;
  }

  /**
   * Calculate seasonal pattern from grouped data
   * @param {Object} groupedData - Grouped price data
   * @returns {Object} Seasonal pattern
   */
  calculatePattern(groupedData) {
    const pattern = {};
    const overall = [];

    // Calculate overall average
    Object.values(groupedData).forEach(values => {
      overall.push(...values);
    });
    const overallAvg = overall.reduce((sum, price) => sum + price, 0) / overall.length;

    // Calculate pattern for each period
    Object.entries(groupedData).forEach(([period, values]) => {
      if (values.length > 0) {
        const avg = values.reduce((sum, price) => sum + price, 0) / values.length;
        pattern[period] = {
          average: avg,
          deviation: ((avg - overallAvg) / overallAvg) * 100,
          count: values.length
        };
      }
    });

    return pattern;
  }

  /**
   * Calculate overall seasonality strength
   * @param {Array} data - Price history data
   * @returns {number} Seasonality strength (0-1)
   */
  calculateSeasonalityStrength(data) {
    if (data.length < 30) return 0;

    // Simple calculation based on variance
    const prices = data.map(d => d.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);

    // Normalize to get seasonality strength
    return Math.min(1, (standardDeviation / mean) * 2);
  }

  /**
   * Predict seasonal adjustment factor
   * @param {Date} date - Date to predict for
   * @param {number} daysBeforeDeparture - Days before departure
   * @returns {number} Seasonal adjustment factor
   */
  predictSeasonalAdjustment(date, daysBeforeDeparture) {
    if (!this.seasonalPatterns.dayOfWeek) return 1;

    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    const days = Math.min(Math.floor(daysBeforeDeparture), 90);

    // Calculate weighted adjustment
    let adjustment = 0;
    let weight = 0;

    if (this.seasonalPatterns.dayOfWeek[dayOfWeek]) {
      adjustment += this.seasonalPatterns.dayOfWeek[dayOfWeek].deviation * 0.3;
      weight += 0.3;
    }

    if (this.seasonalPatterns.month[month]) {
      adjustment += this.seasonalPatterns.month[month].deviation * 0.4;
      weight += 0.4;
    }

    if (this.seasonalPatterns.daysBeforeDeparture[days]) {
      adjustment += this.seasonalPatterns.daysBeforeDeparture[days].deviation * 0.3;
      weight += 0.3;
    }

    return weight > 0 ? 1 + (adjustment / weight / 100) : 1;
  }
}

/**
 * Price Prediction Engine
 * Main engine for predicting flight prices
 */
export class PricePredictionEngine {
  constructor(options = {}) {
    this.options = {
      // Minimum data points for reliable prediction
      minDataPoints: 15,
      // Maximum prediction horizon (days)
      maxPredictionDays: 90,
      // Confidence threshold for reliable predictions
      confidenceThreshold: 0.6,
      ...options
    };

    this.linearModel = new LinearRegressionModel();
    this.seasonalModel = new SeasonalDecompositionModel();
  }

  /**
   * Predict future prices for a flight
   * @param {Array} priceHistory - Historical price data
   * @param {Date} departureDate - Flight departure date
   * @param {Object} options - Prediction options
   * @returns {Object} Prediction results
   */
  async predictPrices(priceHistory, departureDate, options = {}) {
    try {
      const {
        predictionDays = 30,
        includeSeasonality = true,
        includeConfidence = true
      } = options;

      // Validate input data
      if (!priceHistory || priceHistory.length < this.options.minDataPoints) {
        return {
          success: false,
          error: 'Insufficient historical data for reliable prediction',
          predictions: [],
          confidence: 0
        };
      }

      // Prepare data for models
      const trainingData = this.prepareTrainingData(priceHistory);
      
      // Train models
      this.linearModel.train(trainingData);
      
      if (includeSeasonality) {
        this.seasonalModel.analyze(priceHistory);
      }

      // Generate predictions
      const predictions = this.generatePredictions(
        trainingData, 
        departureDate, 
        predictionDays, 
        includeSeasonality
      );

      // Calculate confidence
      const confidence = includeConfidence ? 
        this.calculatePredictionConfidence(trainingData, predictions) : 1;

      // Find best time to buy
      const bestTimeToBuy = this.findBestTimeToBuy(predictions, confidence);

      return {
        success: true,
        predictions,
        confidence,
        bestTimeToBuy,
        modelAccuracy: {
          linear: this.linearModel.getConfidence(),
          seasonal: includeSeasonality ? this.seasonalModel.seasonality : 0
        }
      };
    } catch (error) {
      console.error('Error predicting prices:', error);
      return {
        success: false,
        error: error.message,
        predictions: [],
        confidence: 0
      };
    }
  }

  /**
   * Prepare training data from price history
   * @param {Array} priceHistory - Raw price history
   * @returns {Array} Training data
   */
  prepareTrainingData(priceHistory) {
    return priceHistory
      .filter(point => point.price && point.timestamp)
      .map(point => ({
        x: new Date(point.timestamp).getTime(),
        y: point.price,
        date: new Date(point.timestamp)
      }))
      .sort((a, b) => a.x - b.x);
  }

  /**
   * Generate price predictions
   * @param {Array} trainingData - Training data
   * @param {Date} departureDate - Departure date
   * @param {number} predictionDays - Number of days to predict
   * @param {boolean} includeSeasonality - Whether to include seasonal adjustments
   * @returns {Array} Predictions
   */
  generatePredictions(trainingData, departureDate, predictionDays, includeSeasonality) {
    const predictions = [];
    const now = new Date();
    const lastDataPoint = trainingData[trainingData.length - 1];
    const daysSinceLastData = Math.floor((now - lastDataPoint.date) / (1000 * 60 * 60 * 24));

    for (let i = 1; i <= predictionDays; i++) {
      const futureDate = new Date(now);
      futureDate.setDate(now.getDate() + i);
      
      const futureTimestamp = futureDate.getTime();
      let predictedPrice = this.linearModel.predict(futureTimestamp);

      // Apply seasonal adjustment if enabled
      if (includeSeasonality) {
        const daysBeforeDeparture = Math.max(0, Math.floor((departureDate - futureDate) / (1000 * 60 * 60 * 24)));
        const seasonalAdjustment = this.seasonalModel.predictSeasonalAdjustment(
          futureDate, 
          daysBeforeDeparture
        );
        predictedPrice *= seasonalAdjustment;
      }

      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        price: Math.max(0, predictedPrice), // Ensure non-negative
        daysBeforeDeparture: Math.max(0, Math.floor((departureDate - futureDate) / (1000 * 60 * 60 * 24))),
        confidence: this.calculatePointConfidence(i, predictionDays)
      });
    }

    return predictions;
  }

  /**
   * Calculate confidence for individual prediction points
   * @param {number} daysOut - Days into the future
   * @param {number} totalDays - Total prediction horizon
   * @returns {number} Confidence score (0-1)
   */
  calculatePointConfidence(daysOut, totalDays) {
    // Confidence decreases as we predict further into the future
    const baseConfidence = this.linearModel.getConfidence();
    const timeDecay = Math.pow(0.95, daysOut);
    return baseConfidence * timeDecay;
  }

  /**
   * Calculate overall prediction confidence
   * @param {Array} trainingData - Training data
   * @param {Array} predictions - Predictions
   * @returns {number} Overall confidence (0-1)
   */
  calculatePredictionConfidence(trainingData, predictions) {
    const linearConfidence = this.linearModel.getConfidence();
    const dataQuality = Math.min(1, trainingData.length / 30); // More data = higher quality
    const seasonalStrength = this.seasonalModel.seasonality;

    // Weighted combination of factors
    return (linearConfidence * 0.5) + (dataQuality * 0.3) + (seasonalStrength * 0.2);
  }

  /**
   * Find best time to buy based on predictions
   * @param {Array} predictions - Price predictions
   * @param {number} confidence - Overall prediction confidence
   * @returns {Object} Best time to buy recommendation
   */
  findBestTimeToBuy(predictions, confidence) {
    if (predictions.length === 0 || confidence < this.options.confidenceThreshold) {
      return {
        recommendation: 'insufficient_data',
        date: null,
        price: null,
        confidence: 0,
        reasoning: 'Insufficient data or low confidence for reliable prediction'
      };
    }

    // Find the lowest predicted price
    const lowestPricePrediction = predictions.reduce((min, current) => 
      current.price < min.price ? current : min
    );

    // Check if the lowest price is significantly better than current
    const currentPrice = predictions[0]?.price || 0;
    const savings = currentPrice - lowestPricePrediction.price;
    const savingsPercentage = currentPrice > 0 ? (savings / currentPrice) * 100 : 0;

    let recommendation = 'wait';
    let reasoning = '';

    if (savingsPercentage < 2) {
      recommendation = 'buy_now';
      reasoning = 'Prices are not expected to drop significantly';
    } else if (lowestPricePrediction.daysBeforeDeparture < 7) {
      recommendation = 'buy_soon';
      reasoning = 'Best price is very close to departure date';
    } else if (savingsPercentage > 10) {
      recommendation = 'wait';
      reasoning = `Significant savings expected (${savingsPercentage.toFixed(1)}%)`;
    } else {
      recommendation = 'monitor';
      reasoning = 'Moderate savings possible, monitor closely';
    }

    return {
      recommendation,
      date: lowestPricePrediction.date,
      price: lowestPricePrediction.price,
      confidence,
      expectedSavings: savings,
      savingsPercentage,
      reasoning
    };
  }

  /**
   * Get prediction accuracy metrics
   * @param {Array} actualPrices - Actual price data
   * @param {Array} predictedPrices - Predicted prices
   * @returns {Object} Accuracy metrics
   */
  calculateAccuracy(actualPrices, predictedPrices) {
    if (actualPrices.length !== predictedPrices.length || actualPrices.length === 0) {
      return {
        mae: 0,
        rmse: 0,
        mape: 0,
        accuracy: 0
      };
    }

    let sumAbsoluteError = 0;
    let sumSquaredError = 0;
    let sumAbsolutePercentageError = 0;

    actualPrices.forEach((actual, index) => {
      const predicted = predictedPrices[index];
      const error = actual - predicted;
      const absoluteError = Math.abs(error);
      const absolutePercentageError = actual !== 0 ? (absoluteError / actual) * 100 : 0;

      sumAbsoluteError += absoluteError;
      sumSquaredError += error * error;
      sumAbsolutePercentageError += absolutePercentageError;
    });

    const mae = sumAbsoluteError / actualPrices.length;
    const rmse = Math.sqrt(sumSquaredError / actualPrices.length);
    const mape = sumAbsolutePercentageError / actualPrices.length;
    const accuracy = Math.max(0, 100 - mape);

    return {
      mae: Math.round(mae * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      mape: Math.round(mape * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100
    };
  }
}

// Singleton instance
let pricePredictionEngineInstance = null;

/**
 * Get or create price prediction engine instance
 * @param {Object} options - Configuration options
 * @returns {PricePredictionEngine} Prediction engine instance
 */
export function getPricePredictionEngine(options) {
  if (!pricePredictionEngineInstance) {
    pricePredictionEngineInstance = new PricePredictionEngine(options);
  }
  return pricePredictionEngineInstance;
}

/**
 * Predict prices for a flight (convenience function)
 * @param {Array} priceHistory - Historical price data
 * @param {Date} departureDate - Flight departure date
 * @param {Object} options - Prediction options
 */
export async function predictFlightPrices(priceHistory, departureDate, options) {
  const engine = getPricePredictionEngine();
  return await engine.predictPrices(priceHistory, departureDate, options);
}

/**
 * Get best time to buy recommendation (convenience function)
 * @param {Array} priceHistory - Historical price data
 * @param {Date} departureDate - Flight departure date
 */
export async function getBestTimeToBuy(priceHistory, departureDate) {
  const engine = getPricePredictionEngine();
  const result = await engine.predictPrices(priceHistory, departureDate);
  return result.bestTimeToBuy;
}