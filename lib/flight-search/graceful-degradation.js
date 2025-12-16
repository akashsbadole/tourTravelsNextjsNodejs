/**
 * Graceful Degradation System for Flight Search
 * Provides fallback mechanisms, caching, and alternative strategies
 */

import { ErrorFactory } from '@/lib/errors/flight-search-errors';

/**
 * Fallback Cache Manager
 */
export class FallbackCacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.maxSize = 100;
  }

  /**
   * Set cache entry
   */
  set(key, data, ttl = this.defaultTTL) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      expires: Date.now() + ttl
    });
  }

  /**
   * Get cache entry
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if key exists
   */
  has(key) {
    const entry = this.cache.get(key);
    return entry && Date.now() <= entry.expires;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expires) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize
    };
  }
}

/**
 * Static Data Provider
 */
export class StaticDataProvider {
  constructor() {
    this.staticFlights = new Map();
    this.staticAirports = new Map();
    this.staticPrices = new Map();
    this.loadStaticData();
  }

  /**
   * Load static data (mock implementation)
   */
  loadStaticData() {
    // Load static flight data for fallback
    const mockFlights = [
      {
        id: 'static_001',
        flightCode: 'AA123',
        carrier: { name: 'American Airlines', code: 'AA' },
        origin: { code: 'JFK', name: 'New York JFK' },
        destination: { code: 'LAX', name: 'Los Angeles LAX' },
        departureTime: '2024-12-15T10:00:00Z',
        arrivalTime: '2024-12-15T13:00:00Z',
        duration: 180,
        price: 299,
        currency: 'USD',
        availableSeats: 50,
        cabinClass: 'economy'
      },
      {
        id: 'static_002',
        flightCode: 'UA456',
        carrier: { name: 'United Airlines', code: 'UA' },
        origin: { code: 'LAX', name: 'Los Angeles LAX' },
        destination: { code: 'JFK', name: 'New York JFK' },
        departureTime: '2024-12-15T14:00:00Z',
        arrivalTime: '2024-12-15T22:00:00Z',
        duration: 240,
        price: 349,
        currency: 'USD',
        availableSeats: 30,
        cabinClass: 'economy'
      },
      {
        id: 'static_003',
        flightCode: 'DL789',
        carrier: { name: 'Delta Airlines', code: 'DL' },
        origin: { code: 'ORD', name: 'Chicago O\'Hare' },
        destination: { code: 'ATL', name: 'Atlanta Hartsfield' },
        departureTime: '2024-12-15T08:00:00Z',
        arrivalTime: '2024-12-15T11:00:00Z',
        duration: 120,
        price: 199,
        currency: 'USD',
        availableSeats: 75,
        cabinClass: 'economy'
      }
    ];

    mockFlights.forEach(flight => {
      this.staticFlights.set(flight.id, flight);
    });

    // Load static airport data
    const mockAirports = [
      { code: 'JFK', name: 'New York JFK', city: 'New York', country: 'USA' },
      { code: 'LAX', name: 'Los Angeles LAX', city: 'Los Angeles', country: 'USA' },
      { code: 'ORD', name: 'Chicago O\'Hare', city: 'Chicago', country: 'USA' },
      { code: 'ATL', name: 'Atlanta Hartsfield', city: 'Atlanta', country: 'USA' },
      { code: 'LHR', name: 'London Heathrow', city: 'London', country: 'UK' },
      { code: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'France' }
    ];

    mockAirports.forEach(airport => {
      this.staticAirports.set(airport.code, airport);
    });

    // Load static pricing data
    const mockPrices = {
      'JFK-LAX': { min: 199, max: 599, average: 349 },
      'LAX-JFK': { min: 249, max: 699, average: 399 },
      'ORD-ATL': { min: 149, max: 399, average: 249 },
      'ATL-ORD': { min: 149, max: 399, average: 249 }
    };

    Object.entries(mockPrices).forEach(([route, prices]) => {
      this.staticPrices.set(route, prices);
    });
  }

  /**
   * Get static flight data
   */
  getFlights(searchParams) {
    const { origin, destination, departureDate } = searchParams;
    const route = `${origin}-${destination}`;
    
    // Filter flights based on search criteria
    const flights = Array.from(this.staticFlights.values()).filter(flight => {
      const matchesRoute = flight.origin.code === origin && flight.destination.code === destination;
      const matchesDate = this.isDateClose(flight.departureTime, departureDate, 1); // Within 1 day
      return matchesRoute && matchesDate;
    });

    return {
      success: true,
      data: flights,
      source: 'static',
      metadata: {
        total: flights.length,
        route,
        isFallback: true,
        message: 'Using static data due to service unavailability'
      }
    };
  }

