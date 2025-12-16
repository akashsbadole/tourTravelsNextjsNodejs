import { createDoc, updateOneDoc, getOneDoc, getManyDocs } from "@/lib/db/operations";
import { getAirlinePartnershipManager } from "@/lib/integrations/airline-providers/airline-partnership-manager";
import { getIntegrationHooks } from "./integrationHooks";

/**
 * Fare Class Availability Service
 * Manages fare class availability and pricing with partnership benefits
 */
export class FareClassAvailabilityService {
  constructor() {
    this.partnershipManager = getAirlinePartnershipManager();
    this.integrationHooks = getIntegrationHooks();
    this.availabilityCache = new Map();
    this.pricingCache = new Map();
    this.cacheTimeout = 3 * 60 * 1000; // 3 minutes
  }

  /**
   * Get fare class availability for flights
   * @param {string} flightId - Flight ID
   * @param {Object} options - Availability options
   * @returns {Promise<Object>} Fare class availability
   */
  async getFareClassAvailability(flightId, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        includePricing = true,
        includeRestrictions = true,
        includeInventory = true,
        refreshCache = false,
        timeout = 8000
      } = options;

      // Generate cache key
      const cacheKey = this.generateAvailabilityCacheKey(flightId, options);
      
      // Check cache first
      if (!refreshCache && this.availabilityCache.has(cacheKey)) {
        const cached = this.availabilityCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Get availability from provider
      const availability = await this.fetchAvailabilityFromProvider(flightId, {
        usePartnershipBenefits,
        includePricing,
        includeRestrictions,
        includeInventory,
        timeout
      });

      // Process availability with partnership benefits
      const processedAvailability = await this.processAvailabilityWithBenefits(
        availability,
        flightId,
        { usePartnershipBenefits }
      );

      // Cache the result
      this.availabilityCache.set(cacheKey, {
        data: processedAvailability,
        timestamp: Date.now()
      });

      // Trigger analytics event
      await this.integrationHooks.triggerHook('fare_class_accessed', {
        flightId,
        resultCount: processedAvailability.fareClasses?.length || 0,
        cacheHit: false
      });

      return processedAvailability;

    } catch (error) {
      console.error('Error getting fare class availability:', error);
      throw error;
    }
  }

  /**
   * Get pricing for specific fare classes
   * @param {string} flightId - Flight ID
   * @param {Array} fareClasses - Fare classes to price
   * @param {Object} passengerCounts - Passenger counts
   * @param {Object} options - Pricing options
   * @returns {Promise<Object>} Fare class pricing
   */
  async getFareClassPricing(flightId, fareClasses, passengerCounts, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        includeTaxes = true,
        includeFees = true,
        currency = 'USD',
        refreshCache = false,
        timeout = 8000
      } = options;

      // Generate cache key
      const cacheKey = this.generatePricingCacheKey(flightId, fareClasses, passengerCounts, options);
      
      // Check cache first
      if (!refreshCache && this.pricingCache.has(cacheKey)) {
        const cached = this.pricingCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Get pricing from provider
      const pricing = await this.fetchPricingFromProvider(
        flightId,
        fareClasses,
        passengerCounts,
        {
          usePartnershipBenefits,
          includeTaxes,
          includeFees,
          currency,
          timeout
        }
      );

      // Process pricing with partnership benefits
      const processedPricing = await this.processPricingWithBenefits(
        pricing,
        flightId,
        passengerCounts,
        { usePartnershipBenefits }
      );

      // Cache the result
      this.pricingCache.set(cacheKey, {
        data: processedPricing,
        timestamp: Date.now()
      });

      // Trigger analytics event
      await this.integrationHooks.triggerHook('fare_class_pricing_accessed', {
        flightId,
        fareClasses,
        passengerCounts,
        resultCount: processedPricing.pricing?.length || 0,
        cacheHit: false
      });

      return processedPricing;

    } catch (error) {
      console.error('Error getting fare class pricing:', error);
      throw error;
    }
  }

  /**
   * Get fare class rules and restrictions
   * @param {string} flightId - Flight ID
   * @param {string} fareClass - Fare class
   * @param {Object} options - Options
   * @returns {Promise<Object>} Fare class rules
   */
  async getFareClassRules(flightId, fareClass, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        timeout = 5000
      } = options;

      // Get rules from provider
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      let rules;
      if (usePartnershipBenefits && provider.getEnhancedFareClassRules) {
        rules = await provider.getEnhancedFareClassRules(flightId, fareClass, { timeout });
      } else {
        rules = await provider.getFareClassRules(flightId, fareClass, { timeout });
      }

      // Process rules with partnership benefits
      const processedRules = await this.processRulesWithBenefits(
        rules,
        flightId,
        fareClass,
        { usePartnershipBenefits }
      );

      return {
        success: true,
        data: processedRules,
        metadata: {
          flightId,
          fareClass,
          provider: provider.name,
          partnershipId: provider.partnershipId,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error getting fare class rules:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get fare class comparison
   * @param {string} flightId - Flight ID
   * @param {Array} fareClasses - Fare classes to compare
   * @param {Object} passengerCounts - Passenger counts
   * @param {Object} options - Comparison options
   * @returns {Promise<Object>} Fare class comparison
   */
  async getFareClassComparison(flightId, fareClasses, passengerCounts, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        includeFeatures = true,
        includeBenefits = true,
        currency = 'USD',
        timeout = 10000
      } = options;

      // Get pricing for all fare classes
      const pricingResults = await this.getFareClassPricing(
        flightId,
        fareClasses,
        passengerCounts,
        {
          usePartnershipBenefits,
          includeTaxes: true,
          includeFees: true,
          currency,
          timeout
        }
      );

      // Get rules for all fare classes
      const rulesPromises = fareClasses.map(async (fareClass) => {
        const rulesResult = await this.getFareClassRules(flightId, fareClass, {
          usePartnershipBenefits,
          timeout
        });
        return {
          fareClass,
          rules: rulesResult.success ? rulesResult.data : null
        };
      });

      const rulesResults = await Promise.all(rulesPromises);

      // Build comparison data
      const comparison = {
        flightId,
        passengerCounts,
        currency,
        fareClasses: [],
        recommendations: [],
        bestValue: null,
        lowestPrice: null,
        highestBenefits: null
      };

      // Process each fare class
      pricingResults.pricing.forEach((pricing, index) => {
        const fareClass = pricing.fareClass;
        const rules = rulesResults.find(r => r.fareClass === fareClass)?.rules;

        const fareClassData = {
          fareClass,
          pricing,
          rules,
          features: includeFeatures ? this.getFareClassFeatures(fareClass, rules) : {},
          benefits: includeBenefits ? this.getFareClassBenefits(fareClass, pricing) : {},
          score: this.calculateFareClassScore(pricing, rules, options)
        };

        comparison.fareClasses.push(fareClassData);
      });

      // Sort by score
      comparison.fareClasses.sort((a, b) => b.score - a.score);

      // Set recommendations
      comparison.recommendations = this.generateRecommendations(comparison.fareClasses);
      comparison.bestValue = comparison.fareClasses[0];
      comparison.lowestPrice = comparison.fareClasses.reduce((min, fc) => 
        fc.pricing.total < min.pricing.total ? fc : min
      );
      comparison.highestBenefits = comparison.fareClasses.reduce((max, fc) => 
        fc.benefits.score > max.benefits.score ? fc : max
      );

      return {
        success: true,
        data: comparison,
        metadata: {
          flightId,
          fareClasses: fareClasses.length,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error getting fare class comparison:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch availability from provider
   * @param {string} flightId - Flight ID
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Availability data
   */
  async fetchAvailabilityFromProvider(flightId, options) {
    try {
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      let availability;
      if (options.usePartnershipBenefits && provider.getEnhancedFareClassAvailability) {
        availability = await provider.getEnhancedFareClassAvailability(flightId, options);
      } else {
        availability = await provider.getFareClassAvailability(flightId, options);
      }

      return {
        success: true,
        data: availability,
        provider: provider.name,
        partnershipId: provider.partnershipId,
        tier: provider.tier
      };

    } catch (error) {
      console.error('Error fetching availability from provider:', error);
      throw error;
    }
  }

  /**
   * Fetch pricing from provider
   * @param {string} flightId - Flight ID
   * @param {Array} fareClasses - Fare classes
   * @param {Object} passengerCounts - Passenger counts
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Pricing data
   */
  async fetchPricingFromProvider(flightId, fareClasses, passengerCounts, options) {
    try {
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      let pricing;
      if (options.usePartnershipBenefits && provider.getEnhancedFareClassPricing) {
        pricing = await provider.getEnhancedFareClassPricing(flightId, fareClasses, passengerCounts, options);
      } else {
        pricing = await provider.getFareClassPricing(flightId, fareClasses, passengerCounts, options);
      }

      return {
        success: true,
        data: pricing,
        provider: provider.name,
        partnershipId: provider.partnershipId,
        tier: provider.tier
      };

    } catch (error) {
      console.error('Error fetching pricing from provider:', error);
      throw error;
    }
  }

  /**
   * Process availability with partnership benefits
   * @param {Object} availability - Raw availability data
   * @param {string} flightId - Flight ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed availability
   */
  async processAvailabilityWithBenefits(availability, flightId, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return availability;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(availability.partnershipId);
      if (!partnership) {
        return availability;
      }

      // Process each fare class with benefits
      const processedFareClasses = availability.data.fareClasses?.map(fareClass => {
        return this.applyFareClassBenefits(fareClass, partnership.tier);
      }) || [];

      return {
        ...availability,
        data: {
          ...availability.data,
          fareClasses: processedFareClasses,
          partnershipBenefits: {
            applied: true,
            tier: partnership.tier,
            exclusiveFares: this.hasExclusiveFares(partnership.tier),
            enhancedInventory: this.hasEnhancedInventory(partnership.tier)
          }
        }
      };

    } catch (error) {
      console.error('Error processing availability with benefits:', error);
      return availability;
    }
  }

  /**
   * Process pricing with partnership benefits
   * @param {Object} pricing - Raw pricing data
   * @param {string} flightId - Flight ID
   * @param {Object} passengerCounts - Passenger counts
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed pricing
   */
  async processPricingWithBenefits(pricing, flightId, passengerCounts, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return pricing;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(pricing.partnershipId);
      if (!partnership) {
        return pricing;
      }

      // Process each fare class pricing with benefits
      const processedPricing = pricing.data.pricing?.map(fareClassPricing => {
        return this.applyFareClassPricingBenefits(fareClassPricing, partnership.tier);
      }) || [];

      return {
        ...pricing,
        data: {
          ...pricing.data,
          pricing: processedPricing,
          partnershipBenefits: {
            applied: true,
            tier: partnership.tier,
            discountApplied: this.getTierDiscount(partnership.tier),
            commissionEnhanced: this.hasEnhancedCommission(partnership.tier)
          }
        }
      };

    } catch (error) {
      console.error('Error processing pricing with benefits:', error);
      return pricing;
    }
  }

  /**
   * Apply fare class benefits
   * @param {Object} fareClass - Fare class data
   * @param {string} tier - Partnership tier
   * @returns {Object} Enhanced fare class
   */
  applyFareClassBenefits(fareClass, tier) {
    const enhancedFareClass = { ...fareClass };

    // Add tier-specific benefits
    enhancedFareClass.partnershipBenefits = {
      tier,
      exclusiveAccess: this.hasExclusiveAccess(tier),
      priorityBoarding: this.hasPriorityBoarding(tier),
      extraBaggage: this.getExtraBaggageAllowance(tier),
      seatSelection: this.getSeatSelectionBenefits(tier),
      loungeAccess: this.hasLoungeAccess(tier),
      upgradePriority: this.getUpgradePriority(tier)
    };

    // Apply availability enhancements
    if (this.hasEnhancedInventory(tier)) {
      enhancedFareClass.availability = {
        ...enhancedFareClass.availability,
        enhanced: true,
        realTimeUpdates: true,
        guaranteedAvailability: tier === 'diamond'
      };
    }

    return enhancedFareClass;
  }

  /**
   * Apply fare class pricing benefits
   * @param {Object} fareClassPricing - Fare class pricing data
   * @param {string} tier - Partnership tier
   * @returns {Object} Enhanced pricing
   */
  applyFareClassPricingBenefits(fareClassPricing, tier) {
    const enhancedPricing = { ...fareClassPricing };

    // Apply tier discount
    const discount = this.getTierDiscount(tier);
    if (discount > 0) {
      enhancedPricing.partnershipDiscount = {
        percentage: discount,
        amount: enhancedPricing.basePrice * discount,
        discountedPrice: enhancedPricing.basePrice * (1 - discount)
      };
      enhancedPricing.total = enhancedPricing.partnershipDiscount.discountedPrice;
    }

    // Add commission enhancement
    if (this.hasEnhancedCommission(tier)) {
      enhancedPricing.enhancedCommission = {
        rate: this.getEnhancedCommissionRate(tier),
        bonus: this.getCommissionBonus(tier)
      };
    }

    return enhancedPricing;
  }

  /**
   * Get partnership information
   * @param {string} partnershipId - Partnership ID
   * @returns {Promise<Object>} Partnership information
   */
  async getPartnershipInfo(partnershipId) {
    try {
      return await getOneDoc("AirlinePartnership", { partnershipId });
    } catch (error) {
      console.error('Error getting partnership info:', error);
      return null;
    }
  }

  /**
   * Get fare class features
   * @param {string} fareClass - Fare class
   * @param {Object} rules - Fare class rules
   * @returns {Object} Fare class features
   */
  getFareClassFeatures(fareClass, rules) {
    const features = {
      baggage: {
        carryOn: rules?.carryOnBaggage || false,
        checked: rules?.checkedBaggage || 0,
        weight: rules?.baggageWeight || 23
      },
      seating: {
        seatSelection: rules?.seatSelection || false,
        legroom: rules?.legroom || 'standard',
        recline: rules?.seatRecline || false,
        width: rules?.seatWidth || 'standard'
      },
      service: {
        meal: rules?.mealIncluded || false,
        entertainment: rules?.entertainment || false,
        wifi: rules?.wifiAvailable || false,
        power: rules?.powerOutlets || false
      },
      flexibility: {
        changes: rules?.changeAllowed || false,
        cancellation: rules?.cancellationAllowed || false,
        refund: rules?.refundable || false,
        standby: rules?.standbyAllowed || false
      }
    };

    // Enhance based on fare class
    if (fareClass === 'business' || fareClass === 'first') {
      features.seating.legroom = 'extra';
      features.seating.width = 'extra';
      features.service.meal = true;
      features.service.entertainment = true;
      features.service.wifi = true;
      features.service.power = true;
      features.flexibility.changes = true;
      features.flexibility.cancellation = true;
      features.flexibility.refund = true;
    }

    return features;
  }

  /**
   * Get fare class benefits
   * @param {string} fareClass - Fare class
   * @param {Object} pricing - Pricing data
   * @returns {Object} Fare class benefits
   */
  getFareClassBenefits(fareClass, pricing) {
    return {
      value: this.calculateValueScore(fareClass, pricing),
      flexibility: this.calculateFlexibilityScore(fareClass, pricing),
      comfort: this.calculateComfortScore(fareClass, pricing),
      service: this.calculateServiceScore(fareClass, pricing),
      overall: this.calculateOverallScore(fareClass, pricing)
    };
  }

  /**
   * Calculate fare class score
   * @param {Object} pricing - Pricing data
   * @param {Object} rules - Rules data
   * @param {Object} options - Scoring options
   * @returns {number} Score
   */
  calculateFareClassScore(pricing, rules, options) {
    const priceScore = this.calculatePriceScore(pricing);
    const flexibilityScore = this.calculateFlexibilityScore(pricing.fareClass, rules);
    const comfortScore = this.calculateComfortScore(pricing.fareClass, rules);
    const serviceScore = this.calculateServiceScore(pricing.fareClass, rules);

    // Weighted scoring
    const weights = options.weights || {
      price: 0.3,
      flexibility: 0.25,
      comfort: 0.25,
      service: 0.2
    };

    return (
      priceScore * weights.price +
      flexibilityScore * weights.flexibility +
      comfortScore * weights.comfort +
      serviceScore * weights.service
    );
  }

  /**
   * Generate recommendations
   * @param {Array} fareClasses - Fare class data
   * @returns {Array} Recommendations
   */
  generateRecommendations(fareClasses) {
    const recommendations = [];

    // Best value recommendation
    const bestValue = fareClasses[0];
    if (bestValue) {
      recommendations.push({
        type: 'best_value',
        title: 'Best Value',
        description: `Best combination of price and features`,
        fareClass: bestValue.fareClass,
        score: bestValue.score
      });
    }

    // Lowest price recommendation
    const lowestPrice = fareClasses.reduce((min, fc) => 
      fc.pricing.total < min.pricing.total ? fc : min
    );
    if (lowestPrice && lowestPrice !== bestValue) {
      recommendations.push({
        type: 'lowest_price',
        title: 'Lowest Price',
        description: `Most affordable option`,
        fareClass: lowestPrice.fareClass,
        price: lowestPrice.pricing.total
      });
    }

    // Most flexible recommendation
    const mostFlexible = fareClasses.reduce((max, fc) => 
      fc.benefits.flexibility > max.benefits.flexibility ? fc : max
    );
    if (mostFlexible && mostFlexible !== bestValue) {
      recommendations.push({
        type: 'most_flexible',
        title: 'Most Flexible',
        description: `Best cancellation and change policies`,
        fareClass: mostFlexible.fareClass,
        flexibility: mostFlexible.benefits.flexibility
      });
    }

    return recommendations;
  }

  // Helper methods for tier-based benefits
  hasExclusiveFares(tier) {
    return ['silver', 'gold', 'platinum', 'diamond'].includes(tier);
  }

  hasEnhancedInventory(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  hasExclusiveAccess(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  hasPriorityBoarding(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  getExtraBaggageAllowance(tier) {
    const allowances = {
      bronze: 0,
      silver: 1,
      gold: 2,
      platinum: 3,
      diamond: 4
    };
    return allowances[tier] || 0;
  }

  getSeatSelectionBenefits(tier) {
    const benefits = {
      bronze: 'none',
      silver: 'standard',
      gold: 'preferred',
      platinum: 'premium',
      diamond: 'unlimited'
    };
    return benefits[tier] || 'none';
  }

  hasLoungeAccess(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  getUpgradePriority(tier) {
    const priorities = {
      bronze: 0,
      silver: 1,
      gold: 2,
      platinum: 3,
      diamond: 4
    };
    return priorities[tier] || 0;
  }

  getTierDiscount(tier) {
    const discounts = {
      bronze: 0,
      silver: 0.02,
      gold: 0.05,
      platinum: 0.08,
      diamond: 0.10
    };
    return discounts[tier] || 0;
  }

  hasEnhancedCommission(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  getEnhancedCommissionRate(tier) {
    const rates = {
      gold: 0.02,
      platinum: 0.05,
      diamond: 0.08
    };
    return rates[tier] || 0;
  }

  getCommissionBonus(tier) {
    const bonuses = {
      gold: 0.01,
      platinum: 0.02,
      diamond: 0.03
    };
    return bonuses[tier] || 0;
  }

  // Scoring helper methods
  calculatePriceScore(pricing) {
    // Lower price gets higher score
    const maxPrice = 1000; // Assumed max price for normalization
    return Math.max(0, 1 - (pricing.total / maxPrice));
  }

  calculateFlexibilityScore(fareClass, rules) {
    let score = 0;
    if (rules?.changeAllowed) score += 0.3;
    if (rules?.cancellationAllowed) score += 0.3;
    if (rules?.refundable) score += 0.2;
    if (rules?.standbyAllowed) score += 0.2;
    return score;
  }

  calculateComfortScore(fareClass, rules) {
    let score = 0;
    if (fareClass === 'premium_economy') score += 0.3;
    if (fareClass === 'business') score += 0.7;
    if (fareClass === 'first') score += 1.0;
    if (rules?.extraLegroom) score += 0.2;
    if (rules?.widerSeat) score += 0.2;
    return Math.min(1.0, score);
  }

  calculateServiceScore(fareClass, rules) {
    let score = 0;
    if (rules?.mealIncluded) score += 0.2;
    if (rules?.entertainment) score += 0.2;
    if (rules?.wifiAvailable) score += 0.2;
    if (rules?.powerOutlets) score += 0.2;
    if (rules?.priorityService) score += 0.2;
    return Math.min(1.0, score);
  }

  calculateValueScore(fareClass, pricing) {
    return this.calculatePriceScore(pricing) * 0.6 + 
           this.calculateComfortScore(fareClass, {}) * 0.4;
  }

  calculateOverallScore(fareClass, pricing) {
    const value = this.calculateValueScore(fareClass, pricing);
    const flexibility = this.calculateFlexibilityScore(fareClass, {});
    const comfort = this.calculateComfortScore(fareClass, {});
    const service = this.calculateServiceScore(fareClass, {});

    return (value + flexibility + comfort + service) / 4;
  }

  /**
   * Generate cache key for availability
   * @param {string} flightId - Flight ID
   * @param {Object} options - Options
   * @returns {string} Cache key
   */
  generateAvailabilityCacheKey(flightId, options) {
    const key = {
      flightId,
      options: {
        usePartnershipBenefits: options.usePartnershipBenefits,
        includePricing: options.includePricing,
        includeRestrictions: options.includeRestrictions,
        includeInventory: options.includeInventory
      }
    };
    
    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  /**
   * Generate cache key for pricing
   * @param {string} flightId - Flight ID
   * @param {Array} fareClasses - Fare classes
   * @param {Object} passengerCounts - Passenger counts
   * @param {Object} options - Options
   * @returns {string} Cache key
   */
  generatePricingCacheKey(flightId, fareClasses, passengerCounts, options) {
    const key = {
      flightId,
      fareClasses: fareClasses.sort(),
      passengerCounts,
      options: {
        usePartnershipBenefits: options.usePartnershipBenefits,
        includeTaxes: options.includeTaxes,
        includeFees: options.includeFees,
        currency: options.currency
      }
    };
    
    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  /**
   * Clear cache
   * @param {string} pattern - Cache pattern to clear
   */
  clearCache(pattern = null) {
    if (pattern) {
      // Clear specific pattern
      for (const [key] of this.availabilityCache) {
        if (key.includes(pattern)) {
          this.availabilityCache.delete(key);
        }
      }
      for (const [key] of this.pricingCache) {
        if (key.includes(pattern)) {
          this.pricingCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.availabilityCache.clear();
      this.pricingCache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      availabilityCache: {
        size: this.availabilityCache.size,
        keys: Array.from(this.availabilityCache.keys())
      },
      pricingCache: {
        size: this.pricingCache.size,
        keys: Array.from(this.pricingCache.keys())
      },
      timeout: this.cacheTimeout
    };
  }
}

// Singleton instance
let fareClassServiceInstance = null;

/**
 * Get or create fare class availability service instance
 * @returns {FareClassAvailabilityService} Service instance
 */
export function getFareClassAvailabilityService() {
  if (!fareClassServiceInstance) {
    fareClassServiceInstance = new FareClassAvailabilityService();
  }
  return fareClassServiceInstance;
}