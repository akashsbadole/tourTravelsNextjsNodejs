"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAnalytics } from './AnalyticsProvider';

/**
 * Hook for enhanced search history functionality
 * Provides search tracking, history management, and analytics
 */

export const useEnhancedSearchHistory = (userId, options = {}) => {
  const { trackSearch, trackEvent } = useAnalytics();
  const [searchHistory, setSearchHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    autoTrack = true,
    maxHistory = 100,
    enableSaving = true,
    enableAnalytics = true
  } = options;

  /**
   * Track a new search with enhanced data
   */
  const trackNewSearch = useCallback(async (searchType, searchParams, results, context = {}) => {
    try {
      const searchId = generateSearchId();
      
      // Track search via analytics
      if (autoTrack) {
        trackSearch(searchType, searchParams, results, {
          ...context,
          searchId
        });
      }

      // Update local state
      const newSearch = {
        searchId,
        searchType,
        searchParams,
        results,
        timestamp: new Date(),
        context
      };

      setSearchHistory(prev => {
        const updated = [newSearch, ...prev];
        return updated.slice(0, maxHistory);
      });

      // Send to server for persistent storage
      if (enableAnalytics) {
        await saveSearchToServer(userId, searchId, searchType, searchParams, results, context);
      }

      return searchId;
    } catch (error) {
      console.error('Error tracking search:', error);
      setError(error.message);
      throw error;
    }
  }, [autoTrack, enableAnalytics, maxHistory, trackSearch, userId]);

  /**
   * Track search interaction
   */
  const trackInteraction = useCallback(async (searchId, interactionType, data = {}) => {
    try {
      const interaction = {
        searchId,
        interactionType,
        timestamp: new Date(),
        ...data
      };

      // Track via analytics
      trackEvent('search_interaction', interaction);

      // Update local state
      setSearchHistory(prev => 
        prev.map(search => 
          search.searchId === searchId
            ? {
                ...search,
                interactions: [...(search.interactions || []), interaction]
              }
            : search
        )
      );

      // Send to server
      await saveInteractionToServer(userId, interaction);
    } catch (error) {
      console.error('Error tracking interaction:', error);
      setError(error.message);
    }
  }, [trackEvent, userId]);

  /**
   * Save a search for notifications
   */
  const saveSearch = useCallback(async (searchId, notificationSettings = {}) => {
    try {
      if (!enableSaving) {
        throw new Error('Search saving is disabled');
      }

      // Update local state
      setSearchHistory(prev => 
        prev.map(search => 
          search.searchId === searchId
            ? {
                ...search,
                savedSearch: {
                  isSaved: true,
                  savedAt: new Date(),
                  notificationEnabled: notificationSettings.enabled || false,
                  notificationFrequency: notificationSettings.frequency || 'daily'
                }
              }
            : search
        )
      );

      // Update saved searches list
      const searchToSave = searchHistory.find(s => s.searchId === searchId);
      if (searchToSave) {
        setSavedSearches(prev => [searchToSave, ...prev].slice(0, 20));
      }

      // Send to server
      await saveSearchToServer(userId, searchId, notificationSettings);

      trackEvent('search_saved', { searchId, notificationSettings });
    } catch (error) {
      console.error('Error saving search:', error);
      setError(error.message);
    }
  }, [enableSaving, searchHistory, trackEvent, userId]);

  /**
   * Delete a saved search
   */
  const deleteSavedSearch = useCallback(async (searchId) => {
    try {
      // Update local state
      setSearchHistory(prev => 
        prev.map(search => 
          search.searchId === searchId
            ? { ...search, savedSearch: { isSaved: false } }
            : search
        )
      );

      setSavedSearches(prev => prev.filter(search => search.searchId !== searchId));

      // Send to server
      await deleteSavedSearchFromServer(userId, searchId);

      trackEvent('search_deleted', { searchId });
    } catch (error) {
      console.error('Error deleting saved search:', error);
      setError(error.message);
    }
  }, [trackEvent, userId]);

  /**
   * Get search analytics
   */
  const getSearchAnalytics = useCallback(async (period = '30d', searchType = null) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/analytics/search-history/analytics?userId=${userId}&period=${period}${searchType ? `&searchType=${searchType}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch search analytics');
      }

      const analytics = await response.json();
      setLoading(false);
      return analytics;
    } catch (error) {
      console.error('Error getting search analytics:', error);
      setError(error.message);
      setLoading(false);
      throw error;
    }
  }, [userId]);

  /**
   * Load search history from server
   */
  const loadSearchHistory = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        userId,
        limit: options.limit || maxHistory,
        offset: options.offset || 0,
        searchType: options.searchType || '',
        includeSaved: options.includeSaved || false
      });

      const response = await fetch(`/api/analytics/search-history?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load search history');
      }

      const searches = await response.json();
      setSearchHistory(searches);
      setLoading(false);
      
      return searches;
    } catch (error) {
      console.error('Error loading search history:', error);
      setError(error.message);
      setLoading(false);
      throw error;
    }
  }, [userId, maxHistory]);

  /**
   * Load saved searches from server
   */
  const loadSavedSearches = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/analytics/search-history/saved?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load saved searches');
      }

      const searches = await response.json();
      setSavedSearches(searches);
      setLoading(false);
      
      return searches;
    } catch (error) {
      console.error('Error loading saved searches:', error);
      setError(error.message);
      setLoading(false);
      throw error;
    }
  }, [userId]);

  /**
   * Clear search history
   */
  const clearHistory = useCallback(async () => {
    try {
      setSearchHistory([]);
      setSavedSearches([]);
      
      // Send to server
      await fetch(`/api/analytics/search-history/clear?userId=${userId}`, {
        method: 'DELETE'
      });

      trackEvent('search_history_cleared');
    } catch (error) {
      console.error('Error clearing search history:', error);
      setError(error.message);
    }
  }, [trackEvent, userId]);

  /**
   * Get popular searches
   */
  const getPopularSearches = useCallback(async (searchType = null, limit = 10) => {
    try {
      const params = new URLSearchParams({
        searchType: searchType || '',
        limit: limit.toString()
      });

      const response = await fetch(`/api/analytics/search-history/popular?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch popular searches');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting popular searches:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  /**
   * Get search suggestions based on history
   */
  const getSearchSuggestions = useCallback((query, searchType = null, limit = 5) => {
    if (!query || query.length < 2) return [];

    const suggestions = searchHistory
      .filter(search => {
        if (searchType && search.searchType !== searchType) return false;
        
        // Check if query matches destination, origin, or other parameters
        const searchString = JSON.stringify(search.searchParams).toLowerCase();
        return searchString.includes(query.toLowerCase());
      })
      .slice(0, limit)
      .map(search => ({
        searchId: search.searchId,
        searchType: search.searchType,
        searchParams: search.searchParams,
        timestamp: search.timestamp,
        relevance: calculateRelevance(query, search.searchParams)
      }))
      .sort((a, b) => b.relevance - a.relevance);

    return suggestions;
  }, [searchHistory]);

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadSearchHistory();
      loadSavedSearches();
    }
  }, [userId, loadSearchHistory, loadSavedSearches]);

  return {
    // State
    searchHistory,
    savedSearches,
    loading,
    error,
    
    // Actions
    trackNewSearch,
    trackInteraction,
    saveSearch,
    deleteSavedSearch,
    getSearchAnalytics,
    loadSearchHistory,
    loadSavedSearches,
    clearHistory,
    getPopularSearches,
    getSearchSuggestions
  };
};

/**
 * Generate unique search ID
 */
function generateSearchId() {
  return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate relevance score for search suggestions
 */
function calculateRelevance(query, searchParams) {
  let score = 0;
  const queryLower = query.toLowerCase();

  // Check different parameter fields
  Object.values(searchParams).forEach(param => {
    if (typeof param === 'string') {
      if (param.toLowerCase() === queryLower) {
        score += 10; // Exact match
      } else if (param.toLowerCase().includes(queryLower)) {
        score += 5; // Partial match
      }
    } else if (typeof param === 'object' && param !== null) {
      Object.values(param).forEach(value => {
        if (typeof value === 'string') {
          if (value.toLowerCase() === queryLower) {
            score += 10;
          } else if (value.toLowerCase().includes(queryLower)) {
            score += 5;
          }
        }
      });
    }
  });

  return score;
}

/**
 * Save search to server
 */
async function saveSearchToServer(userId, searchId, searchType, searchParams, results, context) {
  try {
    const response = await fetch('/api/analytics/search-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        searchId,
        searchType,
        searchParams,
        results,
        context
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save search');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving search to server:', error);
  }
}

/**
 * Save interaction to server
 */
async function saveInteractionToServer(userId, interaction) {
  try {
    const response = await fetch('/api/analytics/search-history/interaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        ...interaction
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save interaction');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving interaction to server:', error);
  }
}

/**
 * Save search notification settings
 */
async function saveSearchToServer(userId, searchId, notificationSettings) {
  try {
    const response = await fetch('/api/analytics/search-history/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        searchId,
        notificationSettings
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save search settings');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving search to server:', error);
  }
}

/**
 * Delete saved search from server
 */
async function deleteSavedSearchFromServer(userId, searchId) {
  try {
    const response = await fetch('/api/analytics/search-history/saved', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        searchId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to delete saved search');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting saved search from server:', error);
  }
}

export default useEnhancedSearchHistory;