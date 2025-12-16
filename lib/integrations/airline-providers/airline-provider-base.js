import "server-only";
import { BaseFlightProvider } from '../flight-providers/base-provider';

/**
 * Base Airline Provider
 * Extends BaseFlightProvider with airline-specific partnership features
 */
export class AirlineProviderBase extends BaseFlightProvider {
  constructor(config = {}) {
    super({
      name: 'AirlineProviderBase',
      rateLimit: 100,
      timeout: 30000,
      ...config
    });
    
    this.partnershipId = config.partnershipId;
    this.airlineCode = config.airlineCode;
    this.tier = config.tier || 'bronze';
    this.partnershipBenefits = config.partnershipBenefits || {};
    this.commissionStructure = config.commissionStructure || {};
  }

  /**
   * Get partnership-specific flight search with exclusive fares
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of flight options with partnership benefits
   */
  async searchPartnershipFlights(searchParams, options = {}) {
    const {
      includeExclusiveFares = true,
      includeNetFares = true,
      includePromotions = true,
      loyaltyProgramId = null,
      corporateCode = null
    } = options;

    try {
      // Get base flight results
      const baseResults = await this.searchFlights(searchParams);
      
      // Enhance with partnership benefits
      const enhancedResults = await Promise.all(
        baseResults.map(async (flight) => {
          return await this.enhanceFlightWithPartnershipBenefits(flight, {
            includeExclusiveFares,
            includeNetFares,
            includePromotions,
            loyaltyProgramId,
            corporateCode
          });
        })
      );

      return enhancedResults;
    } catch (error) {
      throw this.handleError(error, { searchParams, options });
    }
  }

  /**
   * Get exclusive fares for partnership tier
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
        partnershipTier: this.tier,
        partnershipId: this.partnershipId
      };

      const response = await this.makeRequest('/fares/exclusive', exclusiveParams);
      return response.data || [];
    } catch (error) {
      console.error('Error getting exclusive fares:', error);
      return [];
    }
  }

  /**
   * Get net fares (consolidator fares)
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Net fare options
   */
  async getNetFares(searchParams) {
    if (!this.partnershipBenefits.netFares) {
      return [];
    }

    try {
      const netParams = {
        ...searchParams,
        fareType: 'net',
        partnershipTier: this.tier,
        partnershipId: this.partnershipId
      };

      const response = await this.makeRequest('/fares/net', netParams);
      return response.data || [];
    } catch (error) {
      console.error('Error getting net fares:', error);
      return [];
    }
  }

  /**
   * Get fare class availability with partnership benefits
   * @param {string} flightId - Flight ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Enhanced fare class availability
   */
  async getEnhancedFareClassAvailability(flightId, options = {}) {
    try {
      const baseAvailability = await this.getFareClassAvailability(flightId);
      
      // Enhance with partnership benefits
      const enhancedAvailability = {
        ...baseAvailability,
        partnershipBenefits: {
          priorityAccess: this.partnershipBenefits.priorityAccess || false,
          preferentialSeating: this.partnershipBenefits.preferentialSeating || false,
          enhancedCommission: this.partnershipBenefits.enhancedCommission || false
        },
        exclusiveClasses: this.getExclusiveFareClasses(),
        discountedClasses: this.getDiscountedFareClasses()
      };

      return enhancedAvailability;
    } catch (error) {
      return this.handleError(error, { flightId, options });
    }
  }

  /**
   * Get seat map with partnership benefits
   * @param {string} flightId - Flight ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Enhanced seat map
   */
  async getEnhancedSeatMap(flightId, options = {}) {
    try {
      const baseSeatMap = await this.getSeatMap(flightId);
      
      // Enhance with partnership benefits
      const enhancedSeatMap = {
        ...baseSeatMap,
        partnershipBenefits: {
          freeSeatSelection: this.partnershipBenefits.freeSeatSelection || false,
          prioritySeatSelection: this.partnershipBenefits.prioritySeatSelection || false,
          preferredSeats: this.getPreferredSeats()
        }
      };

      return enhancedSeatMap;
    } catch (error) {
      return this.handleError(error, { flightId, options });
    }
  }

  /**
   * Get ancillary services with partnership discounts
   * @param {string} flightId - Flight ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Enhanced ancillary services
   */
  async getEnhancedAncillaryServices(flightId, options = {}) {
    try {
      const baseAncillary = await this.getAncillaryServices(flightId);
      
      // Apply partnership discounts
      const enhancedAncillary = {
        ...baseAncillary,
        partnershipDiscounts: this.getAncillaryDiscounts(),
        complimentaryServices: this.getComplimentaryServices()
      };

      return enhancedAncillary;
    } catch (error) {
      return this.handleError(error, { flightId, options });
    }
  }

