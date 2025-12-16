/**
 * Filter Persistence and History Management
 * Handles saving, loading, and managing filter states
 */

import { 
  FILTER_CATEGORIES, 
  FILTER_PRESETS, 
  exportFilters, 
  importFilters,
  getActiveFiltersCount
} from './advancedFlightFilters';

// Storage keys
const STORAGE_KEYS = {
  ACTIVE_FILTERS: 'flight_filters_active',
  FILTER_HISTORY: 'flight_filters_history',
  SAVED_PRESETS: 'flight_filters_presets',
  USER_PREFERENCES: 'flight_filters_preferences',
  FILTER_ANALYTICS: 'flight_filters_analytics'
};

// Default settings
const DEFAULT_SETTINGS = {
  maxHistorySize: 20,
  maxPresets: 50,
  autoSave: true,
  analyticsEnabled: true,
  retentionDays: 30
};

/**
 * Filter Persistence Manager
 */
export class FilterPersistenceManager {
  constructor(options = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...options };
    this.storage = this.getStorageAdapter();
  }

  /**
   * Get appropriate storage adapter
   */
  getStorageAdapter() {
    if (typeof window !== 'undefined' && window.localStorage) {
      return new LocalStorageAdapter();
    }
    return new MemoryAdapter();
  }

  /**
   * Save active filters
   */
  async saveActiveFilters(filters, metadata = {}) {
    try {
      const filterData = {
        filters: exportFilters(filters),
        metadata: {
          timestamp: new Date().toISOString(),
          filterCount: getActiveFiltersCount(filters),
          ...metadata
        }
      };

      await this.storage.setItem(STORAGE_KEYS.ACTIVE_FILTERS, filterData);
      
      // Add to history
      await this.addToHistory(filters, metadata);
      
      return true;
    } catch (error) {
      console.error('Error saving active filters:', error);
      return false;
    }
  }

  /**
   * Load active filters
   */
  async loadActiveFilters() {
    try {
      const data = await this.storage.getItem(STORAGE_KEYS.ACTIVE_FILTERS);
      
      if (!data) {
        return {};
      }

      // Check if filters are expired
      if (this.isExpired(data.metadata?.timestamp)) {
        await this.clearActiveFilters();
        return {};
      }

      return importFilters(data.filters);
    } catch (error) {
      console.error('Error loading active filters:', error);
      return {};
    }
  }

  /**
   * Clear active filters
   */
  async clearActiveFilters() {
    try {
      await this.storage.removeItem(STORAGE_KEYS.ACTIVE_FILTERS);
      return true;
    } catch (error) {
      console.error('Error clearing active filters:', error);
      return false;
    }
  }

  /**
   * Add filters to history
   */
  async addToHistory(filters, metadata = {}) {
    try {
      const history = await this.getHistory();
      
      const historyItem = {
        id: this.generateId(),
        filters: exportFilters(filters),
        metadata: {
          timestamp: new Date().toISOString(),
          filterCount: getActiveFiltersCount(filters),
          ...metadata
        }
      };

      // Add to beginning of history
      history.unshift(historyItem);

      // Limit history size
      if (history.length > this.settings.maxHistorySize) {
        history.splice(this.settings.maxHistorySize);
      }

      await this.storage.setItem(STORAGE_KEYS.FILTER_HISTORY, history);
      return historyItem.id;
    } catch (error) {
      console.error('Error adding to history:', error);
      return null;
    }
  }

  /**
   * Get filter history
   */
  async getHistory() {
    try {
      const history = await this.storage.getItem(STORAGE_KEYS.FILTER_HISTORY) || [];
      
      // Filter out expired items
      const validHistory = history.filter(item => !this.isExpired(item.metadata?.timestamp));
      
      // Update storage if we filtered out items
      if (validHistory.length !== history.length) {
        await this.storage.setItem(STORAGE_KEYS.FILTER_HISTORY, validHistory);
      }

      return validHistory;
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  /**
   * Remove item from history
   */
  async removeFromHistory(itemId) {
    try {
      const history = await this.getHistory();
      const filteredHistory = history.filter(item => item.id !== itemId);
      
      await this.storage.setItem(STORAGE_KEYS.FILTER_HISTORY, filteredHistory);
      return true;
    } catch (error) {
      console.error('Error removing from history:', error);
      return false;
    }
  }

  /**
   * Clear all history
   */
  async clearHistory() {
    try {
      await this.storage.removeItem(STORAGE_KEYS.FILTER_HISTORY);
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  /**
   * Save filter preset
   */
  async savePreset(preset) {
    try {
      const presets = await this.getPresets();
      
      const presetData = {
        id: preset.id || this.generateId(),
        name: preset.name,
        description: preset.description,
        filters: exportFilters(preset.filters),
        metadata: {
          createdAt: preset.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: preset.usageCount || 0,
          isDefault: preset.isDefault || false,
          ...preset.metadata
        }
      };

      // Check if preset already exists
      const existingIndex = presets.findIndex(p => p.id === presetData.id);
      
      if (existingIndex >= 0) {
        presets[existingIndex] = presetData;
      } else {
        presets.push(presetData);
      }

      // Limit presets count
      if (presets.length > this.settings.maxPresets) {
        presets.splice(this.settings.maxPresets);
      }

      await this.storage.setItem(STORAGE_KEYS.SAVED_PRESETS, presets);
      return presetData.id;
    } catch (error) {
      console.error('Error saving preset:', error);
      return null;
    }
  }

  /**
   * Get saved presets
   */
  async getPresets() {
    try {
      const presets = await this.storage.getItem(STORAGE_KEYS.SAVED_PRESETS) || [];
      
      // Include default presets
      const defaultPresets = Object.entries(FILTER_PRESETS).map(([key, preset]) => ({
        id: key,
        name: preset.name,
        description: preset.description,
        filters: exportFilters(preset.filters),
        metadata: {
          isDefault: true,
          createdAt: new Date().toISOString(),
          usageCount: 0
        }
      }));

      return [...defaultPresets, ...presets];
    } catch (error) {
      console.error('Error getting presets:', error);
      return [];
    }
  }

  /**
   * Load preset by ID
   */
  async loadPreset(presetId) {
    try {
      const presets = await this.getPresets();
      const preset = presets.find(p => p.id === presetId);
      
      if (!preset) {
        throw new Error(`Preset with ID ${presetId} not found`);
      }

      // Increment usage count
      if (!preset.metadata.isDefault) {
        preset.metadata.usageCount = (preset.metadata.usageCount || 0) + 1;
        preset.metadata.updatedAt = new Date().toISOString();
        await this.savePreset(preset);
      }

      return importFilters(preset.filters);
    } catch (error) {
      console.error('Error loading preset:', error);
      return null;
    }
  }

  /**
   * Delete preset
   */
  async deletePreset(presetId) {
    try {
      const presets = await this.getPresets();
      const filteredPresets = presets.filter(p => p.id !== presetId);
      
      await this.storage.setItem(STORAGE_KEYS.SAVED_PRESETS, 
        filteredPresets.filter(p => !p.metadata.isDefault)
      );
      return true;
    } catch (error) {
      console.error('Error deleting preset:', error);
      return false;
    }
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences) {
    try {
      const currentPreferences = await this.getPreferences();
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      await this.storage.setItem(STORAGE_KEYS.USER_PREFERENCES, updatedPreferences);
      return updatedPreferences;
    } catch (error) {
      console.error('Error saving preferences:', error);
      return null;
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences() {
    try {
      return await this.storage.getItem(STORAGE_KEYS.USER_PREFERENCES) || {};
    } catch (error) {
      console.error('Error getting preferences:', error);
      return {};
    }
  }

  /**
   * Save analytics data
   */
  async saveAnalytics(analytics) {
    try {
      const currentAnalytics = await this.getAnalytics();
      const updatedAnalytics = {
        ...currentAnalytics,
        ...analytics,
        lastUpdated: new Date().toISOString()
      };
      
      await this.storage.setItem(STORAGE_KEYS.FILTER_ANALYTICS, updatedAnalytics);
      return updatedAnalytics;
    } catch (error) {
      console.error('Error saving analytics:', error);
      return null;
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics() {
    try {
      const analytics = await this.storage.getItem(STORAGE_KEYS.FILTER_ANALYTICS) || {};
      
      // Clean up old analytics data
      if (this.isExpired(analytics.lastUpdated)) {
        await this.storage.removeItem(STORAGE_KEYS.FILTER_ANALYTICS);
        return {};
      }

      return analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {};
    }
  }

  /**
   * Export all data
   */
  async exportAllData() {
    try {
      const data = {
        activeFilters: await this.loadActiveFilters(),
        history: await this.getHistory(),
        presets: await this.getPresets(),
        preferences: await this.getPreferences(),
        analytics: await this.getAnalytics(),
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  /**
   * Import all data
   */
  async importAllData(dataString) {
    try {
      const data = JSON.parse(dataString);
      
      if (!data.version) {
        throw new Error('Invalid data format');
      }

      // Validate and import each section
      if (data.activeFilters) {
        await this.saveActiveFilters(importFilters(data.activeFilters), { imported: true });
      }

      if (data.history) {
        await this.storage.setItem(STORAGE_KEYS.FILTER_HISTORY, data.history);
      }

      if (data.presets) {
        const userPresets = data.presets.filter(p => !p.metadata?.isDefault);
        await this.storage.setItem(STORAGE_KEYS.SAVED_PRESETS, userPresets);
      }

      if (data.preferences) {
        await this.savePreferences(data.preferences);
      }

      if (data.analytics) {
        await this.saveAnalytics(data.analytics);
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  /**
   * Clear all data
   */
  async clearAllData() {
    try {
      await Promise.all([
        this.storage.removeItem(STORAGE_KEYS.ACTIVE_FILTERS),
        this.storage.removeItem(STORAGE_KEYS.FILTER_HISTORY),
        this.storage.removeItem(STORAGE_KEYS.SAVED_PRESETS),
        this.storage.removeItem(STORAGE_KEYS.USER_PREFERENCES),
        this.storage.removeItem(STORAGE_KEYS.FILTER_ANALYTICS)
      ]);

      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }

  /**
   * Check if data is expired
   */
  isExpired(timestamp) {
    if (!timestamp) return true;
    
    const expirationTime = this.settings.retentionDays * 24 * 60 * 60 * 1000;
    const dataAge = Date.now() - new Date(timestamp).getTime();
    
    return dataAge > expirationTime;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

/**
 * Storage Adapters
 */
class LocalStorageAdapter {
  async getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('LocalStorage getItem error:', error);
      return null;
    }
  }

  async setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('LocalStorage setItem error:', error);
      return false;
    }
  }

  async removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('LocalStorage removeItem error:', error);
      return false;
    }
  }
}

class MemoryAdapter {
  constructor() {
    this.data = new Map();
  }

  async getItem(key) {
    return this.data.get(key) || null;
  }

  async setItem(key, value) {
    this.data.set(key, value);
    return true;
  }

  async removeItem(key) {
    this.data.delete(key);
    return true;
  }
}

// Create singleton instance
export const filterPersistence = new FilterPersistenceManager();

// Export utility functions
export function createFilterPersistenceManager(options) {
  return new FilterPersistenceManager(options);
}

// Sync functions for backward compatibility
export async function saveFiltersToStorage(filters, metadata) {
  return await filterPersistence.saveActiveFilters(filters, metadata);
}

export async function loadFiltersFromStorage() {
  return await filterPersistence.loadActiveFilters();
}

export async function saveFilterPreset(preset) {
  return await filterPersistence.savePreset(preset);
}

export async function loadFilterPreset(presetId) {
  return await filterPersistence.loadPreset(presetId);
}

export async function getFilterHistory() {
  return await filterPersistence.getHistory();
}

export async function saveFilterPreferences(preferences) {
  return await filterPersistence.savePreferences(preferences);
}

export async function loadFilterPreferences() {
  return await filterPersistence.getPreferences();
}