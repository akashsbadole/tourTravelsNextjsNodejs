import "server-only";

/**
 * Payment Configuration Manager
 * Manages payment provider configurations and settings
 */
class PaymentConfigManager {
  constructor() {
    this.config = null;
    this.environment = process.env.NODE_ENV || "development";
  }

  /**
   * Load configuration from environment variables
   * @returns {Object} Payment configuration
   */
  loadConfiguration() {
    if (this.config) {
      return this.config;
    }

    const config = {
      environment: this.environment,
      defaultProvider: process.env.DEFAULT_PAYMENT_PROVIDER || "stripe",
      providers: {
        stripe: {
          enabled: this.isProviderEnabled("STRIPE"),
          secretKey: process.env.STRIPE_SECRET_KEY,
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PK,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          testMode: this.environment === "development",
        },
        razorpay: {
          enabled: this.isProviderEnabled("RAZORPAY"),
          keyId: process.env.RAZORPAY_KEY_ID,
          keySecret: process.env.RAZORPAY_KEY_SECRET,
          webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
          testMode: this.environment === "development",
          companyLogo: process.env.NEXT_PUBLIC_COMPANY_LOGO || "",
        },
        paypal: {
          enabled: this.isProviderEnabled("PAYPAL"),
          clientId: process.env.PAYPAL_CLIENT_ID,
          clientSecret: process.env.PAYPAL_CLIENT_SECRET,
          webhookId: process.env.PAYPAL_WEBHOOK_ID,
          webhookSecret: process.env.PAYPAL_WEBHOOK_SECRET,
          baseUrl: this.getPayPalBaseUrl(),
          returnUrl: process.env.NEXT_PUBLIC_BASE_URL,
          testMode: this.environment === "development",
        },
      },
      currency: {
        default: process.env.DEFAULT_CURRENCY || "USD",
        supported: (process.env.SUPPORTED_CURRENCIES || "USD,INR,EUR,GBP").split(","),
      },
      features: {
        savePaymentMethods: process.env.ENABLE_SAVED_PAYMENT_METHODS !== "false",
        refunds: process.env.ENABLE_REFUNDS !== "false",
        webhooks: process.env.ENABLE_WEBHOOKS !== "false",
        multiCurrency: process.env.ENABLE_MULTI_CURRENCY !== "false",
        testMode: this.environment === "development",
      },
      security: {
        webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT || "30000"),
        maxRetries: parseInt(process.env.MAX_PAYMENT_RETRIES || "3"),
        idempotencyWindow: parseInt(process.env.IDEMPOTENCY_WINDOW || "3600"),
      },
      logging: {
        enabled: process.env.PAYMENT_LOGGING_ENABLED !== "false",
        level: process.env.PAYMENT_LOG_LEVEL || "info",
        sensitiveDataMasking: process.env.SENSITIVE_DATA_MASKING !== "false",
      },
    };

    // Validate configuration
    this.validateConfiguration(config);

