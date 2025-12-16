/**
 * Comprehensive Flight Search Error Handling System
 * Provides structured error classification, recovery strategies, and user-friendly messages
 */

/**
 * Base Flight Search Error Class
 */
export class FlightSearchError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'FlightSearchError';
    
    // Error classification
    this.category = options.category || 'system';
    this.severity = options.severity || 'medium';
    this.errorCode = options.errorCode || 'FLIGHT_SEARCH_ERROR';
    this.field = options.field || null;
    
    // Recovery options
    this.retryable = options.retryable !== false;
    this.maxRetries = options.maxRetries || 3;
    this.currentRetry = options.currentRetry || 0;
    this.recoveryStrategy = options.recoveryStrategy || 'retry';
    
    // User-facing information
    this.userMessage = options.userMessage || message;
    this.suggestions = options.suggestions || [];
    
    // Context information
    this.context = options.context || {};
    this.timestamp = new Date().toISOString();
    this.traceId = options.traceId || null;
    
    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FlightSearchError);
    }
  }

  /**
   * Create retry version of this error
   */
  createRetry() {
    const retryError = new FlightSearchError(this.message, {
      ...this,
      currentRetry: this.currentRetry + 1
    });
    
    retryError.stack = this.stack;
    return retryError;
  }

  /**
   * Check if error can be retried
   */
  canRetry() {
    return this.retryable && this.currentRetry < this.maxRetries;
  }

  /**
   * Convert to structured response
   */
  toResponse() {
    return {
      success: false,
      error: {
        code: this.errorCode,
        message: this.userMessage,
        category: this.category,
        severity: this.severity,
        field: this.field,
        retryable: this.canRetry(),
        suggestions: this.suggestions,
        timestamp: this.timestamp,
        traceId: this.traceId
      }
    };
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      errorCode: this.errorCode,
      field: this.field,
      retryable: this.retryable,
      maxRetries: this.maxRetries,
      currentRetry: this.currentRetry,
      recoveryStrategy: this.recoveryStrategy,
      userMessage: this.userMessage,
      suggestions: this.suggestions,
      context: this.context,
      timestamp: this.timestamp,
      traceId: this.traceId,
      stack: this.stack
    };
  }
}

/**
 * Specialized Error Classes
 */
export class ValidationError extends FlightSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'validation',
      severity: 'low',
      errorCode: options.errorCode || 'VALIDATION_ERROR'
    });
    this.name = 'ValidationError';
  }
}

export class NetworkError extends FlightSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'network',
      severity: 'medium',
      retryable: true,
      maxRetries: 2,
      errorCode: options.errorCode || 'NETWORK_ERROR'
    });
    this.name = 'NetworkError';
  }
}

export class APIError extends FlightSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'api',
      severity: 'medium',
      statusCode: options.statusCode,
      errorCode: options.errorCode || 'API_ERROR'
    });
    this.name = 'APIError';
  }
}

export class DataError extends FlightSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'data',
      severity: 'low',
      errorCode: options.errorCode || 'DATA_ERROR'
    });
    this.name = 'DataError';
  }
}

export class BusinessError extends FlightSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'business',
      severity: 'medium',
      retryable: false,
      errorCode: options.errorCode || 'BUSINESS_ERROR'
    });
    this.name = 'BusinessError';
  }
}

export class SystemError extends FlightSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'system',
      severity: 'high',
      errorCode: options.errorCode || 'SYSTEM_ERROR'
    });
    this.name = 'SystemError';
  }
}

export class ExternalServiceError extends FlightSearchError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      category: 'external_service',
      severity: 'medium',
      retryable: true,
      errorCode: options.errorCode || 'EXTERNAL_SERVICE_ERROR'
    });
    this.name = 'ExternalServiceError';
  }
}

/**
 * Error Factory for creating structured errors
 */
export class ErrorFactory {
  /**
   * Invalid airport code error
   */
  static invalidAirportCode(code, field = 'unknown') {
    return new ValidationError(
      `Invalid airport code: ${code}`,
      {
        field,
        errorCode: 'INVALID_AIRPORT_CODE',
        userMessage: `Please enter a valid 3-letter airport code for ${field}`,
        suggestions: [
          'Enter a valid 3-letter airport code (e.g., JFK, LAX, LHR)',
          'Check the airport code spelling',
          'Use the airport search dropdown for suggestions'
        ],
        context: { invalidCode: code }
      }
    );
  }

  /**
   * Same origin and destination error
   */
  static sameOriginDestination(origin, destination) {
    return new ValidationError(
      `Origin and destination cannot be the same: ${origin}`,
      {
        field: 'destination',
        errorCode: 'SAME_ORIGIN_DESTINATION',
        userMessage: 'Origin and destination airports cannot be the same',
        suggestions: [
          'Choose a different destination airport',
          'Check that you selected the correct airports'
        ],
        context: { origin, destination }
      }
    );
  }

