/**
 * Advanced Flight Filters Redux Slice
 * Comprehensive state management for advanced flight filtering
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  FILTER_CATEGORIES, 
  FILTER_PRESETS, 
  DEFAULT_FILTER_CONFIGS,
  resetFilters,
  getActiveFiltersCount,
  validateFilterValue,
  getFilterConflicts,
  optimizeFilters,
  generateFilterRecommendations,
  exportFilters,
  importFilters
} from '@/lib/filters/advancedFlightFilters';
import { flightFilterEngine } from '@/lib/filters/filterEngine';

// Initial state
const initialState = {
  // Current active filters
  activeFilters: {},
  
  // Default filter values
  defaultFilters: {
    [FILTER_CATEGORIES.PRICE]: { min: 0, max: 5000 },
    [FILTER_CATEGORIES.DURATION]: { min: 0, max: 1440 },
    [FILTER_CATEGORIES.STOPS]: [],
    [FILTER_CATEGORIES.AIRLINES]: [],
    [FILTER_CATEGORIES.AIRPORTS]: { departure: [], arrival: [] },
    [FILTER_CATEGORIES.TIMES]: {
      departure: [],
      arrival: []
    },
    [FILTER_CATEGORIES.AMENITIES]: [],
    [FILTER_CATEGORIES.AIRCRAFT]: [],
    [FILTER_CATEGORIES.BAGGAGE]: { cabin: 0, checked: 0 },
    [FILTER_CATEGORIES.LAYOVER]: { min: 0, max: 480 },
    [FILTER_CATEGORIES.CLASS]: [],
    [FILTER_CATEGORIES.REFUNDABLE]: false,
    [FILTER_CATEGORIES.ENVIRONMENTAL]: { min: 0, max: 1000 }
  },
  
  // Available filter options (populated from search results)
  availableOptions: {
    [FILTER_CATEGORIES.AIRLINES]: [],
    [FILTER_CATEGORIES.AIRPORTS]: { departure: [], arrival: [] },
    [FILTER_CATEGORIES.AIRCRAFT]: []
  },
  
  // Filter presets
  presets: FILTER_PRESETS,
  
  // UI state
  ui: {
    sidebarOpen: false,
    mobileFiltersOpen: false,
    activeCategory: FILTER_CATEGORIES.PRICE,
    showAdvanced: false,
    showRecommendations: false
  },
  
  // Filter history
  history: {
    recentSearches: [],
    savedFilters: [],
    maxHistorySize: 20
  },
  
  // Performance and analytics
  analytics: {
    filterUsage: {},
    popularFilters: {},
    averageFilterCount: 0,
    totalFilterApplications: 0
  },
  
  // Filter results
  results: {
    filteredFlights: [],
    totalCount: 0,
    filteredCount: 0,
    loading: false,
    error: null,
    lastUpdated: null,
    filterStats: {}
  },
  
  // Smart features
  smart: {
    conflicts: [],
    recommendations: [],
    optimizations: [],
    autoApply: false
  }
};

// Async thunks
export const applyFilters = createAsyncThunk(
  'advancedFlightFilters/applyFilters',
  async ({ flights, filters, options = {} }, { rejectWithValue }) => {
    try {
      const result = await flightFilterEngine.filterFlights(flights, filters, options);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveFilterPreset = createAsyncThunk(
  'advancedFlightFilters/saveFilterPreset',
  async ({ name, description, filters }, { getState, rejectWithValue }) => {
    try {
      const state = getState().advancedFlightFilters;
      const preset = {
        id: Date.now().toString(),
        name,
        description,
        filters: exportFilters(filters),
        createdAt: new Date().toISOString(),
        usageCount: 0
      };
      
      return preset;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadFilterPreset = createAsyncThunk(
  'advancedFlightFilters/loadFilterPreset',
  async (presetId, { rejectWithValue }) => {
    try {
      // In a real app, this would load from storage/API
      const savedPresets = JSON.parse(localStorage.getItem('savedFilterPresets') || '[]');
      const preset = savedPresets.find(p => p.id === presetId);
      
      if (!preset) {
        throw new Error('Preset not found');
      }
      
      return {
        ...preset,
        filters: importFilters(preset.filters)
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const analyzeFilterUsage = createAsyncThunk(
  'advancedFlightFilters/analyzeFilterUsage',
  async (_, { getState }) => {
    const state = getState().advancedFlightFilters;
    const { activeFilters, analytics } = state;
    
    // Analyze current filter usage
    const usage = {};
    for (const [category, value] of Object.entries(activeFilters)) {
      if (value !== null && value !== undefined && 
          !((Array.isArray(value) && value.length === 0) || 
            (typeof value === 'object' && Object.keys(value).length === 0))) {
        usage[category] = usage[category] || 0;
        usage[category]++;
      }
    }
    
    // Update popular filters
    const popularFilters = { ...analytics.popularFilters };
    for (const [category, count] of Object.entries(usage)) {
      popularFilters[category] = (popularFilters[category] || 0) + count;
    }
    
    return {
      usage,
      popularFilters,
      averageFilterCount: getActiveFiltersCount(activeFilters)
    };
  }
);

// Slice definition
const advancedFlightFiltersSlice = createSlice({
  name: 'advancedFlightFilters',
  initialState,
  reducers: {
    // Filter management
    setActiveFilter: (state, action) => {
      const { category, value } = action.payload;
      state.activeFilters[category] = value;
      
      // Update analytics
      state.analytics.totalFilterApplications++;
      state.analytics.filterUsage[category] = (state.analytics.filterUsage[category] || 0) + 1;
      
      // Check for conflicts
      state.smart.conflicts = getFilterConflicts(state.activeFilters);
      
      // Generate recommendations
      // state.smart.recommendations = generateFilterRecommendations(/* searchState */, /* availableFlights */);
    },
    
    updateActiveFilter: (state, action) => {
      const { category, value } = action.payload;
      if (state.activeFilters[category]) {
        state.activeFilters[category] = { ...state.activeFilters[category], ...value };
      } else {
        state.activeFilters[category] = value;
      }
      
      // Update analytics and check conflicts
      state.analytics.totalFilterApplications++;
      state.smart.conflicts = getFilterConflicts(state.activeFilters);
    },
    
    removeActiveFilter: (state, action) => {
      const category = action.payload;
      delete state.activeFilters[category];
      state.smart.conflicts = getFilterConflicts(state.activeFilters);
    },
    
    clearActiveFilters: (state) => {
      state.activeFilters = { ...state.defaultFilters };
      state.smart.conflicts = [];
      state.smart.recommendations = [];
    },
    
    resetToDefaults: (state) => {
      state.activeFilters = { ...state.defaultFilters };
      state.smart.conflicts = [];
      state.smart.recommendations = [];
    },
    
    // Preset management
    applyPreset: (state, action) => {
      const presetId = action.payload;
      const preset = state.presets[presetId];
      if (preset) {
        state.activeFilters = { ...preset.filters };
        state.smart.conflicts = getFilterConflicts(state.activeFilters);
        
        // Track preset usage
        if (state.presets[presetId]) {
          state.presets[presetId].usageCount = (state.presets[presetId].usageCount || 0) + 1;
        }
      }
    },
    
    // UI management
    toggleSidebar: (state) => {
      state.ui.sidebarOpen = !state.ui.sidebarOpen;
    },
    
    setSidebarOpen: (state, action) => {
      state.ui.sidebarOpen = action.payload;
    },
    
    toggleMobileFilters: (state) => {
      state.ui.mobileFiltersOpen = !state.ui.mobileFiltersOpen;
    },
    
    setMobileFiltersOpen: (state, action) => {
      state.ui.mobileFiltersOpen = action.payload;
    },
    
    setActiveCategory: (state, action) => {
      state.ui.activeCategory = action.payload;
    },
    
    toggleAdvancedMode: (state) => {
      state.ui.showAdvanced = !state.ui.showAdvanced;
    },
    
    setAdvancedMode: (state, action) => {
      state.ui.showAdvanced = action.payload;
    },
    
    toggleRecommendations: (state) => {
      state.ui.showRecommendations = !state.ui.showRecommendations;
    },
    
    // Available options management
    setAvailableOptions: (state, action) => {
      const { category, options } = action.payload;
      state.availableOptions[category] = options;
    },
    
    updateAvailableOptions: (state, action) => {
      const { category, options } = action.payload;
      state.availableOptions[category] = { ...state.availableOptions[category], ...options };
    },
    
    // History management
    addToHistory: (state, action) => {
      const { filters, searchState } = action.payload;
      const historyItem = {
        id: Date.now().toString(),
        filters: exportFilters(filters),
        searchState,
        timestamp: new Date().toISOString()
      };
      
      // Add to beginning of array
      state.history.recentSearches.unshift(historyItem);
      
      // Limit history size
      if (state.history.recentSearches.length > state.history.maxHistorySize) {
        state.history.recentSearches = state.history.recentSearches.slice(0, state.history.maxHistorySize);
      }
    },
    
    removeFromHistory: (state, action) => {
      const id = action.payload;
      state.history.recentSearches = state.history.recentSearches.filter(item => item.id !== id);
    },
    
    clearHistory: (state) => {
      state.history.recentSearches = [];
    },
    
    // Smart features
    setAutoApply: (state, action) => {
      state.smart.autoApply = action.payload;
    },
    
    applyOptimizations: (state) => {
      if (state.results.filteredFlights.length === 0) {
        const optimized = optimizeFilters(state.activeFilters, state.results.filteredFlights);
        state.activeFilters = optimized;
        state.smart.optimizations = Object.keys(optimized).filter(key => optimized[key] !== state.activeFilters[key]);
      }
    },
    
    dismissConflict: (state, action) => {
      const conflictIndex = action.payload;
      state.smart.conflicts = state.smart.conflicts.filter((_, index) => index !== conflictIndex);
    },
    
    dismissRecommendation: (state, action) => {
      const recommendationIndex = action.payload;
      state.smart.recommendations = state.smart.recommendations.filter((_, index) => index !== recommendationIndex);
    },
    
    // Analytics
    recordFilterInteraction: (state, action) => {
      const { category, action: interactionType } = action.payload;
      if (!state.analytics.filterUsage[category]) {
        state.analytics.filterUsage[category] = {};
      }
      state.analytics.filterUsage[category][interactionType] = 
        (state.analytics.filterUsage[category][interactionType] || 0) + 1;
    },
    
    // Results management
    clearResults: (state) => {
      state.results = {
        ...state.results,
        filteredFlights: [],
        totalCount: 0,
        filteredCount: 0,
        error: null,
        lastUpdated: null,
        filterStats: {}
      };
    }
  },
  extraReducers: (builder) => {
    // applyFilters
    builder
      .addCase(applyFilters.pending, (state) => {
        state.results.loading = true;
        state.results.error = null;
      })
      .addCase(applyFilters.fulfilled, (state, action) => {
        state.results.loading = false;
        state.results.filteredFlights = action.payload.flights;
        state.results.totalCount = action.payload.totalCount;
        state.results.filteredCount = action.payload.filteredCount;
        state.results.lastUpdated = new Date().toISOString();
        
        if (action.payload.metadata) {
          state.results.filterStats = action.payload.metadata.filterStats || {};
        }
      })
      .addCase(applyFilters.rejected, (state, action) => {
        state.results.loading = false;
        state.results.error = action.payload;
      });
    
    // saveFilterPreset
    builder
      .addCase(saveFilterPreset.fulfilled, (state, action) => {
        const preset = action.payload;
        state.history.savedFilters.push(preset);
        
        // Save to localStorage
        const savedPresets = [...state.history.savedFilters];
        localStorage.setItem('savedFilterPresets', JSON.stringify(savedPresets));
      });
    
    // loadFilterPreset
    builder
      .addCase(loadFilterPreset.fulfilled, (state, action) => {
        const preset = action.payload;
        state.activeFilters = preset.filters;
        state.smart.conflicts = getFilterConflicts(state.activeFilters);
        
        // Update usage count
        const savedPreset = state.history.savedFilters.find(p => p.id === preset.id);
        if (savedPreset) {
          savedPreset.usageCount++;
        }
      });
    
    // analyzeFilterUsage
    builder
      .addCase(analyzeFilterUsage.fulfilled, (state, action) => {
        const { usage, popularFilters, averageFilterCount } = action.payload;
        state.analytics.filterUsage = { ...state.analytics.filterUsage, ...usage };
        state.analytics.popularFilters = popularFilters;
        state.analytics.averageFilterCount = averageFilterCount;
      });
  }
});

