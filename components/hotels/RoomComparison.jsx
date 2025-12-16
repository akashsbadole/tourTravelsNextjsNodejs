"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Heart,
  Star,
  BedDouble,
  Users,
  Square,
  Wifi,
  Car,
  Coffee,
  Check,
  ArrowUpDown,
  Trash2,
  Eye,
  Plus
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EnhancedRoomCard } from "./EnhancedRoomCard";

export function RoomComparison({ 
  rooms = [], 
  searchCriteria = {},
  comparisonMetrics = {},
  onMetricsChange,
  onRoomRemove,
  onRoomSelect,
  onClearAll,
  className = ""
}) {
  const [sortBy, setSortBy] = useState('value_score');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [expandedRoom, setExpandedRoom] = useState(null);

  // Sort rooms based on selected criteria
  const sortedRooms = React.useMemo(() => {
    return [...rooms].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return (a.roomId?.dynamicPricing?.total || 0) - (b.roomId?.dynamicPricing?.total || 0);
        case 'price_desc':
          return (b.roomId?.dynamicPricing?.total || 0) - (a.roomId?.dynamicPricing?.total || 0);
        case 'rating_desc':
          return (b.roomId?.rating?.average || 0) - (a.roomId?.rating?.average || 0);
        case 'size_desc':
          return (b.roomId?.size?.squareMeters || 0) - (a.roomId?.size?.squareMeters || 0);
        case 'value_score':
        default:
          return calculateValueScore(b) - calculateValueScore(a);
      }
    });
  }, [rooms, sortBy]);

  const calculateValueScore = (room) => {
    if (!room?.roomId) return 0;
    
    const { roomId } = room;
    let score = 100;

    // Price component (lower is better)
    const price = roomId.dynamicPricing?.total || roomId.pricing?.base || 0;
    score -= Math.min(price * 0.01, 30) * (comparisonMetrics.priceWeight || 0.3);

    // Rating component
    const rating = roomId.rating?.average || 0;
    score += Math.min(rating * 10, 20) * (comparisonMetrics.ratingWeight || 0.2);

    // Size component
    const size = roomId.size?.squareMeters || 0;
    score += Math.min(size * 0.2, 10) * (comparisonMetrics.sizeWeight || 0.1);

    // Amenities component
    const amenities = roomId.amenities?.filter(a => a.included)?.length || 0;
    score += Math.min(amenities * 2, 20) * (comparisonMetrics.amenitiesWeight || 0.2);

    // Location component (hotel rating)
    const hotelRating = roomId.hotelId?.rating || 0;
    score += Math.min(hotelRating * 5, 15) * (comparisonMetrics.locationWeight || 0.2);

    return Math.max(score, 0);
  };

  const getAmenityIcon = (amenityName) => {
    const name = amenityName?.toLowerCase();
    if (name?.includes('wifi')) return Wifi;
    if (name?.includes('parking')) return Car;
    if (name?.includes('coffee') || name?.includes('breakfast')) return Coffee;
    return Check;
  };

  const getBestValueRoom = () => {
    return sortedRooms.reduce((best, current) => {
      const currentScore = calculateValueScore(current);
      const bestScore = calculateValueScore(best);
      return currentScore > bestScore ? current : best;
    }, sortedRooms[0]);
  };

  const getCheapestRoom = () => {
    return sortedRooms.reduce((cheapest, current) => {
      const currentPrice = current.roomId?.dynamicPricing?.total || Infinity;
      const cheapestPrice = cheapest.roomId?.dynamicPricing?.total || Infinity;
      return currentPrice < cheapestPrice ? current : cheapest;
    }, sortedRooms[0]);
  };

  const getBestRatedRoom = () => {
    return sortedRooms.reduce((best, current) => {
      const currentRating = current.roomId?.rating?.average || 0;
      const bestRating = best.roomId?.rating?.average || 0;
      return currentRating > bestRating ? current : best;
    }, sortedRooms[0]);
  };

  const bestValueRoom = getBestValueRoom();
  const cheapestRoom = getCheapestRoom();
  const bestRatedRoom = getBestRatedRoom();

  if (rooms.length === 0) {
    return (
      <Card className={`text-center py-8 ${className}`}>
        <CardContent>
          <div className="text-muted-foreground">
            <Heart className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Rooms to Compare</h3>
            <p className="text-sm">
              Add rooms to your comparison list to see them side by side.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Room Comparison</h2>
          <p className="text-muted-foreground">
            Comparing {rooms.length} rooms for {searchCriteria.nights} nights
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="value_score">Best Value</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="rating_desc">Rating: High to Low</SelectItem>
              <SelectItem value="size_desc">Size: Large to Small</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              Cards
            </Button>
          </div>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={onClearAll}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Weights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparison Priorities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-medium">Price Weight</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={comparisonMetrics.priceWeight || 0.3}
                  onChange={(e) => onMetricsChange?.({
                    ...comparisonMetrics,
                    priceWeight: parseFloat(e.target.value)
                  })}
                  className="flex-1"
                />
                <span className="text-sm w-10 text-right">
                  {Math.round((comparisonMetrics.priceWeight || 0.3) * 100)}%
                </span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Amenities Weight</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={comparisonMetrics.amenitiesWeight || 0.2}
                  onChange={(e) => onMetricsChange?.({
                    ...comparisonMetrics,
                    amenitiesWeight: parseFloat(e.target.value)
                  })}
                  className="flex-1"
                />
                <span className="text-sm w-10 text-right">
                  {Math.round((comparisonMetrics.amenitiesWeight || 0.2) * 100)}%
                </span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Location Weight</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={comparisonMetrics.locationWeight || 0.2}
                  onChange={(e) => onMetricsChange?.({
                    ...comparisonMetrics,
                    locationWeight: parseFloat(e.target.value)
                  })}
                  className="flex-1"
                />
                <span className="text-sm w-10 text-right">
                  {Math.round((comparisonMetrics.locationWeight || 0.2) * 100)}%
                </span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Size Weight</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={comparisonMetrics.sizeWeight || 0.1}
                  onChange={(e) => onMetricsChange?.({
                    ...comparisonMetrics,
                    sizeWeight: parseFloat(e.target.value)
                  })}
                  className="flex-1"
                />
                <span className="text-sm w-10 text-right">
                  {Math.round((comparisonMetrics.sizeWeight || 0.1) * 100)}%
                </span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Rating Weight</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={comparisonMetrics.ratingWeight || 0.2}
                  onChange={(e) => onMetricsChange?.({
                    ...comparisonMetrics,
                    ratingWeight: parseFloat(e.target.value)
                  })}
                  className="flex-1"
                />
                <span className="text-sm w-10 text-right">
                  {Math.round((comparisonMetrics.ratingWeight || 0.2) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Recommendations */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="text-center">
              <Badge className="mb-2 bg-green-500 text-white">Best Value</Badge>
              <h4 className="font-semibold">{bestValueRoom?.roomId?.title}</h4>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(bestValueRoom?.roomId?.dynamicPricing?.total || 0)}
              </p>
              <Button size="sm" className="mt-2 w-full">
                Select Room
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="text-center">
              <Badge className="mb-2 bg-blue-500 text-white">Lowest Price</Badge>
              <h4 className="font-semibold">{cheapestRoom?.roomId?.title}</h4>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(cheapestRoom?.roomId?.dynamicPricing?.total || 0)}
              </p>
              <Button size="sm" className="mt-2 w-full">
                Select Room
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4">
            <div className="text-center">
              <Badge className="mb-2 bg-purple-500 text-white">Highest Rated</Badge>
              <h4 className="font-semibold">{bestRatedRoom?.roomId?.title}</h4>
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-bold text-purple-600">
                  {bestRatedRoom?.roomId?.rating?.average?.toFixed(1) || 'N/A'}
                </span>
              </div>
              <Button size="sm" className="mt-2 w-full">
                Select Room
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison View */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Room</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-center">Size</TableHead>
                    <TableHead className="text-center">Capacity</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">Price/Night</TableHead>
                    <TableHead className="text-center">Total Price</TableHead>
                    <TableHead className="text-center">Value Score</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRooms.map((room, index) => {
                    const { roomId } = room;
                    const valueScore = calculateValueScore(room);
                    const isBestValue = roomId._id === bestValueRoom?.roomId?._id;
                    const isCheapest = roomId._id === cheapestRoom?.roomId?._id;
                    const isBestRated = roomId._id === bestRatedRoom?.roomId?._id;

                    return (
                      <TableRow key={roomId._id} className={isBestValue ? 'bg-green-50' : ''}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{roomId.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {roomId.hotelId?.name}
                            </div>
                            {isBestValue && (
                              <Badge className="mt-1 text-xs">Best Value</Badge>
                            )}
                            {isCheapest && (
                              <Badge variant="outline" className="mt-1 text-xs">Lowest Price</Badge>
                            )}
                            {isBestRated && (
                              <Badge variant="outline" className="mt-1 text-xs">Top Rated</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {roomId.roomType?.charAt(0).toUpperCase() + roomId.roomType?.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {roomId.size?.squareMeters}m²
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{roomId.capacity?.maxGuests}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{roomId.rating?.average?.toFixed(1) || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {formatCurrency(roomId.dynamicPricing?.perNight?.totalPerNight || roomId.pricing?.base)}
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {formatCurrency(roomId.dynamicPricing?.total || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Progress value={valueScore} className="w-16" />
                            <span className="text-sm">{Math.round(valueScore)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" onClick={() => onRoomSelect?.(roomId)}>
                              Select
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedRoom(expandedRoom === roomId._id ? null : roomId._id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onRoomRemove?.(roomId._id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedRooms.map((room) => {
            const { roomId } = room;
            const valueScore = calculateValueScore(room);
            const isBestValue = roomId._id === bestValueRoom?.roomId?._id;

            return (
              <div key={roomId._id} className={`relative ${isBestValue ? 'ring-2 ring-green-500 rounded-lg' : ''}`}>
                {isBestValue && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge className="bg-green-500 text-white">Best Value</Badge>
                  </div>
                )}
                <EnhancedRoomCard
                  room={roomId}
                  hotelInfo={roomId.hotelId}
                  searchDates={searchCriteria}
                  guestCount={searchCriteria.guests?.total || 1}
                  onRoomSelect={onRoomSelect}
                  className="h-full"
                />
                <div className="mt-2 flex items-center justify-between p-2 border-t">
                  <div className="text-sm">
                    <div className="font-medium">Value Score</div>
                    <div className="flex items-center gap-2">
                      <Progress value={valueScore} className="w-20" />
                      <span>{Math.round(valueScore)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => onRoomSelect?.(roomId)}>
                      Select
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRoomRemove?.(roomId._id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RoomComparison;