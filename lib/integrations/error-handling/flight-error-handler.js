import "server-only";

/**
 * Flight Error Handler
 * Centralized error handling for flight operations with fallback strategies
 */
export class FlightErrorHandler {
  constructor(options = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      timeoutDelay: 5000, // 5 seconds
      enableFallback: true,
      logErrors: true,
      ...options
    };
    
    this.errorCounts = new Map();
    this.lastErrors = new Map();
  }

  /**
   * Handle flight operation with retry and fallback
   * @param {Function} operation - Operation to execute
   * @param {Object} context - Operation context
   * @param {Function} fallbackOperation - Fallback operation
   * @returns {Promise<Object>} Operation result
   */
  async handleOperation(operation, context = {}, fallbackOperation = null) {
    const operationKey = this.generateOperationKey(context);
    let lastError = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const result = await this.executeWithTimeout(operation, this.options.timeoutDelay);
        
        // Reset error count on success
        this.errorCounts.delete(operationKey);
        this.lastErrors.delete(operationKey);
        
        return {
          success: true,
          data: result,
          attempts: attempt,
          context
        };

      } catch (error) {
        lastError = error;
        this.recordError(operationKey, error);

        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          break;
        }

        // Wait before retry
        if (attempt < this.options.maxRetries) {
          await this.delay(this.options.retryDelay * attempt);
        }
      }
    }

    // All retries failed, try fallback if available
    if (this.options.enableFallback && fallbackOperation) {
      try {
        console.warn(`Primary operation failed, attempting fallback for ${operationKey}:`, lastError.message);
        
        const fallbackResult = await this.executeWithTimeout(fallbackOperation, this.options.timeoutDelay);
        
        return {
          success: true,
          data: fallbackResult,
          attempts: this.options.maxRetries + 1,
          fallback: true,
          context,
          primaryError: lastError.message
        };

      } catch (fallbackError) {
        console.error(`Fallback operation also failed for ${operationKey}:`, fallbackError.message);
        
        return {
          success: false,
          error: fallbackError.message,
          attempts: this.options.maxRetries + 1,
          fallback: true,
          context,
          primaryError: lastError.message,
          fallbackError: fallbackError.message
        };
      }
    }

    // No fallback available or fallback also failed
    return {
      success: false,
      error: lastError.message,
      attempts: this.options.maxRetries,
      context,
      errorDetails: {
        type: this.categorizeError(lastError),
        code: lastError.code || 'UNKNOWN',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Handle batch operations with partial failure tolerance
   * @param {Array} operations - Array of operations
   * @param {Object} context - Operation context
   * @param {number} tolerance - Failure tolerance (0-1)
   * @returns {Promise<Object>} Batch operation result
   */
  async handleBatchOperation(operations, context = {}, tolerance = 0) {
    const results = [];
    let successCount = 0;
    let errors = [];

    for (const operation of operations) {
      try {
        const result = await this.executeWithTimeout(operation, this.options.timeoutDelay);
        results.push({ success: true, data: result });
        successCount++;
      } catch (error) {
        results.push({ success: false, error: error.message });
        errors.push(error);
      }
    }

    const successRate = successCount / operations.length;
    const batchSuccess = successRate >= (1 - tolerance);

    return {
      success: batchSuccess,
      data: results,
      metadata: {
        totalOperations: operations.length,
        successCount,
        errorCount: errors.length,
        successRate: Math.round(successRate * 100) / 100,
        tolerance
      },
      context
    };
  }

  /**
   * Execute operation with timeout
   * @param {Function} operation - Operation to execute
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Operation result
   */
  async executeWithTimeout(operation, timeout) {
    return Promise.race([
      operation(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeout);
      })
    ]);
  }

  /**
   * Record error for tracking
   * @param {string} operationKey - Operation identifier
   * @param {Error} error - Error to record
   */
  recordError(operationKey, error) {
    const count = this.errorCounts.get(operationKey) || 0;
    this.errorCounts.set(operationKey, count + 1);
    this.lastErrors.set(operationKey, {
      error: error.message,
      timestamp: new Date().toISOString(),
      count: count + 1
    });

    if (this.options.logErrors) {
      console.error(`Flight operation error [${operationKey}]:`, {
        error: error.message,
        code: error.code,
        count: count + 1,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - Error to check
   * @returns {boolean} Whether to skip retry
   */
  shouldNotRetry(error) {
    const noRetryErrors = [
      'INVALID_PARAMETERS',
      'AUTHENTICATION_FAILED',
      'AUTHORIZATION_FAILED',
      'FORBIDDEN',
      'NOT_FOUND'
    ];

    const noRetryCodes = [400, 401, 403, 404];

    return noRetryErrors.includes(error.code) || 
           noRetryCodes.includes(error.status) ||
           error.message.includes('Invalid') ||
           error.message.includes('Authentication') ||
           error.message.includes('Authorization');
  }

  /**
   * Categorize error type
   * @param {Error} error - Error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return 'TIMEOUT';
    }

    if (error.message.includes('network') || error.message.includes('Network')) {
      return 'NETWORK';
    }

    if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
      return 'RATE_LIMIT';
    }

    if (error.message.includes('authentication') || error.message.includes('Authentication')) {
      return 'AUTHENTICATION';
    }

    if (error.message.includes('availability') || error.message.includes('Availability')) {
      return 'AVAILABILITY';
    }

    if (error.message.includes('pricing') || error.message.includes('Pricing')) {
      return 'PRICING';
    }

    return 'UNKNOWN';
  }

  /**
   * Generate operation key for tracking
   * @param {Object} context - Operation context
   * @returns {string} Operation key
   */
  generateOperationKey(context) {
    const parts = [
      context.operation || 'unknown',
      context.provider || 'unknown',
      context.origin || '',
      context.destination || ''
    ];

    return parts.filter(part => part).join(':').toLowerCase();
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {
      totalErrors: 0,
      errorsByType: {},
      errorsByOperation: {},
      recentErrors: []
    };

    // Count total errors and categorize
    for (const [operationKey, errorData] of this.lastErrors) {
      stats.totalErrors += errorData.count;
      stats.errorsByOperation[operationKey] = errorData.count;
      stats.recentErrors.push({
        operation: operationKey,
        error: errorData.error,
        count: errorData.count,
        timestamp: errorData.timestamp
      });
    }

    // Sort recent errors by timestamp
    stats.recentErrors.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Keep only last 50 errors
    stats.recentErrors = stats.recentErrors.slice(0, 50);

    return stats;
  }

  /**
   * Reset error statistics
   */
  resetStats() {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Error to translate
   * @param {Object} context - Error context
   * @returns {string} User-friendly message
   */
  getUserFriendlyMessage(error, context = {}) {
    const errorCategory = this.categorizeError(error);

    const messages = {
      TIMEOUT: 'The request took too long to complete. Please try again.',
      NETWORK: 'Network connection issue. Please check your internet connection and try again.',
      RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
      AUTHENTICATION: 'Authentication failed. Please check your credentials and try again.',
      AVAILABILITY: 'Flight availability could not be checked. Please try again later.',
      PRICING: 'Pricing information is currently unavailable. Please try again.',
      UNKNOWN: 'An unexpected error occurred. Please try again.'
    };

    // Add context-specific messages
    if (context.operation === 'search') {
      messages.TIMEOUT = 'Flight search is taking longer than expected. Please try again.';
      messages.NETWORK = 'Unable to search for flights. Please check your internet connection.';
      messages.AVAILABILITY = 'Unable to check flight availability at this time.';
    }

    if (context.operation === 'booking') {
      messages.TIMEOUT = 'Booking is taking longer than expected. Please try again.';
      messages.NETWORK = 'Unable to complete booking. Please check your internet connection.';
      messages.AVAILABILITY = 'Selected flights are no longer available. Please search again.';
    }

    return messages[errorCategory] || messages.UNKNOWN;
  }

  /**
   * Create standardized error response
   * @param {Error} error - Original error
   * @param {Object} context - Error context
   * @returns {Object} Standardized error response
   */
  createErrorResponse(error, context = {}) {
    return {
      success: false,
      error: {
        message: this.getUserFriendlyMessage(error, context),
        technical: error.message,
        code: error.code || 'UNKNOWN',
        category: this.categorizeError(error),
        context,
        timestamp: new Date().toISOString(),
        retryable: !this.shouldNotRetry(error)
      }
    };
  }
}

// Singleton instance
let errorHandlerInstance = null;

/**
 * Get or create flight error handler instance
 * @param {Object} options - Configuration options
 * @returns {FlightErrorHandler} Error handler instance
 */
export function getFlightErrorHandler(options) {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new FlightErrorHandler(options);
  }
  return errorHandlerInstance;
}

export { FlightErrorHandler };