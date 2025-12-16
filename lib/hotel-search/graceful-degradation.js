/**
 * Hotel Search Graceful Degradation System
 * Provides fallback mechanisms when hotel search services are unavailable
 */

import { HotelErrorFactory } from '@/lib/errors/hotel-search-errors';

/**
 * Static Hotel Data Provider
 * Provides fallback hotel data when API is unavailable
 */
export class StaticHotelProvider {
  constructor() {
    this.staticHotels = this.loadStaticHotels();
    this.staticDestinations = this.loadStaticDestinations();
    this.staticAmenities = this.loadStaticAmenities();
  }

  /**
   * Load static hotel data
   */
  loadStaticHotels() {
    return [
      {
        id: 'fallback-hotel-1',
        name: 'Grand Plaza Hotel',
        location: {
          city: 'New York',
          country: 'USA',
          address: '123 Main St, Manhattan'
        },
        rating: 4.5,
        price: {
          base: 150,
          currency: 'USD',
          perNight: true
        },
        images: ['/api/placeholder/400/300'],
        amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Spa'],
        rooms: [
          {
            id: 'room-1',
            type: 'Standard Room',
            capacity: 2,
            price: 150,
            available: true
          },
          {
            id: 'room-2',
            type: 'Deluxe Room',
            capacity: 3,
            price: 220,
            available: true
          }
        ],
        reviews: {
          count: 245,
          average: 4.5
        }
      },
      {
        id: 'fallback-hotel-2',
        name: 'Seaside Resort',
        location: {
          city: 'Miami',
          country: 'USA',
          address: '456 Beach Ave, Miami Beach'
        },
        rating: 4.2,
        price: {
          base: 180,
          currency: 'USD',
          perNight: true
        },
        images: ['/api/placeholder/400/300'],
        amenities: ['WiFi', 'Beach Access', 'Pool', 'Bar', 'Restaurant'],
        rooms: [
          {
            id: 'room-3',
            type: 'Ocean View Room',
            capacity: 2,
            price: 180,
            available: true
          },
          {
            id: 'room-4',
            type: 'Suite',
            capacity: 4,
            price: 350,
            available: true
          }
        ],
        reviews: {
          count: 189,
          average: 4.2
        }
      },
      {
        id: 'fallback-hotel-3',
        name: 'Mountain Lodge',
        location: {
          city: 'Denver',
          country: 'USA',
          address: '789 Mountain Rd, Colorado'
        },
        rating: 4.7,
        price: {
          base: 120,
          currency: 'USD',
          perNight: true
        },
        images: ['/api/placeholder/400/300'],
        amenities: ['WiFi', 'Fireplace', 'Restaurant', 'Ski Access', 'Spa'],
        rooms: [
          {
            id: 'room-5',
            type: 'Cozy Room',
            capacity: 2,
            price: 120,
            available: true
          },
          {
            id: 'room-6',
            type: 'Family Suite',
            capacity: 5,
            price: 280,
            available: true
          }
        ],
        reviews: {
          count: 156,
          average: 4.7
        }
      }
    ];
  }

  /**
   * Load static destinations
   */
  loadStaticDestinations() {
    return [
      {
        city: 'New York',
        country: 'USA',
        description: 'The city that never sleeps',
        popularHotels: ['Grand Plaza Hotel', 'Times Square Inn']
      },
      {
        city: 'Miami',
        country: 'USA',
        description: 'Sun, sand, and vibrant nightlife',
        popularHotels: ['Seaside Resort', 'Beachfront Hotel']
      },
      {
        city: 'Denver',
        country: 'USA',
        description: 'Gateway to the Rocky Mountains',
        popularHotels: ['Mountain Lodge', 'Alpine Resort']
      }
    ];
  }

  /**
   * Load static amenities
   */
  loadStaticAmenities() {
    return [
      { id: 'wifi', name: 'Free WiFi', icon: 'wifi' },
      { id: 'pool', name: 'Swimming Pool', icon: 'pool' },
      { id: 'gym', name: 'Fitness Center', icon: 'fitness' },
      { id: 'restaurant', name: 'Restaurant', icon: 'restaurant' },
      { id: 'spa', name: 'Spa', icon: 'spa' },
      { id: 'parking', name: 'Free Parking', icon: 'parking' },
      { id: 'breakfast', name: 'Breakfast Included', icon: 'breakfast' },
      { id: 'bar', name: 'Bar/Lounge', icon: 'bar' }
    ];
  }

