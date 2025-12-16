"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Edit, Clock, AlertCircle, CheckCircle } from "lucide-react";
import FlightModificationWizard from "../flights/modification/FlightModificationWizard";

export default function ModifyFlightBtn({ bookingData, className }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [modificationComplete, setModificationComplete] = useState(false);

  const handleModificationComplete = () => {
    setModificationComplete(true);
    setIsDialogOpen(false);
  };

  const canModify = () => {
    // Check if booking can be modified based on status and timing
    const now = new Date();
    const departureDate = new Date(bookingData.segments?.[0]?.departureDateTime);
    const hoursUntilDeparture = (departureDate - now) / (1000 * 60 * 60);

    return (
      bookingData.bookingStatus === 'confirmed' &&
      bookingData.paymentStatus === 'paid' &&
      hoursUntilDeparture > 24 // At least 24 hours before departure
    );
  };

  const getModificationStatus = () => {
    const now = new Date();
    const departureDate = new Date(bookingData.segments?.[0]?.departureDateTime);
    const hoursUntilDeparture = (departureDate - now) / (1000 * 60 * 60);

    if (bookingData.bookingStatus !== 'confirmed') {
      return {
        canModify: false,
        reason: "Booking must be confirmed to modify",
        icon: AlertCircle,
        color: "text-red-600"
      };
    }

    if (bookingData.paymentStatus !== 'paid') {
      return {
        canModify: false,
        reason: "Booking must be fully paid to modify",
        icon: AlertCircle,
        color: "text-red-600"
      };
    }

    if (hoursUntilDeparture <= 24) {
      return {
        canModify: false,
        reason: "Modifications must be made at least 24 hours before departure",
        icon: Clock,
        color: "text-yellow-600"
      };
    }

    return {
      canModify: true,
      reason: "You can modify this booking",
      icon: CheckCircle,
      color: "text-green-600"
    };
  };

  const status = getModificationStatus();

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className={`min-w-[100px] ${className}`}
            disabled={!status.canModify}
          >
            <Edit className="mr-2 h-4 w-4" />
            Modify Booking
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modify Flight Booking</DialogTitle>
            <DialogDescription>
              Make changes to your flight booking. Some modifications may incur additional fees.
            </DialogDescription>
          </DialogHeader>
          
          {!status.canModify && (
            <Alert variant="destructive">
              <status.icon className="h-4 w-4" />
              <AlertTitle>Modification Not Available</AlertTitle>
              <AlertDescription>{status.reason}</AlertDescription>
            </Alert>
          )}

          {status.canModify && (
            <FlightModificationWizard
              bookingId={bookingData.key}
              bookingData={bookingData}
              onModificationComplete={handleModificationComplete}
            />
          )}
        </DialogContent>
      </Dialog>

      {modificationComplete && (
        <Alert className="mt-4">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Modification Requested</AlertTitle>
          <AlertDescription>
            Your modification request has been submitted successfully. You will receive a confirmation email shortly.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}