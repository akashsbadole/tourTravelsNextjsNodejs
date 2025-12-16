/**
 * Hotel Search Error Boundary Component
 * Catches and handles errors in hotel search components
 */

'use client';

import React from 'react';

/**
 * Hotel Search Error Boundary Component
 */
class HotelSearchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
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

    // Log error to monitoring system
    console.error('Hotel Search Error Boundary caught an error:', error, errorInfo);
    
    // You could also send this to an error reporting service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="hotel-search-error-boundary">
          <div className="max-w-2xl mx-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-red-800">
                    Something went wrong with the hotel search
                  </h3>
                </div>
              </div>

              <div className="text-red-700 mb-6">
                <p className="mb-2">
                  We encountered an unexpected error while processing your hotel search request.
                  This could be due to a temporary issue or a problem with the search parameters.
                </p>
                
                {this.state.retryCount > 0 && (
                  <p className="text-sm">
                    You've retried {this.state.retryCount} time{this.state.retryCount > 1 ? 's' : ''}. 
                    If the problem persists, please try again later or contact support.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleRetry}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={this.handleReset}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Start Over
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Refresh Page
                </button>
              </div>

              {/* Error Details for Development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-red-800 font-medium">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-3 p-3 bg-red-100 rounded text-sm">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.toString()}
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Suggested Actions */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Suggested Actions:</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Try modifying your search criteria</li>
                  <li>• Clear your browser cache and cookies</li>
                  <li>• Try a different browser or device</li>
                  <li>• Contact support if the issue persists</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default HotelSearchErrorBoundary;