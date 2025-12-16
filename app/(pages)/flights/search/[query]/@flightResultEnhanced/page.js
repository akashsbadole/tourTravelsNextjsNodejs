import { FlightResultEnhanced } from "@/components/pages/flights.search/sections/FlightResultEnhanced";
import { cookies } from "next/headers";
import validateFlightSearchParams from "@/lib/zodSchemas/flightSearchParams";
import { getUserDetails } from "@/lib/services/user";
import { getFlights } from "@/lib/services/flights";
import {
  airportStrToObject,
  parseFlightSearchParams,
  passengerStrToObject,
} from "@/lib/utils";
import SetFlightFormState from "@/components/helpers/SetFlightFormState";
import SetCookies from "@/components/helpers/SetCookies";
import SessionTimeoutCountdown from "@/components/local-ui/SessionTimeoutCountdown";
import Jumper from "@/components/local-ui/Jumper";
import { SetLocalStorage } from "@/components/helpers/SetLocalStorage";
import { defaultFlightFormValue } from "@/reduxStore/features/flightFormSlice";
import { auth } from "@/lib/auth";
import extractFilterObjFromSearchParams from "@/lib/helpers/flights/extractFilterObjFromSearchParams";
import validateFlightSearchFilter from "@/lib/zodSchemas/flightSearchFilterValidation";
import { edgeCaseHandler } from "@/lib/flight-search/edge-case-handler";
import { gracefulDegradationManager } from "@/lib/flight-search/graceful-degradation";
import { flightSearchMonitoring } from "@/lib/monitoring/flight-search-monitoring";
import { ErrorFactory } from "@/lib/errors/flight-search-errors";

