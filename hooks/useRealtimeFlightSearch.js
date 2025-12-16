"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

/**
 * Real-time Flight Search Hook
 * Handles real-time flight search with caching and error handling
 */
export function useRealtimeFlightSearch() {
  const [searchState, setSearchState] = useState({
    isLoading: false,
    isRefreshing: false,
    data: [],
    error: null,
    metadata: {
      searchTime: 0,
      totalResults: 0,
      cached: false,
      source: 'unknown'
    }
  });

  const [availabilityState, setAvailabilityState] = useState({});
  const [pricingState, setPricingState] = useState({});
  const abortControllerRef = useRef(null);

  /**
   * Search for flights with real-time availability
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Search options
   */
  const searchFlights = useCallback(async (searchParams, options = {}) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setSearchState(prev => ({ ...prev, isLoading: true, error: null }));

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

      // Validate required parameters
      if (!origin || !destination || !departureDate) {
        throw new Error('Missing required search parameters');
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departureDate: departureDate.toISOString().split('T')[0],
        ...(returnDate && { returnDate: returnDate.toISOString().split('T')[0] }),
        tripType,
        adults: passengers.adults.toString(),
        children: passengers.children.toString(),
        infants: passengers.infants.toString(),
        cabinClass,
        ...(Object.keys(filters).length > 0 && { filters: JSON.stringify(filters) })
      });

      // Make API request
      const response = await fetch(
        `/api/flights/realtime/search?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }

      setSearchState({
        isLoading: false,
        isRefreshing: false,
        data: result.data || [],
        error: null,
        metadata: {
          ...result.metadata,
          searchTime: result.metadata?.searchTime || 0,
          totalResults: result.data?.length || 0,
          cached: result.metadata?.cached || false,
          source: result.metadata?.source || 'api'
        }
      });

      return result;

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Real-time flight search error:', error);
        
        setSearchState(prev => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: error.message
        }));

        toast.error('Flight search failed: ' + error.message);
      }
      
      throw error;
    }
  }, []);

  /**
   * Check availability for specific flights
   * @param {Array} flightIds - Flight IDs
   * @param {Object} options - Options
   */
  const checkAvailability = useCallback(async (flightIds, options = {}) => {
    try {
      const queryParams = new URLSearchParams({
        flightIds: flightIds.join(','),
        includePricing: options.includePricing ? 'true' : 'false',
        ...(options.passengerCounts && { 
          passengerCounts: JSON.stringify(options.passengerCounts) 
        }),
        ...(options.cabinClass && { cabinClass: options.cabinClass })
      });

      const response = await fetch(
        `/api/flights/realtime/availability?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Availability check failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Availability check failed');
      }

      setAvailabilityState(prev => ({
        ...prev,
        [flightIds.join(',')]: {
          ...result.data,
          lastChecked: new Date().toISOString(),
          source: result.metadata?.source || 'api'
        }
      }));

      if (result.pricing) {
        setPricingState(prev => ({
          ...prev,
          [flightIds.join(',')]: {
            ...result.pricing,
            lastChecked: new Date().toISOString(),
            source: result.metadata?.source || 'api'
          }
        }));
      }

      return result;

    } catch (error) {
      console.error('Availability check error:', error);
      toast.error('Failed to check availability: ' + error.message);
      throw error;
    }
  }, []);

  /**
   * Get pricing for flights
   * @param {Array} flightIds - Flight IDs
   * @param {Object} passengerCounts - Passenger counts
   * @param {string} cabinClass - Cabin class
   */
  const getPricing = useCallback(async (flightIds, passengerCounts, cabinClass) => {
    try {
      const queryParams = new URLSearchParams({
        flightIds: flightIds.join(','),
        passengerCounts: JSON.stringify(passengerCounts),
        cabinClass
      });

      const response = await fetch(
        `/api/flights/realtime/pricing?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Pricing failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Pricing failed');
      }

      setPricingState(prev => ({
        ...prev,
        [flightIds.join(',')]: {
          ...result.data,
          lastChecked: new Date().toISOString(),
          source: result.metadata?.source || 'api'
        }
      }));

      return result;

    } catch (error) {
      console.error('Pricing error:', error);
      toast.error('Failed to get pricing: ' + error.message);
      throw error;
    }
  }, []);

  /**
   * Refresh single flight data
   * @param {string} flightId - Flight ID to refresh
   */
  const refreshFlight = useCallback(async (flightId) => {
    try {
      setSearchState(prev => ({ ...prev, isRefreshing: true }));

      // Get availability for single flight
      await checkAvailability([flightId], { includePricing: true });

      setSearchState(prev => ({ ...prev, isRefreshing: false }));
      
      toast.success('Flight data refreshed successfully');
    } catch (error) {
      setSearchState(prev => ({ ...prev, isRefreshing: false }));
      console.error('Flight refresh error:', error);
      toast.error('Failed to refresh flight data');
    }
  }, [checkAvailability]);

  /**
   * Refresh all current flights
   */
  const refreshAllFlights = useCallback(async () => {
    if (searchState.data.length === 0) return;

    try {
      setSearchState(prev => ({ ...prev, isRefreshing: true }));

      const flightIds = searchState.data.map(flight => flight.id || flight._id);
      await checkAvailability(flightIds, { includePricing: true });

      setSearchState(prev => ({ ...prev, isRefreshing: false }));
      
      toast.success('All flight data refreshed successfully');
    } catch (error) {
      setSearchState(prev => ({ ...prev, isRefreshing: false }));
      console.error('Batch refresh error:', error);
      toast.error('Failed to refresh flight data');
    }
  }, [searchState.data, checkAvailability]);

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setSearchState({
      isLoading: false,
      isRefreshing: false,
      data: [],
      error: null,
      metadata: {
        searchTime: 0,
        totalResults: 0,
        cached: false,
        source: 'cleared'
      }
    });

    setAvailabilityState({});
    setPricingState({});
  }, []);

  /**
   * Cancel ongoing search
   */
  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setSearchState(prev => ({
      ...prev,
      isLoading: false,
      error: 'Search cancelled'
    }));

    toast.info('Search cancelled');
  }, []);

  /**
   * Get cached availability for flight
   * @param {string} flightId - Flight ID
   */
  const getCachedAvailability = useCallback((flightId) => {
    return availabilityState[flightId] || null;
  }, [availabilityState]);

  /**
   * Get cached pricing for flight
   * @param {string} flightId - Flight ID
   */
  const getCachedPricing = useCallback((flightId) => {
    return pricingState[flightId] || null;
  }, [pricingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    searchState,
    availabilityState,
    pricingState,
    
    // Actions
    searchFlights,
    checkAvailability,
    getPricing,
    refreshFlight,
    refreshAllFlights,
    clearResults,
    cancelSearch,
    
    // Utilities
    getCachedAvailability,
    getCachedPricing
  };
}