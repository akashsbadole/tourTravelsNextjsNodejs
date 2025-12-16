import "server-only";
import { DirectAirlineProvider } from './direct-airline-provider';

/**
 * Low-Cost Carrier Provider
 * Specialized provider for low-cost airlines with unique business models
 */
export class LowCostCarrierProvider extends DirectAirlineProvider {
  constructor(config = {}) {
    super({
      name: 'LowCostCarrier',
      rateLimit: 150, // Higher rate limit for low-cost carriers
      timeout: 25000, // Slightly faster timeout
      ...config
    });
    
    this.carrierType = config.carrierType || 'ultra_low_cost'; // ultra_low_cost, low_cost, hybrid
    this.bundlingStrategy = config.bundlingStrategy || 'unbundled'; // bundled, unbundled, flexible
    this.ancillaryRevenueModel = config.ancillaryRevenueModel || 'a_la_carte'; // a_la_carte, bundles, subscription
    this.dynamicPricingEnabled = config.dynamicPricingEnabled !== false;
    this.loyaltyProgramType = config.loyaltyProgramType || 'points_based'; // points_based, tiered, subscription
  }

  /**
   * Search for flights with low-cost carrier specific logic
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Array of flight options
   */
  async searchFlights(searchParams) {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      tripType = 'one_way',
      passengers = { adults: 1, children: 0, infants: 0 },
      cabinClass = 'economy'
    } = searchParams;