  /**
   * Get fallback hotels
   */
  async getFallbackHotels(searchParams = {}) {
    try {
      // Filter by destination if provided
      let filteredHotels = this.staticHotels;
      
      if (searchParams.destination) {
        const destination = searchParams.destination.toLowerCase();
        filteredHotels = this.staticHotels.filter(hotel => 
          hotel.location.city.toLowerCase().includes(destination) ||
          hotel.location.country.toLowerCase().includes(destination)
        );
      }

      // Filter by price range if provided
      if (searchParams.minPrice || searchParams.maxPrice) {
        filteredHotels = filteredHotels.filter(hotel => {
          const price = hotel.price.base;
          return (!searchParams.minPrice || price >= searchParams.minPrice) &&
                 (!searchParams.maxPrice || price <= searchParams.maxPrice);
        });
      }

      // Filter by rating if provided
      if (searchParams.minRating) {
        filteredHotels = filteredHotels.filter(hotel => 
          hotel.rating >= searchParams.minRating
        );
      }

      // Sort by rating by default
      filteredHotels.sort((a, b) => b.rating - a.rating);

      return {
        success: true,
        data: {
          hotels: filteredHotels,
          total: filteredHotels.length,
          isFallback: true,
          message: 'Showing cached hotel data - Live search temporarily unavailable'
        }
      };

    } catch (error) {
      throw HotelErrorFactory.createDataError(
        'Failed to load fallback hotel data',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get fallback hotel details
   */
  async getFallbackHotelDetails(hotelId) {
    const hotel = this.staticHotels.find(h => h.id === hotelId);
    
    if (!hotel) {
      throw HotelErrorFactory.createDataError(
        'Hotel not found in fallback data',
        { hotelId }
      );
    }

    return {
      success: true,
      data: {
        ...hotel,
        isFallback: true,
        message: 'Showing cached hotel details - Live data temporarily unavailable'
      }
    };
  }

  /**
   * Get fallback destinations
   */
  getFallbackDestinations() {
    return {
      success: true,
      data: {
        destinations: this.staticDestinations,
        isFallback: true
      }
    };
  }

  /**
   * Get fallback amenities
   */
  getFallbackAmenities() {
    return {
      success: true,
      data: {
        amenities: this.staticAmenities,
        isFallback: true
      }
    };
  }
}

/**
 * Hotel Cache Manager
 * Manages cached hotel search results
 */
export class HotelCacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 30 * 60 * 1000; // 30 minutes
    this.maxCacheSize = 100;
  }

  /**
   * Generate cache key
   */
  generateKey(searchParams) {
    const keyParts = [
      searchParams.destination || '',
      searchParams.checkIn || '',
      searchParams.checkOut || '',
      searchParams.guests?.adults || 1,
      searchParams.guests?.children || 0,
      searchParams.guests?.rooms || 1
    ];
    return keyParts.join('|').toLowerCase();
  }

  /**
   * Store search results in cache
   */
  store(key, data, ttl = this.defaultTTL) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
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
   * Retrieve data from cache
   */
  retrieve(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return {
      data: cached.data,
      isCached: true,
      cacheAge: Date.now() - cached.timestamp
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearAll() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expires) {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      validEntries: this.cache.size - expiredCount,
      maxSize: this.maxCacheSize
    };
  }
}

/**
 * Hotel Retry Manager
 * Manages retry logic with exponential backoff
 */
export class HotelRetryManager {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 10000; // 10 seconds
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry(operation, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if applicable
        if (attempt > 1) {
          console.log(`Hotel search operation succeeded on attempt ${attempt}`);
        }
        
        return {
          success: true,
          data: result,
          attempt,
          isRetry: attempt > 1
        };

      } catch (error) {
        lastError = error;
        
        // Don't retry on certain error types
        if (error.code === 'VALIDATION_ERROR' || 
            error.code === 'AUTHENTICATION_ERROR' ||
            error.code === 'PERMISSION_DENIED') {
          throw error;
        }

        // Log retry attempt
        console.warn(`Hotel search operation failed on attempt ${attempt}:`, error.message);

        // If this is the last attempt, throw the error
        if (attempt === this.maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt - 1),
          this.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const totalDelay = delay + jitter;

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }

    throw lastError;
  }

  /**
   * Get retry configuration
   */
  getRetryConfig() {
    return {
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      backoffStrategy: 'exponential'
    };
  }
}

/**
 * Hotel Circuit Breaker
 * Prevents cascading failures
 */
export class HotelCircuitBreaker {
  constructor() {
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureThreshold = 5;
    this.recoveryTimeout = 60000; // 1 minute
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.successThreshold = 3;
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw HotelErrorFactory.createNetworkError(
          'Hotel search service temporarily unavailable - Circuit breaker is open',
          { state: this.state, failureCount: this.failureCount }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed operation
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Get circuit breaker state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      isHealthy: this.state !== 'OPEN'
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }
}

/**
 * Main Hotel Graceful Degradation Manager
 */
export class HotelGracefulDegradationManager {
  constructor() {
    this.staticProvider = new StaticHotelProvider();
    this.cacheManager = new HotelCacheManager();
    this.retryManager = new HotelRetryManager();
    this.circuitBreaker = new HotelCircuitBreaker();
  }

