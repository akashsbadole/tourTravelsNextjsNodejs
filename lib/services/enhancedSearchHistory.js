import "server-only";
import { 
  EnhancedSearchHistory, 
  UserAnalytics,
  AggregatedAnalytics 
} from "../db/models";
import { createOneDoc, updateOneDoc } from "../db/createOperationDB";
import { getOneDoc, getManyDocs } from "../db/getOperationDB";
import { v4 as uuidv4 } from "uuid";

/**
 * Enhanced Search History Service
 * Provides comprehensive search tracking and analysis
 */

class EnhancedSearchHistoryService {
  /**
   * Track a new search with full details
   */
  async trackSearch(searchData) {
    try {
      const {
        userId,
        sessionId,
        searchType,
        searchParameters,
        searchResults,
        context = {}
      } = searchData;

      const searchId = uuidv4();

      // Create enhanced search history record
      const searchHistoryData = {
        userId,
        sessionId,
        searchId,
        searchType,
        searchParameters,
        searchResults: {
          totalResults: searchResults?.totalResults || 0,
          displayedResults: searchResults?.displayedResults || 0,
          searchTime: searchResults?.searchTime || 0,
          resultIds: searchResults?.resultIds || [],
          priceRange: searchResults?.priceRange || {},
          filters: searchResults?.filters || {},
          sorting: searchResults?.sorting || {}
        },
        source: context.source || 'direct',
        device: context.deviceType || 'desktop',
        location: context.location || {},
        performance: {
          serverResponseTime: context.responseTime || 0,
          clientRenderTime: context.renderTime || 0,
          totalLoadTime: context.loadTime || 0
        }
      };

      await createOneDoc("EnhancedSearchHistory", searchHistoryData);

      // Update user analytics with search behavior
      await this.updateUserSearchBehavior(userId, searchData);

      // Update aggregated search analytics
      await this.updateAggregatedSearchAnalytics(searchData);

      return searchId;
    } catch (error) {
      console.error("Error tracking enhanced search:", error);
      throw error;
    }
  }

  /**
   * Track search interaction (clicks, filters, etc.)
   */
  async trackSearchInteraction(interactionData) {
    try {
      const {
        userId,
        sessionId,
        searchId,
        interactionType,
        resultId,
        position,
        duration,
        metadata = {}
      } = interactionData;

      const interaction = {
        interactionType,
        timestamp: new Date(),
        resultId,
        position,
        duration,
        metadata
      };

      await updateOneDoc(
        "EnhancedSearchHistory",
        { searchId },
        { $push: { interactions: interaction } }
      );

      // Update conversion tracking if this is a booking-related interaction
      if (interactionType === 'book_initiated' || interactionType === 'book_completed') {
        await this.updateSearchConversion(searchId, interactionData);
      }

      return interaction;
    } catch (error) {
      console.error("Error tracking search interaction:", error);
      throw error;
    }
  }

  /**
   * Save a search for notifications
   */
  async saveSearch(userId, searchId, notificationSettings = {}) {
    try {
      const updateData = {
        'savedSearch.isSaved': true,
        'savedSearch.savedAt': new Date(),
        'savedSearch.notificationEnabled': notificationSettings.enabled || false,
        'savedSearch.notificationFrequency': notificationSettings.frequency || 'daily'
      };

      await updateOneDoc(
        "EnhancedSearchHistory",
        { userId, searchId },
        updateData
      );

      // Update user analytics with saved searches
      await this.updateUserSavedSearches(userId);

      return true;
    } catch (error) {
      console.error("Error saving search:", error);
      throw error;
    }
  }

  /**
   * Get user's search history with filtering
   */
  async getUserSearchHistory(userId, options = {}) {
    try {
      const {
        searchType,
        limit = 50,
        offset = 0,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeSaved = false,
        includeConversions = false
      } = options;

      const filter = { userId };

      // Apply filters
      if (searchType) {
        filter.searchType = searchType;
      }

      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) {
          filter.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          filter.createdAt.$lte = new Date(dateTo);
        }
      }

      if (includeSaved) {
        filter['savedSearch.isSaved'] = true;
      }

      if (includeConversions) {
        filter['conversion.completed'] = true;
      }

      const searches = await getManyDocs(
        "EnhancedSearchHistory",
        filter,
        [],
        false,
        {
          sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
          limit,
          skip: offset
        }
      );