    try {
      // Low-cost carriers typically only offer economy class
      const effectiveCabinClass = cabinClass === 'economy' ? 'economy' : 'economy';
      
      const lowCostParams = {
        origin,
        destination,
        departureDate: this.formatDate(departureDate),
        returnDate: returnDate ? this.formatDate(returnDate) : undefined,
        tripType,
        passengers,
        cabinClass: effectiveCabinClass,
        partnershipId: this.partnershipId,
        includeAncillaryPricing: true, // Always include for low-cost carriers
        includeFareFamilies: this.bundlingStrategy === 'flexible',
        dynamicPricing: this.dynamicPricingEnabled,
        carrierType: this.carrierType
      };

      // Apply low-cost carrier specific transformations
      const transformedParams = this.transformLowCostSearchParams(lowCostParams);
      
      const response = await this.makeRequest('/flights/search', transformedParams);
      
      if (!response.flights || !Array.isArray(response.flights)) {
        return [];
      }

      // Process flights with low-cost carrier specific logic
      return response.flights.map(flight => this.transformLowCostFlightData(flight));
    } catch (error) {
      console.error(`${this.airlineCode} low-cost flight search error:`, error);
      throw error;
    }
  }

  /**
   * Get fare families for low-cost carrier
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Available fare families
   */
  async getFareFamilies(searchParams) {
    if (this.bundlingStrategy === 'unbundled') {
      return [];
    }

    try {
      const fareFamilyParams = {
        ...searchParams,
        partnershipId: this.partnershipId,
        carrierType: this.carrierType
      };

      const response = await this.makeRequest('/fares/families', fareFamilyParams);
      return response.fareFamilies || [];
    } catch (error) {
      console.error(`Error getting ${this.airlineCode} fare families:`, error);
      return [];
    }
  }

  /**
   * Get ancillary services with low-cost carrier specific pricing
   * @param {string} flightId - Flight ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Ancillary services data
   */
  async getAncillaryServices(flightId, options = {}) {
    try {
      const requestBody = {
        flightId,
        partnershipId: this.partnershipId,
        revenueModel: this.ancillaryRevenueModel,
        includeBundles: this.ancillaryRevenueModel !== 'a_la_carte',
        ...options
      };

      const response = await this.makeRequest('/ancillary/services', {}, {
        method: 'POST',
        body: requestBody
      });
      
      return {
        success: true,
        data: response.ancillaryServices || [],
        bundles: response.serviceBundles || [],
        metadata: response.metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { flightId, options });
    }
  }

  /**
   * Get dynamic pricing for low-cost carrier
   * @param {string} flightId - Flight ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Dynamic pricing data
   */
  async getDynamicPricing(flightId, options = {}) {
    if (!this.dynamicPricingEnabled) {
      return null;
    }

    try {
      const requestBody = {
        flightId,
        partnershipId: this.partnershipId,
        pricingFactors: [
          'demand',
          'time_to_departure',
          'load_factor',
          'competitor_pricing',
          'seasonality'
        ],
        ...options
      };

      const response = await this.makeRequest('/pricing/dynamic', {}, {
        method: 'POST',
        body: requestBody
      });

      return {
        success: true,
        data: response.dynamicPricing || {},
        metadata: response.metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { flightId, options });
    }
  }

  /**
   * Get loyalty program for low-cost carrier
   * @param {string} loyaltyProgramId - Loyalty program ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Loyalty program data
   */
  async getLoyaltyIntegration(loyaltyProgramId, options = {}) {
    if (!this.loyaltyProgramType) {
      return null;
    }

    try {
      const response = await this.makeRequest(`/loyalty/${loyaltyProgramId}`, {
        programType: this.loyaltyProgramType,
        partnershipId: this.partnershipId,
        ...options
      });
      
      return {
        success: true,
        data: response.loyaltyProgram || {},
        metadata: response.metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { loyaltyProgramId, options });
    }
  }

  /**
   * Transform low-cost carrier specific search parameters
   * @param {Object} params - Standard search parameters
   * @returns {Object} Low-cost carrier specific parameters
   */
  transformLowCostSearchParams(params) {
    const transformed = { ...params };

    // Add low-cost carrier specific parameters
    transformed.includeBaseFareOnly = this.bundlingStrategy === 'unbundled';
    transformed.includeServiceBundles = this.bundlingStrategy === 'flexible';
    transformed.ancillaryRevenueModel = this.ancillaryRevenueModel;
    
    // Low-cost carriers often have different baggage policies
    transformed.baggagePolicy = {
      includedCarryOn: this.carrierType === 'ultra_low_cost' ? false : true,
      includedCheckedBaggage: false,
      baggageFeeStructure: 'per_segment'
    };

    // Add partnership specific benefits for low-cost carriers
    if (this.partnershipBenefits.lowCostBenefits) {
      transformed.partnershipBenefits = {
        waivedBookingFees: this.partnershipBenefits.lowCostBenefits.waivedBookingFees || false,
        discountedBaggageFees: this.partnershipBenefits.lowCostBenefits.discountedBaggageFees || 0,
        freeSeatSelection: this.partnershipBenefits.lowCostBenefits.freeSeatSelection || false,
        priorityBoardingDiscount: this.partnershipBenefits.lowCostBenefits.priorityBoardingDiscount || 0
      };
    }

    return transformed;
  }

  /**
   * Transform low-cost carrier flight data to standard format
   * @param {Object} lowCostFlight - Raw low-cost carrier flight data
   * @returns {Object} Standardized flight data
   */
  transformLowCostFlightData(lowCostFlight) {
    const flight = lowCostFlight;
    
    // Start with base transformation
    const baseFlight = this.transformFlightData(flight);
    
    // Add low-cost carrier specific information
    baseFlight.lowCostCarrier = {
      carrierType: this.carrierType,
      bundlingStrategy: this.bundlingStrategy,
      baseFareOnly: flight.baseFareOnly || false,
      serviceFees: flight.serviceFees || {},
      fareFamily: flight.fareFamily || null,
      dynamicPricing: {
        enabled: this.dynamicPricingEnabled,
        currentPrice: flight.dynamicPrice || null,
        priceTrend: flight.priceTrend || 'stable',
        nextUpdate: flight.nextPriceUpdate || null
      }
    };

    // Add ancillary service pricing
    baseFlight.ancillaryServices = {
      ...baseFlight.ancillaryServices,
      lowCostSpecific: {
        baggage: {
          carryOn: {
            included: flight.carryOnIncluded || false,
            price: flight.carryOnPrice || 0,
            dimensions: flight.carryOnDimensions || {}
          },
          checked: {
            included: false, // Never included for low-cost carriers
            firstBag: flight.firstBagPrice || 0,
            additionalBags: flight.additionalBagPrice || 0,
            weightLimit: flight.baggageWeightLimit || 20,
            dimensions: flight.checkedBagDimensions || {}
          }
        },
        seatSelection: {
          included: flight.seatSelectionIncluded || false,
          standardPrice: flight.standardSeatPrice || 0,
          premiumPrice: flight.premiumSeatPrice || 0,
          exitRowPrice: flight.exitRowPrice || 0,
          frontRowPrice: flight.frontRowPrice || 0
        },
        priorityServices: {
          priorityBoarding: {
            included: false,
            price: flight.priorityBoardingPrice || 0
          },
          fastTrackSecurity: {
            included: false,
            price: flight.fastTrackPrice || 0
          }
        },
        foodAndBeverage: {
          included: false,
          menuAvailable: flight.menuAvailable || false,
          preOrderDiscount: flight.preOrderDiscount || 0
        },
        entertainment: {
          included: false,
          wifiAvailable: flight.wifiAvailable || false,
          wifiPrice: flight.wifiPrice || 0,
          streamingAvailable: flight.streamingAvailable || false
        }
      }
    };

    // Add partnership benefits for low-cost carriers
    if (this.partnershipBenefits.lowCostBenefits) {
      baseFlight.partnership.lowCostBenefits = {
        waivedServiceFees: this.partnershipBenefits.lowCostBenefits.waivedServiceFees || [],
        discountedAncillaryServices: this.partnershipBenefits.lowCostBenefits.discountedAncillaryServices || {},
        complimentaryServices: this.partnershipBenefits.lowCostBenefits.complimentaryServices || [],
        bundleDiscounts: this.partnershipBenefits.lowCostBenefits.bundleDiscounts || {}
      };
    }

    return baseFlight;
  }

  /**
   * Create booking with low-cost carrier specific logic
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Booking result
   */
  async createBooking(bookingData) {
    try {
      // Add low-cost carrier specific booking data
      const lowCostBookingData = {
        ...bookingData,
        partnershipId: this.partnershipId,
        partnershipTier: this.tier,
        carrierType: this.carrierType,
        bundlingStrategy: this.bundlingStrategy,
        ancillaryRevenueModel: this.ancillaryRevenueModel,
        lowCostSpecific: {
          waiveServiceFees: this.partnershipBenefits.lowCostBenefits?.waivedServiceFees || [],
          applyAncillaryDiscounts: this.partnershipBenefits.lowCostBenefits?.discountedAncillaryServices || {},
          includeComplimentaryServices: this.partnershipBenefits.lowCostBenefits?.complimentaryServices || []
        }
      };

      const response = await this.makeRequest('/bookings/create', {}, {
        method: 'POST',
        body: lowCostBookingData
      });

      return {
        success: true,
        data: response.booking || {},
        metadata: response.metadata || {},
        lowCostCarrier: {
          serviceFeesWaived: response.serviceFeesWaived || [],
          ancillaryDiscountsApplied: response.ancillaryDiscountsApplied || {},
          complimentaryServicesAdded: response.complimentaryServicesAdded || []
        }
      };
    } catch (error) {
      return this.handleError(error, { bookingData });
    }
  }

  /**
   * Get exclusive fares for low-cost carrier partnership
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Exclusive fare options
   */
  async getExclusiveFares(searchParams) {
    if (!this.partnershipBenefits.exclusiveFares) {
      return [];
    }

    try {
      const exclusiveParams = {
        ...searchParams,
        fareType: 'exclusive',
        partnershipId: this.partnershipId,
        tier: this.tier,
        carrierType: this.carrierType,
        includeServiceFeeWaivers: true
      };

      const response = await this.makeRequest('/fares/exclusive', exclusiveParams);
      return response.fares || [];
    } catch (error) {
      console.error(`Error getting ${this.airlineCode} exclusive fares:`, error);
      return [];
    }
  }

  /**
   * Get partnership promotions for low-cost carrier
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Available promotions
   */
  async getPartnershipPromotions(searchParams) {
    try {
      const promotionParams = {
        ...searchParams,
        partnershipId: this.partnershipId,
        tier: this.tier,
        carrierType: this.carrierType,
        promotionTypes: [
          'baggage_discount',
          'seat_selection_discount',
          'service_fee_waiver',
          'bundle_discount',
          'loyalty_bonus'
        ]
      };

      const response = await this.makeRequest('/promotions/partnership', promotionParams);
      return response.promotions || [];
    } catch (error) {
      console.error(`Error getting ${this.airlineCode} partnership promotions:`, error);
      return [];
    }
  }

  /**
   * Get service bundles for low-cost carrier
   * @param {string} flightId - Flight ID
   * @returns {Promise<Array>} Available service bundles
   */
  async getServiceBundles(flightId) {
    if (this.ancillaryRevenueModel === 'a_la_carte') {
      return [];
    }

    try {
      const response = await this.makeRequest(`/ancillary/bundles/${flightId}`, {
        partnershipId: this.partnershipId
      });
      
      return response.serviceBundles || [];
    } catch (error) {
      console.error(`Error getting ${this.airlineCode} service bundles:`, error);
      return [];
    }
  }
}