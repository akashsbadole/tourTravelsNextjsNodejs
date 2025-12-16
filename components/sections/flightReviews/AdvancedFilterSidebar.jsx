"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Filter, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTER_PRESETS = {
  business: {
    name: "Business Travelers",
    filters: {
      tripType: "business",
      travelClass: ["business", "first"],
      minRating: 3
    }
  },
  families: {
    name: "Families",
    filters: {
      tripType: "family",
      travelClass: ["economy", "premium_economy"],
      categoryRatingField: "service",
      minCategoryRating: 4
    }
  },
  budget: {
    name: "Budget Conscious",
    filters: {
      travelClass: "economy",
      maxPrice: 500,
      categoryRatingField: "value",
      minCategoryRating: 4
    }
  },
  luxury: {
    name: "Luxury Travel",
    filters: {
      travelClass: ["business", "first"],
      minRating: 4,
      categoryRatingField: "comfort",
      minCategoryRating: 4
    }
  }
};

export function AdvancedFilterSidebar({ onFiltersChange, initialFilters = {} }) {
  const [filters, setFilters] = useState({
    // Basic filters
    airlineId: "",
    departureAirportId: "",
    arrivalAirportId: "",
    flightNumber: "",
    keyword: "",
    
    // Rating filters
    minRating: 1,
    maxRating: 5,
    
    // Category ratings
    categoryRatingField: "",
    minCategoryRating: 1,
    
    // Date range
    dateFrom: "",
    dateTo: "",
    
    // Price range
    minPrice: 0,
    maxPrice: 2000,
    
    // Trip details
    tripType: "",
    travelClass: [],
    
    // Verification
    verified: false,
    bookingConfirmed: false,
    
    // Sentiment
    sentiment: "",
    
    ...initialFilters
  });
  
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    ratings: true,
    trip: true,
    verification: false,
    advanced: false
  });
  
  const [activePreset, setActivePreset] = useState(null);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleTravelClassChange = (value, checked) => {
    const currentClasses = Array.isArray(filters.travelClass) ? filters.travelClass : [];
    const newClasses = checked 
      ? [...currentClasses, value]
      : currentClasses.filter(c => c !== value);
    handleFilterChange('travelClass', newClasses);
  };

  const applyPreset = (presetKey) => {
    const preset = FILTER_PRESETS[presetKey];
    const presetFilters = { ...filters, ...preset.filters };
    setFilters(presetFilters);
    setActivePreset(presetKey);
    onFiltersChange(presetFilters);
  };

  const resetFilters = () => {
    const defaultFilters = {
      airlineId: "",
      departureAirportId: "",
      arrivalAirportId: "",
      flightNumber: "",
      keyword: "",
      minRating: 1,
      maxRating: 5,
      categoryRatingField: "",
      minCategoryRating: 1,
      dateFrom: "",
      dateTo: "",
      minPrice: 0,
      maxPrice: 2000,
      tripType: "",
      travelClass: [],
      verified: false,
      bookingConfirmed: false,
      sentiment: ""
    };
    setFilters(defaultFilters);
    setActivePreset(null);
    onFiltersChange(defaultFilters);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.airlineId) count++;
    if (filters.departureAirportId) count++;
    if (filters.arrivalAirportId) count++;
    if (filters.flightNumber) count++;
    if (filters.keyword) count++;
    if (filters.minRating > 1 || filters.maxRating < 5) count++;
    if (filters.categoryRatingField && filters.minCategoryRating > 1) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.minPrice > 0 || filters.maxPrice < 2000) count++;
    if (filters.tripType) count++;
    if (filters.travelClass.length > 0) count++;
    if (filters.verified) count++;
    if (filters.bookingConfirmed) count++;
    if (filters.sentiment) count++;
    return count;
  };

  return (
    <div className="w-full space-y-4">
      {/* Filter Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FILTER_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                variant={activePreset === key ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(key)}
                className="text-xs"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Badge */}
      {getActiveFilterCount() > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {getActiveFilterCount()} active filters
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs h-6 px-2"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      )}

      {/* Basic Filters */}
      <Card>
        <Collapsible open={expandedSections.basic} onOpenChange={() => toggleSection('basic')}>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Basic Filters</CardTitle>
                {expandedSections.basic ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 px-6 pb-4">
            <div className="space-y-2">
              <Label htmlFor="keyword" className="text-xs font-medium">Search Keywords</Label>
              <Input
                id="keyword"
                placeholder="Search in reviews..."
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                className="text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="airlineId" className="text-xs font-medium">Airline</Label>
              <Select value={filters.airlineId} onValueChange={(value) => handleFilterChange('airlineId', value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select airline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Airlines</SelectItem>
                  {/* Airlines would be populated from API */}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="departureAirportId" className="text-xs font-medium">From</Label>
                <Select value={filters.departureAirportId} onValueChange={(value) => handleFilterChange('departureAirportId', value)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Departure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Airports</SelectItem>
                    {/* Airports would be populated from API */}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="arrivalAirportId" className="text-xs font-medium">To</Label>
                <Select value={filters.arrivalAirportId} onValueChange={(value) => handleFilterChange('arrivalAirportId', value)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Arrival" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Airports</SelectItem>
                    {/* Airports would be populated from API */}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Rating Filters */}
      <Card>
        <Collapsible open={expandedSections.ratings} onOpenChange={() => toggleSection('ratings')}>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Ratings</CardTitle>
                {expandedSections.ratings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 px-6 pb-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Overall Rating: {filters.minRating} - {filters.maxRating}</Label>
              <div className="px-2">
                <Slider
                  value={[filters.minRating, filters.maxRating]}
                  onValueChange={([min, max]) => {
                    handleFilterChange('minRating', min);
                    handleFilterChange('maxRating', max);
                  }}
                  min={1}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium">Category Ratings</Label>
              <Select value={filters.categoryRatingField} onValueChange={(value) => handleFilterChange('categoryRatingField', value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfort">Comfort</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="punctuality">Punctuality</SelectItem>
                  <SelectItem value="cleanliness">Cleanliness</SelectItem>
                  <SelectItem value="amenities">Amenities</SelectItem>
                  <SelectItem value="value">Value</SelectItem>
                </SelectContent>
              </Select>
              
              {filters.categoryRatingField && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Min {filters.categoryRatingField} Rating: {filters.minCategoryRating}</Label>
                  <div className="px-2">
                    <Slider
                      value={[filters.minCategoryRating]}
                      onValueChange={([value]) => handleFilterChange('minCategoryRating', value)}
                      min={1}
                      max={5}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Trip Details */}
      <Card>
        <Collapsible open={expandedSections.trip} onOpenChange={() => toggleSection('trip')}>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Trip Details</CardTitle>
                {expandedSections.trip ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 px-6 pb-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Trip Type</Label>
              <Select value={filters.tripType} onValueChange={(value) => handleFilterChange('tripType', value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select trip type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="leisure">Leisure</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="couple">Couple</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Travel Class</Label>
              <div className="space-y-2">
                {['economy', 'premium_economy', 'business', 'first'].map((travelClass) => (
                  <div key={travelClass} className="flex items-center space-x-2">
                    <Checkbox
                      id={travelClass}
                      checked={filters.travelClass.includes(travelClass)}
                      onCheckedChange={(checked) => handleTravelClassChange(travelClass, checked)}
                    />
                    <Label htmlFor={travelClass} className="text-sm capitalize">
                      {travelClass.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Price Range: ${filters.minPrice} - ${filters.maxPrice}</Label>
              <div className="px-2">
                <Slider
                  value={[filters.minPrice, filters.maxPrice]}
                  onValueChange={([min, max]) => {
                    handleFilterChange('minPrice', min);
                    handleFilterChange('maxPrice', max);
                  }}
                  min={0}
                  max={2000}
                  step={50}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-xs font-medium">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-xs font-medium">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Verification & Advanced */}
      <Card>
        <Collapsible open={expandedSections.verification} onOpenChange={() => toggleSection('verification')}>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Verification & Advanced</CardTitle>
                {expandedSections.verification ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 px-6 pb-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verified"
                  checked={filters.verified}
                  onCheckedChange={(checked) => handleFilterChange('verified', checked)}
                />
                <Label htmlFor="verified" className="text-sm">Verified Reviews Only</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bookingConfirmed"
                  checked={filters.bookingConfirmed}
                  onCheckedChange={(checked) => handleFilterChange('bookingConfirmed', checked)}
                />
                <Label htmlFor="bookingConfirmed" className="text-sm">Booking Confirmed Only</Label>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium">Sentiment</Label>
              <Select value={filters.sentiment} onValueChange={(value) => handleFilterChange('sentiment', value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All sentiments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sentiments</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}