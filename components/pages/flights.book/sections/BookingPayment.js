"use client";
import Countdown from "@/components/local-ui/Countdown";
import { AlertTriangle, ClockIcon } from "lucide-react";
import MakePaymentSection from "@/components/sections/MakePaymentSection";
import UnifiedPayment from "@/components/payment/UnifiedPayment";
import useFetch from "@/lib/hooks/useFetch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
export default function BookingPayment({ flightNumber, flightDateTimestamp }) {
  const router = useRouter();
  const {
    data: flightBookingData,
    loading: flightBookingLoading,
    error: flightBookingError,
    retry: flightBookingRetry,
  } = useFetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/user/get_reserved_flight`,
    {
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        flightNumber,
        flightDateTimestamp,
      }),
    },
  );
  const { data, loading, error, retry } = useFetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/flight/create-payment-intent`,
    {
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        flightNumber,
        flightDateTimestamp,
        currency: flightBookingData?.data?.currency || "USD",
      }),
    },
  );
  async function middleware(next = async () => {}) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/user/get_reserved_flight`,
        {
          method: "POST",
          body: JSON.stringify({
            flightNumber: flightNumber,
            flightDateTimestamp,
          }),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to load flight booking");
      }

      const data = await res.json();

      if (data.success === false) {
        throw new Error(data.message);
      }

      await next();
    } catch (e) {
      console.log(e);
      toast({
        title: "Failed confirming payment",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  function onSuccess() {
    toast({
      title: "Payment successful",
      description: "Your payment was successful, redirecting...",
      variant: "default",
    });

    setTimeout(() => {
      const searchParams = new URLSearchParams({
        title: "Payment successful",
        message: "Your payment was successful",
        callbackUrl: `/user/my_bookings/flights/${flightBookingData.data._id}/ticket`,
        callbackTitle: "Download ticket",
      });
      router.push(`/success?${searchParams.toString()}`);
    }, 2000);
  }

  return flightBookingError ? (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-6 rounded-md border border-red-300 bg-red-50 p-6 shadow-sm">
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-6 w-6" />
        <h2 className="text-xl font-semibold">Failed loading payment form</h2>
      </div>
      <p className="max-w-xl text-center text-sm text-red-700">
        {flightBookingError || "Something went wrong. Please try again."}
      </p>
      <Button onClick={flightBookingRetry} variant="destructive">
        Try Again
      </Button>
    </div>
  ) : (
    <>
      <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 shadow-md">
        <p className="text-sm text-gray-800">
          Your booking has been reserved and will be held for a limited time.
          Please complete the payment within the limit to confirm and finalize
          your booking. After the reservation is expired, there is no guarantee
          that your seat will be reserved and may be taken by someone else.
        </p>
        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-yellow-800">
          <ClockIcon className="h-4 w-4 text-yellow-600" />
          Guaranteed reservation until:{" "}
          {!flightBookingLoading ? (
            <Countdown
              currentTimeMs={Date.now()}
              timeoutAtMs={
                new Date(
                  flightBookingData?.data?.guaranteedReservationUntil,
                )?.getTime() || 0
              }
            />
          ) : (
            <Skeleton className="h-4 w-20" />
          )}
        </div>
      </div>
      <UnifiedPayment
        bookingType="flight"
        bookingData={{
          flightNumber,
          flightDateTimestamp,
        }}
        amount={flightBookingData?.data?.totalFare}
        currency={flightBookingData?.data?.currency || "USD"}
        onSuccess={async (paymentData) => {
          toast({
            title: "Payment successful",
            description: "Your payment was successful, redirecting...",
            variant: "default",
          });
          
          // Redirect based on provider
          const params = new URLSearchParams();
          if (paymentData.provider === "stripe") {
            params.set("payment_intent", paymentData.paymentIntentId);
            params.set("payment_intent_client_secret", paymentData.clientSecret);
            params.set("redirect_status", "succeeded");
          } else if (paymentData.provider === "razorpay") {
            params.set("razorpay_payment_id", paymentData.razorpay_payment_id);
            params.set("razorpay_order_id", paymentData.razorpay_order_id);
          } else if (paymentData.provider === "paypal") {
            params.set("paypal_order_id", paymentData.orderID);
            params.set("paypal_payer_id", paymentData.payerID);
          }
          
          router.push(
            `${window.location.pathname}/success?${params.toString()}`
          );
        }}
        onError={(error) => {
          toast({
            title: "Payment failed",
            description: error.message || "Payment failed. Please try again.",
            variant: "destructive",
          });
        }}
        onCancel={() => {
          toast({
            title: "Payment cancelled",
            description: "Payment was cancelled. You can try again.",
            variant: "default",
          });
        }}
        loading={loading}
      />
    </>
  );
}
