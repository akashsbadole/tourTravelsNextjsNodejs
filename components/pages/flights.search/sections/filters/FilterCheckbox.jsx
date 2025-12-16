/**
 * Filter Checkbox Component
 * Handles checkbox-based filters with search and selection features
 */

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';

export function FilterCheckbox({ category, config, value = [], options, onChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [selectedValues, setSelectedValues] = useState(value);

  // Update selected values when prop changes
  useEffect(() => {
    setSelectedValues(value);
  }, [value]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // Determine how many options to show
  const displayOptions = useMemo(() => {
    if (showAll || !config.maxVisible) {
      return filteredOptions;
    }
    return filteredOptions.slice(0, config.maxVisible);
  }, [filteredOptions, showAll, config.maxVisible]);

  // Handle checkbox change
  const handleCheckboxChange = (optionValue, checked) => {
    let newSelectedValues;
    
    if (checked) {
      newSelectedValues = [...selectedValues, optionValue];
    } else {
      newSelectedValues = selectedValues.filter(val => val !== optionValue);
    }
    
    setSelectedValues(newSelectedValues);
    
    if (onChange) {
      onChange(newSelectedValues);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    const allValues = filteredOptions.map(option => option.value);
    setSelectedValues(allValues);
    
    if (onChange) {
      onChange(allValues);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    setSelectedValues([]);
    
    if (onChange) {
      onChange([]);
    }
  };

  // Handle individual option removal
  const handleRemoveOption = (optionValue) => {
    const newSelectedValues = selectedValues.filter(val => val !== optionValue);
    setSelectedValues(newSelectedValues);
    
    if (onChange) {
      onChange(newSelectedValues);
    }
  };

  // Check if option is selected
  const isOptionSelected = (optionValue) => {
    return selectedValues.includes(optionValue);
  };

  // Get selected options for display
  const selectedOptions = useMemo(() => {
    return options.filter(option => selectedValues.includes(option.value));
  }, [options, selectedValues]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.label}</span>
          {selectedValues.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedValues.length}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {selectedValues.length > 0 && (
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
      </div>

      {/* Description */}
      {config.description && (
        <p className="text-xs text-muted-foreground">{config.description}</p>
      )}

      {/* Selected Options Display */}
      {selectedOptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Selected</p>
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((option) => (
              <Badge
                key={option.value}
                variant="default"
                className="text-xs pr-1 gap-1"
              >
                {option.label}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveOption(option.value)}
                  className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      {config.searchable && options.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`Search ${config.label.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      )}

      {/* Quick Actions */}
      {filteredOptions.length > 0 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-6 px-2 text-xs"
          >
            Select All
          </Button>
          
          <span className="text-xs text-muted-foreground">
            {selectedValues.length} of {filteredOptions.length} selected
          </span>
        </div>
      )}

      {/* Options List */}
      <ScrollArea className="h-48">
        <div className="space-y-2">
          {displayOptions.map((option) => (
            <div
              key={option.value}
              className={cn(
                "flex items-start space-x-2 p-2 rounded-md transition-colors",
                "hover:bg-muted/50 cursor-pointer",
                isOptionSelected(option.value) && "bg-primary/5 border border-primary/20"
              )}
              onClick={() => handleCheckboxChange(option.value, !isOptionSelected(option.value))}
            >
              <Checkbox
                id={`${category}-${option.value}`}
                checked={isOptionSelected(option.value)}
                onChange={(checked) => handleCheckboxChange(option.value, checked)}
                className="mt-0.5"
              />
              
              <div className="flex-1 space-y-1">
                <label
                  htmlFor={`${category}-${option.value}`}
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  {option.label}
                </label>
                
                {option.description && (
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                )}
                
                {option.count !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {option.count} flights
                    </span>
                    {option.percentage && (
                      <span className="text-xs text-muted-foreground">
                        ({option.percentage}%)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {option.icon && (
                <div className="flex items-center justify-center w-6 h-6">
                  {option.icon}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Show More/Less */}
      {!showAll && filteredOptions.length > config.maxVisible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full h-8 text-xs"
        >
          <ChevronDown className="h-3 w-3 mr-1" />
          Show {filteredOptions.length - config.maxVisible} more
        </Button>
      )}
      
      {showAll && filteredOptions.length > config.maxVisible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(false)}
          className="w-full h-8 text-xs"
        >
          <ChevronUp className="h-3 w-3 mr-1" />
          Show less
        </Button>
      )}

      {/* No Results */}
      {filteredOptions.length === 0 && searchTerm && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            No options found for "{searchTerm}"
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm('')}
            className="mt-2 h-6 px-2 text-xs"
          >
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
}

export default FilterCheckbox;