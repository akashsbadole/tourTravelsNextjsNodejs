/**
 * Hotel Booking Error Handling Utilities
 * Provides comprehensive error handling for hotel booking operations
 */

// Error types and messages
export const HOTEL_BOOKING_ERRORS = {
  // General errors
  NETWORK_ERROR: 'Network error occurred. Please check your connection and try again.',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
  
  // Authentication errors
  NOT_AUTHENTICATED: 'You must be logged in to make a booking.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Hotel/Room errors
  HOTEL_NOT_FOUND: 'Hotel not found. Please search for another hotel.',
  ROOM_NOT_FOUND: 'Room not found. Please select another room.',
  ROOMS_NOT_AVAILABLE: 'No rooms available for the selected dates.',
  
  // Availability errors
  AVAILABILITY_CHECK_FAILED: 'Failed to check room availability. Please try again.',
  DATES_INVALID: 'Invalid dates selected. Please check your check-in and check-out dates.',
  CHECK_IN_PAST: 'Check-in date cannot be in the past.',
  CHECK_OUT_BEFORE_CHECK_IN: 'Check-out date must be after check-in date.',
  MIN_STAY_REQUIRED: 'Minimum stay requirement not met.',
  MAX_STAY_EXCEEDED: 'Maximum stay limit exceeded.',
  
  // Pricing errors
  PRICING_CALCULATION_FAILED: 'Failed to calculate pricing. Please try again.',
  INVALID_PROMO_CODE: 'Invalid promo code.',
  EXPIRED_PROMO_CODE: 'Promo code has expired.',
  PROMO_CODE_LIMIT_REACHED: 'Promo code usage limit has been reached.',
  
  // Booking errors
  BOOKING_FAILED: 'Failed to create booking. Please try again.',
  BOOKING_LIMIT_EXCEEDED: 'You have exceeded the maximum booking limit.',
  ROOM_ALREADY_BOOKED: 'One or more selected rooms are no longer available.',
  INSUFFICIENT_CAPACITY: 'Selected rooms cannot accommodate all guests.',
  
  // Payment errors
  PAYMENT_FAILED: 'Payment failed. Please check your payment details and try again.',
  PAYMENT_METHOD_INVALID: 'Invalid payment method.',
  CARD_DECLINED: 'Payment card was declined.',
  INSUFFICIENT_FUNDS: 'Insufficient funds for this booking.',
  PAYMENT_PROCESSING_ERROR: 'Error processing payment. Please try again.',
  
  // Guest information errors
  GUEST_INFO_INCOMPLETE: 'Please complete all required guest information.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  GUEST_COUNT_INVALID: 'Invalid number of guests.',
  
  // Customization errors
  CUSTOMIZATION_FAILED: 'Failed to save room customization. Please try again.',
  INVALID_CUSTOMIZATION: 'Invalid room customization selected.',
  CUSTOMIZATION_UNAVAILABLE: 'Selected customization is not available.',
  
  // Comparison errors
  COMPARISON_LIMIT_EXCEEDED: 'You can compare up to 4 rooms at a time.',
  ROOM_ALREADY_COMPARING: 'Room is already in comparison list.',
  
  // Validation errors
  VALIDATION_FAILED: 'Validation failed. Please check your information.',
  REQUIRED_FIELD_MISSING: 'Required information is missing.',
  INVALID_FORMAT: 'Invalid format provided.',
  
  // System errors
  DATABASE_ERROR: 'Database error occurred. Please try again later.',
  API_ERROR: 'API error occurred. Please try again later.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  MAINTENANCE_MODE: 'System is under maintenance. Please try again later.'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error categories
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  VALIDATION: 'validation',
  BUSINESS_LOGIC: 'business_logic',
  PAYMENT: 'payment',
  SYSTEM: 'system'
};

/**
 * Get error message by error code
 * @param {string} errorCode - Error code
 * @param {string} customMessage - Custom message (optional)
 * @returns {string} - Error message
 */
export function getErrorMessage(errorCode, customMessage = null) {
  return customMessage || HOTEL_BOOKING_ERRORS[errorCode] || HOTEL_BOOKING_ERRORS.UNEXPECTED_ERROR;
}

/**
 * Get error severity by error code
 * @param {string} errorCode - Error code
 * @returns {string} - Error severity
 */
