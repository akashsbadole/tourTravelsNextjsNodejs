/**
 * Hotel Search Error Handling System
 * Provides structured error classification and recovery for hotel search
 */

import { 
  FlightSearchError, 
  ValidationError, 
  NetworkError, 
  APIError,
  DataError,
  BusinessError,
  SystemError,
  ExternalServiceError,
  ErrorFactory,
  ErrorRecoveryManager 
} from '@/lib/errors/flight-search-errors';

/**
 * Hotel Search Error Class
 */
export class HotelSearchError extends FlightSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: options.category || 'hotel_search',
      errorCode: options.errorCode || 'HOTEL_SEARCH_ERROR'
    });
    this.name = 'HotelSearchError';
  }
}

/**
 * Hotel-specific Error Classes
 */
export class HotelValidationError extends HotelSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'hotel_validation',
      severity: 'low',
      errorCode: options.errorCode || 'HOTEL_VALIDATION_ERROR'
    });
    this.name = 'HotelValidationError';
  }
}

export class HotelNetworkError extends HotelSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'hotel_network',
      severity: 'medium',
      retryable: true,
      maxRetries: 2,
      errorCode: options.errorCode || 'HOTEL_NETWORK_ERROR'
    });
    this.name = 'HotelNetworkError';
  }
}

export class HotelAPIError extends HotelSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'hotel_api',
      severity: 'medium',
      statusCode: options.statusCode,
      errorCode: options.errorCode || 'HOTEL_API_ERROR'
    });
    this.name = 'HotelAPIError';
  }
}

export class HotelDataError extends HotelSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'hotel_data',
      severity: 'low',
      errorCode: options.errorCode || 'HOTEL_DATA_ERROR'
    });
    this.name = 'HotelDataError';
  }
}

export class HotelBusinessError extends HotelSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'hotel_business',
      severity: 'medium',
      retryable: false,
      errorCode: options.errorCode || 'HOTEL_BUSINESS_ERROR'
    });
    this.name = 'HotelBusinessError';
  }
}

/**
 * Hotel Error Factory
 */
export class HotelErrorFactory {
  /**
   * Invalid location error
   */
  static invalidLocation(location, field = 'destination') {
    return new HotelValidationError(
      `Invalid location: ${location}`,
      {
        field,
        errorCode: 'INVALID_LOCATION',
        userMessage: `Please enter a valid ${field}`,
        suggestions: [
          'Enter a city name',
          'Use the location search dropdown',
          'Check spelling and try again'
        ],
        context: { invalidLocation: location }
      }
    );
  }

  /**
   * Invalid date range error
   */
  static invalidDateRange(checkIn, checkOut) {
    return new HotelValidationError(
      `Invalid date range: ${checkIn} to ${checkOut}`,
      {
        field: 'checkOut',
        errorCode: 'INVALID_DATE_RANGE',
        userMessage: 'Check-out date must be after check-in date',
        suggestions: [
          'Select a check-out date after check-in',
          'Minimum stay is 1 night'
        ],
        context: { checkIn, checkOut }
      }
    );
  }

  /**
   * Past date error
   */
  static pastDate(date, field = 'checkIn') {
    return new HotelValidationError(
      `Date cannot be in the past: ${date}`,
      {
        field,
        errorCode: 'PAST_DATE',
        userMessage: `${field === 'checkIn' ? 'Check-in' : 'Check-out'} date cannot be in the past`,
        suggestions: [
          'Select a future date',
          'Check your calendar for correct dates'
        ],
        context: { pastDate: date, field }
      }
    );
  }

  /**
   * Invalid guest count error
   */
  static invalidGuestCount(guests, reason) {
    return new HotelValidationError(
      `Invalid guest count: ${reason}`,
      {
        field: 'guests',
        errorCode: 'INVALID_GUEST_COUNT',
        userMessage: 'Please check guest requirements',
        suggestions: [
          'At least 1 guest is required',
          'Maximum 10 guests allowed per room',
          'Children count cannot exceed adult count without proper rooms'
        ],
        context: { guests, reason }
      }
    );
  }

