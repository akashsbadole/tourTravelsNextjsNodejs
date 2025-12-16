"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Clock, Mail, Phone, Download, ExternalLink, Info } from "lucide-react";

export default function ModificationConfirmation({ modificationId, bookingData }) {
  const [modificationDetails, setModificationDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchModificationDetails();
  }, [modificationId]);

  const fetchModificationDetails = async () => {
    try {
      const response = await fetch(`/api/flight-modifications/${modificationId}`);
      const result = await response.json();
      
      if (result.success) {
        setModificationDetails(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to fetch modification details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    // Generate and download receipt
    window.print();
  };

  const handleViewBooking = () => {
    window.location.href = `/user/my_bookings/flights/${bookingData.key}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Clock className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Loading modification details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'pending_approval':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'pending_approval':
        return 'Pending Approval';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-green-600">Modification Request Submitted!</h1>
          <p className="text-muted-foreground">
            Your flight booking modification has been successfully submitted and is being processed.
          </p>
        </div>
      </div>

      {/* Modification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Modification Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Modification ID</p>
              <p className="font-semibold">{modificationDetails.modificationId}</p>
            </div>
            <Badge 
              className={`${getStatusColor(modificationDetails.status)} text-white`}
            >
              {getStatusText(modificationDetails.status)}
            </Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Submitted On</p>
              <p className="font-medium">
                {new Date(modificationDetails.requestedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Booking Reference</p>
              <p className="font-medium">{bookingData.pnrCode}</p>
            </div>
          </div>

          {modificationDetails.processedAt && (
            <div>
              <p className="text-sm text-muted-foreground">Processed On</p>
              <p className="font-medium">
                {new Date(modificationDetails.processedAt).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modification Details */}
      <Card>
        <CardHeader>
          <CardTitle>Modification Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {modificationDetails.modifications.map((mod, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium capitalize">
                  {mod.type.replace('_', ' ')}
                </h4>
                <Badge 
                  variant={mod.status === 'completed' ? 'default' : 'secondary'}
                >
                  {mod.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{mod.description}</p>
              {index < modificationDetails.modifications.length - 1 && <Separator />}
            </div>
          ))}

          {modificationDetails.totalAdditionalCost > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount Charged</span>
                <span className="font-semibold text-primary">
                  ${modificationDetails.totalAdditionalCost} {modificationDetails.currency}
                </span>
              </div>
            </div>
          )}

          {modificationDetails.totalRefundAmount > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Refund Amount</span>
                <span className="font-semibold text-green-600">
                  ${modificationDetails.totalRefundAmount} {modificationDetails.currency}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {modificationDetails.modificationHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Modification Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modificationDetails.modificationHistory.map((event, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium capitalize">{event.action.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {event.reason && (
                      <p className="text-sm text-muted-foreground">{event.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modificationDetails.status === 'processing' && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Processing in Progress</AlertTitle>
                <AlertDescription>
                  Your modification is being processed. This typically takes 24-48 hours. You'll receive an email confirmation once completed.
                </AlertDescription>
              </Alert>
            )}

            {modificationDetails.status === 'pending_approval' && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Awaiting Approval</AlertTitle>
                <AlertDescription>
                  Your modification requires approval from the airline. We'll notify you as soon as a decision is made.
                </AlertDescription>
              </Alert>
            )}

            {modificationDetails.status === 'completed' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Modification Completed</AlertTitle>
                <AlertDescription>
                  Your modification has been successfully processed. Updated booking details are available below.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 text-sm">
              <h4 className="font-medium">Expected Timeline:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Email confirmation within 24 hours</li>
                <li>• Processing time: 24-48 hours</li>
                <li>• Updated e-tickets sent via email</li>
                <li>• Check-in available 24 hours before departure</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={handleDownloadReceipt} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Receipt
        </Button>
        
        <Button onClick={handleViewBooking}>
          <ExternalLink className="mr-2 h-4 w-4" />
          View Booking
        </Button>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">support@travelagency.com</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Phone Support</p>
                <p className="text-sm text-muted-foreground">1-800-TRAVEL</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}