  /**
   * Past date error
   */
  static pastDate(date, field = 'departureDate') {
    return new ValidationError(
      `Date cannot be in the past: ${date}`,
      {
        field,
        errorCode: 'PAST_DATE',
        userMessage: `${field === 'departureDate' ? 'Departure' : 'Return'} date cannot be in the past`,
        suggestions: [
          'Select a future date',
          'Check your calendar for the correct travel date'
        ],
        context: { pastDate: date, field }
      }
    );
  }

  /**
   * Invalid date range error
   */
  static invalidDateRange(departureDate, returnDate) {
    return new ValidationError(
      `Return date must be after departure date: ${returnDate} <= ${departureDate}`,
      {
        field: 'returnDate',
        errorCode: 'INVALID_DATE_RANGE',
        userMessage: 'Return date must be after departure date',
        suggestions: [
          'Select a return date after your departure date',
          'Choose a one-way trip if you don\'t need a return flight'
        ],
        context: { departureDate, returnDate }
      }
    );
  }

  /**
   * Invalid passenger count error
   */
  static invalidPassengers(passengers, reason) {
    return new ValidationError(
      `Invalid passenger configuration: ${reason}`,
      {
        field: 'passengers',
        errorCode: 'INVALID_PASSENGERS',
        userMessage: 'Please check passenger requirements',
        suggestions: [
          'At least one adult is required for booking',
          'Each adult can accompany maximum one infant',
          'Maximum 9 passengers allowed per booking'
        ],
        context: { passengers, reason }
      }
    );
  }

