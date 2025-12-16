"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOfflineManager } from '@/lib/offline/offlineManager';
import cacheManager from '@/lib/offline/cacheManager';
import { CACHE_TYPES } from '@/lib/offline/cacheManager';

/**
 * Hook for offline-enabled search functionality
 * Handles caching, fallbacks, and offline scenarios
 */
export function useOfflineSearch(searchType = 'flight') {
  const { isOnline, executeRequest, shouldUseOfflineMode, getAdaptiveTimeout } = useOfflineManager();
  const [searchState, setSearchState] = useState({
    loading: false,
    data: null,
    error: null,
    fromCache: false,
    isStale: false
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const abortControllerRef = useRef(null);

  // Generate cache key from search parameters
  const generateCacheKey = useCallback((params) => {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `${searchType}_${btoa(paramString).replace(/[^a-zA-Z0-9]/g, '')}`;
  }, [searchType]);

  // Execute search with offline support
  const search = useCallback(async (params, options = {}) => {
    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    const cacheKey = generateCacheKey(params);
    const cacheType = searchType === 'flight' ? 'FLIGHT_SEARCH' : 'HOTEL_SEARCH';

    setSearchState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await executeRequest(
        async () => {
          // Determine the appropriate API endpoint
          const endpoint = searchType === 'flight' 
            ? '/api/flights/search/enhanced'
            : '/api/hotels/search/enhanced';

          // Build query string
          const queryString = new URLSearchParams(params).toString();
          const url = `${endpoint}?${queryString}`;

          const response = await fetch(url, {
            signal: abortControllerRef.current.signal,
            headers: {
              'Content-Type': 'application/json',
              'X-Offline-Cache-Key': cacheKey
            }
          });

          if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Check if response indicates cached data
          const fromCache = data.metadata?.source === 'cache';
          const isStale = data.metadata?.stale === true;

          return {
            data: data.data || data,
            metadata: data.metadata || {},
            fromCache,
            isStale
          };
        },
        {
          cacheKey,
          cacheType,
          fallbackToCache: true,
          retryOnFailure: true,
          maxRetries: options.maxRetries || 3,
          timeout: getAdaptiveTimeout(options.timeout || 15000)
        }
      );

      // Update search state
      setSearchState({
        loading: false,
        data: result.data,
        error: null,
        fromCache: result.fromCache || false,
        isStale: result.isStale || false
      });

      // Add to search history
      if (result.data && (result.data.length > 0 || Object.keys(result.data).length > 0)) {
        addToSearchHistory(params, result.data);
      }

      // Generate suggestions for similar searches
      if (result.data && !result.fromCache) {
        generateSuggestions(params, result.data);
      }

      return result;
    } catch (error) {
      // Don't treat abort as an error
      if (error.name === 'AbortError') {
        return null;
      }

      console.error(`[useOfflineSearch] ${searchType} search failed:`, error);

      setSearchState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Search failed'
      }));

      throw error;
    }
  }, [searchType, generateCacheKey, executeRequest, getAdaptiveTimeout]);

  // Add search to history
  const addToSearchHistory = useCallback((params, results) => {
    const historyItem = {
      id: Date.now().toString(),
      type: searchType,
      params,
      resultsCount: Array.isArray(results) ? results.length : Object.keys(results).length,
      timestamp: Date.now(),
      cachedAt: new Date().toISOString()
    };

    setSearchHistory(prev => {
      const newHistory = [historyItem, ...prev.filter(item => 
        JSON.stringify(item.params) !== JSON.stringify(params)
      )].slice(0, 10); // Keep only last 10 searches

      return newHistory;
    });
  }, [searchType]);

  // Generate search suggestions
  const generateSuggestions = useCallback((params, results) => {
    const suggestions = [];

    // Generate suggestions based on search parameters
    if (searchType === 'flight') {
      if (params.origin && params.destination) {
        // Suggest swapping origin and destination
        suggestions.push({
          type: 'reverse',
          title: `Return from ${params.destination} to ${params.origin}`,
          params: {
            ...params,
            origin: params.destination,
            destination: params.origin
          }
        });

        // Suggest nearby dates
        if (params.departureDate) {
          const departureDate = new Date(params.departureDate);
          const nextDay = new Date(departureDate);
          nextDay.setDate(nextDay.getDate() + 1);
          
          const prevDay = new Date(departureDate);
          prevDay.setDate(prevDay.getDate() - 1);

          suggestions.push(
            {
              type: 'date',
              title: `Depart ${prevDay.toLocaleDateString()}`,
              params: { ...params, departureDate: prevDay.toISOString().split('T')[0] }
            },
            {
              type: 'date',
              title: `Depart ${nextDay.toLocaleDateString()}`,
              params: { ...params, departureDate: nextDay.toISOString().split('T')[0] }
            }
          );
        }
      }
    } else if (searchType === 'hotel') {
      if (params.destination) {
        // Suggest different dates
        if (params.checkIn && params.checkOut) {
          const checkIn = new Date(params.checkIn);
          const checkOut = new Date(params.checkOut);
          
          const nextCheckIn = new Date(checkIn);
          nextCheckIn.setDate(nextCheckIn.getDate() + 1);
          
          const nextCheckOut = new Date(checkOut);
          nextCheckOut.setDate(nextCheckOut.getDate() + 1);

          suggestions.push(
            {
              type: 'date',
              title: `Check in ${nextCheckIn.toLocaleDateString()}`,
              params: { ...params, checkIn: nextCheckIn.toISOString().split('T')[0] }
            },
            {
              type: 'date',
              title: `Stay one more night`,
              params: { 
                ...params, 
                checkOut: nextCheckOut.toISOString().split('T')[0] 
              }
            }
          );
        }
      }
    }

    setSuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
  }, [searchType]);

  // Get cached search results
  const getCachedResults = useCallback(async (params) => {
    const cacheKey = generateCacheKey(params);
    const cacheType = searchType === 'flight' ? 'FLIGHT_SEARCH' : 'HOTEL_SEARCH';

    try {
      const cached = await cacheManager.getFromCache(cacheType, cacheKey);
      
      if (cached && cacheManager.isCacheValid(cached, CACHE_TYPES[cacheType])) {
        setSearchState({
          loading: false,
          data: cached.data,
          error: null,
          fromCache: true,
          isStale: cacheManager.isCacheStale(cached, CACHE_TYPES[cacheType])
        });

        return cached.data;
      }

      return null;
    } catch (error) {
      console.error('[useOfflineSearch] Failed to get cached results:', error);
      return null;
    }
  }, [searchType, generateCacheKey]);

  // Clear search results
  const clearResults = useCallback(() => {
    setSearchState({
      loading: false,
      data: null,
      error: null,
      fromCache: false,
      isStale: false
    });
    setSuggestions([]);
  }, []);

  // Cancel ongoing search
  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setSearchState(prev => ({ ...prev, loading: false }));
  }, []);

  // Retry search
  const retrySearch = useCallback(async () => {
    if (searchState.error && searchState.lastParams) {
      await search(searchState.lastParams);
    }
  }, [searchState.error, searchState.lastParams, search]);

  // Prefetch search results
  const prefetchSearch = useCallback(async (params, priority = 'low') => {
    const cacheKey = generateCacheKey(params);
    const cacheType = searchType === 'flight' ? 'FLIGHT_SEARCH' : 'HOTEL_SEARCH';

    try {
      await cacheManager.prefetch(
        cacheType,
        cacheKey,
        async () => {
          const endpoint = searchType === 'flight' 
            ? '/api/flights/search/enhanced'
            : '/api/hotels/search/enhanced';

          const queryString = new URLSearchParams(params).toString();
          const url = `${endpoint}?${queryString}`;

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Prefetch failed: ${response.statusText}`);
          }

          const data = await response.json();
          return data.data || data;
        },
        priority
      );
    } catch (error) {
      console.error('[useOfflineSearch] Prefetch failed:', error);
    }
  }, [searchType, generateCacheKey]);

  // Get search statistics
  const getSearchStats = useCallback(async () => {
    try {
      const stats = await cacheManager.getCacheStats();
      const historyStats = {
        totalSearches: searchHistory.length,
        recentSearches: searchHistory.filter(item => 
          Date.now() - item.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
        ).length
      };

      return {
        cache: stats,
        history: historyStats,
        offline: {
          isOnline,
          shouldUseOfflineMode,
          hasCachedResults: searchState.fromCache
        }
      };
    } catch (error) {
      console.error('[useOfflineSearch] Failed to get search stats:', error);
      return null;
    }
  }, [searchHistory, isOnline, shouldUseOfflineMode, searchState.fromCache]);

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
    ...searchState,
    searchHistory,
    suggestions,
    isOnline,
    shouldUseOfflineMode,
    
    // Actions
    search,
    getCachedResults,
    clearResults,
    cancelSearch,
    retrySearch,
    prefetchSearch,
    
    // Utilities
    getSearchStats,
    generateCacheKey
  };
}

/**
 * Hook for flight-specific search with offline support
 */
export function useOfflineFlightSearch() {
  return useOfflineSearch('flight');
}

/**
 * Hook for hotel-specific search with offline support
 */
export function useOfflineHotelSearch() {
  return useOfflineSearch('hotel');
}