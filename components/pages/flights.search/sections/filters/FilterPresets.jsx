/**
 * Filter Presets Component
 * Displays and manages filter presets
 */

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Star, 
  DollarSign, 
  Zap, 
  Crown, 
  Leaf, 
  Briefcase,
  Clock,
  TrendingUp,
  Heart,
  Plus
} from 'lucide-react';

// Icon mapping for presets
const presetIcons = {
  cheapest: <DollarSign className="h-4 w-4" />,
  quickest: <Zap className="h-4 w-4" />,
  best_value: <Star className="h-4 w-4" />,
  comfort: <Crown className="h-4 w-4" />,
  eco_friendly: <Leaf className="h-4 w-4" />,
  business: <Briefcase className="h-4 w-4" />
};

export function FilterPresets({ 
  presets, 
  savedPresets, 
  onApplyPreset, 
  activeFilters,
  className 
}) {
  const [activeTab, setActiveTab] = useState('recommended');
  const [hoveredPreset, setHoveredPreset] = useState(null);

  // Check if preset is currently active
  const isPresetActive = (preset) => {
    if (!preset.filters) return false;
    
    // Simple comparison - in real app, this would be more sophisticated
    return JSON.stringify(preset.filters) === JSON.stringify(activeFilters);
  };

  // Get preset compatibility with current filters
  const getPresetCompatibility = (preset) => {
    if (!preset.filters || !activeFilters) return 0;
    
    let matchingFilters = 0;
    let totalFilters = Object.keys(preset.filters).length;
    
    for (const [key, value] of Object.entries(preset.filters)) {
      if (activeFilters[key] && JSON.stringify(activeFilters[key]) === JSON.stringify(value)) {
        matchingFilters++;
      }
    }
    
    return totalFilters > 0 ? (matchingFilters / totalFilters) * 100 : 0;
  };

  // Handle preset application
  const handleApplyPreset = (presetId) => {
    if (onApplyPreset) {
      onApplyPreset(presetId);
    }
  };

  // Render preset card
  const renderPresetCard = (preset, isSaved = false) => {
    const isActive = isPresetActive(preset);
    const compatibility = getPresetCompatibility(preset);
    const isHovered = hoveredPreset === preset.id;

    return (
      <div
        key={preset.id}
        className={cn(
          "relative p-3 border rounded-lg transition-all cursor-pointer",
          "hover:shadow-md hover:border-primary/50",
          isActive && "border-primary bg-primary/5",
          isHovered && "scale-[1.02]"
        )}
        onMouseEnter={() => setHoveredPreset(preset.id)}
        onMouseLeave={() => setHoveredPreset(null)}
        onClick={() => handleApplyPreset(preset.id)}
      >
        {/* Active indicator */}
        {isActive && (
          <div className="absolute top-2 right-2">
            <Badge variant="default" className="text-xs">
              Active
            </Badge>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            isActive ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {presetIcons[preset.id] || presetIcons.cheapest}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{preset.name}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {preset.description}
            </p>
          </div>
        </div>

        {/* Filter count */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {Object.keys(preset.filters || {}).length} filters
            </span>
            
            {preset.usageCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                • {preset.usageCount} uses
              </span>
            )}
          </div>

          {/* Compatibility indicator */}
          {compatibility > 0 && compatibility < 100 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {Math.round(compatibility)}% match
              </span>
            </div>
          )}
        </div>

        {/* Preview filters on hover */}
        {isHovered && preset.filters && (
          <div className="absolute left-0 right-0 -bottom-2 translate-y-full bg-background border border-border rounded-lg shadow-lg p-3 z-10">
            <p className="text-xs font-medium mb-2">Filters:</p>
            <div className="space-y-1">
              {Object.entries(preset.filters).slice(0, 3).map(([key, value]) => (
                <div key={key} className="text-xs text-muted-foreground">
                  <span className="font-medium capitalize">{key.replace('_', ' ')}:</span> {Array.isArray(value) ? value.join(', ') : JSON.stringify(value)}
                </div>
              ))}
              {Object.keys(preset.filters).length > 3 && (
                <p className="text-xs text-muted-foreground">
                  ...and {Object.keys(preset.filters).length - 3} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Quick Presets</h3>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Create
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('recommended')}
          className={cn(
            "flex-1 h-7 text-xs",
            activeTab === 'recommended' && "bg-background shadow-sm"
          )}
        >
          Recommended
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('saved')}
          className={cn(
            "flex-1 h-7 text-xs",
            activeTab === 'saved' && "bg-background shadow-sm"
          )}
        >
          Saved ({savedPresets.length})
        </Button>
      </div>

      {/* Presets Content */}
      <ScrollArea className="h-64">
        {activeTab === 'recommended' && (
          <div className="space-y-3">
            {Object.values(presets).map((preset) => 
              renderPresetCard(preset, false)
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-3">
            {savedPresets.length > 0 ? (
              savedPresets.map((preset) => 
                renderPresetCard(preset, true)
              )
            ) : (
              <div className="text-center py-8">
                <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No saved presets yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create and save your custom filter combinations
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Presets help you quickly apply common filter combinations</span>
          <Clock className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

export default FilterPresets;