"use client";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2 } from "lucide-react";

export default function PayPalPayment({
  paymentData,
  onSuccess,
  onError,
  onCancel,
  loading: externalLoading = false,
}) {
  const [loading, setLoading] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load PayPal script
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${paymentData.clientId}&currency=${paymentData.currency}&intent=${paymentData.intent}`;
    script.async = true;
    script.onload = () => {
      setPaypalLoaded(true);
      // Render PayPal buttons
      if (window.paypal) {
        window.paypal
          .Buttons({
            style: paymentData.style || {
              layout: "vertical",
              color: "blue",
              shape: "rect",
              label: "pay",
            },
            createOrder: function (data, actions) {
              // Create order on PayPal
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: paymentData.amount,
                      currency_code: paymentData.currency,
                    },
                    description: paymentData.description || "Travel Booking Payment",
                  },
                ],
              });
            },
            onApprove: function (data, actions) {
              setLoading(true);
              // Capture the payment
              return actions.order.capture().then(function (details) {
                onSuccess({
                  orderID: data.orderID,
                  payerID: data.payerID,
                  paymentID: details.purchase_units[0]?.payments?.captures[0]?.id,
                  status: details.status,
                  details: details,
                });
              });
            },
            onError: function (err) {
              setError(err.message || "Payment failed");
              onError?.(err);
              setLoading(false);
            },
            onCancel: function (data) {
              onCancel?.(data);
              setLoading(false);
            },
          })
          .render("#paypal-button-container");
      }
    };
    script.onerror = () => setError("Failed to load PayPal");
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [paymentData]);

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full">
      {!paypalLoaded ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading PayPal...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            You can pay with PayPal, credit/debit cards, or other payment methods.
          </div>
          
          <div id="paypal-button-container" className="w-full min-h-[45px]" />
          
          {loading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing payment...
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            <p>Secured by PayPal</p>
            <p className="mt-1">
              Supported: PayPal, Cards, Venmo, Apple Pay, Google Pay
            </p>
          </div>
        </div>
      )}
    </div>
  );
}