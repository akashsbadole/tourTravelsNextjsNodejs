/**
 * Filter Toggle Component
 * Handles boolean toggle filters
 */

"use client";

import React from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function FilterToggle({ category, config, value = false, onChange }) {
  const handleToggleChange = (pressed) => {
    if (onChange) {
      onChange(pressed);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.label}</span>
          {value && (
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          )}
        </div>
      </div>

      {/* Description */}
      {config.description && (
        <p className="text-xs text-muted-foreground">{config.description}</p>
      )}

      {/* Toggle */}
      <Toggle
        pressed={value}
        onPressedChange={handleToggleChange}
        className={cn(
          "w-full justify-start h-auto p-3",
          value && "bg-primary text-primary-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          {config.icon && (
            <div className="flex items-center justify-center">
              {config.icon}
            </div>
          )}
          
          <div className="text-left">
            <span className="text-sm font-medium">{config.label}</span>
            {config.subtitle && (
              <p className="text-xs opacity-70">{config.subtitle}</p>
            )}
          </div>
        </div>
      </Toggle>

      {/* Additional Info */}
      {config.additionalInfo && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          {config.additionalInfo}
        </div>
      )}
    </div>
  );
}

export default FilterToggle;