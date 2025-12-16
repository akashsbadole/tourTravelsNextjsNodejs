import { createDoc, updateOneDoc, getOneDoc, getManyDocs } from "@/lib/db/operations";
import { getAirlinePartnershipManager } from "@/lib/integrations/airline-providers/airline-partnership-manager";
import { getIntegrationHooks } from "./integrationHooks";

/**
 * Ancillary Services Integration Service
 * Manages ancillary services with partnership benefits
 */
export class AncillaryServicesIntegrationService {
  constructor() {
    this.partnershipManager = getAirlinePartnershipManager();
    this.integrationHooks = getIntegrationHooks();
    this.ancillaryCache = new Map();
    this.cacheTimeout = 4 * 60 * 1000; // 4 minutes
  }

  /**
   * Get ancillary services for flight
   * @param {string} flightId - Flight ID
   * @param {Object} options - Ancillary options
   * @returns {Promise<Object>} Ancillary services
   */
  async getAncillaryServices(flightId, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        includePricing = true,
        includeAvailability = true,
        category = null,
        refreshCache = false,
        timeout = 8000
      } = options;

      // Generate cache key
      const cacheKey = this.generateCacheKey(flightId, options);
      
      // Check cache first
      if (!refreshCache && this.ancillaryCache.has(cacheKey)) {
        const cached = this.ancillaryCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Get ancillary services from provider
      const ancillaryServices = await this.fetchAncillaryServicesFromProvider(flightId, {
        usePartnershipBenefits,
        includePricing,
        includeAvailability,
        category,
        timeout
      });

      // Process ancillary services with partnership benefits
      const processedServices = await this.processAncillaryServicesWithBenefits(
        ancillaryServices,
        flightId,
        { usePartnershipBenefits }
      );

      // Cache result
      this.ancillaryCache.set(cacheKey, {
        data: processedServices,
        timestamp: Date.now()
      });

      // Trigger analytics event
      await this.integrationHooks.triggerHook('ancillary_services_accessed', {
        flightId,
        resultCount: processedServices.services?.length || 0,
        cacheHit: false
      });

      return processedServices;

    } catch (error) {
      console.error('Error getting ancillary services:', error);
      throw error;
    }
  }

  /**
   * Get pricing for ancillary services
   * @param {string} flightId - Flight ID
   * @param {Array} serviceIds - Service IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {Object} options - Pricing options
   * @returns {Promise<Object>} Ancillary pricing
   */
  async getAncillaryPricing(flightId, serviceIds, passengerCounts, options = {}) {
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
      const cacheKey = this.generatePricingCacheKey(flightId, serviceIds, passengerCounts, options);
      
      // Check cache first
      if (!refreshCache && this.ancillaryCache.has(cacheKey)) {
        const cached = this.ancillaryCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Get pricing from provider
      const pricing = await this.fetchAncillaryPricingFromProvider(
        flightId,
        serviceIds,
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
      const processedPricing = await this.processAncillaryPricingWithBenefits(
        pricing,
        flightId,
        passengerCounts,
        { usePartnershipBenefits }
      );

      // Cache result
      this.ancillaryCache.set(cacheKey, {
        data: processedPricing,
        timestamp: Date.now()
      });

      // Trigger analytics event
      await this.integrationHooks.triggerHook('ancillary_pricing_accessed', {
        flightId,
        serviceIds,
        passengerCounts,
        resultCount: processedPricing.pricing?.length || 0,
        cacheHit: false
      });

      return processedPricing;

    } catch (error) {
      console.error('Error getting ancillary pricing:', error);
      throw error;
    }
  }

  /**
   * Book ancillary services
   * @param {string} flightId - Flight ID
   * @param {Array} bookings - Ancillary bookings
   * @param {Object} options - Booking options
   * @returns {Promise<Object>} Booking result
   */
  async bookAncillaryServices(flightId, bookings, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        passengerInfo = [],
        paymentInfo = {},
        timeout = 15000
      } = options;

      // Validate bookings
      const validation = await this.validateAncillaryBookings(flightId, bookings);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Ancillary booking validation failed',
          details: validation.errors
        };
      }

      // Get provider
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      // Book ancillary services
      let bookingResult;
      if (usePartnershipBenefits && provider.bookPartnershipAncillaryServices) {
        bookingResult = await provider.bookPartnershipAncillaryServices(flightId, bookings, {
          passengerInfo,
          paymentInfo,
          timeout
        });
      } else {
        bookingResult = await provider.bookAncillaryServices(flightId, bookings, {
          passengerInfo,
          paymentInfo,
          timeout
        });
      }

      // Process booking with partnership benefits
      const processedBooking = await this.processAncillaryBookingWithBenefits(
        bookingResult,
        flightId,
        bookings,
        { usePartnershipBenefits }
      );

      // Trigger analytics event
      await this.integrationHooks.triggerHook('ancillary_services_booked', {
        flightId,
        bookings,
        success: processedBooking.success,
        benefits: processedBooking.partnershipBenefits
      });

      return processedBooking;

    } catch (error) {
      console.error('Error booking ancillary services:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get ancillary service categories
   * @param {string} flightId - Flight ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Service categories
   */
  async getAncillaryCategories(flightId, options = {}) {
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

      // Get categories
      let categories;
      if (usePartnershipBenefits && provider.getPartnershipAncillaryCategories) {
        categories = await provider.getPartnershipAncillaryCategories(flightId, { timeout });
      } else {
        categories = await provider.getAncillaryCategories(flightId, { timeout });
      }

      // Process categories with partnership benefits
      const processedCategories = await this.processCategoriesWithBenefits(
        categories,
        flightId,
        { usePartnershipBenefits }
      );

      return {
        success: true,
        data: processedCategories,
        metadata: {
          flightId,
          provider: provider.name,
          partnershipId: provider.partnershipId,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error getting ancillary categories:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get ancillary service details
   * @param {string} flightId - Flight ID
   * @param {string} serviceId - Service ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Service details
   */
  async getAncillaryServiceDetails(flightId, serviceId, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        includePricing = true,
        includeAvailability = true,
        timeout = 6000
      } = options;

      // Get provider
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      // Get service details
      let serviceDetails;
      if (usePartnershipBenefits && provider.getPartnershipAncillaryServiceDetails) {
        serviceDetails = await provider.getPartnershipAncillaryServiceDetails(flightId, serviceId, {
          includePricing,
          includeAvailability,
          timeout
        });
      } else {
        serviceDetails = await provider.getAncillaryServiceDetails(flightId, serviceId, {
          includePricing,
          includeAvailability,
          timeout
        });
      }

      // Process service details with partnership benefits
      const processedDetails = await this.processServiceDetailsWithBenefits(
        serviceDetails,
        flightId,
        serviceId,
        { usePartnershipBenefits }
      );

      return {
        success: true,
        data: processedDetails,
        metadata: {
          flightId,
          serviceId,
          provider: provider.name,
          partnershipId: provider.partnershipId,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error getting ancillary service details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch ancillary services from provider
   * @param {string} flightId - Flight ID
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Ancillary services data
   */
  async fetchAncillaryServicesFromProvider(flightId, options) {
    try {
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      let ancillaryServices;
      if (options.usePartnershipBenefits && provider.getEnhancedAncillaryServices) {
        ancillaryServices = await provider.getEnhancedAncillaryServices(flightId, options);
      } else {
        ancillaryServices = await provider.getAncillaryServices(flightId, options);
      }

      return {
        success: true,
        data: ancillaryServices,
        provider: provider.name,
        partnershipId: provider.partnershipId,
        tier: provider.tier
      };

    } catch (error) {
      console.error('Error fetching ancillary services from provider:', error);
      throw error;
    }
  }

  /**
   * Fetch ancillary pricing from provider
   * @param {string} flightId - Flight ID
   * @param {Array} serviceIds - Service IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Ancillary pricing data
   */
  async fetchAncillaryPricingFromProvider(flightId, serviceIds, passengerCounts, options) {
    try {
      const provider = this.partnershipManager.getProviderForFlight(flightId);
      if (!provider) {
        throw new Error(`No provider found for flight ${flightId}`);
      }

      let pricing;
      if (options.usePartnershipBenefits && provider.getEnhancedAncillaryPricing) {
        pricing = await provider.getEnhancedAncillaryPricing(flightId, serviceIds, passengerCounts, options);
      } else {
        pricing = await provider.getAncillaryPricing(flightId, serviceIds, passengerCounts, options);
      }

      return {
        success: true,
        data: pricing,
        provider: provider.name,
        partnershipId: provider.partnershipId,
        tier: provider.tier
      };

    } catch (error) {
      console.error('Error fetching ancillary pricing from provider:', error);
      throw error;
    }
  }

  /**
   * Process ancillary services with partnership benefits
   * @param {Object} ancillaryServices - Raw ancillary services data
   * @param {string} flightId - Flight ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed ancillary services
   */
  async processAncillaryServicesWithBenefits(ancillaryServices, flightId, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return ancillaryServices;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(ancillaryServices.partnershipId);
      if (!partnership) {
        return ancillaryServices;
      }

      // Process each service with benefits
      const processedServices = ancillaryServices.data.services?.map(service => {
        return this.applyAncillaryBenefits(service, partnership.tier);
      }) || [];

      return {
        ...ancillaryServices,
        data: {
          ...ancillaryServices.data,
          services: processedServices,
          partnershipBenefits: {
            applied: true,
            tier: partnership.tier,
            exclusiveServices: this.hasExclusiveAncillaryServices(partnership.tier),
            enhancedPricing: this.hasEnhancedAncillaryPricing(partnership.tier),
            priorityServices: this.hasPriorityAncillaryServices(partnership.tier)
          }
        }
      };

    } catch (error) {
      console.error('Error processing ancillary services with benefits:', error);
      return ancillaryServices;
    }
  }

  /**
   * Process ancillary pricing with partnership benefits
   * @param {Object} pricing - Raw pricing data
   * @param {string} flightId - Flight ID
   * @param {Object} passengerCounts - Passenger counts
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed pricing
   */
  async processAncillaryPricingWithBenefits(pricing, flightId, passengerCounts, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return pricing;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(pricing.partnershipId);
      if (!partnership) {
        return pricing;
      }

      // Process each service pricing with benefits
      const processedPricing = pricing.data.pricing?.map(servicePricing => {
        return this.applyAncillaryPricingBenefits(servicePricing, partnership.tier);
      }) || [];

      return {
        ...pricing,
        data: {
          ...pricing.data,
          pricing: processedPricing,
          partnershipBenefits: {
            applied: true,
            tier: partnership.tier,
            discountApplied: this.getAncillaryDiscount(partnership.tier),
            commissionEnhanced: this.hasEnhancedAncillaryCommission(partnership.tier)
          }
        }
      };

    } catch (error) {
      console.error('Error processing ancillary pricing with benefits:', error);
      return pricing;
    }
  }

  /**
   * Process ancillary booking with partnership benefits
   * @param {Object} bookingResult - Raw booking result
   * @param {string} flightId - Flight ID
   * @param {Array} bookings - Ancillary bookings
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed booking
   */
  async processAncillaryBookingWithBenefits(bookingResult, flightId, bookings, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return bookingResult;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(bookingResult.partnershipId);
      if (!partnership) {
        return bookingResult;
      }

      // Apply benefits to booking
      const processedBooking = {
        ...bookingResult,
        partnershipBenefits: {
          applied: true,
          tier: partnership.tier,
          priorityProcessing: this.hasPriorityAncillaryProcessing(partnership.tier),
          enhancedSupport: this.hasEnhancedAncillarySupport(partnership.tier),
          exclusiveServices: this.hasExclusiveAncillaryServices(partnership.tier)
        }
      };

      // Apply discount if applicable
      if (this.getAncillaryDiscount(partnership.tier) > 0) {
        const discount = this.getAncillaryDiscount(partnership.tier);
        processedBooking.pricing = {
          ...bookingResult.pricing,
          discount: bookingResult.pricing.total * discount,
          discountedTotal: bookingResult.pricing.total * (1 - discount)
        };
      }

      return processedBooking;

    } catch (error) {
      console.error('Error processing ancillary booking with benefits:', error);
      return bookingResult;
    }
  }

  /**
   * Process categories with partnership benefits
   * @param {Object} categories - Raw categories data
   * @param {string} flightId - Flight ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed categories
   */
  async processCategoriesWithBenefits(categories, flightId, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return categories;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(categories.partnershipId);
      if (!partnership) {
        return categories;
      }

      // Process each category with benefits
      const processedCategories = categories.data.categories?.map(category => {
        return this.applyCategoryBenefits(category, partnership.tier);
      }) || [];

      return {
        ...categories,
        data: {
          ...categories.data,
          categories: processedCategories,
          partnershipBenefits: {
            applied: true,
            tier: partnership.tier,
            exclusiveCategories: this.hasExclusiveAncillaryCategories(partnership.tier)
          }
        }
      };

    } catch (error) {
      console.error('Error processing categories with benefits:', error);
      return categories;
    }
  }

  /**
   * Process service details with partnership benefits
   * @param {Object} serviceDetails - Raw service details
   * @param {string} flightId - Flight ID
   * @param {string} serviceId - Service ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed service details
   */
  async processServiceDetailsWithBenefits(serviceDetails, flightId, serviceId, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return serviceDetails;
      }

      // Get partnership information
      const partnership = await this.getPartnershipInfo(serviceDetails.partnershipId);
      if (!partnership) {
        return serviceDetails;
      }

      // Apply benefits to service details
      const processedDetails = {
        ...serviceDetails,
        partnershipBenefits: {
          applied: true,
          tier: partnership.tier,
          exclusiveAccess: this.hasExclusiveAncillaryAccess(partnership.tier),
          enhancedFeatures: this.getEnhancedAncillaryFeatures(partnership.tier),
          prioritySupport: this.hasPriorityAncillarySupport(partnership.tier)
        }
      };

      return processedDetails;

    } catch (error) {
      console.error('Error processing service details with benefits:', error);
      return serviceDetails;
    }
  }

  /**
   * Apply ancillary benefits to service
   * @param {Object} service - Service data
   * @param {string} tier - Partnership tier
   * @returns {Object} Enhanced service
   */
  applyAncillaryBenefits(service, tier) {
    const enhancedService = { ...service };

    // Add tier-specific benefits
    enhancedService.partnershipBenefits = {
      tier,
      exclusiveAccess: this.hasExclusiveAncillaryAccess(tier),
      priorityProcessing: this.hasPriorityAncillaryProcessing(tier),
      enhancedFeatures: this.getEnhancedAncillaryFeatures(tier),
      discountApplied: this.getAncillaryDiscount(tier)
    };

    // Apply pricing benefits
    if (this.getAncillaryDiscount(tier) > 0) {
      const discount = this.getAncillaryDiscount(tier);
      enhancedService.pricing = {
        ...enhancedService.pricing,
        discount: enhancedService.pricing.basePrice * discount,
        discountedPrice: enhancedService.pricing.basePrice * (1 - discount)
      };
    }

    // Apply availability enhancements
    if (this.hasEnhancedAncillaryAvailability(tier)) {
      enhancedService.availability = {
        ...enhancedService.availability,
        enhanced: true,
        guaranteed: tier === 'diamond',
        priorityAccess: this.hasPriorityAncillaryAccess(tier)
      };
    }

    return enhancedService;
  }

  /**
   * Apply ancillary pricing benefits
   * @param {Object} servicePricing - Service pricing data
   * @param {string} tier - Partnership tier
   * @returns {Object} Enhanced pricing
   */
  applyAncillaryPricingBenefits(servicePricing, tier) {
    const enhancedPricing = { ...servicePricing };

    // Apply tier discount
    const discount = this.getAncillaryDiscount(tier);
    if (discount > 0) {
      enhancedPricing.partnershipDiscount = {
        percentage: discount,
        amount: enhancedPricing.basePrice * discount,
        discountedPrice: enhancedPricing.basePrice * (1 - discount)
      };
      enhancedPricing.total = enhancedPricing.partnershipDiscount.discountedPrice;
    }

    // Add commission enhancement
    if (this.hasEnhancedAncillaryCommission(tier)) {
      enhancedPricing.enhancedCommission = {
        rate: this.getEnhancedAncillaryCommissionRate(tier),
        bonus: this.getAncillaryCommissionBonus(tier)
      };
    }

    return enhancedPricing;
  }

  /**
   * Apply category benefits
   * @param {Object} category - Category data
   * @param {string} tier - Partnership tier
   * @returns {Object} Enhanced category
   */
  applyCategoryBenefits(category, tier) {
    const enhancedCategory = { ...category };

    // Add tier-specific benefits
    enhancedCategory.partnershipBenefits = {
      tier,
      exclusiveAccess: this.hasExclusiveAncillaryCategoryAccess(tier),
      enhancedServices: this.getEnhancedCategoryServices(tier),
      priorityBooking: this.hasPriorityCategoryBooking(tier)
    };

    return enhancedCategory;
  }

  /**
   * Validate ancillary bookings
   * @param {string} flightId - Flight ID
   * @param {Array} bookings - Ancillary bookings
   * @returns {Promise<Object>} Validation result
   */
  async validateAncillaryBookings(flightId, bookings) {
    try {
      const errors = [];

      // Get available services for validation
      const availableServices = await this.getAncillaryServices(flightId, {
        includeAvailability: true,
        usePartnershipBenefits: false
      });

      // Validate each booking
      for (const booking of bookings) {
        const service = availableServices.data.services?.find(s => s.serviceId === booking.serviceId);
        
        if (!service) {
          errors.push(`Service ${booking.serviceId} not found`);
          continue;
        }

        // Check availability
        if (!service.available) {
          errors.push(`Service ${booking.serviceId} is not available`);
        }

        // Check compatibility
        if (booking.passengerType && !this.isServiceCompatible(service, booking.passengerType)) {
          errors.push(`Service ${booking.serviceId} is not compatible with ${booking.passengerType}`);
        }

        // Check restrictions
        if (service.restrictions && service.restrictions.length > 0) {
          for (const restriction of service.restrictions) {
            if (this.violatesServiceRestriction(booking, restriction)) {
              errors.push(`Service ${booking.serviceId} violates restriction: ${restriction.type}`);
            }
          }
        }

        // Check timing
        if (booking.timing && !this.isValidServiceTiming(service, booking.timing)) {
          errors.push(`Invalid timing for service ${booking.serviceId}`);
        }
      }

      // Check for duplicate bookings
      const serviceIds = bookings.map(b => b.serviceId);
      const duplicates = serviceIds.filter((service, index) => serviceIds.indexOf(service) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate service bookings: ${duplicates.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      console.error('Error validating ancillary bookings:', error);
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
    }
  }

  /**
   * Check if service is compatible with passenger type
   * @param {Object} service - Service data
   * @param {string} passengerType - Passenger type
   * @returns {boolean} Compatibility
   */
  isServiceCompatible(service, passengerType) {
    const compatibility = {
      adult: ['baggage', 'seat', 'meal', 'wifi', 'lounge', 'insurance'],
      child: ['baggage', 'seat', 'meal', 'entertainment'],
      infant: ['baggage', 'seat', 'meal', 'basinet'],
      elderly: ['baggage', 'seat', 'meal', 'wheelchair', 'assistance'],
      disabled: ['baggage', 'seat', 'wheelchair', 'assistance', 'medical']
    };

    const allowedCategories = compatibility[passengerType] || compatibility.adult;
    return allowedCategories.includes(service.category);
  }

  /**
   * Check if booking violates service restriction
   * @param {Object} booking - Service booking
   * @param {Object} restriction - Service restriction
   * @returns {boolean} Violation
   */
  violatesServiceRestriction(booking, restriction) {
    switch (restriction.type) {
      case 'age_limit':
        return booking.passengerAge && booking.passengerAge < restriction.minAge;
      case 'weight_limit':
        return booking.weight && booking.weight > restriction.maxWeight;
      case 'advance_booking':
        const daysBefore = (new Date(booking.flightDate) - new Date()) / (1000 * 60 * 60 * 24);
        return daysBefore < restriction.minDays;
      case 'medical_required':
        return booking.passengerType === 'disabled' && !booking.medicalCertificate;
      default:
        return false;
    }
  }

  /**
   * Check if service timing is valid
   * @param {Object} service - Service data
   * @param {string} timing - Booking timing
   * @returns {boolean} Valid timing
   */
  isValidServiceTiming(service, timing) {
    const validTimings = {
      'pre_flight': ['baggage', 'insurance', 'lounge'],
      'during_flight': ['meal', 'seat', 'wifi', 'entertainment'],
      'post_flight': ['transport', 'hotel', 'tour']
    };

    const allowedTimings = validTimings[service.category] || ['during_flight'];
    return allowedTimings.includes(timing);
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
  hasExclusiveAncillaryServices(tier) {
    return ['silver', 'gold', 'platinum', 'diamond'].includes(tier);
  }

  hasEnhancedAncillaryPricing(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  hasPriorityAncillaryServices(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  hasPriorityAncillaryProcessing(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  hasEnhancedAncillarySupport(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  hasExclusiveAncillaryCategories(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  hasExclusiveAncillaryAccess(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  getEnhancedAncillaryFeatures(tier) {
    const features = {
      bronze: [],
      silver: ['priority_baggage', 'preferred_meals'],
      gold: ['priority_baggage', 'preferred_meals', 'lounge_access'],
      platinum: ['priority_baggage', 'preferred_meals', 'lounge_access', 'free_wifi'],
      diamond: ['priority_baggage', 'preferred_meals', 'lounge_access', 'free_wifi', 'concierge']
    };
    return features[tier] || [];
  }

  hasPriorityAncillaryAccess(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  hasPriorityAncillarySupport(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  hasEnhancedAncillaryAvailability(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  hasEnhancedAncillaryCommission(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  getAncillaryDiscount(tier) {
    const discounts = {
      bronze: 0,
      silver: 0.05, // 5%
      gold: 0.10, // 10%
      platinum: 0.15, // 15%
      diamond: 0.20  // 20%
    };
    return discounts[tier] || 0;
  }

  getEnhancedAncillaryCommissionRate(tier) {
    const rates = {
      gold: 0.03,
      platinum: 0.06,
      diamond: 0.10
    };
    return rates[tier] || 0;
  }

  getAncillaryCommissionBonus(tier) {
    const bonuses = {
      gold: 0.02,
      platinum: 0.04,
      diamond: 0.06
    };
    return bonuses[tier] || 0;
  }

  hasExclusiveAncillaryCategoryAccess(tier) {
    return ['platinum', 'diamond'].includes(tier);
  }

  getEnhancedCategoryServices(tier) {
    const services = {
      bronze: [],
      silver: ['priority_services'],
      gold: ['priority_services', 'exclusive_offers'],
      platinum: ['priority_services', 'exclusive_offers', 'premium_services'],
      diamond: ['priority_services', 'exclusive_offers', 'premium_services', 'vip_services']
    };
    return services[tier] || [];
  }

  hasPriorityCategoryBooking(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  /**
   * Generate cache key for services
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
        category: options.category
      }
    };
    
    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  /**
   * Generate cache key for pricing
   * @param {string} flightId - Flight ID
   * @param {Array} serviceIds - Service IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {Object} options - Options
   * @returns {string} Cache key
   */
  generatePricingCacheKey(flightId, serviceIds, passengerCounts, options) {
    const key = {
      flightId,
      serviceIds: serviceIds.sort(),
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
      for (const [key] of this.ancillaryCache) {
        if (key.includes(pattern)) {
          this.ancillaryCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.ancillaryCache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.ancillaryCache.size,
      keys: Array.from(this.ancillaryCache.keys()),
      timeout: this.cacheTimeout
    };
  }
}

// Singleton instance
let ancillaryServiceInstance = null;

/**
 * Get or create ancillary services integration service instance
 * @returns {AncillaryServicesIntegrationService} Service instance
 */
export function getAncillaryServicesIntegrationService() {
  if (!ancillaryServiceInstance) {
    ancillaryServiceInstance = new AncillaryServicesIntegrationService();
  }
  return ancillaryServiceInstance;
}