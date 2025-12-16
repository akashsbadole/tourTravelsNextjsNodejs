"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, Filter, X, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function RoomFilters({ 
  filters, 
  onFiltersChange, 
  onReset,
  availableFilters = {},
  className = ""
}) {
  const [isExpanded, setIsExpanded] = useState({});
  const [localFilters, setLocalFilters] = useState(filters || {});
  const [filterOptions, setFilterOptions] = useState({});

  useEffect(() => {
    setLocalFilters(filters || {});
  }, [filters]);

  useEffect(() => {
    if (Object.keys(availableFilters).length > 0) {
      setFilterOptions(availableFilters);
    }
  }, [availableFilters]);

  const handleFilterChange = (category, value) => {
    const newFilters = { ...localFilters };
    
    if (category === 'priceRange') {
      newFilters[category] = value;
    } else if (category === 'sizeRange') {
      newFilters[category] = value;
    } else if (category === 'rating') {
      newFilters[category] = value;
    } else if (Array.isArray(value)) {
      if (!newFilters[category]) newFilters[category] = [];
      const index = newFilters[category].indexOf(value[0]);
      if (index > -1) {
        newFilters[category].splice(index, 1);
      } else {
        newFilters[category].push(value[0]);
      }
    } else {
      newFilters[category] = value;
    }
    
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleReset = () => {
    setLocalFilters({});
    onReset?.();
  };

  const toggleExpanded = (category) => {
    setIsExpanded(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    Object.entries(localFilters).forEach(([key, value]) => {
      if (key === 'priceRange' && (value[0] > 0 || value[1] < 1000)) count++;
      else if (key === 'sizeRange' && (value[0] > 0 || value[1] < 100)) count++;
      else if (key === 'rating' && value > 0) count++;
      else if (Array.isArray(value) && value.length > 0) count++;
      else if (value && value !== '') count++;
    });
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-semibold">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <Accordion type="multiple" className="w-full">
        {/* Price Range */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-left">
            <div className="flex items-center justify-between w-full">
              <span>Price Range</span>
              {localFilters.priceRange && (
                <Badge variant="outline" className="text-xs">
                  {formatCurrency(localFilters.priceRange[0])} - {formatCurrency(localFilters.priceRange[1])}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium">Price per night</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{formatCurrency(localFilters.priceRange?.[0] || filterOptions.priceRange?.minPrice || 0)}</span>
                    <span>{formatCurrency(localFilters.priceRange?.[1] || filterOptions.priceRange?.maxPrice || 1000)}</span>
                  </div>
                  <Slider
                    value={localFilters.priceRange || [filterOptions.priceRange?.minPrice || 0, filterOptions.priceRange?.maxPrice || 1000]}
                    onValueChange={(value) => handleFilterChange('priceRange', value)}
                    max={filterOptions.priceRange?.maxPrice || 1000}
                    min={filterOptions.priceRange?.minPrice || 0}
                    step={10}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Room Type */}
        <AccordionItem value="roomType">
          <AccordionTrigger className="text-left">
            <div className="flex items-center justify-between w-full">
              <span>Room Type</span>
              {localFilters.roomTypes?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {localFilters.roomTypes.length} selected
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-4">
              {filterOptions.roomTypes?.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`room-type-${type}`}
                    checked={localFilters.roomTypes?.includes(type)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleFilterChange('roomTypes', [type]);
                      } else {
                        const newTypes = localFilters.roomTypes?.filter(t => t !== type) || [];
                        handleFilterChange('roomTypes', newTypes);
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`room-type-${type}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Category */}
        <AccordionItem value="category">
          <AccordionTrigger className="text-left">
            <div className="flex items-center justify-between w-full">
              <span>Category</span>
              {localFilters.categories?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {localFilters.categories.length} selected
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-4">
              {filterOptions.categories?.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={localFilters.categories?.includes(category)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleFilterChange('categories', [category]);
                      } else {
                        const newCategories = localFilters.categories?.filter(c => c !== category) || [];
                        handleFilterChange('categories', newCategories);
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`category-${category}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Amenities */}
        <AccordionItem value="amenities">
          <AccordionTrigger className="text-left">
            <div className="flex items-center justify-between w-full">
              <span>Amenities</span>
              {localFilters.amenities?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {localFilters.amenities.length} selected
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-4">
              {filterOptions.amenities?.slice(0, 10).map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity}`}
                    checked={localFilters.amenities?.includes(amenity)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleFilterChange('amenities', [amenity]);
                      } else {
                        const newAmenities = localFilters.amenities?.filter(a => a !== amenity) || [];
                        handleFilterChange('amenities', newAmenities);
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`amenity-${amenity}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
                  </Label>
                </div>
              ))}
              {filterOptions.amenities?.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  Showing first 10 of {filterOptions.amenities.length} amenities
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Size */}
        <AccordionItem value="size">
          <AccordionTrigger className="text-left">
            <div className="flex items-center justify-between w-full">
              <span>Room Size</span>
              {localFilters.sizeRange && (
                <Badge variant="outline" className="text-xs">
                  {localFilters.sizeRange[0]}m² - {localFilters.sizeRange[1]}m²
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium">Size in square meters</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{localFilters.sizeRange?.[0] || filterOptions.sizeRange?.minSize || 10}m²</span>
                    <span>{localFilters.sizeRange?.[1] || filterOptions.sizeRange?.maxSize || 100}m²</span>
                  </div>
                  <Slider
                    value={localFilters.sizeRange || [filterOptions.sizeRange?.minSize || 10, filterOptions.sizeRange?.maxSize || 100]}
                    onValueChange={(value) => handleFilterChange('sizeRange', value)}
                    max={filterOptions.sizeRange?.maxSize || 100}
                    min={filterOptions.sizeRange?.minSize || 10}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Rating */}
        <AccordionItem value="rating">
          <AccordionTrigger className="text-left">
            <div className="flex items-center justify-between w-full">
              <span>Minimum Rating</span>
              {localFilters.rating && (
                <Badge variant="outline" className="text-xs">
                  {localFilters.rating}+ stars
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium">Minimum guest rating</Label>
                <div className="mt-2">
                  <Slider
                    value={[localFilters.rating || 0]}
                    onValueChange={(value) => handleFilterChange('rating', value[0])}
                    max={5}
                    min={0}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Any</span>
                    <span>5 stars</span>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Accessibility */}
        <AccordionItem value="accessibility">
          <AccordionTrigger className="text-left">
            <div className="flex items-center justify-between w-full">
              <span>Accessibility</span>
              {localFilters.accessibility?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {localFilters.accessibility.length} selected
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-4">
              {filterOptions.accessibility?.map((feature) => (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    id={`accessibility-${feature}`}
                    checked={localFilters.accessibility?.includes(feature)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleFilterChange('accessibility', [feature]);
                      } else {
                        const newAccessibility = localFilters.accessibility?.filter(a => a !== feature) || [];
                        handleFilterChange('accessibility', newAccessibility);
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`accessibility-${feature}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {feature.replace('_', ' ').charAt(0).toUpperCase() + feature.replace('_', ' ').slice(1)}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Quick Filter Tags */}
      <div className="mt-4">
        <Label className="text-sm font-medium mb-2 block">Quick Filters</Label>
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={localFilters.categories?.includes('budget') ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => {
              const newCategories = localFilters.categories?.includes('budget') 
                ? localFilters.categories.filter(c => c !== 'budget')
                : [...(localFilters.categories || []), 'budget'];
              handleFilterChange('categories', newCategories);
            }}
          >
            Budget Friendly
          </Badge>
          
          <Badge 
            variant={localFilters.categories?.includes('luxury') ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => {
              const newCategories = localFilters.categories?.includes('luxury') 
                ? localFilters.categories.filter(c => c !== 'luxury')
                : [...(localFilters.categories || []), 'luxury'];
              handleFilterChange('categories', newCategories);
            }}
          >
            Luxury
          </Badge>
          
          <Badge 
            variant={localFilters.amenities?.includes('free wifi') ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => {
              const newAmenities = localFilters.amenities?.includes('free wifi') 
                ? localFilters.amenities.filter(a => a !== 'free wifi')
                : [...(localFilters.amenities || []), 'free wifi'];
              handleFilterChange('amenities', newAmenities);
            }}
          >
            Free WiFi
          </Badge>
          
          <Badge 
            variant={localFilters.amenities?.includes('parking') ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => {
              const newAmenities = localFilters.amenities?.includes('parking') 
                ? localFilters.amenities.filter(a => a !== 'parking')
                : [...(localFilters.amenities || []), 'parking'];
              handleFilterChange('amenities', newAmenities);
            }}
          >
            Parking
          </Badge>
          
          <Badge 
            variant={localFilters.amenities?.includes('breakfast included') ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => {
              const newAmenities = localFilters.amenities?.includes('breakfast included') 
                ? localFilters.amenities.filter(a => a !== 'breakfast included')
                : [...(localFilters.amenities || []), 'breakfast included'];
              handleFilterChange('amenities', newAmenities);
            }}
          >
            Breakfast
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default RoomFilters;