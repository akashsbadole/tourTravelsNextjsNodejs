import "server-only";
import { AirlineProviderBase } from './airline-provider-base';

/**
 * Direct Airline API Provider
 * Integrates directly with airline APIs for partnership data
 */
export class DirectAirlineProvider extends AirlineProviderBase {
  constructor(config = {}) {
    super({
      name: 'DirectAirline',
      rateLimit: 100,
      timeout: 30000,
      ...config
    });
    
    this.airlineCode = config.airlineCode;
    this.apiEndpoint = config.apiEndpoint;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.authType = config.authType || 'api_key'; // api_key, oauth2, basic_auth
    this.accessToken = null;
    this.tokenExpiry = null;
    this.airlineSpecificConfig = config.airlineSpecificConfig || {};
  }

  /**
   * Get or refresh access token
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      let response;
      
      switch (this.authType) {
        case 'oauth2':
          response = await fetch(`${this.apiEndpoint}/oauth2/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: this.apiKey,
              client_secret: this.apiSecret,
            }),
          });
          break;
          
        case 'basic_auth':
          response = await fetch(`${this.apiEndpoint}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`
            },
            body: JSON.stringify({
              username: this.apiKey,
              password: this.apiSecret
            })
          });
          break;
          
        case 'api_key':
        default:
          // For API key auth, we don't need to get a token
          this.accessToken = this.apiKey;
          return this.accessToken;
      }

      if (response && !response.ok) {
        throw new Error(`${this.airlineCode} authentication failed: ${response.statusText}`);
      }

      if (response) {
        const data = await response.json();
        this.accessToken = data.access_token || data.token;
        this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 1 minute early
      }
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get ${this.airlineCode} access token: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request to airline
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, params = {}, options = {}) {
    await this.handleRateLimit();
    
    const token = await this.getAccessToken();
    const url = new URL(`${this.apiEndpoint}${endpoint}`);
    
    // Add parameters to URL
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    // Build headers based on auth type
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': this.authType === 'api_key' ? this.apiKey : undefined,
      'Authorization': this.authType !== 'api_key' ? `Bearer ${token}` : undefined,
      'X-Partnership-ID': this.partnershipId,
      ...options.headers
    };

    // Remove undefined headers
    Object.keys(headers).forEach(key => {
      if (headers[key] === undefined) {
        delete headers[key];
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`${this.airlineCode} API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.handleError(error, { endpoint, params, options });
    }
  }

  /**
   * Search for flights using airline API
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
      const airlineParams = {
        origin,
        destination,
        departureDate: this.formatDate(departureDate),
        returnDate: returnDate ? this.formatDate(returnDate) : undefined,
        tripType,
        passengers,
        cabinClass: this.mapCabinClass(cabinClass),
        partnershipId: this.partnershipId,
        includeExclusiveFares: this.partnershipBenefits.exclusiveFares,
        includeNetFares: this.partnershipBenefits.netFares
      };

      // Apply airline-specific parameter transformations
      const transformedParams = this.transformSearchParams(airlineParams);
      
      const response = await this.makeRequest('/flights/search', transformedParams);
      
      if (!response.flights || !Array.isArray(response.flights)) {
        return [];
      }

      return response.flights.map(flight => this.transformFlightData(flight));
    } catch (error) {
      console.error(`${this.airlineCode} flight search error:`, error);
      throw error;
    }
  }

  /**
   * Check real-time availability for specific flights
   * @param {Array} flightIds - Array of flight IDs
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Availability data
   */
  async checkAvailability(flightIds, options = {}) {
    try {
      const requestBody = {
        flightIds,
        partnershipId: this.partnershipId,
        ...options
      };

      const response = await this.makeRequest('/flights/availability', {}, {
        method: 'POST',
        body: requestBody
      });

      return {
        success: true,
        data: response.availability || [],
        metadata: response.metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { flightIds, options });
    }
  }

