"use client";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { CreditCard, Smartphone, Bank, Wallet, Calendar, Apple, Google } from "lucide-react";

const paymentIcons = {
  card: CreditCard,
  upi: Smartphone,
  netbanking: Bank,
  wallet: Wallet,
  emi: Calendar,
  apple_pay: Apple,
  google_pay: Google,
};

const paymentNames = {
  stripe: "Stripe",
  razorpay: "Razorpay",
  paypal: "PayPal",
};

const paymentDescriptions = {
  stripe: "Pay with credit/debit cards, Apple Pay, Google Pay",
  razorpay: "Pay with cards, UPI, NetBanking, Wallets, EMI",
  paypal: "Pay with PayPal, cards, Venmo, Apple Pay, Google Pay",
};

export default function PaymentProviderSelector({
  availableProviders = [],
  supportedMethods = [],
  selectedProvider,
  onProviderChange,
  selectedMethod,
  onMethodChange,
  currency = "USD",
  className = "",
}) {
  const [methodsByProvider, setMethodsByProvider] = useState({});

  useEffect(() => {
    // Group payment methods by provider
    const grouped = {};
    supportedMethods.forEach((method) => {
      if (!grouped[method.providers[0]]) {
        grouped[method.providers[0]] = [];
      }
      grouped[method.providers[0]].push(method);
    });
    setMethodsByProvider(grouped);
  }, [supportedMethods]);

  const getProviderForCurrency = (currency) => {
    // Auto-select provider based on currency
    if (currency.toUpperCase() === "INR" && availableProviders.includes("razorpay")) {
      return "razorpay";
    }
    if (["USD", "EUR", "GBP"].includes(currency.toUpperCase()) && availableProviders.includes("stripe")) {
      return "stripe";
    }
    return availableProviders[0] || "stripe";
  };

  const handleProviderChange = (provider) => {
    onProviderChange(provider);
    // Auto-select first available method for the provider
    const methods = methodsByProvider[provider] || [];
    if (methods.length > 0 && !selectedMethod) {
      onMethodChange(methods[0].type);
    }
  };

  const getRecommendedProvider = () => {
    return getProviderForCurrency(currency);
  };

  const recommendedProvider = getRecommendedProvider();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Select Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Payment Provider</Label>
          <RadioGroup
            value={selectedProvider}
            onValueChange={handleProviderChange}
            className="grid grid-cols-1 gap-3"
          >
            {availableProviders.map((provider) => {
              const isRecommended = provider === recommendedProvider;
              return (
                <div key={provider} className="flex items-center space-x-2">
                  <RadioGroupItem value={provider} id={provider} />
                  <Label
                    htmlFor={provider}
                    className="flex flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {paymentNames[provider]}
                      </span>
                      {isRecommended && (
                        <Badge variant="secondary" className="ml-2">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {paymentDescriptions[provider]}
                    </p>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Payment Methods for Selected Provider */}
        {selectedProvider && methodsByProvider[selectedProvider] && (
          <div className="space-y-3">
            <Label className="text-base font-medium">Payment Options</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {methodsByProvider[selectedProvider].map((method) => {
                const Icon = paymentIcons[method.type];
                return (
                  <Button
                    key={method.type}
                    variant={selectedMethod === method.type ? "default" : "outline"}
                    className="h-auto p-3 justify-start"
                    onClick={() => onMethodChange(method.type)}
                  >
                    <div className="flex items-center space-x-2">
                      {Icon && <Icon className="h-4 w-4" />}
                      <span className="text-sm">{method.name}</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Currency Recommendation Notice */}
        {selectedProvider !== recommendedProvider && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Recommendation:</strong> For {currency} payments, we recommend using{" "}
              <strong>{paymentNames[recommendedProvider]}</strong> for the best experience.
            </p>
            <Button
              variant="link"
              className="p-0 h-auto text-blue-800 underline"
              onClick={() => handleProviderChange(recommendedProvider)}
            >
              Switch to {paymentNames[recommendedProvider]}
            </Button>
          </div>
        )}

        {/* Provider Information */}
        {selectedProvider && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Provider:</strong> {paymentNames[selectedProvider]}
            </p>
            <p>
              <strong>Currency:</strong> {currency}
            </p>
            {selectedProvider === "razorpay" && (
              <p>
                <strong>Popular in:</strong> India (supports UPI, NetBanking, Wallets)
              </p>
            )}
            {selectedProvider === "stripe" && (
              <p>
                <strong>Popular in:</strong> Global (supports cards, digital wallets)
              </p>
            )}
            {selectedProvider === "paypal" && (
              <p>
                <strong>Popular in:</strong> Global (supports PayPal balance, cards, Venmo)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}