import "server-only";
import paymentFactory from "./factory.js";
import paymentConfig from "./config.js";
import paymentLogger from "./logger.js";

/**
 * Initialize payment system
 * Should be called during application startup
 */
export async function initializePaymentSystem() {
  try {
    // Load configuration
    const config = paymentConfig.loadConfiguration();
    
    // Initialize factory with configuration
    await paymentFactory.initialize(config);
    
    paymentLogger.info("initialize_payment_system", "system", {
      enabledProviders: paymentFactory.getAvailableProviders(),
      defaultProvider: paymentFactory.getDefaultProviderType(),
      currency: config.currency,
      features: config.features,
    });

    return {
      success: true,
      providers: paymentFactory.getAvailableProviders(),
      defaultProvider: paymentFactory.getDefaultProviderType(),
      config: config,
    };
  } catch (error) {
    paymentLogger.error("initialize_payment_system", "system", {}, error);
    
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get payment factory instance
 * @returns {PaymentProviderFactory} Factory instance
 */
export function getPaymentFactory() {
  return paymentFactory;
}

/**
 * Get payment configuration
 * @returns {Object} Payment configuration
 */
export function getPaymentConfig() {
  return paymentConfig.loadConfiguration();
}

/**
 * Get payment logger
 * @returns {PaymentLogger} Logger instance
 */
export function getPaymentLogger() {
  return paymentLogger;
}

/**
 * Check if payment system is initialized
 * @returns {boolean} Whether system is initialized
 */
export function isPaymentSystemInitialized() {
  try {
    const factory = getPaymentFactory();
    const config = getPaymentConfig();
    
    return factory && config;
  } catch (error) {
    return false;
  }
}

/**
 * Get provider for currency
 * @param {string} currency - Currency code
 * @returns {PaymentProvider} Provider instance
 */
export function getProviderForCurrency(currency) {
  const factory = getPaymentFactory();
  return factory.getProviderByCurrency(currency);
}

/**
 * Get provider for payment method
 * @param {string} paymentMethod - Payment method type
 * @returns {PaymentProvider} Provider instance
 */
export async function getProviderForPaymentMethod(paymentMethod) {
  const factory = getPaymentFactory();
  return await factory.getProviderByPaymentMethod(paymentMethod);
}

/**
 * Get all supported payment methods
 * @returns {Promise<Array>} Supported payment methods
 */
export async function getAllSupportedPaymentMethods() {
  const factory = getPaymentFactory();
  return await factory.getAllSupportedPaymentMethods();
}

/**
 * Get frontend payment configuration
 * @returns {Object} Frontend configuration
 */
export function getFrontendPaymentConfig() {
  const factory = getPaymentFactory();
  return factory.getFrontendConfig();
}

/**
 * Validate payment provider
 * @param {string} provider - Provider type
 * @returns {Promise<boolean>} Whether provider is valid and available
 */
export async function validatePaymentProvider(provider) {
  try {
    const factory = getPaymentFactory();
    
    // Check if provider exists
    const availableProviders = factory.getAvailableProviders();
    if (!availableProviders.includes(provider)) {
      return false;
    }

    // Check if provider is available
    return await factory.isProviderAvailable(provider);
  } catch (error) {
    paymentLogger.error("validate_payment_provider", provider, { provider }, error);
    return false;
  }
}

/**
 * Process payment with automatic provider selection
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} Payment result
 */
export async function processPayment(paymentData) {
  try {
    const factory = getPaymentFactory();
    
    // Auto-select provider based on currency or explicit choice
    const provider = paymentData.provider 
      ? factory.getProvider(paymentData.provider)
      : factory.getProviderByCurrency(paymentData.currency || "USD");

    paymentLogger.info("auto_process_payment", provider.getProviderType(), {
      currency: paymentData.currency,
      amount: paymentData.amount,
      autoSelected: !paymentData.provider,
    });

    // Create payment intent
    const result = await provider.createPaymentIntent(paymentData);
    
    if (result.success) {
      paymentLogger.info("payment_intent_created", provider.getProviderType(), {
        paymentIntentId: result.data.id,
        amount: paymentData.amount,
        currency: paymentData.currency,
      });
    } else {
      paymentLogger.error("payment_intent_failed", provider.getProviderType(), {
        error: result.error,
      });
    }

    return result;
  } catch (error) {
    paymentLogger.error("process_payment_error", "system", { paymentData }, error);
    
    return {
      success: false,
      error: {
        message: error.message,
        type: "system_error",
      },
    };
  }
}