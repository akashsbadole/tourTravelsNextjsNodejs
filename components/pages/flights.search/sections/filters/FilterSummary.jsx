/**
 * Filter Summary Component
 * Displays active filters and provides quick removal options
 */

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  X, 
  DollarSign, 
  Clock, 
  Route, 
  Plane, 
  MapPin, 
  Calendar,
  Star,
  Luggage,
  Shield,
  Leaf
} from 'lucide-react';

import {
  FILTER_CATEGORIES,
  formatDuration,
  formatPrice,
  formatTime
} from '@/lib/filters/advancedFlightFilters';

// Icon mapping for filter categories
const filterIcons = {
  [FILTER_CATEGORIES.PRICE]: <DollarSign className="h-3 w-3" />,
  [FILTER_CATEGORIES.DURATION]: <Clock className="h-3 w-3" />,
  [FILTER_CATEGORIES.STOPS]: <Route className="h-3 w-3" />,
  [FILTER_CATEGORIES.AIRLINES]: <Plane className="h-3 w-3" />,
  [FILTER_CATEGORIES.AIRPORTS]: <MapPin className="h-3 w-3" />,
  [FILTER_CATEGORIES.TIMES]: <Calendar className="h-3 w-3" />,
  [FILTER_CATEGORIES.CLASS]: <Star className="h-3 w-3" />,
  [FILTER_CATEGORIES.AMENITIES]: <Star className="h-3 w-3" />,
  [FILTER_CATEGORIES.BAGGAGE]: <Luggage className="h-3 w-3" />,
  [FILTER_CATEGORIES.REFUNDABLE]: <Shield className="h-3 w-3" />,
  [FILTER_CATEGORIES.ENVIRONMENTAL]: <Leaf className="h-3 w-3" />
};

// Category labels
const filterLabels = {
  [FILTER_CATEGORIES.PRICE]: 'Price',
  [FILTER_CATEGORIES.DURATION]: 'Duration',
  [FILTER_CATEGORIES.STOPS]: 'Stops',
  [FILTER_CATEGORIES.AIRLINES]: 'Airlines',
  [FILTER_CATEGORIES.AIRPORTS]: 'Airports',
  [FILTER_CATEGORIES.TIMES]: 'Times',
  [FILTER_CATEGORIES.CLASS]: 'Class',
  [FILTER_CATEGORIES.AMENITIES]: 'Amenities',
  [FILTER_CATEGORIES.BAGGAGE]: 'Baggage',
  [FILTER_CATEGORIES.REFUNDABLE]: 'Refundable',
  [FILTER_CATEGORIES.ENVIRONMENTAL]: 'Environmental'
};