  /**
   * No rooms available error
   */
  static noRoomsAvailable(hotelName, dates) {
    return new HotelDataError(
      `No rooms available at ${hotelName} for selected dates`,
      {
        errorCode: 'NO_ROOMS_AVAILABLE',
        userMessage: 'No rooms available for selected dates',
        suggestions: [
          'Try different dates',
          'Check nearby hotels',
          'Contact hotel directly for availability'
        ],
        context: { hotelName, dates }
      }
    );
  }

  /**
   * Room capacity exceeded error
   */
  static roomCapacityExceeded(roomCapacity, guestCount) {
    return new HotelBusinessError(
      `Room capacity exceeded: ${guestCount} guests in room for ${roomCapacity}`,
      {
        errorCode: 'ROOM_CAPACITY_EXCEEDED',
        userMessage: 'Too many guests for selected room',
        suggestions: [
          'Select a larger room',
          'Book multiple rooms',
          'Reduce number of guests'
        ],
        context: { roomCapacity, guestCount }
      }
    );
  }

  /**
   * Pricing error
   */
  static pricingError(hotelId, roomId, reason) {
    return new HotelDataError(
      `Pricing calculation failed: ${reason}`,
      {
        errorCode: 'PRICING_ERROR',
        userMessage: 'Unable to calculate room price',
        suggestions: [
          'Try refreshing the page',
          'Select a different room',
          'Contact support if issue persists'
        ],
        context: { hotelId, roomId, reason }
      }
    );
  }

  /**
   * Hotel unavailable error
   */
  static hotelUnavailable(hotelName, reason) {
    return new HotelBusinessError(
      `Hotel unavailable: ${hotelName} - ${reason}`,
      {
        errorCode: 'HOTEL_UNAVAILABLE',
        userMessage: `${hotelName} is currently unavailable`,
        suggestions: [
          'Try a different hotel',
          'Check availability for later dates',
          'Contact hotel directly'
        ],
        context: { hotelName, reason }
      }
    );
  }

  /**
   * Payment processing error
   */
  static paymentError(reason, paymentMethod) {
    return new HotelBusinessError(
      `Payment processing failed: ${reason}`,
      {
        errorCode: 'PAYMENT_ERROR',
        userMessage: 'Payment processing failed',
        suggestions: [
          'Check your payment details',
          'Try a different payment method',
          'Contact your bank if issue persists'
        ],
        context: { reason, paymentMethod }
      }
    );
  }

  /**
   * Cancellation policy error
   */
  static cancellationPolicyError(hotelName, reason) {
    return new HotelBusinessError(
      `Cancellation policy error: ${reason}`,
      {
        errorCode: 'CANCELLATION_POLICY_ERROR',
        userMessage: 'Unable to process cancellation request',
        suggestions: [
          'Check cancellation terms',
          'Contact hotel directly',
          'Review booking details'
        ],
        context: { hotelName, reason }
      }
    );
  }

  /**
   * Amenities unavailable error
   */
  static amenitiesUnavailable(amenity, hotelName) {
    return new HotelDataError(
      `Amenity unavailable: ${amenity}`,
      {
        errorCode: 'AMENITY_UNAVAILABLE',
        userMessage: `${amenity} is not available`,
        suggestions: [
          'Check hotel amenities list',
          'Contact hotel for confirmation',
          'Consider hotels with desired amenities'
        ],
        context: { amenity, hotelName }
      }
    );
  }

  /**
   * Room type unavailable error
   */
  static roomTypeUnavailable(roomType, hotelName) {
    return new HotelDataError(
      `Room type unavailable: ${roomType}`,
      {
        errorCode: 'ROOM_TYPE_UNAVAILABLE',
        userMessage: `${roomType} rooms are not available`,
        suggestions: [
          'Try different room types',
          'Check all available rooms',
          'Contact hotel for availability'
        ],
        context: { roomType, hotelName }
      }
    );
  }

