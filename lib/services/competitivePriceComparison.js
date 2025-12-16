import { getManyDocs } from "@/lib/db/operations";

/**
 * Competitive Price Comparison Service
 * Compares flight prices across multiple providers and platforms
 */
export class CompetitivePriceComparison {
  constructor(options = {}) {
    this.options = {
      // Maximum number of competitors to compare
      maxCompetitors: 10,
      // Price difference threshold for significant difference
      priceDifferenceThreshold: 5, // 5%
      // Cache duration in milliseconds
      cacheDuration: 30 * 60 * 1000, // 30 minutes
      // External APIs to check
      externalAPIs: [
        'skyscanner',
        'kayak',
        'expedia',
        'google_flights'
      ],
      ...options
    };
    
    this.cache = new Map();
  }

  /**
   * Compare prices for a specific route
   * @param {Object} route - Route information
   * @returns {Object} Comparison results
   */
  async compareRoutePrices(route) {
    try {
      const cacheKey = this.generateCacheKey(route);
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.options.cacheDuration) {
          return cached.data;
        }
      }

      // Get our price data
      const ourPriceData = await this.getOurPriceData(route);
      
      if (!ourPriceData) {
        return {
          success: false,
          error: 'No price data available for this route'
        };
      }

      // Get competitor prices
      const competitorPrices = await this.getCompetitorPrices(route);
      
      if (competitorPrices.length === 0) {
        return {
          success: false,
          error: 'No competitor data available'
        };
      }

      // Analyze competitive position
      const analysis = this.analyzeCompetitivePosition(ourPriceData, competitorPrices);
      
      // Calculate price differences
      const priceDifferences = this.calculatePriceDifferences(ourPriceData, competitorPrices);
      
