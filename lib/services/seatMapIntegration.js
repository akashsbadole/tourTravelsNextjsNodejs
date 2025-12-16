import { createDoc, updateOneDoc, getOneDoc, getManyDocs } from "@/lib/db/operations";
import { getAirlinePartnershipManager } from "@/lib/integrations/airline-providers/airline-partnership-manager";
import { getIntegrationHooks } from "./integrationHooks";

/**
 * Seat Map Integration Service
 * Manages seat map data and selection with partnership benefits
 */
export class SeatMapIntegrationService {
  constructor() {
    this.partnershipManager = getAirlinePartnershipManager();
    this.integrationHooks = getIntegrationHooks();
    this.seatMapCache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutes
  }

  /**
   * Get seat map for flight
   * @param {string} flightId - Flight ID
   * @param {Object} options - Seat map options
   * @returns {Promise<Object>} Seat map data
   */
  async getSeatMap(flightId, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        includePricing = true,
        includeAvailability = true,
        includeFeatures = true,
        refreshCache = false,
        timeout = 8000
      } = options;

      // Generate cache key
      const cacheKey = this.generateCacheKey(flightId, options);
      
      // Check cache first
      if (!refreshCache && this.seatMapCache.has(cacheKey)) {
        const cached = this.seatMapCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Get seat map from provider
      const seatMap = await this.fetchSeatMapFromProvider(flightId, {
        usePartnershipBenefits,
        includePricing,
        includeAvailability,
        includeFeatures,
        timeout
      });

      // Process seat map with partnership benefits
      const processedSeatMap = await this.processSeatMapWithBenefits(
        seatMap,
        flightId,
        { usePartnershipBenefits }
      );

      // Cache result
      this.seatMapCache.set(cacheKey, {
        data: processedSeatMap,
        timestamp: Date.now()
      });

      // Trigger analytics event
      await this.integrationHooks.triggerHook('seat_map_accessed', {
        flightId,
        resultCount: processedSeatMap.seats?.length || 0,
        cacheHit: false
      });

      return processedSeatMap;

    } catch (error) {
      console.error('Error getting seat map:', error);
      throw error;
    }
  }

  /**
   * Select seats for booking
   * @param {string} flightId - Flight ID
   * @param {Array} seatSelections - Seat selections
   * @param {Object} options - Selection options
   * @returns {Promise<Object>} Seat selection result
   */
  async selectSeats(flightId, seatSelections, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        passengerInfo = [],
        specialRequests = [],
        timeout = 10000
      } = options;

      // Validate seat selections
      const validation = await this.validateSeatSelections(flightId, seatSelections);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Seat selection validation failed',
          details: validation.errors
        };
      }

      // Get provider
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      // Select seats
      let selectionResult;
      if (usePartnershipBenefits && provider.selectPartnershipSeats) {
        selectionResult = await provider.selectPartnershipSeats(flightId, seatSelections, {
          passengerInfo,
          specialRequests,
          timeout
        });
      } else {
        selectionResult = await provider.selectSeats(flightId, seatSelections, {
          passengerInfo,
          specialRequests,
          timeout
        });
      }

      // Process selection with partnership benefits
      const processedSelection = await this.processSeatSelectionWithBenefits(
        selectionResult,
        flightId,
        seatSelections,
        { usePartnershipBenefits }
      );

      // Trigger analytics event
      await this.integrationHooks.triggerHook('seats_selected', {
        flightId,
        seatSelections,
        success: processedSelection.success,
        benefits: processedSelection.partnershipBenefits
      });

      return processedSelection;

    } catch (error) {
      console.error('Error selecting seats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get seat pricing
   * @param {string} flightId - Flight ID
   * @param {Array} seatNumbers - Seat numbers
   * @param {Object} options - Pricing options
   * @returns {Promise<Object>} Seat pricing
   */
  async getSeatPricing(flightId, seatNumbers, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        passengerCounts = { adults: 1 },
        currency = 'USD',
        timeout = 6000
      } = options;

      // Get provider
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      // Get seat pricing
      let pricingResult;
      if (usePartnershipBenefits && provider.getPartnershipSeatPricing) {
        pricingResult = await provider.getPartnershipSeatPricing(flightId, seatNumbers, {
          passengerCounts,
          currency,
          timeout
        });
      } else {
        pricingResult = await provider.getSeatPricing(flightId, seatNumbers, {
          passengerCounts,
          currency,
          timeout
        });
      }

      // Process pricing with partnership benefits
      const processedPricing = await this.processSeatPricingWithBenefits(
        pricingResult,
        flightId,
        seatNumbers,
        { usePartnershipBenefits }
      );

      return {
        success: true,
        data: processedPricing,
        metadata: {
          flightId,
          seatNumbers,
          provider: provider.name,
          partnershipId: provider.partnershipId,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error getting seat pricing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get seat features
   * @param {string} flightId - Flight ID
   * @param {string} seatNumber - Seat number
   * @param {Object} options - Options
   * @returns {Promise<Object>} Seat features
   */
  async getSeatFeatures(flightId, seatNumber, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        timeout = 5000
      } = options;

      // Get provider
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      // Get seat features
      let featuresResult;
      if (usePartnershipBenefits && provider.getPartnershipSeatFeatures) {
        featuresResult = await provider.getPartnershipSeatFeatures(flightId, seatNumber, {
          timeout
        });
      } else {
        featuresResult = await provider.getSeatFeatures(flightId, seatNumber, {
          timeout
        });
      }

      // Process features with partnership benefits
      const processedFeatures = await this.processSeatFeaturesWithBenefits(
        featuresResult,
        flightId,
        seatNumber,
        { usePartnershipBenefits }
      );

      return {
        success: true,
        data: processedFeatures,
        metadata: {
          flightId,
          seatNumber,
          provider: provider.name,
          partnershipId: provider.partnershipId,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error getting seat features:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch seat map from provider
   * @param {string} flightId - Flight ID
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Seat map data
   */
  async fetchSeatMapFromProvider(flightId, options) {
    try {
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      let seatMap;
      if (options.usePartnershipBenefits && provider.getEnhancedSeatMap) {
        seatMap = await provider.getEnhancedSeatMap(flightId, options);
      } else {
        seatMap = await provider.getSeatMap(flightId, options);
      }

      return {
        success: true,
        data: seatMap,
        provider: provider.name,
        partnershipId: provider.partnershipId,
        tier: provider.tier
      };

    } catch (error) {
      console.error('Error fetching seat map from provider:', error);
      throw error;
    }
  }

  /**
   * Process seat map with partnership benefits
   * @param {Object} seatMap - Raw seat map data
   * @param {string} flightId - Flight ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed seat map
   */
  async processSeatMapWithBenefits(seatMap, flightId, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return seatMap;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(seatMap.partnershipId);
      if (!partnership) {
        return seatMap;
      }

      // Process each seat with benefits
      const processedSeats = seatMap.data.seats?.map(seat => {
        return this.applySeatBenefits(seat, partnership.tier);
      }) || [];

      return {
        ...seatMap,
        data: {
          ...seatMap.data,
          seats: processedSeats,
          partnershipBenefits: {
            applied: true,
            tier: partnership.tier,
            freeSelection: this.hasFreeSeatSelection(partnership.tier),
            advanceSelection: this.getAdvanceSeatSelection(partnership.tier),
            preferredSeats: this.getPreferredSeats(partnership.tier)
          }
        }
      };

    } catch (error) {
      console.error('Error processing seat map with benefits:', error);
      return seatMap;
    }
  }

  /**
   * Process seat selection with partnership benefits
   * @param {Object} selectionResult - Raw selection result
   * @param {string} flightId - Flight ID
   * @param {Array} seatSelections - Seat selections
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed selection
   */
  async processSeatSelectionWithBenefits(selectionResult, flightId, seatSelections, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return selectionResult;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(selectionResult.partnershipId);
      if (!partnership) {
        return selectionResult;
      }

      // Apply benefits to selection
      const processedSelection = {
        ...selectionResult,
        partnershipBenefits: {
          applied: true,
          tier: partnership.tier,
          freeSelection: this.hasFreeSeatSelection(partnership.tier),
          discountApplied: this.getSeatSelectionDiscount(partnership.tier),
          priorityProcessing: this.hasPrioritySeatProcessing(partnership.tier)
        }
      };

      // Apply discount if applicable
      if (this.getSeatSelectionDiscount(partnership.tier) > 0) {
        const discount = this.getSeatSelectionDiscount(partnership.tier);
        processedSelection.pricing = {
          ...selectionResult.pricing,
          discount: selectionResult.pricing.total * discount,
          discountedTotal: selectionResult.pricing.total * (1 - discount)
        };
      }

      return processedSelection;

    } catch (error) {
      console.error('Error processing seat selection with benefits:', error);
      return selectionResult;
    }
  }

  /**
   * Process seat pricing with partnership benefits
   * @param {Object} pricingResult - Raw pricing result
   * @param {string} flightId - Flight ID
   * @param {Array} seatNumbers - Seat numbers
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed pricing
   */
  async processSeatPricingWithBenefits(pricingResult, flightId, seatNumbers, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return pricingResult;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(pricingResult.partnershipId);
      if (!partnership) {
        return pricingResult;
      }

      // Apply benefits to pricing
      const processedPricing = {
        ...pricingResult,
        partnershipBenefits: {
          applied: true,
          tier: partnership.tier,
          discountApplied: this.getSeatPricingDiscount(partnership.tier),
          freeUpgrades: this.hasFreeSeatUpgrades(partnership.tier)
        }
      };

      // Apply discount if applicable
      if (this.getSeatPricingDiscount(partnership.tier) > 0) {
        const discount = this.getSeatPricingDiscount(partnership.tier);
        processedPricing.pricing = pricingResult.pricing.map(seatPricing => ({
          ...seatPricing,
          discount: seatPricing.basePrice * discount,
          discountedPrice: seatPricing.basePrice * (1 - discount)
        }));
      }

      return processedPricing;

    } catch (error) {
      console.error('Error processing seat pricing with benefits:', error);
      return pricingResult;
    }
  }

  /**
   * Process seat features with partnership benefits
   * @param {Object} featuresResult - Raw features result
   * @param {string} flightId - Flight ID
   * @param {string} seatNumber - Seat number
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed features
   */
  async processSeatFeaturesWithBenefits(featuresResult, flightId, seatNumber, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return featuresResult;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(featuresResult.partnershipId);
      if (!partnership) {
        return featuresResult;
      }

      // Apply benefits to features
      const processedFeatures = {
        ...featuresResult,
        partnershipBenefits: {
          applied: true,
          tier: partnership.tier,
          enhancedFeatures: this.getEnhancedSeatFeatures(partnership.tier),
          exclusiveAccess: this.hasExclusiveSeatAccess(partnership.tier)
        }
      };

      // Add enhanced features based on tier
      if (this.getEnhancedSeatFeatures(partnership.tier)) {
        processedFeatures.features = {
          ...featuresResult.features,
          partnership: {
            priorityBoarding: this.hasPriorityBoarding(partnership.tier),
            loungeAccess: this.hasLoungeAccess(partnership.tier),
            extraLegroom: this.hasExtraLegroom(partnership.tier),
            preferredMeal: this.hasPreferredMeal(partnership.tier)
          }
        };
      }

      return processedFeatures;

    } catch (error) {
      console.error('Error processing seat features with benefits:', error);
      return featuresResult;
    }
  }

  /**
   * Apply seat benefits
   * @param {Object} seat - Seat data
   * @param {string} tier - Partnership tier
   * @returns {Object} Enhanced seat
   */
  applySeatBenefits(seat, tier) {
    const enhancedSeat = { ...seat };

    // Add tier-specific benefits
    enhancedSeat.partnershipBenefits = {
      tier,
      freeSelection: this.hasFreeSeatSelection(tier),
      advanceSelection: this.getAdvanceSeatSelection(tier),
      preferredSeats: this.getPreferredSeats(tier),
      discountApplied: this.getSeatSelectionDiscount(tier)
    };

    // Apply seat selection benefits
    if (this.hasFreeSeatSelection(tier)) {
      enhancedSeat.pricing = {
        ...enhancedSeat.pricing,
        selectionFee: 0,
        freeSelection: true
      };
    }

    // Apply preferred seat benefits
    if (this.getPreferredSeats(tier)) {
      enhancedSeat.features = {
        ...enhancedSeat.features,
        preferred: true,
        priority: this.getSeatPriority(tier)
      };
    }

    return enhancedSeat;
  }

  /**
   * Validate seat selections
   * @param {string} flightId - Flight ID
   * @param {Array} seatSelections - Seat selections
   * @returns {Promise<Object>} Validation result
   */
  async validateSeatSelections(flightId, seatSelections) {
    try {
      const errors = [];

      // Get seat map for validation
      const seatMap = await this.getSeatMap(flightId, {
        includeAvailability: true,
        usePartnershipBenefits: false
      });

      // Validate each seat selection
      for (const selection of seatSelections) {
        const seat = seatMap.data.seats?.find(s => s.seatNumber === selection.seatNumber);
        
        if (!seat) {
          errors.push(`Seat ${selection.seatNumber} not found`);
          continue;
        }

        // Check availability
        if (!seat.available) {
          errors.push(`Seat ${selection.seatNumber} is not available`);
        }

        // Check compatibility
        if (selection.passengerType && !this.isSeatCompatible(seat, selection.passengerType)) {
          errors.push(`Seat ${selection.seatNumber} is not compatible with ${selection.passengerType}`);
        }

        // Check restrictions
        if (seat.restrictions && seat.restrictions.length > 0) {
          for (const restriction of seat.restrictions) {
            if (this.violatesRestriction(selection, restriction)) {
              errors.push(`Seat ${selection.seatNumber} violates restriction: ${restriction.type}`);
            }
          }
        }
      }

      // Check for duplicate selections
      const seatNumbers = seatSelections.map(s => s.seatNumber);
      const duplicates = seatNumbers.filter((seat, index) => seatNumbers.indexOf(seat) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate seat selections: ${duplicates.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      console.error('Error validating seat selections:', error);
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
    }
  }

  /**
   * Check if seat is compatible with passenger type
   * @param {Object} seat - Seat data
   * @param {string} passengerType - Passenger type
   * @returns {boolean} Compatibility
   */
  isSeatCompatible(seat, passengerType) {
    const compatibility = {
      adult: ['economy', 'premium_economy', 'business', 'first'],
      child: ['economy', 'premium_economy'],
      infant: ['economy'],
      elderly: ['economy', 'premium_economy', 'business'],
      disabled: ['economy', 'business'], // Usually with accessibility features
      'with_infant': ['economy', 'premium_economy', 'business']
    };

    const allowedClasses = compatibility[passengerType] || compatibility.adult;
    return allowedClasses.includes(seat.class);
  }

  /**
   * Check if selection violates restriction
   * @param {Object} selection - Seat selection
   * @param {Object} restriction - Seat restriction
   * @returns {boolean} Violation
   */
  violatesRestriction(selection, restriction) {
    switch (restriction.type) {
      case 'exit_row':
        return selection.passengerType === 'child' || selection.passengerType === 'disabled';
      case 'bulkhead':
        return selection.specialRequests?.includes('extra_legroom');
      case 'no_infant':
        return selection.passengerType === 'with_infant';
      case 'premium_only':
        return !selection.willingToPay;
      default:
        return false;
    }
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

  // Helper methods for tier-based benefits
  hasFreeSeatSelection(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  getAdvanceSeatSelection(tier) {
    const days = {
      bronze: 0,
      silver: 7,
      gold: 14,
      platinum: 21,
      diamond: 30
    };
    return days[tier] || 0;
  }

  getPreferredSeats(tier) {
    return ['silver', 'gold', 'platinum', 'diamond'].includes(tier);
  }

  getSeatPriority(tier) {
    const priorities = {
      bronze: 0,
      silver: 1,
      gold: 2,
      platinum: 3,
      diamond: 4
    };
    return priorities[tier] || 0;
  }

  getSeatSelectionDiscount(tier) {
    const discounts = {
      bronze: 0,
      silver: 0.05, // 5%
      gold: 0.10, // 10%
      platinum: 0.15, // 15%
      diamond: 0.20  // 20%
    };
    return discounts[tier] || 0;
  }

  hasPrioritySeatProcessing(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  getSeatPricingDiscount(tier) {
    const discounts = {
      bronze: 0,
      silver: 0.03, // 3%
      gold: 0.07, // 7%
      platinum: 0.12, // 12%
      diamond: 0.15  // 15%
    };
    return discounts[tier] || 0;
  }

  hasFreeSeatUpgrades(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  getEnhancedSeatFeatures(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  hasExclusiveSeatAccess(tier) {
    return ['diamond'].includes(tier);
  }

  hasPriorityBoarding(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  hasLoungeAccess(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  hasExtraLegroom(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  hasPreferredMeal(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  /**
   * Generate cache key
   * @param {string} flightId - Flight ID
   * @param {Object} options - Options
   * @returns {string} Cache key
   */
  generateCacheKey(flightId, options) {
    const key = {
      flightId,
      options: {
        usePartnershipBenefits: options.usePartnershipBenefits,
        includePricing: options.includePricing,
        includeAvailability: options.includeAvailability,
        includeFeatures: options.includeFeatures
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
      for (const [key] of this.seatMapCache) {
        if (key.includes(pattern)) {
          this.seatMapCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.seatMapCache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.seatMapCache.size,
      keys: Array.from(this.seatMapCache.keys()),
      timeout: this.cacheTimeout
    };
  }
}

// Singleton instance
let seatMapServiceInstance = null;

/**
 * Get or create seat map integration service instance
 * @returns {SeatMapIntegrationService} Service instance
 */
export function getSeatMapIntegrationService() {
  if (!seatMapServiceInstance) {
    seatMapServiceInstance = new SeatMapIntegrationService();
  }
  return seatMapServiceInstance;
}