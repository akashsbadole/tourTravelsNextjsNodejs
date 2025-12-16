"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { 
  BedDouble, 
  Users, 
  Square, 
  Star, 
  Heart, 
  Eye, 
  Plus,
  Minus,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Check
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RoomDetailsModal } from "./RoomDetailsModal";
import { RoomComparisonToggle } from "./RoomComparisonToggle";

export function EnhancedRoomCard({ 
  room, 
  hotelInfo,
  searchDates,
  guestCount,
  onRoomSelect,
  onRoomDeselect,
  selectedCount = 0,
  maxAvailable = 1,
  showComparison = true,
  className = ""
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInComparison, setIsInComparison] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const primaryImage = room.images?.find(img => img.isPrimary) || room.images?.[0];
  const pricePerNight = room.dynamicPricing?.perNight?.totalPerNight || room.pricing?.base;
  const totalPrice = room.dynamicPricing?.total || (pricePerNight * (searchDates?.nights || 1));
  const discountPercentage = room.dynamicPricing?.discountInfo ? 
    Math.round((room.dynamicPricing.discountInfo.discountAmount / room.dynamicPricing.subtotal) * 100) : 
    null;

  // Get top amenities for display
  const topAmenities = room.amenities?.slice(0, 4) || [];
  const includedAmenities = topAmenities.filter(amenity => amenity.included);

  const getAmenityIcon = (amenityName) => {
    const name = amenityName?.toLowerCase();
    if (name?.includes('wifi')) return Wifi;
    if (name?.includes('parking')) return Car;
    if (name?.includes('coffee') || name?.includes('breakfast')) return Coffee;
    if (name?.includes('gym') || name?.includes('fitness')) return Dumbbell;
    return Check;
  };

  const handleRoomSelection = () => {
    if (selectedCount < maxAvailable) {
      onRoomSelect?.(room);
    }
  };

  const handleRoomDeselection = () => {
    onRoomDeselect?.(room._id);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getRoomCategoryColor = (category) => {
    const colors = {
      budget: "bg-green-100 text-green-800",
      mid_range: "bg-blue-100 text-blue-800",
      luxury: "bg-purple-100 text-purple-800",
      ultra_luxury: "bg-yellow-100 text-yellow-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getRoomTypeLabel = (roomType) => {
    const labels = {
      standard: "Standard",
      deluxe: "Deluxe",
      suite: "Suite",
      executive: "Executive",
      family: "Family",
      penthouse: "Penthouse",
      studio: "Studio",
      apartment: "Apartment",
      villa: "Villa"
    };
    return labels[roomType] || roomType;
  };

  return (
    <>
      <Card 
        className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Room Images */}
        <div className="relative h-48 overflow-hidden">
          {primaryImage && !imageError ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt || room.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={handleImageError}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-100">
              <BedDouble className="h-12 w-12 text-gray-400" />
            </div>
          )}
          
          {/* Overlay badges */}
          <div className="absolute top-2 left-2 flex gap-2">
            <Badge className={getRoomCategoryColor(room.category)}>
              {room.category?.replace('_', ' ')}
            </Badge>
            {discountPercentage && (
              <Badge className="bg-red-500 text-white">
                {discountPercentage}% OFF
              </Badge>
            )}
          </div>

          {/* Action buttons overlay */}
          <div className={`absolute top-2 right-2 flex gap-2 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 rounded-full p-0"
              onClick={() => setIsModalOpen(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {showComparison && (
              <RoomComparisonToggle
                roomId={room._id}
                onToggle={setIsInComparison}
                className="h-8 w-8 rounded-full p-0"
              />
            )}
          </div>

          {/* Virtual tour indicator */}
          {room.virtualTour?.enabled && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="text-xs">
                360° Tour
              </Badge>
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg line-clamp-1">{room.title}</h3>
              <p className="text-sm text-muted-foreground">
                {getRoomTypeLabel(room.roomType)} • {room.size?.squareMeters}m²
              </p>
              <p className="text-xs text-muted-foreground">
                {hotelInfo?.name}
              </p>
            </div>
            
            <div className="flex flex-col items-end text-right">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">
                  {room.rating?.average?.toFixed(1) || 'N/A'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({room.rating?.reviewCount || 0})
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Capacity */}
          <div className="mb-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Sleeps {room.capacity?.maxGuests}</span>
            </div>
            <div className="flex items-center gap-1">
              <BedDouble className="h-4 w-4 text-muted-foreground" />
              <span>{room.bedding?.totalBeds} beds</span>
            </div>
            <div className="flex items-center gap-1">
              <Square className="h-4 w-4 text-muted-foreground" />
              <span>{room.size?.squareMeters}m²</span>
            </div>
          </div>

          {/* Top Amenities */}
          {includedAmenities.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {includedAmenities.slice(0, 3).map((amenity, index) => {
                  const Icon = getAmenityIcon(amenity.name);
                  return (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Icon className="mr-1 h-3 w-3" />
                      {amenity.name}
                    </Badge>
                  );
                })}
                {includedAmenities.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{includedAmenities.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              {room.dynamicPricing?.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(room.dynamicPricing.originalPrice)}
                </span>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(pricePerNight)}
                </span>
                <span className="text-sm text-muted-foreground">/night</span>
              </div>
            </div>
            {searchDates?.nights && searchDates.nights > 1 && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(totalPrice)} for {searchDates.nights} nights
              </p>
            )}
          </div>

          {/* Special features */}
          {room.features?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {room.features.slice(0, 2).map((feature, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {feature.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {maxAvailable > 0 ? (
                <span>{maxAvailable} available</span>
              ) : (
                <span className="text-red-500">Sold out</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 rounded-full p-0"
                    onClick={handleRoomDeselection}
                    disabled={selectedCount === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-8 text-center">
                    {selectedCount}
                  </span>
                </div>
              )}
              
              <Button
                size="sm"
                onClick={handleRoomSelection}
                disabled={selectedCount >= maxAvailable || maxAvailable === 0}
                className="min-w-[100px]"
              >
                {selectedCount > 0 ? 'Add More' : 'Select Room'}
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Room Details Modal */}
      <RoomDetailsModal
        room={room}
        hotelInfo={hotelInfo}
        searchDates={searchDates}
        guestCount={guestCount}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRoomSelect={handleRoomSelection}
        selectedCount={selectedCount}
        maxAvailable={maxAvailable}
      />
    </>
  );
}

export default EnhancedRoomCard;