      const result = {
        success: true,
        route,
        ourPrice: ourPriceData,
        competitors: competitorPrices,
        comparison: {
          ...analysis,
          priceDifferences,
          totalCompetitors: competitorPrices.length,
          lastUpdated: new Date()
        }
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error comparing route prices:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get our price data for a route
   * @param {Object} route - Route information
   * @returns {Object} Our price data
   */
  async getOurPriceData(route) {
    try {
      // Get price history for this route
      const priceHistory = await getManyDocs("PriceHistory", {
        "route.origin.airportCode": route.origin,
        "route.destination.airportCode": route.destination,
        cabinClass: route.cabinClass || 'economy'
      }, [], { 
        sort: { "currentPrice.recordedAt": -1 },
        limit: 1
      });

      if (priceHistory.length === 0) {
        return null;
      }

      const latestPrice = priceHistory[0];
      
      return {
        provider: 'golobe',
        price: latestPrice.currentPrice.amount,
        currency: latestPrice.currentPrice.currency,
        recordedAt: latestPrice.currentPrice.recordedAt,
        flightCode: latestPrice.flightCode,
        airlineCode: latestPrice.airlineCode,
        availability: latestPrice.currentPrice.availability
      };
    } catch (error) {
      console.error('Error getting our price data:', error);
      return null;
    }
  }

  /**
   * Get competitor prices for a route
   * @param {Object} route - Route information
   * @returns {Array} Competitor prices
   */
  async getCompetitorPrices(route) {
    try {
      const competitors = [];

      // Get prices from external APIs
      for (const api of this.options.externalAPIs) {
        try {
          const apiPrices = await this.fetchFromExternalAPI(api, route);
          competitors.push(...apiPrices);
        } catch (error) {
          console.error(`Error fetching from ${api}:`, error);
          // Continue with other APIs
        }
      }

      // Get prices from our database (other providers we track)
      const dbCompetitors = await this.getCompetitorsFromDB(route);
      competitors.push(...dbCompetitors);

      // Remove duplicates and sort by price
      const uniqueCompetitors = this.removeDuplicates(competitors);
      return uniqueCompetitors
        .sort((a, b) => a.price - b.price)
        .slice(0, this.options.maxCompetitors);
    } catch (error) {
      console.error('Error getting competitor prices:', error);
      return [];
    }
  }

  /**
   * Fetch prices from external API
   * @param {string} api - API name
   * @param {Object} route - Route information
   * @returns {Array} Competitor prices
   */
  async fetchFromExternalAPI(api, route) {
    // In a real implementation, this would call actual external APIs
    // For now, we'll simulate with mock data
    
    const mockData = {
      skyscanner: [
        {
          provider: 'skyscanner',
          airlineCode: 'BA',
          flightNumber: 'BA2490',
          price: 450 + Math.random() * 100,
          currency: 'USD',
          recordedAt: new Date(),
          stops: Math.floor(Math.random() * 2),
          duration: 480 + Math.random() * 120
        },
        {
          provider: 'skyscanner',
          airlineCode: 'AA',
          flightNumber: 'AA108',
          price: 420 + Math.random() * 80,
          currency: 'USD',
          recordedAt: new Date(),
          stops: Math.floor(Math.random() * 2),
          duration: 460 + Math.random() * 100
        }
      ],
      kayak: [
        {
          provider: 'kayak',
          airlineCode: 'UA',
          flightNumber: 'UA847',
          price: 440 + Math.random() * 90,
          currency: 'USD',
          recordedAt: new Date(),
          stops: Math.floor(Math.random() * 2),
          duration: 470 + Math.random() * 110
        }
      ],
      expedia: [
        {
          provider: 'expedia',
          airlineCode: 'DL',
          flightNumber: 'DL423',
          price: 460 + Math.random() * 110,
          currency: 'USD',
          recordedAt: new Date(),
          stops: Math.floor(Math.random() * 2),
          duration: 490 + Math.random() * 130
        }
      ],
      google_flights: [
        {
          provider: 'google_flights',
          airlineCode: 'LH',
          flightNumber: 'LH456',
          price: 430 + Math.random() * 85,
          currency: 'USD',
          recordedAt: new Date(),
          stops: Math.floor(Math.random() * 2),
          duration: 475 + Math.random() * 115
        }
      ]
    };

    return mockData[api] || [];
  }

  /**
   * Get competitor prices from our database
   * @param {Object} route - Route information
   * @returns {Array} Competitor prices
   */
  async getCompetitorsFromDB(route) {
    try {
      // Get price history for other providers on this route
      const priceHistory = await getManyDocs("PriceHistory", {
        "route.origin.airportCode": route.origin,
        "route.destination.airportCode": route.destination,
        cabinClass: route.cabinClass || 'economy',
        "currentPrice.source": "provider"
      }, [], { 
        sort: { "currentPrice.recordedAt": -1 },
        limit: 20
      });

      // Group by provider and get latest price
      const latestByProvider = {};
      priceHistory.forEach(record => {
        const provider = record.currentPrice.provider;
        if (!latestByProvider[provider] || 
            new Date(record.currentPrice.recordedAt) > new Date(latestByProvider[provider].recordedAt)) {
          latestByProvider[provider] = {
            provider,
            airlineCode: record.airlineCode,
            flightNumber: record.flightNumber,
            price: record.currentPrice.amount,
            currency: record.currentPrice.currency,
            recordedAt: record.currentPrice.recordedAt,
            stops: record.schedule?.stops || 0,
            duration: record.schedule?.durationMinutes || 0
          };
        }
      });

      return Object.values(latestByProvider);
    } catch (error) {
      console.error('Error getting competitors from DB:', error);
      return [];
    }
  }

  /**
   * Analyze competitive position
   * @param {Object} ourPrice - Our price data
   * @param {Array} competitors - Competitor prices
   * @returns {Object} Competitive analysis
   */
  analyzeCompetitivePosition(ourPrice, competitors) {
    // Combine all prices for analysis
    const allPrices = [
      { ...ourPrice, isOurs: true },
      ...competitors
    ];

    // Sort by price
    allPrices.sort((a, b) => a.price - b.price);

    // Find our position
    const ourPosition = allPrices.findIndex(p => p.isOurs) + 1;
    const totalPrices = allPrices.length;
    const percentile = ((totalPrices - ourPosition) / totalPrices) * 100;

    // Calculate price statistics
    const prices = allPrices.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const medianPrice = this.calculateMedian(prices);

    // Calculate our price advantage
    const priceAdvantage = avgPrice - ourPrice.price;
    const priceAdvantagePercent = avgPrice > 0 ? (priceAdvantage / avgPrice) * 100 : 0;

    // Determine market position category
    let positionCategory = 'average';
    if (ourPosition === 1) {
      positionCategory = 'cheapest';
    } else if (ourPosition <= Math.ceil(totalPrices * 0.25)) {
      positionCategory = 'top_quartile';
    } else if (ourPosition <= Math.ceil(totalPrices * 0.5)) {
      positionCategory = 'below_average';
    } else if (ourPosition <= Math.ceil(totalPrices * 0.75)) {
      positionCategory = 'above_average';
    } else {
      positionCategory = 'expensive';
    }

    return {
      position: ourPosition,
      totalPrices,
      percentile,
      positionCategory,
      priceAdvantage,
      priceAdvantagePercent,
      marketStats: {
        minPrice,
        maxPrice,
        avgPrice,
        medianPrice,
        priceRange: maxPrice - minPrice,
        priceSpread: ((maxPrice - minPrice) / avgPrice) * 100
      }
    };
  }

  /**
   * Calculate price differences with competitors
   * @param {Object} ourPrice - Our price data
   * @param {Array} competitors - Competitor prices
   * @returns {Array} Price differences
   */
  calculatePriceDifferences(ourPrice, competitors) {
    return competitors.map(competitor => {
      const priceDifference = competitor.price - ourPrice.price;
      const priceDifferencePercent = ourPrice.price > 0 ? 
        (priceDifference / ourPrice.price) * 100 : 0;

      return {
        provider: competitor.provider,
        competitorPrice: competitor.price,
        ourPrice: ourPrice.price,
        priceDifference,
        priceDifferencePercent,
        isCheaper: priceDifference < 0,
        isSignificant: Math.abs(priceDifferencePercent) >= this.options.priceDifferenceThreshold,
        airlineCode: competitor.airlineCode,
        flightNumber: competitor.flightNumber
      };
    }).sort((a, b) => a.priceDifference - b.priceDifference);
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
   * Remove duplicate competitors
   * @param {Array} competitors - Competitor prices
   * @returns {Array} Unique competitors
   */
  removeDuplicates(competitors) {
    const seen = new Set();
    return competitors.filter(competitor => {
      const key = `${competitor.provider}-${competitor.airlineCode}-${competitor.flightNumber}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate cache key for route
   * @param {Object} route - Route information
   * @returns {string} Cache key
   */
  generateCacheKey(route) {
    return `${route.origin}-${route.destination}-${route.cabinClass || 'economy'}`;
  }

  /**
   * Get market trends for a route
   * @param {Object} route - Route information
   * @returns {Object} Market trends
   */
  async getMarketTrends(route) {
    try {
      // Get historical price data for trend analysis
      const priceHistory = await getManyDocs("PriceHistory", {
        "route.origin.airportCode": route.origin,
        "route.destination.airportCode": route.destination,
        cabinClass: route.cabinClass || 'economy'
      }, [], { 
        sort: { "currentPrice.recordedAt": -1 },
        limit: 100
      });

      if (priceHistory.length < 10) {
        return {
          success: false,
          error: 'Insufficient data for trend analysis'
        };
      }

      // Analyze price trends over time
      const trends = this.analyzePriceTrends(priceHistory);
      
      return {
        success: true,
        route,
        trends,
        dataPoints: priceHistory.length,
        period: {
          start: priceHistory[priceHistory.length - 1]?.currentPrice?.recordedAt,
          end: priceHistory[0]?.currentPrice?.recordedAt
        }
      };
    } catch (error) {
      console.error('Error getting market trends:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze price trends from historical data
   * @param {Array} priceHistory - Historical price data
   * @returns {Object} Trend analysis
   */
  analyzePriceTrends(priceHistory) {
    // Extract price points over time
    const pricePoints = priceHistory.map(record => ({
      timestamp: new Date(record.currentPrice.recordedAt),
      price: record.currentPrice.amount,
      provider: record.currentPrice.provider
    })).sort((a, b) => a.timestamp - b.timestamp);

    // Calculate moving averages
    const shortTermMA = this.calculateMovingAverage(pricePoints, 7);
    const longTermMA = this.calculateMovingAverage(pricePoints, 30);

    // Determine trend direction
    const latestPrice = pricePoints[pricePoints.length - 1]?.price || 0;
    const latestShortMA = shortTermMA[shortTermMA.length - 1] || 0;
    const latestLongMA = longTermMA[longTermMA.length - 1] || 0;

    let trendDirection = 'stable';
    if (latestPrice < latestShortMA && latestShortMA < latestLongMA) {
      trendDirection = 'decreasing';
    } else if (latestPrice > latestShortMA && latestShortMA > latestLongMA) {
      trendDirection = 'increasing';
    }

    // Calculate volatility
    const volatility = this.calculateVolatility(pricePoints);

    return {
      direction: trendDirection,
      shortTermMA: latestShortMA,
      longTermMA: latestLongMA,
      currentPrice: latestPrice,
      volatility,
      momentum: latestPrice - (shortTermMA[shortTermMA.length - 2] || latestPrice)
    };
  }

  /**
   * Calculate moving average
   * @param {Array} pricePoints - Price points
   * @param {number} period - Period for moving average
   * @returns {Array} Moving average values
   */
  calculateMovingAverage(pricePoints, period) {
    const result = [];
    
    for (let i = 0; i < pricePoints.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = pricePoints
          .slice(i - period + 1, i + 1)
          .reduce((acc, point) => acc + point.price, 0);
        result.push(sum / period);
      }
    }
    
    return result;
  }

  /**
   * Calculate price volatility
   * @param {Array} pricePoints - Price points
   * @returns {number} Volatility measure
   */
  calculateVolatility(pricePoints) {
    if (pricePoints.length < 2) return 0;

    const prices = pricePoints.map(p => p.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);

    // Return coefficient of variation (normalized volatility)
    return mean > 0 ? (standardDeviation / mean) * 100 : 0;
  }
}

// Singleton instance
let competitivePriceComparisonInstance = null;

/**
 * Get or create competitive price comparison instance
 * @param {Object} options - Configuration options
 * @returns {CompetitivePriceComparison} Comparison instance
 */
export function getCompetitivePriceComparison(options) {
  if (!competitivePriceComparisonInstance) {
    competitivePriceComparisonInstance = new CompetitivePriceComparison(options);
  }
  return competitivePriceComparisonInstance;
}

/**
 * Compare route prices (convenience function)
 * @param {Object} route - Route information
 */
export async function compareRoutePrices(route) {
  const comparison = getCompetitivePriceComparison();
  return await comparison.compareRoutePrices(route);
}

/**
 * Get market trends (convenience function)
 * @param {Object} route - Route information
 */
export async function getMarketTrends(route) {
  const comparison = getCompetitivePriceComparison();
  return await comparison.getMarketTrends(route);
}