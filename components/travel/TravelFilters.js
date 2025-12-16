"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Filter, 
  Search, 
  X, 
  Calendar,
  MapPin,
  DollarSign,
  Users
} from "lucide-react";

export function TravelFilters({ filters, onFiltersChange, onClearFilters }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = [
    { value: "flight", label: "Flight" },
    { value: "hotel", label: "Hotel" },
    { value: "package", label: "Package" },
    { value: "custom", label: "Custom" }
  ];

  const statuses = [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "assigned", label: "Assigned" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" }
  ];

  const priorities = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" }
  ];

  const updateFilter = (key, value) => {
    onFiltersChange(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    onClearFilters();
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== "" && value !== null && value !== undefined
  );

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => 
      value !== "" && value !== null && value !== undefined
    ).length;
  };

  return (
    <Card className="w-full">
      <CardHeader 
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <X className="w-4 h-4" />
            ) : (
              <Filter className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search requirements..."
                value={filters.search || ""}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={filters.category || ""} onValueChange={(value) => updateFilter("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status || ""} onValueChange={(value) => updateFilter("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={filters.priority || ""} onValueChange={(value) => updateFilter("priority", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Priority</SelectItem>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter destination..."
                  value={filters.destination || ""}
                  onChange={(e) => updateFilter("destination", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Budget Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Minimum Budget</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Min budget"
                  value={filters.minBudget || ""}
                  onChange={(e) => updateFilter("minBudget", e.target.value ? parseFloat(e.target.value) : "")}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Maximum Budget</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Max budget"
                  value={filters.maxBudget || ""}
                  onChange={(e) => updateFilter("maxBudget", e.target.value ? parseFloat(e.target.value) : "")}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Departure From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={filters.departureDateFrom || ""}
                  onChange={(e) => updateFilter("departureDateFrom", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Departure To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={filters.departureDateTo || ""}
                  onChange={(e) => updateFilter("departureDateTo", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                checked={filters.isPublic || false}
                onCheckedChange={(checked) => updateFilter("isPublic", checked)}
              />
              <label htmlFor="isPublic" className="text-sm font-medium">
                Public requirements only
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="flexibleDates"
                checked={filters.flexibleDates || false}
                onCheckedChange={(checked) => updateFilter("flexibleDates", checked)}
              />
              <label htmlFor="flexibleDates" className="text-sm font-medium">
                Flexible dates only
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} applied
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearAllFilters}>
                Clear All
              </Button>
              <Button onClick={() => setIsExpanded(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}