export function getErrorSeverity(errorCode) {
  const severityMap = {
    [HOTEL_BOOKING_ERRORS.NETWORK_ERROR]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.UNEXPECTED_ERROR]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.NOT_AUTHENTICATED]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.SESSION_EXPIRED]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.HOTEL_NOT_FOUND]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.ROOM_NOT_FOUND]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.ROOMS_NOT_AVAILABLE]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.AVAILABILITY_CHECK_FAILED]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.DATES_INVALID]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.CHECK_IN_PAST]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.CHECK_OUT_BEFORE_CHECK_IN]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.MIN_STAY_REQUIRED]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.MAX_STAY_EXCEEDED]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.PRICING_CALCULATION_FAILED]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.INVALID_PROMO_CODE]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.EXPIRED_PROMO_CODE]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.PROMO_CODE_LIMIT_REACHED]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.BOOKING_FAILED]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.BOOKING_LIMIT_EXCEEDED]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.ROOM_ALREADY_BOOKED]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.INSUFFICIENT_CAPACITY]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.PAYMENT_FAILED]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.PAYMENT_METHOD_INVALID]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.CARD_DECLINED]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.INSUFFICIENT_FUNDS]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.PAYMENT_PROCESSING_ERROR]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.GUEST_INFO_INCOMPLETE]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.INVALID_EMAIL]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.INVALID_PHONE]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.GUEST_COUNT_INVALID]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.CUSTOMIZATION_FAILED]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.INVALID_CUSTOMIZATION]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.CUSTOMIZATION_UNAVAILABLE]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.COMPARISON_LIMIT_EXCEEDED]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.ROOM_ALREADY_COMPARING]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.VALIDATION_FAILED]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.REQUIRED_FIELD_MISSING]: ERROR_SEVERITY.MEDIUM,
    [HOTEL_BOOKING_ERRORS.INVALID_FORMAT]: ERROR_SEVERITY.LOW,
    [HOTEL_BOOKING_ERRORS.DATABASE_ERROR]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.API_ERROR]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.SERVER_ERROR]: ERROR_SEVERITY.HIGH,
    [HOTEL_BOOKING_ERRORS.MAINTENANCE_MODE]: ERROR_SEVERITY.HIGH
  };
  
  return severityMap[errorCode] || ERROR_SEVERITY.MEDIUM;
}

/**
 * Get error category by error code
 * @param {string} errorCode - Error code
 * @returns {string} - Error category
 */
export function getErrorCategory(errorCode) {
  const categoryMap = {
    [HOTEL_BOOKING_ERRORS.NETWORK_ERROR]: ERROR_CATEGORIES.NETWORK,
    [HOTEL_BOOKING_ERRORS.UNEXPECTED_ERROR]: ERROR_CATEGORIES.SYSTEM,
    [HOTEL_BOOKING_ERRORS.NOT_AUTHENTICATED]: ERROR_CATEGORIES.AUTHENTICATION,
    [HOTEL_BOOKING_ERRORS.SESSION_EXPIRED]: ERROR_CATEGORIES.AUTHENTICATION,
    [HOTEL_BOOKING_ERRORS.HOTEL_NOT_FOUND]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.ROOM_NOT_FOUND]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.ROOMS_NOT_AVAILABLE]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.AVAILABILITY_CHECK_FAILED]: ERROR_CATEGORIES.SYSTEM,
    [HOTEL_BOOKING_ERRORS.DATES_INVALID]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.CHECK_IN_PAST]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.CHECK_OUT_BEFORE_CHECK_IN]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.MIN_STAY_REQUIRED]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.MAX_STAY_EXCEEDED]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.PRICING_CALCULATION_FAILED]: ERROR_CATEGORIES.SYSTEM,
    [HOTEL_BOOKING_ERRORS.INVALID_PROMO_CODE]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.EXPIRED_PROMO_CODE]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.PROMO_CODE_LIMIT_REACHED]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.BOOKING_FAILED]: ERROR_CATEGORIES.SYSTEM,
    [HOTEL_BOOKING_ERRORS.BOOKING_LIMIT_EXCEEDED]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.ROOM_ALREADY_BOOKED]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.INSUFFICIENT_CAPACITY]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.PAYMENT_FAILED]: ERROR_CATEGORIES.PAYMENT,
    [HOTEL_BOOKING_ERRORS.PAYMENT_METHOD_INVALID]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.CARD_DECLINED]: ERROR_CATEGORIES.PAYMENT,
    [HOTEL_BOOKING_ERRORS.INSUFFICIENT_FUNDS]: ERROR_CATEGORIES.PAYMENT,
    [HOTEL_BOOKING_ERRORS.PAYMENT_PROCESSING_ERROR]: ERROR_CATEGORIES.PAYMENT,
    [HOTEL_BOOKING_ERRORS.GUEST_INFO_INCOMPLETE]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.INVALID_EMAIL]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.INVALID_PHONE]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.GUEST_COUNT_INVALID]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.CUSTOMIZATION_FAILED]: ERROR_CATEGORIES.SYSTEM,
    [HOTEL_BOOKING_ERRORS.INVALID_CUSTOMIZATION]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.CUSTOMIZATION_UNAVAILABLE]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.COMPARISON_LIMIT_EXCEEDED]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.ROOM_ALREADY_COMPARING]: ERROR_CATEGORIES.BUSINESS_LOGIC,
    [HOTEL_BOOKING_ERRORS.VALIDATION_FAILED]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.REQUIRED_FIELD_MISSING]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.INVALID_FORMAT]: ERROR_CATEGORIES.VALIDATION,
    [HOTEL_BOOKING_ERRORS.DATABASE_ERROR]: ERROR_CATEGORIES.SYSTEM,
    [HOTEL_BOOKING_ERRORS.API_ERROR]: ERROR_CATEGORIES.SYSTEM,
    [HOTEL_BOOKING_ERRORS.SERVER_ERROR]: ERROR_CATEGORIES.SYSTEM,
    [HOTEL_BOOKING_ERRORS.MAINTENANCE_MODE]: ERROR_CATEGORIES.SYSTEM
  };
  
  return categoryMap[errorCode] || ERROR_CATEGORIES.SYSTEM;
}

