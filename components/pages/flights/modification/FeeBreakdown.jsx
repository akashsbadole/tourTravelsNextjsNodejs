"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DollarSign, Clock, Percent, Calculator, Info } from "lucide-react";

export default function FeeBreakdown({ feeCalculation }) {
  if (!feeCalculation) return null;

  const {
    feeCalculation: feeDetails,
    fareDifference,
    totalAdditionalCost,
    totalRefundAmount,
    currency,
    policyDetails,
    timeRestrictions
  } = feeCalculation;

  return (
    <div className="space-y-4">
      {/* Fee Calculation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Modification Fee Details
          </CardTitle>
          <CardDescription>
            Breakdown of applicable fees and charges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Base Fee */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Base Modification Fee</span>
            </div>
            <span className="font-medium">
              ${feeDetails?.fee || 0} {currency}
            </span>
          </div>

          {/* Fee Calculation Method */}
          {feeDetails?.feeBreakdown && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Calculation Method</span>
                <Badge variant="outline">
                  {feeDetails.feeBreakdown.calculationMethod?.replace('_', ' ').toUpperCase() || 'FIXED'}
                </Badge>
              </div>

              {feeDetails.feeBreakdown.baseFee && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Base Amount</span>
                  <span>${feeDetails.feeBreakdown.baseFee} {currency}</span>
                </div>
              )}

              {feeDetails.feeBreakdown.tierDiscount && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Tier Discount</span>
                  <span className="text-green-600">
                    -${feeDetails.feeBreakdown.tierDiscount} {currency}
                  </span>
                </div>
              )}

              {feeDetails.feeBreakdown.timeAdjustment && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Time Adjustment</span>
                  <span className={feeDetails.feeBreakdown.timeAdjustment > 0 ? "text-red-600" : "text-green-600"}>
                    {feeDetails.feeBreakdown.timeAdjustment > 0 ? '+' : ''}
                    ${feeDetails.feeBreakdown.timeAdjustment} {currency}
                  </span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Fare Difference */}
          {fareDifference && fareDifference.difference > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Fare Difference</span>
                </div>
                <span className="font-medium">
                  ${fareDifference.difference} {currency}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Original Fare:</span>
                  <span className="ml-2">${fareDifference.originalFare}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">New Fare:</span>
                  <span className="ml-2">${fareDifference.newFare}</span>
                </div>
              </div>
            </div>
          )}

          {fareDifference && fareDifference.refundAmount > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Refund Amount</span>
                </div>
                <span className="font-medium text-green-600">
                  -${fareDifference.refundAmount} {currency}
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Amount</span>
            <span className={totalAdditionalCost > 0 ? "text-primary" : "text-green-600"}>
              {totalAdditionalCost > 0 ? '+' : '-'}
              ${Math.abs(totalAdditionalCost || totalRefundAmount)} {currency}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Policy Information */}
      {policyDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Policy Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Policy Code</span>
              <Badge variant="outline">{policyDetails.policyCode}</Badge>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Modification Window</span>
              <span>{policyDetails.modificationWindow} hours before departure</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Restrictions */}
      {timeRestrictions && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Time Restrictions</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>
                This modification must be completed before: <strong>{new Date(timeRestrictions.cutoffDateTime).toLocaleString()}</strong>
              </p>
              <p>
                Modification window: <strong>{timeRestrictions.cutoffTime} hours</strong> before departure
              </p>
              {timeRestrictions.cutoffDateTime < new Date() && (
                <p className="text-red-600 font-medium">
                  ⚠️ This modification is no longer within the allowed time window
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Fee Waiver Information */}
      {feeDetails?.feeBreakdown?.tierDiscount > 0 && (
        <Alert>
          <Percent className="h-4 w-4" />
          <AlertTitle>Fee Discount Applied</AlertTitle>
          <AlertDescription>
            A discount of ${feeDetails.feeBreakdown.tierDiscount} has been applied based on your membership tier.
          </AlertDescription>
        </Alert>
      )}

      {/* Important Notes */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Important Notes</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Modification fees are non-refundable once processed</li>
            <li>Fare differences may apply based on current flight prices</li>
            <li>Additional airline fees may apply for certain modifications</li>
            <li>Processing time varies by modification type</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}