  /**
   * Create booking with partnership benefits
   * @param {Object} bookingData - Booking data
   * @param {Object} options - Options
   * @returns {Promise<Object>} Booking result with partnership benefits
   */
  async createPartnershipBooking(bookingData, options = {}) {
    try {
      // Add partnership context to booking
      const enhancedBookingData = {
        ...bookingData,
        partnershipId: this.partnershipId,
        partnershipTier: this.tier,
        partnershipBenefits: this.partnershipBenefits,
        commissionStructure: this.commissionStructure
      };

      // Create booking through provider
      const bookingResult = await this.createBooking(enhancedBookingData);
      
      // Apply partnership benefits
      const enhancedResult = {
        ...bookingResult,
        partnershipApplied: {
          exclusiveFareApplied: bookingData.useExclusiveFare || false,
          netFareApplied: bookingData.useNetFare || false,
          commissionApplied: this.calculateCommission(bookingResult.totalFare),
          benefitsApplied: this.getAppliedBenefits(bookingData)
        }
      };

      return enhancedResult;
    } catch (error) {
      return this.handleError(error, { bookingData, options });
    }
  }

  /**
   * Get loyalty program integration
   * @param {string} loyaltyProgramId - Loyalty program ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Loyalty program data
   */
  async getLoyaltyIntegration(loyaltyProgramId, options = {}) {
    if (!this.partnershipBenefits.loyaltyIntegration) {
      return null;
    }

    try {
      const response = await this.makeRequest(`/loyalty/${loyaltyProgramId}`, options);
      return response.data || null;
    } catch (error) {
      console.error('Error getting loyalty integration:', error);
      return null;
    }
  }

  /**
   * Get partnership promotions
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Available promotions
   */
  async getPartnershipPromotions(searchParams) {
    try {
      const promotionParams = {
        ...searchParams,
        partnershipId: this.partnershipId,
        tier: this.tier
      };

      const response = await this.makeRequest('/promotions/partnership', promotionParams);
      return response.data || [];
    } catch (error) {
      console.error('Error getting partnership promotions:', error);
      return [];
    }
  }

  /**
   * Enhance flight with partnership benefits
   * @param {Object} flight - Flight data
   * @param {Object} options - Enhancement options
   * @returns {Promise<Object>} Enhanced flight data
   */
  async enhanceFlightWithPartnershipBenefits(flight, options = {}) {
    const enhancedFlight = { ...flight };

    // Add partnership information
    enhancedFlight.partnership = {
      id: this.partnershipId,
      tier: this.tier,
      airlineCode: this.airlineCode,
      benefits: this.partnershipBenefits
    };

    // Apply exclusive fares if available
    if (options.includeExclusiveFares) {
      enhancedFlight.exclusiveFares = await this.getExclusiveFares({
        origin: flight.origin,
        destination: flight.destination,
        departureDate: flight.departureDate
      });
    }

    // Apply net fares if available
    if (options.includeNetFares) {
      enhancedFlight.netFares = await this.getNetFares({
        origin: flight.origin,
        destination: flight.destination,
        departureDate: flight.departureDate
      });
    }

    // Apply promotions if available
    if (options.includePromotions) {
      enhancedFlight.promotions = await this.getPartnershipPromotions({
        origin: flight.origin,
        destination: flight.destination,
        departureDate: flight.departureDate
      });
    }

    // Apply loyalty benefits if provided
    if (options.loyaltyProgramId) {
      enhancedFlight.loyaltyBenefits = await this.getLoyaltyIntegration(
        options.loyaltyProgramId
      );
    }

    // Apply corporate benefits if provided
    if (options.corporateCode) {
      enhancedFlight.corporateBenefits = await this.getCorporateBenefits(
        options.corporateCode
      );
    }

    return enhancedFlight;
  }

  /**
   * Calculate commission based on partnership structure
   * @param {number} fareAmount - Fare amount
   * @returns {number} Commission amount
   */
  calculateCommission(fareAmount) {
    const { commissionStructure } = this;
    
    if (!commissionStructure || !commissionStructure.baseRate) {
      return 0;
    }

    let commission = fareAmount * (commissionStructure.baseRate / 100);

    // Apply tier bonuses if applicable
    if (commissionStructure.tiers) {
      for (const tier of commissionStructure.tiers) {
        if (fareAmount >= tier.minVolume && fareAmount <= tier.maxVolume) {
          commission = fareAmount * (tier.rate / 100);
          break;
        }
      }
    }

    return commission;
  }

