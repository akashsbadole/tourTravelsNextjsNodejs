import "server-only";
import { BaseFlightProvider } from './base-provider';

/**
 * Amadeus Flight Provider Implementation
 * Integrates with Amadeus Self-Service API for real-time flight data
 */
export class AmadeusProvider extends BaseFlightProvider {
  constructor(config = {}) {
    super({
      name: 'Amadeus',
      rateLimit: 100,
      timeout: 30000,
      ...config
    });
    
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl || 'https://test.api.amadeus.com/v1';
    this.accessToken = null;
    this.tokenExpiry = null;
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
      const response = await fetch(`${this.baseUrl}/security/oauth2/token`, {
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

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 1 minute early
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request to Amadeus
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, params = {}) {
    await this.handleRateLimit();
    
    const token = await this.getAccessToken();
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.handleError(error, { endpoint, params });
    }
  }

  /**
   * Search for flights using Amadeus API
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
      const params = {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: this.formatDate(departureDate),
        adults: passengers.adults || 1,
        children: passengers.children || 0,
        infants: passengers.infants || 0,
        travelClass: this.mapCabinClass(cabinClass),
        max: 50, // Limit results
      };

      if (tripType === 'round_trip' && returnDate) {
        params.returnDate = this.formatDate(returnDate);
      }

      const response = await this.makeRequest('/shopping/flight-offers', params);
      
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      return response.data.map(flight => this.transformFlightData(flight));
    } catch (error) {
      console.error('Amadeus flight search error:', error);
      throw error;
    }
  }

  /**
   * Check real-time availability for specific flights
   * @param {Array} flightIds - Array of flight offer IDs
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Availability data
   */
  async checkAvailability(flightIds, options = {}) {
    try {
      const response = await this.makeRequest('/shopping/availability/flight-availabilities', {
        flightOfferIds: flightIds.join(','),
        ...options
      });

      return {
        success: true,
        data: response.data || [],
        metadata: response.meta || {}
      };
    } catch (error) {
      return this.handleError(error, { flightIds, options });
    }
  }

  /**
   * Get pricing information for flights
   * @param {Array} flightIds - Array of flight offer IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @returns {Promise<Object>} Pricing data
   */
  async getPricing(flightIds, passengerCounts, cabinClass) {
    try {
      const response = await this.makeRequest('/shopping/flight-offers/pricing', {
        flightOfferIds: flightIds.join(','),
        include: 'baggage,price-metrics',
      });

      return {
        success: true,
        data: response.data || [],
        metadata: response.meta || {}
      };
    } catch (error) {
      return this.handleError(error, { flightIds, passengerCounts, cabinClass });
    }
  }

  /**
   * Get fare class availability
   * @param {string} flightId - Flight offer ID
   * @returns {Promise<Object>} Fare class availability
   */
  async getFareClassAvailability(flightId) {
    try {
      const response = await this.makeRequest('/shopping/seatmaps', {
        flightOfferId: flightId,
      });

      return {
        success: true,
        data: response.data || [],
        metadata: response.meta || {}
      };
    } catch (error) {
      return this.handleError(error, { flightId });
    }
  }

  /**
   * Check if Amadeus API is healthy
   * @returns {Promise<boolean>} Health status
   */
  async healthCheck() {
    try {
      await this.getAccessToken();
      const response = await this.makeRequest('/reference-data/urls/checkin-links', {
        airlineCode: 'BA'
      });
      return response.data && Array.isArray(response.data);
    } catch (error) {
      console.error('Amadeus health check failed:', error);
      return false;
    }
  }

  /**
   * Transform Amadeus flight data to standard format
   * @param {Object} amadeusFlight - Raw Amadeus flight data
   * @returns {Object} Standardized flight data
   */
  transformFlightData(amadeusFlight) {
    const offer = amadeusFlight;
    const firstSegment = offer.itineraries[0]?.segments[0] || {};
    const lastSegment = offer.itineraries[0]?.segments[offer.itineraries[0].segments.length - 1] || {};

    return {
      id: offer.id,
      provider: 'amadeus',
      flightCode: `${firstSegment.carrierCode}${firstSegment.flightNumber}`,
      airline: {
        code: firstSegment.carrierCode,
        name: firstSegment.carrierCode, // Would need lookup for full name
      },
      departure: {
        airport: {
          code: firstSegment.departure.iataCode,
          name: firstSegment.departure.iataCode, // Would need lookup
        },
        terminal: firstSegment.departure.terminal,
        gate: firstSegment.departure.gate,
        scheduledTime: firstSegment.departure.at,
      },
      arrival: {
        airport: {
          code: lastSegment.arrival.iataCode,
          name: lastSegment.arrival.iataCode, // Would need lookup
        },
        terminal: lastSegment.arrival.terminal,
        gate: lastSegment.arrival.gate,
        scheduledTime: lastSegment.arrival.at,
      },
      duration: offer.itineraries[0]?.duration || '',
      segments: offer.itineraries[0]?.segments || [],
      pricing: {
        total: offer.price?.total || 0,
        currency: offer.price?.currency || 'USD',
        base: offer.price?.base || 0,
        taxes: offer.price?.taxes || 0,
        fees: offer.price?.fees || 0,
      },
      availability: {
        seats: offer.numberOfBookableSeats || 0,
        fareClasses: this.extractFareClasses(offer),
      },
      lastUpdated: new Date().toISOString(),
      metadata: {
        source: 'amadeus',
        raw: offer,
      }
    };
  }

  /**
   * Extract fare classes from flight offer
   * @param {Object} offer - Flight offer
   * @returns {Array} Available fare classes
   */
  extractFareClasses(offer) {
    const fareClasses = new Set();
    
    offer.itineraries?.forEach(itinerary => {
      itinerary.segments?.forEach(segment => {
        segment.fareBasis?.forEach(fare => {
          if (fare.fareClass) {
            fareClasses.add(fare.fareClass);
          }
        });
      });
    });

    return Array.from(fareClasses);
  }

  /**
   * Map cabin class to Amadeus format
   * @param {string} cabinClass - Standard cabin class
   * @returns {string} Amadeus cabin class
   */
  mapCabinClass(cabinClass) {
    const mapping = {
      'economy': 'ECONOMY',
      'premium_economy': 'PREMIUM_ECONOMY',
      'business': 'BUSINESS',
      'first': 'FIRST'
    };
    return mapping[cabinClass] || 'ECONOMY';
  }

  /**
   * Format date for Amadeus API
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }
}