// Export actions
export const {
  setActiveFilter,
  updateActiveFilter,
  removeActiveFilter,
  clearActiveFilters,
  resetToDefaults,
  applyPreset,
  toggleSidebar,
  setSidebarOpen,
  toggleMobileFilters,
  setMobileFiltersOpen,
  setActiveCategory,
  toggleAdvancedMode,
  setAdvancedMode,
  toggleRecommendations,
  setAvailableOptions,
  updateAvailableOptions,
  addToHistory,
  removeFromHistory,
  clearHistory,
  setAutoApply,
  applyOptimizations,
  dismissConflict,
  dismissRecommendation,
  recordFilterInteraction,
  clearResults
} = advancedFlightFiltersSlice.actions;

// Selectors
export const selectActiveFilters = (state) => state.advancedFlightFilters.activeFilters;
export const selectDefaultFilters = (state) => state.advancedFlightFilters.defaultFilters;
export const selectAvailableOptions = (state) => state.advancedFlightFilters.availableOptions;
export const selectFilterPresets = (state) => state.advancedFlightFilters.presets;
export const selectSavedPresets = (state) => state.advancedFlightFilters.history.savedFilters;
export const selectFilterHistory = (state) => state.advancedFlightFilters.history.recentSearches;
export const selectFilterUI = (state) => state.advancedFlightFilters.ui;
export const selectFilterResults = (state) => state.advancedFlightFilters.results;
export const selectFilterAnalytics = (state) => state.advancedFlightFilters.analytics;
export const selectSmartFeatures = (state) => state.advancedFlightFilters.smart;
export const selectActiveFiltersCount = (state) => 
  getActiveFiltersCount(state.advancedFlightFilters.activeFilters);
export const selectFilterConflicts = (state) => state.advancedFlightFilters.smart.conflicts;
export const selectFilterRecommendations = (state) => state.advancedFlightFilters.smart.recommendations;

// Utility selectors
export const selectIsFilterActive = (state, category, value = null) => {
  const activeFilters = state.advancedFlightFilters.activeFilters;
  const filterValue = activeFilters[category];
  
  if (value !== null) {
    if (Array.isArray(filterValue)) {
      return filterValue.includes(value);
    }
    return filterValue === value;
  }
  
  return filterValue !== null && filterValue !== undefined;
};

export const selectFilterOptions = (state, category) => {
  const availableOptions = state.advancedFlightFilters.availableOptions;
  const defaultConfig = DEFAULT_FILTER_CONFIGS[category];
  
  if (availableOptions[category] && availableOptions[category].length > 0) {
    return availableOptions[category];
  }
  
  return defaultConfig?.options || [];
};

export const selectFilterConfig = (state, category) => {
  return DEFAULT_FILTER_CONFIGS[category];
};

// Export reducer
export default advancedFlightFiltersSlice.reducer;