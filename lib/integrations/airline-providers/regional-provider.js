import { AirlineProviderBase } from './airline-provider-base.js';

/**
 * Regional Airline Provider
 * Specialized provider for regional airlines with unique business models and route structures
 */
export class RegionalAirlineProvider extends AirlineProviderBase {
  constructor(config) {
    super(config);
    
    this.providerType = 'regional';
    this.supportedFeatures = [
      'flight_search',
      'availability',
      'pricing',
      'booking',
      'seat_selection',
      'ancillary_services',
      'regional_routes',
      'connecting_flights',
      'small_aircraft',
      'flexible_scheduling'
    ];
    
    // Regional airline specific configurations
    this.regionalConfig = {
      smallAircraftSupport: config.smallAircraftSupport || true,
      connectingFlights: config.connectingFlights || true,
      regionalHub: config.regionalHub || null,
      serviceArea: config.serviceArea || [],
      seasonalRoutes: config.seasonalRoutes || {},
      communityRoutes: config.communityRoutes || [],
      governmentContracts: config.governmentContracts || []
    };
  }

  /**
   * Search for flights with regional airline specific logic
   * @param {Object} searchParams - Flight search parameters
   * @returns {Promise<Object>} Flight search results
   */
  async searchFlights(searchParams) {
    try {
      // Apply regional airline specific search logic
      const regionalSearchParams = this.transformRegionalSearchParams(searchParams);
      
      // Call API with transformed parameters
      const response = await this.makeAPIRequest('/flights/search', {
        method: 'POST',
        body: JSON.stringify(regionalSearchParams)
      });

      // Process results with regional airline specific logic
      const flights = this.processRegionalFlightResults(response.data, searchParams);
      
      return {
        success: true,
        data: {
          flights,
          searchId: response.searchId,
          searchParams,
          regionalInfo: {
            hubAirports: this.regionalConfig.regionalHub ? [this.regionalConfig.regionalHub] : [],
            connectingFlightOptions: this.regionalConfig.connectingFlights,
            seasonalRoutes: this.getSeasonalRoutesForDates(searchParams.departureDate),
            communityRoutes: this.getCommunityRoutesForSearch(searchParams)
          },
          metadata: {
            provider: this.airlineCode,
            providerType: this.providerType,
            timestamp: new Date().toISOString(),
            totalResults: flights.length
          }
        }
      };
    } catch (error) {
      console.error(`Regional airline flight search error for ${this.airlineCode}:`, error);
      return {
        success: false,
        error: error.message,
        provider: this.airlineCode
      };
    }
  }

  /**
   * Get flight availability with regional airline specific logic
   * @param {string} flightId - Flight ID
   * @param {Object} options - Availability options
   * @returns {Promise<Object>} Flight availability
   */
  async getFlightAvailability(flightId, options = {}) {
    try {
      // Add regional airline specific parameters
      const regionalOptions = {
        ...options,
        includeConnectingFlights: this.regionalConfig.connectingFlights,
        includeCommunityRoutes: this.regionalConfig.communityRoutes.length > 0,
        smallAircraftPreference: options.smallAircraftPreference || false
      };

      const response = await this.makeAPIRequest(`/flights/${flightId}/availability`, {
        method: 'GET',
        query: regionalOptions
      });

      // Process availability with regional airline logic
      const availability = this.processRegionalAvailability(response.data);

      return {
        success: true,
        data: availability
      };
    } catch (error) {
      console.error(`Regional airline availability error for ${this.airlineCode}:`, error);
      return {
        success: false,
        error: error.message,
        provider: this.airlineCode
      };
    }
  }

  /**
   * Get pricing with regional airline specific logic
   * @param {string} flightId - Flight ID
   * @param {Object} pricingOptions - Pricing options
   * @returns {Promise<Object>} Flight pricing
   */
  async getFlightPricing(flightId, pricingOptions = {}) {
    try {
      // Add regional airline specific pricing parameters
      const regionalPricingOptions = {
        ...pricingOptions,
        includeRegionalDiscounts: true,
        includeCommunityFares: this.regionalConfig.communityRoutes.length > 0,
        governmentContract: pricingOptions.governmentContract || null,
        seasonalPricing: this.isSeasonalRoute(pricingOptions.route)
      };

      const response = await this.makeAPIRequest(`/flights/${flightId}/pricing`, {
        method: 'POST',
        body: JSON.stringify(regionalPricingOptions)
      });

      // Process pricing with regional airline logic
      const pricing = this.processRegionalPricing(response.data);

      return {
        success: true,
        data: pricing
      };
    } catch (error) {
      console.error(`Regional airline pricing error for ${this.airlineCode}:`, error);
      return {
        success: false,
        error: error.message,
        provider: this.airlineCode
      };
    }
  }

  /**
   * Create booking with regional airline specific logic
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Booking result
   */
  async createBooking(bookingData) {
    try {
      // Add regional airline specific booking parameters
      const regionalBookingData = {
        ...bookingData,
        regionalOptions: {
          connectingFlightPreference: bookingData.connectingFlightPreference || 'auto',
          smallAircraftPreference: bookingData.smallAircraftPreference || false,
          communityRouteService: bookingData.communityRouteService || false,
          governmentContractId: bookingData.governmentContractId || null
        }
      };

      const response = await this.makeAPIRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify(regionalBookingData)
      });

