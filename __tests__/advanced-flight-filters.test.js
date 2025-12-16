/**
 * Advanced Flight Filters Test Suite
 * Comprehensive testing for the advanced filtering system
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Import all filter modules
import { 
  FILTER_CATEGORIES, 
  FILTER_TYPES, 
  FILTER_PRESETS, 
  DEFAULT_FILTER_CONFIGS,
  formatDuration,
  formatPrice,
  formatTime,
  isFilterActive,
  getActiveFiltersCount,
  validateFilterValue,
  getFilterConflicts,
  optimizeFilters,
  generateFilterRecommendations,
  exportFilters,
  importFilters
} from '@/lib/filters/advancedFlightFilters';

import { FlightFilterEngine } from '@/lib/filters/filterEngine';
import { FilterPersistenceManager } from '@/lib/filters/filterPersistence';
import { FilterAnalyticsManager } from '@/lib/filters/filterAnalytics';
import { FilterAccessibilityManager } from '@/lib/filters/filterAccessibility';

// Mock data for testing
const mockFlights = [
  {
    _id: 'flight1',
    carrierInCharge: { _id: 'EK' },
    segmentIds: [
      {
        from: { airport: { iataCode: 'JFK' }, scheduledDeparture: '2023-12-01T08:00:00Z' },
        to: { airport: { iataCode: 'LAX' }, scheduledArrival: '2023-12-01T14:00:00Z' },
        durationMinutes: 360
      }
    ],
    totalDurationMinutes: 360,
    price: 500,
    stops: 0,
    amenities: ['wifi', 'meal'],
    aircraft: 'wide_body',
    class: 'economy',
    refundable: true,
    carbonEmission: 200
  },
  {
    _id: 'flight2',
    carrierInCharge: { _id: 'EY' },
    segmentIds: [
      {
        from: { airport: { iataCode: 'JFK' }, scheduledDeparture: '2023-12-01T10:00:00Z' },
        to: { airport: { iataCode: 'LAX' }, scheduledArrival: '2023-12-01T20:00:00Z' },
        durationMinutes: 420
      }
    ],
    totalDurationMinutes: 420,
    price: 300,
    stops: 1,
    amenities: ['meal'],
    aircraft: 'narrow_body',
    class: 'business',
    refundable: false,
    carbonEmission: 350
  },
  {
    _id: 'flight3',
    carrierInCharge: { _id: 'FZ' },
    segmentIds: [
      {
        from: { airport: { iataCode: 'JFK' }, scheduledDeparture: '2023-12-01T06:00:00Z' },
        to: { airport: { iataCode: 'LAX' }, scheduledArrival: '2023-12-01T12:00:00Z' },
        durationMinutes: 300
      }
    ],
    totalDurationMinutes: 300,
    price: 800,
    stops: 0,
    amenities: ['wifi', 'entertainment', 'power'],
    aircraft: 'wide_body',
    class: 'first',
    refundable: true,
    carbonEmission: 180
  }
];

describe('Advanced Flight Filters System', () => {
  let filterEngine;
  let persistenceManager;
  let analyticsManager;
  let accessibilityManager;

  beforeEach(() => {
    filterEngine = new FlightFilterEngine();
    persistenceManager = new FilterPersistenceManager();
    analyticsManager = new FilterAnalyticsManager();
    accessibilityManager = new FilterAccessibilityManager();
  });

  afterEach(() => {
    if (accessibilityManager) {
      accessibilityManager.cleanup();
    }
  });

  describe('Filter Constants and Utilities', () => {
    test('should have all required filter categories', () => {
      expect(FILTER_CATEGORIES).toHaveProperty('PRICE');
      expect(FILTER_CATEGORIES).toHaveProperty('DURATION');
      expect(FILTER_CATEGORIES).toHaveProperty('STOPS');
      expect(FILTER_CATEGORIES).toHaveProperty('AIRLINES');
      expect(FILTER_CATEGORIES).toHaveProperty('AIRPORTS');
      expect(FILTER_CATEGORIES).toHaveProperty('TIMES');
      expect(FILTER_CATEGORIES).toHaveProperty('AMENITIES');
      expect(FILTER_CATEGORIES).toHaveProperty('AIRCRAFT');
      expect(FILTER_CATEGORIES).toHaveProperty('BAGGAGE');
      expect(FILTER_CATEGORIES).toHaveProperty('LAYOVER');
      expect(FILTER_CATEGORIES).toHaveProperty('CLASS');
      expect(FILTER_CATEGORIES).toHaveProperty('REFUNDABLE');
      expect(FILTER_CATEGORIES).toHaveProperty('ENVIRONMENTAL');
    });

    test('should have all required filter types', () => {
      expect(FILTER_TYPES).toHaveProperty('RANGE');
      expect(FILTER_TYPES).toHaveProperty('CHECKBOX');
      expect(FILTER_TYPES).toHaveProperty('RADIO');
      expect(FILTER_TYPES).toHaveProperty('SELECT');
      expect(FILTER_TYPES).toHaveProperty('MULTI_SELECT');
      expect(FILTER_TYPES).toHaveProperty('TOGGLE');
      expect(FILTER_TYPES).toHaveProperty('SLIDER');
      expect(FILTER_TYPES).toHaveProperty('DATE_RANGE');
      expect(FILTER_TYPES).toHaveProperty('TIME_RANGE');
    });

    test('should have default filter configurations', () => {
      expect(DEFAULT_FILTER_CONFIGS).toHaveProperty(FILTER_CATEGORIES.PRICE);
      expect(DEFAULT_FILTER_CONFIGS).toHaveProperty(FILTER_CATEGORIES.DURATION);
      expect(DEFAULT_FILTER_CONFIGS[FILTER_CATEGORIES.PRICE]).toHaveProperty('type');
      expect(DEFAULT_FILTER_CONFIGS[FILTER_CATEGORIES.PRICE]).toHaveProperty('label');
      expect(DEFAULT_FILTER_CONFIGS[FILTER_CATEGORIES.PRICE]).toHaveProperty('min');
      expect(DEFAULT_FILTER_CONFIGS[FILTER_CATEGORIES.PRICE]).toHaveProperty('max');
    });

    test('should have filter presets', () => {
      expect(FILTER_PRESETS).toHaveProperty('CHEAPEST');
      expect(FILTER_PRESETS).toHaveProperty('QUICKEST');
      expect(FILTER_PRESETS).toHaveProperty('BEST_VALUE');
      expect(FILTER_PRESETS).toHaveProperty('COMFORT');
      expect(FILTER_PRESETS).toHaveProperty('ECO_FRIENDLY');
      expect(FILTER_PRESETS).toHaveProperty('BUSINESS');
      
      expect(FILTER_PRESETS.CHEAPEST).toHaveProperty('name');
      expect(FILTER_PRESETS.CHEAPEST).toHaveProperty('description');
      expect(FILTER_PRESETS.CHEAPEST).toHaveProperty('filters');
    });
  });

  describe('Format Utilities', () => {
    test('should format duration correctly', () => {
      expect(formatDuration(0)).toBe('0h');
      expect(formatDuration(30)).toBe('30m');
      expect(formatDuration(60)).toBe('1h 0m');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(120)).toBe('2h 0m');
      expect(formatDuration(150)).toBe('2h 30m');
    });

    test('should format price correctly', () => {
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(100)).toBe('$100.00');
      expect(formatPrice(1234.56)).toBe('$1,234.56');
    });

    test('should format time correctly', () => {
      expect(formatTime(0)).toBe('12:00 AM');
      expect(formatTime(360)).toBe('6:00 AM');
      expect(formatTime(720)).toBe('12:00 PM');
      expect(formatTime(1080)).toBe('6:00 PM');
      expect(formatTime(1439)).toBe('11:59 PM');
    });
  });

  describe('Filter State Utilities', () => {
    test('should check if filter is active', () => {
      expect(isFilterActive({ price: { min: 100, max: 500 } }, 'price')).toBe(true);
      expect(isFilterActive({ airlines: ['EK', 'EY'] }, 'airlines')).toBe(true);
      expect(isFilterActive({ refundable: true }, 'refundable')).toBe(true);
      expect(isFilterActive({ price: { min: 0, max: 5000 } }, 'price')).toBe(false); // Default value
    });

    test('should count active filters correctly', () => {
      const filters = {
        price: { min: 100, max: 500 },
        airlines: ['EK'],
        stops: [0],
        refundable: true
      };
      expect(getActiveFiltersCount(filters)).toBe(4);
      
      const emptyFilters = {
        price: { min: 0, max: 5000 },
        airlines: [],
        stops: [],
        refundable: false
      };
      expect(getActiveFiltersCount(emptyFilters)).toBe(0);
    });

    test('should validate filter values', () => {
      const priceConfig = { type: FILTER_TYPES.RANGE, min: 0, max: 5000 };
      expect(validateFilterValue(priceConfig, { min: 100, max: 400 })).toEqual({ valid: true });
      expect(validateFilterValue(priceConfig, { min: -100, max: 400 })).toEqual({ 
        valid: false, 
        message: 'Value must be between 0 and 5000' 
      });
      expect(validateFilterValue(priceConfig, { min: 400, max: 100 })).toEqual({ 
        valid: false, 
        message: 'Value must be between 0 and 5000' 
      });
    });

    test('should detect filter conflicts', () => {
      const conflictingFilters = {
        [FILTER_CATEGORIES.PRICE]: { min: 0, max: 200 },
        [FILTER_CATEGORIES.CLASS]: ['business', 'first'],
        [FILTER_CATEGORIES.STOPS]: [0]
      };
      const conflicts = getFilterConflicts(conflictingFilters);
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('warning');
      expect(conflicts[0].message).toContain('Business/First class flights may not be available');
      expect(conflicts[0].fields).toContain(FILTER_CATEGORIES.PRICE);
      expect(conflicts[0].fields).toContain(FILTER_CATEGORIES.CLASS);
    });

    test('should optimize filters for better results', () => {
      const restrictiveFilters = {
        [FILTER_CATEGORIES.PRICE]: { min: 0, max: 100 },
        [FILTER_CATEGORIES.STOPS]: [0]
      };
      const optimized = optimizeFilters(restrictiveFilters, []);
      
      expect(optimized[FILTER_CATEGORIES.PRICE].max).toBeGreaterThan(100);
    });

    test('should generate filter recommendations', () => {
      const searchState = { tripType: 'business' };
      const recommendations = generateFilterRecommendations(searchState, mockFlights);
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('reason');
    });

    test('should export and import filters correctly', () => {
      const originalFilters = {
        [FILTER_CATEGORIES.PRICE]: { min: 100, max: 500 },
        [FILTER_CATEGORIES.AIRLINES]: ['EK', 'EY']
      };
      
      const exported = exportFilters(originalFilters);
      const imported = importFilters(exported);
      
      expect(imported).toEqual(originalFilters);
    });
  });

  describe('Filter Engine', () => {
    test('should filter flights by price range', async () => {
      const filters = {
        [FILTER_CATEGORIES.PRICE]: { min: 200, max: 600 }
      };
      
      const result = await filterEngine.filterFlights(mockFlights, filters);
      
      expect(result.filteredCount).toBe(2);
      expect(result.flights.map(f => f._id)).toContain('flight1');
      expect(result.flights.map(f => f._id)).toContain('flight2');
      expect(result.flights.map(f => f._id)).not.toContain('flight3');
    });

    test('should filter flights by duration range', async () => {
      const filters = {
        [FILTER_CATEGORIES.DURATION]: { min: 300, max: 400 }
      };
      
      const result = await filterEngine.filterFlights(mockFlights, filters);
      
      expect(result.filteredCount).toBe(2);
      expect(result.flights.map(f => f._id)).toContain('flight1');
      expect(result.flights.map(f => f._id)).toContain('flight3');
      expect(result.flights.map(f => f._id)).not.toContain('flight2');
    });

    test('should filter flights by stops', async () => {
      const filters = {
        [FILTER_CATEGORIES.STOPS]: [0]
      };
      
      const result = await filterEngine.filterFlights(mockFlights, filters);
      
      expect(result.filteredCount).toBe(2);
      expect(result.flights.map(f => f._id)).toContain('flight1');
      expect(result.flights.map(f => f._id)).toContain('flight3');
      expect(result.flights.map(f => f._id)).not.toContain('flight2');
    });

    test('should filter flights by airlines', async () => {
      const filters = {
        [FILTER_CATEGORIES.AIRLINES]: ['EK']
      };
      
      const result = await filterEngine.filterFlights(mockFlights, filters);
      
      expect(result.filteredCount).toBe(1);
      expect(result.flights.map(f => f._id)).toContain('flight1');
      expect(result.flights.map(f => f._id)).not.toContain('flight2');
      expect(result.flights.map(f => f._id)).not.toContain('flight3');
    });

    test('should apply multiple filters correctly', async () => {
      const filters = {
        [FILTER_CATEGORIES.PRICE]: { min: 0, max: 1000 },
        [FILTER_CATEGORIES.STOPS]: [0],
        [FILTER_CATEGORIES.AMENITIES]: ['wifi']
      };
      
      const result = await filterEngine.filterFlights(mockFlights, filters);
      
      expect(result.filteredCount).toBe(2);
      expect(result.flights.map(f => f._id)).toContain('flight1');
      expect(result.flights.map(f => f._id)).toContain('flight3');
      expect(result.flights.map(f => f._id)).not.toContain('flight2');
    });

    test('should return metadata with filter results', async () => {
      const filters = {
        [FILTER_CATEGORIES.PRICE]: { min: 200, max: 600 }
      };
      
      const result = await filterEngine.filterFlights(mockFlights, filters, { includeMetadata: true });
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.filterStats).toBeDefined();
      expect(result.metadata.performance).toBeDefined();
      expect(result.metadata.appliedFilters).toBeDefined();
    });
  });

  describe('Filter Persistence', () => {
    test('should save and load active filters', async () => {
      const filters = {
        [FILTER_CATEGORIES.PRICE]: { min: 100, max: 500 },
        [FILTER_CATEGORIES.AIRLINES]: ['EK']
      };
      
      await persistenceManager.saveActiveFilters(filters);
      const loaded = await persistenceManager.loadActiveFilters();
      
      expect(loaded).toEqual(filters);
    });

    test('should manage filter history', async () => {
      const filters1 = { [FILTER_CATEGORIES.PRICE]: { min: 100, max: 500 } };
      const filters2 = { [FILTER_CATEGORIES.AIRLINES]: ['EK'] };
      
      const id1 = await persistenceManager.addToHistory(filters1);
      const id2 = await persistenceManager.addToHistory(filters2);
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      
      const history = await persistenceManager.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].filters).toEqual(filters1);
      expect(history[1].filters).toEqual(filters2);
    });

    test('should save and load presets', async () => {
      const preset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'A test preset',
        filters: { [FILTER_CATEGORIES.PRICE]: { min: 200, max: 400 } }
      };
      
      const presetId = await persistenceManager.savePreset(preset);
      expect(presetId).toBe('test-preset');
      
      const presets = await persistenceManager.getPresets();
      const savedPreset = presets.find(p => p.id === 'test-preset');
      
      expect(savedPreset).toBeDefined();
      expect(savedPreset.name).toBe('Test Preset');
      expect(savedPreset.filters).toEqual(preset.filters);
    });
  });

  describe('Filter Analytics', () => {
    test('should track filter events', () => {
      analyticsManager.trackFilterApplication({ price: { min: 100, max: 500 } });
      analyticsManager.trackFilterChange('price', null, { min: 100, max: 500 });
      analyticsManager.trackPresetUsage('cheapest', 'Cheapest Flights');
      
      const stats = analyticsManager.getFilterUsageStats();
      
      expect(stats.categoryUsage).toBeDefined();
      expect(stats.categoryUsage.price).toBeGreaterThan(0);
    });

    test('should generate insights', async () => {
      // Track some events first
      analyticsManager.trackFilterApplication({ price: { min: 100, max: 500 } });
      analyticsManager.trackFilterChange('price', null, { min: 100, max: 500 });
      analyticsManager.trackPresetUsage('cheapest', 'Cheapest Flights');
      
      const insights = await analyticsManager.generateInsights();
      
      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toHaveProperty('type');
      expect(insights[0]).toHaveProperty('title');
      expect(insights[0]).toHaveProperty('description');
    });

    test('should generate recommendations', async () => {
      const filters = { [FILTER_CATEGORIES.PRICE]: { min: 0, max: 100 } };
      const recommendations = await analyticsManager.generateRecommendations(filters, []);
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('title');
      expect(recommendations[0]).toHaveProperty('reason');
    });

    test('should provide performance metrics', () => {
      analyticsManager.trackFilterPerformance('range_filter', 150);
      analyticsManager.trackFilterPerformance('checkbox_filter', 50);
      
      const metrics = analyticsManager.getPerformanceMetrics();
      
      expect(metrics.averageFilterTime).toBeGreaterThan(0);
      expect(metrics.filterOperations).toBe(2);
    });
  });

  describe('Filter Accessibility', () => {
    test('should provide accessibility props', () => {
      const props = accessibilityManager.getAccessibilityProps(
        FILTER_CATEGORIES.PRICE, 
        FILTER_TYPES.RANGE
      );
      
      expect(props).toHaveProperty('data-filter-category', FILTER_CATEGORIES.PRICE);
      expect(props).toHaveProperty('data-filter-type', FILTER_TYPES.RANGE);
      expect(props).toHaveProperty('role', 'group');
      expect(props).toHaveProperty('aria-label');
    });

    test('should validate accessibility', () => {
      const mockContainer = {
        getAttribute: jest.fn(),
        querySelectorAll: jest.fn(() => [])
      };
      
      const issues = accessibilityManager.validateAccessibility(mockContainer);
      
      expect(issues).toBeInstanceOf(Array);
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should announce filter changes', () => {
      const announceSpy = jest.spyOn(accessibilityManager, 'announce');
      
      accessibilityManager.announceFilterChange(
        FILTER_CATEGORIES.PRICE, 
        { min: 100, max: 500 }, 
        FILTER_TYPES.RANGE
      );
      
      expect(announceSpy).toHaveBeenCalled();
      expect(announceSpy).toHaveBeenCalledWith(
        expect.stringContaining('Range changed to 100 to 500'),
        'assertive'
      );
    });
  });

  describe('Integration Tests', () => {
    test('should handle complex filter scenarios', async () => {
      const complexFilters = {
        [FILTER_CATEGORIES.PRICE]: { min: 200, max: 800 },
        [FILTER_CATEGORIES.DURATION]: { min: 300, max: 480 },
        [FILTER_CATEGORIES.STOPS]: [0, 1],
        [FILTER_CATEGORIES.AIRLINES]: ['EK', 'EY'],
        [FILTER_CATEGORIES.AMENITIES]: ['wifi'],
        [FILTER_CATEGORIES.CLASS]: ['economy', 'business'],
        [FILTER_CATEGORIES.REFUNDABLE]: true
      };
      
      const result = await filterEngine.filterFlights(mockFlights, complexFilters);
      
      expect(result.filteredCount).toBeGreaterThanOrEqual(0);
      expect(result.filteredCount).toBeLessThanOrEqual(mockFlights.length);
      expect(result.metadata.filterStats).toBeDefined();
    });

    test('should handle empty results gracefully', async () => {
      const impossibleFilters = {
        [FILTER_CATEGORIES.PRICE]: { min: 0, max: 50 },
        [FILTER_CATEGORIES.STOPS]: [0],
        [FILTER_CATEGORIES.AIRLINES]: ['NONEXISTENT']
      };
      
      const result = await filterEngine.filterFlights(mockFlights, impossibleFilters);
      
      expect(result.filteredCount).toBe(0);
      expect(result.flights).toHaveLength(0);
      expect(result.metadata.filterStats).toBeDefined();
    });

    test('should handle large datasets efficiently', async () => {
      // Create large dataset
      const largeFlights = Array.from({ length: 1000 }, (_, i) => ({
        ...mockFlights[i % 3],
        _id: `flight${i}`
      }));
      
      const startTime = performance.now();
      const result = await filterEngine.filterFlights(largeFlights, {
        [FILTER_CATEGORIES.PRICE]: { min: 200, max: 600 }
      });
      const endTime = performance.now();
      
      expect(result.filteredCount).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid filter data gracefully', async () => {
      const invalidFilters = {
        [FILTER_CATEGORIES.PRICE]: { min: 'invalid', max: 'data' }
      };
      
      await expect(
        filterEngine.filterFlights(mockFlights, invalidFilters)
      ).rejects.toThrow();
    });

    test('should handle missing flight data gracefully', async () => {
      const incompleteFlights = [
        { _id: 'flight1', price: 500 }, // Missing required fields
        null, // Invalid flight
        undefined // Missing flight
      ];
      
      const result = await filterEngine.filterFlights(incompleteFlights, {
        [FILTER_CATEGORIES.PRICE]: { min: 0, max: 1000 }
      });
      
      expect(result.filteredCount).toBeGreaterThanOrEqual(0);
      expect(result.flights).toBeInstanceOf(Array);
    });
  });
});