/**
 * Create standardized error object
 * @param {string} code - Error code
 * @param {string} message - Error message (optional)
 * @param {Object} details - Additional error details (optional)
 * @returns {Object} - Standardized error object
 */
export function createBookingError(code, message = null, details = {}) {
  return {
    code,
    message: getErrorMessage(code, message),
    severity: getErrorSeverity(code),
    category: getErrorCategory(code),
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Handle API error response
 * @param {Response} response - Fetch API response
 * @param {Object} errorData - Parsed error data
 * @returns {Object} - Standardized error object
 */
export function handleApiError(response, errorData = {}) {
  const statusCode = response?.status;
  let errorCode = HOTEL_BOOKING_ERRORS.API_ERROR;
  let message = errorData?.message || response?.statusText;
  
  // Map HTTP status codes to booking errors
  if (statusCode === 401) {
    errorCode = HOTEL_BOOKING_ERRORS.NOT_AUTHENTICATED;
  } else if (statusCode === 403) {
    errorCode = HOTEL_BOOKING_ERRORS.SESSION_EXPIRED;
  } else if (statusCode === 404) {
    errorCode = HOTEL_BOOKING_ERRORS.HOTEL_NOT_FOUND;
  } else if (statusCode === 422) {
    errorCode = HOTEL_BOOKING_ERRORS.VALIDATION_FAILED;
  } else if (statusCode === 429) {
    errorCode = HOTEL_BOOKING_ERRORS.BOOKING_LIMIT_EXCEEDED;
  } else if (statusCode >= 500) {
    errorCode = HOTEL_BOOKING_ERRORS.SERVER_ERROR;
  }
  
  return createBookingError(errorCode, message, {
    statusCode,
    url: response?.url,
    method: response?.method,
    apiError: errorData
  });
}

/**
 * Handle network error
 * @param {Error} error - Network error object
 * @returns {Object} - Standardized error object
 */
export function handleNetworkError(error) {
  let errorCode = HOTEL_BOOKING_ERRORS.NETWORK_ERROR;
  let message = error?.message;
  
  if (error?.name === 'AbortError') {
    errorCode = HOTEL_BOOKING_ERRORS.NETWORK_ERROR;
    message = 'Request was aborted or timed out.';
  } else if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    errorCode = HOTEL_BOOKING_ERRORS.NETWORK_ERROR;
    message = 'Network connection failed. Please check your internet connection.';
  }
  
  return createBookingError(errorCode, message, {
    originalError: error,
    errorType: error?.name
  });
}

/**
 * Validate booking data and return validation errors
 * @param {Object} bookingData - Booking data to validate
 * @returns {Array} - Array of validation errors
 */
export function validateBookingData(bookingData) {
  const errors = [];
  
  // Validate dates
  if (!bookingData.checkIn || !bookingData.checkOut) {
    errors.push(createBookingError(
      HOTEL_BOOKING_ERRORS.DATES_INVALID,
      'Check-in and check-out dates are required'
    ));
  } else {
    const checkIn = new Date(bookingData.checkIn);
    const checkOut = new Date(bookingData.checkOut);
    const now = new Date();
    
    if (checkIn < now) {
      errors.push(createBookingError(
        HOTEL_BOOKING_ERRORS.CHECK_IN_PAST,
        'Check-in date cannot be in the past'
      ));
    }
    
    if (checkOut <= checkIn) {
      errors.push(createBookingError(
        HOTEL_BOOKING_ERRORS.CHECK_OUT_BEFORE_CHECK_IN,
        'Check-out date must be after check-in date'
      ));
    }
  }
  
  // Validate guests
  if (!bookingData.guests || bookingData.guests.adults < 1) {
    errors.push(createBookingError(
      HOTEL_BOOKING_ERRORS.GUEST_COUNT_INVALID,
      'At least one adult guest is required'
    ));
  }
  
  // Validate rooms
  if (!bookingData.rooms || bookingData.rooms.length === 0) {
    errors.push(createBookingError(
      HOTEL_BOOKING_ERRORS.ROOMS_NOT_AVAILABLE,
      'At least one room must be selected'
    ));
  }
  
  // Validate guest info
  if (bookingData.guestDetails) {
    if (!bookingData.guestDetails.firstName) {
      errors.push(createBookingError(
        HOTEL_BOOKING_ERRORS.GUEST_INFO_INCOMPLETE,
        'First name is required'
      ));
    }
    
    if (!bookingData.guestDetails.lastName) {
      errors.push(createBookingError(
        HOTEL_BOOKING_ERRORS.GUEST_INFO_INCOMPLETE,
        'Last name is required'
      ));
    }
    
    if (!bookingData.guestDetails.email) {
      errors.push(createBookingError(
        HOTEL_BOOKING_ERRORS.GUEST_INFO_INCOMPLETE,
        'Email address is required'
      ));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.guestDetails.email)) {
      errors.push(createBookingError(
        HOTEL_BOOKING_ERRORS.INVALID_EMAIL,
        'Please enter a valid email address'
      ));
    }
  }
  
  return errors;
}

