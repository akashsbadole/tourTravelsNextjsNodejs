import { createDoc, updateOneDoc, getOneDoc, getManyDocs } from "@/lib/db/operations";
import { getAirlinePartnershipManager } from "@/lib/integrations/airline-providers/airline-partnership-manager";
import { getIntegrationHooks } from "./integrationHooks";

/**
 * Real-time Flight Inventory Service
 * Manages real-time flight inventory and pricing with partnership benefits
 */
export class RealtimeFlightInventory {
  constructor() {
    this.partnershipManager = getAirlinePartnershipManager();
    this.integrationHooks = getIntegrationHooks();
    this.inventoryCache = new Map();
    this.pricingCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get real-time flight inventory
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Inventory options
   * @returns {Promise<Object>} Real-time inventory
   */
  async getRealtimeInventory(searchParams, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        includePricing = true,
        includeAvailability = true,
        refreshCache = false,
        timeout = 10000
      } = options;

      // Generate cache key
      const cacheKey = this.generateCacheKey(searchParams, options);
      
      // Check cache first
      if (!refreshCache && this.inventoryCache.has(cacheKey)) {
        const cached = this.inventoryCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Get inventory from providers
      const inventory = await this.fetchInventoryFromProviders(searchParams, {
        usePartnershipBenefits,
        includePricing,
        includeAvailability,
        timeout
      });

      // Process inventory with partnership benefits
      const processedInventory = await this.processInventoryWithBenefits(
        inventory,
        searchParams,
        { usePartnershipBenefits }
      );

      // Cache the result
      this.inventoryCache.set(cacheKey, {
        data: processedInventory,
        timestamp: Date.now()
      });

      // Trigger analytics event
      await this.integrationHooks.triggerHook('inventory_accessed', {
        searchParams,
        resultCount: processedInventory.flights?.length || 0,
        cacheHit: false
      });

      return processedInventory;

    } catch (error) {
      console.error('Error getting real-time inventory:', error);
      throw error;
    }
  }

