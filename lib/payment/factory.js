import "server-only";
import { StripeProvider } from "./providers/stripe.js";
import { RazorpayProvider } from "./providers/razorpay.js";
import { PayPalProvider } from "./providers/paypal.js";

/**
 * Payment Provider Factory
 * Manages creation and configuration of payment providers
 */
class PaymentProviderFactory {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
    this.initialized = false;
  }

  /**
   * Initialize the factory with provider configurations
   * @param {Object} config - Configuration object
   */
  async initialize(config) {
    if (this.initialized) {
      return;
    }

    // Register providers
    this.registerProvider("stripe", StripeProvider);
    this.registerProvider("razorpay", RazorpayProvider);
    this.registerProvider("paypal", PayPalProvider);

    // Initialize enabled providers
    for (const [providerType, providerConfig] of Object.entries(config.providers)) {
      if (providerConfig.enabled) {
        await this.initializeProvider(providerType, providerConfig);
      }
    }

    // Set default provider
    this.defaultProvider = config.defaultProvider || "stripe";

    this.initialized = true;
  }

  /**
   * Register a payment provider class
   * @param {string} type - Provider type
   * @param {Class} ProviderClass - Provider class
   */
  registerProvider(type, ProviderClass) {
    this.providers.set(type, ProviderClass);
  }

  /**
   * Initialize a specific provider
   * @param {string} type - Provider type
   * @param {Object} config - Provider configuration
   */
  async initializeProvider(type, config) {
    const ProviderClass = this.providers.get(type);
    if (!ProviderClass) {
      throw new Error(`Payment provider ${type} is not registered`);
    }

    const provider = new ProviderClass(config);
    await provider.initialize(config);

    // Store initialized provider
    this.providers.set(type, provider);
  }

  /**
   * Get a payment provider instance
   * @param {string} type - Provider type (optional, uses default if not provided)
   * @returns {PaymentProvider} Provider instance
   */
  getProvider(type = null) {
    if (!this.initialized) {
      throw new Error("PaymentProviderFactory is not initialized");
    }

    const providerType = type || this.defaultProvider;
    const provider = this.providers.get(providerType);

    if (!provider) {
      throw new Error(`Payment provider ${providerType} is not available`);
    }

    return provider;
  }

  /**
   * Get all available providers
   * @returns {Array} Array of available provider types
   */
  getAvailableProviders() {
    if (!this.initialized) {
      return [];
    }

    const availableProviders = [];
    for (const [type, provider] of this.providers.entries()) {
      if (typeof provider.isAvailable === 'function') {
        // Check if provider is available
        provider.isAvailable().then(isAvailable => {
          if (isAvailable) {
            availableProviders.push(type);
          }
        }).catch(() => {
          // Provider not available, skip
        });
      } else {
        // Assume available if no check method
        availableProviders.push(type);
      }
    }

    return availableProviders;
  }

  /**
   * Get provider by currency
   * @param {string} currency - Currency code
   * @returns {PaymentProvider} Best provider for the currency
   */
  getProviderByCurrency(currency) {
    if (!this.initialized) {
      throw new Error("PaymentProviderFactory is not initialized");
    }

    const currencyUpper = currency.toUpperCase();
    
    // Currency to provider mapping
    const currencyProviderMap = {
      'INR': 'razorpay',
      'USD': 'stripe',
      'EUR': 'stripe',
      'GBP': 'stripe',
    };

    // Try to get provider by currency
    const preferredProvider = currencyProviderMap[currencyUpper];
    if (preferredProvider && this.providers.has(preferredProvider)) {
      return this.providers.get(preferredProvider);
    }

    // Fallback to default provider
    return this.getProvider(this.defaultProvider);
  }

  /**
   * Get provider by payment method
   * @param {string} paymentMethod - Payment method type
   * @returns {PaymentProvider} Best provider for the payment method
   */
  async getProviderByPaymentMethod(paymentMethod) {
    if (!this.initialized) {
      throw new Error("PaymentProviderFactory is not initialized");
    }

    // Payment method to provider mapping
    const methodProviderMap = {
      'upi': 'razorpay',
      'netbanking': 'razorpay',
      'wallet': 'razorpay',
      'emi': 'razorpay',
    };

    // Try to get provider by payment method
    const preferredProvider = methodProviderMap[paymentMethod];
    if (preferredProvider && this.providers.has(preferredProvider)) {
      return this.providers.get(preferredProvider);
    }

    // Check which providers support this payment method
    for (const [type, provider] of this.providers.entries()) {
      try {
        const supportedMethods = await provider.getSupportedPaymentMethods();
        if (supportedMethods.some(method => method.type === paymentMethod)) {
          return provider;
        }
      } catch (error) {
        console.error(`Error checking payment methods for ${type}:`, error);
      }
    }

    // Fallback to default provider
    return this.getProvider(this.defaultProvider);
  }

  /**
   * Get all supported payment methods across all providers
   * @returns {Array} Array of supported payment methods
   */
  async getAllSupportedPaymentMethods() {
    if (!this.initialized) {
      return [];
    }

    const allMethods = new Map();

    for (const [type, provider] of this.providers.entries()) {
      try {
        const methods = await provider.getSupportedPaymentMethods();
        methods.forEach(method => {
          if (!allMethods.has(method.type)) {
            allMethods.set(method.type, {
              ...method,
              providers: [],
            });
          }
          allMethods.get(method.type).providers.push(type);
        });
      } catch (error) {
        console.error(`Error getting payment methods for ${type}:`, error);
      }
    }

    return Array.from(allMethods.values());
  }

  /**
   * Get client configurations for all providers
   * @returns {Object} Client configurations
   */
  getClientConfigs() {
    if (!this.initialized) {
      return {};
    }

    const configs = {};
    for (const [type, provider] of this.providers.entries()) {
      try {
        configs[type] = provider.getClientConfig();
      } catch (error) {
        console.error(`Error getting client config for ${type}:`, error);
      }
    }

    return configs;
  }

  /**
   * Set default provider
   * @param {string} type - Provider type
   */
  setDefaultProvider(type) {
    if (!this.providers.has(type)) {
      throw new Error(`Payment provider ${type} is not available`);
    }

    this.defaultProvider = type;
  }

  /**
   * Get default provider type
   * @returns {string} Default provider type
   */
  getDefaultProviderType() {
    return this.defaultProvider;
  }

  /**
   * Check if a provider is available
   * @param {string} type - Provider type
   * @returns {Promise<boolean>} Whether provider is available
   */
  async isProviderAvailable(type) {
    if (!this.initialized) {
      return false;
    }

    const provider = this.providers.get(type);
    if (!provider) {
      return false;
    }

    try {
      return await provider.isAvailable();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get provider configuration for frontend
   * @returns {Object} Frontend configuration
   */
  getFrontendConfig() {
    if (!this.initialized) {
      return {
        enabled: false,
        providers: [],
        defaultProvider: null,
      };
    }

    return {
      enabled: true,
      providers: Array.from(this.providers.keys()),
      defaultProvider: this.defaultProvider,
      clientConfigs: this.getClientConfigs(),
    };
  }
}

// Create singleton instance
const paymentFactory = new PaymentProviderFactory();

export default paymentFactory;
export { PaymentProviderFactory };