/**
 * Log error for debugging and monitoring
 * @param {Object} error - Error object to log
 * @param {Object} context - Additional context information
 */
export function logBookingError(error, context = {}) {
  const logData = {
    error,
    context,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Hotel Booking Error:', logData);
  }
  
  // In production, you would send this to your error tracking service
  // Example: Sentry.captureException(error, { extra: context });
}

/**
 * Get user-friendly error recovery suggestions
 * @param {Object} error - Error object
 * @returns {Array} - Array of recovery suggestions
 */
export function getErrorRecoverySuggestions(error) {
  const suggestions = [];
  
  switch (error.code) {
    case HOTEL_BOOKING_ERRORS.NETWORK_ERROR:
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
      break;
      
    case HOTEL_BOOKING_ERRORS.NOT_AUTHENTICATED:
      suggestions.push('Log in to your account');
      suggestions.push('Create an account if you don\'t have one');
      break;
      
    case HOTEL_BOOKING_ERRORS.ROOMS_NOT_AVAILABLE:
      suggestions.push('Try different dates');
      suggestions.push('Check nearby hotels');
      suggestions.push('Contact hotel directly');
      break;
      
    case HOTEL_BOOKING_ERRORS.PAYMENT_FAILED:
      suggestions.push('Check your payment details');
      suggestions.push('Try a different payment method');
      suggestions.push('Contact your bank if the issue persists');
      break;
      
    case HOTEL_BOOKING_ERRORS.INVALID_PROMO_CODE:
      suggestions.push('Check the promo code spelling');
      suggestions.push('Verify the promo code is still valid');
      suggestions.push('Check promo code terms and conditions');
      break;
      
    default:
      suggestions.push('Try again in a few minutes');
      suggestions.push('Contact customer support if the issue persists');
  }
  
  return suggestions;
}