import "server-only";

/**
 * Base class for flight data providers
 * Defines the interface that all flight providers must implement
 */
export class BaseFlightProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = config.name || 'BaseProvider';
    this.rateLimit = config.rateLimit || 100; // requests per minute
    this.timeout = config.timeout || 30000; // 30 seconds
  }

  /**
   * Search for flights based on criteria
   * @param {Object} searchParams - Flight search parameters
   * @param {string} searchParams.origin - Origin airport code
   * @param {string} searchParams.destination - Destination airport code
   * @param {Date} searchParams.departureDate - Departure date
   * @param {Date} searchParams.returnDate - Return date (optional)
   * @param {string} searchParams.tripType - 'one_way' or 'round_trip'
   * @param {Object} searchParams.passengers - Passenger counts
   * @param {string} searchParams.cabinClass - Cabin class
   * @returns {Promise<Array>} Array of flight options
   */
  async searchFlights(searchParams) {
    throw new Error('searchFlights method must be implemented by provider');
  }

  /**
   * Check real-time availability for specific flights
   * @param {Array} flightIds - Array of flight IDs to check
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Availability data for flights
   */
  async checkAvailability(flightIds, options = {}) {
    throw new Error('checkAvailability method must be implemented by provider');
  }

  /**
   * Get pricing information for flights
   * @param {Array} flightIds - Array of flight IDs
   * @param {Object} passengerCounts - Passenger counts by type
   * @param {string} cabinClass - Cabin class
   * @returns {Promise<Object>} Pricing data
   */
  async getPricing(flightIds, passengerCounts, cabinClass) {
    throw new Error('getPricing method must be implemented by provider');
  }

  /**
   * Get fare class availability
   * @param {string} flightId - Flight ID
   * @returns {Promise<Object>} Fare class availability data
   */
  async getFareClassAvailability(flightId) {
    throw new Error('getFareClassAvailability method must be implemented by provider');
  }

  /**
   * Validate if provider is healthy and can handle requests
   * @returns {Promise<boolean>} Health status
   */
  async healthCheck() {
    throw new Error('healthCheck method must be implemented by provider');
  }

  /**
   * Get provider-specific metadata
   * @returns {Object} Provider metadata
   */
  getMetadata() {
    return {
      name: this.name,
      rateLimit: this.rateLimit,
      timeout: this.timeout,
      supportedFeatures: [
        'search',
        'availability',
        'pricing',
        'fareClasses'
      ]
    };
  }

  /**
   * Handle rate limiting
   * @returns {Promise<void>}
   */
  async handleRateLimit() {
    // Implement rate limiting logic
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Transform provider-specific data to standard format
   * @param {Object} providerData - Raw data from provider
   * @returns {Object} Standardized flight data
   */
  transformFlightData(providerData) {
    throw new Error('transformFlightData method must be implemented by provider');
  }

  /**
   * Handle errors from provider API calls
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context of the error
   * @returns {Object} Standardized error response
   */
  handleError(error, context = {}) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        provider: this.name,
        context,
        timestamp: new Date().toISOString()
      }
    };
  }
}