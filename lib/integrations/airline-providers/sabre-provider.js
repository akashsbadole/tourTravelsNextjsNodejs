import "server-only";
import { AirlineProviderBase } from './airline-provider-base';

/**
 * Sabre GDS Provider Implementation
 * Integrates with Sabre GDS for airline partnership data
 */
export class SabreProvider extends AirlineProviderBase {
  constructor(config = {}) {
    super({
      name: 'Sabre',
      rateLimit: 100,
      timeout: 30000,
      ...config
    });
    
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl || 'https://api.havail.sabre.com';
    this.accessToken = null;
    this.tokenExpiry = null;
    this.pcc = config.pcc; // Pseudo City Code
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
      const response = await fetch(`${this.baseUrl}/v2/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials'
        }),
      });

      if (!response.ok) {
        throw new Error(`Sabre authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 1 minute early
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get Sabre access token: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request to Sabre
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, params = {}, options = {}) {
    await this.handleRateLimit();
    
    const token = await this.getAccessToken();
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add parameters to URL
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    // Add PCC if available
    if (this.pcc) {
      url.searchParams.append('pcc', this.pcc);
    }

    try {
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Sabre API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.handleError(error, { endpoint, params, options });
    }
  }

  /**
   * Search for flights using Sabre API
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
      const sabreParams = {
        origin: origin,
        destination: destination,
        departuredate: this.formatDate(departureDate),
        returndate: returnDate ? this.formatDate(returnDate) : undefined,
        limit: 50,
        passengercount: passengers.adults + passengers.children + passengers.infants,
        cabinclass: this.mapCabinClass(cabinClass)
      };

      const response = await this.makeRequest('/v1/shop/flights', sabreParams);
      
      if (!response.FlightInfo || !Array.isArray(response.FlightInfo)) {
        return [];
      }

      return response.FlightInfo.map(flight => this.transformFlightData(flight));
    } catch (error) {
      console.error('Sabre flight search error:', error);
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
        FlightInfo: flightIds.map(id => ({ FlightId: id })),
        ...options
      };

      const response = await this.makeRequest('/v1/availability/flight', {}, {
        method: 'POST',
        body: requestBody
      });

      return {
        success: true,
        data: response.FlightInfo || [],
        metadata: response.Metadata || {}
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
        FlightInfo: flightIds.map(id => ({ FlightId: id })),
        PassengerCounts: passengerCounts,
        CabinClass: cabinClass,
        IncludeAncillaryServices: true
      };

      const response = await this.makeRequest('/v1/pricing/flight', {}, {
        method: 'POST',
        body: requestBody
      });

      return {
        success: true,
        data: response.PricingInfo || [],
        metadata: response.Metadata || {}
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
      const response = await this.makeRequest(`/v1/fareclasses/${flightId}`);
      
      return {
        success: true,
        data: response.FareClasses || [],
        metadata: response.Metadata || {}
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
      const response = await this.makeRequest(`/v1/seatmap/${flightId}`);
      
      return {
        success: true,
        data: response.SeatMap || [],
        metadata: response.Metadata || {}
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
      const response = await this.makeRequest(`/v1/ancillary/${flightId}`);
      
      return {
        success: true,
        data: response.AncillaryServices || [],
        metadata: response.Metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { flightId });
    }
  }

  /**
   * Create booking with Sabre
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Booking result
   */
  async createBooking(bookingData) {
    try {
      const requestBody = {
        ...bookingData,
        PartnershipId: this.partnershipId,
        PCC: this.pcc
      };

      const response = await this.makeRequest('/v1/booking/create', {}, {
        method: 'POST',
        body: requestBody
      });

      return {
        success: true,
        data: response.Booking || {},
        metadata: response.Metadata || {}
      };
    } catch (error) {
      return this.handleError(error, { bookingData });
    }
  }

  /**
   * Check if Sabre API is healthy
   * @returns {Promise<boolean>} Health status
   */
  async healthCheck() {
    try {
      await this.getAccessToken();
      const response = await this.makeRequest('/v1/status/system');
      return response && response.Status === 'OK';
    } catch (error) {
      console.error('Sabre health check failed:', error);
      return false;
    }
  }

  /**
   * Transform Sabre flight data to standard format
   * @param {Object} sabreFlight - Raw Sabre flight data
   * @returns {Object} Standardized flight data
   */
  transformFlightData(sabreFlight) {
    const flight = sabreFlight;
    
    return {
      id: flight.FlightId || flight.UniqueID,
      provider: 'sabre',
      flightCode: `${flight.MarketingAirline}${flight.FlightNumber}`,
      airline: {
        code: flight.MarketingAirline,
        name: flight.AirlineName || flight.MarketingAirline,
      },
      departure: {
        airport: {
          code: flight.OriginLocation,
          name: flight.OriginAirportName,
        },
        terminal: flight.OriginTerminal,
        gate: flight.OriginGate,
        scheduledTime: flight.DepartureDateTime,
      },
      arrival: {
        airport: {
          code: flight.DestinationLocation,
          name: flight.DestinationAirportName,
        },
        terminal: flight.DestinationTerminal,
        gate: flight.DestinationGate,
        scheduledTime: flight.ArrivalDateTime,
      },
      duration: flight.FlightTime || flight.ElapsedTime,
      aircraft: {
        type: flight.Equipment,
        registration: flight.TailNumber
      },
      pricing: {
        total: flight.TotalPrice || flight.BaseFare,
        currency: flight.CurrencyCode || 'USD',
        base: flight.BaseFare || 0,
        taxes: flight.Taxes || 0,
        fees: flight.Fees || 0,
      },
      availability: {
        seats: flight.AvailableSeats || 0,
        fareClasses: this.extractFareClasses(flight),
      },
      partnership: {
        id: this.partnershipId,
        tier: this.tier,
        benefits: this.partnershipBenefits
      },
      lastUpdated: new Date().toISOString(),
      metadata: {
        source: 'sabre',
        raw: flight,
        pcc: this.pcc
      }
    };
  }

  /**
   * Extract fare classes from Sabre flight data
   * @param {Object} flight - Sabre flight data
   * @returns {Array} Available fare classes
   */
  extractFareClasses(flight) {
    const fareClasses = new Set();
    
    if (flight.FareClasses && Array.isArray(flight.FareClasses)) {
      flight.FareClasses.forEach(fareClass => {
        if (fareClass.Code) {
          fareClasses.add(fareClass.Code);
        }
      });
    }

    return Array.from(fareClasses);
  }

  /**
   * Map cabin class to Sabre format
   * @param {string} cabinClass - Standard cabin class
   * @returns {string} Sabre cabin class
   */
  mapCabinClass(cabinClass) {
    const mapping = {
      'economy': 'Y',
      'premium_economy': 'W',
      'business': 'C',
      'first': 'F'
    };
    return mapping[cabinClass] || 'Y';
  }

  /**
   * Format date for Sabre API
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  formatDate(date) {
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
        faretype: 'exclusive',
        partnershipid: this.partnershipId,
        tier: this.tier
      };

      const response = await this.makeRequest('/v1/fares/exclusive', exclusiveParams);
      return response.FareInfo || [];
    } catch (error) {
      console.error('Error getting Sabre exclusive fares:', error);
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
        faretype: 'net',
        partnershipid: this.partnershipId,
        tier: this.tier
      };

      const response = await this.makeRequest('/v1/fares/net', netParams);
      return response.FareInfo || [];
    } catch (error) {
      console.error('Error getting Sabre net fares:', error);
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
        partnershipid: this.partnershipId,
        tier: this.tier
      };

      const response = await this.makeRequest('/v1/promotions/partnership', promotionParams);
      return response.Promotions || [];
    } catch (error) {
      console.error('Error getting Sabre partnership promotions:', error);
      return [];
    }
  }
}