      // Process booking with regional airline logic
      const booking = this.processRegionalBooking(response.data);

      return {
        success: true,
        data: booking
      };
    } catch (error) {
      console.error(`Regional airline booking error for ${this.airlineCode}:`, error);
      return {
        success: false,
        error: error.message,
        provider: this.airlineCode
      };
    }
  }

  /**
   * Transform search parameters for regional airline API
   * @param {Object} searchParams - Original search parameters
   * @returns {Object} Transformed search parameters
   */
  transformRegionalSearchParams(searchParams) {
    const transformed = { ...searchParams };

    // Add regional airline specific parameters
    if (this.regionalConfig.regionalHub) {
      transformed.preferredHub = this.regionalConfig.regionalHub;
    }

    // Add service area filter
    if (this.regionalConfig.serviceArea.length > 0) {
      transformed.serviceArea = this.regionalConfig.serviceArea;
    }

    // Add connecting flight preferences
    if (this.regionalConfig.connectingFlights) {
      transformed.allowConnectingFlights = true;
      transformed.maxConnections = 2; // Regional airlines typically have fewer connections
    }

    // Add small aircraft preference
    if (this.regionalConfig.smallAircraftSupport) {
      transformed.aircraftTypes = ['small', 'regional', 'turboprop'];
    }

    // Add seasonal route consideration
    if (searchParams.departureDate) {
      const seasonalRoutes = this.getSeasonalRoutesForDates(searchParams.departureDate);
      if (seasonalRoutes.length > 0) {
        transformed.includeSeasonalRoutes = seasonalRoutes;
      }
    }

    return transformed;
  }

  /**
   * Process flight results with regional airline specific logic
   * @param {Array} flights - Raw flight data
   * @param {Object} searchParams - Original search parameters
   * @returns {Array} Processed flight results
   */
  processRegionalFlightResults(flights, searchParams) {
    return flights.map(flight => {
      const processedFlight = {
        ...flight,
        providerType: this.providerType,
        regionalFeatures: {
          isRegionalRoute: this.isRegionalRoute(flight.route),
          isCommunityRoute: this.isCommunityRoute(flight.route),
          isSeasonalRoute: this.isSeasonalRoute(flight.route),
          requiresConnection: this.requiresConnection(flight),
          aircraftType: flight.aircraft?.type || 'regional',
          hubConnection: flight.hubConnection || null
        }
      };

      // Add regional discounts if applicable
      if (processedFlight.regionalFeatures.isCommunityRoute) {
        processedFlight.pricing = {
          ...processedFlight.pricing,
          communityDiscount: this.getCommunityDiscount(),
          governmentSubsidy: this.getGovernmentSubsidy(flight.route)
        };
      }

      // Add connection information
      if (processedFlight.regionalFeatures.requiresConnection) {
        processedFlight.connection = {
          hubAirport: this.regionalConfig.regionalHub,
          connectionTime: flight.connectionTime || 30, // minutes
          nextFlight: flight.nextFlight || null
        };
      }

      return processedFlight;
    });
  }

  /**
   * Process availability with regional airline specific logic
   * @param {Object} availability - Raw availability data
   * @returns {Object} Processed availability
   */
  processRegionalAvailability(availability) {
    return {
      ...availability,
      regionalFeatures: {
        smallAircraftAvailable: availability.aircraft?.type === 'small',
        connectingFlightOptions: availability.connectingFlights || [],
        communityServiceAvailability: availability.communityService || false,
        seasonalAvailability: this.getSeasonalAvailability(availability),
        governmentContractAvailability: availability.governmentContracts || []
      },
      fareClasses: this.processRegionalFareClasses(availability.fareClasses || [])
    };
  }

  /**
   * Process pricing with regional airline specific logic
   * @param {Object} pricing - Raw pricing data
   * @returns {Object} Processed pricing
   */
  processRegionalPricing(pricing) {
    const processedPricing = { ...pricing };

    // Add regional discounts
    processedPricing.regionalDiscounts = {
      communityDiscount: pricing.communityDiscount || 0,
      seasonalDiscount: pricing.seasonalDiscount || 0,
      governmentSubsidy: pricing.governmentSubsidy || 0,
      regionalPromotion: pricing.regionalPromotion || 0
    };

    // Calculate final price with discounts
    const totalDiscount = Object.values(processedPricing.regionalDiscounts).reduce((sum, discount) => sum + discount, 0);
    processedPricing.finalPrice = Math.max(0, processedPricing.basePrice - totalDiscount);

    // Add regional fare information
    processedPricing.regionalFares = {
      standardFare: processedPricing.basePrice,
      communityFare: processedPricing.finalPrice,
      governmentFare: pricing.governmentFare || processedPricing.finalPrice,
      seasonalFare: pricing.seasonalFare || processedPricing.basePrice
    };

    return processedPricing;
  }

  /**
   * Process booking with regional airline specific logic
   * @param {Object} booking - Raw booking data
   * @returns {Object} Processed booking
   */
  processRegionalBooking(booking) {
    return {
      ...booking,
      regionalFeatures: {
        communityServiceBooking: booking.communityService || false,
        governmentContractBooking: booking.governmentContract || false,
        seasonalRouteBooking: booking.seasonalRoute || false,
        connectingFlightBooking: booking.connectingFlight || false,
        smallAircraftBooking: booking.aircraft?.type === 'small'
      },
      specialServices: {
        communityTransport: booking.communityTransport || false,
        remoteAreaService: booking.remoteAreaService || false,
        governmentAssistance: booking.governmentAssistance || false
      }
    };
  }

  /**
   * Check if route is a regional route
   * @param {Object} route - Route information
   * @returns {boolean} Is regional route
   */
  isRegionalRoute(route) {
    if (!route || !route.origin || !route.destination) return false;
    
    // Check if route is within service area
    const inServiceArea = this.regionalConfig.serviceArea.some(area => 
      area.includes(route.origin) || area.includes(route.destination)
    );
    
    return inServiceArea;
  }

  /**
   * Check if route is a community route
   * @param {Object} route - Route information
   * @returns {boolean} Is community route
   */
  isCommunityRoute(route) {
    if (!route || !route.origin || !route.destination) return false;
    
    const routeKey = `${route.origin}-${route.destination}`;
    return this.regionalConfig.communityRoutes.some(communityRoute => 
      communityRoute.route === routeKey
    );
  }

  /**
   * Check if route is a seasonal route
   * @param {Object} route - Route information
   * @returns {boolean} Is seasonal route
   */
  isSeasonalRoute(route) {
    if (!route || !route.origin || !route.destination) return false;
    
    const routeKey = `${route.origin}-${route.destination}`;
    return Object.keys(this.regionalConfig.seasonalRoutes).includes(routeKey);
  }

  /**
   * Check if flight requires connection
   * @param {Object} flight - Flight information
   * @returns {boolean} Requires connection
   */
  requiresConnection(flight) {
    // Regional airlines often use hub-and-spoke model
    return flight.stops && flight.stops.length > 0;
  }

  /**
   * Get seasonal routes for specific dates
   * @param {string} departureDate - Departure date
   * @returns {Array} Seasonal routes
   */
  getSeasonalRoutesForDates(departureDate) {
    const date = new Date(departureDate);
    const month = date.getMonth() + 1; // 1-12
    const season = this.getSeason(month);
    
    return Object.entries(this.regionalConfig.seasonalRoutes)
      .filter(([route, seasons]) => seasons.includes(season))
      .map(([route]) => route);
  }

  /**
   * Get community routes for search
   * @param {Object} searchParams - Search parameters
   * @returns {Array} Community routes
   */
  getCommunityRoutesForSearch(searchParams) {
    if (!searchParams.origin || !searchParams.destination) return [];
    
    return this.regionalConfig.communityRoutes.filter(route => 
      route.origin === searchParams.origin || route.destination === searchParams.destination
    );
  }

  /**
   * Get season from month
   * @param {number} month - Month number (1-12)
   * @returns {string} Season
   */
  getSeason(month) {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  /**
   * Get community discount
   * @returns {number} Discount percentage
   */
  getCommunityDiscount() {
    // Community routes typically have government subsidies
    return 0.15; // 15% discount
  }

  /**
   * Get government subsidy for route
   * @param {Object} route - Route information
   * @returns {number} Subsidy amount
   */
  getGovernmentSubsidy(route) {
    if (!this.isCommunityRoute(route)) return 0;
    
    const communityRoute = this.regionalConfig.communityRoutes.find(r => 
      r.route === `${route.origin}-${route.destination}`
    );
    
    return communityRoute?.subsidy || 0;
  }

  /**
   * Get seasonal availability
   * @param {Object} availability - Availability data
   * @returns {Object} Seasonal availability
   */
  getSeasonalAvailability(availability) {
    const date = new Date(availability.departureDate);
    const season = this.getSeason(date.getMonth() + 1);
    
    return {
      season,
      isPeakSeason: ['summer', 'winter'].includes(season),
      availabilityFactor: this.getSeasonalAvailabilityFactor(season)
    };
  }

  /**
   * Get seasonal availability factor
   * @param {string} season - Season
   * @returns {number} Availability factor
   */
  getSeasonalAvailabilityFactor(season) {
    const factors = {
      spring: 0.8,
      summer: 1.2,
      fall: 0.9,
      winter: 1.1
    };
    
    return factors[season] || 1.0;
  }

  /**
   * Process regional fare classes
   * @param {Array} fareClasses - Raw fare classes
   * @returns {Array} Processed fare classes
   */
  processRegionalFareClasses(fareClasses) {
    return fareClasses.map(fareClass => ({
      ...fareClass,
      regionalFeatures: {
        communityEligible: fareClass.communityEligible || false,
        seasonalPricing: fareClass.seasonalPricing || false,
        governmentContract: fareClass.governmentContract || false,
        smallAircraftOnly: fareClass.aircraftType === 'small'
      }
    }));
  }
}