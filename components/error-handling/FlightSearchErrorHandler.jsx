/**
 * Flight Search Error Handler Component
 * Provides comprehensive error handling UI for flight search
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Calendar, 
  Users, 
  MapPin,
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Error type configurations
 */
const errorTypes = {
  NETWORK_ERROR: {
    icon: <WifiOff className="h-5 w-5" />,
    title: 'Connection Issue',
    description: 'Unable to connect to flight search service',
    color: 'border-orange-200 bg-orange-50',
    actions: ['retry', 'check_connection', 'offline_mode']
  },
  VALIDATION_ERROR: {
    icon: <AlertCircle className="h-5 w-5" />,
    title: 'Search Parameters Invalid',
    description: 'Please check your search criteria',
    color: 'border-yellow-200 bg-yellow-50',
    actions: ['fix_params', 'suggestions']
  },
  NO_RESULTS: {
    icon: <Search className="h-5 w-5" />,
    title: 'No Flights Found',
    description: 'No flights match your search criteria',
    color: 'border-blue-200 bg-blue-50',
    actions: ['alternate_dates', 'nearby_airports', 'reduce_filters']
  },
  RATE_LIMIT: {
    icon: <Clock className="h-5 w-5" />,
    title: 'Too Many Requests',
    description: 'Please wait before trying again',
    color: 'border-purple-200 bg-purple-50',
    actions: ['wait', 'upgrade', 'contact_support']
  },
  SERVICE_UNAVAILABLE: {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: 'Service Temporarily Unavailable',
    description: 'Flight search service is currently down',
    color: 'border-red-200 bg-red-50',
    actions: ['retry_later', 'fallback', 'contact_support']
  },
  PARTIAL_RESULTS: {
    icon: <Info className="h-5 w-5" />,
    title: 'Limited Results Available',
    description: 'Some flight data may be unavailable',
    color: 'border-amber-200 bg-amber-50',
    actions: ['continue', 'retry_later', 'contact_support']
  }
};

/**
 * Flight Search Error Handler Component
 */
