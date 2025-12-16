/**
 * Enhanced Flight Search Component
 * Integrates comprehensive error handling and monitoring
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FlightSearchErrorBoundary } from '@/components/error-handling/FlightSearchErrorBoundary';
import { FlightSearchErrorHandler } from '@/components/error-handling/FlightSearchErrorHandler';
import { flightSearchMonitor } from '@/lib/monitoring/flight-search-monitoring';
import { flightEdgeCaseHandler } from '@/lib/flight-search/edge-case-handler';
import { FlightErrorFactory } from '@/lib/errors/flight-search-errors';

/**
 * Flight Search Form Component
 */
const FlightSearchForm = ({ onSearch, isLoading, initialParams }) => {
  const [searchParams, setSearchParams] = useState({
    tripType: initialParams?.tripType || 'roundtrip',
    from: initialParams?.from || '',
    to: initialParams?.to || '',
    departureDate: initialParams?.departureDate || '',
    returnDate: initialParams?.returnDate || '',
    passengers: {
      adults: initialParams?.passengers?.adults || 1,
      children: initialParams?.passengers?.children || 0,
      infants: initialParams?.passengers?.infants || 0
    },
    class: initialParams?.class || 'economy'
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [suggestions, setSuggestions] = useState([]);

  /**
   * Validate form field
   */
  const validateField = useCallback(async (field, value) => {
    try {
      const tempParams = { ...searchParams, [field]: value };
      
      if (field === 'from' || field === 'to') {
        const validation = await flightEdgeCaseHandler.locationValidator.validateExists(value);
        if (!validation.valid) {
          return validation.error;
        }
      }

      if (field === 'departureDate') {
        const validation = flightEdgeCaseHandler.dateValidator.validateDepartureDate(value);
        if (!validation.valid) {
          return validation.error;
        }
      }

      if (field === 'returnDate' && searchParams.tripType === 'roundtrip') {
        const validation = flightEdgeCaseHandler.dateValidator.validateReturnDate(
          searchParams.departureDate,
          value
        );
        if (!validation.valid) {
          return validation.error;
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

    // Get suggestions for airports
    if ((field === 'from' || field === 'to') && value.length > 2) {
      try {
        const validation = await flightEdgeCaseHandler.locationValidator.validateExists(value);
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
   * Handle passengers change
   */
  const handlePassengersChange = useCallback((field, value) => {
    const numValue = parseInt(value) || 0;
    setSearchParams(prev => ({
      ...prev,
      passengers: {
        ...prev.passengers,
        [field]: numValue
      }
    }));
  }, []);

  /**
   * Handle trip type change
   */
  const handleTripTypeChange = useCallback((tripType) => {
    setSearchParams(prev => ({
      ...prev,
      tripType,
      returnDate: tripType === 'oneway' ? '' : prev.returnDate
    }));
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      // Validate all parameters
      const validation = await flightEdgeCaseHandler.validateSearchParams(searchParams);
      
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
    setSearchParams(prev => ({ 
      ...prev, 
      [suggestions.field]: suggestion.name 
    }));
    setSuggestions([]);
    setValidationErrors(prev => ({ ...prev, [suggestions.field]: null }));
  }, [suggestions]);

  return (
    <div className="flight-search-form">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Trip Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Trip Type</label>
          <div className="flex gap-4">
            {['roundtrip', 'oneway', 'multicity'].map(type => (
              <label key={type} className="flex items-center">
                <input
                  type="radio"
                  name="tripType"
                  value={type}
                  checked={searchParams.tripType === type}
                  onChange={(e) => handleTripTypeChange(e.target.value)}
                  className="mr-2"
                  disabled={isLoading}
                />
                <span className="capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* From and To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-2">From</label>
            <input
              type="text"
              value={searchParams.from}
              onChange={(e) => handleFieldChange('from', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.from ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter city or airport code"
              disabled={isLoading}
            />
            {validationErrors.from && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.from}</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-2">To</label>
            <input
              type="text"
              value={searchParams.to}
              onChange={(e) => handleFieldChange('to', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.to ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter city or airport code"
              disabled={isLoading}
            />
            {validationErrors.to && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.to}</p>
            )}
          </div>
        </div>

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

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Departure Date</label>
            <input
              type="date"
              value={searchParams.departureDate}
              onChange={(e) => handleFieldChange('departureDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.departureDate ? 'border-red-500' : 'border-gray-300'
              }`}
              min={new Date().toISOString().split('T')[0]}
              disabled={isLoading}
            />
            {validationErrors.departureDate && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.departureDate}</p>
            )}
          </div>

          {searchParams.tripType === 'roundtrip' && (
            <div>
              <label className="block text-sm font-medium mb-2">Return Date</label>
              <input
                type="date"
                value={searchParams.returnDate}
                onChange={(e) => handleFieldChange('returnDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.returnDate ? 'border-red-500' : 'border-gray-300'
                }`}
                min={searchParams.departureDate || new Date().toISOString().split('T')[0]}
                disabled={isLoading}
              />
              {validationErrors.returnDate && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.returnDate}</p>
              )}
            </div>
          )}
        </div>

        {/* Passengers */}
        <div>
          <label className="block text-sm font-medium mb-2">Passengers</label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Adults</label>
              <input
                type="number"
                min="1"
                max="9"
                value={searchParams.passengers.adults}
                onChange={(e) => handlePassengersChange('adults', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Children</label>
              <input
                type="number"
                min="0"
                max="9"
                value={searchParams.passengers.children}
                onChange={(e) => handlePassengersChange('children', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Infants</label>
              <input
                type="number"
                min="0"
                max="9"
                value={searchParams.passengers.infants}
                onChange={(e) => handlePassengersChange('infants', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
          </div>
          {validationErrors.passengers && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.passengers}</p>
          )}
        </div>

        {/* Class */}
        <div>
          <label className="block text-sm font-medium mb-2">Class</label>
          <select
            value={searchParams.class}
            onChange={(e) => handleFieldChange('class', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="economy">Economy</option>
            <option value="premium">Premium Economy</option>
            <option value="business">Business</option>
            <option value="first">First Class</option>
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
          {isLoading ? 'Searching...' : 'Search Flights'}
        </button>
      </form>
    </div>
  );
};

/**
 * Flight Search Results Component
 */
const FlightSearchResults = ({ results, onRetry, onAlternativeSearch, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flight-search-loading">
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
      <div className="flight-search-fallback">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="text-yellow-800 font-medium mb-2">Limited Search Results</h3>
          <p className="text-yellow-700">
            We're showing cached flight data while our search service is temporarily unavailable.
            Some information may not be up to date.
          </p>
        </div>
        
        {results.data?.flights?.length > 0 ? (
          <div className="flight-results-grid">
            {results.data.flights.map(flight => (
              <div key={flight.id} className="flight-card border rounded-lg p-4">
                <h4 className="font-medium">{flight.airline}</h4>
                <p className="text-gray-600">{flight.from} → {flight.to}</p>
                <p className="text-lg font-semibold">${flight.price}</p>
                <div className="text-sm text-gray-500">
                  {flight.departureTime} - {flight.arrivalTime}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No flights found in our cached data.</p>
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

  if (results.data?.flights?.length === 0) {
    return (
      <div className="flight-search-empty">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">No Flights Found</h3>
          <p className="text-gray-600 mb-4">
            We couldn't find any flights matching your search criteria.
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
    <div className="flight-search-results">
      {results.isCached && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-700 text-sm">
            Showing cached results from {Math.round(results.cacheAge / 1000)} seconds ago
          </p>
        </div>
      )}
      
      <div className="flight-results-header mb-4">
        <p className="text-gray-600">
          Found {results.data.flights.length} flights
          {results.responseTime && (
            <span className="text-sm"> in {Math.round(results.responseTime)}ms</span>
          )}
        </p>
      </div>
      
      <div className="flight-results-grid space-y-4">
        {results.data.flights.map(flight => (
          <div key={flight.id} className="flight-card border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-lg">{flight.airline}</h4>
                <p className="text-gray-600">{flight.from} → {flight.to}</p>
                <div className="flex items-center mt-2">
                  <span className="text-gray-500">{flight.departureTime}</span>
                  <span className="mx-2">→</span>
                  <span className="text-gray-500">{flight.arrivalTime}</span>
                  <span className="ml-4 text-gray-500">{flight.duration}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${flight.price}</p>
                <p className="text-gray-600">per person</p>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {flight.stops === 0 && (
                  <span className="bg-green-100 px-2 py-1 rounded text-sm">Non-stop</span>
                )}
                {flight.stops > 0 && (
                  <span className="bg-yellow-100 px-2 py-1 rounded text-sm">{flight.stops} stop{flight.stops > 1 ? 's' : ''}</span>
                )}
                <span className="bg-gray-100 px-2 py-1 rounded text-sm">{flight.class}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main Enhanced Flight Search Component
 */
const FlightSearchEnhanced = ({ initialParams }) => {
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  /**
   * Perform flight search
   */
  const performSearch = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/flights/search/enhanced', {
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
        newParams.departureDate = option.departureDate;
        newParams.returnDate = option.returnDate;
        break;
      case 'nearby_airports':
        newParams.from = option.from;
        newParams.to = option.to;
        break;
      case 'flexible_dates':
        newParams.flexibleDates = true;
        break;
    }

    performSearch(newParams);
  }, [searchHistory, performSearch]);

  /**
   * Start monitoring on component mount
   */
  useEffect(() => {
    flightSearchMonitor.startMonitoring();
    
    return () => {
      flightSearchMonitor.stopMonitoring();
    };
  }, []);

  return (
    <FlightSearchErrorBoundary>
      <div className="flight-search-enhanced">
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Flight Search</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search Form */}
            <div className="lg:col-span-1">
              <FlightSearchForm
                onSearch={performSearch}
                isLoading={isLoading}
                initialParams={initialParams}
              />
            </div>
            
            {/* Search Results */}
            <div className="lg:col-span-2">
              {error && (
                <FlightSearchErrorHandler
                  error={error}
                  onRetry={handleRetry}
                  onAlternativeSearch={handleAlternativeSearch}
                />
              )}
              
              <FlightSearchResults
                results={searchResults}
                onRetry={handleRetry}
                onAlternativeSearch={handleAlternativeSearch}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </FlightSearchErrorBoundary>
  );
};

export default FlightSearchEnhanced;