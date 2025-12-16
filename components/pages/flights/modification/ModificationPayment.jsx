"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Smartphone, Wallet, CheckCircle, AlertCircle, Lock, ArrowRight } from "lucide-react";

export default function ModificationPayment({ modificationId, feeCalculation, onPaymentComplete, onBack }) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("saved_card");
  const [savedCards, setSavedCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
    saveCard: false
  });

  useEffect(() => {
    fetchSavedCards();
  }, []);

  const fetchSavedCards = async () => {
    try {
      const response = await fetch('/api/user/get_payment_cards');
      const result = await response.json();
      
      if (result.success) {
        setSavedCards(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching saved cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrors({});

    try {
      let paymentMethodId;
      
      if (selectedPaymentMethod === "saved_card") {
        paymentMethodId = paymentData.selectedCardId;
      } else if (selectedPaymentMethod === "new_card") {
        // Process new card payment
        const response = await fetch('/api/payments/setup-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment_method_data: {
              type: 'card',
              card: {
                number: paymentData.cardNumber.replace(/\s/g, ''),
                exp_month: paymentData.expiryDate.split('/')[0],
                exp_year: '20' + paymentData.expiryDate.split('/')[1],
                cvc: paymentData.cvv,
                name: paymentData.nameOnCard
              }
            },
            save_payment_method: paymentData.saveCard
          })
        });

        const result = await response.json();
        if (result.success) {
          paymentMethodId = result.data.paymentMethodId;
        } else {
          throw new Error(result.message);
        }
      } else if (selectedPaymentMethod === "digital_wallet") {
        // Handle digital wallet payment
        paymentMethodId = paymentData.walletType;
      }

      // Create payment intent for modification
      const paymentResponse = await fetch('/api/payments/flight/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId,
          amount: feeCalculation.totalAdditionalCost || 0,
          currency: feeCalculation.currency || 'USD',
          modificationId,
          description: `Flight modification - ${modificationId}`
        })
      });

      const paymentResult = await paymentResponse.json();
      
      if (paymentResult.success) {
        // Confirm payment
        const confirmResponse = await fetch('/api/payments/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentResult.data.paymentIntentId
          })
        });

        const confirmResult = await confirmResponse.json();
        
        if (confirmResult.success) {
          onPaymentComplete();
        } else {
          throw new Error(confirmResult.message);
        }
      } else {
        throw new Error(paymentResult.message);
      }

    } catch (error) {
      setErrors({ payment: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 3) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const totalAmount = feeCalculation?.totalAdditionalCost || 0;
  const currency = feeCalculation?.currency || 'USD';

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>
            Complete payment to process your modification request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modification Fee</span>
              <span className="font-medium">
                ${feeCalculation?.feeCalculation?.fee || 0} {currency}
              </span>
            </div>
            
            {feeCalculation?.fareDifference?.difference > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fare Difference</span>
                <span className="font-medium">
                  ${feeCalculation.fareDifference.difference} {currency}
                </span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Amount</span>
              <span className="text-primary">
                ${totalAmount} {currency}
              </span>
            </div>
          </div>

          {totalAmount === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>No Payment Required</AlertTitle>
              <AlertDescription>
                This modification doesn't require any additional payment. You can proceed to confirmation.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {totalAmount > 0 && (
        <>
          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                {/* Saved Cards */}
                {savedCards.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Saved Cards</Label>
                    {savedCards.map((card) => (
                      <div key={card.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={`saved_card_${card.id}`} id={`card_${card.id}`} />
                        <Label htmlFor={`card_${card.id}`} className="flex items-center justify-between w-full cursor-pointer">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-4 w-4" />
                            <span>
                              {card.brand} ending in {card.last4}
                            </span>
                          </div>
                          <Badge variant="outline">{card.type}</Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {/* New Card */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Add New Card</Label>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new_card" id="new_card" />
                    <Label htmlFor="new_card" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      Credit/Debit Card
                    </Label>
                  </div>
                </div>

                {/* Digital Wallets */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Digital Wallets</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="digital_wallet_paypal" id="paypal" />
                      <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer">
                        <Wallet className="h-4 w-4" />
                        PayPal
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="digital_wallet_apple" id="apple_pay" />
                      <Label htmlFor="apple_pay" className="flex items-center gap-2 cursor-pointer">
                        <Smartphone className="h-4 w-4" />
                        Apple Pay
                      </Label>
                    </div>
                  </div>
                </div>
              </RadioGroup>

              {/* New Card Form */}
              {selectedPaymentMethod === "new_card" && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={paymentData.cardNumber}
                        onChange={(e) => setPaymentData({
                          ...paymentData,
                          cardNumber: formatCardNumber(e.target.value)
                        })}
                        maxLength={19}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        placeholder="MM/YY"
                        value={paymentData.expiryDate}
                        onChange={(e) => setPaymentData({
                          ...paymentData,
                          expiryDate: formatExpiryDate(e.target.value)
                        })}
                        maxLength={5}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={paymentData.cvv}
                        onChange={(e) => setPaymentData({
                          ...paymentData,
                          cvv: e.target.value.replace(/\D/g, '').slice(0, 4)
                        })}
                        maxLength={4}
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="nameOnCard">Name on Card</Label>
                      <Input
                        id="nameOnCard"
                        placeholder="John Doe"
                        value={paymentData.nameOnCard}
                        onChange={(e) => setPaymentData({
                          ...paymentData,
                          nameOnCard: e.target.value
                        })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="saveCard"
                      checked={paymentData.saveCard}
                      onCheckedChange={(checked) => setPaymentData({
                        ...paymentData,
                        saveCard: checked
                      })}
                    />
                    <Label htmlFor="saveCard" className="text-sm">
                      Save this card for future payments
                    </Label>
                  </div>
                </div>
              )}

              {/* Digital Wallet Selection */}
              {selectedPaymentMethod?.startsWith('digital_wallet') && (
                <div className="space-y-4 pt-4 border-t">
                  <Label>Select Wallet Type</Label>
                  <RadioGroup 
                    value={paymentData.walletType} 
                    onValueChange={(value) => setPaymentData({
                      ...paymentData,
                      walletType: value
                    })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="paypal" id="wallet_paypal" />
                      <Label htmlFor="wallet_paypal">PayPal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="apple_pay" id="wallet_apple" />
                      <Label htmlFor="wallet_apple">Apple Pay</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Secure Payment</AlertTitle>
            <AlertDescription>
              Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {errors.payment && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment Error</AlertTitle>
              <AlertDescription>{errors.payment}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack} disabled={isProcessing}>
              Back
            </Button>
            <Button 
              onClick={handlePaymentSubmit} 
              disabled={isProcessing || !selectedPaymentMethod}
              className="min-w-[150px]"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  Pay ${totalAmount} {currency}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {totalAmount === 0 && (
        <div className="flex justify-end">
          <Button onClick={onPaymentComplete}>
            Continue to Confirmation
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}