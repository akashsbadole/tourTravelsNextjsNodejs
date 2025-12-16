
import "server-only";
import { AirlineProviderBase } from './airline-provider-base';

/**
 * Travelport GDS Provider Implementation
 * Integrates with Travelport GDS for airline partnership data
 */
export class TravelportProvider extends AirlineProviderBase {
  constructor(config = {}) {
    super({
      name: 'Travelport',
      rateLimit: 100,
      timeout: 30000,
      ...config
    });
    
    this.username = config.username;
    this.password = config.password;
    this.gdsCode = config.gdsCode; // 1G, 1V, 1P for Apollo, Galileo, Worldspan
    this.branchCode = config.branchCode;
    this.baseUrl = config.baseUrl || 'https://api.travelport.com';
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
      const response = await fetch(`${this.baseUrl}/oauth2/v1/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'urn:api:read'
        }),
      });

      if (!response.ok) {
        throw new Error(`Travelport authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 1 minute early
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get Travelport access token: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request to Travelport
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

    try {
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-GDS-Code': this.gdsCode,
          'X-Branch-Code': this.branchCode,
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Travelport API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw this.handleError(error, { endpoint, params, options });
    }
  }

  /**
   * Search for flights using Travelport API
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
      const requestBody = {
        SearchAirLeg: [
          {
            SearchOrigin: {
              AirportCode: origin
            },
            SearchDestination: {
              AirportCode: destination
            },
            SearchDepTime: {
              Date: this.formatDate(departureDate)
            }
          },
          ...(returnDate ? [{
            SearchOrigin: {
              AirportCode: destination
            },
            SearchDestination: {
              AirportCode: origin
            },
            SearchDepTime: {
              Date: this.formatDate(returnDate)
            }
          }] : [])
        ],
        AirSearchModifiers: {
          PreferredCarriers: [],
          ProhibitedCarriers: [],
          MaxSolutions: 50
        },
        SearchPassenger: [
          ...(Array(passengers.adults).fill().map((_, i) => ({
            Code: 'ADT',
            Key: `ADT${i + 1}`
          }))),
          ...(Array(passengers.children).fill().map((_, i) => ({
            Code: 'CNN',
            Key: `CNN${i + 1}`
          }))),
          ...(Array(passengers.infants).fill().map((_, i) => ({
            Code: 'INF',
            Key: `INF${i + 1}`
          })))
        ],
        AirSearchPricingInfo: {
          CurrencyCode: 'USD',
          FareType: this.mapFareType(cabinClass)
        }
      };

      const response = await this.makeRequest('/air/api/v1/shop/flights', {}, {
        method: 'POST',
        body: requestBody
      });
      
      if (!response.AirPricePointList || !Array.isArray(response.AirPricePointList.AirPricePoint)) {
        return [];
      }

      return response.AirPricePointList.AirPricePoint.map(flight => this.transformFlightData(flight));
    } catch (error) {
      console.error('Travelport flight search error:', error);
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
        AirPricePoint: flightIds.map(id => ({ Key: id })),
        ...options
      };

      const response = await this.makeRequest('/air/api/v1/availability/flight', {}, {
        method: 'POST',
        body: requestBody
      });

      return {
        success: true,
        data: response.AirPricePointList || [],
        metadata: response.ResponseMessage || {}
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
        AirPricePoint: flightIds.map(id => ({ Key: id })),
        PassengerCounts: passengerCounts,
        FareType: this.mapFareType(cabinClass),
        IncludeAncillaryServices: true
      };

      const response = await this.makeRequest('/air/api/v1/pricing/flight', {}, {
        method: 'POST',
        body: requestBody
      });

      return {
        success: true,
        data: response.AirPricePointList || [],
        metadata: response.ResponseMessage || {}
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
      const response = await this.makeRequest(`/air/api/v1/fareclasses/${flightId}`);
      
      return {
        success: true,
        data: response.FareClassList || [],
        metadata: response.ResponseMessage || {}
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
      const response = await this.makeRequest(`/air/api/v1/seatmap/${flightId}`);
      
      return {
        success: true,
        data: response.SeatMapList || [],
        metadata: response.ResponseMessage || {}
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
      const response = await this.makeRequest(`/air/api/v1/ancillary/${flightId}`);
      
      return {
        success: true,
        data: response.AncillaryServiceList || [],
        metadata: response.ResponseMessage || {}
      };
    } catch (error) {
      return this.handleError(error, { flightId });
    }
  }

  /**
   * Create booking with Travelport
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Booking result
   */
  async createBooking(bookingData) {
    try {
      const requestBody = {
        ...bookingData,
        PartnershipId: this.partnershipId,
        GDSCode: this.gdsCode,
        BranchCode: this.branchCode
      };

      const response = await this.makeRequest('/air/api/v1/booking/create', {}, {
        method: 'POST',
        body: requestBody
      });

      return {
        success: true,
        data: response.AirReservation || {},
        metadata: response.ResponseMessage || {}
      };
    } catch (error) {
      return this.handleError(error, { bookingData });
    }
  }

  /**
   * Check if Travelport API is healthy
   * @returns {Promise<boolean>} Health status
   */
  async healthCheck() {
    try {
      await this.getAccessToken();
      const response = await this.makeRequest('/util/api/v1/ping');
      return response && response.Status === 'OK';
    } catch (error) {
      console.error('Travelport health check failed:', error);
      return false;
    }
  }

  /**
   * Transform Travelport flight data to standard format
   * @param {Object} travelportFlight - Raw Travelport flight data
   * @returns {Object} Standardized flight data
   */
  transformFlightData(travelportFlight) {
    const flight = travelportFlight;
    const firstSegment = flight.AirItinerary?.AirItineraryJourney?.[0]?.AirSegment?.[0] || {};
    const lastSegment = flight.AirItinerary?.AirItineraryJourney?.[0]?.AirSegment?.slice(-1)[0] || {};

    return {
      id: flight.Key || flight.UniqueID,
      provider: 'travelport',
      flightCode: `${firstSegment.Carrier}${firstSegment.FlightNumber}`,
      airline: {
        code: firstSegment.Carrier,
        name: firstSegment.Carrier, // Would need lookup for full name
      },
      departure: {
        airport: {
          code: firstSegment.Origin,
          name: firstSegment.Origin, // Would need lookup
        },
        terminal: firstSegment.OriginTerminal,
        gate: firstSegment.DepartureGate,
        scheduledTime: firstSegment.DepartureTime,
      },
      arrival: {
        airport: {
          code: lastSegment.Destination,
          name: lastSegment.Destination, // Would need lookup
        },
        terminal: lastSegment.DestinationTerminal,
        gate: lastSegment.ArrivalGate,
        scheduledTime: lastSegment.ArrivalTime,
      },
      duration: flight.TotalTravelTime || flight.ElapsedTime,
      segments: flight.AirItinerary?.AirItineraryJourney?.[0]?.AirSegment || [],
      aircraft: {
        type: firstSegment.Equipment,
        registration: firstSegment.TailNumber
      },
      pricing: {
        total: flight.TotalPrice || flight.AirPricePricingInfo?.TotalPrice,
        currency: flight.AirPricePricingInfo?.CurrencyCode || 'USD',
        base: flight.BasePrice || 0,
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
        source: 'travelport',
        raw: flight,
        gdsCode: this.gdsCode
      }
    };
  }

  /**
   * Extract fare classes from Travelport flight data
   * @param {Object} flight - Travelport flight data
   * @returns {Array} Available fare classes
   */
  extractFareClasses(flight) {
    const fareClasses = new Set();
    
    if (flight.AirPricePricingInfo && flight.AirPricePricingInfo.FareInfo) {
      if (Array.isArray(flight.AirPricePricingInfo.FareInfo)) {
        flight.AirPricePricingInfo.FareInfo.forEach(fare => {
          if (fare.FareBasisCode) {
            fareClasses.add(fare.FareBasisCode);
          }
        });
      } else if (flight.AirPricePricingInfo.FareInfo.FareBasisCode) {
        fareClasses.add(flight.AirPricePricingInfo.FareInfo.FareBasisCode);
      }
    }

    return Array.from(fareClasses);
  }

  /**
   * Map fare type to Travelport format
   * @param {string} cabinClass - Standard cabin class
   * @returns {string} Travelport fare type
   */
  mapFareType(cabinClass) {
    const mapping = {
      'economy': 'Economy',
      'premium_economy': 'PremiumEconomy',
      'business': 'Business',
      'first': 'First'
    };
    return mapping[cabinClass] || 'Economy';
  }

  /**
   * Format date for Travelport API
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
        tier: this.tier,
        gdsc: this.gdsCode
      };

      const response = await this.makeRequest('/air/api/v1/fares/exclusive', exclusiveParams);
      return response.FareList || [];
    } catch (error) {
      console.error('Error getting Travelport exclusive fares:', error);
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
        tier: this.tier,
        gdsc: this.gdsCode
      };

      const response = await this.makeRequest('/air/api/v1/fares/net', netParams);
      return response.FareList || [];
    } catch (error) {
      console.error('Error getting Travelport net fares:', error);
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
        tier: this.tier,
        gdsc: this.gdsCode
      };

      const response = await this.makeRequest('/air/api/v1/promotions/partnership', promotionParams);
      return response.PromotionList || [];
    } catch (error) {
      console.error('Error getting Travelport partnership promotions:', error);
      return [];
    }
  }
}