/**
 * Mobile Advanced Filter Component
 * Touch-optimized filter interface for mobile devices
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Button, 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent,
  Badge,
  Separator,
  ScrollArea
} from '@/components/ui';
import { 
  Filter, 
  X, 
  RotateCcw, 
  Save, 
  Share2, 
  Zap,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal
} from 'lucide-react';

import {
  selectActiveFilters,
  selectDefaultFilters,
  selectFilterPresets,
  selectSavedPresets,
  selectActiveFiltersCount,
  setActiveFilter,
  updateActiveFilter,
  removeActiveFilter,
  clearActiveFilters,
  resetToDefaults,
  applyPreset,
  toggleMobileFilters,
  saveFilterPreset
} from '@/reduxStore/features/advancedFlightFiltersSlice';

import {
  FILTER_CATEGORIES,
  FILTER_TYPES,
  DEFAULT_FILTER_CONFIGS,
  formatDuration,
  formatPrice
} from '@/lib/filters/advancedFlightFilters';

import { cn } from '@/lib/utils';
import { FilterRange } from './filters/FilterRange';
import { FilterCheckbox } from './filters/FilterCheckbox';
import { FilterToggle } from './filters/FilterToggle';
import { FilterTimeRange } from './filters/FilterTimeRange';
import { FilterPresets } from './filters/FilterPresets';
import { FilterSummary } from './filters/FilterSummary';

export function MobileAdvancedFilter({ 
  className, 
  onApplyFilters, 
  availableFlights = [],
  isOpen,
  onOpenChange 
}) {
  const dispatch = useDispatch();
  
  // Redux state
  const activeFilters = useSelector(selectActiveFilters);
  const defaultFilters = useSelector(selectDefaultFilters);
  const presets = useSelector(selectFilterPresets);
  const savedPresets = useSelector(selectSavedPresets);
  const activeFiltersCount = useSelector(selectActiveFiltersCount);
  
  // Local state
  const [activeTab, setActiveTab] = useState('filters');
  const [currentCategory, setCurrentCategory] = useState(FILTER_CATEGORIES.PRICE);
  const [showQuickFilters, setShowQuickFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter categories grouped for mobile
  const filterGroups = {
    basic: [
      FILTER_CATEGORIES.PRICE,
      FILTER_CATEGORIES.DURATION,
      FILTER_CATEGORIES.STOPS,
      FILTER_CATEGORIES.TIMES
    ],
    advanced: [
      FILTER_CATEGORIES.AIRLINES,
      FILTER_CATEGORIES.AIRPORTS,
      FILTER_CATEGORIES.CLASS,
      FILTER_CATEGORIES.AMENITIES
    ],
    details: [
      FILTER_CATEGORIES.AIRCRAFT,
      FILTER_CATEGORIES.BAGGAGE,
      FILTER_CATEGORIES.LAYOVER,
      FILTER_CATEGORIES.REFUNDABLE,
      FILTER_CATEGORIES.ENVIRONMENTAL
    ]
  };

  // Quick filter presets for mobile
  const quickFilters = [
    {
      id: 'nonstop',
      label: 'Non-stop',
      icon: '✈️',
      filters: { [FILTER_CATEGORIES.STOPS]: [0] }
    },
    {
      id: 'morning',
      label: 'Morning Flights',
      icon: '🌅',
      filters: { 
        [FILTER_CATEGORIES.TIMES]: {
          departure: [{ start: 360, end: 720, label: 'Morning' }]
        }
      }
    },
    {
      id: 'cheapest',
      label: 'Under $500',
      icon: '💰',
      filters: { 
        [FILTER_CATEGORIES.PRICE]: { min: 0, max: 500 }
      }
    },
    {
      id: 'business',
      label: 'Business Class',
      icon: '💼',
      filters: { 
        [FILTER_CATEGORIES.CLASS]: ['business']
      }
    }
  ];

  // Handle filter changes
  const handleFilterChange = (category, value) => {
    dispatch(setActiveFilter({ category, value }));
  };

  const handleFilterUpdate = (category, value) => {
    dispatch(updateActiveFilter({ category, value }));
  };

  // Handle quick filter application
  const handleQuickFilter = (quickFilter) => {
    const { filters } = quickFilter;
    
    for (const [category, value] of Object.entries(filters)) {
      dispatch(setActiveFilter({ category, value }));
    }
  };

  // Apply filters
  const handleApplyFilters = () => {
    if (onApplyFilters) {
      onApplyFilters(activeFilters);
    }
    dispatch(toggleMobileFilters());
  };

  // Reset filters
  const handleResetFilters = () => {
    dispatch(resetToDefaults());
  };

  // Clear all filters
  const handleClearFilters = () => {
    dispatch(clearActiveFilters());
  };

  // Navigate categories
  const navigateCategories = (direction) => {
    const allCategories = Object.values(FILTER_CATEGORIES);
    const currentIndex = allCategories.indexOf(currentCategory);
    
    if (direction === 'next') {
      const nextIndex = (currentIndex + 1) % allCategories.length;
      setCurrentCategory(allCategories[nextIndex]);
    } else {
      const prevIndex = (currentIndex - 1 + allCategories.length) % allCategories.length;
      setCurrentCategory(allCategories[prevIndex]);
    }
  };

  // Render filter component based on type
  const renderFilterComponent = (category, config) => {
    const currentValue = activeFilters[category] || defaultFilters[category];

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
            options={config.options || []}
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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-2xl p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              <SheetTitle className="text-lg font-semibold">Filters</SheetTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange?.(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="quick" className="text-xs">Quick</TabsTrigger>
            <TabsTrigger value="filters" className="text-xs">Filters</TabsTrigger>
            <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
          </TabsList>

          {/* Quick Filters Tab */}
          <TabsContent value="quick" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6">
                {/* Quick Filter Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {quickFilters.map((quickFilter) => (
                    <Button
                      key={quickFilter.id}
                      variant="outline"
                      size="lg"
                      onClick={() => handleQuickFilter(quickFilter)}
                      className="h-20 flex-col gap-2"
                    >
                      <span className="text-2xl">{quickFilter.icon}</span>
                      <span className="text-xs font-medium">{quickFilter.label}</span>
                    </Button>
                  ))}
                </div>

                {/* Filter Summary */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Current Filters</h3>
                  <FilterSummary
                    filters={activeFilters}
                    onRemoveFilter={(category) => dispatch(removeActiveFilter(category))}
                    onClearAll={handleClearFilters}
                    maxVisible={3}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Detailed Filters Tab */}
          <TabsContent value="filters" className="flex-1 mt-0">
            <div className="flex flex-col h-full">
              {/* Category Navigation */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateCategories('prev')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm font-medium">
                  {DEFAULT_FILTER_CONFIGS[currentCategory]?.label || 'Filter'}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateCategories('next')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter Content */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {DEFAULT_FILTER_CONFIGS[currentCategory] && (
                    renderFilterComponent(currentCategory, DEFAULT_FILTER_CONFIGS[currentCategory])
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Presets Tab */}
          <TabsContent value="presets" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                <FilterPresets
                  presets={presets}
                  savedPresets={savedPresets}
                  onApplyPreset={(presetId) => dispatch(applyPreset(presetId))}
                  activeFilters={activeFilters}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="h-12"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            
            <Button
              onClick={handleApplyFilters}
              className="h-12"
              size="lg"
            >
              Apply Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Save current filters
              }}
              className="flex-1"
              disabled={activeFiltersCount === 0}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Share filters
              }}
              className="flex-1"
              disabled={activeFiltersCount === 0}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Mobile Filter Trigger Button
export function MobileFilterTrigger({ 
  activeFiltersCount = 0, 
  onClick,
  className 
}) {
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onClick}
      className={cn(
        "fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg",
        "md:hidden flex items-center justify-center gap-2",
        className
      )}
    >
      <Filter className="h-5 w-5" />
      {activeFiltersCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
        >
          {activeFiltersCount}
        </Badge>
      )}
    </Button>
  );
}

export default MobileAdvancedFilter;