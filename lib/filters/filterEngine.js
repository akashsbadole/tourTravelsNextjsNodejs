/**
 * Advanced Flight Filter Engine
 * Smart filtering algorithms with performance optimizations
 */

import { FILTER_CATEGORIES, FILTER_TYPES, validateFilterValue } from './advancedFlightFilters';

// Cache for filtered results
const filterCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Performance monitoring
const performanceMetrics = {
  filterOperations: 0,
  totalFilterTime: 0,
  cacheHits: 0,
  cacheMisses: 0
};

export class FlightFilterEngine {
  constructor(options = {}) {
    this.enableCache = options.enableCache !== false;
    this.enableMetrics = options.enableMetrics !== false;
    this.batchSize = options.batchSize || 100;
    this.maxConcurrentOperations = options.maxConcurrentOperations || 4;
  }

  /**
   * Main filtering function with caching and performance optimization
   */
  async filterFlights(flights, filters, options = {}) {
    const startTime = performance.now();
    
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(flights, filters, options);
      
      // Check cache first
      if (this.enableCache) {
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
          if (this.enableMetrics) performanceMetrics.cacheHits++;
          return cached;
        }
        if (this.enableMetrics) performanceMetrics.cacheMisses++;
      }

      // Validate filters
      const validationResult = this.validateFilters(filters);
      if (!validationResult.valid) {
        throw new Error(`Invalid filters: ${validationResult.errors.join(', ')}`);
      }

      // Apply filters with performance optimization
      let result;
      if (flights.length > this.batchSize) {
        result = await this.batchFilterFlights(flights, filters, options);
      } else {
        result = this.filterFlightsSync(flights, filters, options);
      }

      // Cache the result
      if (this.enableCache) {
        this.setCachedResult(cacheKey, result);
      }

      // Update performance metrics
      if (this.enableMetrics) {
        const endTime = performance.now();
        performanceMetrics.filterOperations++;
        performanceMetrics.totalFilterTime += (endTime - startTime);
      }

