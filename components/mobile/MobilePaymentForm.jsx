"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MobileButton } from "./MobileButton";
import { MobileInput } from "./MobileInput";
import { 
  CreditCard, 
  Smartphone, 
  Shield, 
  Lock,
  Check,
  AlertCircle,
  ChevronRight,
  Wallet
} from "lucide-react";

const MobilePaymentForm = ({
  amount,
  onPayment,
  loading = false,
  acceptedCards = ["visa", "mastercard", "amex"],
  className,
}) => {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
    saveCard: false,
  });
  const [walletData, setWalletData] = useState({
    provider: "",
    phone: "",
  });
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentMethods = [
    {
      id: "card",
      name: "Credit/Debit Card",
      icon: CreditCard,
      description: "Pay with your credit or debit card",
    },
    {
      id: "wallet",
      name: "Digital Wallet",
      icon: Smartphone,
      description: "Pay with Apple Pay, Google Pay, etc.",
    },
  ];

  const digitalWallets = [
    { id: "apple-pay", name: "Apple Pay", icon: "🍎" },
    { id: "google-pay", name: "Google Pay", icon: "🤖" },
    { id: "paypal", name: "PayPal", icon: "💳" },
  ];

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4);
    }
    return v;
  };

  const handleCardChange = (field, value) => {
    let formattedValue = value;
    
    if (field === "number") {
      formattedValue = formatCardNumber(value);
    } else if (field === "expiry") {
      formattedValue = formatExpiry(value);
    }
    
    setCardData(prev => ({
      ...prev,
      [field]: formattedValue,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleWalletChange = (field, value) => {
    setWalletData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateCardForm = () => {
    const newErrors = {};
    
    if (!cardData.number || cardData.number.replace(/\s/g, "").length < 13) {
      newErrors.number = "Please enter a valid card number";
    }
    
    if (!cardData.name || cardData.name.trim().length < 2) {
      newErrors.name = "Please enter the cardholder name";
    }
    
    if (!cardData.expiry || !cardData.expiry.match(/^\d{2}\/\d{2}$/)) {
      newErrors.expiry = "Please enter a valid expiry date";
    }
    
    if (!cardData.cvv || cardData.cvv.length < 3) {
      newErrors.cvv = "Please enter a valid CVV";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateWalletForm = () => {
    const newErrors = {};
    
    if (!walletData.provider) {
      newErrors.provider = "Please select a wallet provider";
    }
    
    if (!walletData.phone || walletData.phone.length < 10) {
      newErrors.phone = "Please enter a valid phone number";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    const isValid = paymentMethod === "card" ? validateCardForm() : validateWalletForm();
    
    if (!isValid) return;
    
    setIsProcessing(true);
    
    try {
      const paymentData = {
        method: paymentMethod,
        amount,
        ...(paymentMethod === "card" ? cardData : walletData),
      };
      
      await onPayment?.(paymentData);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getCardType = (number) => {
    const digits = number.replace(/\s/g, "");
    
    if (digits.startsWith("4")) return "visa";
    if (digits.startsWith("5") || digits.startsWith("2")) return "mastercard";
    if (digits.startsWith("3")) return "amex";
    
    return "unknown";
  };

  const cardType = getCardType(cardData.number);

  return (
    <div className={cn("bg-card rounded-2xl p-4 space-y-6", className)}>
      {/* Payment Amount */}
      <div className="text-center py-4 bg-muted/30 rounded-xl">
        <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
        <p className="text-3xl font-bold text-primary">${amount}</p>
      </div>

      {/* Payment Method Selection */}
      <div>
        <h3 className="font-semibold text-foreground mb-4">Payment Method</h3>
        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  "w-full p-4 border-2 rounded-xl transition-all",
                  "flex items-center gap-4",
                  paymentMethod === method.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  paymentMethod === method.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{method.name}</p>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
                {paymentMethod === method.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card Payment Form */}
      {paymentMethod === "card" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Shield className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Your payment information is encrypted and secure
            </p>
          </div>

          <MobileInput
            type="text"
            label="Card Number"
            placeholder="1234 5678 9012 3456"
            value={cardData.number}
            onChange={(e) => handleCardChange("number", e.target.value)}
            error={errors.number}
            maxLength={19}
          />

          <MobileInput
            type="text"
            label="Cardholder Name"
            placeholder="John Doe"
            value={cardData.name}
            onChange={(e) => handleCardChange("name", e.target.value)}
            error={errors.name}
          />

          <div className="grid grid-cols-2 gap-3">
            <MobileInput
              type="text"
              label="Expiry Date"
              placeholder="MM/YY"
              value={cardData.expiry}
              onChange={(e) => handleCardChange("expiry", e.target.value)}
              error={errors.expiry}
              maxLength={5}
            />
            <MobileInput
              type="text"
              label="CVV"
              placeholder="123"
              value={cardData.cvv}
              onChange={(e) => handleCardChange("cvv", e.target.value)}
              error={errors.cvv}
              maxLength={4}
            />
          </div>

          {/* Accepted Cards */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">We accept:</span>
            <div className="flex gap-2">
              {acceptedCards.map((card) => (
                <div
                  key={card}
                  className={cn(
                    "w-8 h-5 rounded bg-muted flex items-center justify-center text-xs font-bold",
                    cardType === card ? "border-2 border-primary" : "opacity-60"
                  )}
                >
                  {card.toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {/* Save Card Option */}
          <label className="flex items-center gap-3 p-3 border-2 border-border rounded-lg cursor-pointer hover:border-primary/50">
            <input
              type="checkbox"
              checked={cardData.saveCard}
              onChange={(e) => handleCardChange("saveCard", e.target.checked)}
              className="w-4 h-4 text-primary rounded focus:ring-primary"
            />
            <span className="text-sm text-foreground">Save card for future payments</span>
          </label>
        </div>
      )}

      {/* Digital Wallet Form */}
      {paymentMethod === "wallet" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {digitalWallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleWalletChange("provider", wallet.id)}
                className={cn(
                  "p-4 border-2 rounded-xl transition-all",
                  "flex flex-col items-center gap-2",
                  walletData.provider === wallet.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-2xl">{wallet.icon}</span>
                <span className="text-xs text-foreground">{wallet.name}</span>
              </button>
            ))}
          </div>

          <MobileInput
            type="tel"
            label="Phone Number"
            placeholder="+1 (555) 123-4567"
            value={walletData.phone}
            onChange={(e) => handleWalletChange("phone", e.target.value)}
            error={errors.phone}
          />
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 p-3 bg-muted/30 rounded-lg">
        <Lock className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">
          Secured by 256-bit SSL encryption
        </span>
      </div>

      {/* Error Message */}
      {errors.submit && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{errors.submit}</span>
        </div>
      )}

      {/* Submit Button */}
      <MobileButton
        variant="primary"
        size="comfortable"
        onClick={handleSubmit}
        loading={loading || isProcessing}
        className="w-full"
      >
        <Wallet className="h-5 w-5 mr-2" />
        Pay ${amount}
      </MobileButton>

      {/* Terms */}
      <p className="text-xs text-muted-foreground text-center">
        By completing this payment, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
};

export { MobilePaymentForm };