/**
 * Filter Range Component
 * Handles range-based filters (price, duration, etc.)
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDuration, formatPrice } from '@/lib/filters/advancedFlightFilters';

export function FilterRange({ category, config, value, onChange, onUpdate }) {
  const [localValue, setLocalValue] = useState(value || { min: config.min, max: config.max });
  const [isDirty, setIsDirty] = useState(false);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value || { min: config.min, max: config.max });
    setIsDirty(false);
  }, [value, config.min, config.max]);

  // Handle slider change
  const handleSliderChange = useCallback((newValue) => {
    const [min, max] = newValue;
    const updatedValue = { min, max };
    setLocalValue(updatedValue);
    setIsDirty(true);
    
    // Call onChange for real-time updates
    if (onChange) {
      onChange(updatedValue);
    }
  }, [onChange]);

  // Handle manual input change
  const handleInputChange = useCallback((field, inputValue) => {
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      const updatedValue = { ...localValue, [field]: numValue };
      setLocalValue(updatedValue);
      setIsDirty(true);
    }
  }, [localValue]);

  // Apply changes
  const handleApply = useCallback(() => {
    if (onUpdate) {
      onUpdate(localValue);
    }
    setIsDirty(false);
  }, [localValue, onUpdate]);

  // Reset to default
  const handleReset = useCallback(() => {
    const defaultValue = { min: config.min, max: config.max };
    setLocalValue(defaultValue);
    setIsDirty(true);
    
    if (onChange) {
      onChange(defaultValue);
    }
  }, [config.min, config.max, onChange]);

  // Format value for display
  const formatValue = useCallback((val) => {
    if (config.formatter) {
      return config.formatter(val);
    }
    
    if (config.unit === '$') {
      return formatPrice(val);
    }
    
    if (config.unit === 'min') {
      return formatDuration(val);
    }
    
    return `${val}${config.unit ? ' ' + config.unit : ''}`;
  }, [config.formatter, config.unit]);

  // Check if range is active
  const isRangeActive = useCallback(() => {
    return localValue.min > config.min || localValue.max < config.max;
  }, [localValue, config.min, config.max]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.label}</span>
          {isRangeActive() && (
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 px-2 text-xs"
          >
            Reset
          </Button>
          
          {isDirty && (
            <Button
              variant="default"
              size="sm"
              onClick={handleApply}
              className="h-6 px-2 text-xs"
            >
              Apply
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {config.description && (
        <p className="text-xs text-muted-foreground">{config.description}</p>
      )}

      {/* Slider */}
      <div className="space-y-3">
        <Slider
          value={[localValue.min, localValue.max]}
          onValueChange={handleSliderChange}
          min={config.min}
          max={config.max}
          step={config.step}
          className="w-full"
        />
        
        {/* Range Display */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Min:</span>
            <span className="font-medium">{formatValue(localValue.min)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Max:</span>
            <span className="font-medium">{formatValue(localValue.max)}</span>
          </div>
        </div>
      </div>

      {/* Manual Input */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Minimum</label>
          <input
            type="number"
            value={localValue.min}
            onChange={(e) => handleInputChange('min', e.target.value)}
            min={config.min}
            max={localValue.max}
            step={config.step}
            className={cn(
              "w-full p-2 border border-input rounded-md text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            )}
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Maximum</label>
          <input
            type="number"
            value={localValue.max}
            onChange={(e) => handleInputChange('max', e.target.value)}
            min={localValue.min}
            max={config.max}
            step={config.step}
            className={cn(
              "w-full p-2 border border-input rounded-md text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            )}
          />
        </div>
      </div>

      {/* Quick Select Options */}
      {config.quickSelectOptions && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quick Select</p>
          <div className="flex flex-wrap gap-2">
            {config.quickSelectOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  const newValue = { min: option.min, max: option.max };
                  setLocalValue(newValue);
                  setIsDirty(true);
                  
                  if (onChange) {
                    onChange(newValue);
                  }
                }}
                className={cn(
                  "text-xs h-7 px-2",
                  localValue.min === option.min && localValue.max === option.max && 
                  "bg-primary text-primary-foreground"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Range Indicators */}
      {config.showRangeIndicators && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Common Ranges</p>
          <div className="space-y-1">
            {config.rangeIndicators.map((indicator, index) => {
              const isActive = localValue.min <= indicator.max && localValue.max >= indicator.min;
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md text-xs",
                    isActive ? "bg-primary/10 border border-primary/20" : "bg-muted/30"
                  )}
                >
                  <span>{indicator.label}</span>
                  <span className="text-muted-foreground">
                    {formatValue(indicator.min)} - {formatValue(indicator.max)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterRange;