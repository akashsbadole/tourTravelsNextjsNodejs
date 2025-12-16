import "server-only";
import { AmadeusProvider } from '../flight-providers/amadeus-provider';
import { SabreProvider } from './sabre-provider';
import { TravelportProvider } from './travelport-provider';
import { DirectAirlineProvider } from './direct-airline-provider';
import { LowCostCarrierProvider } from './lowcost-provider';
import { RegionalAirlineProvider } from './regional-provider.js';

/**
 * Airline Partnership Manager
 * Manages multiple airline partnership providers with intelligent routing and fallback
 */
export class AirlinePartnershipManager {
  constructor(config = {}) {
    this.providers = new Map();
    this.partnerships = new Map(); // partnershipId -> provider mapping
    this.airlines = new Map(); // airlineCode -> provider mapping
    this.gdsProviders = new Map(); // GDS providers
    this.directProviders = new Map(); // Direct airline providers
    this.lowCostProviders = new Map(); // Low-cost carrier providers
    this.regionalProviders = new Map(); // Regional airline providers
    this.config = config;
    
    this.initializeProviders();
  }

  /**
   * Initialize all available providers based on configuration
   */
  initializeProviders() {
    // Initialize GDS providers
    if (this.config.amadeus?.enabled) {
      const amadeusProvider = new AmadeusProvider({
        ...this.config.amadeus,
        partnershipFramework: true
      });
      this.providers.set('amadeus', amadeusProvider);
      this.gdsProviders.set('amadeus', amadeusProvider);
    }

    if (this.config.sabre?.enabled) {
      this.config.sabre.partnerships?.forEach(partnership => {
        const sabreProvider = new SabreProvider({
          ...this.config.sabre,
          ...partnership
        });
        this.providers.set(`sabre_${partnership.partnershipId}`, sabreProvider);
        this.gdsProviders.set(`sabre_${partnership.partnershipId}`, sabreProvider);
        this.partnerships.set(partnership.partnershipId, sabreProvider);
      });
    }

    if (this.config.travelport?.enabled) {
      this.config.travelport.partnerships?.forEach(partnership => {
        const travelportProvider = new TravelportProvider({
          ...this.config.travelport,
          ...partnership
        });
        this.providers.set(`travelport_${partnership.partnershipId}`, travelportProvider);
        this.gdsProviders.set(`travelport_${partnership.partnershipId}`, travelportProvider);
        this.partnerships.set(partnership.partnershipId, travelportProvider);
      });
    }

    // Initialize direct airline providers
    if (this.config.directAirlines?.enabled) {
      this.config.directAirlines.airlines?.forEach(airlineConfig => {
        const directProvider = new DirectAirlineProvider(airlineConfig);
        this.providers.set(`direct_${airlineConfig.airlineCode}`, directProvider);
        this.directProviders.set(airlineConfig.airlineCode, directProvider);
        this.airlines.set(airlineConfig.airlineCode, directProvider);
        
        if (airlineConfig.partnershipId) {
          this.partnerships.set(airlineConfig.partnershipId, directProvider);
        }
      });
    }

    // Initialize low-cost carrier providers
    if (this.config.lowCostCarriers?.enabled) {
      this.config.lowCostCarriers.carriers?.forEach(carrierConfig => {
        const lowCostProvider = new LowCostCarrierProvider(carrierConfig);
        this.providers.set(`lowcost_${carrierConfig.airlineCode}`, lowCostProvider);
        this.lowCostProviders.set(carrierConfig.airlineCode, lowCostProvider);
        this.airlines.set(carrierConfig.airlineCode, lowCostProvider);
        
        if (carrierConfig.partnershipId) {
          this.partnerships.set(carrierConfig.partnershipId, lowCostProvider);
        }
      });
    }

    // Initialize regional airline providers
    if (this.config.regionalAirlines?.enabled) {
      this.config.regionalAirlines.airlines?.forEach(airlineConfig => {
        const regionalProvider = new RegionalAirlineProvider(airlineConfig);
        this.providers.set(`regional_${airlineConfig.airlineCode}`, regionalProvider);
        this.regionalProviders.set(airlineConfig.airlineCode, regionalProvider);
        this.airlines.set(airlineConfig.airlineCode, regionalProvider);
        
        if (airlineConfig.partnershipId) {
          this.partnerships.set(airlineConfig.partnershipId, regionalProvider);
        }
      });
    }
  }