  /**
   * Search hotels with graceful degradation
   */
  async searchHotels(searchParams, options = {}) {
    const { useCache = true, useFallback = true } = options;
    
    try {
      // Try cache first
      if (useCache) {
        const cacheKey = this.cacheManager.generateKey(searchParams);
        const cachedResult = this.cacheManager.retrieve(cacheKey);
        
        if (cachedResult) {
          return {
            success: true,
            data: cachedResult.data,
            isCached: true,
            cacheAge: cachedResult.cacheAge
          };
        }
      }

      // Try live search through circuit breaker
      const liveResult = await this.circuitBreaker.execute(async () => {
        return this.retryManager.executeWithRetry(async () => {
          // This would be the actual API call
          // For now, we'll simulate a failure to demonstrate fallback
          if (Math.random() < 0.3) { // 30% chance of failure for demo
            throw HotelErrorFactory.createNetworkError('API temporarily unavailable');
          }
          
          // Simulate successful API response
          return {
            hotels: this.staticProvider.staticHotels.slice(0, 2),
            total: 2,
            isLive: true
          };
        });
      });

      // Cache successful result
      if (useCache && liveResult.success) {
        const cacheKey = this.cacheManager.generateKey(searchParams);
        this.cacheManager.store(cacheKey, liveResult.data);
      }

      return liveResult;

    } catch (error) {
      console.warn('Live hotel search failed, attempting fallback:', error.message);

      // Try fallback data if enabled
      if (useFallback) {
        try {
          const fallbackResult = await this.staticProvider.getFallbackHotels(searchParams);
          
          // Cache fallback result for shorter duration
          if (useCache) {
            const cacheKey = this.cacheManager.generateKey(searchParams);
            this.cacheManager.store(cacheKey, fallbackResult.data, 5 * 60 * 1000); // 5 minutes
          }

          return {
            ...fallbackResult,
            isFallback: true,
            originalError: error.message
          };

        } catch (fallbackError) {
          console.error('Fallback hotel search also failed:', fallbackError.message);
        }
      }

      // All attempts failed
      throw HotelErrorFactory.createDataError(
        'Unable to search hotels at this time',
        { 
          originalError: error.message,
          suggestions: [
            'Try again in a few minutes',
            'Check your internet connection',
            'Contact support if the issue persists'
          ]
        }
      );
    }
  }

  /**
   * Get hotel details with graceful degradation
   */
  async getHotelDetails(hotelId, options = {}) {
    const { useCache = true, useFallback = true } = options;

    try {
      // Try cache first
      if (useCache) {
        const cachedResult = this.cacheManager.retrieve(`hotel:${hotelId}`);
        if (cachedResult) {
          return {
            success: true,
            data: cachedResult.data,
            isCached: true,
            cacheAge: cachedResult.cacheAge
          };
        }
      }

      // Try live search
      const liveResult = await this.circuitBreaker.execute(async () => {
        return this.retryManager.executeWithRetry(async () => {
          // Simulate API call
          if (Math.random() < 0.2) { // 20% chance of failure for demo
            throw HotelErrorFactory.createNetworkError('API temporarily unavailable');
          }
          
          return await this.staticProvider.getFallbackHotelDetails(hotelId);
        });
      });

      // Cache successful result
      if (useCache && liveResult.success) {
        this.cacheManager.store(`hotel:${hotelId}`, liveResult.data);
      }

      return liveResult;

    } catch (error) {
      console.warn('Live hotel details failed, attempting fallback:', error.message);

      // Try fallback data
      if (useFallback) {
        try {
          const fallbackResult = await this.staticProvider.getFallbackHotelDetails(hotelId);
          
          if (useCache) {
            this.cacheManager.store(`hotel:${hotelId}`, fallbackResult.data, 10 * 60 * 1000); // 10 minutes
          }

          return {
            ...fallbackResult,
            isFallback: true,
            originalError: error.message
          };

        } catch (fallbackError) {
          console.error('Fallback hotel details also failed:', fallbackError.message);
        }
      }

      throw HotelErrorFactory.createDataError(
        'Unable to load hotel details at this time',
        { 
          originalError: error.message,
          hotelId,
          suggestions: [
            'Try again in a few minutes',
            'Check your internet connection',
            'Contact support if the issue persists'
          ]
        }
      );
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth() {
    return {
      circuitBreaker: this.circuitBreaker.getState(),
      cache: this.cacheManager.getStats(),
      retry: this.retryManager.getRetryConfig(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.cacheManager.clearAll();
    this.circuitBreaker.reset();
  }
}

// Create singleton instance
export const hotelGracefulDegradationManager = new HotelGracefulDegradationManager();

export default {
  StaticHotelProvider,
  HotelCacheManager,
  HotelRetryManager,
  HotelCircuitBreaker,
  HotelGracefulDegradationManager,
  hotelGracefulDegradationManager
};