  /**
   * Get airport information
   */
  getAirport(code) {
    return this.staticAirports.get(code);
  }

  /**
   * Get pricing information
   */
  getPricing(origin, destination) {
    const route = `${origin}-${destination}`;
    return this.staticPrices.get(route);
  }

  /**
   * Check if dates are close (within specified days)
   */
  isDateClose(flightDate, searchDate, days = 1) {
    const flight = new Date(flightDate);
    const search = new Date(searchDate);
    const diffDays = Math.abs((flight - search) / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  }

  /**
   * Generate mock search results
   */
  generateMockResults(searchParams) {
    const { origin, destination, passengers } = searchParams;
    const basePrice = this.getPricing(origin, destination);
    
    if (!basePrice) {
      return {
        success: false,
        error: 'No static data available for this route',
        source: 'static'
      };
    }

    // Generate 3-5 mock flights
    const numFlights = Math.floor(Math.random() * 3) + 3;
    const flights = [];

    for (let i = 0; i < numFlights; i++) {
      const flight = {
        id: `mock_${origin}_${destination}_${i}`,
        flightCode: `MOCK${Math.floor(Math.random() * 1000)}`,
        carrier: { name: 'Mock Airlines', code: 'MOCK' },
        origin: this.getAirport(origin),
        destination: this.getAirport(destination),
        departureTime: this.generateMockTime(searchParams.departureDate, i),
        arrivalTime: this.generateMockTime(searchParams.departureDate, i, 4), // 4 hours later
        duration: 240,
        price: basePrice.min + Math.floor(Math.random() * (basePrice.max - basePrice.min)),
        currency: 'USD',
        availableSeats: Math.floor(Math.random() * 50) + 10,
        cabinClass: searchParams.cabinClass || 'economy'
      };
      flights.push(flight);
    }

    return {
      success: true,
      data: flights,
      source: 'mock',
      metadata: {
        total: flights.length,
        route: `${origin}-${destination}`,
        isFallback: true,
        message: 'Using generated mock data'
      }
    };
  }

  /**
   * Generate mock departure time
   */
  generateMockTime(baseDate, offset = 0, hoursOffset = 0) {
    const date = new Date(baseDate);
    date.setHours(8 + (offset * 2) + hoursOffset);
    date.setMinutes(Math.floor(Math.random() * 60));
    return date.toISOString();
  }
}

/**
 * Alternative Search Strategy
 */
export class AlternativeSearchStrategy {
  constructor() {
    this.strategies = [
      'nearby_airports',
      'flexible_dates',
      'different_cabin',
      'reduce_filters',
      'mock_data'
    ];
  }

  /**
   * Generate alternative search options
   */
  async generateAlternatives(originalParams, error = null) {
    const alternatives = [];

    // Nearby airports strategy
    if (originalParams.origin && originalParams.destination) {
      const nearbyAlternatives = this.generateNearbyAirportAlternatives(originalParams);
      alternatives.push(...nearbyAlternatives);
    }

    // Flexible dates strategy
    if (originalParams.departureDate) {
      const dateAlternatives = this.generateFlexibleDateAlternatives(originalParams);
      alternatives.push(...dateAlternatives);
    }

    // Different cabin class strategy
    if (originalParams.cabinClass) {
      const cabinAlternatives = this.generateCabinAlternatives(originalParams);
      alternatives.push(...cabinAlternatives);
    }

    // Reduce filters strategy
    if (originalParams.filters && Object.keys(originalParams.filters).length > 0) {
      const reducedFilterAlternatives = this.generateReducedFilterAlternatives(originalParams);
      alternatives.push(...reducedFilterAlternatives);
    }

    // Mock data strategy (last resort)
    const mockAlternative = this.generateMockDataAlternative(originalParams);
    alternatives.push(mockAlternative);

    return {
      success: true,
      alternatives,
      metadata: {
        total: alternatives.length,
        originalError: error?.message,
        strategies: this.strategies
      }
    };
  }

  /**
   * Generate nearby airport alternatives
   */
  generateNearbyAirportAlternatives(params) {
    const nearbyAirports = {
      'JFK': ['LGA', 'EWR'],
      'LAX': ['BUR', 'SNA', 'LGB'],
      'ORD': ['MDW'],
      'SFO': ['OAK', 'SJC']
    };

    const alternatives = [];
    const originNearby = nearbyAirports[params.origin] || [];
    const destNearby = nearbyAirports[params.destination] || [];

    originNearby.forEach(nearbyOrigin => {
      alternatives.push({
        type: 'nearby_airports',
        title: `Try ${nearbyOrigin} instead of ${params.origin}`,
        params: {
          ...params,
          origin: nearbyOrigin,
          description: `Nearby airport to ${params.origin}`
        }
      });
    });

    destNearby.forEach(nearbyDest => {
      alternatives.push({
        type: 'nearby_airports',
        title: `Try ${nearbyDest} instead of ${params.destination}`,
        params: {
          ...params,
          destination: nearbyDest,
          description: `Nearby airport to ${params.destination}`
        }
      });
    });

    return alternatives;
  }

