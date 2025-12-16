"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Calendar as CalendarIcon, 
  Plane, 
  Hotel, 
  Car, 
  Train, 
  Ship, 
  Clock, 
  DollarSign, 
  Users, 
  Star, 
  Heart,
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  Filter,
  TrendingUp,
  Globe
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export function TravelPreferencesManager({ 
  preferencesData, 
  historyData, 
  onPreferencesUpdate, 
  onHistoryUpdate,
  onDestinationAdd 
}) {
  const [activeTab, setActiveTab] = useState("preferences");
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newDestination, setNewDestination] = useState({
    destination: '',
    reason: '',
    targetDate: null,
    priority: 'medium'
  });
  const [filters, setFilters] = useState({
    type: 'all',
    year: 'all',
    status: 'all'
  });
  const { toast } = useToast();

  const travelHistory = historyData?.travelHistory || [];
  const preferences = preferencesData?.travelPreferences || {};

  const getTransportIcon = (mode) => {
    const icons = {
      flight: <Plane className="h-4 w-4" />,
      train: <Train className="h-4 w-4" />,
      car: <Car className="h-4 w-4" />,
      bus: <Car className="h-4 w-4" />,
      cruise: <Ship className="h-4 w-4" />,
      taxi: <Car className="h-4 w-4" />
    };
    return icons[mode] || <Plane className="h-4 w-4" />;
  };

  const getAccommodationIcon = (type) => {
    const icons = {
      hotel: <Hotel className="h-4 w-4" />,
      apartment: <Users className="h-4 w-4" />,
      resort: <Hotel className="h-4 w-4" />,
      villa: <Hotel className="h-4 w-4" />,
      hostel: <Users className="h-4 w-4" />,
      guesthouse: <Hotel className="h-4 w-4" />
    };
    return icons[type] || <Hotel className="h-4 w-4" />;
  };

  const handleSavePreferences = async (section, data) => {
    try {
      const result = await onPreferencesUpdate(section, data);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Travel preferences updated successfully",
          variant: "default",
        });
        setIsEditing(false);
        setEditingItem(null);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update preferences",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleAddDestination = async () => {
    try {
      const result = await onDestinationAdd(newDestination);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Destination added to wishlist",
          variant: "default",
        });
        setNewDestination({
          destination: '',
          reason: '',
          targetDate: null,
          priority: 'medium'
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to add destination",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const filteredHistory = travelHistory.filter(trip => {
    if (filters.type !== 'all' && trip.tripType !== filters.type) return false;
    if (filters.year !== 'all') {
      const tripYear = new Date(trip.destinations[0]?.arrivalDate).getFullYear();
      if (tripYear !== parseInt(filters.year)) return false;
    }
    if (filters.status !== 'all') {
      const isCompleted = trip.destinations.some(dest => 
        new Date(dest.departureDate) < new Date()
      );
      if (filters.status === 'completed' && !isCompleted) return false;
      if (filters.status === 'upcoming' && isCompleted) return false;
    }
    return true;
  });

  const PreferencesTab = () => (
    <div className="space-y-6">
      {/* Travel Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Travel Style
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
          </CardTitle>
          <CardDescription>
            Your overall travel preferences and style
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Travel Style</Label>
              <Select value={preferences.travelStyle} disabled={!isEditing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Budget</SelectItem>
                  <SelectItem value="mid_range">Mid-Range</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="backpacker">Backpacker</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="adventure">Adventure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Trip Frequency</Label>
              <Select value={preferences.general?.travelFrequency} disabled={!isEditing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rare">Rarely</SelectItem>
                  <SelectItem value="occasionally">Occasionally</SelectItem>
                  <SelectItem value="frequently">Frequently</SelectItem>
                  <SelectItem value="very_frequently">Very Frequently</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Trip Duration (days)</Label>
              <Input 
                type="number" 
                value={preferences.general?.tripDuration?.min || 1}
                disabled={!isEditing}
                onChange={(e) => setEditingItem({
                  ...editingItem,
                  general: {
                    ...editingItem?.general,
                    tripDuration: {
                      ...editingItem?.general?.tripDuration,
                      min: parseInt(e.target.value)
                    }
                  }
                })}
              />
            </div>
            
            <div>
              <Label>Max Trip Duration (days)</Label>
              <Input 
                type="number" 
                value={preferences.general?.tripDuration?.max || 30}
                disabled={!isEditing}
                onChange={(e) => setEditingItem({
                  ...editingItem,
                  general: {
                    ...editingItem?.general,
                    tripDuration: {
                      ...editingItem?.general?.tripDuration,
                      max: parseInt(e.target.value)
                    }
                  }
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Budget ({preferences.general?.budgetRange?.currency || 'USD'})</Label>
              <Input 
                type="number" 
                value={preferences.general?.budgetRange?.min || 0}
                disabled={!isEditing}
                onChange={(e) => setEditingItem({
                  ...editingItem,
                  general: {
                    ...editingItem?.general,
                    budgetRange: {
                      ...editingItem?.general?.budgetRange,
                      min: parseInt(e.target.value)
                    }
                  }
                })}
              />
            </div>
            
            <div>
              <Label>Max Budget ({preferences.general?.budgetRange?.currency || 'USD'})</Label>
              <Input 
                type="number" 
                value={preferences.general?.budgetRange?.max || 10000}
                disabled={!isEditing}
                onChange={(e) => setEditingItem({
                  ...editingItem,
                  general: {
                    ...editingItem?.general,
                    budgetRange: {
                      ...editingItem?.general?.budgetRange,
                      max: parseInt(e.target.value)
                    }
                  }
                })}
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSavePreferences('general', editingItem?.general || preferences.general)}>
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transport Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Transport Preferences</CardTitle>
          <CardDescription>
            Your preferred modes of transportation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {preferences.general?.transportModes?.map(mode => (
              <div key={mode} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getTransportIcon(mode)}
                  <div>
                    <div className="font-medium capitalize">
                      {mode.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <Badge variant={preferences.general?.transportModes?.includes(mode) ? "default" : "secondary"}>
                  {preferences.general?.transportModes?.includes(mode) ? 'Preferred' : 'Not Preferred'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accommodation Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Accommodation Preferences</CardTitle>
          <CardDescription>
            Your preferred types of accommodation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {preferences.general?.accommodationType?.map(type => (
              <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getAccommodationIcon(type)}
                  <div>
                    <div className="font-medium capitalize">
                      {type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <Badge variant={preferences.general?.accommodationType?.includes(type) ? "default" : "secondary"}>
                  {preferences.general?.accommodationType?.includes(type) ? 'Preferred' : 'Not Preferred'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Flight Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Flight Preferences</CardTitle>
          <CardDescription>
            Your specific flight and airline preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Preferred Cabin Class</Label>
            <Select value={preferences.flights?.preferredCabinClass} disabled={!isEditing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="economy">Economy</SelectItem>
                <SelectItem value="premium_economy">Premium Economy</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="first">First Class</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Preferred Airlines</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {preferences.flights?.preferredAirlines?.map(airline => (
                <Badge key={airline} variant="outline" className="px-3 py-1">
                  {airline}
                </Badge>
              ))}
              {isEditing && (
                <Button size="sm" variant="outline">
                  <Plus className="h-3 w-3" />
                  Add Airline
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>Seat Preferences</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {['window', 'aisle', 'middle', 'exit_row', 'front', 'back'].map(seat => (
                <div key={seat} className="flex items-center space-x-2">
                  <Checkbox
                    id={seat}
                    checked={preferences.flights?.seatPreferences?.includes(seat)}
                    disabled={!isEditing}
                  />
                  <Label htmlFor={seat} className="capitalize">
                    {seat.replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const HistoryTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Travel History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Trip Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="leisure">Leisure</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="adventure">Adventure</SelectItem>
                  <SelectItem value="romantic">Romantic</SelectItem>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Year</Label>
              <Select value={filters.year} onValueChange={(value) => setFilters(prev => ({ ...prev, year: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {[2024, 2023, 2022, 2021].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trips</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Travel History List */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Travel History</h3>
              <p className="text-muted-foreground">
                Your travel history will appear here once you start booking trips.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredHistory.map((trip, index) => (
            <Card key={trip.tripId}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {trip.tripType.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {new Date(trip.destinations[0]?.arrivalDate).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <h3 className="font-semibold mb-2">
                      {trip.destinations.map(dest => dest.city).join(' → ')}
                    </h3>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {trip.destinations.map((dest, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{dest.city}, {dest.country}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3">
                      <div className="text-sm font-medium">Total Cost:</div>
                      <div className="text-lg font-semibold">
                        {trip.totalCost.currency} {trip.totalCost.amount.toLocaleString()}
                      </div>
                    </div>
                    
                    {trip.satisfaction && (
                      <div className="mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill="currentColor" />
                          <span className="text-sm">
                            {trip.satisfaction.overallRating}/5
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const WishlistTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Travel Wishlist
            </div>
            <Button onClick={() => setActiveTab('add-wishlist')} size="sm">
              <Plus className="h-4 w-4" />
              Add Destination
            </Button>
          </CardTitle>
          <CardDescription>
            Destinations you want to visit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {preferencesData?.social?.wishlist?.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Wishlist Items</h3>
                <p className="text-muted-foreground">
                  Start adding destinations to create your travel wishlist.
                </p>
              </div>
            ) : (
              preferencesData?.social?.wishlist?.map((item, index) => (
                <div key={item._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {item.itemType.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'}>
                        {item.priority}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold mb-1">
                      {item.name}
                    </h3>
                    
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      {item.targetDate && (
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>Target: {new Date(item.targetDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {item.estimatedCost && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>{item.estimatedCost.currency} {item.estimatedCost.amount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Destination Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Destination</CardTitle>
          <CardDescription>
            Add a destination to your wishlist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Destination</Label>
            <Input
              value={newDestination.destination}
              onChange={(e) => setNewDestination(prev => ({ ...prev, destination: e.target.value }))}
              placeholder="Enter destination name"
            />
          </div>

          <div>
            <Label>Reason for Visit</Label>
            <Textarea
              value={newDestination.reason}
              onChange={(e) => setNewDestination(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Why do you want to visit this destination?"
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label>Target Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !newDestination.targetDate && "text-muted-foreground"
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDestination.targetDate ? (
                    format(newDestination.targetDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newDestination.targetDate}
                  onSelect={(date) => setNewDestination(prev => ({ ...prev, targetDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Priority</Label>
            <Select 
              value={newDestination.priority} 
              onValueChange={(value) => setNewDestination(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleAddDestination} disabled={!newDestination.destination}>
              <Plus className="mr-2 h-4 w-4" />
              Add to Wishlist
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences">
          <PreferencesTab />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>

        <TabsContent value="wishlist">
          <WishlistTab />
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}