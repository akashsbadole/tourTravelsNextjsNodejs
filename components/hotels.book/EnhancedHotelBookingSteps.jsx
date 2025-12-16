"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProgressStepper } from "@/components/local-ui/ProgressStepper";
import { toast } from "sonner";
import { EnhancedRoomSelector } from "@/hotels/EnhancedRoomSelector";
import { GuestInfoForm } from "./GuestInfoForm";
import { RoomBookingSummary } from "./RoomBookingSummary";
import { HotelBookingPayment } from "./HotelBookingPayment";
import { BookingConfirmation } from "./BookingConfirmation";
import { formatCurrency } from "@/lib/utils";
import { useRoomBookingState } from "@/hooks/useRoomBookingState";

const BOOKING_STEPS = [
  { label: "Guest Info", value: "guest_info" },
  { label: "Select Rooms", value: "select_rooms" },
  { label: "Customize Rooms", value: "customize_rooms" },
  { label: "Review Booking", value: "review" },
  { label: "Payment", value: "payment" },
  { label: "Confirmation", value: "confirmation" }
];

export function EnhancedHotelBookingSteps({
  hotelDetails,
  userDetails,
  initialStep = "guest_info"
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(initialStep);
  
  // Use booking state hook
  const {
    bookingState,
    loading: bookingLoading,
    error: bookingError,
    selectedRoomsCount,
    hasSelectedRooms,
    isGuestInfoComplete,
    hasValidDates,
    updateGuestInfo,
    updateCustomization,
    calculateTotal,
    validateState
  } = useRoomBookingState(hotelDetails._id);
  
  const [bookingData, setBookingData] = useState({
    guests: {
      adults: parseInt(searchParams.get('guests')) || 1,
      children: parseInt(searchParams.get('children')) || 0,
      infants: parseInt(searchParams.get('infants')) || 0,
      total: 1
    },
    dates: {
      checkIn: searchParams.get('checkIn'),
      checkOut: searchParams.get('checkOut'),
      nights: 0
    },
    rooms: [],
    customizations: {},
    guestDetails: userDetails || {},
    pricing: {
      subtotal: 0,
      taxes: 0,
      fees: 0,
      total: 0,
      deposit: 0
    }
  });

  // Calculate nights when dates change
  useEffect(() => {
    if (bookingData.dates.checkIn && bookingData.dates.checkOut) {
      const checkIn = new Date(bookingData.dates.checkIn);
      const checkOut = new Date(bookingData.dates.checkOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      setBookingData(prev => ({
        ...prev,
        dates: { ...prev.dates, nights },
        rooms: [] // Reset rooms when dates change
      }));
    }
  }, [bookingData.dates.checkIn, bookingData.dates.checkOut]);

  // Update URL when step changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', currentStep);
    router.replace(`${window.location.pathname}?${params.toString()}`);
  }, [currentStep]);

  const handleStepChange = (step) => {
    // Validate current step before proceeding
    if (!validateCurrentStep()) {
      return;
    }
    setCurrentStep(step);
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case "guest_info":
        return isGuestInfoComplete;
      case "select_rooms":
        return hasSelectedRooms;
      case "customize_rooms":
        return hasSelectedRooms;
      case "review":
        return hasSelectedRooms;
      case "payment":
        return hasSelectedRooms && hasValidDates;
      default:
        return true;
    }
  };

  const handleGuestInfoSubmit = async (guestData) => {
    const result = await updateGuestInfo(guestData);
    if (result.success) {
      setBookingData(prev => ({
        ...prev,
        guestDetails: guestData,
        guests: {
          ...prev.guests,
          ...guestData.guests
        }
      }));
      handleStepChange("select_rooms");
    } else {
      toast.error(result.error || 'Failed to update guest information');
    }
  };

  const handleRoomSelection = (selectedRooms) => {
    setBookingData(prev => ({
      ...prev,
      rooms: selectedRooms
    }));
    calculatePricing(selectedRooms);
  };

  const handleRoomCustomization = async (customizations) => {
    const result = await updateCustomization(customizations);
    if (result.success) {
      setBookingData(prev => ({
        ...prev,
        customizations: {
          ...prev.customizations,
          ...customizations
        }
      }));
      calculatePricing(bookingData.rooms, customizations);
    } else {
      toast.error(result.error || 'Failed to update room customization');
    }
  };

  const calculatePricing = async (rooms = bookingData.rooms, customizations = bookingData.customizations) => {
    if (rooms.length === 0) return;

    try {
      // Use booking state calculateTotal function
      const nights = bookingData.dates.nights ||
        Math.ceil((new Date(bookingData.dates.checkOut) - new Date(bookingData.dates.checkIn)) / (1000 * 60 * 60 * 24));
      
      const result = await calculateTotal(nights, bookingState?.promoCode);
      
      if (result.success) {
        setBookingData(prev => ({
          ...prev,
          pricing: {
            subtotal: result.data.subtotal,
            taxes: result.data.taxes || 0,
            fees: result.data.fees || 0,
            total: result.data.total,
            deposit: result.data.deposit || 0,
            breakdown: result.data.breakdown || []
          }
        }));
      } else {
        toast.error(result.error || 'Failed to calculate pricing');
      }

    } catch (error) {
      console.error('Error calculating pricing:', error);
      toast.error('Failed to calculate room pricing');
    }
  };

  const handlePayment = (paymentData) => {
    setBookingData(prev => ({
      ...prev,
      payment: paymentData
    }));
    handleStepChange("confirmation");
  };

  const handleBookingComplete = (bookingResult) => {
    toast.success('Booking completed successfully!');
    // Redirect to booking confirmation or user bookings
    router.push('/user/my_bookings/hotels');
  };

  const getStepContent = () => {
    switch (currentStep) {
      case "guest_info":
        return (
          <GuestInfoForm
            initialData={bookingData.guestDetails}
            initialGuests={bookingData.guests}
            onSubmit={handleGuestInfoSubmit}
            hotelPolicies={hotelDetails.policies}
          />
        );

      case "select_rooms":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Select Your Rooms</h2>
              <p className="text-muted-foreground">
                Choose from available rooms for your stay from {bookingData.dates.checkIn} to {bookingData.dates.checkOut}
              </p>
            </div>
            
            <EnhancedRoomSelector
              hotelId={hotelDetails._id}
              initialFilters={{}}
              initialSearchDates={bookingData.dates}
              initialGuestCount={bookingData.guests.total}
              onRoomSelect={handleRoomSelection}
              onFiltersChange={(filters) => {
                setBookingData(prev => ({ ...prev, filters }));
              }}
            />
          </div>
        );

      case "customize_rooms":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Customize Your Rooms</h2>
              <p className="text-muted-foreground">
                Add special requests and preferences for your selected rooms
              </p>
            </div>
            
            <RoomCustomizationForm
              rooms={bookingData.rooms}
              customizations={bookingData.customizations}
              onCustomizationChange={handleRoomCustomization}
              hotelPolicies={hotelDetails.policies}
            />
          </div>
        );

      case "review":
        return (
          <RoomBookingSummary
            hotelDetails={hotelDetails}
            bookingData={bookingData}
            onEdit={() => handleStepChange("select_rooms")}
            onProceed={() => handleStepChange("payment")}
          />
        );

      case "payment":
        return (
          <HotelBookingPayment
            hotelDetails={hotelDetails}
            bookingData={bookingData}
            onPaymentComplete={handlePayment}
            onBack={() => handleStepChange("review")}
          />
        );

      case "confirmation":
        return (
          <BookingConfirmation
            hotelDetails={hotelDetails}
            bookingData={bookingData}
            onComplete={handleBookingComplete}
          />
        );

      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    const stepIndex = BOOKING_STEPS.findIndex(step => step.value === currentStep);
    return ((stepIndex + 1) / BOOKING_STEPS.length) * 100;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Progress Stepper */}
      <div className="sticky top-4 z-40 bg-background py-4">
        <ProgressStepper
          steps={BOOKING_STEPS}
          currentStepValue={currentStep}
          onCurrentValueChange={handleStepChange}
          className="max-w-4xl mx-auto"
        />
      </div>

      {/* Booking Summary Sidebar */}
      <div className="flex gap-6">
        <div className="flex-1">
          {getStepContent()}
        </div>
        
        <div className="w-80 space-y-4">
          {/* Hotel Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{hotelDetails.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Check-in:</span>
                  <span className="font-medium">{bookingData.dates.checkIn}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Check-out:</span>
                  <span className="font-medium">{bookingData.dates.checkOut}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Nights:</span>
                  <span className="font-medium">{bookingData.dates.nights}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Guests:</span>
                  <span className="font-medium">{bookingData.guests.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Rooms:</span>
                  <span className="font-medium">{selectedRoomsCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bookingData.pricing.subtotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(bookingData.pricing.subtotal)}</span>
                  </div>
                )}
                
                {bookingData.pricing.taxes > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Taxes:</span>
                    <span>{formatCurrency(bookingData.pricing.taxes)}</span>
                  </div>
                )}
                
                {bookingData.pricing.fees > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Fees:</span>
                    <span>{formatCurrency(bookingData.pricing.fees)}</span>
                  </div>
                )}
                
                <Separator />
                
                {bookingData.pricing.deposit > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Deposit Required:</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(bookingData.pricing.deposit)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(bookingData.pricing.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Rooms */}
          {hasSelectedRooms && bookingState?.selectedRooms && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookingState.selectedRooms.map((room, index) => (
                    <div key={room.roomId} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{room.roomName || room.roomType}</div>
                        <div className="text-muted-foreground">
                          {room.quantity}x • {room.capacity?.adults || 1} guests
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(room.price?.base || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Indicator */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">
              Booking Progress
            </div>
            <div className="relative w-16 h-16 mx-auto">
              <svg className="transform -rotate-90 w-16 h-16">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="currentColor"
                  className="text-primary transition-all duration-300"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - getProgressPercentage() / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">
                  {Math.round(getProgressPercentage())}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Room Customization Form Component
function RoomCustomizationForm({ rooms, customizations, onCustomizationChange, hotelPolicies }) {
  const [localCustomizations, setLocalCustomizations] = useState(customizations);

  const handleCustomizationChange = (roomId, field, value) => {
    const newCustomizations = {
      ...localCustomizations,
      [roomId]: {
        ...localCustomizations[roomId],
        [field]: value
      }
    };
    setLocalCustomizations(newCustomizations);
    onCustomizationChange(newCustomizations);
  };

  return (
    <div className="space-y-6">
      {rooms.map((roomSelection) => (
        <Card key={roomSelection.roomId}>
          <CardHeader>
            <CardTitle className="text-lg">{roomSelection.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bed Type Preference */}
            <div>
              <label className="text-sm font-medium mb-2 block">Bed Type Preference</label>
              <select
                value={localCustomizations[roomSelection.roomId]?.bedType || ''}
                onChange={(e) => handleCustomizationChange(roomSelection.roomId, 'bedType', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">No preference</option>
                <option value="king">King Bed</option>
                <option value="queen">Queen Bed</option>
                <option value="double">Double Bed</option>
                <option value="twin">Twin Beds</option>
              </select>
            </div>

            {/* View Preference */}
            <div>
              <label className="text-sm font-medium mb-2 block">View Preference</label>
              <select
                value={localCustomizations[roomSelection.roomId]?.viewPreference || ''}
                onChange={(e) => handleCustomizationChange(roomSelection.roomId, 'viewPreference', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">No preference</option>
                <option value="city">City View</option>
                <option value="garden">Garden View</option>
                <option value="pool">Pool View</option>
                <option value="ocean">Ocean View</option>
                <option value="mountain">Mountain View</option>
              </select>
            </div>

            {/* Floor Preference */}
            <div>
              <label className="text-sm font-medium mb-2 block">Floor Preference</label>
              <input
                type="number"
                min="1"
                max="50"
                value={localCustomizations[roomSelection.roomId]?.floorPreference || ''}
                onChange={(e) => handleCustomizationChange(roomSelection.roomId, 'floorPreference', e.target.value)}
                placeholder="No preference"
                className="w-full p-2 border rounded-md"
              />
            </div>

            {/* Special Requests */}
            <div>
              <label className="text-sm font-medium mb-2 block">Special Requests</label>
              <textarea
                value={localCustomizations[roomSelection.roomId]?.specialRequests || ''}
                onChange={(e) => handleCustomizationChange(roomSelection.roomId, 'specialRequests', e.target.value)}
                placeholder="Any special requests or requirements..."
                rows={3}
                className="w-full p-2 border rounded-md resize-none"
              />
            </div>

            {/* Smoking Preference */}
            {hotelPolicies?.smokingAllowed && (
              <div>
                <label className="text-sm font-medium mb-2 block">Smoking Preference</label>
                <select
                  value={localCustomizations[roomSelection.roomId]?.smokingPreference || 'non_smoking'}
                  onChange={(e) => handleCustomizationChange(roomSelection.roomId, 'smokingPreference', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="non_smoking">Non-smoking</option>
                  <option value="smoking">Smoking</option>
                  <option value="either">No preference</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default EnhancedHotelBookingSteps;