  /**
   * Generate flexible date alternatives
   */
  generateFlexibleDateAlternatives(params) {
    const alternatives = [];
    const baseDate = new Date(params.departureDate);

    // Generate alternatives for +/- 3 days
    for (let offset = 1; offset <= 3; offset++) {
      // Before date
      const beforeDate = new Date(baseDate);
      beforeDate.setDate(baseDate.getDate() - offset);
      
      alternatives.push({
        type: 'flexible_dates',
        title: `Try ${offset} day${offset > 1 ? 's' : ''} earlier`,
        params: {
          ...params,
          departureDate: beforeDate.toISOString().split('T')[0],
          description: `${offset} day${offset > 1 ? 's' : ''} before original date`
        }
      });

      // After date
      const afterDate = new Date(baseDate);
      afterDate.setDate(baseDate.getDate() + offset);
      
      alternatives.push({
        type: 'flexible_dates',
        title: `Try ${offset} day${offset > 1 ? 's' : ''} later`,
        params: {
          ...params,
          departureDate: afterDate.toISOString().split('T')[0],
          description: `${offset} day${offset > 1 ? 's' : ''} after original date`
        }
      });
    }

    return alternatives;
  }

  /**
   * Generate cabin class alternatives
   */
  generateCabinAlternatives(params) {
    const cabinHierarchy = ['economy', 'premium_economy', 'business', 'first'];
    const currentIndex = cabinHierarchy.indexOf(params.cabinClass);
    
    const alternatives = [];
    
    // Try lower cabin class
    if (currentIndex > 0) {
      const lowerCabin = cabinHierarchy[currentIndex - 1];
      alternatives.push({
        type: 'different_cabin',
        title: `Try ${lowerCabin.replace('_', ' ')} class`,
        params: {
          ...params,
          cabinClass: lowerCabin,
          description: 'Lower cabin class may have more availability'
        }
      });
    }

    // Try higher cabin class
    if (currentIndex < cabinHierarchy.length - 1) {
      const higherCabin = cabinHierarchy[currentIndex + 1];
      alternatives.push({
        type: 'different_cabin',
        title: `Try ${higherCabin.replace('_', ' ')} class`,
        params: {
          ...params,
          cabinClass: higherCabin,
          description: 'Higher cabin class may have different availability'
        }
      });
    }

    return alternatives;
  }

  /**
   * Generate reduced filter alternatives
   */
  generateReducedFilterAlternatives(params) {
    const alternatives = [];
    const filters = params.filters || {};

    // Remove price filter
    if (filters.priceRange) {
      alternatives.push({
        type: 'reduce_filters',
        title: 'Remove price filter',
        params: {
          ...params,
          filters: { ...filters, priceRange: undefined },
          description: 'Expand price range to see more options'
        }
      });
    }

    // Remove airline filter
    if (filters.airlines && filters.airlines.length > 0) {
      alternatives.push({
        type: 'reduce_filters',
        title: 'Include all airlines',
        params: {
          ...params,
          filters: { ...filters, airlines: [] },
          description: 'Show flights from all airlines'
        }
      });
    }

    // Remove time filter
    if (filters.departureTime) {
      alternatives.push({
        type: 'reduce_filters',
        title: 'Remove time filter',
        params: {
          ...params,
          filters: { ...filters, departureTime: undefined },
          description: 'Show flights at all times of day'
        }
      });
    }

    return alternatives;
  }

