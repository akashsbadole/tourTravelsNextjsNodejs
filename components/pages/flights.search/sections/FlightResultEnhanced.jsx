import { FlightResultList } from "./FlightResultList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { multiSegmentCombinedFareBreakDown } from "@/lib/db/schema/flightItineraries";
import { minutesToHMFormat } from "@/lib/utils";
import { FlightSearchErrorBoundary } from "@/components/error-handling/FlightSearchErrorBoundary";
import { FlightSearchErrorHandler, FlightSearchEmptyState, useFlightSearchState } from "@/components/error-handling/FlightSearchErrorHandler";
import { flightSearchMonitoring } from "@/lib/monitoring/flight-search-monitoring";
import { ErrorFactory } from "@/lib/errors/flight-search-errors";

export async function FlightResultEnhanced({ flightResults, searchState, metaData, error = null }) {
  const flightSearchState = useFlightSearchState();
  
  // Handle error case
  if (error) {
    // Track error for monitoring
    flightSearchMonitoring.errorTracker.trackError(error, {
      component: 'FlightResultEnhanced',
      searchState
    });

    return (
      <FlightSearchErrorHandler
        error={error}
        onRetry={async () => {
          flightSearchState.setLoading(true);
          try {
            window.location.reload();
          } catch (retryError) {
            flightSearchState.setError(retryError);
          }
        }}
        onFixParams={() => {
          // Redirect back to search form to fix parameters
          window.location.href = '/flights/search';
        }}
        onAlternativeSearch={(type) => {
          // Handle alternative search based on type
          const url = new URL(window.location.href);
          
          if (type === 'dates') {
            // Adjust dates by +/- 3 days
            const departureDate = new Date(searchState.desiredDepartureDate);
            const newDate = new Date(departureDate.setDate(departureDate.getDate() + 3));
            url.searchParams.set('desiredDepartureDate', newDate.toISOString().split('T')[0]);
          } else if (type === 'airports') {
            // Implement nearby airport logic
            const nearbyOrigins = ['JFK', 'LGA', 'EWR']; // Example nearby airports
            const nearbyDests = ['LAX', 'BUR', 'SNA'];
            
            if (nearbyOrigins.includes(searchState.from?.iataCode)) {
              url.searchParams.set('from', nearbyOrigins[0]);
            }
            if (nearbyDests.includes(searchState.to?.iataCode)) {
              url.searchParams.set('to', nearbyDests[0]);
            }
          } else if (type === 'filters') {
            // Clear filters
            const params = new URLSearchParams(url.search);
            for (const [key] of params.entries()) {
              if (key.startsWith('filter_')) {
                url.searchParams.delete(key);
              }
            }
          }
          
          // Track alternative search
          flightSearchMonitoring.metricsCollector.incrementCounter('alternative_search', {
            type,
            originalError: error.category
          });
          
          window.location.href = url.toString();
        }}
        onContactSupport={() => {
          // Open support chat or redirect to support page
          flightSearchMonitoring.metricsCollector.incrementCounter('support_contacted', {
            errorCategory: error.category,
            component: 'FlightResultEnhanced'
          });
          
          window.open('/support', '_blank');
        }}
      />
    );
  }

  // Handle empty results
  if (!flightResults || flightResults.length === 0) {
    // Track empty results for monitoring
    flightSearchMonitoring.logger.info('No flight results found', {
      searchState,
      metadata: metaData
    });

    return (
      <FlightSearchEmptyState
        onModifySearch={() => {
          // Redirect back to search form
          window.location.href = '/flights/search';
        }}
        onAlternativeSearch={(type) => {
          // Handle alternative search with monitoring
          const url = new URL(window.location.href);
          
          if (type === 'dates') {
            const departureDate = new Date(searchState.desiredDepartureDate);
            const newDate = new Date(departureDate.setDate(departureDate.getDate() + 1));
            url.searchParams.set('desiredDepartureDate', newDate.toISOString().split('T')[0]);
          } else if (type === 'airports') {
            // Implement nearby airport suggestions
            console.log('Nearby airports alternative search');
          }
          
          flightSearchMonitoring.metricsCollector.incrementCounter('empty_results_alternative', {
            type
          });
          
          window.location.href = url.toString();
        }}
      />
    );
  }

  const sortByCheapest = flightResults.slice(0).sort((a, b) => {
    const aTotalPrice = multiSegmentCombinedFareBreakDown(
      a.segmentIds,
      searchState.passengers,
      metaData.flightClass,
    ).total;
    const bTotalPrice = multiSegmentCombinedFareBreakDown(
      b.segmentIds,
      searchState.passengers,
      metaData.flightClass,
    ).total;
    return +aTotalPrice - +bTotalPrice;
  });
  
  const sortByQuickest = [...flightResults].sort((a, b) => {
    return +a.totalDurationMinutes - +b.totalDurationMinutes;
  });

  const mostCheap =
    multiSegmentCombinedFareBreakDown(
      sortByCheapest[0]?.segmentIds,
      searchState.passengers,
      metaData.flightClass,
    ).total || 0;

  const mostQuick = sortByQuickest[0]?.totalDurationMinutes;

  return (
    <FlightSearchErrorBoundary
      onError={(error, errorInfo) => {
        console.error('FlightResultEnhanced error boundary triggered:', error, errorInfo);
        
        // Track boundary error
        const boundaryError = ErrorFactory.genericError('Component error boundary triggered', {
          component: 'FlightResultEnhanced',
          errorInfo: errorInfo.componentStack,
          originalError: error.message
        });
        
        flightSearchMonitoring.errorTracker.trackError(boundaryError, {
          errorBoundary: true,
          componentStack: errorInfo.componentStack
        });
      }}
      onReset={() => {
        flightSearchState.reset();
      }}
    >
      <div className="flex grow flex-col gap-[32px]">
        <Tabs defaultValue="cheapest" className="w-full">
          <TabsList className="flex h-auto flex-col gap-1 bg-white p-0 sm:flex-row">
            <TabsTrigger
              value="cheapest"
              className="w-full grow justify-start gap-2"
              onClick={() => {
                flightSearchMonitoring.metricsCollector.incrementCounter('sort_option_selected', {
                  option: 'cheapest'
                });
              }}
            >
              <div className="text-left">
                <p className="mb-[8px] block font-semibold">Cheapest</p>
                <p className={"text-sm text-gray-500"}>
                  $ {(+mostCheap).toFixed(2)}
                </p>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="quickest"
              className="w-full grow justify-start gap-2"
              onClick={() => {
                flightSearchMonitoring.metricsCollector.incrementCounter('sort_option_selected', {
                  option: 'quickest'
                });
              }}
            >
              <div className="text-left">
                <p className="mb-[8px] block font-semibold">Quickest</p>
                <p className="text-sm text-gray-500">
                  {minutesToHMFormat(mostQuick || 0)}
                </p>
              </div>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cheapest">
            <FlightResultList
              searchState={searchState}
              data={sortByCheapest}
              metaData={metaData}
              resultType="cheapest flight(s)"
            />
          </TabsContent>
          <TabsContent value="quickest">
            <FlightResultList
              searchState={searchState}
              data={sortByQuickest}
              metaData={metaData}
              resultType="quickest flight(s)"
            />
          </TabsContent>
        </Tabs>
      </div>
    </FlightSearchErrorBoundary>
  );
}

export default FlightResultEnhanced;