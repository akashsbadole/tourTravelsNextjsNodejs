import { HotelResultCard } from "@/components/pages/hotels.search/ui/HotelResultCard";
import { getManyDocs } from "@/lib/db/getOperationDB";
import { auth } from "@/lib/auth";
import { RATING_SCALE } from "@/lib/constants";
import { getUserDetails } from "@/lib/services/user";
import validateHotelSearchParams from "@/lib/zodSchemas/hotelSearchParams";
import { SetHotelFormState } from "@/components/helpers/SetHotelFormState";
import { getHotels } from "@/lib/services/hotels";
import Jumper from "@/components/local-ui/Jumper";
import extractFiltersObjFromSearchParams from "@/lib/helpers/hotels/extractFiltersObjFromSearchParams";
import validateHotelSearchFilter from "@/lib/zodSchemas/hotelSearchFilterValidation";
import { singleRoomFareBreakdown } from "@/lib/helpers/hotels/priceCalculation";
import { EmptyResult } from "@/components/EmptyResult";
import { cookies } from "next/headers";
import SetCookies from "@/components/helpers/SetCookies";
import { HotelSearchErrorBoundary } from "@/components/error-handling/HotelSearchErrorBoundary";
import { HotelSearchErrorHandler, HotelSearchEmptyState, HotelSearchLoadingState } from "@/components/error-handling/HotelSearchErrorHandler";
import { hotelSearchMonitoring } from "@/lib/monitoring/hotel-search-monitoring";
import { ErrorFactory } from "@/lib/errors/hotel-search-errors";
import { edgeCaseHandler } from "@/lib/hotel-search/edge-case-handler";
import { gracefulDegradationManager } from "@/lib/hotel-search/graceful-degradation";

