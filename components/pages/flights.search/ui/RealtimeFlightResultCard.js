"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Loader, RefreshCw, Clock, Users, AlertCircle } from "lucide-react";

import airlinesLogos from "@/data/airlinesLogos";
import { RATING_SCALE } from "@/lib/constants";
import { minutesToHMFormat } from "@/lib/utils";
import { RatingShow } from "@/components/local-ui/ratingShow";
import { cn } from "@/lib/utils";
import Link from "next/link";
import NoSSR from "@/components/helpers/NoSSR";
import ShowTimeInClientSide from "@/components/helpers/ShowTimeInClientSide";

/**
 * Real-time Flight Result Card Component
 * Displays flight with real-time availability and pricing
 */
export function RealtimeFlightResultCard({ data, searchState, metaData, onRefresh }) {
  const [isLoading, setIsLoading] = useState(false);
  const [realtimeData, setRealtimeData] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Initialize real-time data
  useEffect(() => {
    if (data.realtimeAvailability) {
      setRealtimeData(data.realtimeAvailability);
      setLastRefresh(data.realtimeAvailability.lastChecked);
    }
  }, [data.realtimeAvailability]);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (!onRefresh || isLoading) return;

    setIsLoading(true);
    try {
      await onRefresh(data.id || data._id);
      setLastRefresh(new Date().toISOString());
    } catch (error) {
      console.error('Failed to refresh flight data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate time since last update
  const getTimeSinceUpdate = () => {
    if (!lastRefresh) return null;
    
    const now = new Date();
    const lastUpdate = new Date(lastRefresh);
    const diffMs = now - lastUpdate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  // Get availability status
  const getAvailabilityStatus = () => {
    if (!realtimeData) return { status: 'unknown', color: 'secondary', text: 'Checking...' };
    
    if (realtimeData.available && realtimeData.seats > 0) {
      return { 
        status: 'available', 
        color: 'green', 
        text: `${realtimeData.seats} seats available` 
      };
    }
    
    return { 
      status: 'unavailable', 
      color: 'red', 
      text: 'No seats available' 
    };
  };

  const availabilityStatus = getAvailabilityStatus();
  const timeSinceUpdate = getTimeSinceUpdate();

  return (
    <div
      className={cn(
        "shadow-small relative flex h-min rounded-l-[8px] rounded-r-[8px] bg-white text-[0.75rem] font-medium text-secondary shadow-md max-md:flex-col",
        metaData.isExpired && "opacity-50"
      )}
    >
      {/* Real-time Status Badge */}
      <div className="absolute left-2 top-2 z-10 flex items-center gap-2">
        {realtimeData && (
          <Badge 
            variant={availabilityStatus.color === 'green' ? 'default' : 'destructive'}
            className="text-xs"
          >
            <div className="flex items-center gap-1">
              {availabilityStatus.status === 'available' ? (
                <Users className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {availabilityStatus.text}
            </div>
          </Badge>
        )}
        
        {timeSinceUpdate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeSinceUpdate}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="absolute right-2 top-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          {isLoading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expired Badge */}
      {metaData.isExpired && (
        <span className="absolute left-2 top-2 rounded-lg bg-black p-2 text-sm font-bold text-white">
          Expired
        </span>
      )}

      <div className="aspect-square h-auto w-full max-md:h-[200px] md:w-[300px]">
        <Image
          width={300}
          height={300}
          className="h-full w-full rounded-l-[12px] object-contain p-5 max-md:rounded-r-[8px]"
          src={airlinesLogos[data?.airline?.code] || airlinesLogos[data?.carrierInCharge?._id]}
          alt={data?.airline?.name || data?.carrierInCharge?._id}
        />
      </div>

      <div className="h-min w-full p-[24px]">
        <div>
          <div className="mb-[16px] flex items-center justify-between">
            <div className="flex items-center gap-[4px]">
              <RatingShow rating={data.ratingReviews?.rating || 0} />
              <span className="font-bold">
                {Math.floor(data.ratingReviews?.rating || 0) > 0
                  ? RATING_SCALE[Math.floor(data.ratingReviews?.rating || 0)]
                  : "N/A"}
              </span>
              <span>{data.ratingReviews?.totalReviews || 0} reviews</span>
            </div>
            
            <div className="text-right">
              <p className="text-[0.875rem] text-secondary/75">
                starting from
              </p>
              <p className="flex items-center gap-1 text-right text-[1.5rem] font-bold text-tertiary">
                {/* Use real-time pricing if available */}
                {realtimeData?.pricing ? (
                  <span>
                    ${typeof realtimeData.pricing.total === 'number' 
                      ? realtimeData.pricing.total.toFixed(2) 
                      : realtimeData.pricing.total}
                  </span>
                ) : (
                  <span>
                    ${typeof data.pricing?.total === 'number' 
                      ? data.pricing.total.toFixed(2) 
                      : data.pricing?.total || '0.00'}
                  </span>
                )}
              </p>
              <p className="text-right text-xs text-secondary/60">
                + taxes & fees
                {realtimeData?.source && (
                  <span className="ml-1 text-xs text-blue-600">
                    (Live)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Flight Segments */}
          {data.segments?.map((segment, index) => {
            const segmentAvailability = realtimeData?.segments?.find(
              seg => seg.segmentId === segment._id
            );
            
            return (
              <div key={segment.from?.airport?.iataCode + index}>
                <div className="mb-[16px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-[12px]">
                      <div className="mt-1 h-[18px] min-h-[18px] w-[18px] min-w-[18px] rounded-sm border-2 border-secondary/25"></div>
                      <div>
                        <p className="text-[1rem] font-semibold">
                          <NoSSR fallback={"hh:mm aaa"}>
                            <ShowTimeInClientSide
                              date={new Date(segment?.from?.scheduledDeparture)}
                              formatStr="hh:mm aaa"
                            />
                          </NoSSR>
                          {" - "}
                          <NoSSR fallback={"hh:mm aaa"}>
                            <ShowTimeInClientSide
                              date={new Date(segment?.to?.scheduledArrival)}
                              formatStr="hh:mm aaa"
                            />
                          </NoSSR>
                        </p>
                        <p className="text-[0.875rem] text-secondary/40">
                          {segment.airlineId?._id || segment.carrierCode}
                        </p>
                      </div>
                    </div>
                    
                    <p className="font-semibold text-secondary/75">
                      {data.segments?.length === 1 && "non stop"}
                    </p>
                    
                    <div>
                      <p className="text-right font-bold text-secondary/75">
                        {minutesToHMFormat(+segment?.durationMinutes || segment?.duration)}
                      </p>
                      <p className="text-[0.875rem] text-secondary/40">
                        {segment?.from?.airport?.iataCode || segment.from?.airport}-
                        {segment?.to?.airport?.iataCode || segment.to?.airport}
                      </p>
                    </div>
                  </div>
                  
                  {/* Real-time availability for this segment */}
                  {segmentAvailability && (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={segmentAvailability.availableSeats > 0 ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {segmentAvailability.availableSeats} seats
                        </Badge>
                        {segmentAvailability.status && (
                          <Badge variant="outline" className="text-xs">
                            {segmentAvailability.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Layover Information */}
                {index !== data.segments?.length - 1 && data.segments?.length > 1 && (
                  <div className="text-center">
                    <p className="font-semibold text-secondary/75">
                      {`${data.segments?.length - 1} stop(s)`}
                    </p>
                    <p>
                      {minutesToHMFormat(
                        data?.layovers?.find(
                          layover => +layover.fromSegmentIndex === index,
                        )?.durationMinutes,
                      )}{" "}
                      layover
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Separator className="my-[24px]" />
        
        <div className="flex gap-[16px]">
          <Button className={"w-full"} asChild>
            <Link
              target="_blank"
              href={`/flights/${data.flightCode}_${new Date(data.date || data.departure?.scheduledTime).getTime()}`}
            >
              View Deals
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for real-time flight card
 */
export function RealtimeFlightResultCardSkeleton() {
  return (
    <div className="shadow-small relative flex h-min rounded-l-[8px] rounded-r-[8px] bg-white text-[0.75rem] font-medium text-secondary shadow-md max-md:flex-col">
      <div className="aspect-square h-auto w-full max-md:h-[200px] md:w-[300px]">
        <Skeleton className="h-full w-full rounded-l-[12px] max-md:rounded-r-[8px]" />
      </div>
      <div className="h-min w-full p-[24px]">
        <div className="mb-[16px] flex items-center justify-between">
          <div className="flex items-center gap-[4px]">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="text-right">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="mt-1 h-3 w-16" />
          </div>
        </div>
        
        {/* Flight segment skeleton */}
        <div className="mb-[16px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-[12px]">
              <Skeleton className="h-4 w-4" />
              <div>
                <Skeleton className="mb-2 h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-16" />
            <div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
        
        <Separator className="my-[24px]" />
        
        <div className="flex gap-[16px]">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}