  /**
   * Get pricing information for flights
   * @param {Array} flightIds - Array of flight IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @returns {Promise<Object>} Pricing data
   */
  async getPricing(flightIds, passengerCounts, cabinClass) {
    try {
      const requestBody = {
        flightIds,
        passengerCounts,
        cabinClass,
        partnershipId: this.partnershipId,
        includeAncillaryServices: true
      };

      const response = await this.makeRequest('/flights/pricing', {}, {
        method: 'POST',
        body: requestBody
      });

      return {
        success: true,
        data: response.pricing || [],
        metadata: response.metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { flightIds, passengerCounts, cabinClass });
    }
  }

  /**
   * Get fare class availability
   * @param {string} flightId - Flight ID
   * @returns {Promise<Object>} Fare class availability
   */
  async getFareClassAvailability(flightId) {
    try {
      const response = await this.makeRequest(`/flights/${flightId}/fareclasses`, {
        partnershipId: this.partnershipId
      });
      
      return {
        success: true,
        data: response.fareClasses || [],
        metadata: response.metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { flightId });
    }
  }

  /**
   * Get seat map for flight
   * @param {string} flightId - Flight ID
   * @returns {Promise<Object>} Seat map data
   */
  async getSeatMap(flightId) {
    try {
      const response = await this.makeRequest(`/flights/${flightId}/seatmap`, {
        partnershipId: this.partnershipId
      });
      
      return {
        success: true,
        data: response.seatMap || [],
        metadata: response.metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { flightId });
    }
  }

  /**
   * Get ancillary services for flight
   * @param {string} flightId - Flight ID
   * @returns {Promise<Object>} Ancillary services data
   */
  async getAncillaryServices(flightId) {
    try {
      const response = await this.makeRequest(`/flights/${flightId}/ancillary`, {
        partnershipId: this.partnershipId
      });
      
      return {
        success: true,
        data: response.ancillaryServices || [],
        metadata: response.metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { flightId });
    }
  }

  /**
   * Create booking with airline
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Booking result
   */
  async createBooking(bookingData) {
    try {
      const requestBody = {
        ...bookingData,
        partnershipId: this.partnershipId,
        partnershipTier: this.tier
      };

      const response = await this.makeRequest('/bookings/create', {}, {
        method: 'POST',
        body: requestBody
      });

      return {
        success: true,
        data: response.booking || {},
        metadata: response.metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { bookingData });
    }
  }

  /**
   * Check if airline API is healthy
   * @returns {Promise<boolean>} Health status
   */
  async healthCheck() {
    try {
      await this.getAccessToken();
      const response = await this.makeRequest('/health/status');
      return response && response.status === 'healthy';
    } catch (error) {
      console.error(`${this.airlineCode} health check failed:`, error);
      return false;
    }
  }

  /**
   * Transform airline-specific search parameters
   * @param {Object} params - Standard search parameters
   * @returns {Object} Airline-specific parameters
   */
  transformSearchParams(params) {
    const transformed = { ...params };

    // Apply airline-specific transformations based on configuration
    if (this.airlineSpecificConfig.parameterMapping) {
      Object.keys(this.airlineSpecificConfig.parameterMapping).forEach(key => {
        if (params[key] !== undefined) {
          const airlineKey = this.airlineSpecificConfig.parameterMapping[key];
          transformed[airlineKey] = params[key];
          delete transformed[key];
        }
      });
    }

    return transformed;
  }

