"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { MobileButton } from "./MobileButton";
import { MobileInput } from "./MobileInput";
import { 
  Plane, 
  Calendar, 
  Users, 
  ArrowRightLeft,
  MapPin,
  Search,
  ChevronDown,
  Plus,
  Minus
} from "lucide-react";
import { FlightPassengerAndClassSelector } from "@/components/local-ui/FlightPassengerAndClassSelector";
import { FlightFromToPopover } from "@/components/local-ui/FlightFromToPopover";

const MobileFlightSearch = ({
  className,
  onSearch,
  initialValues = {},
  loading = false,
}) => {
  const [tripType, setTripType] = useState(initialValues.tripType || "roundtrip");
  const [from, setFrom] = useState(initialValues.from || "");
  const [to, setTo] = useState(initialValues.to || "");
  const [departureDate, setDepartureDate] = useState(initialValues.departureDate || "");
  const [returnDate, setReturnDate] = useState(initialValues.returnDate || "");
  const [passengers, setPassengers] = useState(initialValues.passengers || {
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [travelClass, setTravelClass] = useState(initialValues.travelClass || "economy");
  const [showPassengerSelector, setShowPassengerSelector] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSwapLocations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handlePassengerChange = (type, action) => {
    setPassengers(prev => {
      const newValue = action === "increase" 
        ? prev[type] + 1 
        : Math.max(0, prev[type] - 1);
      
      return {
        ...prev,
        [type]: newValue,
      };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!from) newErrors.from = "Please select departure city";
    if (!to) newErrors.to = "Please select destination city";
    if (!departureDate) newErrors.departureDate = "Please select departure date";
    if (tripType === "roundtrip" && !returnDate) {
      newErrors.returnDate = "Please select return date";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = () => {
    if (validateForm()) {
      const searchData = {
        tripType,
        from,
        to,
        departureDate,
        returnDate: tripType === "oneway" ? null : returnDate,
        passengers,
        travelClass,
      };
      
      onSearch?.(searchData);
    }
  };

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;
  const passengerText = totalPassengers === 1 ? "1 Passenger" : `${totalPassengers} Passengers`;

  return (
    <div className={cn("bg-card rounded-2xl p-4 shadow-lg", className)}>
      {/* Trip Type Selector */}
      <div className="flex gap-2 mb-4">
        <MobileButton
          variant={tripType === "roundtrip" ? "primary" : "outline"}
          size="compact"
          onClick={() => setTripType("roundtrip")}
          className="flex-1"
        >
          Round Trip
        </MobileButton>
        <MobileButton
          variant={tripType === "oneway" ? "primary" : "outline"}
          size="compact"
          onClick={() => setTripType("oneway")}
          className="flex-1"
        >
          One Way
        </MobileButton>
      </div>

      {/* From/To Locations */}
      <div className="relative mb-4">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <MobileButton
            variant="ghost"
            size="compact"
            onClick={handleSwapLocations}
            className="p-2 rounded-full bg-background border-2 border-border shadow-md"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </MobileButton>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <MobileInput
              type="text"
              placeholder="From where?"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              error={errors.from}
              className="pl-10"
            />
          </div>
          
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <MobileInput
              type="text"
              placeholder="To where?"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              error={errors.to}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Date Selection */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <MobileInput
          type="date"
          label="Departure"
          placeholder="Select date"
          value={departureDate}
          onChange={(e) => setDepartureDate(e.target.value)}
          error={errors.departureDate}
          minDate={new Date()}
        />
        
        {tripType === "roundtrip" && (
          <MobileInput
            type="date"
            label="Return"
            placeholder="Select date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            error={errors.returnDate}
            minDate={departureDate ? new Date(departureDate) : new Date()}
          />
        )}
      </div>

      {/* Passengers and Class */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowPassengerSelector(!showPassengerSelector)}
          className="w-full p-4 border-2 border-input rounded-lg bg-background hover:border-primary transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium text-foreground">{passengerText}</p>
                <p className="text-sm text-muted-foreground capitalize">{travelClass}</p>
              </div>
            </div>
            <ChevronDown 
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                showPassengerSelector && "rotate-180"
              )} 
            />
          </div>
        </button>

        {/* Passenger Selector Dropdown */}
        {showPassengerSelector && (
          <div className="mt-2 p-4 border-2 border-border rounded-lg bg-card space-y-4">
            {/* Adults */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Adults</p>
                <p className="text-sm text-muted-foreground">12+ years</p>
              </div>
              <div className="flex items-center gap-2">
                <MobileButton
                  variant="outline"
                  size="compact"
                  onClick={() => handlePassengerChange("adults", "decrease")}
                  disabled={passengers.adults <= 1}
                  className="p-2"
                >
                  <Minus className="h-4 w-4" />
                </MobileButton>
                <span className="w-8 text-center font-medium">{passengers.adults}</span>
                <MobileButton
                  variant="outline"
                  size="compact"
                  onClick={() => handlePassengerChange("adults", "increase")}
                  className="p-2"
                >
                  <Plus className="h-4 w-4" />
                </MobileButton>
              </div>
            </div>

            {/* Children */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Children</p>
                <p className="text-sm text-muted-foreground">2-11 years</p>
              </div>
              <div className="flex items-center gap-2">
                <MobileButton
                  variant="outline"
                  size="compact"
                  onClick={() => handlePassengerChange("children", "decrease")}
                  disabled={passengers.children <= 0}
                  className="p-2"
                >
                  <Minus className="h-4 w-4" />
                </MobileButton>
                <span className="w-8 text-center font-medium">{passengers.children}</span>
                <MobileButton
                  variant="outline"
                  size="compact"
                  onClick={() => handlePassengerChange("children", "increase")}
                  className="p-2"
                >
                  <Plus className="h-4 w-4" />
                </MobileButton>
              </div>
            </div>

            {/* Infants */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Infants</p>
                <p className="text-sm text-muted-foreground">Under 2 years</p>
              </div>
              <div className="flex items-center gap-2">
                <MobileButton
                  variant="outline"
                  size="compact"
                  onClick={() => handlePassengerChange("infants", "decrease")}
                  disabled={passengers.infants <= 0}
                  className="p-2"
                >
                  <Minus className="h-4 w-4" />
                </MobileButton>
                <span className="w-8 text-center font-medium">{passengers.infants}</span>
                <MobileButton
                  variant="outline"
                  size="compact"
                  onClick={() => handlePassengerChange("infants", "increase")}
                  className="p-2"
                >
                  <Plus className="h-4 w-4" />
                </MobileButton>
              </div>
            </div>

            {/* Travel Class */}
            <div>
              <p className="font-medium text-foreground mb-2">Travel Class</p>
              <div className="grid grid-cols-2 gap-2">
                {["economy", "premium", "business", "first"].map((classOption) => (
                  <MobileButton
                    key={classOption}
                    variant={travelClass === classOption ? "primary" : "outline"}
                    size="compact"
                    onClick={() => setTravelClass(classOption)}
                    className="capitalize"
                  >
                    {classOption}
                  </MobileButton>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Button */}
      <MobileButton
        variant="primary"
        size="comfortable"
        onClick={handleSearch}
        loading={loading}
        className="w-full"
      >
        <Search className="h-5 w-5 mr-2" />
        Search Flights
      </MobileButton>
    </div>
  );
};

export { MobileFlightSearch };