async function FlightResultEnhancedPage({ params }) {
  const traceId = flightSearchMonitoring.logger.generateTraceId();
  flightSearchMonitoring.logger.setTraceId(traceId);

  try {
    const decoded = decodeURIComponent(params.query);
    const pObj = Object.fromEntries(new URLSearchParams(decoded));

    // Enhanced validation with edge case handling
    const validation = await edgeCaseHandler.validateSearchParams(pObj);
    
    if (!validation.valid) {
      flightSearchMonitoring.logger.warn('Flight search validation failed', {
        traceId,
        errors: validation.errors,
        searchParams: pObj
      });

      const createValidSearchParams = (params, errors) => {
        const validParams = {};

        if (!errors.from) validParams.from = airportStrToObject(params.from);
        if (!errors.to) validParams.to = airportStrToObject(params.to);
        if (!errors.tripType) validParams.tripType = params.tripType;
        if (!errors.desiredDepartureDate)
          validParams.desiredDepartureDate = params.desiredDepartureDate;
        if (!errors.desiredReturnDate)
          validParams.desiredReturnDate = params.desiredReturnDate;
        if (!errors.class) validParams.class = params.class;
        const passengerRegex = /adults-\d+_children-\d+_infants-\d+/;
        if (passengerRegex.test(params.passengers))
          validParams.passengers = passengerStrToObject(params.passengers);

        return validParams;
      };

      const validSearchParams = createValidSearchParams(pObj, validation.errors);
      
      // Track validation errors
      validation.errors.forEach(error => {
        flightSearchMonitoring.errorTracker.trackError(
          ErrorFactory.validationError(error.error, {
            field: error.field,
            suggestions: error.suggestions
          }),
          {
            traceId,
            component: 'FlightResultEnhancedPage',
            validationError: error
          }
        );
      });

      return (
        <SetFlightFormState
          obj={{
            ...defaultFlightFormValue,
            ...validSearchParams,
            errors: validation.errors.reduce((acc, err) => {
              acc[err.field] = err.error;
              return acc;
            }, {}),
          }}
        />
      );
    }

    const filterParamsObj = extractFilterObjFromSearchParams(params.query);
    const validateFilterParams = validateFlightSearchFilter(filterParamsObj);

    const finalFilterParams = validateFilterParams?.data || {};
    const sParams = JSON.stringify(validation.validParams);
    const searchStateCookie = cookies().get("flightSearchState")?.value;
    let isNewSearch = searchStateCookie !== sParams;

    const formData = new FormData();
    Object.entries(validation.validParams).forEach(([key, value]) => formData.append(key, value));

    const session = await auth();

    let userDetails;
    const timeZone = cookies().get("timeZone")?.value || "UTC";
    if (session?.user) {
      userDetails = await getUserDetails(session.user.id);
    }

    const parsedSearchParams = parseFlightSearchParams(validation.validParams);
    const {
      from,
      to,
      tripType,
      desiredDepartureDate,
      desiredReturnDate,
      class: flightClass,
      passengers,
    } = parsedSearchParams;

    const departureDate = new Date(desiredDepartureDate);
    const returnDate = new Date(desiredReturnDate);

    // Enhanced flight search with graceful degradation
    const searchOperation = async (searchParams) => {
      return await getFlights(
        {
          departureAirportCode: searchParams.from.iataCode,
          arrivalAirportCode: searchParams.to.iataCode,
          departureDate,
          returnDate,
          tripType,
          flightClass,
          passengersObj: searchParams.passengers,
          filters: finalFilterParams,
        },
        userDetails?.flights?.bookmarked,
        {
          timeZone,
        },
      );
    };

    const flightResults = await gracefulDegradationManager.executeSearch(
      {
        origin: from.iataCode,
        destination: to.iataCode,
        departureDate,
        returnDate,
        tripType,
        cabinClass: flightClass,
        passengers
      },
      searchOperation,
      {
        skipCache: isNewSearch
      }
    );

    const metaData = {
      flightClass: flightClass,
      timeZone,
      source: flightResults.source || 'api',
      isFallback: flightResults.metadata?.isFallback || false,
      originalError: flightResults.metadata?.originalError
    };

    const sessionTimeout = cookies().get("sessionTimeoutAt")?.value || 0;
    const isSessionExpired = +sessionTimeout < Date.now();
    const shouldUpdateLatestSearchstate = isNewSearch || isSessionExpired;
    const newSessionTimeout = Date.now() + 1000 * 1200;

    // Track successful search
    flightSearchMonitoring.metricsCollector.incrementCounter('search_completed', {
      traceId,
      origin: from.iataCode,
      destination: to.iataCode,
      source: flightResults.source,
      resultCount: flightResults.data?.length || 0,
      isFallback: metaData.isFallback
    });

    if (!flightResults.data || flightResults.data.length < 1) {
      // Get alternative search suggestions
      const alternatives = await edgeCaseHandler.getAlternativeSearchSuggestions({
        origin: from.iataCode,
        destination: to.iataCode,
        departureDate,
        passengers,
        cabinClass: flightClass
      });

      flightSearchMonitoring.logger.info('No flights found, providing alternatives', {
        traceId,
        searchParams: parsedSearchParams,
        alternatives: alternatives
      });

      return (
        <>
          <Jumper id="flightResult" />
          <SetLocalStorage
            obj={{
              sessionTimeoutAt: newSessionTimeout,
            }}
          />
          {shouldUpdateLatestSearchstate && (
            <SetCookies
              cookies={[
                {
                  name: "flightSearchState",
                  value: sParams,
                  expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                },
              ]}
            />
          )}
          <FlightResultEnhanced
            flightResults={[]}
            searchState={{
              ...parsedSearchParams,
              passengers: {
                adult: passengers.adults,
                child: passengers.children,
                infant: passengers.infants,
              },
            }}
            metaData={metaData}
            error={ErrorFactory.noFlightsFound(parsedSearchParams)}
          />
        </>
      );
    }

    return (
      <>
        <SetLocalStorage
          obj={{
            sessionTimeoutAt: newSessionTimeout,
          }}
        />

        {shouldUpdateLatestSearchstate && (
          <SetCookies
            cookies={[
              {
                name: "flightSearchState",
                value: sParams,
                expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
              },
            ]}
          />
        )}
        <div>
          <Jumper id="flightResult" />
          <SessionTimeoutCountdown
            redirectionLink="/flights/search"
            className={"mb-2 rounded-md"}
            jumpToId={"flightFormJump"}
          />
          <FlightResultEnhanced
            flightResults={flightResults.data}
            searchState={{
              ...parsedSearchParams,
              passengers: {
                adult: passengers.adults,
                child: passengers.children,
                infant: passengers.infants,
              },
            }}
            metaData={metaData}
          />
        </div>
      </>
    );

  } catch (error) {
    // Comprehensive error handling
    flightSearchMonitoring.logger.error('Flight search page error', {
      traceId,
      error: error.message,
      stack: error.stack
    });

    const structuredError = error instanceof Error ? error : ErrorFactory.genericError(error.message);

    flightSearchMonitoring.errorTracker.trackError(structuredError, {
      traceId,
      component: 'FlightResultEnhancedPage',
      searchParams: params.query
    });

    return (
      <>
        <Jumper id="flightResult" />
        <FlightResultEnhanced
          flightResults={[]}
          searchState={{}}
          metaData={{}}
          error={structuredError}
        />
      </>
    );
  } finally {
    flightSearchMonitoring.logger.setTraceId(null);
  }
}

export default FlightResultEnhancedPage;