  /**
   * Generate mock data alternative
   */
  generateMockDataAlternative(params) {
    return {
      type: 'mock_data',
      title: 'View sample flights',
      params: {
        ...params,
        useMockData: true,
        description: 'Show sample flight data for demonstration'
      }
    };
  }
}

/**
 * Retry Manager
 */
export class RetryManager {
  constructor() {
    this.defaultMaxRetries = 3;
    this.defaultBaseDelay = 1000; // 1 second
    this.defaultMaxDelay = 30000; // 30 seconds
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry(fn, options = {}) {
    const {
      maxRetries = this.defaultMaxRetries,
      baseDelay = this.defaultBaseDelay,
      maxDelay = this.defaultMaxDelay,
      retryCondition = this.defaultRetryCondition,
      onRetry = null
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        
        if (attempt > 0) {
          console.log(`Operation succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !retryCondition(error)) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(2, attempt),
          maxDelay
        );

        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        
        if (onRetry) {
          await onRetry(error, attempt + 1, delay);
        } else {
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Default retry condition
   */
  defaultRetryCondition(error) {
    // Retry on network errors and 5xx server errors
    return (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      (error.statusCode >= 500 && error.statusCode < 600)
    );
  }

  /**
   * Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute with circuit breaker pattern
   */
  async executeWithCircuitBreaker(fn, circuitBreaker) {
    if (circuitBreaker.isOpen()) {
      throw ErrorFactory.serviceUnavailable('Circuit breaker is open');
    }

    try {
      const result = await fn();
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      throw error;
    }
  }
}

/**
 * Circuit Breaker
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  /**
   * Check if circuit is open
   */
  isOpen() {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record successful operation
   */
  recordSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Need 3 successes to close
        this.state = 'CLOSED';
      }
    } else {
      this.state = 'CLOSED';
    }
  }

  /**
   * Record failed operation
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      isOpen: this.isOpen()
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }
}

/**
 * Main Graceful Degradation Manager
 */
export class GracefulDegradationManager {
  constructor() {
    this.fallbackCache = new FallbackCacheManager();
    this.staticProvider = new StaticDataProvider();
    this.alternativeStrategy = new AlternativeSearchStrategy();
    this.retryManager = new RetryManager();
    this.circuitBreakers = new Map();
  }

  /**
   * Execute search with graceful degradation
   */
  async executeSearch(searchParams, searchFunction, options = {}) {
    const cacheKey = this.generateCacheKey(searchParams);
    
    try {
      // Try cache first
      if (!options.skipCache) {
        const cached = this.fallbackCache.get(cacheKey);
        if (cached) {
          return {
            ...cached,
            source: 'cache',
            metadata: {
              ...cached.metadata,
              fromCache: true
            }
          };
        }
      }

      // Get circuit breaker for this search type
      const circuitBreaker = this.getCircuitBreaker('flight_search');
      
      // Execute search with retry and circuit breaker
      const result = await this.retryManager.executeWithCircuitBreaker(
        () => searchFunction(searchParams),
        circuitBreaker
      );

      // Cache successful results
      this.fallbackCache.set(cacheKey, result);

      return {
        ...result,
        source: 'api',
        metadata: {
          ...result.metadata,
          fromCache: false
        }
      };

    } catch (error) {
      console.error('Primary search failed:', error);
      
      // Try fallback strategies
      return await this.handleSearchFallback(searchParams, error);
    }
  }

  /**
   * Handle search fallback
   */
  async handleSearchFallback(searchParams, error) {
    const fallbackStrategies = [
      () => this.tryStaticData(searchParams),
      () => this.tryAlternativeSearch(searchParams, error),
      () => this.tryMockData(searchParams)
    ];

    for (const strategy of fallbackStrategies) {
      try {
        const result = await strategy();
        if (result.success && result.data.length > 0) {
          return {
            ...result,
            metadata: {
              ...result.metadata,
              fallbackUsed: true,
              originalError: error.message
            }
          };
        }
      } catch (strategyError) {
        console.warn('Fallback strategy failed:', strategyError.message);
        continue;
      }
    }

    // All fallbacks failed
    throw ErrorFactory.noFlightsFound(searchParams);
  }

  /**
   * Try static data fallback
   */
  async tryStaticData(searchParams) {
    return this.staticProvider.getFlights(searchParams);
  }

  /**
   * Try alternative search strategies
   */
  async tryAlternativeSearch(searchParams, error) {
    return await this.alternativeStrategy.generateAlternatives(searchParams, error);
  }

  /**
   * Try mock data fallback
   */
  async tryMockData(searchParams) {
    return this.staticProvider.generateMockResults(searchParams);
  }

  /**
   * Get circuit breaker for a service
   */
  getCircuitBreaker(serviceName) {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker());
    }
    return this.circuitBreakers.get(serviceName);
  }

  /**
   * Generate cache key
   */
  generateCacheKey(searchParams) {
    const keyParts = [
      searchParams.origin,
      searchParams.destination,
      searchParams.departureDate,
      searchParams.returnDate,
      JSON.stringify(searchParams.passengers),
      searchParams.cabinClass
    ];
    
    return keyParts.join('|');
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.fallbackCache.clear();
  }

  /**
   * Get degradation statistics
   */
  getStats() {
    return {
      cache: this.fallbackCache.getStats(),
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
        name,
        status: breaker.getStatus()
      }))
    };
  }
}

// Create singleton instance
export const gracefulDegradationManager = new GracefulDegradationManager();

export default {
  FallbackCacheManager,
  StaticDataProvider,
  AlternativeSearchStrategy,
  RetryManager,
  CircuitBreaker,
  GracefulDegradationManager,
  gracefulDegradationManager
};