  /**
   * Rate limit exceeded error
   */
  static rateLimitExceeded(resetTime) {
    return new HotelAPIError(
      'Rate limit exceeded',
      {
        statusCode: 429,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        userMessage: 'Too many requests. Please wait before trying again',
        suggestions: [
          'Wait a few minutes before trying again',
          'Upgrade to premium for higher limits'
        ],
        context: { resetTime },
        retryable: true,
        maxRetries: 1
      }
    );
  }

  /**
   * Service unavailable error
   */
  static serviceUnavailable(serviceName) {
    return new HotelExternalServiceError(
      `Service unavailable: ${serviceName}`,
      {
        errorCode: 'SERVICE_UNAVAILABLE',
        userMessage: `${serviceName} is temporarily unavailable`,
        suggestions: [
          'Try again in a few minutes',
          'Check service status page',
          'Contact support if issue persists'
        ],
        context: { serviceName },
        recoveryStrategy: 'fallback'
      }
    );
  }

  /**
   * Generic hotel search error
   */
  static genericError(message, context = {}) {
    return new HotelSearchError(
      message,
      {
        errorCode: 'HOTEL_SEARCH_GENERIC_ERROR',
        userMessage: 'An unexpected error occurred while searching hotels',
        suggestions: [
          'Try refreshing the page',
          'Try again in a few moments',
          'Contact support if issue persists'
        ],
        context
      }
    );
  }
}

/**
 * Hotel Error Recovery Manager
 */
export class HotelErrorRecoveryManager extends ErrorRecoveryManager {
  constructor() {
    super();
    this.registerHotelStrategies();
  }

  /**
   * Register hotel-specific recovery strategies
   */
  registerHotelStrategies() {
    this.registerStrategy('alternative_dates', this.handleAlternativeDates.bind(this));
    this.registerStrategy('alternative_location', this.handleAlternativeLocation.bind(this));
    this.registerStrategy('fallback_provider', this.handleFallbackProvider.bind(this));
    this.registerStrategy('reduce_guests', this.handleReduceGuests.bind(this));
  }

  /**
   * Handle alternative dates strategy
   */
  async handleAlternativeDates(error, context) {
    const { searchParams } = context;
    
    return {
      success: true,
      strategy: 'alternative_dates',
      suggestions: [
        {
          title: 'Try dates ±3 days',
          description: 'Check availability for dates before or after your selection',
          action: 'modify_dates'
        }
      ],
      context: {
        originalDates: {
          checkIn: searchParams.checkIn,
          checkOut: searchParams.checkOut
        }
      }
    };
  }

  /**
   * Handle alternative location strategy
   */
  async handleAlternativeLocation(error, context) {
    const { searchParams } = context;
    
    return {
      success: true,
      strategy: 'alternative_location',
      suggestions: [
        {
          title: 'Try nearby areas',
          description: 'Check hotels in nearby neighborhoods or cities',
          action: 'modify_location'
        }
      ],
      context: {
        originalLocation: searchParams.destination
      }
    };
  }

  /**
   * Handle fallback provider strategy
   */
  async handleFallbackProvider(error, context) {
    return {
      success: true,
      strategy: 'fallback_provider',
      suggestions: [
        {
          title: 'Using alternative provider',
          description: 'Searching with backup hotel providers',
          action: 'fallback_search'
        }
      ],
      context: {
        fallbackUsed: true,
        originalError: error.message
      }
    };
  }

  /**
   * Handle reduce guests strategy
   */
  async handleReduceGuests(error, context) {
    const { searchParams } = context;
    
    return {
      success: true,
      strategy: 'reduce_guests',
      suggestions: [
        {
          title: 'Reduce guest count',
          description: 'Try with fewer guests or book multiple rooms',
          action: 'modify_guests'
        }
      ],
      context: {
        originalGuests: searchParams.guests
      }
    };
  }
}

// Create singleton instance
export const hotelErrorRecoveryManager = new HotelErrorRecoveryManager();

export default {
  HotelSearchError,
  HotelValidationError,
  HotelNetworkError,
  HotelAPIError,
  HotelDataError,
  HotelBusinessError,
  HotelErrorFactory,
  HotelErrorRecoveryManager,
  hotelErrorRecoveryManager
};