export default async function HotelResultEnhancedPage({ params }) {
  const traceId = hotelSearchMonitoring.logger.generateTraceId();
  hotelSearchMonitoring.logger.setTraceId(traceId);

  try {
    const decodedSp = decodeURIComponent(params.hotelSearchParams);
    const spObj = Object.fromEntries(new URLSearchParams(decodedSp));

    // Enhanced validation with edge case handling
    const validation = await edgeCaseHandler.validateSearchParams(spObj);
    
    if (!validation.valid) {
      hotelSearchMonitoring.logger.warn('Hotel search validation failed', {
        traceId,
        errors: validation.errors,
        searchParams: spObj
      });

      const formStateError = {
        ...spObj,
        checkIn: new Date(spObj.checkIn)?.toLocaleString("en-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        checkOut: new Date(spObj.checkOut)?.toLocaleString("en-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        destination: { city: spObj.city, country: spObj.country },
        errors: validation.errors.reduce((acc, err) => {
          acc[err.field] = err.error;
          return acc;
        }, {}),
      };

      // Track validation errors
      validation.errors.forEach(error => {
        hotelSearchMonitoring.errorTracker.trackError(
          ErrorFactory.validationError(error.error, {
            field: error.field,
            suggestions: error.suggestions
          }),
          {
            traceId,
            component: 'HotelResultEnhancedPage',
            validationError: error
          }
        );
      });

      return <SetHotelFormState obj={formStateError} />;
    }

    let filters = extractFiltersObjFromSearchParams(spObj);
    const validatedFilters = validateHotelSearchFilter(filters);
    const finalFilterParams = validatedFilters?.data || {};

    const session = await auth();
    const validate = validateHotelSearchParams(spObj);

    const formStateError = {
      ...spObj,
      checkIn: new Date(spObj.checkIn)?.toLocaleString("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      checkOut: new Date(spObj.checkOut)?.toLocaleString("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      destination: { city: spObj.city, country: spObj.country },
      errors: validate.errors,
    };

    if (validate.success === false) {
      return <SetHotelFormState obj={formStateError} />;
    }

    let hotels = await getHotels(validate.data, {
      filters: finalFilterParams,
    });

    // Show liked hotels if user is logged in
    if (session?.user?.id) {
      const userDetails = await getUserDetails(session?.user?.id);
      hotels = hotels.map((hotel) => {
        const liked = userDetails?.hotels?.bookmarked?.includes(hotel._id);
        return { ...hotel, liked };
      });
    }

    // rating and reviews
    const hotelResultsForCard = (
      await Promise.all(
        hotels.map(async (hotel) => {
          const reviews = await getManyDocs(
            "HotelReview",
            { hotelId: hotel._id, slug: hotel.slug },
            [hotel._id + "_review", hotel.slug + "_review", "hotelReviews"],
          );
          const totalRatingsSum = reviews.reduce(
            (acc, review) => acc + +review.rating,
            0,
          );
          const totalReviewsCount = reviews.length;
          const rating = totalRatingsSum / totalReviewsCount;
          const ratingScale = RATING_SCALE[Math.floor(rating)];

          const filterRates = validatedFilters?.data?.rates || [];
          if (filterRates.length) {
            const ratingFilter = filterRates.includes(`${Math.floor(rating)}`);
            if (!ratingFilter) return null;
          }

          const cheapestRoom = [...hotel.rooms].sort((a, b) => {
            const aPrice = singleRoomFareBreakdown(a, 1).total;
            const bPrice = singleRoomFareBreakdown(b, 1).total;
            return aPrice - bPrice;
          })[0];

          return {
            _id: hotel._id,
            slug: hotel.slug,
            name: hotel.name,
            address: Object.values(hotel.address).join(", "),
            amenities: hotel.amenities.slice(0, 5),
            price: cheapestRoom.price,
            availableRoomsCount: hotel.rooms.length,
            rating: rating,
            totalReviews: totalReviewsCount,
            ratingScale: ratingScale || "N/A",
            image: hotel.images[0],
            liked: hotel.liked,
          };
        }),
      )
    ).filter(Boolean);

    const sParams = JSON.stringify(validate.data);
    const searchStateCookie = cookies().get("hotelSearchState")?.value;
    let isNewSearch = searchStateCookie !== sParams;

    return (
      <HotelSearchErrorBoundary
        onError={(error, errorInfo) => {
          console.error('HotelResultEnhanced error boundary triggered:', error, errorInfo);
          
          const boundaryError = ErrorFactory.genericError('Component error boundary triggered', {
            component: 'HotelResultEnhanced',
            errorInfo: errorInfo.componentStack,
            originalError: error.message
          });
          
          hotelSearchMonitoring.errorTracker.trackError(boundaryError, {
            traceId,
            errorBoundary: true,
            componentStack: errorInfo.componentStack
          });
        }}
        onReset={() => {
          hotelSearchMonitoring.logger.info('Hotel search boundary reset', { traceId });
        }}
      >
        <div className="w-full">
          {isNewSearch && (
            <SetCookies
              cookies={[
                {
                  name: "hotelSearchState",
                  value: sParams,
                  expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                },
              ]}
            />
          )}
          <div className="mb-10">
            <Jumper id={"hotelResults"} />
          </div>
          
          {!hotelResultsForCard?.length ? (
            <HotelSearchEmptyState
              onModifySearch={() => {
                hotelSearchMonitoring.metricsCollector.incrementCounter('empty_results_modify_search', {
                  traceId
                });
                window.location.href = '/hotels/search';
              }}
              onAlternativeSearch={(type) => {
                hotelSearchMonitoring.metricsCollector.incrementCounter('empty_results_alternative', {
                  type,
                  traceId
                });
                
                const url = new URL(window.location.href);
                if (type === 'dates') {
                  const checkIn = new Date(validate.data.checkIn);
                  const newDate = new Date(checkIn.setDate(checkIn.getDate() + 3));
                  url.searchParams.set('checkIn', newDate.toISOString().split('T')[0]);
                } else if (type === 'location') {
                  // Could implement nearby location logic
                  console.log('Nearby location alternative search');
                }
                window.location.href = url.toString();
              }}
            />
          ) : (
            <div className="space-y-4">
              {hotelResultsForCard.map((hotel) => (
                <HotelSearchErrorBoundary key={hotel._id}>
                  <HotelResultCard
                    hotel={hotel}
                    searchState={validate.data}
                    onError={(error) => {
                      hotelSearchMonitoring.errorTracker.trackError(error, {
                        component: 'HotelResultCard',
                        hotelId: hotel._id,
                        hotelName: hotel.name
                      });
                    }}
                  />
                </HotelSearchErrorBoundary>
              ))}
            </div>
          )}
        </div>
      </HotelSearchErrorBoundary>
    );

  } catch (error) {
    hotelSearchMonitoring.logger.error('Hotel search page error', {
      traceId,
      error: error.message,
      stack: error.stack
    });

    const structuredError = error instanceof Error ? error : ErrorFactory.genericError(error.message);

    hotelSearchMonitoring.errorTracker.trackError(structuredError, {
      traceId,
      component: 'HotelResultEnhancedPage',
      searchParams: params.hotelSearchParams
    });

    return (
      <HotelSearchErrorBoundary
        onError={(error, errorInfo) => {
          hotelSearchMonitoring.logger.error('Hotel search boundary error', {
            traceId,
            error: error.message,
            errorInfo
          });
        }}
      >
        <HotelSearchErrorHandler
          error={structuredError}
          onRetry={() => {
            hotelSearchMonitoring.metricsCollector.incrementCounter('hotel_search_retry', {
              traceId
            });
            window.location.reload();
          }}
          onAlternativeSearch={(type) => {
            hotelSearchMonitoring.metricsCollector.incrementCounter('hotel_search_alternative', {
              type,
              traceId
            });
            // Handle alternative search
            const url = new URL(window.location.href);
            if (type === 'dates') {
              const checkIn = new Date(params.checkIn);
              const newDate = new Date(checkIn.setDate(checkIn.getDate() + 1));
              url.searchParams.set('checkIn', newDate.toISOString().split('T')[0]);
            }
            window.location.href = url.toString();
          }}
          onContactSupport={() => {
            hotelSearchMonitoring.metricsCollector.incrementCounter('hotel_support_contacted', {
              traceId
            });
            window.open('/support', '_blank');
          }}
        />
      </HotelSearchErrorBoundary>
    );
  } finally {
    hotelSearchMonitoring.logger.setTraceId(null);
  }
}