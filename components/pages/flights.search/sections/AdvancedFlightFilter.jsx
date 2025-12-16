/**
 * Advanced Flight Filter Component
 * Comprehensive filter sidebar with enhanced UI and smart features
 */

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Slider, 
  Checkbox, 
  Button, 
  Collapsible, 
  Separator,
  Badge,
  Alert,
  AlertDescription,
  Tooltip,
  Toggle
} from '@/components/ui';
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Save, 
  Share2, 
  Zap,
  AlertTriangle,
  Star,
  Settings,
  History,
  Sparkles
} from 'lucide-react';

import {
  selectActiveFilters,
  selectDefaultFilters,
  selectAvailableOptions,
  selectFilterPresets,
  selectSavedPresets,
  selectFilterUI,
  selectFilterConflicts,
  selectFilterRecommendations,
  selectActiveFiltersCount,
  setActiveFilter,
  updateActiveFilter,
  removeActiveFilter,
  clearActiveFilters,
  resetToDefaults,
  applyPreset,
  toggleSidebar,
  setSidebarOpen,
  setActiveCategory,
  toggleAdvancedMode,
  setAutoApply,
  applyOptimizations,
  dismissConflict,
  dismissRecommendation,
  recordFilterInteraction,
  saveFilterPreset
} from '@/reduxStore/features/advancedFlightFiltersSlice';

import {
  FILTER_CATEGORIES,
  FILTER_TYPES,
  DEFAULT_FILTER_CONFIGS,
  FILTER_PRESETS,
  formatDuration,
  formatPrice,
  formatTime,
  isFilterActive,
  validateFilterValue
} from '@/lib/filters/advancedFlightFilters';

import { cn } from '@/lib/utils';
import { FilterRange } from './filters/FilterRange';
import { FilterCheckbox } from './filters/FilterCheckbox';
import { FilterToggle } from './filters/FilterToggle';
import { FilterTimeRange } from './filters/FilterTimeRange';
import { FilterPresets } from './filters/FilterPresets';
import { FilterSummary } from './filters/FilterSummary';
import { FilterRecommendations } from './filters/FilterRecommendations';

