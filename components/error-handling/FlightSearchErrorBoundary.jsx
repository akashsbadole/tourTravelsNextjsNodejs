/**
 * Flight Search Error Boundary Component
 * Catches and handles errors in flight search components
 */

'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Search, Filter, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Error severity colors
 */
const severityColors = {
  low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  medium: 'bg-orange-100 text-orange-800 border-orange-200',
  high: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-red-200 text-red-900 border-red-300'
};

/**
 * Error category icons
 */
const categoryIcons = {
  validation: <Filter className="h-4 w-4" />,
  network: <RefreshCw className="h-4 w-4" />,
  api: <AlertTriangle className="h-4 w-4" />,
  data: <Search className="h-4 w-4" />,
  business: <AlertTriangle className="h-4 w-4" />,
  system: <AlertTriangle className="h-4 w-4" />,
  user_input: <Filter className="h-4 w-4" />,
  external_service: <Clock className="h-4 w-4" />
};

/**
 * Error Boundary State
 */
class ErrorBoundaryState {
  constructor() {
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  reset() {
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
    this.retryCount = 0;
  }

  canRetry() {
    return this.retryCount < this.maxRetries;
  }

  incrementRetry() {
    this.retryCount++;
  }
}

/**
 * Flight Search Error Boundary Component
 */
export class FlightSearchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = new ErrorBoundaryState();
    this.retryTimeouts = new Map();
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    this.logError(error, errorInfo);
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  /**
   * Log error to monitoring service
   */
  async logError(error, errorInfo) {
    try {
      const response = await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          errorInfo,
          component: 'FlightSearchErrorBoundary',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });

      if (!response.ok) {
        console.warn('Failed to log error to monitoring service');
      }
    } catch (logError) {
      console.error('Error logging failed:', logError);
    }
  }

  /**
   * Handle retry with exponential backoff
   */
  handleRetry = () => {
    if (!this.state.canRetry()) {
      return;
    }

    const delay = Math.pow(2, this.state.retryCount) * 1000; // Exponential backoff
    
    this.setState(prevState => ({
      ...prevState,
      incrementRetry: prevState.retryCount++
    }));

    const timeout = setTimeout(() => {
      this.setState(prevState => new ErrorBoundaryState());
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }, delay);

    this.retryTimeouts.set('retry', timeout);
  };

  /**
   * Handle reset
   */
  handleReset = () => {
    this.setState(new ErrorBoundaryState());
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  /**
   * Parse structured error
   */
  parseError(error) {
    if (error && typeof error === 'object' && error.error) {
      return error.error; // Structured error from API
    }

    // Try to extract structured information from regular error
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.code || parsed.category) {
        return parsed;
      }
    } catch (e) {
      // Not JSON, continue with regular error
    }

    return {
      message: error?.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      category: 'system',
      severity: 'medium',
      suggestions: ['Try refreshing the page', 'Contact support if issue persists']
    };
  }

  /**
   * Render error content based on error type
   */
  renderErrorContent() {
    const error = this.parseError(this.state.error);
    const { onRetry, onReset, showRetry = true, showReset = true } = this.props;

    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <Card className={`${severityColors[error.severity]} border-2`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {categoryIcons[error.category] || <AlertTriangle className="h-6 w-6" />}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">
                  {error.userMessage || error.message}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {error.category?.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {error.severity}
                  </Badge>
                  {error.code && (
                    <Badge variant="outline" className="text-xs">
                      {error.code}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Error Description */}
              <Alert>
                <AlertDescription>
                  {error.message}
                </AlertDescription>
              </Alert>

              {/* Suggestions */}
              {error.suggestions && error.suggestions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Suggestions:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {error.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recovery Options */}
              <div className="flex flex-wrap gap-2 pt-4">
                {showRetry && error.retryable !== false && this.state.canRetry() && (
                  <Button 
                    onClick={this.handleRetry}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                    {this.state.retryCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({this.state.maxRetries - this.state.retryCount} attempts left)
                      </span>
                    )}
                  </Button>
                )}

                {showReset && (
                  <Button 
                    onClick={this.handleReset}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Start Over
                  </Button>
                )}

                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>
              </div>

              {/* Technical Details (Development) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded text-xs font-mono">
                    <div><strong>Error:</strong> {this.state.error?.toString()}</div>
                    <div><strong>Component Stack:</strong></div>
                    <pre className="whitespace-pre-wrap">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Render loading state during retry
   */
  renderRetryLoading() {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
              <p>Retrying search...</p>
              <p className="text-sm text-muted-foreground">
                Attempt {this.state.retryCount + 1} of {this.state.maxRetries}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorContent();
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withFlightSearchErrorBoundary(WrappedComponent, options = {}) {
  return function WrappedWithBoundary(props) {
    return (
      <FlightSearchErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </FlightSearchErrorBoundary>
    );
  };
}

/**
 * Hook for handling flight search errors
 */
export function useFlightSearchErrorHandler() {
  const [error, setError] = React.useState(null);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const handleError = React.useCallback((error, context = {}) => {
    console.error('Flight search error:', error, context);
    setError(error);
  }, []);

  const handleRetry = React.useCallback(async (retryFunction) => {
    if (!retryFunction || retryCount >= 3) {
      return false;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const result = await retryFunction();
      setError(null);
      setIsRetrying(false);
      return result;
    } catch (retryError) {
      setError(retryError);
      setIsRetrying(false);
      return false;
    }
  }, [retryCount]);

  const reset = React.useCallback(() => {
    setError(null);
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  return {
    error,
    handleError,
    handleRetry,
    reset,
    isRetrying,
    retryCount,
    canRetry: retryCount < 3
  };
}

export default FlightSearchErrorBoundary;