    this.config = config;
    return config;
  }

  /**
   * Check if a provider is enabled
   * @param {string} provider - Provider name prefix
   * @returns {boolean} Whether provider is enabled
   */
  isProviderEnabled(provider) {
    const requiredEnvVars = this.getRequiredEnvVars(provider);
    return requiredEnvVars.every(envVar => process.env[envVar]);
  }

  /**
   * Get required environment variables for a provider
   * @param {string} provider - Provider name prefix
   * @returns {Array} Array of required environment variables
   */
  getRequiredEnvVars(provider) {
    const requiredVars = {
      STRIPE: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PK"],
      RAZORPAY: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
      PAYPAL: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
    };

    return requiredVars[provider] || [];
  }

  /**
   * Get PayPal base URL based on environment
   * @returns {string} PayPal base URL
   */
  getPayPalBaseUrl() {
    if (this.environment === "production") {
      return "https://api-m.paypal.com";
    }
    return "https://api-m.sandbox.paypal.com";
  }

  /**
   * Validate payment configuration
   * @param {Object} config - Configuration object
   */
  validateConfiguration(config) {
    // Check if at least one provider is enabled
    const enabledProviders = Object.values(config.providers).filter(provider => provider.enabled);
    if (enabledProviders.length === 0) {
      throw new Error("At least one payment provider must be enabled");
    }

    // Validate default provider
    if (!config.providers[config.defaultProvider]?.enabled) {
      throw new Error(`Default provider ${config.defaultProvider} is not enabled`);
    }

    // Validate provider configurations
    for (const [providerType, providerConfig] of Object.entries(config.providers)) {
      if (providerConfig.enabled) {
        this.validateProviderConfig(providerType, providerConfig);
      }
    }

    // Validate currency configuration
    if (!config.currency.default || !config.currency.supported.includes(config.currency.default)) {
      throw new Error("Invalid default currency configuration");
    }
  }

  /**
   * Validate individual provider configuration
   * @param {string} providerType - Provider type
   * @param {Object} providerConfig - Provider configuration
   */
  validateProviderConfig(providerType, providerConfig) {
    const requiredFields = {
      stripe: ["secretKey", "publishableKey"],
      razorpay: ["keyId", "keySecret"],
      paypal: ["clientId", "clientSecret", "baseUrl"],
    };

    const fields = requiredFields[providerType];
    if (!fields) {
      return;
    }

    const missingFields = fields.filter(field => !providerConfig[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields for ${providerType}: ${missingFields.join(", ")}`);
    }
  }

  /**
   * Get configuration for a specific provider
   * @param {string} providerType - Provider type
   * @returns {Object} Provider configuration
   */
  getProviderConfig(providerType) {
    const config = this.loadConfiguration();
    return config.providers[providerType];
  }

  /**
   * Get all enabled providers
   * @returns {Array} Array of enabled provider types
   */
  getEnabledProviders() {
    const config = this.loadConfiguration();
    return Object.entries(config.providers)
      .filter(([_, providerConfig]) => providerConfig.enabled)
      .map(([providerType, _]) => providerType);
  }

  /**
   * Check if a feature is enabled
   * @param {string} feature - Feature name
   * @returns {boolean} Whether feature is enabled
   */
  isFeatureEnabled(feature) {
    const config = this.loadConfiguration();
    return config.features[feature] || false;
  }

  /**
   * Get currency configuration
   * @returns {Object} Currency configuration
   */
  getCurrencyConfig() {
    const config = this.loadConfiguration();
    return config.currency;
  }

  /**
   * Get security configuration
   * @returns {Object} Security configuration
   */
  getSecurityConfig() {
    const config = this.loadConfiguration();
    return config.security;
  }

  /**
   * Get logging configuration
   * @returns {Object} Logging configuration
   */
  getLoggingConfig() {
    const config = this.loadConfiguration();
    return config.logging;
  }

  /**
   * Get environment-specific configuration
   * @returns {Object} Environment configuration
   */
  getEnvironmentConfig() {
    const config = this.loadConfiguration();
    return {
      environment: config.environment,
      testMode: config.features.testMode,
      isDevelopment: config.environment === "development",
      isProduction: config.environment === "production",
    };
  }

  /**
   * Get frontend-safe configuration
   * @returns {Object} Frontend configuration
   */
  getFrontendConfig() {
    const config = this.loadConfiguration();
    
    return {
      defaultProvider: config.defaultProvider,
      enabledProviders: this.getEnabledProviders(),
      currency: config.currency,
      features: {
        savePaymentMethods: config.features.savePaymentMethods,
        refunds: config.features.refunds,
        multiCurrency: config.features.multiCurrency,
        testMode: config.features.testMode,
      },
      environment: {
        isDevelopment: config.environment === "development",
        isProduction: config.environment === "production",
      },
      providers: {
        stripe: config.providers.stripe.enabled ? {
          publishableKey: config.providers.stripe.publishableKey,
        } : null,
        razorpay: config.providers.razorpay.enabled ? {
          keyId: config.providers.razorpay.keyId,
          companyLogo: config.providers.razorpay.companyLogo,
        } : null,
        paypal: config.providers.paypal.enabled ? {
          clientId: config.providers.paypal.clientId,
          testMode: config.providers.paypal.testMode,
        } : null,
      },
    };
  }

  /**
   * Update configuration (for runtime updates)
   * @param {Object} updates - Configuration updates
   */
  updateConfiguration(updates) {
    if (!this.config) {
      this.loadConfiguration();
    }

    // Deep merge updates
    this.config = this.deepMerge(this.config, updates);
    
    // Re-validate configuration
    this.validateConfiguration(this.config);
  }

  /**
   * Deep merge objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Reset configuration cache
   */
  resetCache() {
    this.config = null;
  }
}

// Create singleton instance
const paymentConfig = new PaymentConfigManager();

export default paymentConfig;
export { PaymentConfigManager };