  /**
   * Transform airline flight data to standard format
   * @param {Object} airlineFlight - Raw airline flight data
   * @returns {Object} Standardized flight data
   */
  transformFlightData(airlineFlight) {
    const flight = airlineFlight;
    
    return {
      id: flight.flightId || flight.id,
      provider: this.airlineCode.toLowerCase(),
      flightCode: `${this.airlineCode}${flight.flightNumber}`,
      airline: {
        code: this.airlineCode,
        name: flight.airlineName || this.airlineCode,
      },
      departure: {
        airport: {
          code: flight.origin?.airportCode || flight.origin,
          name: flight.origin?.airportName,
        },
        terminal: flight.origin?.terminal,
        gate: flight.origin?.gate,
        scheduledTime: flight.departureTime || flight.origin?.scheduledTime,
      },
      arrival: {
        airport: {
          code: flight.destination?.airportCode || flight.destination,
          name: flight.destination?.airportName,
        },
        terminal: flight.destination?.terminal,
        gate: flight.destination?.gate,
        scheduledTime: flight.arrivalTime || flight.destination?.scheduledTime,
      },
      duration: flight.duration,
      aircraft: {
        type: flight.aircraft?.type,
        registration: flight.aircraft?.registration
      },
      pricing: {
        total: flight.totalFare || flight.price?.total,
        currency: flight.currency || 'USD',
        base: flight.baseFare || flight.price?.base,
        taxes: flight.taxes || flight.price?.taxes,
        fees: flight.fees || flight.price?.fees,
      },
      availability: {
        seats: flight.availableSeats || flight.seatsAvailable,
        fareClasses: this.extractFareClasses(flight),
      },
      partnership: {
        id: this.partnershipId,
        tier: this.tier,
        benefits: this.partnershipBenefits,
        exclusiveFare: flight.isExclusiveFare || false,
        netFare: flight.isNetFare || false
      },
      lastUpdated: new Date().toISOString(),
      metadata: {
        source: this.airlineCode.toLowerCase(),
        raw: flight
      }
    };
  }

  /**
   * Extract fare classes from airline flight data
   * @param {Object} flight - Airline flight data
   * @returns {Array} Available fare classes
   */
  extractFareClasses(flight) {
    const fareClasses = new Set();
    
    if (flight.fareClasses && Array.isArray(flight.fareClasses)) {
      flight.fareClasses.forEach(fareClass => {
        if (fareClass.code || fareClass.class) {
          fareClasses.add(fareClass.code || fareClass.class);
        }
      });
    }

    if (flight.cabinClass) {
      fareClasses.add(flight.cabinClass);
    }

    return Array.from(fareClasses);
  }

  /**
   * Map cabin class to airline format
   * @param {string} cabinClass - Standard cabin class
   * @returns {string} Airline cabin class
   */
  mapCabinClass(cabinClass) {
    // Check for airline-specific mapping first
    if (this.airlineSpecificConfig.cabinClassMapping) {
      const airlineMapping = this.airlineSpecificConfig.cabinClassMapping[cabinClass];
      if (airlineMapping) {
        return airlineMapping;
      }
    }

    // Default mapping
    const mapping = {
      'economy': 'Economy',
      'premium_economy': 'PremiumEconomy',
      'business': 'Business',
      'first': 'First'
    };
    return mapping[cabinClass] || 'Economy';
  }

  /**
   * Format date for airline API
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    // Check for airline-specific date format
    if (this.airlineSpecificConfig.dateFormat) {
      switch (this.airlineSpecificConfig.dateFormat) {
        case 'YYYY-MM-DD':
          return date.toISOString().split('T')[0];
        case 'DD-MM-YYYY':
          return date.toLocaleDateString('en-GB').replace(/\//g, '-');
        case 'MM-DD-YYYY':
          return date.toLocaleDateString('en-US').replace(/\//g, '-');
        default:
          return date.toISOString().split('T')[0];
      }
    }

    return date.toISOString().split('T')[0];
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
        partnershipId: this.partnershipId,
        tier: this.tier
      };

      const response = await this.makeRequest('/fares/exclusive', exclusiveParams);
      return response.fares || [];
    } catch (error) {
      console.error(`Error getting ${this.airlineCode} exclusive fares:`, error);
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
        partnershipId: this.partnershipId,
        tier: this.tier
      };

      const response = await this.makeRequest('/fares/net', netParams);
      return response.fares || [];
    } catch (error) {
      console.error(`Error getting ${this.airlineCode} net fares:`, error);
      return [];
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
      return response.promotions || [];
    } catch (error) {
      console.error(`Error getting ${this.airlineCode} partnership promotions:`, error);
      return [];
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
      return response.loyaltyProgram || null;
    } catch (error) {
      console.error(`Error getting ${this.airlineCode} loyalty integration:`, error);
      return null;
    }
  }
}