  /**
   * Get real-time pricing for flights
   * @param {Array} flightIds - Flight IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @param {Object} options - Pricing options
   * @returns {Promise<Object>} Real-time pricing
   */
  async getRealtimePricing(flightIds, passengerCounts, cabinClass, options = {}) {
    try {
      const {
        usePartnershipBenefits = true,
        includeTaxes = true,
        includeFees = true,
        currency = 'USD',
        refreshCache = false,
        timeout = 8000
      } = options;

      // Generate cache key
      const cacheKey = this.generatePricingCacheKey(flightIds, passengerCounts, cabinClass, options);
      
      // Check cache first
      if (!refreshCache && this.pricingCache.has(cacheKey)) {
        const cached = this.pricingCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Get pricing from providers
      const pricing = await this.fetchPricingFromProviders(
        flightIds,
        passengerCounts,
        cabinClass,
        {
          usePartnershipBenefits,
          includeTaxes,
          includeFees,
          currency,
          timeout
        }
      );

      // Process pricing with partnership benefits
      const processedPricing = await this.processPricingWithBenefits(
        pricing,
        passengerCounts,
        cabinClass,
        { usePartnershipBenefits }
      );

      // Cache the result
      this.pricingCache.set(cacheKey, {
        data: processedPricing,
        timestamp: Date.now()
      });

      // Trigger analytics event
      await this.integrationHooks.triggerHook('pricing_accessed', {
        flightIds,
        passengerCounts,
        cabinClass,
        resultCount: processedPricing.pricing?.length || 0,
        cacheHit: false
      });

      return processedPricing;

    } catch (error) {
      console.error('Error getting real-time pricing:', error);
      throw error;
    }
  }

  /**
   * Update inventory cache
   * @param {string} flightId - Flight ID
   * @param {Object} inventoryData - Inventory data
   */
  async updateInventoryCache(flightId, inventoryData) {
    try {
      // Update cache with new inventory data
      const cacheKey = `flight_${flightId}`;
      this.inventoryCache.set(cacheKey, {
        data: inventoryData,
        timestamp: Date.now()
      });

      // Update database
      await updateOneDoc("FlightInventory", { flightId }, {
        inventory: inventoryData,
        lastUpdated: new Date()
      });

      // Trigger webhook for real-time updates
      await this.integrationHooks.triggerHook('inventory_updated', {
        flightId,
        inventoryData,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error updating inventory cache:', error);
    }
  }

  /**
   * Subscribe to inventory updates
   * @param {string} flightId - Flight ID
   * @param {Function} callback - Callback function
   * @returns {Promise<string>} Subscription ID
   */
  async subscribeToInventoryUpdates(flightId, callback) {
    try {
      const subscriptionId = `inventory_${flightId}_${Date.now()}`;
      
      // Register subscription
      await this.integrationHooks.registerHook('inventory_updated', async (data) => {
        if (data.flightId === flightId) {
          await callback(data);
        }
      });

      return subscriptionId;

    } catch (error) {
      console.error('Error subscribing to inventory updates:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from inventory updates
   * @param {string} subscriptionId - Subscription ID
   */
  async unsubscribeFromInventoryUpdates(subscriptionId) {
    try {
      // Unregister subscription
      await this.integrationHooks.unregisterHook('inventory_updated', subscriptionId);

    } catch (error) {
      console.error('Error unsubscribing from inventory updates:', error);
    }
  }

  /**
   * Fetch inventory from providers
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Inventory data
   */
  async fetchInventoryFromProviders(searchParams, options) {
    try {
      // Search flights using partnership manager
      const searchResults = await this.partnershipManager.searchFlights(searchParams, {
        usePartnershipBenefits: options.usePartnershipBenefits,
        timeout: options.timeout
      });

      if (!searchResults.success) {
        throw new Error(searchResults.error || 'Failed to fetch inventory');
      }

      // Get availability for flights if requested
      let availability = [];
      if (options.includeAvailability && searchResults.data.length > 0) {
        const flightIds = searchResults.data.map(flight => flight.flightId);
        const availabilityResults = await this.partnershipManager.checkAvailability(flightIds, {
          timeout: options.timeout
        });

        if (availabilityResults.success) {
          availability = availabilityResults.data;
        }
      }

      // Get pricing for flights if requested
      let pricing = [];
      if (options.includePricing && searchResults.data.length > 0) {
        const flightIds = searchResults.data.map(flight => flight.flightId);
        const pricingResults = await this.partnershipManager.getPricing(
          flightIds,
          searchParams.passengers || { adults: 1 },
          searchParams.cabinClass || 'economy',
          { timeout: options.timeout }
        );

        if (pricingResults.success) {
          pricing = pricingResults.data;
        }
      }

      return {
        flights: searchResults.data,
        availability,
        pricing,
        metadata: searchResults.metadata
      };

    } catch (error) {
      console.error('Error fetching inventory from providers:', error);
      throw error;
    }
  }

  /**
   * Process inventory with partnership benefits
   * @param {Object} inventory - Raw inventory data
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed inventory
   */
  async processInventoryWithBenefits(inventory, searchParams, options) {
    try {
      if (!options.usePartnershipBenefits) {
        return inventory;
      }

      // Process each flight with partnership benefits
      const processedFlights = await Promise.all(
        inventory.flights.map(async (flight) => {
          return await this.applyPartnershipBenefits(flight, searchParams);
        })
      );

      return {
        ...inventory,
        flights: processedFlights,
        partnershipBenefits: {
          applied: true,
          enhanced: true,
          exclusive: processedFlights.some(f => f.partnershipBenefits?.exclusive)
        }
      };

    } catch (error) {
      console.error('Error processing inventory with benefits:', error);
      return inventory;
    }
  }

  /**
   * Apply partnership benefits to flight
   * @param {Object} flight - Flight data
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Enhanced flight data
   */
  async applyPartnershipBenefits(flight, searchParams) {
    try {
      const enhancedFlight = { ...flight };

      // Add partnership benefits based on tier
      if (flight.partnershipTier) {
        enhancedFlight.partnershipBenefits = this.getTierBenefits(flight.partnershipTier);
      }

      // Apply exclusive fares if available
      if (enhancedFlight.partnershipBenefits?.exclusiveFares) {
        enhancedFlight.pricing = await this.applyExclusiveFares(flight, searchParams);
      }

      // Apply priority booking if available
      if (enhancedFlight.partnershipBenefits?.priorityBooking) {
        enhancedFlight.booking = {
          priority: true,
          priorityLevel: this.getPriorityLevel(flight.partnershipTier)
        };
      }

      // Apply enhanced seat selection if available
      if (enhancedFlight.partnershipBenefits?.seatSelection) {
        enhancedFlight.seatSelection = {
          enhanced: true,
          freeSelection: this.getFreeSeatSelection(flight.partnershipTier),
          advanceSelection: this.getAdvanceSeatSelection(flight.partnershipTier)
        };
      }

      return enhancedFlight;

    } catch (error) {
      console.error('Error applying partnership benefits:', error);
      return flight;
    }
  }

  /**
   * Get benefits by partnership tier
   * @param {string} tier - Partnership tier
   * @returns {Object} Tier benefits
   */
  getTierBenefits(tier) {
    const benefits = {
      bronze: {
        exclusiveFares: false,
        priorityBooking: false,
        seatSelection: false,
        ancillaryServices: true,
        loyaltyIntegration: false
      },
      silver: {
        exclusiveFares: true,
        priorityBooking: false,
        seatSelection: true,
        ancillaryServices: true,
        loyaltyIntegration: true
      },
      gold: {
        exclusiveFares: true,
        priorityBooking: true,
        seatSelection: true,
        ancillaryServices: true,
        loyaltyIntegration: true
      },
      platinum: {
        exclusiveFares: true,
        priorityBooking: true,
        seatSelection: true,
        ancillaryServices: true,
        loyaltyIntegration: true
      },
      diamond: {
        exclusiveFares: true,
        priorityBooking: true,
        seatSelection: true,
        ancillaryServices: true,
        loyaltyIntegration: true
      }
    };

    return benefits[tier] || benefits.bronze;
  }

  /**
   * Apply exclusive fares to flight pricing
   * @param {Object} flight - Flight data
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Enhanced pricing
   */
  async applyExclusiveFares(flight, searchParams) {
    try {
      const basePricing = flight.pricing || {};
      const exclusiveDiscount = this.getExclusiveDiscount(flight.partnershipTier);

      return {
        ...basePricing,
        exclusiveFare: {
          available: true,
          discount: exclusiveDiscount,
          originalPrice: basePricing.total,
          discountedPrice: basePricing.total * (1 - exclusiveDiscount),
          savings: basePricing.total * exclusiveDiscount
        }
      };

    } catch (error) {
      console.error('Error applying exclusive fares:', error);
      return flight.pricing || {};
    }
  }

  /**
   * Get exclusive discount by tier
   * @param {string} tier - Partnership tier
   * @returns {number} Discount percentage
   */
  getExclusiveDiscount(tier) {
    const discounts = {
      bronze: 0,
      silver: 0.02, // 2%
      gold: 0.05, // 5%
      platinum: 0.08, // 8%
      diamond: 0.10 // 10%
    };

    return discounts[tier] || 0;
  }

  /**
   * Get priority level by tier
   * @param {string} tier - Partnership tier
   * @returns {number} Priority level
   */
  getPriorityLevel(tier) {
    const levels = {
      bronze: 0,
      silver: 1,
      gold: 2,
      platinum: 3,
      diamond: 4
    };

    return levels[tier] || 0;
  }

  /**
   * Get free seat selection by tier
   * @param {string} tier - Partnership tier
   * @returns {boolean} Free seat selection
   */
  getFreeSeatSelection(tier) {
    return ['gold', 'platinum', 'diamond'].includes(tier);
  }

  /**
   * Get advance seat selection by tier
   * @param {string} tier - Partnership tier
   * @returns {number} Days in advance
   */
  getAdvanceSeatSelection(tier) {
    const days = {
      bronze: 0,
      silver: 7,
      gold: 14,
      platinum: 21,
      diamond: 30
    };

    return days[tier] || 0;
  }

  /**
   * Generate cache key for inventory
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Options
   * @returns {string} Cache key
   */
  generateCacheKey(searchParams, options) {
    const key = {
      search: searchParams,
      options: {
        usePartnershipBenefits: options.usePartnershipBenefits,
        includePricing: options.includePricing,
        includeAvailability: options.includeAvailability
      }
    };
    
    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  /**
   * Generate cache key for pricing
   * @param {Array} flightIds - Flight IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @param {Object} options - Options
   * @returns {string} Cache key
   */
  generatePricingCacheKey(flightIds, passengerCounts, cabinClass, options) {
    const key = {
      flights: flightIds.sort(),
      passengers: passengerCounts,
      cabinClass,
      options: {
        usePartnershipBenefits: options.usePartnershipBenefits,
        includeTaxes: options.includeTaxes,
        includeFees: options.includeFees,
        currency: options.currency
      }
    };
    
    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  /**
   * Clear cache
   * @param {string} pattern - Cache pattern to clear
   */
  clearCache(pattern = null) {
    if (pattern) {
      // Clear specific pattern
      for (const [key] of this.inventoryCache) {
        if (key.includes(pattern)) {
          this.inventoryCache.delete(key);
        }
      }
      for (const [key] of this.pricingCache) {
        if (key.includes(pattern)) {
          this.pricingCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.inventoryCache.clear();
      this.pricingCache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      inventoryCache: {
        size: this.inventoryCache.size,
        keys: Array.from(this.inventoryCache.keys())
      },
      pricingCache: {
        size: this.pricingCache.size,
        keys: Array.from(this.pricingCache.keys())
      },
      timeout: this.cacheTimeout
    };
  }
}

// Singleton instance
let inventoryServiceInstance = null;

/**
 * Get or create real-time flight inventory service instance
 * @returns {RealtimeFlightInventory} Service instance
 */
export function getRealtimeFlightInventory() {
  if (!inventoryServiceInstance) {
    inventoryServiceInstance = new RealtimeFlightInventory();
  }
  return inventoryServiceInstance;
}