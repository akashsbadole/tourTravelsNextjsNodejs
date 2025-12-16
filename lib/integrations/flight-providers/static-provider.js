import "server-only";
import { BaseFlightProvider } from './base-provider';
import { getFlights as getStaticFlights } from '../../services/flights';
import { getOneDoc, getManyDocs } from '../../db/getOperationDB';

/**
 * Static/Mock Flight Provider
 * Uses existing database as fallback when external APIs are unavailable
 */
export class StaticProvider extends BaseFlightProvider {
  constructor(config = {}) {
    super({
      name: 'Static',
      rateLimit: 1000,
      timeout: 10000,
      ...config
    });
  }

  /**
   * Search for flights using existing static database
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Array of flight options
   */
  async searchFlights(searchParams) {
    try {
      const {
        origin,
        destination,
        departureDate,
        returnDate,
        tripType = 'one_way',
        passengers = { adults: 1, children: 0, infants: 0 },
        cabinClass = 'economy',
        filters = {}
      } = searchParams;

      // Use existing flight service to get static data
      const flights = await getStaticFlights(
        {
          departureAirportCode: origin,
          arrivalAirportCode: destination,
          departureDate: new Date(departureDate),
          returnDate: returnDate ? new Date(returnDate) : null,
          tripType,
          flightClass: cabinClass,
          passengersObj: passengers,
          filters
        },
        [], // bookmarkedFlights
        { timeZone: 'UTC' }
      );

      return flights.map(flight => this.transformFlightData(flight));
    } catch (error) {
      console.error('Static provider search error:', error);
      throw this.handleError(error, searchParams);
    }
  }

  /**
   * Check availability using static data
   * @param {Array} flightIds - Array of flight IDs
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Availability data
   */
  async checkAvailability(flightIds, options = {}) {
    try {
      const availabilityData = {};

      for (const flightId of flightIds) {
        // Get flight itinerary
        const flight = await getOneDoc('FlightItinerary', { _id: flightId }, ['flights']);
        
        if (flight) {
          // Check available seats for each segment
          const segmentAvailability = await Promise.all(
            flight.segmentIds.map(async (segment) => {
              const availableSeats = await this.getAvailableSeatsForSegment(segment._id);
              return {
                segmentId: segment._id,
                availableSeats: availableSeats.length,
                totalSeats: segment.seats?.length || 0,
                status: this.getFlightStatus(segment)
              };
            })
          );

          availabilityData[flightId] = {
            available: segmentAvailability.every(seg => seg.availableSeats > 0),
            segments: segmentAvailability,
            lastUpdated: new Date().toISOString()
          };
        }
      }

      return {
        success: true,
        data: availabilityData
      };
    } catch (error) {
      return this.handleError(error, { flightIds, options });
    }
  }