export function FlightSearchErrorHandler({ 
  error, 
  onRetry, 
  onFixParams, 
  onAlternativeSearch,
  onContactSupport,
  className = '' 
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryProgress, setRetryProgress] = useState(0);
  const [expandedSection, setExpandedSection] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Parse error to determine type
  const errorType = parseErrorType(error);
  const errorConfig = errorTypes[errorType] || errorTypes.SERVICE_UNAVAILABLE;

  useEffect(() => {
    if (isRetrying) {
      const interval = setInterval(() => {
        setRetryProgress(prev => {
          if (prev >= 100) {
            setIsRetrying(false);
            return 0;
          }
          return prev + 10;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isRetrying]);

  /**
   * Parse error to determine error type
   */
  function parseErrorType(error) {
    if (!error) return 'SERVICE_UNAVAILABLE';

    const message = (error.message || error.userMessage || '').toLowerCase();
    const code = error.code || error.errorCode || '';

    if (message.includes('network') || message.includes('connection') || code.includes('NETWORK')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('validation') || message.includes('invalid') || code.includes('VALIDATION')) {
      return 'VALIDATION_ERROR';
    }
    if (message.includes('no flights') || message.includes('not found') || code.includes('NO_RESULTS')) {
      return 'NO_RESULTS';
    }
    if (message.includes('rate limit') || message.includes('too many') || code.includes('RATE_LIMIT')) {
      return 'RATE_LIMIT';
    }
    if (message.includes('partial') || message.includes('limited') || code.includes('PARTIAL')) {
      return 'PARTIAL_RESULTS';
    }

    return 'SERVICE_UNAVAILABLE';
  }

  /**
   * Handle retry action
   */
  const handleRetry = async () => {
    if (retryCount >= 3) {
      return;
    }

    setIsRetrying(true);
    setRetryProgress(0);
    setRetryCount(prev => prev + 1);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate retry delay
      if (onRetry) {
        await onRetry();
      }
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
      setRetryProgress(0);
    }
  };

  /**
   * Render error icon and title
   */
  const renderErrorHeader = () => (
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-full ${errorConfig.color}`}>
        {errorConfig.icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold">{errorConfig.title}</h3>
        <p className="text-sm text-muted-foreground">{errorConfig.description}</p>
      </div>
    </div>
  );

  /**
   * Render retry progress
   */
  const renderRetryProgress = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>Retrying search...</span>
        <span>{retryProgress}%</span>
      </div>
      <Progress value={retryProgress} className="w-full" />
    </div>
  );

  /**
   * Render action buttons
   */
  const renderActions = () => {
    const actions = errorConfig.actions || [];

    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {actions.includes('retry') && !isRetrying && retryCount < 3 && (
          <Button onClick={handleRetry} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
            {retryCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {retryCount}/3
              </Badge>
            )}
          </Button>
        )}

        {actions.includes('fix_params') && onFixParams && (
          <Button onClick={onFixParams} variant="outline">
            Fix Search Parameters
          </Button>
        )}

        {actions.includes('alternate_dates') && onAlternativeSearch && (
          <Button onClick={() => onAlternativeSearch('dates')} variant="outline">
            Try Different Dates
          </Button>
        )}

        {actions.includes('nearby_airports') && onAlternativeSearch && (
          <Button onClick={() => onAlternativeSearch('airports')} variant="outline">
            Check Nearby Airports
          </Button>
        )}

        {actions.includes('reduce_filters') && onAlternativeSearch && (
          <Button onClick={() => onAlternativeSearch('filters')} variant="outline">
            Reduce Filters
          </Button>
        )}

        {actions.includes('contact_support') && onContactSupport && (
          <Button onClick={onContactSupport} variant="outline">
            Contact Support
          </Button>
        )}
      </div>
    );
  };

  /**
   * Render error suggestions
   */
  const renderSuggestions = () => {
    const suggestions = error?.suggestions || [];
    
    if (suggestions.length === 0) {
      return null;
    }

    return (
      <Collapsible 
        open={expandedSection === 'suggestions'}
        onOpenChange={(open) => setExpandedSection(open ? 'suggestions' : null)}
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Suggestions
            </span>
            {expandedSection === 'suggestions' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 bg-muted rounded-lg">
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  /**
   * Render technical details
   */
  const renderTechnicalDetails = () => {
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }

    return (
      <Collapsible 
        open={expandedSection === 'technical'}
        onOpenChange={(open) => setExpandedSection(open ? 'technical' : null)}
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2">
            <span>Technical Details</span>
            {expandedSection === 'technical' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 bg-muted rounded-lg">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Card className={`${errorConfig.color} ${className}`}>
      <CardHeader>
        {renderErrorHeader()}
      </CardHeader>
      <CardContent className="space-y-4">
        {isRetrying ? (
          renderRetryProgress()
        ) : (
          <>
            {renderActions()}
            {renderSuggestions()}
            {renderTechnicalDetails()}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Flight Search Loading State Component
 */
export function FlightSearchLoadingState({ 
  message = 'Searching for flights...', 
  showProgress = true,
  timeout = 30000 
}) {
  const [progress, setProgress] = useState(0);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    if (!showProgress) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    const timeoutId = setTimeout(() => {
      setIsTimeout(true);
    }, timeout);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [showProgress, timeout]);

  if (isTimeout) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <Clock className="h-4 w-4" />
        <AlertTitle>Search Taking Longer Than Expected</AlertTitle>
        <AlertDescription>
          The search is taking longer than usual. This might be due to high demand or technical issues.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="flex items-center justify-center py-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Search className="h-8 w-8 animate-pulse text-primary" />
          </div>
          <p className="text-lg font-medium">{message}</p>
          {showProgress && (
            <div className="w-full max-w-md space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Searching multiple airlines...</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Flight Search Empty State Component
 */
export function FlightSearchEmptyState({ 
  onModifySearch,
  onAlternativeSearch 
}) {
  const suggestions = [
    {
      icon: <Calendar className="h-5 w-5" />,
      title: 'Try Different Dates',
      description: 'Check dates before or after your preferred travel dates',
      action: () => onAlternativeSearch?.('dates')
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      title: 'Check Nearby Airports',
      description: 'Consider airports within 100 miles of your origin/destination',
      action: () => onAlternativeSearch?.('airports')
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'Adjust Passengers',
      description: 'Try with different passenger counts or cabin classes',
      action: () => onModifySearch?.()
    }
  ];

  return (
    <Card className="w-full">
      <CardContent className="py-8">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center">
            <Search className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">No Flights Found</h3>
            <p className="text-muted-foreground">
              We couldn't find any flights matching your search criteria. 
              Try adjusting your search or explore alternatives below.
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center text-center gap-2"
                onClick={suggestion.action}
              >
                <div className="p-2 rounded-full bg-primary/10">
                  {suggestion.icon}
                </div>
                <div>
                  <div className="font-medium">{suggestion.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {suggestion.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook for managing flight search state
 */
export function useFlightSearchState() {
  const [state, setState] = useState({
    loading: false,
    error: null,
    results: [],
    partialResults: false,
    retryCount: 0
  });

  const setLoading = (loading) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error) => {
    setState(prev => ({ 
      ...prev, 
      error, 
      loading: false,
      results: []
    }));
  };

  const setResults = (results, partial = false) => {
    setState(prev => ({
      ...prev,
      results,
      partialResults: partial,
      loading: false,
      error: null
    }));
  };

  const reset = () => {
    setState({
      loading: false,
      error: null,
      results: [],
      partialResults: false,
      retryCount: 0
    });
  };

  const incrementRetry = () => {
    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));
  };

  return {
    ...state,
    setLoading,
    setError,
    setResults,
    reset,
    incrementRetry,
    canRetry: state.retryCount < 3,
    hasResults: state.results.length > 0,
    hasError: !!state.error,
    isLoading: state.loading
  };
}

export default FlightSearchErrorHandler;