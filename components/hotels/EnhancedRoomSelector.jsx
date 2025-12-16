"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RoomFilters } from "./RoomFilters";
import { RoomComparison } from "./RoomComparison";
import { EnhancedRoomCard } from "./EnhancedRoomCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Grid,
  List,
  SortAsc,
  MapPin,
  Calendar,
  Users,
  RotateCcw,
  X,
  SlidersHorizontal,
  Heart,
  ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useRoomBookingState, useRoomComparison, useRoomAvailability } from "@/hooks/useRoomBookingState";

export function EnhancedRoomSelector({
  hotelId,
  initialFilters = {},
  initialSearchDates = {},
  initialGuestCount = 1,
  onRoomSelect,
  onFiltersChange,
  className = ""
}) {
  // Room booking state management
  const {
    bookingState,
    loading: bookingLoading,
    error: bookingError,
    selectedRoomsCount,
    hasSelectedRooms,
    addRoom,
    removeRoom,
    updateRoomQuantity,
    updateDates,
    calculateTotal
  } = useRoomBookingState(hotelId);

  // Room comparison management
  const {
    comparisonRooms,
    loading: comparisonLoading,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isRoomInComparison,
    comparisonCount,
    canAddMore
  } = useRoomComparison();

  // Room availability checking
  const {
    loading: availabilityLoading,
    checkSingleRoomAvailability
  } = useRoomAvailability();

  // Local component state
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState('price_asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [filterOptions, setFilterOptions] = useState({});
  const [searchDates, setSearchDates] = useState(initialSearchDates);
  const [guestCount, setGuestCount] = useState(initialGuestCount);
  const [totalPrice, setTotalPrice] = useState(0);

  // Fetch rooms and filter options
  useEffect(() => {
    fetchRooms();
    fetchFilterOptions();
  }, [hotelId, searchDates, guestCount]);

  // Calculate total price when booking state or dates change
  useEffect(() => {
    if (bookingState?.selectedRooms && searchDates.checkIn && searchDates.checkOut) {
      const nights = Math.ceil(
        (new Date(searchDates.checkOut) - new Date(searchDates.checkIn)) / (1000 * 60 * 60 * 24)
      );
      
      if (nights > 0) {
        calculateTotal(nights, bookingState.promoCode).then(result => {
          if (result.success) {
            setTotalPrice(result.data.total);
          }
        });
      }
    }
  }, [bookingState, searchDates, calculateTotal]);

  // Update booking state dates when search dates change
  useEffect(() => {
    if (searchDates.checkIn && searchDates.checkOut) {
      updateDates(searchDates.checkIn, searchDates.checkOut, { adults: guestCount, children: 0 });
    }
  }, [searchDates, guestCount, updateDates]);

  // Show comparison panel when there are rooms to compare
  useEffect(() => {
    setShowComparison(comparisonCount > 0);
  }, [comparisonCount]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...rooms];

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(room => 
        room.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.roomType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.amenities?.some(amenity => 
          amenity.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply filters
    if (filters.roomTypes?.length > 0) {
      filtered = filtered.filter(room => 
        filters.roomTypes.includes(room.roomType)
      );
    }

    if (filters.categories?.length > 0) {
      filtered = filtered.filter(room => 
        filters.categories.includes(room.category)
      );
    }

    if (filters.amenities?.length > 0) {
      filtered = filtered.filter(room => 
        filters.amenities.some(amenity => 
          room.amenities?.some(roomAmenity => 
            roomAmenity.name === amenity
          )
        )
      );
    }

    if (filters.accessibility?.length > 0) {
      filtered = filtered.filter(room => {
        return filters.accessibility.every(feature => {
          if (feature === 'wheelchair_accessible') return room.accessibility?.wheelchairAccessible;
          if (feature === 'hearing_accessible') return room.accessibility?.hearingAccessible;
          if (feature === 'visual_accessible') return room.accessibility?.visualAccessible;
          if (feature === 'mobility_accessible') return room.accessibility?.mobilityAccessible;
          return true;
        });
      });
    }

    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange;
      filtered = filtered.filter(room => {
        const price = room.dynamicPricing?.perNight?.totalPerNight || room.pricing?.base;
        return price >= minPrice && price <= maxPrice;
      });
    }

    if (filters.sizeRange) {
      const [minSize, maxSize] = filters.sizeRange;
      filtered = filtered.filter(room => {
        const size = room.size?.squareMeters;
        return size >= minSize && size <= maxSize;
      });
    }

    if (filters.rating) {
      filtered = filtered.filter(room => 
        (room.rating?.average || 0) >= filters.rating
      );
    }

    setFilteredRooms(filtered);
  }, [rooms, searchTerm, filters]);

  // Sort filtered rooms
  useEffect(() => {
    const sorted = [...filteredRooms].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return (a.dynamicPricing?.perNight?.totalPerNight || a.pricing?.base) - 
                 (b.dynamicPricing?.perNight?.totalPerNight || b.pricing?.base);
        case 'price_desc':
          return (b.dynamicPricing?.perNight?.totalPerNight || b.pricing?.base) - 
                 (a.dynamicPricing?.perNight?.totalPerNight || a.pricing?.base);
        case 'rating_desc':
          return (b.rating?.average || 0) - (a.rating?.average || 0);
        case 'rating_asc':
          return (a.rating?.average || 0) - (b.rating?.average || 0);
        case 'size_desc':
          return (b.size?.squareMeters || 0) - (a.size?.squareMeters || 0);
        case 'size_asc':
          return (a.size?.squareMeters || 0) - (b.size?.squareMeters || 0);
        case 'popularity_desc':
          return (b.popularity?.bookingCount || 0) - (a.popularity?.bookingCount || 0);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0;
      }
    });
    setFilteredRooms(sorted);
  }, [filteredRooms, sortBy]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (hotelId) params.append('hotelId', hotelId);
      if (searchDates.checkIn) params.append('checkIn', searchDates.checkIn);
      if (searchDates.checkOut) params.append('checkOut', searchDates.checkOut);
      if (guestCount) params.append('guests', guestCount);
      
      params.append('sortBy', sortBy);

      const response = await fetch(`/api/hotels/rooms/search?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRooms(data.data.rooms || []);
        setFilteredRooms(data.data.rooms || []);
      } else {
        toast.error(data.message || 'Failed to fetch rooms');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/hotels/rooms/search/filters', { method: 'OPTIONS' });
      const data = await response.json();

      if (data.success) {
        setFilterOptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };


  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [onFiltersChange]);

  const handleRoomSelect = useCallback(async (room, quantity = 1, customization = {}) => {
    const result = await addRoom(room, quantity, customization);
    if (result.success) {
      toast.success(`${room.roomName || room.roomType} added to booking`);
      onRoomSelect?.(room);
    } else {
      toast.error(result.error || 'Failed to add room to booking');
    }
  }, [addRoom, onRoomSelect]);

  const handleRoomDeselect = useCallback(async (roomId, customization = {}) => {
    const result = await removeRoom(roomId, customization);
    if (result.success) {
      toast.success('Room removed from booking');
    } else {
      toast.error(result.error || 'Failed to remove room from booking');
    }
  }, [removeRoom]);

  const handleRoomQuantityChange = useCallback(async (roomId, quantity, customization = {}) => {
    const result = await updateRoomQuantity(roomId, quantity, customization);
    if (result.success) {
      toast.success('Room quantity updated');
    } else {
      toast.error(result.error || 'Failed to update room quantity');
    }
  }, [updateRoomQuantity]);

  const handleComparisonToggle = useCallback(async (room) => {
    if (isRoomInComparison(room._id)) {
      const result = await removeFromComparison(room._id);
      if (result.success) {
        toast.success('Room removed from comparison');
      } else {
        toast.error(result.error || 'Failed to remove room from comparison');
      }
    } else {
      if (!canAddMore) {
        toast.error('You can compare up to 4 rooms at a time');
        return;
      }
      const result = await addToComparison(room);
      if (result.success) {
        toast.success('Room added to comparison');
      } else {
        toast.error(result.error || 'Failed to add room to comparison');
      }
    }
  }, [isRoomInComparison, canAddMore, removeFromComparison, addToComparison]);

  const handleFiltersReset = useCallback(() => {
    setFilters({});
    setSearchTerm('');
    onFiltersChange?.({});
  }, [onFiltersChange]);

  const handleComparisonClearAll = async () => {
    const result = await clearComparison();
    if (result.success) {
      toast.success('Comparison list cleared');
    } else {
      toast.error(result.error || 'Failed to clear comparison');
    }
  };

  const getSelectedRoomCount = (roomId) => {
    if (!bookingState?.selectedRooms) return 0;
    return bookingState.selectedRooms
      .filter(r => r.roomId === roomId)
      .reduce((total, room) => total + room.quantity, 0);
  };

  const getMaxAvailable = (room) => {
    // This would typically come from availability API
    return Math.max(1, Math.floor((room.capacity?.maxGuests || 1) / 2));
  };

  const getTotalSelectedCount = () => {
    return selectedRoomsCount;
  };

  const getTotalCapacity = () => {
    if (!bookingState?.selectedRooms) return 0;
    return bookingState.selectedRooms.reduce((total, room) => {
      return total + (room.capacity?.adults || 0) * room.quantity;
    }, 0);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filter Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price_asc">
                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4" />
                  Price: Low to High
                </div>
              </SelectItem>
              <SelectItem value="price_desc">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Price: High to Low
                </div>
              </SelectItem>
              <SelectItem value="rating_desc">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Rating: High to Low
                </div>
              </SelectItem>
              <SelectItem value="size_desc">
                <div className="flex items-center gap-2">
                  <Grid className="h-4 w-4" />
                  Size: Large to Small
                </div>
              </SelectItem>
              <SelectItem value="popularity_desc">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Most Popular
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters Toggle */}
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {Object.keys(filters).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {Object.keys(filters).length}
              </Badge>
            )}
          </Button>

          {/* Comparison Toggle */}
          <Button
            variant={showComparison ? 'default' : 'outline'}
            onClick={() => setShowComparison(!showComparison)}
          >
            <Heart className="h-4 w-4" />
            Compare ({comparisonCount})
          </Button>
        </div>
      </div>

      {/* Search Summary */}
      {(searchDates.checkIn && searchDates.checkOut) && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(searchDates.checkIn).toLocaleDateString()} - {new Date(searchDates.checkOut).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{guestCount} guests</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{filteredRooms.length} rooms found</span>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="border rounded-lg p-4 bg-muted">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            <Button variant="outline" size="sm" onClick={handleFiltersReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset All
            </Button>
          </div>
          <RoomFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
            onReset={handleFiltersReset}
            availableFilters={filterOptions}
          />
        </div>
      )}

      {/* Comparison View */}
      {showComparison && (
        <div className="border rounded-lg p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Room Comparison</h3>
            <Button variant="outline" size="sm" onClick={() => setShowComparison(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <RoomComparison
            rooms={comparisonRooms}
            searchCriteria={searchDates}
            onRoomRemove={removeFromComparison}
            onClearAll={handleComparisonClearAll}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Loading rooms...</p>
          </div>
        </div>
      )}

      {/* Rooms Grid/List */}
      {!loading && filteredRooms.length === 0 && !showComparison && (
        <div className="text-center py-8">
          <div className="text-muted-foreground">
            <Filter className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Rooms Found</h3>
            <p className="text-sm">
              Try adjusting your filters or search criteria.
            </p>
            <Button className="mt-4" onClick={handleFiltersReset}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {!loading && !showComparison && (
        <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
          {filteredRooms.map((room) => (
            <EnhancedRoomCard
              key={room._id}
              room={room}
              hotelInfo={room.hotelId}
              searchDates={searchDates}
              guestCount={guestCount}
              onRoomSelect={handleRoomSelect}
              onRoomDeselect={handleRoomDeselect}
              onRoomQuantityChange={handleRoomQuantityChange}
              onComparisonToggle={handleComparisonToggle}
              selectedCount={getSelectedRoomCount(room._id)}
              maxAvailable={getMaxAvailable(room)}
              showComparison={true}
              isInComparison={isRoomInComparison(room._id)}
              className={viewMode === 'list' ? 'flex' : ''}
            />
          ))}
        </div>
      )}

      {/* Selection Summary */}
      {hasSelectedRooms && (
        <div className="sticky bottom-4 border rounded-lg bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Selected Rooms</h4>
              <p className="text-sm text-muted-foreground">
                {getTotalSelectedCount()} rooms • {getTotalCapacity()} guests capacity
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Total: {formatCurrency(totalPrice)}
              </span>
              <Button asChild>
                <Link href={`/hotels/${hotelId}/book`}>
                  Proceed to Booking
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedRoomSelector;