"use client";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2 } from "lucide-react";

export default function RazorpayPayment({
  paymentData,
  onSuccess,
  onError,
  onCancel,
  loading: externalLoading = false,
}) {
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => setError("Failed to load Razorpay");
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = () => {
    if (!razorpayLoaded || !paymentData) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const options = {
        key: paymentData.keyId,
        amount: paymentData.amountInPaise,
        currency: paymentData.currency,
        name: paymentData.name,
        description: paymentData.description,
        image: paymentData.image,
        order_id: paymentData.orderId,
        handler: function (response) {
          // Payment successful
          onSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: paymentData.prefill?.name || "",
          email: paymentData.prefill?.email || "",
          contact: paymentData.prefill?.contact || "",
        },
        theme: {
          color: paymentData.theme?.color || "#3399cc",
        },
        modal: {
          ondismiss: function () {
            onCancel?.();
            setLoading(false);
          },
          escape: true,
          backdropclose: false,
          confirmclose: true,
          animation: "slideFromBottom",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        setError(response.error.description);
        onError?.(response.error);
        setLoading(false);
      });

      razorpay.open();
    } catch (err) {
      setError("Failed to initialize payment");
      onError?.(err);
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full">
      {!razorpayLoaded ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading payment options...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            You will be redirected to Razorpay to complete your payment securely.
          </div>
          
          <Button
            onClick={handlePayment}
            disabled={loading || externalLoading || !razorpayLoaded}
            className="w-full"
            variant="default"
          >
            {loading || externalLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${paymentData.currency} ${paymentData.amount}`
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            <p>Secured by Razorpay</p>
            <p className="mt-1">
              Supported: Cards, UPI, NetBanking, Wallets, EMI
            </p>
          </div>
        </div>
      )}
    </div>
  );
}