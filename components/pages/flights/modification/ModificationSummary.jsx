"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Clock, DollarSign, Info } from "lucide-react";
import { capitalize } from "@/lib/utils";

export default function ModificationSummary({ 
  modification, 
  details, 
  feeCalculation, 
  bookingData, 
  onConfirm, 
  onBack, 
  isSubmitting, 
  errors 
}) {
  const [notes, setNotes] = React.useState("");

  const handleConfirm = () => {
    onConfirm(notes);
  };

  const formatModificationDetails = (type, details) => {
    switch (type) {
      case "date_change":
        return {
          original: new Date(details.originalValue).toLocaleDateString(),
          new: new Date(details.newValue).toLocaleDateString(),
          description: "Flight date change"
        };
      case "passenger_update":
        return {
          original: `${details.originalValue?.firstName} ${details.originalValue?.lastName}`,
          new: `${details.newValue?.firstName} ${details.newValue?.lastName}`,
          description: "Passenger information update"
        };
      case "seat_change":
        return {
          original: details.originalValue || "Not assigned",
          new: details.newValue,
          description: "Seat preference change"
        };
      case "baggage_change":
        return {
          original: `${details.originalValue?.checked?.weight || 0} kg`,
          new: `${details.newValue} kg`,
          description: "Baggage allowance change"
        };
      case "meal_change":
        return {
          original: details.originalValue || "Standard",
          new: details.newValue,
          description: "Meal preference change"
        };
      case "class_upgrade":
        return {
          original: details.originalValue?.replace('_', ' ').toUpperCase() || "ECONOMY",
          new: details.newValue?.replace('_', ' ').toUpperCase(),
          description: "Cabin class upgrade"
        };
      default:
        return {
          original: "N/A",
          new: "N/A",
          description: "Modification"
        };
    }
  };

  const modDetails = formatModificationDetails(modification.id, details);

  return (
    <div className="space-y-6">
      {/* Modification Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Modification Summary
          </CardTitle>
          <CardDescription>
            Review your modification details before confirmation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Modification Type</Label>
              <p className="font-semibold">{modification.title}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Booking Reference</Label>
              <p className="font-semibold">{bookingData.pnrCode}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Change Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Current</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">{modDetails.original}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm">→</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">New</Label>
                <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                  <p className="font-medium text-primary">{modDetails.new}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Flight Information */}
          <div className="space-y-3">
            <h4 className="font-medium">Flight Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Flight Number:</span>
                <span className="ml-2 font-medium">{bookingData.itineraryFlightNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Route:</span>
                <span className="ml-2 font-medium">
                  {bookingData.segments?.[0]?.departureAirportIataCode} → {bookingData.segments?.[0]?.arrivalAirportIataCode}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Departure:</span>
                <span className="ml-2 font-medium">
                  {new Date(bookingData.segments?.[0]?.departureDateTime).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Passengers:</span>
                <span className="ml-2 font-medium">{bookingData.passengers?.length || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Breakdown */}
      {feeCalculation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Fee Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modification Fee</span>
                <span className="font-medium">
                  ${feeCalculation.feeCalculation?.fee || 0} {feeCalculation.currency}
                </span>
              </div>
              
              {feeCalculation.fareDifference?.difference > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fare Difference</span>
                  <span className="font-medium">
                    ${feeCalculation.fareDifference.difference} {feeCalculation.currency}
                  </span>
                </div>
              )}
              
              {feeCalculation.fareDifference?.refundAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refund Amount</span>
                  <span className="font-medium text-green-600">
                    -${feeCalculation.fareDifference.refundAmount} {feeCalculation.currency}
                  </span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Amount</span>
                <span className={feeCalculation.totalAdditionalCost > 0 ? "text-primary" : "text-green-600"}>
                  {feeCalculation.totalAdditionalCost > 0 ? '+' : '-'}
                  ${Math.abs(feeCalculation.totalAdditionalCost || feeCalculation.totalRefundAmount)} {feeCalculation.currency}
                </span>
              </div>
            </div>

            {/* Time Restrictions */}
            {feeCalculation.timeRestrictions && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Time Restrictions</AlertTitle>
                <AlertDescription>
                  This modification must be completed before {new Date(feeCalculation.timeRestrictions.cutoffDateTime).toLocaleString()}.
                  Modification window: {feeCalculation.timeRestrictions.cutoffTime} hours before departure.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes (Optional)</CardTitle>
          <CardDescription>
            Add any special instructions or reasons for this modification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any additional notes or special requests..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {errors.submission && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errors.submission}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back to Edit
        </Button>
        <Button onClick={handleConfirm} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Modification
            </>
          )}
        </Button>
      </div>

      {/* Terms and Conditions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Important Information</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Modification is subject to availability and airline approval</li>
            <li>Processing time varies by modification type (typically 24-48 hours)</li>
            <li>You will receive confirmation via email once processed</li>
            <li>Some modifications may require additional documentation</li>
            <li>Fees are non-refundable once the modification is processed</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}