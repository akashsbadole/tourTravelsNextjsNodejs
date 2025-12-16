"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { MobileButton } from "./MobileButton";
import { MobileInput } from "./MobileInput";
import { MobileSwipeCarousel } from "./MobileSwipeCarousel";
import { 
  MapPin, 
  Calendar, 
  Users, 
  Star,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Pool,
  Heart,
  ChevronRight,
  Check,
  X,
  Camera
} from "lucide-react";
import { format } from "date-fns";

const MobileHotelBooking = ({
  hotel,
  className,
  onBookNow,
  onRoomSelect,
  loading = false,
}) => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guests, setGuests] = useState({
    adults: 2,
    children: 0,
  });
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  const [isFavorite, setIsFavorite] = useState(hotel.isFavorite || false);

  const {
    name,
    rating,
    reviews,
    price,
    images,
    location,
    amenities,
    rooms,
    description,
  } = hotel;

  const handleGuestChange = (type, action) => {
    setGuests(prev => {
      const newValue = action === "increase" 
        ? prev[type] + 1 
        : Math.max(type === "adults" ? 1 : 0, prev[type] - 1);
      
      return {
        ...prev,
        [type]: newValue,
      };
    });
  };

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    onRoomSelect?.(room);
  };

  const handleBookNow = () => {
    if (selectedRoom && checkInDate && checkOutDate) {
      const bookingData = {
        hotel,
        room: selectedRoom,
        checkInDate,
        checkOutDate,
        guests,
      };
      onBookNow?.(bookingData);
    }
  };

  const totalGuests = guests.adults + guests.children;
  const guestText = totalGuests === 1 ? "1 Guest" : `${totalGuests} Guests`;

  const renderAmenityIcon = (amenity) => {
    const iconProps = { className: "h-5 w-5 text-muted-foreground" };
    
    switch (amenity) {
      case "wifi":
        return <Wifi {...iconProps} />;
      case "parking":
        return <Car {...iconProps} />;
      case "breakfast":
        return <Coffee {...iconProps} />;
      case "gym":
        return <Dumbbell {...iconProps} />;
      case "pool":
        return <Pool {...iconProps} />;
      default:
        return <Check {...iconProps} />;
    }
  };

  return (
    <div className={cn("bg-background", className)}>
      {/* Image Carousel */}
      <div className="relative">
        <MobileSwipeCarousel
          items={images.map((image, index) => (
            <div key={index} className="relative aspect-video">
              <img
                src={image.url}
                alt={`${name} - Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                {index + 1} / {images.length}
              </div>
            </div>
          ))}
          showDots
          className="h-64"
        />
        
        {/* Favorite Button */}
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
        >
          <Heart 
            className={cn(
              "h-5 w-5",
              isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"
            )} 
          />
        </button>
      </div>

      {/* Hotel Info */}
      <div className="p-4 space-y-4">
        {/* Name and Rating */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{name}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-foreground">{rating}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              ({reviews} reviews)
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-foreground">{location.address}</p>
            <p className="text-sm text-muted-foreground">{location.city}</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-foreground leading-relaxed">{description}</p>
        </div>

        {/* Amenities */}
        {amenities && amenities.length > 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-3">Amenities</h3>
            <div className="grid grid-cols-4 gap-3">
              {amenities.slice(0, 8).map((amenity, index) => (
                <div key={index} className="flex flex-col items-center gap-1">
                  {renderAmenityIcon(amenity)}
                  <span className="text-xs text-muted-foreground capitalize text-center">
                    {amenity}
                  </span>
                </div>
              ))}
            </div>
            {amenities.length > 8 && (
              <MobileButton
                variant="ghost"
                size="compact"
                className="mt-3"
              >
                View all amenities
                <ChevronRight className="h-4 w-4 ml-1" />
              </MobileButton>
            )}
          </div>
        )}

        {/* Booking Form */}
        <div className="bg-card rounded-2xl p-4 space-y-4">
          <h3 className="font-semibold text-foreground">Book Your Stay</h3>
          
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <MobileInput
              type="date"
              label="Check-in"
              placeholder="Select date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              minDate={new Date()}
            />
            <MobileInput
              type="date"
              label="Check-out"
              placeholder="Select date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              minDate={checkInDate ? new Date(checkInDate) : new Date()}
            />
          </div>

          {/* Guests */}
          <div>
            <button
              type="button"
              onClick={() => setShowGuestSelector(!showGuestSelector)}
              className="w-full p-3 border-2 border-input rounded-lg bg-background hover:border-primary transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">{guestText}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </button>

            {showGuestSelector && (
              <div className="mt-2 p-3 border-2 border-border rounded-lg bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Adults</p>
                    <p className="text-xs text-muted-foreground">18+ years</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MobileButton
                      variant="outline"
                      size="compact"
                      onClick={() => handleGuestChange("adults", "decrease")}
                      disabled={guests.adults <= 1}
                      className="p-1"
                    >
                      <X className="h-3 w-3" />
                    </MobileButton>
                    <span className="w-6 text-center font-medium">{guests.adults}</span>
                    <MobileButton
                      variant="outline"
                      size="compact"
                      onClick={() => handleGuestChange("adults", "increase")}
                      className="p-1"
                    >
                      <Check className="h-3 w-3" />
                    </MobileButton>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Children</p>
                    <p className="text-xs text-muted-foreground">0-17 years</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MobileButton
                      variant="outline"
                      size="compact"
                      onClick={() => handleGuestChange("children", "decrease")}
                      disabled={guests.children <= 0}
                      className="p-1"
                    >
                      <X className="h-3 w-3" />
                    </MobileButton>
                    <span className="w-6 text-center font-medium">{guests.children}</span>
                    <MobileButton
                      variant="outline"
                      size="compact"
                      onClick={() => handleGuestChange("children", "increase")}
                      className="p-1"
                    >
                      <Check className="h-3 w-3" />
                    </MobileButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Room Selection */}
        {rooms && rooms.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Available Rooms</h3>
            {rooms.map((room, index) => (
              <div
                key={index}
                className={cn(
                  "bg-card rounded-2xl p-4 border-2 transition-all cursor-pointer",
                  selectedRoom?.id === room.id
                    ? "border-primary"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => handleRoomSelect(room)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{room.name}</h4>
                    <p className="text-sm text-muted-foreground">{room.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">${room.price}</p>
                    <p className="text-xs text-muted-foreground">per night</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  {room.images && room.images.length > 0 && (
                    <div className="flex gap-1">
                      {room.images.slice(0, 3).map((img, imgIndex) => (
                        <div key={imgIndex} className="relative">
                          <img
                            src={img.url}
                            alt={`${room.name} - ${imgIndex + 1}`}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          {imgIndex === 2 && room.images.length > 3 && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <Camera className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{room.maxGuests} guests</span>
                  <span>{room.bedType}</span>
                  <span>{room.size}</span>
                </div>

                {selectedRoom?.id === room.id && (
                  <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                    <p className="text-sm text-primary font-medium">Room selected</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Book Now Button */}
        <MobileButton
          variant="primary"
          size="comfortable"
          onClick={handleBookNow}
          loading={loading}
          disabled={!selectedRoom || !checkInDate || !checkOutDate}
          className="w-full"
        >
          Book Now
        </MobileButton>
      </div>
    </div>
  );
};

export { MobileHotelBooking };