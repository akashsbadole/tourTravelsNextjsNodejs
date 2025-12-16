"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Icons
import { Plane, CalendarDays, User, SeatLuggage, Utensils, CreditCard, Clock, AlertCircle, CheckCircle, Info } from "lucide-react";

// Import components
import ModificationSummary from "./ModificationSummary";
import FeeBreakdown from "./FeeBreakdown";
import ModificationConfirmation from "./ModificationConfirmation";

const modificationTypes = [
  {
    id: "date_change",
    title: "Change Flight Date",
    description: "Modify your flight departure or return dates",
    icon: CalendarDays,
    color: "bg-blue-500"
  },
  {
    id: "passenger_update",
    title: "Update Passenger Details",
    description: "Correct passenger information or add special requests",
    icon: User,
    color: "bg-green-500"
  },
  {
    id: "seat_change",
    title: "Change Seat Selection",
    description: "Select different seats for your flight",
    icon: SeatLuggage,
    color: "bg-purple-500"
  },
  {
    id: "baggage_change",
    title: "Modify Baggage Allowance",
    description: "Add or remove checked baggage",
    icon: SeatLuggage,
    color: "bg-orange-500"
  },
  {
    id: "meal_change",
    title: "Update Meal Preferences",
    description: "Change special meal requirements",
    icon: Utensils,
    color: "bg-pink-500"
  },
  {
    id: "class_upgrade",
    title: "Upgrade Class",
    description: "Upgrade to a higher cabin class",
    icon: CreditCard,
    color: "bg-yellow-500"
  }
];

const steps = [
  { id: 1, title: "Select Modification", description: "Choose what you want to modify" },
  { id: 2, title: "Enter Details", description: "Provide modification details" },
  { id: 3, title: "Review & Confirm", description: "Review changes and confirm" },
  { id: 4, title: "Payment", description: "Complete payment if required" },
  { id: 5, title: "Confirmation", description: "Modification request submitted" }
];

