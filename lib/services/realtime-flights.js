import "server-only";
import { getFlightProviderManager } from "@/lib/integrations/flight-providers/provider-manager";
import { getRedisClient } from "@/lib/cache/redis-client";
import { getFlightCacheManager } from "@/lib/cache/flight-cache";
import { RealtimeFlightData } from "@/lib/db/models";
import { updateOneDoc, createDoc, getManyDocs, getOneDoc } from "@/lib/db/updateOperationDB";

/**
 * Real-time Flight Service
 * Handles real-time flight operations with caching and fallback
 */
class RealtimeFlightService {
  constructor() {
    this.providerManager = null;
    this.cacheManager = null;
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize provider manager
      const providerConfig = {
        amadeus: {
          enabled: process.env.AMADEUS_ENABLED === 'true',
          apiKey: process.env.AMADEUS_API_KEY,
          apiSecret: process.env.AMADEUS_API_SECRET,
          baseUrl: process.env.AMADEUS_BASE_URL,
          options: {
            rateLimit: parseInt(process.env.AMADEUS_RATE_LIMIT) || 100
          }
        },
        static: {}
      };

      this.providerManager = getFlightProviderManager(providerConfig);

      // Initialize cache if enabled
      if (process.env.REDIS_ENABLED === 'true') {
        const redisClient = await getRedisClient();
        this.cacheManager = getFlightCacheManager(redisClient, {
          searchTTL: parseInt(process.env.FLIGHT_CACHE_TTL_SEARCH) || 600,
          availabilityTTL: parseInt(process.env.FLIGHT_CACHE_TTL_AVAILABILITY) || 60,
          pricingTTL: parseInt(process.env.FLIGHT_CACHE_TTL_PRICING) || 180
        });
      }

      this.initialized = true;
      console.log('Real-time flight service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize real-time flight service:', error);
      throw error;
    }
  }

  /**
   * Search flights with real-time availability
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchFlightsWithRealtimeAvailability(searchParams, options = {}) {
    await this.initialize();

    const {
      origin,
      destination,
      departureDate,
      returnDate,
      tripType = 'one_way',
      passengers = { adults: 1, children: 0, infants: 0 },
      cabinClass = 'economy',
      filters = {}
    } = searchParams;

    try {
      // Check cache first
      const cacheKey = this.generateSearchCacheKey(searchParams);
      if (this.cacheManager && options.useCache !== false) {
        try {
          const cachedResults = await this.cacheManager.getCachedSearchResults(searchParams);
          if (cachedResults && this.isCacheValid(cachedResults)) {
            // Enhance cached results with real-time availability
            const enhancedResults = await this.enhanceWithRealtimeAvailability(
              cachedResults.data,
              passengers,
              cabinClass
            );
            
            return {
              success: true,
              data: enhancedResults,
              metadata: {
                ...cachedResults.metadata,
                cached: true,
                realtimeEnhanced: true,
                source: 'cache_with_realtime'
              }
            };
          }
        } catch (error) {
          console.warn('Cache read failed, proceeding with API call:', error);
        }
      }

      // Perform search with provider manager
      const searchResults = await this.providerManager.searchFlights(searchParams, {
        useCache: !!this.cacheManager,
        timeout: options.timeout || 30000
      });

      if (!searchResults.success) {
        throw new Error(searchResults.error);
      }

      // Enhance results with real-time availability
      const enhancedResults = await this.enhanceWithRealtimeAvailability(
        searchResults.data,
        passengers,
        cabinClass
      );

      // Cache results
      if (this.cacheManager && enhancedResults.length > 0) {
        try {
          await this.cacheManager.cacheSearchResults(searchParams, {
            ...searchResults,
            data: enhancedResults
          });
        } catch (error) {
          console.warn('Failed to cache search results:', error);
        }
      }

      return {
        success: true,
        data: enhancedResults,
        metadata: {
          ...searchResults.metadata,
          cached: false,
          realtimeEnhanced: true,
          source: 'api_with_realtime'
        }
      };

    } catch (error) {
      console.error('Real-time flight search error:', error);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          source: 'realtime_search',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Check real-time availability for flights
   * @param {Array} flightIds - Flight IDs
   * @param {Object} options - Options
   * @returns {Promise<Object>} Availability data
   */
  async checkRealtimeAvailability(flightIds, options = {}) {
    await this.initialize();

    try {
      const {
        passengerCounts = { adults: 1, children: 0, infants: 0 },
        cabinClass = 'economy'
      } = options;

      // Check cache first
      if (this.cacheManager) {
        try {
          const cachedAvailability = await this.cacheManager.getCachedAvailability(flightIds);
          if (cachedAvailability && this.isCacheValid(cachedAvailability)) {
            return {
              ...cachedAvailability,
              source: 'cache'
            };
          }
        } catch (error) {
          console.warn('Cache read failed, proceeding with API call:', error);
        }
      }

      // Get availability from provider
      const availabilityResults = await this.providerManager.checkAvailability(flightIds, options);

      if (!availabilityResults.success) {
        throw new Error(availabilityResults.error);
      }

      // Store in database for tracking
      await this.storeRealtimeData(flightIds, availabilityResults.data);

      // Cache results
      if (this.cacheManager) {
        try {
          await this.cacheManager.cacheAvailability(flightIds, availabilityResults);
        } catch (error) {
          console.warn('Failed to cache availability:', error);
        }
      }

      return {
        ...availabilityResults,
        source: 'api'
      };

    } catch (error) {
      console.error('Real-time availability check error:', error);
      
      return {
        success: false,
        error: error.message,
        source: 'error'
      };
    }
  }

  /**
   * Get real-time pricing
   * @param {Array} flightIds - Flight IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @returns {Promise<Object>} Pricing data
   */
  async getRealtimePricing(flightIds, passengerCounts, cabinClass) {
    await this.initialize();

    try {
      // Check cache first
      if (this.cacheManager) {
        try {
          const cachedPricing = await this.cacheManager.getCachedPricing(flightIds, passengerCounts, cabinClass);
          if (cachedPricing && this.isCacheValid(cachedPricing)) {
            return {
              ...cachedPricing,
              source: 'cache'
            };
          }
        } catch (error) {
          console.warn('Cache read failed, proceeding with API call:', error);
        }
      }

      // Get pricing from provider
      const pricingResults = await this.providerManager.getPricing(flightIds, passengerCounts, cabinClass);

      if (!pricingResults.success) {
        throw new Error(pricingResults.error);
      }

      // Cache results
      if (this.cacheManager) {
        try {
          await this.cacheManager.cachePricing(flightIds, passengerCounts, cabinClass, pricingResults);
        } catch (error) {
          console.warn('Failed to cache pricing:', error);
        }
      }

      return {
        ...pricingResults,
        source: 'api'
      };

    } catch (error) {
      console.error('Real-time pricing error:', error);
      
      return {
        success: false,
        error: error.message,
        source: 'error'
      };
    }
  }

  /**
   * Enhance flight results with real-time availability
   * @param {Array} flights - Flight results
   * @param {Object} passengers - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @returns {Promise<Array>} Enhanced flights
   */
  async enhanceWithRealtimeAvailability(flights, passengers, cabinClass) {
    if (!flights || flights.length === 0) {
      return flights;
    }

    try {
      // Extract flight IDs
      const flightIds = flights.map(flight => flight.id || flight._id?.toString());

      // Get real-time availability
      const availabilityData = await this.checkRealtimeAvailability(flightIds, {
        passengerCounts: passengers,
        cabinClass
      });

      if (availabilityData.success && availabilityData.data) {
        // Enhance each flight with availability data
        return flights.map(flight => {
          const flightId = flight.id || flight._id?.toString();
          const availability = availabilityData.data[flightId];

          if (availability) {
            return {
              ...flight,
              realtimeAvailability: {
                available: availability.available,
                seats: availability.segments?.reduce((total, seg) => total + seg.availableSeats, 0) || 0,
                lastChecked: new Date().toISOString(),
                source: availability.provider
              },
              // Update pricing if available
              ...(availability.pricing && { pricing: availability.pricing })
            };
          }

          return flight;
        });
      }

      return flights;
    } catch (error) {
      console.warn('Failed to enhance with real-time availability:', error);
      return flights;
    }
  }

  /**
   * Store real-time data in database
   * @param {Array} flightIds - Flight IDs
   * @param {Object} data - Real-time data
   */
  async storeRealtimeData(flightIds, data) {
    try {
      const operations = flightIds.map(flightId => ({
        updateOne: {
          filter: { flightId },
          update: {
            $set: {
              ...data[flightId],
              lastUpdated: new Date(),
              lastChecked: new Date(),
              syncStatus: 'synced'
            }
          },
          upsert: true
        }
      }));

      await RealtimeFlightData.bulkWrite(operations);
    } catch (error) {
      console.error('Failed to store real-time data:', error);
    }
  }

  /**
   * Generate cache key for search
   * @param {Object} searchParams - Search parameters
   * @returns {string} Cache key
   */
  generateSearchCacheKey(searchParams) {
    const keyData = {
      origin: searchParams.origin,
      destination: searchParams.destination,
      departureDate: searchParams.departureDate,
      returnDate: searchParams.returnDate,
      tripType: searchParams.tripType,
      passengers: searchParams.passengers,
      cabinClass: searchParams.cabinClass
    };
    
    return JSON.stringify(keyData, Object.keys(keyData).sort());
  }

  /**
   * Check if cache is valid
   * @param {Object} cachedData - Cached data
   * @returns {boolean} Validity
   */
  isCacheValid(cachedData) {
    if (!cachedData || !cachedData.cachedAt) {
      return false;
    }

    const cachedTime = new Date(cachedData.cachedAt);
    const now = new Date();
    const ageSeconds = (now - cachedTime) / 1000;
    
    // Consider cache valid for 5 minutes for real-time data
    return ageSeconds < 300;
  }

  /**
   * Get service health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    try {
      await this.initialize();

      const health = {
        service: 'healthy',
        components: {
          providers: await this.providerManager.getHealthStatus(),
          cache: this.cacheManager ? await this.cacheManager.healthCheck() : { enabled: false }
        }
      };

      // Determine overall health
      if (!health.components.providers.primaryProvider?.healthy) {
        health.service = 'degraded';
      }

      if (health.components.cache.enabled && !health.components.cache.healthy) {
        health.service = 'degraded';
      }

      return health;
    } catch (error) {
      return {
        service: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Singleton instance
let realtimeFlightService = null;

/**
 * Get or create real-time flight service instance
 * @returns {RealtimeFlightService} Service instance
 */
export function getRealtimeFlightService() {
  if (!realtimeFlightService) {
    realtimeFlightService = new RealtimeFlightService();
  }
  return realtimeFlightService;
}

export { RealtimeFlightService };