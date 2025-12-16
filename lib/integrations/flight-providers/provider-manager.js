import "server-only";
import { AmadeusProvider } from './amadeus-provider';
import { StaticProvider } from './static-provider';

/**
 * Flight Provider Manager
 * Manages multiple flight data providers with fallback and load balancing
 */
export class FlightProviderManager {
  constructor(config = {}) {
    this.providers = new Map();
    this.primaryProvider = null;
    this.fallbackProvider = null;
    this.config = config;
    
    this.initializeProviders();
  }

  /**
   * Initialize available providers
   */
  initializeProviders() {
    // Initialize Amadeus provider if configured
    if (this.config.amadeus?.enabled) {
      const amadeusProvider = new AmadeusProvider({
        apiKey: this.config.amadeus.apiKey,
        apiSecret: this.config.amadeus.apiSecret,
        baseUrl: this.config.amadeus.baseUrl,
        ...this.config.amadeus.options
      });
      this.providers.set('amadeus', amadeusProvider);
      
      if (!this.primaryProvider) {
        this.primaryProvider = amadeusProvider;
      }
    }

    // Initialize static provider as fallback
    const staticProvider = new StaticProvider(this.config.static || {});
    this.providers.set('static', staticProvider);
    
    if (!this.fallbackProvider) {
      this.fallbackProvider = staticProvider;
    }

    // If no primary provider configured, use static as primary
    if (!this.primaryProvider) {
      this.primaryProvider = staticProvider;
    }
  }