export function AdvancedFlightFilter({ className, onApplyFilters, availableFlights = [] }) {
  const dispatch = useDispatch();
  
  // Redux state
  const activeFilters = useSelector(selectActiveFilters);
  const defaultFilters = useSelector(selectDefaultFilters);
  const availableOptions = useSelector(selectAvailableOptions);
  const presets = useSelector(selectFilterPresets);
  const savedPresets = useSelector(selectSavedPresets);
  const ui = useSelector(selectFilterUI);
  const conflicts = useSelector(selectFilterConflicts);
  const recommendations = useSelector(selectFilterRecommendations);
  const activeFiltersCount = useSelector(selectActiveFiltersCount);
  
  // Local state
  const [expandedCategories, setExpandedCategories] = useState(new Set([FILTER_CATEGORIES.PRICE]));
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [tempFilterName, setTempFilterName] = useState('');
  const [tempFilterDescription, setTempFilterDescription] = useState('');
  
  // Filter categories in order
  const filterCategories = useMemo(() => [
    FILTER_CATEGORIES.PRICE,
    FILTER_CATEGORIES.DURATION,
    FILTER_CATEGORIES.STOPS,
    FILTER_CATEGORIES.AIRLINES,
    FILTER_CATEGORIES.AIRPORTS,
    FILTER_CATEGORIES.TIMES,
    FILTER_CATEGORIES.CLASS,
    FILTER_CATEGORIES.AMENITIES,
    FILTER_CATEGORIES.AIRCRAFT,
    FILTER_CATEGORIES.BAGGAGE,
    FILTER_CATEGORIES.LAYOVER,
    FILTER_CATEGORIES.REFUNDABLE,
    FILTER_CATEGORIES.ENVIRONMENTAL
  ], []);

  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Handle filter changes
  const handleFilterChange = (category, value) => {
    dispatch(setActiveFilter({ category, value }));
    dispatch(recordFilterInteraction({ category, action: 'change' }));
  };

  const handleFilterUpdate = (category, value) => {
    dispatch(updateActiveFilter({ category, value }));
    dispatch(recordFilterInteraction({ category, action: 'update' }));
  };

  const handleFilterRemove = (category) => {
    dispatch(removeActiveFilter(category));
    dispatch(recordFilterInteraction({ category, action: 'remove' }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    if (onApplyFilters) {
      onApplyFilters(activeFilters);
    }
    dispatch(recordFilterInteraction({ category: 'all', action: 'apply' }));
  };

  // Reset filters
  const handleResetFilters = () => {
    dispatch(resetToDefaults());
    dispatch(recordFilterInteraction({ category: 'all', action: 'reset' }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    dispatch(clearActiveFilters());
    dispatch(recordFilterInteraction({ category: 'all', action: 'clear' }));
  };

  // Apply preset
  const handleApplyPreset = (presetId) => {
    dispatch(applyPreset(presetId));
    dispatch(recordFilterInteraction({ category: 'preset', action: 'apply', value: presetId }));
  };

  // Save current filters as preset
  const handleSavePreset = () => {
    if (tempFilterName.trim()) {
      dispatch(saveFilterPreset({
        name: tempFilterName,
        description: tempFilterDescription,
        filters: activeFilters
      }));
      setShowSaveDialog(false);
      setTempFilterName('');
      setTempFilterDescription('');
    }
  };

  // Apply optimizations
  const handleApplyOptimizations = () => {
    dispatch(applyOptimizations());
    dispatch(recordFilterInteraction({ category: 'optimizations', action: 'apply' }));
  };

  // Render filter component based on type
  const renderFilterComponent = (category, config) => {
    const currentValue = activeFilters[category] || defaultFilters[category];
    const availableOpts = availableOptions[category] || config.options || [];

    switch (config.type) {
      case FILTER_TYPES.RANGE:
      case FILTER_TYPES.SLIDER:
        return (
          <FilterRange
            category={category}
            config={config}
            value={currentValue}
            onChange={(value) => handleFilterChange(category, value)}
            onUpdate={(value) => handleFilterUpdate(category, value)}
          />
        );

      case FILTER_TYPES.CHECKBOX:
        return (
          <FilterCheckbox
            category={category}
            config={config}
            value={currentValue}
            options={availableOpts}
            onChange={(value) => handleFilterChange(category, value)}
          />
        );

      case FILTER_TYPES.TOGGLE:
        return (
          <FilterToggle
            category={category}
            config={config}
            value={currentValue}
            onChange={(value) => handleFilterChange(category, value)}
          />
        );

      case FILTER_TYPES.TIME_RANGE:
        return (
          <FilterTimeRange
            category={category}
            config={config}
            value={currentValue}
            onChange={(value) => handleFilterChange(category, value)}
          />
        );

      default:
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Filter type {config.type} not implemented
          </div>
        );
    }
  };

  return (
    <motion.div
      className={cn(
        "w-full h-full bg-background border-r border-border flex flex-col",
        className
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Filters</h2>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Tooltip content="Advanced Mode">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch(toggleAdvancedMode())}
                className={cn(
                  "h-8 w-8 p-0",
                  ui.showAdvanced && "bg-primary text-primary-foreground"
                )}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Tooltip>
            
            <Tooltip content="Toggle Sidebar">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch(toggleSidebar())}
                className="h-8 w-8 p-0 lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Filter Summary */}
        <FilterSummary
          filters={activeFilters}
          onRemoveFilter={handleFilterRemove}
          onClearAll={handleClearFilters}
        />

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            disabled={activeFiltersCount === 0}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareDialog(true)}
            disabled={activeFiltersCount === 0}
            className="flex-1"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </div>

      {/* Conflicts and Recommendations */}
      <AnimatePresence>
        {(conflicts.length > 0 || recommendations.length > 0) && (
          <motion.div
            className="p-4 border-b border-border"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {conflicts.length > 0 && (
              <Alert className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Filter Conflicts Detected</p>
                    {conflicts.map((conflict, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{conflict.message}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dispatch(dismissConflict(index))}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {recommendations.length > 0 && (
              <FilterRecommendations
                recommendations={recommendations}
                onApply={(recommendation) => {
                  // Apply recommendation logic
                  dispatch(dismissRecommendation(0));
                }}
                onDismiss={(index) => dispatch(dismissRecommendation(index))}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Presets */}
      <div className="p-4 border-b border-border">
        <FilterPresets
          presets={presets}
          savedPresets={savedPresets}
          onApplyPreset={handleApplyPreset}
          activeFilters={activeFilters}
        />
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {filterCategories.map((category) => {
            const config = DEFAULT_FILTER_CONFIGS[category];
            if (!config) return null;

            const isExpanded = expandedCategories.has(category);
            const hasActiveFilter = isFilterActive(activeFilters, category);

            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{config.label}</span>
                      {hasActiveFilter && (
                        <Badge variant="secondary" className="text-xs h-5">
                          Active
                        </Badge>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-2">
                  <div className="pl-3 pr-1">
                    {renderFilterComponent(category, config)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={handleApplyFilters}
          className="w-full"
          size="lg"
        >
          Apply Filters
        </Button>
        
        {availableFlights.length === 0 && (
          <div className="mt-3">
            <Button
              variant="outline"
              onClick={handleApplyOptimizations}
              className="w-full"
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Optimize Filters
            </Button>
          </div>
        )}
      </div>

      {/* Save Preset Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              className="bg-background rounded-lg p-6 w-full max-w-md"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Save Filter Preset</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <input
                    type="text"
                    value={tempFilterName}
                    onChange={(e) => setTempFilterName(e.target.value)}
                    className="w-full p-2 border border-input rounded-md"
                    placeholder="Enter preset name"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <textarea
                    value={tempFilterDescription}
                    onChange={(e) => setTempFilterDescription(e.target.value)}
                    className="w-full p-2 border border-input rounded-md"
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePreset}
                  disabled={!tempFilterName.trim()}
                  className="flex-1"
                >
                  Save
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default AdvancedFlightFilter;