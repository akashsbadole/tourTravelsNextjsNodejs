import "server-only";
import paymentConfig from "./config.js";

/**
 * Payment Logger
 * Centralized logging for payment operations
 */
class PaymentLogger {
  constructor() {
    this.config = paymentConfig.getLoggingConfig();
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  /**
   * Log payment operation
   * @param {string} level - Log level (info, warn, error, debug)
   * @param {string} operation - Operation type (create_intent, confirm_payment, etc.)
   * @param {string} provider - Payment provider
   * @param {Object} data - Data to log
   * @param {Error} error - Error object (if any)
   */
  log(level, operation, provider, data = {}, error = null) {
    if (!this.config.enabled) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      operation,
      provider,
      data: this.maskSensitiveData(data),
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code,
        type: error.type,
      } : null,
      environment: process.env.NODE_ENV,
    };

    // Only log if level is enabled
    const logLevels = ["DEBUG", "INFO", "WARN", "ERROR"];
    const currentLevelIndex = logLevels.indexOf(level.toUpperCase());
    const configLevelIndex = logLevels.indexOf(this.config.level.toUpperCase());

    if (currentLevelIndex >= configLevelIndex) {
      this.writeLog(logEntry);
    }

    // In development, also log to console
    if (this.isDevelopment) {
      this.logToConsole(logEntry);
    }
  }

  /**
   * Write log to appropriate destination
   * @param {Object} logEntry - Log entry
   */
  writeLog(logEntry) {
    try {
      // In production, you might want to write to a file or external service
      if (this.isDevelopment) {
        console.log(`[PAYMENT] ${JSON.stringify(logEntry, null, 2)}`);
      } else {
        // In production, you could write to a logging service
        // For now, we'll use console with structured format
        console.log(`[PAYMENT] ${JSON.stringify(logEntry, null, 2)}`);
      }
    } catch (error) {
      console.error("Failed to write payment log:", error);
    }
  }

  /**
   * Log to console with formatting
   * @param {Object} logEntry - Log entry
   */
  logToConsole(logEntry) {
    const prefix = `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.operation}] [${logEntry.provider}]`;
    
    if (logEntry.error) {
      console.error(prefix, logEntry.data, logEntry.error);
    } else {
      console.log(prefix, logEntry.data);
    }
  }

  /**
   * Mask sensitive data in logs
   * @param {Object} data - Data to mask
   * @returns {Object} Masked data
   */
  maskSensitiveData(data) {
    if (!this.config.sensitiveDataMasking) {
      return data;
    }

    const masked = { ...data };

    // Mask common sensitive fields
    const sensitiveFields = [
      "clientSecret",
      "paymentIntentId",
      "paymentMethodId",
      "customerId",
      "apiKey",
      "secretKey",
      "webhookSecret",
      "cardNumber",
      "cvc",
      "expiry",
      "token",
    ];

    sensitiveFields.forEach(field => {
      if (masked[field]) {
        masked[field] = this.maskValue(masked[field]);
      }
    });

    // Mask nested objects
    Object.keys(masked).forEach(key => {
      if (typeof masked[key] === "object" && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    });

    return masked;
  }

  /**
   * Mask a sensitive value
   * @param {string} value - Value to mask
   * @returns {string} Masked value
   */
  maskValue(value) {
    if (!value || typeof value !== "string") {
      return value;
    }

    if (value.length <= 4) {
      return "*".repeat(value.length);
    }

    return value.substring(0, 2) + "*".repeat(value.length - 4) + value.substring(value.length - 2);
  }

  /**
   * Convenience methods for different log levels
   */
  info(operation, provider, data) {
    this.log("info", operation, provider, data);
  }

  warn(operation, provider, data) {
    this.log("warn", operation, provider, data);
  }

  error(operation, provider, data, error) {
    this.log("error", operation, provider, data, error);
  }

  debug(operation, provider, data) {
    this.log("debug", operation, provider, data);
  }

  /**
   * Log payment intent creation
   * @param {string} provider - Payment provider
   * @param {Object} requestData - Request data
   * @param {Object} responseData - Response data
   * @param {Error} error - Error (if any)
   */
  logPaymentIntent(provider, requestData, responseData = null, error = null) {
    const logData = {
      requestId: requestData.idempotencyKey,
      amount: requestData.amount,
      currency: requestData.currency,
      customerId: requestData.customerId,
      metadata: requestData.metadata,
      responseStatus: responseData?.status,
      responseId: responseData?.id,
    };

    if (error) {
      this.error("create_payment_intent", provider, logData, error);
    } else {
      this.info("create_payment_intent", provider, logData);
    }
  }

  /**
   * Log payment confirmation
   * @param {string} provider - Payment provider
   * @param {Object} requestData - Request data
   * @param {Object} responseData - Response data
   * @param {Error} error - Error (if any)
   */
  logPaymentConfirmation(provider, requestData, responseData = null, error = null) {
    const logData = {
      paymentIntentId: requestData.paymentIntentId,
      paymentMethodId: requestData.paymentMethodId,
      amount: requestData.amount,
      currency: requestData.currency,
      status: responseData?.status,
    };

    if (error) {
      this.error("confirm_payment", provider, logData, error);
    } else {
      this.info("confirm_payment", provider, logData);
    }
  }

  /**
   * Log webhook processing
   * @param {string} provider - Payment provider
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @param {Error} error - Error (if any)
   */
  logWebhook(provider, eventType, eventData, error = null) {
    const logData = {
      eventType,
      eventId: eventData.id,
      processed: error ? false : true,
    };

    if (error) {
      this.error("process_webhook", provider, logData, error);
    } else {
      this.info("process_webhook", provider, logData);
    }
  }

  /**
   * Log refund operation
   * @param {string} provider - Payment provider
   * @param {Object} requestData - Request data
   * @param {Object} responseData - Response data
   * @param {Error} error - Error (if any)
   */
  logRefund(provider, requestData, responseData = null, error = null) {
    const logData = {
      paymentId: requestData.paymentId,
      amount: requestData.amount,
      currency: requestData.currency,
      reason: requestData.reason,
      refundId: responseData?.id,
      status: responseData?.status,
    };

    if (error) {
      this.error("process_refund", provider, logData, error);
    } else {
      this.info("process_refund", provider, logData);
    }
  }

  /**
   * Log customer operations
   * @param {string} provider - Payment provider
   * @param {string} operation - Operation type
   * @param {Object} requestData - Request data
   * @param {Object} responseData - Response data
   * @param {Error} error - Error (if any)
   */
  logCustomerOperation(provider, operation, requestData, responseData = null, error = null) {
    const logData = {
      operation,
      customerEmail: requestData.email,
      customerId: responseData?.id,
    };

    if (error) {
      this.error("customer_operation", provider, logData, error);
    } else {
      this.info("customer_operation", provider, logData);
    }
  }
}

// Create singleton instance
const paymentLogger = new PaymentLogger();

export default paymentLogger;
export { PaymentLogger };