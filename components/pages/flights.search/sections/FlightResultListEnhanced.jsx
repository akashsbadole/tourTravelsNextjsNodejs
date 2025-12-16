"use client";
import { FlightResultCard } from "@/components/pages/flights.search/ui/FlightResultCard";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { FlightSearchErrorBoundary } from "@/components/error-handling/FlightSearchErrorBoundary";
import { FlightSearchLoadingState } from "@/components/error-handling/FlightSearchErrorHandler";
import { flightSearchMonitoring } from "@/lib/monitoring/flight-search-monitoring";
import { ErrorFactory } from "@/lib/errors/flight-search-errors";

export function FlightResultListEnhanced({
  data,
  searchState,
  metaData,
  resultType = "result(s)",
  loading = false,
  error = null
}) {
  const maxResultPerPage = 4;
  const [shownTill, setShownTill] = useState(
    data.length < maxResultPerPage ? data.length : maxResultPerPage,
  );
  const [isLoading, setIsLoading] = useState(false);

  // Track component lifecycle for monitoring
  useEffect(() => {
    const operationId = flightSearchMonitoring.performanceMonitor.startOperation(
      `flight_result_list_${Date.now()}`,
      'render',
      { resultCount: data.length, resultType }
    );

    return () => {
      flightSearchMonitoring.performanceMonitor.endOperation(operationId);
    };
  }, [data.length, resultType]);

  // Handle loading state
  if (loading || isLoading) {
    return (
      <FlightSearchLoadingState
        message={`Loading ${resultType}...`}
        showProgress={true}
      />
    );
  }

  // Handle error state
  if (error) {
    flightSearchMonitoring.errorTracker.trackError(error, {
      component: 'FlightResultListEnhanced',
      resultCount: data.length
    });

    return (
      <div className="my-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 font-semibold">!</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                Unable to load {resultType}
              </h3>
              <p className="text-sm text-red-600">
                {error.message || 'An unexpected error occurred'}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  window.location.reload();
                }, 100);
              }}
              className="w-full"
              variant="outline"
            >
              Try Again
            </Button>
            
            <Button
              onClick={() => {
                window.location.href = '/flights/search';
              }}
              className="w-full"
              variant="outline"
            >
              Modify Search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty data
  if (!data || data.length === 0) {
    flightSearchMonitoring.logger.info('No results to display in FlightResultList', {
      searchState,
      resultType
    });

    return (
      <div className="my-10">
        <div className="text-center py-8">
          <div className="text-6xl font-light text-gray-300 mb-4">
            ✈
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No {resultType} available
          </h3>
          <p className="text-gray-500 mb-6">
            Try adjusting your search criteria or filters
          </p>
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => {
                // Clear filters and retry
                const url = new URL(window.location.href);
                const params = new URLSearchParams(url.search);
                for (const [key] of params.entries()) {
                  if (key.startsWith('filter_')) {
                    url.searchParams.delete(key);
                  }
                }
                window.location.href = url.toString();
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
            <Button
              onClick={() => {
                window.location.href = '/flights/search';
              }}
            >
              New Search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleLoadMore = () => {
    const newShownTill = Math.min(shownTill + maxResultPerPage, data.length);
    
    // Track load more action
    flightSearchMonitoring.metricsCollector.incrementCounter('load_more_clicked', {
      currentShown: shownTill,
      newShown: newShownTill,
      totalAvailable: data.length
    });

    setShownTill(newShownTill);
  };

  const handleCardClick = (flightData) => {
    // Track flight card interactions
    flightSearchMonitoring.metricsCollector.incrementCounter('flight_card_clicked', {
      flightCode: flightData.flightCode,
      carrier: flightData.carrierInCharge?._id,
      price: flightData.price
    });
  };

  const handleBookmarkToggle = (flightData, isBookmarked) => {
    // Track bookmark actions
    flightSearchMonitoring.metricsCollector.incrementCounter('bookmark_toggled', {
      flightCode: flightData.flightCode,
      action: isBookmarked ? 'added' : 'removed'
    });
  };

  return (
    <FlightSearchErrorBoundary
      onError={(error, errorInfo) => {
        console.error('FlightResultListEnhanced error boundary triggered:', error, errorInfo);
        
        const boundaryError = ErrorFactory.genericError('Result list error boundary', {
          component: 'FlightResultListEnhanced',
          errorInfo: errorInfo.componentStack
        });
        
        flightSearchMonitoring.errorTracker.trackError(boundaryError, {
          errorBoundary: true,
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <div className="my-10">
        <div className="my-5 flex justify-between text-[0.875rem] font-semibold">
          <p>
            Showing {shownTill} of{" "}
            <span className="text-tertiary">
              {data.length} {resultType}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Sort by:
            </span>
            <select 
              className="bg-transparent border rounded px-2 py-1 text-sm"
              onChange={(e) => {
                flightSearchMonitoring.metricsCollector.incrementCounter('sort_changed', {
                  sortBy: e.target.value
                });
                
                // Handle sort change
                const url = new URL(window.location.href);
                url.searchParams.set('sort', e.target.value);
                window.location.href = url.toString();
              }}
            >
              <option value="recommended">Recommended</option>
              <option value="price_low_high">Price: Low to High</option>
              <option value="price_high_low">Price: High to Low</option>
              <option value="duration_short_long">Duration: Short to Long</option>
              <option value="departure_early_late">Departure: Early to Late</option>
            </select>
          </div>
        </div>
        
        <div className="mb-5 grid grid-cols-1 gap-[16px]">
          {data.slice(0, shownTill).map((item, i) => (
            <FlightSearchErrorBoundary key={item._id || i}>
              <FlightResultCard
                searchState={searchState}
                data={item}
                metaData={{ 
                  ...metaData, 
                  isBookmarked: item.isBookmarked,
                  onError: (error) => {
                    flightSearchMonitoring.errorTracker.trackError(error, {
                      component: 'FlightResultCard',
                      flightId: item._id,
                      flightCode: item.flightCode
                    });
                  }
                }}
                onClick={() => handleCardClick(item)}
                onBookmarkToggle={(isBookmarked) => handleBookmarkToggle(item, isBookmarked)}
              />
            </FlightSearchErrorBoundary>
          ))}
        </div>

        {shownTill < data.length && (
          <div className="text-center">
            <Button
              onClick={handleLoadMore}
              className={cn(
                "w-full bg-secondary !font-semibold text-white hover:bg-secondary/90 focus:bg-secondary",
                "transition-all duration-200"
              )}
            >
              Show {Math.min(maxResultPerPage, data.length - shownTill)} more result
              {data.length - shownTill > maxResultPerPage && `s (${data.length - shownTill} remaining)`}
            </Button>
          </div>
        )}

        {shownTill >= data.length && data.length > maxResultPerPage && (
          <div className="text-center mt-4 text-sm text-gray-500">
            Showing all {data.length} {resultType}
          </div>
        )}
      </div>
    </FlightSearchErrorBoundary>
  );
}

export default FlightResultListEnhanced;