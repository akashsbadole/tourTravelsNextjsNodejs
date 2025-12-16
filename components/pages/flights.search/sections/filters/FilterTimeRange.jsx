/**
 * Filter Time Range Component
 * Handles time-based filters with preset ranges
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/filters/advancedFlightFilters';
import { Clock, Sun, Moon, Coffee } from 'lucide-react';

export function FilterTimeRange({ category, config, value = {}, onChange }) {
  const [selectedRanges, setSelectedRanges] = useState(value);

  // Update local state when prop changes
  useEffect(() => {
    setSelectedRanges(value);
  }, [value]);

  // Time range presets with icons
  const timePresets = [
    {
      id: 'early_morning',
      label: 'Early Morning',
      timeRange: '6AM - 12PM',
      start: 360, // 6:00 AM in minutes
      end: 720,   // 12:00 PM in minutes
      icon: <Sun className="h-4 w-4" />,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    {
      id: 'afternoon',
      label: 'Afternoon',
      timeRange: '12PM - 6PM',
      start: 720,  // 12:00 PM in minutes
      end: 1080,  // 6:00 PM in minutes
      icon: <Coffee className="h-4 w-4" />,
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    {
      id: 'evening',
      label: 'Evening',
      timeRange: '6PM - 12AM',
      start: 1080, // 6:00 PM in minutes
      end: 1440,  // 12:00 AM in minutes
      icon: <Moon className="h-4 w-4" />,
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    },
    {
      id: 'late_night',
      label: 'Late Night',
      timeRange: '12AM - 6AM',
      start: 0,     // 12:00 AM in minutes
      end: 360,    // 6:00 AM in minutes
      icon: <Clock className="h-4 w-4" />,
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  ];

  // Handle time range selection
  const handleRangeToggle = (rangeId) => {
    const range = timePresets.find(r => r.id === rangeId);
    if (!range) return;

    const newSelectedRanges = { ...selectedRanges };
    const field = config.fields?.departure || 'departureTime';

    if (!newSelectedRanges[field]) {
      newSelectedRanges[field] = [];
    }

    const existingIndex = newSelectedRanges[field].findIndex(
      r => r.start === range.start && r.end === range.end
    );

    if (existingIndex >= 0) {
      // Remove range
      newSelectedRanges[field] = newSelectedRanges[field].filter(
        (_, index) => index !== existingIndex
      );
    } else {
      // Add range
      newSelectedRanges[field] = [...newSelectedRanges[field], {
        start: range.start,
        end: range.end,
        label: range.label
      }];
    }

    setSelectedRanges(newSelectedRanges);

    if (onChange) {
      onChange(newSelectedRanges);
    }
  };

  // Check if a range is selected
  const isRangeSelected = (rangeId) => {
    const range = timePresets.find(r => r.id === rangeId);
    if (!range) return false;

    const field = config.fields?.departure || 'departureTime';
    const currentRanges = selectedRanges[field] || [];

    return currentRanges.some(
      r => r.start === range.start && r.end === range.end
    );
  };

  // Clear all time ranges
  const handleClearAll = () => {
    const clearedRanges = {};
    
    if (config.fields) {
      Object.keys(config.fields).forEach(field => {
        clearedRanges[field] = [];
      });
    } else {
      clearedRanges[config.field || 'departureTime'] = [];
    }

    setSelectedRanges(clearedRanges);

    if (onChange) {
      onChange(clearedRanges);
    }
  };

  // Get active ranges count
  const getActiveRangesCount = () => {
    let count = 0;
    
    if (config.fields) {
      Object.values(selectedRanges).forEach(ranges => {
        if (Array.isArray(ranges)) {
          count += ranges.length;
        }
      });
    } else {
      const ranges = selectedRanges[config.field || 'departureTime'] || [];
      count = ranges.length;
    }

    return count;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.label}</span>
          {getActiveRangesCount() > 0 && (
            <Badge variant="secondary" className="text-xs">
              {getActiveRangesCount()}
            </Badge>
          )}
        </div>
        
        {getActiveRangesCount() > 0 && (
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

      {/* Description */}
      {config.description && (
        <p className="text-xs text-muted-foreground">{config.description}</p>
      )}

      {/* Time Field Tabs */}
      {config.fields && Object.keys(config.fields).length > 1 && (
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          {Object.entries(config.fields).map(([key, label]) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 h-7 text-xs capitalize",
                "data-[state=active]:bg-background data-[state=active]:shadow-sm"
              )}
              data-state="active"
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {/* Time Range Presets */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Quick Select</p>
        
        <div className="grid grid-cols-2 gap-2">
          {timePresets.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={() => handleRangeToggle(preset.id)}
              className={cn(
                "h-auto p-3 flex flex-col items-center gap-2",
                "border-2 transition-all",
                isRangeSelected(preset.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "p-2 rounded-full",
                isRangeSelected(preset.id)
                  ? preset.color
                  : "bg-muted"
              )}>
                {preset.icon}
              </div>
              
              <div className="text-center">
                <p className="text-xs font-medium">{preset.label}</p>
                <p className="text-xs text-muted-foreground">{preset.timeRange}</p>
              </div>
              
              {isRangeSelected(preset.id) && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Time Range */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Custom Range</p>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <select className="w-full p-2 border border-input rounded-md text-sm">
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i * 60}>
                  {formatTime(i * 60)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <select className="w-full p-2 border border-input rounded-md text-sm">
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i * 60}>
                  {formatTime(i * 60)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            // Handle custom range addition
          }}
        >
          Add Custom Range
        </Button>
      </div>

      {/* Selected Ranges Display */}
      {getActiveRangesCount() > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Selected Ranges</p>
          
          <div className="space-y-1">
            {timePresets
              .filter(preset => isRangeSelected(preset.id))
              .map((preset) => (
                <div
                  key={preset.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md text-xs",
                    preset.color
                  )}
                >
                  <div className="flex items-center gap-2">
                    {preset.icon}
                    <span>{preset.label}</span>
                    <span className="opacity-75">({preset.timeRange})</span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRangeToggle(preset.id)}
                    className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    ×
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterTimeRange;