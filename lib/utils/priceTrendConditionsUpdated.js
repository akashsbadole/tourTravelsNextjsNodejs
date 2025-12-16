import { getPriceTrendAnalysis } from "@/lib/services/priceTrendAnalysis";
import { predictFlightPrices, getBestTimeToBuy } from "./pricePrediction";

/**
 * Check price trend condition
 * @param {Object} alert - Price alert object
 * @param {Object} trendCondition - Trend condition configuration
 * @returns {Object} Trend check result
 */
export async function checkPriceTrendCondition(alert, trendCondition) {
  try {
    const trendAnalysis = getPriceTrendAnalysis();
    
    // Get price trend analysis for route
    const analysis = await trendAnalysis.analyzePriceTrends(alert.searchCriteria);
    
    if (!analysis.success) {
      return {
        type: 'price_trend',
        triggered: false,
        reason: analysis.error || 'Trend analysis failed',
      };
    }
    
    const { trendStrength, linearRegression } = analysis.analysis;
    
    // Check if trend matches condition
    let triggered = false;
    let reason = '';
    
    switch (trendCondition.trendType) {
      case 'falling':
        triggered = trendStrength.direction === 'decreasing' && 
                   trendStrength.confidence > 0.6;
        reason = triggered ? 
          `Prices are trending downward with ${trendStrength.confidence * 100}% confidence` :
          'Price trend is not falling';
        break;
        
      case 'rising':
        triggered = trendStrength.direction === 'increasing' && 
                   trendStrength.confidence > 0.6;
        reason = triggered ? 
          `Prices are trending upward with ${trendStrength.confidence * 100}% confidence` :
          'Price trend is not rising';
        break;
        
      case 'stable':
        triggered = trendStrength.direction === 'stable' && 
                   trendStrength.confidence > 0.7;
        reason = triggered ? 
          `Prices are stable with ${trendStrength.confidence * 100}% confidence` :
          'Price trend is not stable';
        break;
        
      case 'volatile':
        triggered = analysis.analysis.volatility?.level === 'high';
        reason = triggered ? 
          `Prices are highly volatile (${analysis.analysis.volatility.coefficient.toFixed(1)}% coefficient)` :
          'Price volatility is not high enough';
        break;
    }

    // Add prediction analysis if we have sufficient data
    let predictionAnalysis = null;
    if (analysis.analysis.dataPoints >= 15) {
      try {
        const departureDate = alert.searchCriteria?.departureDate ? 
          new Date(alert.searchCriteria.departureDate) : 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        
        const prediction = await predictFlightPrices(
          analysis.analysis.priceHistory || [], 
          departureDate, 
          {
            predictionDays: Math.min(30, trendCondition.duration || 14),
            includeSeasonality: true,
            includeConfidence: true
          }
        );
        
        if (prediction.success && prediction.confidence > 0.6) {
          predictionAnalysis = {
            confidence: prediction.confidence,
            bestTimeToBuy: prediction.bestTimeToBuy,
            modelAccuracy: prediction.modelAccuracy,
            predictions: prediction.predictions.slice(0, 5) // Next 5 predictions
          };

          // Enhance reason with prediction insights
          if (predictionAnalysis.bestTimeToBuy.recommendation === 'wait' && 
              (trendCondition.trendType === 'falling' || trendCondition.trendType === 'stable')) {
            reason += ` (Prediction suggests waiting for better prices)`;
          } else if (predictionAnalysis.bestTimeToBuy.recommendation === 'buy_now' && 
                     triggered) {
            reason += ` (Prediction suggests buying now)`;
          }
        }
      } catch (error) {
        console.error('Error in prediction analysis:', error);
        // Fall back to traditional analysis
      }
    }
    
    // Check duration requirement
    if (triggered && trendCondition.duration) {
      const durationUnit = trendCondition.durationUnit || 'days';
      const requiredDuration = trendCondition.duration;
      
      // For now, we'll assume trend duration is met if we have sufficient data
      // In a real implementation, this would check how long trend has persisted
      const dataPoints = analysis.analysis.dataPoints || 0;
      const minDataPoints = durationUnit === 'hours' ? requiredDuration * 2 : requiredDuration;
      
      if (dataPoints < minDataPoints) {
        triggered = false;
        reason = `Insufficient data points. Need ${minDataPoints}, have ${dataPoints}`;
      }
    }
    
    return {
      type: 'price_trend',
      triggered,
      value: trendStrength.direction,
      confidence: trendStrength.confidence,
      threshold: trendCondition.trendType,
      reason,
      analysis: {
        trendStrength: trendStrength.strength,
        direction: trendStrength.direction,
        volatility: analysis.analysis.volatility?.level,
        dataPoints: analysis.analysis.dataPoints,
      },
      prediction: predictionAnalysis
    };
  } catch (error) {
    console.error('Error checking price trend condition:', error);
    return {
      type: 'price_trend',
      triggered: false,
      reason: 'Error analyzing price trend',
    };
  }
}

