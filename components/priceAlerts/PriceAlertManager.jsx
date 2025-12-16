"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, BellIcon, SettingsIcon, TrashIcon, PauseIcon, PlayIcon } from "lucide-react";
import { 
  formatPrice, 
  getTimeRemaining, 
  getAlertStatusColor,
  generateAlertSummary 
} from "@/lib/utils/priceAlertUtils";

/**
 * Price Alert Manager Component
 * Main component for managing price alerts
 */
export default function PriceAlertManager() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    tripType: "all",
    sortBy: "createdAt",
    sortOrder: "desc"
  });

  // Load alerts on component mount
  useEffect(() => {
    loadAlerts();
  }, [filters]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: 1,
        limit: 20,
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.tripType !== "all" && { tripType: filters.tripType }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      const response = await fetch(`/api/price-alerts?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = () => {
    setEditingAlert(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditAlert = (alert) => {
    setEditingAlert(alert);
    setIsCreateDialogOpen(true);
  };

  const handleDeleteAlert = async (alertId) => {
    if (!confirm("Are you sure you want to delete this price alert?")) {
      return;
    }

    try {
      const response = await fetch(`/api/price-alerts/${alertId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setAlerts(alerts.filter(alert => alert._id !== alertId));
      }
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  const handleToggleAlert = async (alertId, action) => {
    try {
      const response = await fetch(`/api/price-alerts/${alertId}?action=${action}`, {
        method: "PATCH",
      });
      
      if (response.ok) {
        setAlerts(alerts.map(alert => 
          alert._id === alertId 
            ? { ...alert, status: action === 'pause' ? 'paused' : 'active' }
            : alert
        ));
      }
    } catch (error) {
      console.error(`Error ${action}ing alert:`, error);
    }
  };

  const handleAlertCreated = (newAlert) => {
    setAlerts([newAlert, ...alerts]);
    setIsCreateDialogOpen(false);
    setEditingAlert(null);
  };

  const handleAlertUpdated = (updatedAlert) => {
    setAlerts(alerts.map(alert => 
      alert._id === updatedAlert._id ? updatedAlert : alert
    ));
    setIsCreateDialogOpen(false);
    setEditingAlert(null);
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      expired: "bg-gray-100 text-gray-800",
      triggered: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading price alerts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Price Alerts</h1>
          <p className="text-gray-600">Manage your flight price monitoring</p>
        </div>
        <Button onClick={handleCreateAlert} className="flex items-center gap-2">
          <BellIcon className="h-4 w-4" />
          Create Alert
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="triggered">Triggered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="trip-type-filter">Trip Type</Label>
              <Select value={filters.tripType} onValueChange={(value) => setFilters(prev => ({ ...prev, tripType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="oneway">One Way</SelectItem>
                  <SelectItem value="roundtrip">Round Trip</SelectItem>
                  <SelectItem value="multicity">Multi City</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort-by">Sort By</Label>
              <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="departureDate">Departure Date</SelectItem>
                  <SelectItem value="expiresAt">Expires At</SelectItem>
                  <SelectItem value="lastTriggeredAt">Last Triggered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort-order">Order</Label>
              <Select value={filters.sortOrder} onValueChange={(value) => setFilters(prev => ({ ...prev, sortOrder: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-gray-500">
                <BellIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No price alerts found</h3>
                <p>Create your first price alert to start monitoring flight prices.</p>
                <Button onClick={handleCreateAlert} className="mt-4">
                  Create Your First Alert
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card key={alert._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        {alert.searchCriteria.origin.airportCode} → {alert.searchCriteria.destination.airportCode}
                      </h3>
                      {getStatusBadge(alert.status)}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Departure:</strong> {format(new Date(alert.searchCriteria.departureDate), "MMM dd, yyyy")}</p>
                      <p><strong>Passengers:</strong> {(alert.searchCriteria.passengers.adults || 0) + (alert.searchCriteria.passengers.children || 0) + (alert.searchCriteria.passengers.infants || 0)}</p>
                      <p><strong>Class:</strong> {alert.searchCriteria.cabinClass}</p>
                      {alert.searchCriteria.returnDate && (
                        <p><strong>Return:</strong> {format(new Date(alert.searchCriteria.returnDate), "MMM dd, yyyy")}</p>
                      )}
                    </div>

                    <div className="mt-3">
                      <p className="text-sm font-medium">Alert Conditions:</p>
                      <div className="text-xs text-gray-600 mt-1">
                        {alert.conditions.percentageDrop?.enabled && (
                          <p>• Price drops {alert.conditions.percentageDrop.threshold}% or more</p>
                        )}
                        {alert.conditions.specificPrice?.enabled && (
                          <p>• Price reaches {formatPrice(alert.conditions.specificPrice.targetPrice, alert.conditions.specificPrice.currency)} or less</p>
                        )}
                        {alert.conditions.dailyChange?.enabled && (
                          <p>• Daily {alert.conditions.dailyChange.changeType} of {formatPrice(alert.conditions.dailyChange.minChangeAmount)} or more</p>
                        )}
                      </div>
                    </div>

                    {alert.currentBestPrice && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-800">Current Best Price:</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatPrice(alert.currentBestPrice.amount, alert.currentBestPrice.currency)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditAlert(alert)}
                    >
                      <SettingsIcon className="h-4 w-4" />
                    </Button>
                    
                    {alert.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAlert(alert._id, 'pause')}
                      >
                        <PauseIcon className="h-4 w-4" />
                      </Button>
                    ) : alert.status === 'paused' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAlert(alert._id, 'resume')}
                      >
                        <PlayIcon className="h-4 w-4" />
                      </Button>
                    ) : null}
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteAlert(alert._id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {alert.expiresAt && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Expires:</span>
                      <span className={getTimeRemaining(alert.expiresAt).expired ? "text-red-600 font-medium" : "text-gray-800"}>
                        {format(new Date(alert.expiresAt), "MMM dd, yyyy HH:mm")}
                        <span className="ml-2">({getTimeRemaining(alert.expiresAt).text})</span>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAlert ? "Edit Price Alert" : "Create New Price Alert"}
            </DialogTitle>
          </DialogHeader>
          <PriceAlertForm
            alert={editingAlert}
            onSave={editingAlert ? handleAlertUpdated : handleAlertCreated}
            onCancel={() => {
              setIsCreateDialogOpen(false);
              setEditingAlert(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Price Alert Form Component
 * Form for creating and editing price alerts
 */
function PriceAlertForm({ alert, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    searchCriteria: {
      origin: { airportCode: "", city: "", country: "" },
      destination: { airportCode: "", city: "", country: "" },
      departureDate: new Date(),
      returnDate: null,
      tripType: "oneway",
      passengers: { adults: 1, children: 0, infants: 0 },
      cabinClass: "economy",
      airlines: [],
      filters: {
        priceRange: { min: null, max: null },
        departureTime: { start: "", end: "" },
        arrivalTime: { start: "", end: "" },
        stops: "any",
        duration: { maxHours: null },
      },
    },
    conditions: {
      percentageDrop: { enabled: false, threshold: 10 },
      specificPrice: { enabled: false, targetPrice: null, currency: "USD" },
      dailyChange: { enabled: false, minChangeAmount: 50, changeType: "drop" },
      priceTrend: { enabled: false, trendType: "falling", duration: 7, durationUnit: "days" },
      competitivePrice: { enabled: false, comparisonType: "cheapest", threshold: 10 },
    },
    notificationPreferences: {
      email: { enabled: true, frequency: "immediate", batchSize: 1 },
      push: { enabled: true, frequency: "immediate" },
      sms: { enabled: false, frequency: "immediate", phoneNumber: "" },
      quietHours: { enabled: false, startTime: "22:00", endTime: "08:00", timezone: "UTC" },
      maxNotificationsPerDay: 10,
    },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  });

  const [activeTab, setActiveTab] = useState("search");

  // Initialize form with alert data if editing
  useEffect(() => {
    if (alert) {
      setFormData(alert);
    }
  }, [alert]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = alert ? `/api/price-alerts/${alert._id}` : "/api/price-alerts";
      const method = alert ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        onSave(result.data);
      } else {
        console.error("Error saving alert:", result.error);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const updateFormData = (path, value) => {
    setFormData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return newData;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Search Criteria</TabsTrigger>
          <TabsTrigger value="conditions">Alert Conditions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="expiry">Expiry</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origin">Origin Airport</Label>
              <Input
                id="origin"
                placeholder="e.g., JFK"
                value={formData.searchCriteria.origin.airportCode}
                onChange={(e) => updateFormData("searchCriteria.origin.airportCode", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="destination">Destination Airport</Label>
              <Input
                id="destination"
                placeholder="e.g., LAX"
                value={formData.searchCriteria.destination.airportCode}
                onChange={(e) => updateFormData("searchCriteria.destination.airportCode", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="departure-date">Departure Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.searchCriteria.departureDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.searchCriteria.departureDate}
                    onSelect={(date) => updateFormData("searchCriteria.departureDate", date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="trip-type">Trip Type</Label>
              <Select value={formData.searchCriteria.tripType} onValueChange={(value) => updateFormData("searchCriteria.tripType", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oneway">One Way</SelectItem>
                  <SelectItem value="roundtrip">Round Trip</SelectItem>
                  <SelectItem value="multicity">Multi City</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="adults">Adults</Label>
              <Input
                id="adults"
                type="number"
                min="1"
                max="9"
                value={formData.searchCriteria.passengers.adults}
                onChange={(e) => updateFormData("searchCriteria.passengers.adults", parseInt(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="children">Children</Label>
              <Input
                id="children"
                type="number"
                min="0"
                max="9"
                value={formData.searchCriteria.passengers.children}
                onChange={(e) => updateFormData("searchCriteria.passengers.children", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="infants">Infants</Label>
              <Input
                id="infants"
                type="number"
                min="0"
                max="9"
                value={formData.searchCriteria.passengers.infants}
                onChange={(e) => updateFormData("searchCriteria.passengers.infants", parseInt(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cabin-class">Cabin Class</Label>
            <Select value={formData.searchCriteria.cabinClass} onValueChange={(value) => updateFormData("searchCriteria.cabinClass", value)}>
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
        </TabsContent>

        <TabsContent value="conditions" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Alert Trigger Conditions</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="percentage-drop"
                checked={formData.conditions.percentageDrop.enabled}
                onCheckedChange={(checked) => updateFormData("conditions.percentageDrop.enabled", checked)}
              />
              <Label htmlFor="percentage-drop">
                Price drops by percentage
              </Label>
              {formData.conditions.percentageDrop.enabled && (
                <div className="ml-6">
                  <Label htmlFor="drop-threshold">Drop threshold (%)</Label>
                  <Slider
                    id="drop-threshold"
                    min="1"
                    max="50"
                    step="1"
                    value={[formData.conditions.percentageDrop.threshold]}
                    onValueChange={(value) => updateFormData("conditions.percentageDrop.threshold", value[0])}
                    className="w-48"
                  />
                  <span className="ml-2">{formData.conditions.percentageDrop.threshold}%</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="specific-price"
                checked={formData.conditions.specificPrice.enabled}
                onCheckedChange={(checked) => updateFormData("conditions.specificPrice.enabled", checked)}
              />
              <Label htmlFor="specific-price">
                Specific price target
              </Label>
              {formData.conditions.specificPrice.enabled && (
                <div className="ml-6">
                  <Label htmlFor="target-price">Target price</Label>
                  <Input
                    id="target-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.conditions.specificPrice.targetPrice || ""}
                    onChange={(e) => updateFormData("conditions.specificPrice.targetPrice", parseFloat(e.target.value))}
                    placeholder="Enter target price"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="daily-change"
                checked={formData.conditions.dailyChange.enabled}
                onCheckedChange={(checked) => updateFormData("conditions.dailyChange.enabled", checked)}
              />
              <Label htmlFor="daily-change">
                Daily price change
              </Label>
              {formData.conditions.dailyChange.enabled && (
                <div className="ml-6 space-y-2">
                  <div>
                    <Label htmlFor="change-type">Change type</Label>
                    <Select value={formData.conditions.dailyChange.changeType} onValueChange={(value) => updateFormData("conditions.dailyChange.changeType", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drop">Price Drop</SelectItem>
                        <SelectItem value="rise">Price Rise</SelectItem>
                        <SelectItem value="any">Any Change</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="min-change">Minimum change amount</Label>
                    <Input
                      id="min-change"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.conditions.dailyChange.minChangeAmount}
                      onChange={(e) => updateFormData("conditions.dailyChange.minChangeAmount", parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notification Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email-notifications"
                  checked={formData.notificationPreferences.email.enabled}
                  onCheckedChange={(checked) => updateFormData("notificationPreferences.email.enabled", checked)}
                />
                <Label htmlFor="email-notifications">Email notifications</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="push-notifications"
                  checked={formData.notificationPreferences.push.enabled}
                  onCheckedChange={(checked) => updateFormData("notificationPreferences.push.enabled", checked)}
                />
                <Label htmlFor="push-notifications">Push notifications</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sms-notifications"
                  checked={formData.notificationPreferences.sms.enabled}
                  onCheckedChange={(checked) => updateFormData("notificationPreferences.sms.enabled", checked)}
                />
                <Label htmlFor="sms-notifications">SMS notifications</Label>
              </div>

              <div>
                <Label htmlFor="max-notifications">Maximum notifications per day</Label>
                <Input
                  id="max-notifications"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.notificationPreferences.maxNotificationsPerDay}
                  onChange={(e) => updateFormData("notificationPreferences.maxNotificationsPerDay", parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expiry" className="space-y-4">
          <div>
            <Label htmlFor="expires-at">Alert expires on</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.expiresAt, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.expiresAt}
                  onSelect={(date) => updateFormData("expiresAt", date)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 pt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {alert ? "Update Alert" : "Create Alert"}
        </Button>
      </div>
    </form>
  );
}