export function FilterSummary({ 
  filters = {}, 
  onRemoveFilter, 
  onClearAll,
  maxVisible = 5,
  className 
}) {
  // Get active filter entries
  const activeFilters = React.useMemo(() => {
    const entries = [];
    
    for (const [category, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;
      
      if (Array.isArray(value) && value.length === 0) continue;
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
      if (typeof value === 'boolean' && !value) continue;
      
      entries.push({ category, value });
    }
    
    return entries;
  }, [filters]);

  // Format filter value for display
  const formatFilterValue = (category, value) => {
    switch (category) {
      case FILTER_CATEGORIES.PRICE:
        if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
          return `${formatPrice(value.min)} - ${formatPrice(value.max)}`;
        }
        return formatPrice(value);
        
      case FILTER_CATEGORIES.DURATION:
        if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
          return `${formatDuration(value.min)} - ${formatDuration(value.max)}`;
        }
        return formatDuration(value);
        
      case FILTER_CATEGORIES.STOPS:
        if (Array.isArray(value)) {
          return value.map(stop => stop === 0 ? 'Non-stop' : `${stop} stop${stop > 1 ? 's' : ''}`).join(', ');
        }
        return value === 0 ? 'Non-stop' : `${value} stop${value > 1 ? 's' : ''}`;
        
      case FILTER_CATEGORIES.AIRLINES:
      case FILTER_CATEGORIES.AIRPORTS:
      case FILTER_CATEGORIES.CLASS:
      case FILTER_CATEGORIES.AMENITIES:
        if (Array.isArray(value)) {
          return value.length > 2 ? `${value.length} selected` : value.join(', ');
        }
        return value;
        
      case FILTER_CATEGORIES.TIMES:
        if (typeof value === 'object') {
          const ranges = [];
          for (const [field, fieldValues] of Object.entries(value)) {
            if (Array.isArray(fieldValues)) {
              ranges.push(...fieldValues.map(range => range.label || `${formatTime(range.start)} - ${formatTime(range.end)}`));
            }
          }
          return ranges.length > 2 ? `${ranges.length} ranges` : ranges.join(', ');
        }
        return value;
        
      case FILTER_CATEGORIES.BAGGAGE:
        if (typeof value === 'object') {
          const parts = [];
          if (value.cabin) parts.push(`Cabin: ${value.cabin}kg`);
          if (value.checked) parts.push(`Checked: ${value.checked}kg`);
          return parts.join(', ');
        }
        return value;
        
      case FILTER_CATEGORIES.REFUNDABLE:
        return value ? 'Refundable only' : '';
        
      case FILTER_CATEGORIES.ENVIRONMENTAL:
        if (typeof value === 'object' && value.max !== undefined) {
          return `Max ${value.max}kg CO₂`;
        }
        return value;
        
      default:
        return Array.isArray(value) ? value.join(', ') : String(value);
    }
  };

  // Handle filter removal
  const handleRemoveFilter = (category) => {
    if (onRemoveFilter) {
      onRemoveFilter(category);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  if (activeFilters.length === 0) {
    return (
      <div className={cn("text-center py-3", className)}>
        <p className="text-sm text-muted-foreground">No active filters</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add filters to narrow down your search results
        </p>
      </div>
    );
  }

  const visibleFilters = activeFilters.slice(0, maxVisible);
  const hiddenFilters = activeFilters.slice(maxVisible);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Active Filters */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Active Filters ({activeFilters.length})</h4>
        
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-6 px-2 text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Pills */}
      <ScrollArea className="h-16">
        <div className="flex flex-wrap gap-2">
          {visibleFilters.map(({ category, value }) => (
            <Badge
              key={category}
              variant="secondary"
              className="pr-1 gap-1 text-xs"
            >
              <div className="flex items-center gap-1">
                {filterIcons[category]}
                <span className="font-medium">{filterLabels[category]}:</span>
                <span>{formatFilterValue(category, value)}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFilter(category)}
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
          
          {/* Hidden filters indicator */}
          {hiddenFilters.length > 0 && (
            <Badge variant="outline" className="text-xs">
              +{hiddenFilters.length} more
            </Badge>
          )}
        </div>
      </ScrollArea>

      {/* Filter Summary Stats */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-muted/30 rounded p-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span className="font-medium">Price Range</span>
          </div>
          {filters[FILTER_CATEGORIES.PRICE] && (
            <p className="text-muted-foreground mt-1">
              {formatFilterValue(FILTER_CATEGORIES.PRICE, filters[FILTER_CATEGORIES.PRICE])}
            </p>
          )}
        </div>
        
        <div className="bg-muted/30 rounded p-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span className="font-medium">Duration</span>
          </div>
          {filters[FILTER_CATEGORIES.DURATION] && (
            <p className="text-muted-foreground mt-1">
              {formatFilterValue(FILTER_CATEGORIES.DURATION, filters[FILTER_CATEGORIES.DURATION])}
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={() => {
            // Save current filters as preset
          }}
        >
          Save as Preset
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={() => {
            // Share filters
          }}
        >
          Share
        </Button>
      </div>
    </div>
  );
}

export default FilterSummary;