  /**
   * Network timeout error
   */
  static networkTimeout(timeout) {
    return new NetworkError(
      `Network timeout after ${timeout}ms`,
      {
        errorCode: 'NETWORK_TIMEOUT',
        userMessage: 'Connection timed out. Please check your internet connection',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Try again in a few moments'
        ],
        context: { timeout },
        maxRetries: 2
      }
    );
  }

  /**
   * Network unreachable error
   */
  static networkUnreachable() {
    return new NetworkError(
      'Network unreachable',
      {
        errorCode: 'NETWORK_UNREACHABLE',
        userMessage: 'Unable to connect to the internet',
        suggestions: [
          'Check your internet connection',
          'Try switching to a different network',
          'Contact your internet service provider'
        ],
        recoveryStrategy: 'fallback'
      }
    );
  }

  /**
   * Rate limit exceeded error
   */
  static rateLimitExceeded(resetTime) {
    return new APIError(
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
    return new ExternalServiceError(
      `Service unavailable: ${serviceName}`,
      {
        errorCode: 'SERVICE_UNAVAILABLE',
        userMessage: `${serviceName} is temporarily unavailable`,
        suggestions: [
          'Try again in a few minutes',
          'Contact support if the issue persists'
        ],
        context: { serviceName },
        recoveryStrategy: 'fallback'
      }
    );
  }

  /**
   * No flights found error
   */
  static noFlightsFound(searchParams) {
    return new DataError(
      'No flights found matching search criteria',
      {
        errorCode: 'NO_FLIGHTS_FOUND',
        userMessage: 'No flights found matching your search criteria',
        suggestions: [
          'Try different travel dates',
          'Check nearby airports',
          'Adjust your filters',
          'Try different cabin class'
        ],
        context: { searchParams },
        recoveryStrategy: 'user_action'
      }
    );
  }

  /**
   * Invalid cabin class error
   */
  static invalidCabinClass(cabinClass) {
    return new ValidationError(
      `Invalid cabin class: ${cabinClass}`,
      {
        field: 'cabinClass',
        errorCode: 'INVALID_CABIN_CLASS',
        userMessage: 'Please select a valid cabin class',
        suggestions: [
          'Choose from: Economy, Premium Economy, Business, First Class',
          'Check available options for your route'
        ],
        context: { invalidClass: cabinClass }
      }
    );
  }

  /**
   * Currency conversion error
   */
  static currencyConversionError(from, to, amount) {
    return new BusinessError(
      `Currency conversion failed: ${from} to ${to}`,
      {
        errorCode: 'CURRENCY_CONVERSION_ERROR',
        userMessage: 'Unable to convert currency. Prices shown in default currency',
        suggestions: [
          'Try again later',
          'Contact support for currency conversion issues'
        ],
        context: { from, to, amount },
        retryable: false
      }
    );
  }

  /**
   * Pricing error
   */
  static pricingError(flightIds, reason) {
    return new DataError(
      `Pricing calculation failed: ${reason}`,
      {
        errorCode: 'PRICING_ERROR',
        userMessage: 'Unable to calculate flight prices',
        suggestions: [
          'Try refreshing the search',
          'Select different flights',
          'Contact support if issue persists'
        ],
        context: { flightIds, reason }
      }
    );
  }

  /**
   * Seat availability error
   */
  static seatAvailabilityError(flightId, requestedSeats, availableSeats) {
    return new BusinessError(
      `Insufficient seat availability: ${requestedSeats} requested, ${availableSeats} available`,
      {
        errorCode: 'SEAT_AVAILABILITY_ERROR',
        userMessage: 'Not enough seats available on selected flight',
        suggestions: [
          'Reduce number of passengers',
          'Select a different flight',
          'Try different travel dates'
        ],
        context: { flightId, requestedSeats, availableSeats },
        retryable: false
      }
    );
  }

  /**
   * Database connection error
   */
  static databaseConnectionError(operation) {
    return new SystemError(
      `Database connection failed during ${operation}`,
      {
        errorCode: 'DATABASE_CONNECTION_ERROR',
        userMessage: 'System temporarily unavailable. Please try again',
        suggestions: [
          'Try again in a few moments',
          'Contact support if issue persists'
        ],
        context: { operation },
        recoveryStrategy: 'fallback'
      }
    );
  }

  /**
   * Authentication error
   */
  static authenticationError(operation) {
    return new BusinessError(
      `Authentication failed for ${operation}`,
      {
        errorCode: 'AUTHENTICATION_ERROR',
        userMessage: 'Please log in to continue',
        suggestions: [
          'Log in to your account',
          'Create an account if you don\'t have one',
          'Check your login credentials'
        ],
        context: { operation },
        retryable: false
      }
    );
  }

  /**
   * Authorization error
   */
  static authorizationError(operation, resource) {
    return new BusinessError(
      `Access denied for ${operation} on ${resource}`,
      {
        errorCode: 'AUTHORIZATION_ERROR',
        userMessage: 'You don\'t have permission to perform this action',
        suggestions: [
          'Check your account permissions',
          'Contact support for access requests'
        ],
        context: { operation, resource },
        retryable: false
      }
    );
  }

  /**
   * Generic error from unknown source
   */
  static genericError(message, context = {}) {
    return new FlightSearchError(
      message,
      {
        errorCode: 'GENERIC_ERROR',
        userMessage: 'An unexpected error occurred',
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
 * Error Recovery Manager
 */
export class ErrorRecoveryManager {
  constructor() {
    this.strategies = {
      retry: this.handleRetry.bind(this),
      fallback: this.handleFallback.bind(this),
      user_action: this.handleUserAction.bind(this),
      circuit_breaker: this.handleCircuitBreaker.bind(this)
    };
  }

  /**
   * Handle error recovery based on strategy
   */
  async handleRecovery(error, context = {}) {
    const strategy = this.strategies[error.recoveryStrategy];
    
    if (!strategy) {
      return {
        success: false,
        error: 'Unknown recovery strategy',
        strategy: error.recoveryStrategy
      };
    }

    try {
      return await strategy(error, context);
    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError.message,
        originalError: error,
        strategy: error.recoveryStrategy
      };
    }
  }

  /**
   * Handle retry strategy
   */
  async handleRetry(error, context) {
    if (!error.canRetry()) {
      return {
        success: false,
        requiresUserAction: true,
        message: 'Maximum retry attempts exceeded'
      };
    }

    const retryError = error.createRetry();
    const delay = Math.pow(2, retryError.currentRetry - 1) * 1000;

    return {
      success: true,
      retryAttempt: retryError.currentRetry,
      delay,
      error: retryError
    };
  }

  /**
   * Handle fallback strategy
   */
  async handleFallback(error, context) {
    return {
      success: true,
      fallbackUsed: true,
      message: 'Using fallback data source',
      suggestions: [
        'Some features may be limited',
        'Try again later for full functionality'
      ]
    };
  }

  /**
   * Handle user action strategy
   */
  async handleUserAction(error, context) {
    return {
      success: false,
      requiresUserAction: true,
      message: error.userMessage,
      suggestions: error.suggestions,
      field: error.field
    };
  }

  /**
   * Handle circuit breaker strategy
   */
  async handleCircuitBreaker(error, context) {
    return {
      success: false,
      circuitOpen: true,
      message: 'Service temporarily unavailable',
      retryAfter: '5 minutes',
      suggestions: [
        'Try again later',
        'Use alternative service if available'
      ]
    };
  }

  /**
   * Register custom recovery strategy
   */
  registerStrategy(name, handler) {
    this.strategies[name] = handler;
  }
}

// Create singleton instance
export const errorRecoveryManager = new ErrorRecoveryManager();

export default {
  FlightSearchError,
  ValidationError,
  NetworkError,
  APIError,
  DataError,
  BusinessError,
  SystemError,
  ExternalServiceError,
  ErrorFactory,
  ErrorRecoveryManager,
  errorRecoveryManager
};