      return searches;
    } catch (error) {
      console.error("Error getting user search history:", error);
      throw error;
    }
  }

  /**
   * Get saved searches for a user
   */
  async getSavedSearches(userId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      const searches = await getManyDocs(
        "EnhancedSearchHistory",
        { 
          userId, 
          'savedSearch.isSaved': true 
        },
        [],
        false,
        {
          sort: { 'savedSearch.savedAt': -1 },
          limit,
          skip: offset
        }
      );

      return searches;
    } catch (error) {
      console.error("Error getting saved searches:", error);
      throw error;
    }
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(userId, searchId) {
    try {
      await updateOneDoc(
        "EnhancedSearchHistory",
        { userId, searchId },
        { 
          $unset: { 'savedSearch': 1 }
        }
      );

      return true;
    } catch (error) {
      console.error("Error deleting saved search:", error);
      throw error;
    }
  }

  /**
   * Get search analytics and insights
   */
  async getSearchAnalytics(userId, options = {}) {
    try {
      const { 
        period = '30d', 
        searchType,
        includeComparisons = true 
      } = options;

      // Get user's search history
      const searches = await this.getUserSearchHistory(userId, {
        searchType,
        dateFrom: this.getDateFromPeriod(period),
        limit: 1000
      });

      // Analyze search patterns
      const analytics = {
        totalSearches: searches.length,
        averageResultsPerSearch: this.calculateAverageResults(searches),
        averageSearchTime: this.calculateAverageSearchTime(searches),
        topDestinations: this.getTopDestinations(searches),
        searchFrequency: this.calculateSearchFrequency(searches),
        conversionRate: this.calculateConversionRate(searches),
        priceRanges: this.analyzePriceRanges(searches),
        searchPatterns: this.analyzeSearchPatterns(searches)
      };

      if (includeComparisons) {
        analytics.comparisons = await this.getSearchComparisons(userId, period);
      }

      return analytics;
    } catch (error) {
      console.error("Error getting search analytics:", error);
      throw error;
    }
  }

  /**
   * Update user search behavior in analytics
   */
  async updateUserSearchBehavior(userId, searchData) {
    try {
      const { searchType, searchParameters } = searchData;

      // Extract key search parameters for analysis
      const searchKey = this.extractSearchKey(searchType, searchParameters);

      await updateOneDoc(
        "UserAnalytics",
        { userId },
        {
          $inc: { 'aggregatedMetrics.totalSearches': 1 },
          $push: {
            'preferences.favoriteDestinations': searchKey.destination || 'unknown',
            'preferences.favoriteCategories': searchType
          }
        }
      );
    } catch (error) {
      console.error("Error updating user search behavior:", error);
    }
  }

  /**
   * Update aggregated search analytics
   */
  async updateAggregatedSearchAnalytics(searchData) {
    try {
      const { searchType, searchParameters, searchResults } = searchData;
      const today = new Date().toISOString().split('T')[0];
      const analyticsId = `${today}:daily`;

      // Extract destination for analytics
      const destination = this.extractDestination(searchType, searchParameters);

      await updateOneDoc(
        "AggregatedAnalytics",
        { _id: analyticsId },
        {
          $inc: {
            'searchAnalytics.totalSearches': 1,
            [`searchAnalytics.${searchType}Searches`]: 1
          },
          $push: {
            'searchAnalytics.topFlightRoutes': searchType === 'flight' ? {
              origin: searchParameters.flight?.origin?.city || 'unknown',
              destination: destination,
              count: 1,
              conversionRate: 0
            } : undefined,
            'searchAnalytics.topHotelDestinations': searchType === 'hotel' ? {
              destination: destination,
              count: 1,
              conversionRate: 0
            } : undefined
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error("Error updating aggregated search analytics:", error);
    }
  }

  /**
   * Update search conversion tracking
   */
  async updateSearchConversion(searchId, interactionData) {
    try {
      const { interactionType, metadata } = interactionData;
      const isCompleted = interactionType === 'book_completed';

      await updateOneDoc(
        "EnhancedSearchHistory",
        { searchId },
        {
          $set: {
            'conversion.initiated': true,
            'conversion.completed': isCompleted,
            'conversion.bookingId': metadata?.bookingId,
            'conversion.conversionTime': metadata?.conversionTime || 0,
            'conversion.value': metadata?.value || 0
          }
        }
      );

      return true;
    } catch (error) {
      console.error("Error updating search conversion:", error);
    }
  }

  /**
   * Update user saved searches count
   */
  async updateUserSavedSearches(userId) {
    try {
      const savedCount = await getManyDocs(
        "EnhancedSearchHistory",
        { 
          userId, 
          'savedSearch.isSaved': true 
        },
        [],
        false,
        { count: true }
      );

      await updateOneDoc(
        "UserAnalytics",
        { userId },
        { $set: { 'aggregatedMetrics.savedSearches': savedCount } }
      );
    } catch (error) {
      console.error("Error updating user saved searches:", error);
    }
  }

  /**
   * Get search comparisons for user
   */
  async getSearchComparisons(userId, period) {
    try {
      // This would implement search comparison logic
      // For now, return placeholder data
      return {
        previousPeriod: {
          searches: 0,
          averageResults: 0,
          conversionRate: 0
        },
        currentPeriod: {
          searches: 0,
          averageResults: 0,
          conversionRate: 0
        },
        change: {
          searches: 0,
          conversionRate: 0
        }
      };
    } catch (error) {
      console.error("Error getting search comparisons:", error);
      return {};
    }
  }

  /**
   * Helper methods for analytics calculations
   */
  calculateAverageResults(searches) {
    if (searches.length === 0) return 0;
    const total = searches.reduce((sum, search) => 
      sum + (search.searchResults?.totalResults || 0), 0);
    return Math.round(total / searches.length);
  }

  calculateAverageSearchTime(searches) {
    if (searches.length === 0) return 0;
    const total = searches.reduce((sum, search) => 
      sum + (search.searchResults?.searchTime || 0), 0);
    return Math.round(total / searches.length);
  }

  getTopDestinations(searches, limit = 10) {
    const destinations = {};
    
    searches.forEach(search => {
      const destination = this.extractDestination(search.searchType, search.searchParameters);
      if (destination && destination !== 'unknown') {
        destinations[destination] = (destinations[destination] || 0) + 1;
      }
    });

    return Object.entries(destinations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([destination, count]) => ({ destination, count }));
  }

  calculateSearchFrequency(searches) {
    const dailySearches = {};
    
    searches.forEach(search => {
      const date = search.createdAt.toISOString().split('T')[0];
      dailySearches[date] = (dailySearches[date] || 0) + 1;
    });

    const days = Object.keys(dailySearches).length;
    const totalSearches = searches.length;
    
    return {
      averageDaily: days > 0 ? Math.round(totalSearches / days) : 0,
      peakDay: Object.entries(dailySearches)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null,
      peakDaySearches: Math.max(...Object.values(dailySearches), 0)
    };
  }

  calculateConversionRate(searches) {
    const totalSearches = searches.length;
    if (totalSearches === 0) return 0;
    
    const conversions = searches.filter(search => 
      search.conversion?.completed === true).length;
    
    return Math.round((conversions / totalSearches) * 100 * 100) / 100; // Round to 2 decimal places
  }

  analyzePriceRanges(searches) {
    const prices = searches
      .filter(search => search.searchResults?.priceRange?.average)
      .map(search => search.searchResults.priceRange.average);

    if (prices.length === 0) {
      return { min: 0, max: 0, average: 0, median: 0 };
    }

    prices.sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
      median: Math.round(median)
    };
  }

  analyzeSearchPatterns(searches) {
    const patterns = {
      timeOfDay: {},
      dayOfWeek: {},
      tripType: {},
      cabinClass: {},
      roomType: {}
    };

    searches.forEach(search => {
      const date = new Date(search.createdAt);
      const hour = date.getHours();
      const day = date.getDay();

      patterns.timeOfDay[hour] = (patterns.timeOfDay[hour] || 0) + 1;
      patterns.dayOfWeek[day] = (patterns.dayOfWeek[day] || 0) + 1;

      // Analyze search parameters
      if (search.searchParameters.flight) {
        const tripType = search.searchParameters.flight.tripType || 'one_way';
        const cabinClass = search.searchParameters.flight.cabinClass || 'economy';
        
        patterns.tripType[tripType] = (patterns.tripType[tripType] || 0) + 1;
        patterns.cabinClass[cabinClass] = (patterns.cabinClass[cabinClass] || 0) + 1;
      }

      if (search.searchParameters.hotel) {
        const roomTypes = search.searchParameters.hotel.roomTypes || [];
        roomTypes.forEach(roomType => {
          patterns.roomType[roomType] = (patterns.roomType[roomType] || 0) + 1;
        });
      }
    });

    return patterns;
  }

  extractSearchKey(searchType, searchParameters) {
    if (searchType === 'flight') {
      return {
        destination: searchParameters.flight?.destination?.city || 'unknown',
        origin: searchParameters.flight?.origin?.city || 'unknown',
        tripType: searchParameters.flight?.tripType || 'one_way'
      };
    } else if (searchType === 'hotel') {
      return {
        destination: searchParameters.hotel?.destination?.city || 'unknown',
        checkIn: searchParameters.hotel?.checkIn,
        checkOut: searchParameters.hotel?.checkOut
      };
    }
    return { destination: 'unknown' };
  }

  extractDestination(searchType, searchParameters) {
    if (searchType === 'flight') {
      return searchParameters.flight?.destination?.city || 'unknown';
    } else if (searchType === 'hotel') {
      return searchParameters.hotel?.destination?.city || 'unknown';
    }
    return 'unknown';
  }

  getDateFromPeriod(period) {
    const now = new Date();
    const days = parseInt(period.replace('d', '')) || 30;
    return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  }
}

// Singleton instance
const enhancedSearchHistoryService = new EnhancedSearchHistoryService();

export default enhancedSearchHistoryService;