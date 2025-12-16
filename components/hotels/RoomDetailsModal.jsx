"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  BedDouble,
  Users,
  Square,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Check,
  X,
  Heart,
  Eye,
  MapPin,
  Star,
  Calendar,
  Clock,
  CreditCard,
  Shield,
  Baby,
  PawPrint,
  Smoking,
  Wind,
  Tv,
  Bath,
  Phone,
  Utensils,
  Accessibility
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RoomComparisonToggle } from "./RoomComparisonToggle";

export function RoomDetailsModal({ 
  room, 
  hotelInfo,
  searchDates,
  guestCount,
  isOpen, 
  onClose, 
  onRoomSelect,
  selectedCount = 0,
  maxAvailable = 1 
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isInComparison, setIsInComparison] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const totalPrice = room.dynamicPricing?.total || (room.pricing?.base * (searchDates?.nights || 1));
  const pricePerNight = room.dynamicPricing?.perNight?.totalPerNight || room.pricing?.base;
  const discountPercentage = room.dynamicPricing?.discountInfo ? 
    Math.round((room.dynamicPricing.discountInfo.discountAmount / room.dynamicPricing.subtotal) * 100) : 
    null;

  const getAmenityIcon = (amenityName) => {
    const name = amenityName?.toLowerCase();
    if (name?.includes('wifi')) return Wifi;
    if (name?.includes('parking')) return Car;
    if (name?.includes('coffee') || name?.includes('breakfast')) return Coffee;
    if (name?.includes('gym') || name?.includes('fitness')) return Dumbbell;
    if (name?.includes('tv') || name?.includes('television')) return Tv;
    if (name?.includes('bath') || name?.includes('shower')) return Bath;
    if (name?.includes('phone')) return Phone;
    if (name?.includes('restaurant') || name?.includes('dining')) return Utensils;
    return Check;
  };

  const getAmenityCategoryColor = (category) => {
    const colors = {
      bathroom: "bg-blue-100 text-blue-800",
      entertainment: "bg-purple-100 text-purple-800",
      comfort: "bg-green-100 text-green-800",
      kitchen: "bg-orange-100 text-orange-800",
      work: "bg-indigo-100 text-indigo-800",
      safety: "bg-red-100 text-red-800",
      wellness: "bg-pink-100 text-pink-800",
      other: "bg-gray-100 text-gray-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getAccessibilityIcon = (feature) => {
    return Accessibility;
  };

  const groupedAmenities = room.amenities?.reduce((groups, amenity) => {
    const category = amenity.category || 'other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(amenity);
    return groups;
  }, {});

  const includedAmenities = room.amenities?.filter(amenity => amenity.included) || [];
  const paidAmenities = room.amenities?.filter(amenity => !amenity.included) || [];

  const handleRoomSelection = () => {
    if (selectedCount < maxAvailable) {
      onRoomSelect?.(room);
      onClose?.();
    }
  };

  const handleImageError = (e) => {
    e.target.src = "/placeholder-room.jpg";
  };

  if (!room) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">
                {room.title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">
                    {room.roomType?.charAt(0).toUpperCase() + room.roomType?.slice(1)}
                  </span>
                  <span>•</span>
                  <span>{room.size?.squareMeters}m²</span>
                  <span>•</span>
                  <span>Sleeps {room.capacity?.maxGuests}</span>
                  <span>•</span>
                  <span>{room.bedding?.totalBeds} beds</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {room.rating?.average?.toFixed(1) || 'N/A'}
                  </span>
                  <span className="text-muted-foreground">
                    ({room.rating?.reviewCount || 0} reviews)
                  </span>
                </div>
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <RoomComparisonToggle
                roomId={room._id}
                onToggle={setIsInComparison}
                variant="outline"
                size="sm"
              />
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {/* Image Carousel */}
          {room.images?.length > 0 && (
            <div className="mb-6">
              <Carousel className="w-full">
                <CarouselContent>
                  {room.images.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="relative aspect-video overflow-hidden rounded-lg">
                        <Image
                          src={image.url}
                          alt={image.alt || `${room.title} - Image ${index + 1}`}
                          fill
                          className="object-cover"
                          onError={handleImageError}
                        />
                        {image.category && (
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary">
                              {image.category}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          )}

          {/* Virtual Tour Button */}
          {room.virtualTour?.enabled && (
            <div className="mb-4">
              <Button variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                Take 360° Virtual Tour
              </Button>
            </div>
          )}

          {/* Pricing Summary */}
          <div className="mb-6 rounded-lg bg-muted p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  {room.dynamicPricing?.originalPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      {formatCurrency(room.dynamicPricing.originalPrice)}
                    </span>
                  )}
                  <span className="text-3xl font-bold text-primary">
                    {formatCurrency(pricePerNight)}
                  </span>
                  <span className="text-muted-foreground">/night</span>
                </div>
                {searchDates?.nights && searchDates.nights > 1 && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(totalPrice)} for {searchDates.nights} nights
                  </p>
                )}
                {discountPercentage && (
                  <Badge className="mt-1 bg-red-500 text-white">
                    {discountPercentage}% OFF
                  </Badge>
                )}
              </div>
              
              <Button 
                size="lg" 
                onClick={handleRoomSelection}
                disabled={selectedCount >= maxAvailable}
                className="min-w-[150px]"
              >
                {selectedCount > 0 ? 'Add Another' : 'Select Room'}
              </Button>
            </div>
          </div>

          {/* Detailed Information Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Room Details */}
                <div>
                  <h4 className="mb-3 font-semibold">Room Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Room Type</span>
                      <span className="font-medium">{room.roomType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category</span>
                      <Badge>{room.category?.replace('_', ' ')}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size</span>
                      <span className="font-medium">{room.size?.squareMeters}m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Floor</span>
                      <span className="font-medium">{room.location?.floor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Room Number</span>
                      <span className="font-medium">{room.location?.roomNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Capacity */}
                <div>
                  <h4 className="mb-3 font-semibold">Capacity</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Guests</span>
                      <span className="font-medium">{room.capacity?.maxGuests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Adults</span>
                      <span className="font-medium">{room.capacity?.maxAdults}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Children</span>
                      <span className="font-medium">{room.capacity?.maxChildren}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extra Bed</span>
                      <span className="font-medium">
                        {room.capacity?.extraBedAllowed ? `Available (+${room.capacity?.maxExtraBeds})` : 'Not Available'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bedding */}
                <div>
                  <h4 className="mb-3 font-semibold">Bedding</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Beds</span>
                      <span className="font-medium">{room.bedding?.totalBeds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bed Options</span>
                      <span className="font-medium">{room.bedding?.bedOptions}</span>
                    </div>
                    {room.bedding?.bedTypes?.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Bed Types</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {room.bedding.bedTypes.map((bedType, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {bedType}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technology */}
                <div>
                  <h4 className="mb-3 font-semibold">Technology & Comfort</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Wifi className={`h-4 w-4 ${room.technology?.wifi ? 'text-green-600' : 'text-gray-400'}`} />
                      <span>WiFi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tv className={`h-4 w-4 ${room.technology?.smartTV ? 'text-green-600' : 'text-gray-400'}`} />
                      <span>Smart TV</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className={`h-4 w-4 ${room.technology?.airConditioning ? 'text-green-600' : 'text-gray-400'}`} />
                      <span>Air Conditioning</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dumbbell className={`h-4 w-4 ${room.technology?.workDesk ? 'text-green-600' : 'text-gray-400'}`} />
                      <span>Work Desk</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h4 className="mb-3 font-semibold">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {room.description}
                </p>
                {room.shortDescription && (
                  <p className="mt-2 text-sm text-muted-foreground italic">
                    {room.shortDescription}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="amenities" className="mt-4">
              <div className="space-y-6">
                {/* Included Amenities */}
                {includedAmenities.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-semibold text-green-700">Included Amenities</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {Object.entries(groupedAmenities).map(([category, amenities]) => {
                        const includedInCategory = amenities.filter(a => a.included);
                        if (includedInCategory.length === 0) return null;
                        
                        return (
                          <div key={category}>
                            <Badge className={getAmenityCategoryColor(category)}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </Badge>
                            <div className="mt-2 space-y-2">
                              {includedInCategory.map((amenity, index) => {
                                const Icon = getAmenityIcon(amenity.name);
                                return (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <Icon className="h-4 w-4 text-green-600" />
                                    <span>{amenity.name}</span>
                                    {amenity.description && (
                                      <span className="text-xs text-muted-foreground">
                                        - {amenity.description}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Paid Amenities */}
                {paidAmenities.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-semibold text-orange-700">Additional Amenities (Extra Cost)</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {Object.entries(groupedAmenities).map(([category, amenities]) => {
                        const paidInCategory = amenities.filter(a => !a.included);
                        if (paidInCategory.length === 0) return null;
                        
                        return (
                          <div key={category}>
                            <Badge variant="outline">
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </Badge>
                            <div className="mt-2 space-y-2">
                              {paidInCategory.map((amenity, index) => {
                                const Icon = getAmenityIcon(amenity.name);
                                return (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <Icon className="h-4 w-4 text-orange-600" />
                                    <span>{amenity.name}</span>
                                    {amenity.description && (
                                      <span className="text-xs text-muted-foreground">
                                        - {amenity.description}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Features */}
                {room.features?.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-semibold">Room Features</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {room.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-blue-600" />
                          <span>{feature.name}</span>
                          {feature.value && (
                            <span className="text-xs text-muted-foreground">
                              ({feature.value})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accessibility */}
                {Object.values(room.accessibility).some(accessible => accessible) && (
                  <div>
                    <h4 className="mb-3 font-semibold">Accessibility Features</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {room.accessibility.wheelchairAccessible && (
                        <div className="flex items-center gap-2 text-sm">
                          <Accessibility className="h-4 w-4 text-blue-600" />
                          <span>Wheelchair Accessible</span>
                        </div>
                      )}
                      {room.accessibility.hearingAccessible && (
                        <div className="flex items-center gap-2 text-sm">
                          <Accessibility className="h-4 w-4 text-blue-600" />
                          <span>Hearing Accessible</span>
                        </div>
                      )}
                      {room.accessibility.visualAccessible && (
                        <div className="flex items-center gap-2 text-sm">
                          <Accessibility className="h-4 w-4 text-blue-600" />
                          <span>Visual Accessible</span>
                        </div>
                      )}
                      {room.accessibility.mobilityAccessible && (
                        <div className="flex items-center gap-2 text-sm">
                          <Accessibility className="h-4 w-4 text-blue-600" />
                          <span>Mobility Accessible</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="policies" className="mt-4">
              <div className="space-y-6">
                {/* Check-in/Check-out */}
                <div>
                  <h4 className="mb-3 font-semibold">Check-in & Check-out</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Check-in: {room.policies?.checkInTime || '15:00'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Check-out: {room.policies?.checkOutTime || '11:00'}</span>
                    </div>
                  </div>
                </div>

                {/* Policies */}
                <div>
                  <h4 className="mb-3 font-semibold">Room Policies</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Smoking className={`h-4 w-4 ${room.policies?.smokingAllowed ? 'text-orange-600' : 'text-green-600'}`} />
                      <span>Smoking: {room.policies?.smokingAllowed ? 'Allowed' : 'Non-smoking'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PawPrint className={`h-4 w-4 ${room.policies?.petsAllowed ? 'text-green-600' : 'text-red-600'}`} />
                      <span>Pets: {room.policies?.petsAllowed ? `Allowed (+${formatCurrency(room.policies.petFee)})` : 'Not allowed'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Baby className={`h-4 w-4 ${room.policies?.childrenAllowed ? 'text-green-600' : 'text-red-600'}`} />
                      <span>Children: {room.policies?.childrenAllowed ? 'Allowed' : 'Not allowed'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className={`h-4 w-4 ${room.policies?.partiesAllowed ? 'text-orange-600' : 'text-green-600'}`} />
                      <span>Parties: {room.policies?.partiesAllowed ? 'Allowed' : 'Not allowed'}</span>
                    </div>
                  </div>
                </div>

                {/* Availability Rules */}
                <div>
                  <h4 className="mb-3 font-semibold">Availability Rules</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Minimum Stay</span>
                      <span className="font-medium">{room.availability?.minimumStay || 1} nights</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Maximum Stay</span>
                      <span className="font-medium">{room.availability?.maximumStay || 30} nights</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Advance Booking</span>
                      <span className="font-medium">{room.availability?.advanceBookingRequired || 0} days</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="location" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="mb-3 font-semibold">Hotel Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{hotelInfo?.name}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {hotelInfo?.address?.streetAddress}, {hotelInfo?.address?.city}, {hotelInfo?.address?.country}
                    </div>
                  </div>
                </div>

                {room.location?.floor && (
                  <div>
                    <h4 className="mb-3 font-semibold">Room Location</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Floor</span>
                        <span className="font-medium">{room.location.floor}</span>
                      </div>
                      {room.location.wing && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Wing</span>
                          <span className="font-medium">{room.location.wing}</span>
                        </div>
                      )}
                      {room.location.section && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Section</span>
                          <span className="font-medium">{room.location.section}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="mt-6">
          <div className="flex w-full items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {maxAvailable > 0 ? (
                <span>{maxAvailable} rooms available</span>
              ) : (
                <span className="text-red-500">Sold out</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button 
                onClick={handleRoomSelection}
                disabled={selectedCount >= maxAvailable}
              >
                {selectedCount > 0 ? 'Add Another Room' : 'Select This Room'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RoomDetailsModal;