export default function FlightModificationWizard({ bookingId, bookingData, onModificationComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedModification, setSelectedModification] = useState(null);
  const [modificationDetails, setModificationDetails] = useState({});
  const [feeCalculation, setFeeCalculation] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modificationId, setModificationId] = useState(null);
  const [errors, setErrors] = useState({});

  // Calculate fees when modification details change
  useEffect(() => {
    if (selectedModification && Object.keys(modificationDetails).length > 0) {
      calculateFees();
    }
  }, [selectedModification, modificationDetails]);

  const calculateFees = async () => {
    setIsCalculating(true);
    try {
      const response = await fetch('/api/flight-modifications/calculate-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          modificationType: selectedModification.id,
          ...modificationDetails
        })
      });

      const result = await response.json();
      if (result.success) {
        setFeeCalculation(result.data);
        setErrors({});
      } else {
        setErrors({ calculation: result.message });
      }
    } catch (error) {
      setErrors({ calculation: 'Failed to calculate fees' });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleModificationSelect = (modification) => {
    setSelectedModification(modification);
    setModificationDetails({});
    setFeeCalculation(null);
    setCurrentStep(2);
  };

  const handleDetailsSubmit = (details) => {
    setModificationDetails(details);
    setCurrentStep(3);
  };

  const handleConfirmationSubmit = async (notes) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/flight-modifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          modifications: [{
            type: selectedModification.id,
            description: `${selectedModification.title} - ${notes || 'No additional notes'}`,
            originalValue: modificationDetails.originalValue,
            newValue: modificationDetails.newValue,
            segmentIndex: modificationDetails.segmentIndex,
            passengerIndex: modificationDetails.passengerIndex,
            passengerId: modificationDetails.passengerId
          }],
          notes,
          source: "web"
        })
      });

      const result = await response.json();
      if (result.success) {
        setModificationId(result.data.modification._id);
        setCurrentStep(4);
      } else {
        setErrors({ submission: result.message });
      }
    } catch (error) {
      setErrors({ submission: 'Failed to submit modification request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentComplete = () => {
    setCurrentStep(5);
    if (onModificationComplete) {
      onModificationComplete(modificationId);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ModificationTypeSelection onSelect={handleModificationSelect} />;
      case 2:
        return (
          <ModificationDetailsForm
            modification={selectedModification}
            bookingData={bookingData}
            onSubmit={handleDetailsSubmit}
            onBack={() => setCurrentStep(1)}
            isCalculating={isCalculating}
            feeCalculation={feeCalculation}
            errors={errors}
          />
        );
      case 3:
        return (
          <ModificationSummary
            modification={selectedModification}
            details={modificationDetails}
            feeCalculation={feeCalculation}
            bookingData={bookingData}
            onConfirm={handleConfirmationSubmit}
            onBack={() => setCurrentStep(2)}
            isSubmitting={isSubmitting}
            errors={errors}
          />
        );
      case 4:
        return (
          <ModificationPayment
            modificationId={modificationId}
            feeCalculation={feeCalculation}
            onPaymentComplete={handlePaymentComplete}
            onBack={() => setCurrentStep(3)}
          />
        );
      case 5:
        return (
          <ModificationConfirmation
            modificationId={modificationId}
            bookingData={bookingData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Flight Booking Modification</h1>
        <p className="text-muted-foreground">
          Modify your flight booking with ease. Changes are subject to airline policies and fees.
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center space-y-2 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.id}
                  </div>
                  <span className="text-xs text-center hidden sm:block">{step.title}</span>
                </div>
              ))}
            </div>
            <Progress value={(currentStep / steps.length) * 100} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {renderStepContent()}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Modifications are subject to airline policies and availability</p>
            <p>• Some modifications may require additional fees</p>
            <p>• Processing time varies by modification type</p>
            <p>• You'll receive confirmation once your modification is processed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Modification Type Selection Component
function ModificationTypeSelection({ onSelect }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">What would you like to modify?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modificationTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Card
              key={type.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelect(type)}
            >
              <CardContent className="p-6 text-center space-y-3">
                <div className={`w-16 h-16 rounded-full ${type.color} flex items-center justify-center mx-auto`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold">{type.title}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Modification Details Form Component
function ModificationDetailsForm({ modification, bookingData, onSubmit, onBack, isCalculating, feeCalculation, errors }) {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const details = {
      ...formData,
      originalValue: getOriginalValue(modification.id, bookingData),
      newValue: getNewValue(modification.id, formData)
    };

    onSubmit(details);
    setIsSubmitting(false);
  };

  const getOriginalValue = (type, booking) => {
    switch (type) {
      case "date_change":
        return booking.segments?.[0]?.departureDateTime;
      case "passenger_update":
        return booking.passengers?.[0];
      case "seat_change":
        return booking.passengers?.[0]?.seatNumber;
      case "baggage_change":
        return booking.baggageAllowance;
      case "meal_change":
        return booking.passengers?.[0]?.preferences?.mealPreference;
      case "class_upgrade":
        return booking.passengers?.[0]?.seatClass;
      default:
        return null;
    }
  };

  const getNewValue = (type, data) => {
    switch (type) {
      case "date_change":
        return data.newDate;
      case "passenger_update":
        return {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phoneNumber: data.phoneNumber
        };
      case "seat_change":
        return data.newSeat;
      case "baggage_change":
        return data.newBaggageAllowance;
      case "meal_change":
        return data.newMealPreference;
      case "class_upgrade":
        return data.newClass;
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{modification.title}</h2>
        
        {/* Render form fields based on modification type */}
        {modification.id === "date_change" && (
          <DateChangeForm bookingData={bookingData} formData={formData} setFormData={setFormData} />
        )}
        
        {modification.id === "passenger_update" && (
          <PassengerUpdateForm bookingData={bookingData} formData={formData} setFormData={setFormData} />
        )}
        
        {modification.id === "seat_change" && (
          <SeatChangeForm bookingData={bookingData} formData={formData} setFormData={setFormData} />
        )}
        
        {modification.id === "baggage_change" && (
          <BaggageChangeForm bookingData={bookingData} formData={formData} setFormData={setFormData} />
        )}
        
        {modification.id === "meal_change" && (
          <MealChangeForm bookingData={bookingData} formData={formData} setFormData={setFormData} />
        )}
        
        {modification.id === "class_upgrade" && (
          <ClassUpgradeForm bookingData={bookingData} formData={formData} setFormData={setFormData} />
        )}
      </div>

      {/* Fee Calculation Results */}
      {isCalculating && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Calculating fees...</AlertTitle>
          <AlertDescription>
            Please wait while we calculate the modification fees and check availability.
          </AlertDescription>
        </Alert>
      )}

      {errors.calculation && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Calculation Error</AlertTitle>
          <AlertDescription>{errors.calculation}</AlertDescription>
        </Alert>
      )}

      {feeCalculation && (
        <FeeBreakdown feeCalculation={feeCalculation} />
      )}

      {/* Form Actions */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting || isCalculating || !feeCalculation}>
          {isSubmitting ? 'Processing...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}

// Form components for each modification type
function DateChangeForm({ bookingData, formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Current Flight Date</Label>
        <p className="text-sm text-muted-foreground">
          {new Date(bookingData.segments?.[0]?.departureDateTime).toLocaleDateString()}
        </p>
      </div>
      
      <div>
        <Label htmlFor="newDate">New Flight Date</Label>
        <Input
          id="newDate"
          type="date"
          value={formData.newDate || ''}
          onChange={(e) => setFormData({ ...formData, newDate: e.target.value })}
          min={new Date().toISOString().split('T')[0]}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="reason">Reason for Change</Label>
        <Textarea
          id="reason"
          value={formData.reason || ''}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="Please provide a reason for the date change..."
        />
      </div>
    </div>
  );
}

function PassengerUpdateForm({ bookingData, formData, setFormData }) {
  const passenger = bookingData.passengers?.[0] || {};
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName || passenger.firstName || ''}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName || passenger.lastName || ''}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email || passenger.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input
          id="phoneNumber"
          value={formData.phoneNumber || passenger.phoneNumber?.number || ''}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          required
        />
      </div>
    </div>
  );
}

function SeatChangeForm({ bookingData, formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Current Seat</Label>
        <p className="text-sm text-muted-foreground">
          {bookingData.passengers?.[0]?.seatNumber || 'Not assigned'}
        </p>
      </div>
      
      <div>
        <Label htmlFor="newSeat">Preferred Seat Type</Label>
        <Select value={formData.newSeat || ''} onValueChange={(value) => setFormData({ ...formData, newSeat: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select seat preference" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="window">Window Seat</SelectItem>
            <SelectItem value="aisle">Aisle Seat</SelectItem>
            <SelectItem value="middle">Middle Seat</SelectItem>
            <SelectItem value="exit">Exit Row Seat</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function BaggageChangeForm({ bookingData, formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Current Baggage Allowance</Label>
        <p className="text-sm text-muted-foreground">
          {bookingData.baggageAllowance?.checked?.weight || 'Not specified'} kg checked baggage
        </p>
      </div>
      
      <div>
        <Label htmlFor="newBaggageAllowance">New Baggage Allowance (kg)</Label>
        <Input
          id="newBaggageAllowance"
          type="number"
          value={formData.newBaggageAllowance || ''}
          onChange={(e) => setFormData({ ...formData, newBaggageAllowance: parseInt(e.target.value) })}
          min="0"
          max="50"
          required
        />
      </div>
    </div>
  );
}

function MealChangeForm({ bookingData, formData, setFormData }) {
  const mealOptions = [
    { value: "standard", label: "Standard Meal" },
    { value: "vegetarian", label: "Vegetarian" },
    { value: "vegan", label: "Vegan" },
    { value: "halal", label: "Halal" },
    { value: "kosher", label: "Kosher" },
    { value: "gluten-free", label: "Gluten-Free" },
    { value: "diabetic", label: "Diabetic" },
    { value: "child", label: "Child Meal" }
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label>Current Meal Preference</Label>
        <p className="text-sm text-muted-foreground">
          {bookingData.passengers?.[0]?.preferences?.mealPreference || 'Standard'}
        </p>
      </div>
      
      <div>
        <Label htmlFor="newMealPreference">New Meal Preference</Label>
        <Select value={formData.newMealPreference || ''} onValueChange={(value) => setFormData({ ...formData, newMealPreference: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select meal preference" />
          </SelectTrigger>
          <SelectContent>
            {mealOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ClassUpgradeForm({ bookingData, formData, setFormData }) {
  const currentClass = bookingData.passengers?.[0]?.seatClass || 'economy';
  const upgradeOptions = {
    economy: ['premium_economy', 'business', 'first'],
    premium_economy: ['business', 'first'],
    business: ['first']
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Current Class</Label>
        <p className="text-sm text-muted-foreground capitalize">{currentClass}</p>
      </div>
      
      <div>
        <Label htmlFor="newClass">Upgrade To</Label>
        <Select value={formData.newClass || ''} onValueChange={(value) => setFormData({ ...formData, newClass: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select upgrade class" />
          </SelectTrigger>
          <SelectContent>
            {upgradeOptions[currentClass]?.map((option) => (
              <SelectItem key={option} value={option}>
                {option.replace('_', ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}