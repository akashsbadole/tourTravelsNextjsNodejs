/**
 * Filter Recommendations Component
 * Displays smart filter recommendations and optimizations
 */

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Lightbulb, 
  TrendingUp, 
  Zap, 
  Star, 
  ArrowRight,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export function FilterRecommendations({ 
  recommendations = [], 
  onApply, 
  onDismiss,
  className 
}) {
  // Handle recommendation application
  const handleApplyRecommendation = (recommendation) => {
    if (onApply) {
      onApply(recommendation);
    }
  };

  // Handle recommendation dismissal
  const handleDismissRecommendation = (index) => {
    if (onDismiss) {
      onDismiss(index);
    }
  };

  // Get recommendation icon and color based on type
  const getRecommendationStyle = (type) => {
    switch (type) {
      case 'preset':
        return {
          icon: <Star className="h-4 w-4" />,
          color: 'bg-blue-50 text-blue-800 border-blue-200',
          buttonVariant: 'default'
        };
      
      case 'optimization':
        return {
          icon: <Zap className="h-4 w-4" />,
          color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
          buttonVariant: 'secondary'
        };
      
      case 'trending':
        return {
          icon: <TrendingUp className="h-4 w-4" />,
          color: 'bg-green-50 text-green-800 border-green-200',
          buttonVariant: 'outline'
        };
      
      case 'suggestion':
        return {
          icon: <Lightbulb className="h-4 w-4" />,
          color: 'bg-purple-50 text-purple-800 border-purple-200',
          buttonVariant: 'ghost'
        };
      
      case 'warning':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-orange-50 text-orange-800 border-orange-200',
          buttonVariant: 'destructive'
        };
      
      default:
        return {
          icon: <Lightbulb className="h-4 w-4" />,
          color: 'bg-gray-50 text-gray-800 border-gray-200',
          buttonVariant: 'outline'
        };
    }
  };

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium">Smart Recommendations</h4>
        <Badge variant="secondary" className="text-xs">
          {recommendations.length}
        </Badge>
      </div>

      {/* Recommendations List */}
      <div className="space-y-2">
        {recommendations.map((recommendation, index) => {
          const style = getRecommendationStyle(recommendation.type);
          
          return (
            <Alert
              key={index}
              className={cn(
                "border-2 transition-all",
                style.color,
                "hover:shadow-sm"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {style.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <AlertDescription className="space-y-2">
                    {/* Title and Reason */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-medium">
                          {recommendation.title || 'Recommendation'}
                        </h5>
                        
                        {recommendation.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">
                            High Priority
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs opacity-90">
                        {recommendation.reason}
                      </p>
                    </div>

                    {/* Impact */}
                    {recommendation.impact && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium">Expected impact:</span>
                        <span>{recommendation.impact}</span>
                        
                        {recommendation.confidence && (
                          <span className="opacity-75">
                            ({Math.round(recommendation.confidence * 100)}% confidence)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Preview */}
                    {recommendation.preview && (
                      <div className="text-xs opacity-75">
                        <span className="font-medium">Preview:</span> {recommendation.preview}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {recommendation.actionable !== false && (
                        <Button
                          variant={style.buttonVariant}
                          size="sm"
                          onClick={() => handleApplyRecommendation(recommendation)}
                          className="h-7 px-3 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Apply
                        </Button>
                      )}
                      
                      {recommendation.alternative && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApplyRecommendation(recommendation.alternative)}
                          className="h-7 px-3 text-xs"
                        >
                          {recommendation.alternative.label || 'Alternative'}
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismissRecommendation(index)}
                        className="h-7 w-7 p-0 ml-auto"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>Recommendations are based on your search patterns and available flights</span>
        <ArrowRight className="h-3 w-3" />
      </div>
    </div>
  );
}

// Recommendation factory functions
export const createPresetRecommendation = (preset, reason) => ({
  type: 'preset',
  title: `Try "${preset.name}" preset`,
  reason: reason || `This preset is popular for similar searches`,
  preset,
  actionable: true,
  priority: 'medium',
  impact: `${Object.keys(preset.filters || {}).length} filters applied`
});

export const createOptimizationRecommendation = (title, reason, impact, optimization) => ({
  type: 'optimization',
  title,
  reason,
  impact,
  optimization,
  actionable: true,
  priority: 'high',
  confidence: 0.8
});

export const createTrendingRecommendation = (title, reason, trend) => ({
  type: 'trending',
  title,
  reason,
  trend,
  actionable: true,
  priority: 'low',
  confidence: 0.6
});

export const createSuggestionRecommendation = (title, reason, suggestion) => ({
  type: 'suggestion',
  title,
  reason,
  suggestion,
  actionable: true,
  priority: 'medium',
  confidence: 0.7
});

export const createWarningRecommendation = (title, reason, warning) => ({
  type: 'warning',
  title,
  reason,
  warning,
  actionable: true,
  priority: 'high',
  confidence: 0.9
});

export default FilterRecommendations;