  /**
   * Get exclusive fare classes for partnership tier
   * @returns {Array} Exclusive fare classes
   */
  getExclusiveFareClasses() {
    const tierExclusiveClasses = {
      bronze: [],
      silver: ['Economy Plus'],
      gold: ['Economy Plus', 'Premium Economy'],
      platinum: ['Economy Plus', 'Premium Economy', 'Business'],
      diamond: ['Economy Plus', 'Premium Economy', 'Business', 'First']
    };

    return tierExclusiveClasses[this.tier] || [];
  }

  /**
   * Get discounted fare classes for partnership tier
   * @returns {Array} Discounted fare classes
   */
  getDiscountedFareClasses() {
    const tierDiscounts = {
      bronze: [],
      silver: ['Economy'],
      gold: ['Economy', 'Premium Economy'],
      platinum: ['Economy', 'Premium Economy', 'Business'],
      diamond: ['Economy', 'Premium Economy', 'Business', 'First']
    };

    return tierDiscounts[this.tier] || [];
  }

  /**
   * Get preferred seats for partnership tier
   * @returns {Array} Preferred seat types
   */
  getPreferredSeats() {
    const tierPreferredSeats = {
      bronze: [],
      silver: ['window', 'aisle'],
      gold: ['window', 'aisle', 'exit_row'],
      platinum: ['window', 'aisle', 'exit_row', 'bulkhead'],
      diamond: ['window', 'aisle', 'exit_row', 'bulkhead', 'premium']
    };

    return tierPreferredSeats[this.tier] || [];
  }

  /**
   * Get ancillary service discounts
   * @returns {Object} Ancillary discounts
   */
  getAncillaryDiscounts() {
    const tierDiscounts = {
      bronze: {},
      silver: { seatSelection: 10, baggage: 5 },
      gold: { seatSelection: 25, baggage: 15, meals: 10 },
      platinum: { seatSelection: 50, baggage: 25, meals: 20, wifi: 15 },
      diamond: { seatSelection: 100, baggage: 50, meals: 30, wifi: 25, lounge: 20 }
    };

    return tierDiscounts[this.tier] || {};
  }

  /**
   * Get complimentary services for partnership tier
   * @returns {Array} Complimentary services
   */
  getComplimentaryServices() {
    const tierServices = {
      bronze: [],
      silver: ['seatSelection'],
      gold: ['seatSelection', 'extraBaggage'],
      platinum: ['seatSelection', 'extraBaggage', 'priorityBoarding'],
      diamond: ['seatSelection', 'extraBaggage', 'priorityBoarding', 'loungeAccess']
    };

    return tierServices[this.tier] || [];
  }

  /**
   * Get applied benefits for booking
   * @param {Object} bookingData - Booking data
   * @returns {Array} Applied benefits
   */
  getAppliedBenefits(bookingData) {
    const benefits = [];

    if (this.partnershipBenefits.exclusiveFares && bookingData.useExclusiveFare) {
      benefits.push('exclusive_fare');
    }

    if (this.partnershipBenefits.netFares && bookingData.useNetFare) {
      benefits.push('net_fare');
    }

    if (this.partnershipBenefits.priorityBooking) {
      benefits.push('priority_booking');
    }

    if (this.partnershipBenefits.preferentialSeating) {
      benefits.push('preferential_seating');
    }

    return benefits;
  }

  /**
   * Get corporate benefits
   * @param {string} corporateCode - Corporate code
   * @returns {Promise<Object>} Corporate benefits
   */
  async getCorporateBenefits(corporateCode) {
    try {
      const response = await this.makeRequest(`/corporate/${corporateCode}`);
      return response.data || null;
    } catch (error) {
      console.error('Error getting corporate benefits:', error);
      return null;
    }
  }

  /**
   * Get seat map (to be implemented by specific providers)
   * @param {string} flightId - Flight ID
   * @returns {Promise<Object>} Seat map data
   */
  async getSeatMap(flightId) {
    throw new Error('getSeatMap method must be implemented by specific provider');
  }

  /**
   * Get ancillary services (to be implemented by specific providers)
   * @param {string} flightId - Flight ID
   * @returns {Promise<Object>} Ancillary services data
   */
  async getAncillaryServices(flightId) {
    throw new Error('getAncillaryServices method must be implemented by specific provider');
  }

  /**
   * Create booking (to be implemented by specific providers)
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Booking result
   */
  async createBooking(bookingData) {
    throw new Error('createBooking method must be implemented by specific provider');
  }
}