  /**
   * Search flights with provider fallback
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchFlights(searchParams, options = {}) {
    const { useCache = true, timeout = 30000 } = options;
    const results = {
      success: false,
      data: [],
      provider: null,
      metadata: {
        searchTime: 0,
        totalResults: 0,
        sources: []
      }
    };

    const startTime = Date.now();

    try {
      // Try primary provider first
      if (this.primaryProvider) {
        try {
          const healthStatus = await this.primaryProvider.healthCheck();
          
          if (healthStatus) {
            const providerResults = await this.withTimeout(
              this.primaryProvider.searchFlights(searchParams),
              timeout
            );

            if (providerResults && Array.isArray(providerResults)) {
              results.success = true;
              results.data = providerResults;
              results.provider = this.primaryProvider.name;
              results.metadata.searchTime = Date.now() - startTime;
              results.metadata.totalResults = providerResults.length;
              results.metadata.sources.push({
                provider: this.primaryProvider.name,
                success: true,
                resultCount: providerResults.length
              });

              return results;
            }
          }
        } catch (error) {
          console.error(`Primary provider (${this.primaryProvider.name}) failed:`, error);
          results.metadata.sources.push({
            provider: this.primaryProvider.name,
            success: false,
            error: error.message
          });
        }
      }

      // Fallback to static provider if primary failed
      if (this.fallbackProvider && this.fallbackProvider !== this.primaryProvider) {
        try {
          const fallbackResults = await this.withTimeout(
            this.fallbackProvider.searchFlights(searchParams),
            timeout
          );

          if (fallbackResults && Array.isArray(fallbackResults)) {
            results.success = true;
            results.data = fallbackResults;
            results.provider = this.fallbackProvider.name;
            results.metadata.searchTime = Date.now() - startTime;
            results.metadata.totalResults = fallbackResults.length;
            results.metadata.sources.push({
              provider: this.fallbackProvider.name,
              success: true,
              resultCount: fallbackResults.length,
              fallback: true
            });

            return results;
          }
        } catch (error) {
          console.error(`Fallback provider (${this.fallbackProvider.name}) failed:`, error);
          results.metadata.sources.push({
            provider: this.fallbackProvider.name,
            success: false,
            error: error.message,
            fallback: true
          });
        }
      }

      // All providers failed
      results.error = 'All flight providers failed';
      results.metadata.searchTime = Date.now() - startTime;
      
      return results;

    } catch (error) {
      console.error('Flight search manager error:', error);
      results.error = error.message;
      results.metadata.searchTime = Date.now() - startTime;
      
      return results;
    }
  }

  /**
   * Check availability with fallback
   * @param {Array} flightIds - Flight IDs
   * @param {Object} options - Options
   * @returns {Promise<Object>} Availability results
   */
  async checkAvailability(flightIds, options = {}) {
    const { timeout = 15000 } = options;

    try {
      // Try primary provider first
      if (this.primaryProvider) {
        try {
          const result = await this.withTimeout(
            this.primaryProvider.checkAvailability(flightIds, options),
            timeout
          );
          
          if (result.success) {
            return {
              ...result,
              provider: this.primaryProvider.name
            };
          }
        } catch (error) {
          console.error(`Primary provider availability check failed:`, error);
        }
      }

      // Fallback to static provider
      if (this.fallbackProvider) {
        try {
          const result = await this.withTimeout(
            this.fallbackProvider.checkAvailability(flightIds, options),
            timeout
          );
          
          return {
            ...result,
            provider: this.fallbackProvider.name,
            fallback: true
          };
        } catch (error) {
          console.error(`Fallback provider availability check failed:`, error);
        }
      }

      return {
        success: false,
        error: 'All providers failed to check availability'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get pricing with fallback
   * @param {Array} flightIds - Flight IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @returns {Promise<Object>} Pricing results
   */
  async getPricing(flightIds, passengerCounts, cabinClass) {
    try {
      // Try primary provider first
      if (this.primaryProvider) {
        try {
          const result = await this.primaryProvider.getPricing(flightIds, passengerCounts, cabinClass);
          
          if (result.success) {
            return {
              ...result,
              provider: this.primaryProvider.name
            };
          }
        } catch (error) {
          console.error(`Primary provider pricing failed:`, error);
        }
      }

      // Fallback to static provider
      if (this.fallbackProvider) {
        try {
          const result = await this.fallbackProvider.getPricing(flightIds, passengerCounts, cabinClass);
          
          return {
            ...result,
            provider: this.fallbackProvider.name,
            fallback: true
          };
        } catch (error) {
          console.error(`Fallback provider pricing failed:`, error);
        }
      }

      return {
        success: false,
        error: 'All providers failed to get pricing'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get fare class availability
   * @param {string} flightId - Flight ID
   * @returns {Promise<Object>} Fare class availability
   */
  async getFareClassAvailability(flightId) {
    try {
      // Try primary provider first
      if (this.primaryProvider) {
        try {
          const result = await this.primaryProvider.getFareClassAvailability(flightId);
          
          if (result.success) {
            return {
              ...result,
              provider: this.primaryProvider.name
            };
          }
        } catch (error) {
          console.error(`Primary provider fare class check failed:`, error);
        }
      }

      // Fallback to static provider
      if (this.fallbackProvider) {
        try {
          const result = await this.fallbackProvider.getFareClassAvailability(flightId);
          
          return {
            ...result,
            provider: this.fallbackProvider.name,
            fallback: true
          };
        } catch (error) {
          console.error(`Fallback provider fare class check failed:`, error);
        }
      }

      return {
        success: false,
        error: 'All providers failed to get fare class availability'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get health status of all providers
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    const healthStatus = {};

    for (const [name, provider] of this.providers) {
      try {
        healthStatus[name] = {
          healthy: await provider.healthCheck(),
          metadata: provider.getMetadata()
        };
      } catch (error) {
        healthStatus[name] = {
          healthy: false,
          error: error.message,
          metadata: provider.getMetadata()
        };
      }
    }

    return {
      primaryProvider: this.primaryProvider?.name,
      fallbackProvider: this.fallbackProvider?.name,
      providers: healthStatus,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute function with timeout
   * @param {Promise} promise - Promise to execute
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Result with timeout
   */
  async withTimeout(promise, timeout) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Get provider by name
   * @param {string} name - Provider name
   * @returns {Object|null} Provider instance
   */
  getProvider(name) {
    return this.providers.get(name) || null;
  }

  /**
   * Get all available providers
   * @returns {Array} Array of provider names
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
let providerManagerInstance = null;

/**
 * Get or create flight provider manager instance
 * @param {Object} config - Configuration
 * @returns {FlightProviderManager} Manager instance
 */
export function getFlightProviderManager(config) {
  if (!providerManagerInstance) {
    providerManagerInstance = new FlightProviderManager(config);
  }
  return providerManagerInstance;
}