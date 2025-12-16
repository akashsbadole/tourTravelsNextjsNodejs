/**
 * Hotel Search Error Handler Component
 * Provides user-friendly error handling and recovery options
 */

'use client';

import React, { useState, useEffect } from 'react';

/**
 * Hotel Search Error Handler Component
 */
const HotelSearchErrorHandler = ({ 
  error, 
  onRetry, 
  onAlternativeSearch, 
  className = '',
  showDetails = false 
}) => {
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Get error icon based on error type
   */
  const getErrorIcon = (errorCode) => {
    switch (errorCode) {
      case 'VALIDATION_ERROR':
      case 'INVALID_PARAMS':
        return (
          <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      
      case 'NETWORK_ERROR':
      case 'API_ERROR':
      case 'SERVICE_UNAVAILABLE':
        return (
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      
      case 'DATA_ERROR':
      case 'NOT_FOUND':
        return (
          <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      
      default:
        return (
          <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  /**
   * Get error type color classes
   */
  const getErrorColorClasses = (errorCode) => {
    switch (errorCode) {
      case 'VALIDATION_ERROR':
      case 'INVALID_PARAMS':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      
      case 'NETWORK_ERROR':
      case 'API_ERROR':
      case 'SERVICE_UNAVAILABLE':
        return 'bg-red-50 border-red-200 text-red-800';
      
      case 'DATA_ERROR':
      case 'NOT_FOUND':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  /**
   * Handle retry with loading state
   */
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  /**
   * Get user-friendly error message
   */
  const getUserFriendlyMessage = (error) => {
    if (error.message) {
      return error.message;
    }

    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'Please check your search criteria and try again.';
      case 'NETWORK_ERROR':
        return 'Unable to connect to the hotel search service. Please check your internet connection.';
      case 'API_ERROR':
        return 'The hotel search service is currently experiencing issues. Please try again later.';
      case 'DATA_ERROR':
        return 'We encountered an issue processing your search results.';
      case 'NOT_FOUND':
        return 'No hotels were found matching your criteria.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  /**
   * Get primary action based on error type
   */
  const getPrimaryAction = () => {
    switch (error.code) {
      case 'VALIDATION_ERROR':
      case 'INVALID_PARAMS':
        return {
          text: 'Update Search Criteria',
          action: () => onAlternativeSearch?.('validation', {})
        };
      
      case 'NETWORK_ERROR':
      case 'API_ERROR':
      case 'SERVICE_UNAVAILABLE':
        return {
          text: 'Try Again',
          action: handleRetry
        };
      
      case 'DATA_ERROR':
      case 'NOT_FOUND':
        return {
          text: 'Modify Search',
          action: () => onAlternativeSearch?.('no_results', {})
        };
      
      default:
        return {
          text: 'Try Again',
          action: handleRetry
        };
    }
  };

  /**
   * Get secondary actions
   */
  const getSecondaryActions = () => {
    const actions = [];

    // Add alternative search options for certain error types
    if (error.code === 'NOT_FOUND' || error.code === 'DATA_ERROR') {
      actions.push({
        text: 'Change Dates',
        action: () => onAlternativeSearch?.('alternative_dates', {})
      });
      
      actions.push({
        text: 'Change Location',
        action: () => onAlternativeSearch?.('nearby_locations', {})
      });
    }

    // Add contact support for persistent issues
    if (retryCount >= 3) {
      actions.push({
        text: 'Contact Support',
        action: () => {
          window.location.href = '/support';
        }
      });
    }

    return actions;
  };

  if (!error) {
    return null;
  }

  const colorClasses = getErrorColorClasses(error.code);
  const primaryAction = getPrimaryAction();
  const secondaryActions = getSecondaryActions();

  return (
    <div className={`hotel-search-error-handler ${className}`}>
      <div className={`${colorClasses} border rounded-lg p-6`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getErrorIcon(error.code)}
          </div>
          
          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Hotel Search Error
              </h3>
              
              {retryCount > 0 && (
                <span className="text-sm opacity-75">
                  Retried {retryCount} time{retryCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            <div className="mt-2">
              <p className="text-sm">
                {getUserFriendlyMessage(error)}
              </p>
            </div>

            {/* Suggestions */}
            {error.suggestions && error.suggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Suggestions:</p>
                <ul className="text-sm space-y-1">
                  {error.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={primaryAction.action}
                disabled={isRetrying}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRetrying
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border border-current text-current hover:bg-gray-50'
                }`}
              >
                {isRetrying ? 'Retrying...' : primaryAction.text}
              </button>

              {secondaryActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="px-4 py-2 rounded-lg font-medium bg-white border border-current text-current hover:bg-gray-50 transition-colors"
                >
                  {action.text}
                </button>
              ))}

              {showDetails && (
                <button
                  onClick={() => setExpandedDetails(!expandedDetails)}
                  className="px-4 py-2 rounded-lg font-medium text-sm border border-current hover:bg-gray-50 transition-colors"
                >
                  {expandedDetails ? 'Hide' : 'Show'} Details
                </button>
              )}
            </div>

            {/* Error Details */}
            {showDetails && expandedDetails && (
              <div className="mt-4 p-3 bg-white bg-opacity-50 rounded text-sm">
                <div className="font-mono">
                  <div><strong>Error Code:</strong> {error.code}</div>
                  {error.requestId && (
                    <div><strong>Request ID:</strong> {error.requestId}</div>
                  )}
                  {error.timestamp && (
                    <div><strong>Timestamp:</strong> {new Date(error.timestamp).toLocaleString()}</div>
                  )}
                  {error.validationErrors && (
                    <div className="mt-2">
                      <strong>Validation Errors:</strong>
                      <ul className="ml-4 mt-1">
                        {Object.entries(error.validationErrors).map(([field, errors]) => (
                          <li key={field}>
                            <strong>{field}:</strong> {Array.isArray(errors) ? errors.join(', ') : errors}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Retry Warning */}
            {retryCount >= 3 && (
              <div className="mt-4 p-3 bg-white bg-opacity-50 rounded text-sm">
                <p className="font-medium">
                  You've tried multiple times without success. Consider:
                </p>
                <ul className="mt-1 space-y-1">
                  <li>• Checking your internet connection</li>
                  <li>• Modifying your search criteria</li>
                  <li>• Trying again in a few minutes</li>
                  <li>• Contacting our support team</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelSearchErrorHandler;