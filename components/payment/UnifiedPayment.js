"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import PaymentProviderSelector from "./PaymentProviderSelector";
import RazorpayPayment from "./RazorpayPayment";
import PayPalPayment from "./PayPalPayment";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PayWithSavedCard from "../sections/PayWithSavedCard";
import PayWithNewCardForm from "../sections/PayWithNewCardForm";
import { Loader2, CreditCard, AlertTriangle } from "lucide-react";

export default function UnifiedPayment({
  bookingType = "flight", // "flight" or "hotel"
  bookingData,
  amount,
  currency = "USD",
  onSuccess,
  onError,
  onCancel,
  loading: externalLoading = false,
  className = "",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentIntents, setPaymentIntents] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);

  // Load payment configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/payments/config");
        const result = await response.json();
        
        if (result.success) {
          setConfig(result.data);
          
          // Auto-select provider based on currency
          const recommendedProvider = getRecommendedProvider(
            result.data.enabledProviders,
            currency
          );
          setSelectedProvider(recommendedProvider);
          
          // Load Stripe if available
          if (result.data.enabledProviders.includes("stripe")) {
            setStripePromise(
              loadStripe(result.data.providers.stripe?.publishableKey)
            );
          }
        } else {
          setError("Failed to load payment configuration");
        }
      } catch (err) {
        setError("Failed to load payment options");
        console.error("Payment config error:", err);
      }
    };

    loadConfig();
  }, [currency]);

  // Create payment intent when provider or method changes
  useEffect(() => {
    if (!config || !selectedProvider || !bookingData) {
      return;
    }

    createPaymentIntent();
  }, [selectedProvider, selectedMethod, config, bookingData]);

  const getRecommendedProvider = (providers, currency) => {
    if (currency.toUpperCase() === "INR" && providers.includes("razorpay")) {
      return "razorpay";
    }
    if (["USD", "EUR", "GBP"].includes(currency.toUpperCase()) && providers.includes("stripe")) {
      return "stripe";
    }
    return providers[0] || "stripe";
  };

  const createPaymentIntent = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = bookingType === "flight" 
        ? "/api/payments/flight/create-payment-intent"
        : "/api/payments/hotel/create-payment-intent";

      const requestBody = {
        provider: selectedProvider,
        currency: currency,
        ...bookingData,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        setPaymentIntents(result.data.paymentIntents);
      } else {
        setError(result.message || "Failed to create payment");
      }
    } catch (err) {
      setError("Failed to initialize payment");
      console.error("Payment intent error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentDetails) => {
    onSuccess?.({
      provider: selectedProvider,
      ...paymentDetails,
    });
  };

  const handlePaymentError = (error) => {
    setError(error.message || "Payment failed");
    onError?.(error);
  };

  const handlePaymentCancel = () => {
    onCancel?.();
  };

  const renderPaymentForm = () => {
    if (!paymentIntents) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Initializing payment...
        </div>
      );
    }

    switch (selectedProvider) {
      case "stripe":
        return (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: paymentIntents.client_secret }}
          >
            <div className="space-y-4">
              <PayWithSavedCard
                paymentIntents={paymentIntents}
                paymentStatus={paymentIntents.status}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                loading={loading}
              />
              <PayWithNewCardForm
                paymentIntents={paymentIntents}
                paymentStatus={paymentIntents.status}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                loading={loading}
              />
            </div>
          </Elements>
        );

      case "razorpay":
        return (
          <RazorpayPayment
            paymentData={paymentIntents}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
            loading={loading}
          />
        );

      case "paypal":
        return (
          <PayPalPayment
            paymentData={paymentIntents}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
            loading={loading}
          />
        );

      default:
        return (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Payment provider {selectedProvider} is not supported
            </AlertDescription>
          </Alert>
        );
    }
  };

  if (error && !config) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading payment options...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Payment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <PaymentProviderSelector
          availableProviders={config.enabledProviders}
          supportedMethods={config.supportedPaymentMethods}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          selectedMethod={selectedMethod}
          onMethodChange={setSelectedMethod}
          currency={currency}
        />

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Amount to pay: <strong>{currency} {amount}</strong>
          </div>

          {renderPaymentForm()}
        </div>

        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Your payment information is encrypted and secure</p>
          <p>By proceeding, you agree to the terms and conditions</p>
        </div>
      </CardContent>
    </Card>
  );
}