      return result;
    } catch (error) {
      console.error('Error filtering flights:', error);
      throw error;
    }
  }

  /**
   * Synchronous filtering for smaller datasets
   */
  filterFlightsSync(flights, filters, options = {}) {
    const { includeMetadata = true } = options;
    
    let filteredFlights = flights;
    const filterStats = {};

    // Apply each filter category
    for (const [category, filterValue] of Object.entries(filters)) {
      if (filterValue === null || filterValue === undefined || 
          (Array.isArray(filterValue) && filterValue.length === 0)) {
        continue;
      }

      const beforeCount = filteredFlights.length;
      filteredFlights = this.applyFilter(filteredFlights, category, filterValue);
      const afterCount = filteredFlights.length;

      filterStats[category] = {
        before: beforeCount,
        after: afterCount,
        removed: beforeCount - afterCount
      };
    }

    const result = {
      flights: filteredFlights,
      totalCount: flights.length,
      filteredCount: filteredFlights.length
    };

    if (includeMetadata) {
      result.metadata = {
        filterStats,
        performance: this.getPerformanceMetrics(),
        appliedFilters: this.getAppliedFilters(filters)
      };
    }

    return result;
  }

  /**
   * Asynchronous batch filtering for large datasets
   */
  async batchFilterFlights(flights, filters, options = {}) {
    const { includeMetadata = true } = options;
    
    // Split flights into batches
    const batches = [];
    for (let i = 0; i < flights.length; i += this.batchSize) {
      batches.push(flights.slice(i, i + this.batchSize));
    }

    // Process batches concurrently
    const results = await this.processBatchesConcurrently(batches, filters);
    
    // Combine results
    const allFilteredFlights = results.flatMap(result => result.flights);
    const totalCount = flights.length;
    const filteredCount = allFilteredFlights.length;

    const result = {
      flights: allFilteredFlights,
      totalCount,
      filteredCount
    };

    if (includeMetadata) {
      // Aggregate filter stats from all batches
      const aggregatedStats = this.aggregateFilterStats(results);
      result.metadata = {
        filterStats: aggregatedStats,
        performance: this.getPerformanceMetrics(),
        appliedFilters: this.getAppliedFilters(filters)
      };
    }

    return result;
  }

  /**
   * Process batches concurrently with controlled concurrency
   */
  async processBatchesConcurrently(batches, filters) {
    const results = [];
    
    // Process batches in chunks to control concurrency
    for (let i = 0; i < batches.length; i += this.maxConcurrentOperations) {
      const chunk = batches.slice(i, i + this.maxConcurrentOperations);
      
      const chunkPromises = chunk.map(batch => 
        Promise.resolve(this.filterFlightsSync(batch, filters, { includeMetadata: true }))
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Apply a single filter category to flights
   */
  applyFilter(flights, category, filterValue) {
    switch (category) {
      case FILTER_CATEGORIES.PRICE:
        return this.filterByPrice(flights, filterValue);
      
      case FILTER_CATEGORIES.DURATION:
        return this.filterByDuration(flights, filterValue);
      
      case FILTER_CATEGORIES.STOPS:
        return this.filterByStops(flights, filterValue);
      
      case FILTER_CATEGORIES.AIRLINES:
        return this.filterByAirlines(flights, filterValue);
      
      case FILTER_CATEGORIES.AIRPORTS:
        return this.filterByAirports(flights, filterValue);
      
      case FILTER_CATEGORIES.TIMES:
        return this.filterByTimes(flights, filterValue);
      
      case FILTER_CATEGORIES.AMENITIES:
        return this.filterByAmenities(flights, filterValue);
      
      case FILTER_CATEGORIES.AIRCRAFT:
        return this.filterByAircraft(flights, filterValue);
      
      case FILTER_CATEGORIES.BAGGAGE:
        return this.filterByBaggage(flights, filterValue);
      
      case FILTER_CATEGORIES.LAYOVER:
        return this.filterByLayover(flights, filterValue);
      
      case FILTER_CATEGORIES.CLASS:
        return this.filterByClass(flights, filterValue);
      
      case FILTER_CATEGORIES.REFUNDABLE:
        return this.filterByRefundable(flights, filterValue);
      
      case FILTER_CATEGORIES.ENVIRONMENTAL:
        return this.filterByEnvironmental(flights, filterValue);
      
      default:
        console.warn(`Unknown filter category: ${category}`);
        return flights;
    }
  }

  // Individual filter methods
  filterByPrice(flights, priceRange) {
    if (!priceRange || typeof priceRange !== 'object') return flights;
    
    const { min = 0, max = Infinity } = priceRange;
    return flights.filter(flight => {
      const price = this.getFlightPrice(flight);
      return price >= min && price <= max;
    });
  }

  filterByDuration(flights, durationRange) {
    if (!durationRange || typeof durationRange !== 'object') return flights;
    
    const { min = 0, max = Infinity } = durationRange;
    return flights.filter(flight => {
      const duration = flight.totalDurationMinutes || 0;
      return duration >= min && duration <= max;
    });
  }

  filterByStops(flights, stops) {
    if (!Array.isArray(stops) || stops.length === 0) return flights;
    
    return flights.filter(flight => {
      const flightStops = this.getFlightStops(flight);
      return stops.includes(flightStops);
    });
  }

  filterByAirlines(flights, airlines) {
    if (!Array.isArray(airlines) || airlines.length === 0) return flights;
    
    return flights.filter(flight => {
      const airline = this.getFlightAirline(flight);
      return airlines.includes(airline);
    });
  }

  filterByAirports(flights, airports) {
    if (!airports || typeof airports !== 'object') return flights;
    
    return flights.filter(flight => {
      const departureAirport = this.getDepartureAirport(flight);
      const arrivalAirport = this.getArrivalAirport(flight);
      
      let matches = true;
      
      if (airports.departure && airports.departure.length > 0) {
        matches = matches && airports.departure.includes(departureAirport);
      }
      
      if (airports.arrival && airports.arrival.length > 0) {
        matches = matches && airports.arrival.includes(arrivalAirport);
      }
      
      return matches;
    });
  }

  filterByTimes(flights, timeFilters) {
    if (!timeFilters || typeof timeFilters !== 'object') return flights;
    
    return flights.filter(flight => {
      let matches = true;
      
      if (timeFilters.departure) {
        const departureTime = this.getDepartureTime(flight);
        matches = matches && this.isTimeInRange(departureTime, timeFilters.departure);
      }
      
      if (timeFilters.arrival) {
        const arrivalTime = this.getArrivalTime(flight);
        matches = matches && this.isTimeInRange(arrivalTime, timeFilters.arrival);
      }
      
      return matches;
    });
  }

  filterByAmenities(flights, amenities) {
    if (!Array.isArray(amenities) || amenities.length === 0) return flights;
    
    return flights.filter(flight => {
      const flightAmenities = this.getFlightAmenities(flight) || [];
      return amenities.every(amenity => flightAmenities.includes(amenity));
    });
  }

  filterByAircraft(flights, aircraftTypes) {
    if (!Array.isArray(aircraftTypes) || aircraftTypes.length === 0) return flights;
    
    return flights.filter(flight => {
      const aircraftType = this.getAircraftType(flight);
      return aircraftTypes.includes(aircraftType);
    });
  }

  filterByBaggage(flights, baggage) {
    if (!baggage || typeof baggage !== 'object') return flights;
    
    return flights.filter(flight => {
      let matches = true;
      
      if (baggage.cabin) {
        const cabinBaggage = this.getCabinBaggage(flight);
        matches = matches && cabinBaggage >= baggage.cabin;
      }
      
      if (baggage.checked) {
        const checkedBaggage = this.getCheckedBaggage(flight);
        matches = matches && checkedBaggage >= baggage.checked;
      }
      
      return matches;
    });
  }

  filterByLayover(flights, layoverRange) {
    if (!layoverRange || typeof layoverRange !== 'object') return flights;
    
    const { min = 0, max = Infinity } = layoverRange;
    return flights.filter(flight => {
      const layoverDuration = this.getMaxLayoverDuration(flight);
      return layoverDuration >= min && layoverDuration <= max;
    });
  }

  filterByClass(flights, classes) {
    if (!Array.isArray(classes) || classes.length === 0) return flights;
    
    return flights.filter(flight => {
      const flightClass = this.getFlightClass(flight);
      return classes.includes(flightClass);
    });
  }

  filterByRefundable(flights, refundable) {
    if (typeof refundable !== 'boolean') return flights;
    
    return flights.filter(flight => {
      const isRefundable = this.getRefundableStatus(flight);
      return isRefundable === refundable;
    });
  }

  filterByEnvironmental(flights, environmentalRange) {
    if (!environmentalRange || typeof environmentalRange !== 'object') return flights;
    
    const { min = 0, max = Infinity } = environmentalRange;
    return flights.filter(flight => {
      const carbonEmission = this.getCarbonEmission(flight) || 0;
      return carbonEmission >= min && carbonEmission <= max;
    });
  }

  // Helper methods for extracting flight data
  getFlightPrice(flight) {
    // Extract price from flight data structure
    if (flight.price) return flight.price;
    if (flight.totalPrice) return flight.totalPrice;
    if (flight.fareBreakdowns) {
      return Object.values(flight.fareBreakdowns).reduce((sum, fare) => sum + (fare.total || 0), 0);
    }
    return 0;
  }

  getFlightStops(flight) {
    if (flight.stops !== undefined) return flight.stops;
    if (flight.segmentIds && flight.segmentIds.length > 1) {
      return flight.segmentIds.length - 1;
    }
    return 0;
  }

  getFlightAirline(flight) {
    if (flight.airline) return flight.airline;
    if (flight.carrierInCharge) return flight.carrierInCharge._id;
    if (flight.airlineId) return flight.airlineId._id;
    return null;
  }

  getDepartureAirport(flight) {
    if (flight.departureAirport) return flight.departureAirport;
    if (flight.segmentIds && flight.segmentIds.length > 0) {
      return flight.segmentIds[0].from.airport.iataCode;
    }
    return null;
  }

  getArrivalAirport(flight) {
    if (flight.arrivalAirport) return flight.arrivalAirport;
    if (flight.segmentIds && flight.segmentIds.length > 0) {
      const lastSegment = flight.segmentIds[flight.segmentIds.length - 1];
      return lastSegment.to.airport.iataCode;
    }
    return null;
  }

  getDepartureTime(flight) {
    if (flight.departureTime) return flight.departureTime;
    if (flight.segmentIds && flight.segmentIds.length > 0) {
      return new Date(flight.segmentIds[0].from.scheduledDeparture);
    }
    return null;
  }

  getArrivalTime(flight) {
    if (flight.arrivalTime) return flight.arrivalTime;
    if (flight.segmentIds && flight.segmentIds.length > 0) {
      const lastSegment = flight.segmentIds[flight.segmentIds.length - 1];
      return new Date(lastSegment.to.scheduledArrival);
    }
    return null;
  }

  getFlightAmenities(flight) {
    return flight.amenities || [];
  }

  getAircraftType(flight) {
    return flight.aircraftType || flight.aircraft || 'unknown';
  }

  getCabinBaggage(flight) {
    if (flight.baggage && flight.baggage.cabin) return flight.baggage.cabin;
    return 7; // Default cabin baggage
  }

  getCheckedBaggage(flight) {
    if (flight.baggage && flight.baggage.checked) return flight.baggage.checked;
    return 20; // Default checked baggage
  }

  getMaxLayoverDuration(flight) {
    if (flight.layovers && flight.layovers.length > 0) {
      return Math.max(...flight.layovers.map(layover => layover.durationMinutes || 0));
    }
    return 0;
  }

  getFlightClass(flight) {
    return flight.class || flight.travelClass || 'economy';
  }

  getRefundableStatus(flight) {
    return flight.refundable || flight.isRefundable || false;
  }

  getCarbonEmission(flight) {
    return flight.carbonEmission || 0;
  }

  isTimeInRange(time, range) {
    if (!time || !range) return false;
    
    const timeInMinutes = time.getHours() * 60 + time.getMinutes();
    
    if (range.start !== undefined && range.end !== undefined) {
      return timeInMinutes >= range.start && timeInMinutes <= range.end;
    }
    
    if (Array.isArray(range)) {
      return range.some(r => this.isTimeInRange(time, r));
    }
    
    return false;
  }

  // Cache management
  generateCacheKey(flights, filters, options) {
    const flightsHash = this.hashFlights(flights);
    const filtersHash = this.hashObject(filters);
    const optionsHash = this.hashObject(options);
    return `${flightsHash}_${filtersHash}_${optionsHash}`;
  }

  hashFlights(flights) {
    // Use flight IDs for hashing if available
    if (flights.length === 0) return 'empty';
    
    const firstId = flights[0]._id || flights[0].id || 'unknown';
    const lastId = flights[flights.length - 1]._id || flights[flights.length - 1].id || 'unknown';
    const count = flights.length;
    
    return `${count}_${firstId}_${lastId}`;
  }

  hashObject(obj) {
    return btoa(JSON.stringify(obj)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  getCachedResult(key) {
    const cached = filterCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result;
    }
    
    if (cached) {
      filterCache.delete(key);
    }
    
    return null;
  }

  setCachedResult(key, result) {
    // Remove oldest entries if cache is full
    if (filterCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = filterCache.keys().next().value;
      filterCache.delete(oldestKey);
    }
    
    filterCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  clearCache() {
    filterCache.clear();
  }

  // Validation and metrics
  validateFilters(filters) {
    const errors = [];
    
    for (const [category, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;
      
      // Basic validation based on filter type
      if (category === FILTER_CATEGORIES.PRICE && typeof value === 'object') {
        if (value.min !== undefined && value.min < 0) {
          errors.push(`${category}: minimum price cannot be negative`);
        }
        if (value.max !== undefined && value.max < 0) {
          errors.push(`${category}: maximum price cannot be negative`);
        }
        if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
          errors.push(`${category}: minimum price cannot be greater than maximum`);
        }
      }
      
      // Add more validation as needed
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  getAppliedFilters(filters) {
    const applied = {};
    
    for (const [category, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && 
          !((Array.isArray(value) && value.length === 0) || 
            (typeof value === 'object' && Object.keys(value).length === 0))) {
        applied[category] = value;
      }
    }
    
    return applied;
  }

  aggregateFilterStats(batchResults) {
    const aggregated = {};
    
    for (const result of batchResults) {
      if (!result.metadata || !result.metadata.filterStats) continue;
      
      for (const [category, stats] of Object.entries(result.metadata.filterStats)) {
        if (!aggregated[category]) {
          aggregated[category] = {
            before: 0,
            after: 0,
            removed: 0
          };
        }
        
        aggregated[category].before += stats.before;
        aggregated[category].after += stats.after;
        aggregated[category].removed += stats.removed;
      }
    }
    
    return aggregated;
  }

  getPerformanceMetrics() {
    if (!this.enableMetrics) return null;
    
    return {
      totalOperations: performanceMetrics.filterOperations,
      averageTime: performanceMetrics.filterOperations > 0 
        ? performanceMetrics.totalFilterTime / performanceMetrics.filterOperations 
        : 0,
      cacheHitRate: performanceMetrics.cacheHits + performanceMetrics.cacheMisses > 0
        ? performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)
        : 0,
      cacheSize: filterCache.size
    };
  }

  resetMetrics() {
    performanceMetrics.filterOperations = 0;
    performanceMetrics.totalFilterTime = 0;
    performanceMetrics.cacheHits = 0;
    performanceMetrics.cacheMisses = 0;
  }
}

// Create singleton instance
export const flightFilterEngine = new FlightFilterEngine();

// Export utility functions
export function createFilterEngine(options) {
  return new FlightFilterEngine(options);
}

export function getGlobalPerformanceMetrics() {
  return flightFilterEngine.getPerformanceMetrics();
}

export function clearFilterCache() {
  flightFilterEngine.clearCache();
}