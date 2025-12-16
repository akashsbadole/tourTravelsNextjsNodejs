"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { MobileButton } from "./MobileButton";
import { 
  Plane, 
  Clock, 
  Users, 
  ChevronDown, 
  ChevronUp,
  Luggage,
  Wifi,
  Coffee,
  Tv,
  Heart,
  Share2
} from "lucide-react";
import { format } from "date-fns";

const MobileFlightResultCard = ({
  flight,
  className,
  onSelect,
  onFavorite,
  loading = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(flight.isFavorite || false);

  const {
    airline,
    flightNumber,
    departure,
    arrival,
    duration,
    price,
    stops,
    aircraft,
    amenities,
    baggage,
    seatsAvailable,
  } = flight;

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString) => {
    return format(new Date(dateString), "HH:mm");
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), "EEE, MMM d");
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    onFavorite?.(flight, !isFavorite);
  };

  const handleSelect = () => {
    onSelect?.(flight);
  };

  const getStopText = (stops) => {
    if (stops === 0) return "Non-stop";
    if (stops === 1) return "1 Stop";
    return `${stops} Stops`;
  };

  return (
    <div className={cn("bg-card rounded-2xl shadow-md overflow-hidden", className)}>
      {/* Header with Airline Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Plane className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{airline.name}</p>
              <p className="text-sm text-muted-foreground">{flightNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <MobileButton
              variant="ghost"
              size="compact"
              onClick={handleFavorite}
              className="p-2"
            >
              <Heart 
                className={cn(
                  "h-5 w-5",
                  isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"
                )} 
              />
            </MobileButton>
            <MobileButton
              variant="ghost"
              size="compact"
              className="p-2"
            >
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </MobileButton>
          </div>
        </div>

        {/* Flight Route */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{formatTime(departure.time)}</p>
            <p className="text-sm text-muted-foreground">{departure.city}</p>
            <p className="text-xs text-muted-foreground">{formatDate(departure.time)}</p>
          </div>
          
          <div className="flex-1 px-4">
            <div className="relative">
              <div className="h-0.5 bg-border mb-2"></div>
              <Plane className="h-4 w-4 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background" />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {formatDuration(duration)} • {getStopText(stops)}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{formatTime(arrival.time)}</p>
            <p className="text-sm text-muted-foreground">{arrival.city}</p>
            <p className="text-xs text-muted-foreground">{formatDate(arrival.time)}</p>
          </div>
        </div>
      </div>

      {/* Price and Quick Actions */}
      <div className="p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-primary">${price}</p>
            <p className="text-sm text-muted-foreground">
              {seatsAvailable} seats left
            </p>
          </div>
          
          <MobileButton
            variant="primary"
            size="comfortable"
            onClick={handleSelect}
            loading={loading}
          >
            Select
          </MobileButton>
        </div>
      </div>

      {/* Expandable Details */}
      <div className="border-t border-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <span className="font-medium text-foreground">Flight Details</span>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        
        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Aircraft Info */}
            <div>
              <p className="font-medium text-foreground mb-2">Aircraft</p>
              <p className="text-sm text-muted-foreground">{aircraft}</p>
            </div>

            {/* Baggage Info */}
            <div>
              <p className="font-medium text-foreground mb-2">Baggage</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Luggage className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Cabin: {baggage.cabin}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Luggage className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Checked: {baggage.checked}
                  </span>
                </div>
              </div>
            </div>

            {/* Amenities */}
            {amenities && amenities.length > 0 && (
              <div>
                <p className="font-medium text-foreground mb-2">Amenities</p>
                <div className="grid grid-cols-2 gap-2">
                  {amenities.includes("wifi") && (
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Wi-Fi</span>
                    </div>
                  )}
                  {amenities.includes("meal") && (
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Meal</span>
                    </div>
                  )}
                  {amenities.includes("entertainment") && (
                    <div className="flex items-center gap-2">
                      <Tv className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Entertainment</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stop Details */}
            {stops > 0 && flight.stopDetails && (
              <div>
                <p className="font-medium text-foreground mb-2">Stop Details</p>
                {flight.stopDetails.map((stop, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    <p>{stop.city} - {stop.duration} layover</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { MobileFlightResultCard };