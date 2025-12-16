/**
 * Enhanced Hotel Search Component
 * Integrates comprehensive error handling and monitoring
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { HotelSearchErrorBoundary } from '@/components/error-handling/HotelSearchErrorBoundary';
import { HotelSearchErrorHandler } from '@/components/error-handling/HotelSearchErrorHandler';
import { hotelSearchMonitor } from '@/lib/monitoring/hotel-search-monitoring';
import { hotelEdgeCaseHandler } from '@/lib/hotel-search/edge-case-handler';
import { HotelErrorFactory } from '@/lib/errors/hotel-search-errors';

/**
 * Hotel Search Form Component
 */
const HotelSearchForm = ({ onSearch, isLoading, initialParams }) => {
  const [searchParams, setSearchParams] = useState({
    destination: initialParams?.destination || '',
    checkIn: initialParams?.checkIn || '',
    checkOut: initialParams?.checkOut || '',
    guests: {
      adults: initialParams?.guests?.adults || 1,
      children: initialParams?.guests?.children || 0,
      rooms: initialParams?.guests?.rooms || 1
    },
    minPrice: initialParams?.minPrice || '',
    maxPrice: initialParams?.maxPrice || '',
    minRating: initialParams?.minRating || ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [suggestions, setSuggestions] = useState([]);

  /**
   * Validate form field
   */
  const validateField = useCallback(async (field, value) => {
    try {
      const tempParams = { ...searchParams, [field]: value };
      
      if (field === 'destination') {
        const validation = await hotelEdgeCaseHandler.locationValidator.validateExists(value);
        if (!validation.valid) {
          return validation.error;
        }
      }

      if (field === 'checkIn' || field === 'checkOut') {
        const dateValidator = hotelEdgeCaseHandler.dateValidator;
        if (field === 'checkIn') {
          const validation = dateValidator.validateCheckIn(value);
          if (!validation.valid) {
            return validation.error;
          }
        } else if (searchParams.checkIn) {
          const validation = dateValidator.validateCheckOut(searchParams.checkIn, value);
          if (!validation.valid) {
            return validation.error;
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`Validation error for ${field}:`, error);
      return 'Validation failed';
    }
  }, [searchParams]);

  /**
   * Handle field change with validation
   */
  const handleFieldChange = useCallback(async (field, value) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
    
    // Clear previous error for this field
    setValidationErrors(prev => ({ ...prev, [field]: null }));
    
    // Validate field
    const error = await validateField(field, value);
    if (error) {
      setValidationErrors(prev => ({ ...prev, [field]: error }));
    }

    // Get suggestions for destination
    if (field === 'destination' && value.length > 2) {
      try {
        const validation = await hotelEdgeCaseHandler.locationValidator.validateExists(value);
        if (!validation.valid && validation.suggestions) {
          setSuggestions(validation.suggestions);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error getting suggestions:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }, [validateField]);

  /**
   * Handle guests change
   */
  const handleGuestsChange = useCallback((field, value) => {
    const numValue = parseInt(value) || 0;
    setSearchParams(prev => ({
      ...prev,
      guests: {
        ...prev.guests,
        [field]: numValue
      }
    }));
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      // Validate all parameters
      const validation = await hotelEdgeCaseHandler.validateSearchParams(searchParams);
      
      if (!validation.valid) {
        setValidationErrors(
          validation.errors.reduce((acc, error) => {
            acc[error.field] = error.error;
            return acc;
          }, {})
        );
        return;
      }

      // Clear any existing errors
      setValidationErrors({});
      
      // Trigger search
      onSearch(validation.validParams);

    } catch (error) {
      console.error('Search validation failed:', error);
      setValidationErrors({
        general: 'Search validation failed. Please try again.'
      });
    }
  }, [searchParams, onSearch]);

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = useCallback((suggestion) => {
    setSearchParams(prev => ({ ...prev, destination: suggestion.name }));
    setSuggestions([]);
    setValidationErrors(prev => ({ ...prev, destination: null }));
  }, []);

  return (
    <div className="hotel-search-form">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Destination Input */}
        <div className="relative">
          <label className="block text-sm font-medium mb-2">
            Destination
          </label>
          <input
            type="text"
            value={searchParams.destination}
            onChange={(e) => handleFieldChange('destination', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              validationErrors.destination ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter city or hotel name"
            disabled={isLoading}
          />
          {validationErrors.destination && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.destination}</p>
          )}
          
          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 shadow-lg">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                >
                  <div className="font-medium">{suggestion.name}</div>
                  <div className="text-sm text-gray-600">{suggestion.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Check-in Date
            </label>
            <input
              type="date"
              value={searchParams.checkIn}
              onChange={(e) => handleFieldChange('checkIn', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.checkIn ? 'border-red-500' : 'border-gray-300'
              }`}
              min={new Date().toISOString().split('T')[0]}
              disabled={isLoading}
            />
            {validationErrors.checkIn && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.checkIn}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Check-out Date
            </label>
            <input
              type="date"
              value={searchParams.checkOut}
              onChange={(e) => handleFieldChange('checkOut', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.checkOut ? 'border-red-500' : 'border-gray-300'
              }`}
              min={searchParams.checkIn || new Date().toISOString().split('T')[0]}
              disabled={isLoading}
            />
            {validationErrors.checkOut && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.checkOut}</p>
            )}
          </div>
        </div>

        {/* Guests Configuration */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Guests & Rooms
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Adults</label>
              <input
                type="number"
                min="1"
                max="10"
                value={searchParams.guests.adults}
                onChange={(e) => handleGuestsChange('adults', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Children</label>
              <input
                type="number"
                min="0"
                max="10"
                value={searchParams.guests.children}
                onChange={(e) => handleGuestsChange('children', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Rooms</label>
              <input
                type="number"
                min="1"
                max="5"
                value={searchParams.guests.rooms}
                onChange={(e) => handleGuestsChange('rooms', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
          </div>
          {validationErrors.guests && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.guests}</p>
          )}
        </div>

        {/* Price Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Min Price (optional)
            </label>
            <input
              type="number"
              min="0"
              value={searchParams.minPrice}
              onChange={(e) => handleFieldChange('minPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Max Price (optional)
            </label>
            <input
              type="number"
              min="0"
              value={searchParams.maxPrice}
              onChange={(e) => handleFieldChange('maxPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Min Rating */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Minimum Rating (optional)
          </label>
          <select
            value={searchParams.minRating}
            onChange={(e) => handleFieldChange('minRating', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="">Any Rating</option>
            <option value="3">3+ Stars</option>
            <option value="4">4+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="5">5 Stars</option>
          </select>
        </div>

        {/* General Error */}
        {validationErrors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700">{validationErrors.general}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || Object.keys(validationErrors).some(key => validationErrors[key])}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search Hotels'}
        </button>
      </form>
    </div>
  );
};

/**
 * Hotel Search Results Component
 */
const HotelSearchResults = ({ results, onRetry, onAlternativeSearch, isLoading }) => {
  if (isLoading) {
    return (
      <div className="hotel-search-loading">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 h-48 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  if (results.isFallback) {
    return (
      <div className="hotel-search-fallback">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="text-yellow-800 font-medium mb-2">Limited Search Results</h3>
          <p className="text-yellow-700">
            We're showing cached hotel data while our search service is temporarily unavailable.
            Some information may not be up to date.
          </p>
        </div>
        
        {results.data?.hotels?.length > 0 ? (
          <div className="hotel-results-grid">
            {results.data.hotels.map(hotel => (
              <div key={hotel.id} className="hotel-card border rounded-lg p-4">
                <h4 className="font-medium">{hotel.name}</h4>
                <p className="text-gray-600">{hotel.location.city}, {hotel.location.country}</p>
                <p className="text-lg font-semibold">${hotel.price.base}/night</p>
                <div className="text-sm text-gray-500">
                  Rating: {hotel.rating} ⭐
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No hotels found in our cached data.</p>
            <button
              onClick={onRetry}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  if (results.data?.hotels?.length === 0) {
    return (
      <div className="hotel-search-empty">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">No Hotels Found</h3>
          <p className="text-gray-600 mb-4">
            We couldn't find any hotels matching your search criteria.
          </p>
          
          {results.alternatives && (
            <div className="alternatives-section">
              <h4 className="font-medium mb-3">Try these alternatives:</h4>
              {results.alternatives.map((alternative, index) => (
                <div key={index} className="mb-3">
                  <h5 className="font-medium">{alternative.title}</h5>
                  <div className="space-y-2">
                    {alternative.options.map((option, optIndex) => (
                      <button
                        key={optIndex}
                        onClick={() => onAlternativeSearch(alternative.type, option)}
                        className="block w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
                      >
                        {option.description}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={onRetry}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Search Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hotel-search-results">
      {results.isCached && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-700 text-sm">
            Showing cached results from {Math.round(results.cacheAge / 1000)} seconds ago
          </p>
        </div>
      )}
      
      <div className="hotel-results-header mb-4">
        <p className="text-gray-600">
          Found {results.data.hotels.length} hotels
          {results.responseTime && (
            <span className="text-sm"> in {Math.round(results.responseTime)}ms</span>
          )}
        </p>
      </div>
      
      <div className="hotel-results-grid space-y-4">
        {results.data.hotels.map(hotel => (
          <div key={hotel.id} className="hotel-card border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-lg">{hotel.name}</h4>
                <p className="text-gray-600">{hotel.location.address}</p>
                <div className="flex items-center mt-2">
                  <span className="text-yellow-500">{'★'.repeat(Math.floor(hotel.rating))}</span>
                  <span className="ml-2 text-gray-600">{hotel.rating}</span>
                  <span className="ml-4 text-gray-500">({hotel.reviews.count} reviews)</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${hotel.price.base}</p>
                <p className="text-gray-600">per night</p>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {hotel.amenities.slice(0, 5).map(amenity => (
                  <span key={amenity} className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {amenity}
                  </span>
                ))}
                {hotel.amenities.length > 5 && (
                  <span className="text-gray-500 text-sm">
                    +{hotel.amenities.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main Enhanced Hotel Search Component
 */
const HotelSearchEnhanced = ({ initialParams }) => {
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  /**
   * Perform hotel search
   */
  const performSearch = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/hotels/search/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (result.success) {
        setSearchResults(result.data);
        
        // Add to search history
        setSearchHistory(prev => [
          {
            params,
            result: result.data,
            timestamp: new Date().toISOString()
          },
          ...prev.slice(0, 9) // Keep last 10 searches
        ]);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to search service',
        suggestions: ['Check your internet connection', 'Try again in a few minutes']
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle retry
   */
  const handleRetry = useCallback(() => {
    if (searchHistory.length > 0) {
      const lastSearch = searchHistory[0];
      performSearch(lastSearch.params);
    }
  }, [searchHistory, performSearch]);

  /**
   * Handle alternative search
   */
  const handleAlternativeSearch = useCallback((type, option) => {
    let newParams = { ...searchHistory[0]?.params };

    switch (type) {
      case 'alternative_dates':
        newParams.checkIn = option.checkInDate;
        newParams.checkOut = option.checkOutDate;
        break;
      case 'nearby_locations':
        newParams.destination = option.location;
        break;
      case 'guest_configuration':
        // Handle guest configuration changes
        break;
    }

    performSearch(newParams);
  }, [searchHistory, performSearch]);

  /**
   * Start monitoring on component mount
   */
  useEffect(() => {
    hotelSearchMonitor.startMonitoring();
    
    return () => {
      hotelSearchMonitor.stopMonitoring();
    };
  }, []);

  return (
    <HotelSearchErrorBoundary>
      <div className="hotel-search-enhanced">
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Hotel Search</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search Form */}
            <div className="lg:col-span-1">
              <HotelSearchForm
                onSearch={performSearch}
                isLoading={isLoading}
                initialParams={initialParams}
              />
            </div>
            
            {/* Search Results */}
            <div className="lg:col-span-2">
              {error && (
                <HotelSearchErrorHandler
                  error={error}
                  onRetry={handleRetry}
                  onAlternativeSearch={handleAlternativeSearch}
                />
              )}
              
              <HotelSearchResults
                results={searchResults}
                onRetry={handleRetry}
                onAlternativeSearch={handleAlternativeSearch}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </HotelSearchErrorBoundary>
  );
};

export default HotelSearchEnhanced;