/**
 * Check competitive price condition
 * @param {Object} alert - Price alert object
 * @param {Object} competitiveCondition - Competitive condition configuration
 * @returns {Object} Competitive check result
 */
export async function checkCompetitivePriceCondition(alert, competitiveCondition) {
  try {
    const { getCompetitivePriceComparison } = await import("@/lib/services/competitivePriceComparison");
    const comparison = getCompetitivePriceComparison();
    
    // Get competitive price analysis for route
    const route = {
      origin: alert.searchCriteria.origin.airportCode,
      destination: alert.searchCriteria.destination.airportCode,
      cabinClass: alert.searchCriteria.cabinClass || 'economy',
    };
    
    const comparisonResult = await comparison.compareRoutePrices(route);
    
    if (!comparisonResult || !comparisonResult.comparison) {
      return {
        type: 'competitive_price',
        triggered: false,
        reason: 'Competitive comparison data not available',
      };
    }
    
    const { marketPosition, priceDifferences } = comparisonResult.comparison;
    let triggered = false;
    let reason = '';
    
    switch (competitiveCondition.comparisonType) {
      case 'cheapest':
        triggered = marketPosition.position === 1;
        reason = triggered ? 
          'We have the cheapest price in the market' :
          `We rank #${marketPosition.position} in market pricing`;
        break;
        
      case 'below_average':
        triggered = marketPosition.percentile <= 50;
        reason = triggered ? 
          `Our price is below market average (${marketPosition.percentile}th percentile)` :
          `Our price is above market average (${marketPosition.percentile}th percentile)`;
        break;
        
      case 'top_3':
        triggered = marketPosition.position <= 3;
        reason = triggered ? 
          `We rank #${marketPosition.position} in market pricing (top 3)` :
          `We rank #${marketPosition.position} in market pricing (not top 3)`;
        break;
    }
    
    // Check threshold requirement
    if (triggered && competitiveCondition.threshold) {
      const cheaperCompetitors = priceDifferences.filter(d => d.isCheaper);
      const priceAdvantage = marketPosition.priceAdvantage || 0;
      const thresholdMet = priceAdvantage >= competitiveCondition.threshold;
      
      if (!thresholdMet) {
        triggered = false;
        reason = `Price advantage of ${priceAdvantage.toFixed(2)} is below threshold of ${competitiveCondition.threshold}`;
      }
    }
    
    return {
      type: 'competitive_price',
      triggered,
      value: marketPosition.position,
      confidence: 'high',
      threshold: competitiveCondition.comparisonType,
      reason,
      analysis: {
        marketPosition,
        totalCompetitors: comparisonResult.comparison.totalCompetitors,
        cheaperCompetitors: priceDifferences.filter(d => d.isCheaper).length,
        priceAdvantage: marketPosition.priceAdvantage,
      }
    };
  } catch (error) {
    console.error('Error checking competitive price condition:', error);
    return {
      type: 'competitive_price',
      triggered: false,
      reason: 'Error analyzing competitive prices',
    };
  }
}