  /**
   * Search flights across all relevant providers
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchFlights(searchParams, options = {}) {
    const {
      providers = [], // Specific providers to use
      airlineCodes = [], // Specific airlines to search
      partnershipIds = [], // Specific partnerships to use
      usePartnershipBenefits = true,
      includeGDS = true,
      includeDirect = true,
      includeLowCost = true,
      includeRegional = true,
      timeout = 30000
    } = options;

    const results = {
      success: false,
      data: [],
      providers: [],
      metadata: {
        searchTime: 0,
        totalResults: 0,
        sources: [],
        partnershipBenefits: {}
      }
    };

    const startTime = Date.now();

    try {
      // Determine which providers to use
      const targetProviders = await this.getTargetProviders({
        providers,
        airlineCodes,
        partnershipIds,
        includeGDS,
        includeDirect,
        includeLowCost,
        includeRegional
      });

      if (targetProviders.length === 0) {
        results.error = 'No suitable providers found for search criteria';
        results.metadata.searchTime = Date.now() - startTime;
        return results;
      }

      // Search flights across all target providers
      const searchPromises = targetProviders.map(async (provider) => {
        try {
          const healthStatus = await provider.healthCheck();
          
          if (healthStatus) {
            let searchResults;
            
            if (usePartnershipBenefits && provider.searchPartnershipFlights) {
              searchResults = await this.withTimeout(
                provider.searchPartnershipFlights(searchParams, options),
                timeout
              );
            } else {
              searchResults = await this.withTimeout(
                provider.searchFlights(searchParams),
                timeout
              );
            }

            if (searchResults && Array.isArray(searchResults)) {
              results.metadata.sources.push({
                provider: provider.name,
                success: true,
                resultCount: searchResults.length,
                partnershipId: provider.partnershipId,
                tier: provider.tier
              });

              return {
                provider: provider.name,
                partnershipId: provider.partnershipId,
                tier: provider.tier,
                flights: searchResults
              };
            }
          } else {
            results.metadata.sources.push({
              provider: provider.name,
              success: false,
              error: 'Provider health check failed'
            });
          }
        } catch (error) {
          console.error(`Provider ${provider.name} search failed:`, error);
          results.metadata.sources.push({
            provider: provider.name,
            success: false,
            error: error.message
          });
        }
        
        return null;
      });

      const providerResults = await Promise.all(searchPromises);
      
      // Combine and deduplicate results
      const allFlights = [];
      const seenFlights = new Set();
      
      providerResults.forEach(providerResult => {
        if (providerResult && providerResult.flights) {
          providerResult.flights.forEach(flight => {
            const flightKey = this.generateFlightKey(flight);
            
            if (!seenFlights.has(flightKey)) {
              seenFlights.add(flightKey);
              
              // Add provider information to flight
              flight.searchProvider = providerResult.provider;
              flight.partnershipId = providerResult.partnershipId;
              flight.partnershipTier = providerResult.tier;
              
              allFlights.push(flight);
            }
          });
        }
      });

      // Sort results by price and partnership benefits
      const sortedFlights = this.sortFlightResults(allFlights, options);

      results.success = true;
      results.data = sortedFlights;
      results.providers = targetProviders.map(p => p.name);
      results.metadata.searchTime = Date.now() - startTime;
      results.metadata.totalResults = sortedFlights.length;

      return results;

    } catch (error) {
      console.error('Airline partnership manager search error:', error);
      results.error = error.message;
      results.metadata.searchTime = Date.now() - startTime;
      
      return results;
    }
  }

  /**
   * Get enhanced availability for flights
   * @param {Array} flightIds - Array of flight IDs
   * @param {Object} options - Options
   * @returns {Promise<Object>} Availability results
   */
  async checkAvailability(flightIds, options = {}) {
    const { timeout = 15000, usePartnershipBenefits = true } = options;

    try {
      // Group flights by provider
      const flightsByProvider = this.groupFlightsByProvider(flightIds);
      
      const availabilityPromises = Array.from(flightsByProvider.entries()).map(async ([providerKey, flights]) => {
        const provider = this.providers.get(providerKey);
        
        if (!provider) {
          return null;
        }

        try {
          let availabilityResult;
          
          if (usePartnershipBenefits && provider.getEnhancedFareClassAvailability) {
            availabilityResult = await this.withTimeout(
              provider.getEnhancedFareClassAvailability(flights[0], options),
              timeout
            );
          } else {
            availabilityResult = await this.withTimeout(
              provider.checkAvailability(flights, options),
              timeout
            );
          }

          return {
            provider: provider.name,
            partnershipId: provider.partnershipId,
            tier: provider.tier,
            availability: availabilityResult
          };
        } catch (error) {
          console.error(`Availability check failed for ${provider.name}:`, error);
          return {
            provider: provider.name,
            partnershipId: provider.partnershipId,
            tier: provider.tier,
            error: error.message
          };
        }
      });

      const providerResults = await Promise.all(availabilityPromises);
      
      return {
        success: true,
        data: providerResults.filter(result => result && !result.error),
        metadata: {
          providers: providerResults.length,
          successful: providerResults.filter(r => r && !r.error).length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get pricing for flights
   * @param {Array} flightIds - Array of flight IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   * @param {Object} options - Options
   * @returns {Promise<Object>} Pricing results
   */
  async getPricing(flightIds, passengerCounts, cabinClass, options = {}) {
    const { timeout = 20000, usePartnershipBenefits = true } = options;

    try {
      // Group flights by provider
      const flightsByProvider = this.groupFlightsByProvider(flightIds);
      
      const pricingPromises = Array.from(flightsByProvider.entries()).map(async ([providerKey, flights]) => {
        const provider = this.providers.get(providerKey);
        
        if (!provider) {
          return null;
        }

        try {
          const pricingResult = await this.withTimeout(
            provider.getPricing(flights, passengerCounts, cabinClass),
            timeout
          );

          return {
            provider: provider.name,
            partnershipId: provider.partnershipId,
            tier: provider.tier,
            pricing: pricingResult
          };
        } catch (error) {
          console.error(`Pricing failed for ${provider.name}:`, error);
          return {
            provider: provider.name,
            partnershipId: provider.partnershipId,
            tier: provider.tier,
            error: error.message
          };
        }
      });

      const providerResults = await Promise.all(pricingPromises);
      
      return {
        success: true,
        data: providerResults.filter(result => result && !result.error),
        metadata: {
          providers: providerResults.length,
          successful: providerResults.filter(r => r && !r.error).length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get seat maps for flights
   * @param {Array} flightIds - Array of flight IDs
   * @param {Object} options - Options
   * @returns {Promise<Object>} Seat map results
   */
  async getSeatMaps(flightIds, options = {}) {
    const { timeout = 15000, usePartnershipBenefits = true } = options;

    try {
      const seatMapPromises = flightIds.map(async (flightId) => {
        const provider = this.getProviderForFlight(flightId);
        
        if (!provider) {
          return null;
        }

        try {
          let seatMapResult;
          
          if (usePartnershipBenefits && provider.getEnhancedSeatMap) {
            seatMapResult = await this.withTimeout(
              provider.getEnhancedSeatMap(flightId, options),
              timeout
            );
          } else {
            seatMapResult = await this.withTimeout(
              provider.getSeatMap(flightId),
              timeout
            );
          }

          return {
            flightId,
            provider: provider.name,
            partnershipId: provider.partnershipId,
            tier: provider.tier,
            seatMap: seatMapResult
          };
        } catch (error) {
          console.error(`Seat map failed for ${provider.name}:`, error);
          return {
            flightId,
            provider: provider.name,
            partnershipId: provider.partnershipId,
            tier: provider.tier,
            error: error.message
          };
        }
      });

      const results = await Promise.all(seatMapPromises);
      
      return {
        success: true,
        data: results.filter(result => result && !result.error),
        metadata: {
          flights: flightIds.length,
          successful: results.filter(r => r && !r.error).length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get ancillary services for flights
   * @param {Array} flightIds - Array of flight IDs
   * @param {Object} options - Options
   * @returns {Promise<Object>} Ancillary services results
   */
  async getAncillaryServices(flightIds, options = {}) {
    const { timeout = 15000, usePartnershipBenefits = true } = options;

    try {
      const ancillaryPromises = flightIds.map(async (flightId) => {
        const provider = this.getProviderForFlight(flightId);
        
        if (!provider) {
          return null;
        }

        try {
          let ancillaryResult;
          
          if (usePartnershipBenefits && provider.getEnhancedAncillaryServices) {
            ancillaryResult = await this.withTimeout(
              provider.getEnhancedAncillaryServices(flightId, options),
              timeout
            );
          } else {
            ancillaryResult = await this.withTimeout(
              provider.getAncillaryServices(flightId),
              timeout
            );
          }

          return {
            flightId,
            provider: provider.name,
            partnershipId: provider.partnershipId,
            tier: provider.tier,
            ancillaryServices: ancillaryResult
          };
        } catch (error) {
          console.error(`Ancillary services failed for ${provider.name}:`, error);
          return {
            flightId,
            provider: provider.name,
            partnershipId: provider.partnershipId,
            tier: provider.tier,
            error: error.message
          };
        }
      });

      const results = await Promise.all(ancillaryPromises);
      
      return {
        success: true,
        data: results.filter(result => result && !result.error),
        metadata: {
          flights: flightIds.length,
          successful: results.filter(r => r && !r.error).length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create booking with appropriate provider
   * @param {Object} bookingData - Booking data
   * @param {Object} options - Options
   * @returns {Promise<Object>} Booking result
   */
  async createBooking(bookingData, options = {}) {
    const { timeout = 30000, usePartnershipBenefits = true } = options;

    try {
      const provider = this.getProviderForFlight(bookingData.flightId);
      
      if (!provider) {
        throw new Error(`No provider found for flight ${bookingData.flightId}`);
      }

      let bookingResult;
      
      if (usePartnershipBenefits && provider.createPartnershipBooking) {
        bookingResult = await this.withTimeout(
          provider.createPartnershipBooking(bookingData, options),
          timeout
        );
      } else {
        bookingResult = await this.withTimeout(
          provider.createBooking(bookingData),
          timeout
        );
      }

      return {
        success: true,
        data: bookingResult,
        provider: provider.name,
        partnershipId: provider.partnershipId,
        tier: provider.tier
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get target providers based on search criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} Target providers
   */
  async getTargetProviders(criteria) {
    const {
      providers = [],
      airlineCodes = [],
      partnershipIds = [],
      includeGDS = true,
      includeDirect = true,
      includeLowCost = true
    } = criteria;

    let targetProviders = [];

    // Add specific providers if requested
    if (providers.length > 0) {
      providers.forEach(providerName => {
        const provider = this.providers.get(providerName);
        if (provider) {
          targetProviders.push(provider);
        }
      });
    }

    // Add providers for specific airlines
    if (airlineCodes.length > 0) {
      airlineCodes.forEach(airlineCode => {
        const provider = this.airlines.get(airlineCode);
        if (provider && !targetProviders.includes(provider)) {
          targetProviders.push(provider);
        }
      });
    }

    // Add providers for specific partnerships
    if (partnershipIds.length > 0) {
      partnershipIds.forEach(partnershipId => {
        const provider = this.partnerships.get(partnershipId);
        if (provider && !targetProviders.includes(provider)) {
          targetProviders.push(provider);
        }
      });
    }

    // If no specific criteria, add all providers by type
    if (targetProviders.length === 0) {
      if (includeGDS) {
        targetProviders.push(...Array.from(this.gdsProviders.values()));
      }
      if (includeDirect) {
        targetProviders.push(...Array.from(this.directProviders.values()));
      }
      if (includeLowCost) {
        targetProviders.push(...Array.from(this.lowCostProviders.values()));
      }
      if (includeRegional) {
        targetProviders.push(...Array.from(this.regionalProviders.values()));
      }
    }

    return targetProviders;
  }

  /**
   * Group flights by provider
   * @param {Array} flightIds - Array of flight IDs
   * @returns {Map} Flights grouped by provider
   */
  groupFlightsByProvider(flightIds) {
    const flightsByProvider = new Map();
    
    flightIds.forEach(flightId => {
      const provider = this.getProviderForFlight(flightId);
      if (provider) {
        const providerKey = this.getProviderKey(provider);
        
        if (!flightsByProvider.has(providerKey)) {
          flightsByProvider.set(providerKey, []);
        }
        
        flightsByProvider.get(providerKey).push(flightId);
      }
    });

    return flightsByProvider;
  }

  /**
   * Get provider for flight
   * @param {string} flightId - Flight ID
   * @returns {Object|null} Provider instance
   */
  getProviderForFlight(flightId) {
    // This is a simplified implementation
    // In practice, you'd need to track which provider handles which flights
    // For now, return the first available provider
    
    if (this.providers.size > 0) {
      return this.providers.values().next().value;
    }
    
    return null;
  }

  /**
   * Get provider key
   * @param {Object} provider - Provider instance
   * @returns {string} Provider key
   */
  getProviderKey(provider) {
    for (const [key, value] of this.providers.entries()) {
      if (value === provider) {
        return key;
      }
    }
    return null;
  }

  /**
   * Generate flight key for deduplication
   * @param {Object} flight - Flight data
   * @returns {string} Flight key
   */
  generateFlightKey(flight) {
    return `${flight.airline.code}_${flight.flightNumber}_${flight.departure.scheduledTime}_${flight.arrival.scheduledTime}`;
  }

  /**
   * Sort flight results
   * @param {Array} flights - Array of flights
   * @param {Object} options - Sorting options
   * @returns {Array} Sorted flights
   */
  sortFlightResults(flights, options = {}) {
    const { sortBy = 'price', sortOrder = 'asc', prioritizePartnership = true } = options;

    return flights.sort((a, b) => {
      // Prioritize partnership flights if requested
      if (prioritizePartnership) {
        const aHasPartnership = a.partnershipId && a.partnershipTier;
        const bHasPartnership = b.partnershipId && b.partnershipTier;
        
        if (aHasPartnership && !bHasPartnership) return -1;
        if (!aHasPartnership && bHasPartnership) return 1;
        
        if (aHasPartnership && bHasPartnership) {
          const aTierRank = this.getTierRank(a.partnershipTier);
          const bTierRank = this.getTierRank(b.partnershipTier);
          
          if (aTierRank !== bTierRank) {
            return sortOrder === 'desc' ? bTierRank - aTierRank : aTierRank - bTierRank;
          }
        }
      }

      // Sort by specified criteria
      switch (sortBy) {
        case 'price':
          const aPrice = a.pricing?.total || 0;
          const bPrice = b.pricing?.total || 0;
          return sortOrder === 'desc' ? bPrice - aPrice : aPrice - bPrice;
          
        case 'duration':
          const aDuration = a.duration || 0;
          const bDuration = b.duration || 0;
          return sortOrder === 'desc' ? bDuration - aDuration : aDuration - bDuration;
          
        case 'departure':
          const aDeparture = new Date(a.departure?.scheduledTime || 0);
          const bDeparture = new Date(b.departure?.scheduledTime || 0);
          return sortOrder === 'desc' ? bDeparture - aDeparture : aDeparture - bDeparture;
          
        default:
          return 0;
      }
    });
  }

  /**
   * Get tier rank for sorting
   * @param {string} tier - Partnership tier
   * @returns {number} Tier rank
   */
  getTierRank(tier) {
    const tierRanks = {
      'diamond': 5,
      'platinum': 4,
      'gold': 3,
      'silver': 2,
      'bronze': 1
    };
    
    return tierRanks[tier] || 0;
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
   * Get health status of all providers
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    const healthStatus = {
      overall: 'healthy',
      providers: {},
      categories: {
        gds: { healthy: 0, total: 0 },
        direct: { healthy: 0, total: 0 },
        lowcost: { healthy: 0, total: 0 },
        regional: { healthy: 0, total: 0 }
      },
      timestamp: new Date().toISOString()
    };

    for (const [name, provider] of this.providers) {
      try {
        const isHealthy = await provider.healthCheck();
        healthStatus.providers[name] = {
          healthy: isHealthy,
          metadata: provider.getMetadata()
        };

        // Update category counts
        if (name.includes('amadeus') || name.includes('sabre') || name.includes('travelport')) {
          healthStatus.categories.gds.total++;
          if (isHealthy) healthStatus.categories.gds.healthy++;
        } else if (name.includes('direct_')) {
          healthStatus.categories.direct.total++;
          if (isHealthy) healthStatus.categories.direct.healthy++;
        } else if (name.includes('lowcost_')) {
          healthStatus.categories.lowcost.total++;
          if (isHealthy) healthStatus.categories.lowcost.healthy++;
        } else if (name.includes('regional_')) {
          healthStatus.categories.regional.total++;
          if (isHealthy) healthStatus.categories.regional.healthy++;
        }
      } catch (error) {
        healthStatus.providers[name] = {
          healthy: false,
          error: error.message
        };
      }
    }

    // Determine overall health
    const totalProviders = Object.keys(healthStatus.providers).length;
    const healthyProviders = Object.values(healthStatus.providers).filter(p => p.healthy).length;
    
    if (healthyProviders === 0) {
      healthStatus.overall = 'unhealthy';
    } else if (healthyProviders < totalProviders * 0.5) {
      healthStatus.overall = 'degraded';
    } else {
      healthStatus.overall = 'healthy';
    }

    return healthStatus;
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

  /**
   * Get providers by category
   * @param {string} category - Provider category
   * @returns {Array} Array of provider names
   */
  getProvidersByCategory(category) {
    switch (category) {
      case 'gds':
        return Array.from(this.gdsProviders.keys());
      case 'direct':
        return Array.from(this.directProviders.keys());
      case 'lowcost':
        return Array.from(this.lowCostProviders.keys());
      case 'regional':
        return Array.from(this.regionalProviders.keys());
      default:
        return [];
    }
  }
}

// Singleton instance
let partnershipManagerInstance = null;

/**
 * Get or create airline partnership manager instance
 * @param {Object} config - Configuration
 * @returns {AirlinePartnershipManager} Manager instance
 */
export function getAirlinePartnershipManager(config) {
  if (!partnershipManagerInstance) {
    partnershipManagerInstance = new AirlinePartnershipManager(config);
  }
  return partnershipManagerInstance;
}