  /**
   * Get pricing using static data
   * @param {Array} flightIds - Array of flight IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @returns {Promise<Object>} Pricing data
   */
  async getPricing(flightIds, passengerCounts, cabinClass) {
    try {
      const pricingData = {};

      for (const flightId of flightIds) {
        const flight = await getOneDoc('FlightItinerary', { _id: flightId }, ['flights']);
        
        if (flight) {
          // Calculate pricing using existing fare breakdown logic
          const { multiSegmentCombinedFareBreakDown } = await import('../../db/schema/flightItineraries');
          const fareBreakdown = multiSegmentCombinedFareBreakDown(
            flight.segmentIds,
            passengerCounts,
            cabinClass
          );

          pricingData[flightId] = {
            ...fareBreakdown,
            currency: 'USD',
            lastUpdated: new Date().toISOString()
          };
        }
      }

      return {
        success: true,
        data: pricingData
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
      const flight = await getOneDoc('FlightItinerary', { _id: flightId }, ['flights']);
      
      if (!flight) {
        return {
          success: false,
          error: 'Flight not found'
        };
      }

      const fareClassData = {};
      const cabinClasses = ['economy', 'premium_economy', 'business', 'first'];

      for (const cabinClass of cabinClasses) {
        const segmentAvailability = await Promise.all(
          flight.segmentIds.map(async (segment) => {
            const availableSeats = await this.getAvailableSeatsForSegment(segment._id, cabinClass);
            return {
              segmentId: segment._id,
              availableSeats: availableSeats.length,
              totalSeats: segment.seats?.length || 0
            };
          })
        );

        fareClassData[cabinClass] = {
          available: segmentAvailability.every(seg => seg.availableSeats > 0),
          segments: segmentAvailability,
          totalAvailable: segmentAvailability.reduce((sum, seg) => sum + seg.availableSeats, 0)
        };
      }

      return {
        success: true,
        data: fareClassData
      };
    } catch (error) {
      return this.handleError(error, { flightId });
    }
  }

  /**
   * Health check for static provider
   * @returns {Promise<boolean>} Health status
   */
  async healthCheck() {
    try {
      // Try to connect to database and get a simple query
      const flightCount = await getOneDoc('FlightItinerary', {}, ['flights']);
      return true;
    } catch (error) {
      console.error('Static provider health check failed:', error);
      return false;
    }
  }

  /**
   * Transform static flight data to standard format
   * @param {Object} staticFlight - Static flight data
   * @returns {Object} Standardized flight data
   */
  transformFlightData(staticFlight) {
    const firstSegment = staticFlight.segmentIds?.[0] || {};
    const lastSegment = staticFlight.segmentIds?.[staticFlight.segmentIds.length - 1] || {};

    return {
      id: staticFlight._id.toString(),
      provider: 'static',
      flightCode: staticFlight.flightCode,
      airline: {
        code: staticFlight.carrierInCharge?._id || staticFlight.carrierInCharge,
        name: staticFlight.carrierInCharge?.name || staticFlight.carrierInCharge,
      },
      departure: {
        airport: {
          code: staticFlight.departureAirportId?.iataCode || staticFlight.departureAirportId,
          name: staticFlight.departureAirportId?.name,
        },
        terminal: firstSegment.from?.terminal,
        gate: firstSegment.from?.gate,
        scheduledTime: firstSegment.from?.scheduledDeparture,
      },
      arrival: {
        airport: {
          code: staticFlight.arrivalAirportId?.iataCode || staticFlight.arrivalAirportId,
          name: staticFlight.arrivalAirportId?.name,
        },
        terminal: lastSegment.to?.terminal,
        gate: lastSegment.to?.gate,
        scheduledTime: lastSegment.to?.scheduledArrival,
      },
      duration: staticFlight.totalDurationMinutes,
      segments: staticFlight.segmentIds || [],
      pricing: staticFlight.fareBreakdowns || {},
      availability: {
        seats: staticFlight.availableSeatsCount?.reduce((sum, seg) => sum + seg.availableSeats, 0) || 0,
        fareClasses: this.extractFareClassesFromStatic(staticFlight)
      },
      lastUpdated: staticFlight.updatedAt || new Date().toISOString(),
      metadata: {
        source: 'static',
        status: staticFlight.status,
        expireAt: staticFlight.expireAt
      }
    };
  }

  /**
   * Get available seats for a segment
   * @param {string} segmentId - Segment ID
   * @param {string} seatClass - Seat class filter
   * @returns {Promise<Array>} Available seats
   */
  async getAvailableSeatsForSegment(segmentId, seatClass = null) {
    try {
      const { getAvailableSeats } = await import('../../services/flights');
      return await getAvailableSeats(segmentId, seatClass, 0);
    } catch (error) {
      console.error('Error getting available seats:', error);
      return [];
    }
  }

  /**
   * Get flight status
   * @param {Object} segment - Flight segment
   * @returns {string} Flight status
   */
  getFlightStatus(segment) {
    return segment.status || 'scheduled';
  }

  /**
   * Extract fare classes from static flight data
   * @param {Object} staticFlight - Static flight data
   * @returns {Array} Available fare classes
   */
  extractFareClassesFromStatic(staticFlight) {
    const fareClasses = new Set();
    
    // Check segment fare details for available classes
    staticFlight.segmentIds?.forEach(segment => {
      if (segment.fareDetails) {
        Object.keys(segment.fareDetails.basePrice || {}).forEach(className => {
          fareClasses.add(className);
        });
      }
    });

    return Array.from(fareClasses);
  }
}