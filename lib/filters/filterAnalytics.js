/**
 * Filter Analytics and Insights System
 * Tracks filter usage patterns and provides intelligent recommendations
 */

import { 
  FILTER_CATEGORIES, 
  FILTER_PRESETS, 
  getActiveFiltersCount,
  exportFilters,
  importFilters
} from './advancedFlightFilters';

/**
 * Filter Analytics Manager
 */
export class FilterAnalyticsManager {
  constructor(options = {}) {
    this.options = {
      enableTracking: true,
      enableInsights: true,
      enableRecommendations: true,
      maxHistorySize: 1000,
      aggregationWindow: 30 * 24 * 60 * 60 * 1000, // 30 days
      ...options
    };
    
    this.eventBuffer = [];
    this.aggregatedData = new Map();
    this.insightsCache = new Map();
    this.lastAggregation = 0;
  }

  /**
   * Track filter interaction event
   */
  trackEvent(event) {
    if (!this.options.enableTracking) return;

    const enrichedEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      ...event
    };

    this.eventBuffer.push(enrichedEvent);

    // Auto-flush buffer if it gets too large
    if (this.eventBuffer.length >= 50) {
      this.flushEvents();
    }
  }

  /**
   * Track filter application
   */
  trackFilterApplication(filters, context = {}) {
    this.trackEvent({
      type: 'filter_application',
      filters: exportFilters(filters),
      filterCount: getActiveFiltersCount(filters),
      context
    });
  }

  /**
   * Track filter change
   */
  trackFilterChange(category, oldValue, newValue, context = {}) {
    this.trackEvent({
      type: 'filter_change',
      category,
      oldValue,
      newValue,
      context
    });
  }

  /**
   * Track preset usage
   */
  trackPresetUsage(presetId, presetName, context = {}) {
    this.trackEvent({
      type: 'preset_usage',
      presetId,
      presetName,
      context
    });
  }

  /**
   * Track search result interaction
   */
  trackSearchResultInteraction(resultCount, filteredCount, context = {}) {
    this.trackEvent({
      type: 'search_result',
      resultCount,
      filteredCount,
      filterEffectiveness: resultCount > 0 ? filteredCount / resultCount : 0,
      context
    });
  }

  /**
   * Track filter performance
   */
  trackFilterPerformance(operation, duration, metadata = {}) {
    this.trackEvent({
      type: 'performance',
      operation,
      duration,
      metadata
    });
  }

  /**
   * Generate insights from collected data
   */
  async generateInsights() {
    if (!this.options.enableInsights) return [];

    await this.aggregateEvents();
    const insights = [];

    // Most used filter categories
    const mostUsedCategories = this.getMostUsedCategories();
    if (mostUsedCategories.length > 0) {
      insights.push({
        type: 'usage_pattern',
        title: 'Most Used Filters',
        description: `You most frequently filter by ${mostUsedCategories.slice(0, 3).join(', ')}`,
        data: mostUsedCategories,
        priority: 'medium'
      });
    }

    // Filter effectiveness analysis
    const effectiveness = this.analyzeFilterEffectiveness();
    if (effectiveness.length > 0) {
      insights.push({
        type: 'effectiveness',
        title: 'Filter Effectiveness',
        description: 'Analysis of how well your filters narrow down results',
        data: effectiveness,
        priority: 'high'
      });
    }

    // Time-based patterns
    const timePatterns = this.analyzeTimePatterns();
    if (timePatterns.length > 0) {
      insights.push({
        type: 'time_pattern',
        title: 'Usage Patterns',
        description: 'Your filtering behavior over time',
        data: timePatterns,
        priority: 'low'
      });
    }

    // Optimization opportunities
    const optimizations = this.identifyOptimizations();
    if (optimizations.length > 0) {
      insights.push({
        type: 'optimization',
        title: 'Optimization Opportunities',
        description: 'Ways to improve your filtering experience',
        data: optimizations,
        priority: 'high'
      });
    }

    return insights;
  }

  /**
   * Generate recommendations based on analytics
   */
  async generateRecommendations(currentFilters, availableFlights = []) {
    if (!this.options.enableRecommendations) return [];

    await this.aggregateEvents();
    const recommendations = [];

    // Popular filter combinations
    const popularCombinations = this.getPopularFilterCombinations();
    const matchingCombinations = popularCombinations.filter(combo => 
      this.isFilterCombinationCompatible(currentFilters, combo.filters)
    );

    matchingCombinations.slice(0, 3).forEach(combo => {
      recommendations.push({
        type: 'preset',
        title: `Try "${combo.name}" filters`,
        reason: `This combination is popular with ${combo.usageCount} users`,
        preset: {
          id: combo.id,
          name: combo.name,
          filters: combo.filters
        },
        confidence: combo.confidence,
        priority: 'medium'
      });
    });

    // Context-aware recommendations
    if (availableFlights.length === 0) {
      const noResultsRecommendations = this.generateNoResultsRecommendations(currentFilters);
      recommendations.push(...noResultsRecommendations);
    } else if (availableFlights.length < 10) {
      const fewResultsRecommendations = this.generateFewResultsRecommendations(currentFilters);
      recommendations.push(...fewResultsRecommendations);
    }

    // Personalized recommendations based on history
    const personalizedRecommendations = this.generatePersonalizedRecommendations(currentFilters);
    recommendations.push(...personalizedRecommendations);

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority] || 1;
      const bPriority = priorityWeight[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return (b.confidence || 0) - (a.confidence || 0);
    });
  }

  /**
   * Get filter usage statistics
   */
  getFilterUsageStats() {
    const stats = {
      totalEvents: 0,
      categoryUsage: {},
      presetUsage: {},
      averageFiltersPerSearch: 0,
      mostUsedCategories: [],
      searchPatterns: []
    };

    for (const [key, data] of this.aggregatedData.entries()) {
      if (key.startsWith('category_')) {
        const category = key.replace('category_', '');
        stats.categoryUsage[category] = data;
        stats.totalEvents += data;
      } else if (key.startsWith('preset_')) {
        const presetId = key.replace('preset_', '');
        stats.presetUsage[presetId] = data;
      }
    }

    // Calculate most used categories
    stats.mostUsedCategories = Object.entries(stats.categoryUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    return stats;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {
      averageFilterTime: 0,
      filterOperations: 0,
      cacheHitRate: 0,
      slowOperations: []
    };

    const performanceData = this.aggregatedData.get('performance') || [];
    
    if (performanceData.length > 0) {
      metrics.averageFilterTime = performanceData.reduce((sum, op) => sum + op.duration, 0) / performanceData.length;
      metrics.filterOperations = performanceData.length;
      
      // Identify slow operations
      const avgTime = metrics.averageFilterTime;
      metrics.slowOperations = performanceData
        .filter(op => op.duration > avgTime * 2)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);
    }

    return metrics;
  }

  /**
   * Flush events to aggregated storage
   */
  async flushEvents() {
    if (this.eventBuffer.length === 0) return;

    const eventsToProcess = [...this.eventBuffer];
    this.eventBuffer = [];

    // Process events and update aggregated data
    for (const event of eventsToProcess) {
      this.processEvent(event);
    }

    this.lastAggregation = Date.now();
  }

  /**
   * Aggregate events periodically
   */
  async aggregateEvents() {
    const now = Date.now();
    
    // Check if we need to aggregate
    if (now - this.lastAggregation < 60000) { // 1 minute
      return;
    }

    await this.flushEvents();
  }

  /**
   * Process individual event for aggregation
   */
  processEvent(event) {
    switch (event.type) {
      case 'filter_application':
        this.aggregateFilterApplication(event);
        break;
      
      case 'filter_change':
        this.aggregateFilterChange(event);
        break;
      
      case 'preset_usage':
        this.aggregatePresetUsage(event);
        break;
      
      case 'search_result':
        this.aggregateSearchResult(event);
        break;
      
      case 'performance':
        this.aggregatePerformance(event);
        break;
    }
  }

  /**
   * Aggregate filter application events
   */
  aggregateFilterApplication(event) {
    const filterCount = event.filterCount || 0;
    
    // Update average filters per search
    const currentAvg = this.aggregatedData.get('avg_filters_per_search') || 0;
    const count = this.aggregatedData.get('search_count') || 0;
    const newAvg = (currentAvg * count + filterCount) / (count + 1);
    
    this.aggregatedData.set('avg_filters_per_search', newAvg);
    this.aggregatedData.set('search_count', count + 1);
  }

  /**
   * Aggregate filter change events
   */
  aggregateFilterChange(event) {
    const category = event.category;
    const key = `category_${category}`;
    const current = this.aggregatedData.get(key) || 0;
    this.aggregatedData.set(key, current + 1);
  }

  /**
   * Aggregate preset usage events
   */
  aggregatePresetUsage(event) {
    const presetId = event.presetId;
    const key = `preset_${presetId}`;
    const current = this.aggregatedData.get(key) || 0;
    this.aggregatedData.set(key, current + 1);
  }

  /**
   * Aggregate search result events
   */
  aggregateSearchResult(event) {
    const effectiveness = event.filterEffectiveness || 0;
    const key = 'search_effectiveness';
    const current = this.aggregatedData.get(key) || [];
    current.push(effectiveness);
    
    // Keep only recent data
    if (current.length > 100) {
      current.shift();
    }
    
    this.aggregatedData.set(key, current);
  }

  /**
   * Aggregate performance events
   */
  aggregatePerformance(event) {
    const key = 'performance';
    const current = this.aggregatedData.get(key) || [];
    current.push({
      operation: event.operation,
      duration: event.duration,
      timestamp: event.timestamp
    });
    
    // Keep only recent performance data
    if (current.length > 50) {
      current.shift();
    }
    
    this.aggregatedData.set(key, current);
  }

  /**
   * Get most used filter categories
   */
  getMostUsedCategories() {
    const categoryUsage = {};
    
    for (const [key, count] of this.aggregatedData.entries()) {
      if (key.startsWith('category_')) {
        const category = key.replace('category_', '');
        categoryUsage[category] = count;
      }
    }
    
    return Object.entries(categoryUsage)
      .sort(([,a], [,b]) => b - a)
      .map(([category]) => category);
  }

  /**
   * Analyze filter effectiveness
   */
  analyzeFilterEffectiveness() {
    const effectivenessData = this.aggregatedData.get('search_effectiveness') || [];
    
    if (effectivenessData.length === 0) return [];

    const avgEffectiveness = effectivenessData.reduce((sum, val) => sum + val, 0) / effectivenessData.length;
    
    const insights = [];
    
    if (avgEffectiveness < 0.1) {
      insights.push({
        type: 'low_effectiveness',
        description: 'Your filters are very restrictive, consider relaxing some criteria',
        severity: 'high'
      });
    } else if (avgEffectiveness > 0.8) {
      insights.push({
        type: 'high_effectiveness',
        description: 'Your filters are well-balanced and effective',
        severity: 'info'
      });
    }
    
    return insights;
  }

  /**
   * Analyze time-based usage patterns
   */
  analyzeTimePatterns() {
    // Implementation would analyze events by time of day, day of week, etc.
    return [];
  }

  /**
   * Identify optimization opportunities
   */
  identifyOptimizations() {
    const optimizations = [];
    const avgFilters = this.aggregatedData.get('avg_filters_per_search') || 0;
    
    if (avgFilters > 8) {
      optimizations.push({
        type: 'too_many_filters',
        description: 'You use many filters, consider creating presets',
        suggestion: 'Create filter presets for common combinations'
      });
    }
    
    return optimizations;
  }

  /**
   * Get popular filter combinations
   */
  getPopularFilterCombinations() {
    // This would analyze aggregated data to find popular combinations
    // For now, return default presets as popular combinations
    return Object.entries(FILTER_PRESETS).map(([id, preset]) => ({
      id,
      name: preset.name,
      filters: preset.filters,
      usageCount: Math.floor(Math.random() * 1000) + 100, // Mock data
      confidence: 0.8
    }));
  }

  /**
   * Check if filter combination is compatible with current filters
   */
  isFilterCombinationCompatible(currentFilters, suggestedFilters) {
    // Simple compatibility check - can be made more sophisticated
    for (const [category, value] of Object.entries(suggestedFilters)) {
      const currentValue = currentFilters[category];
      if (currentValue !== undefined && currentValue !== null) {
        // If current filter exists and conflicts with suggestion
        if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Generate recommendations for no results scenario
   */
  generateNoResultsRecommendations(currentFilters) {
    const recommendations = [];
    
    recommendations.push({
      type: 'optimization',
      title: 'Relax Price Range',
      reason: 'Your current price range may be too restrictive',
      optimization: {
        category: FILTER_CATEGORIES.PRICE,
        action: 'expand_range',
        factor: 1.5
      },
      priority: 'high',
      confidence: 0.9
    });
    
    recommendations.push({
      type: 'optimization',
      title: 'Add More Stop Options',
      reason: 'Consider flights with more stops for better availability',
      optimization: {
        category: FILTER_CATEGORIES.STOPS,
        action: 'add_options',
        values: [1, 2]
      },
      priority: 'medium',
      confidence: 0.8
    });
    
    return recommendations;
  }

  /**
   * Generate recommendations for few results scenario
   */
  generateFewResultsRecommendations(currentFilters) {
    const recommendations = [];
    
    recommendations.push({
      type: 'suggestion',
      title: 'Expand Date Range',
      reason: 'Consider flexible dates for more options',
      suggestion: {
        category: 'date_range',
        action: 'expand',
        days: 3
      },
      priority: 'medium',
      confidence: 0.7
    });
    
    return recommendations;
  }

  /**
   * Generate personalized recommendations
   */
  generatePersonalizedRecommendations(currentFilters) {
    const recommendations = [];
    const mostUsedCategories = this.getMostUsedCategories();
    
    if (mostUsedCategories.includes(FILTER_CATEGORIES.PRICE)) {
      recommendations.push({
        type: 'suggestion',
        title: 'Set Price Alert',
        reason: 'You frequently filter by price',
        suggestion: {
          category: 'price_alert',
          action: 'create_alert',
          threshold: currentFilters[FILTER_CATEGORIES.PRICE]?.max || 500
        },
        priority: 'low',
        confidence: 0.6
      });
    }
    
    return recommendations;
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get session ID
   */
  getSessionId() {
    if (typeof window === 'undefined') return 'server';
    
    let sessionId = sessionStorage.getItem('filter_analytics_session');
    if (!sessionId) {
      sessionId = this.generateEventId();
      sessionStorage.setItem('filter_analytics_session', sessionId);
    }
    return sessionId;
  }

  /**
   * Get user ID
   */
  getUserId() {
    if (typeof window === 'undefined') return 'anonymous';
    
    let userId = localStorage.getItem('filter_analytics_user');
    if (!userId) {
      userId = this.generateEventId();
      localStorage.setItem('filter_analytics_user', userId);
    }
    return userId;
  }
}

// Create singleton instance
export const filterAnalytics = new FilterAnalyticsManager();

// Export utility functions
export function createFilterAnalyticsManager(options) {
  return new FilterAnalyticsManager(options);
}

// Convenience functions
export function trackFilterApplication(filters, context) {
  return filterAnalytics.trackFilterApplication(filters, context);
}

export function trackFilterChange(category, oldValue, newValue, context) {
  return filterAnalytics.trackFilterChange(category, oldValue, newValue, context);
}

export function trackPresetUsage(presetId, presetName, context) {
  return filterAnalytics.trackPresetUsage(presetId, presetName, context);
}

export async function generateFilterInsights() {
  return await filterAnalytics.generateInsights();
}

export async function generateFilterRecommendations(filters, flights) {
  return await filterAnalytics.generateRecommendations(filters, flights);
}

export function getFilterUsageStats() {
  return filterAnalytics.getFilterUsageStats();
}

export function getFilterPerformanceMetrics() {
  return filterAnalytics.getPerformanceMetrics();
}