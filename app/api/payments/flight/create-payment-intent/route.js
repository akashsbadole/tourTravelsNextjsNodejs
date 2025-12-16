import { auth } from "@/lib/auth";
import { cancelBooking, isSeatTakenByElse } from "@/lib/services/flights";
import { getUserDetails } from "@/lib/services/user";
import { getOneDoc } from "@/lib/db/getOperationDB";
import { updateOneDoc } from "@/lib/db/updateOperationDB";
import { strToObjectId } from "@/lib/db/utilsDB";
import paymentFactory from "@/lib/payment/factory";
import paymentConfig from "@/lib/payment/config";
import { usdToCents } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import analyticsIntegrationService from "@/lib/services/analyticsIntegration";

export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return Response.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 },
    );
  }

  /**
   * @typedef {Object} PaymentIntentBody
   * @property {string} paymentMethodId - ID of the payment method to use
   * @property {string} flightNumber - Flight number
   * @property {number} flightDateTimestamp - Flight date timestamp
   * @property {boolean} shouldSavePaymentMethod - Whether to save the payment method for future use
   * @property {string} provider - Payment provider (stripe, razorpay, paypal)
   * @property {string} currency - Currency code
   */

  /**
   * @type {PaymentIntentBody}
   */
  const body = await req.json();
  const validationBody = validateReqBody(body);
  if (validationBody.success === false) {
    return Response.json({
      success: false,
      message: "Invalid types in body props or required property is absent",
    });
  }

  try {
    // Initialize payment factory
    await paymentFactory.initialize(paymentConfig.loadConfiguration());
    
    // Get provider based on request or currency
    const provider = body.provider 
      ? paymentFactory.getProvider(body.provider)
      : paymentFactory.getProviderByCurrency(body.currency || "USD");

    const user = await getUserDetails(session.user.id, 0);
    
    // Get or create customer ID for the provider
    let customerId = user?.providerCustomerIds?.[provider.getProviderType()] || user?.customerId;
    
    if (!customerId) {
      const customerResult = await provider.createUniqueCustomer(
        {
          name: user.firstName + " " + user.lastName,
          email: user.email,
        },
        ["email"],
      );

      if (!customerResult.success) {
        throw new Error(`Failed to create customer: ${customerResult.error.message}`);
      }

      customerId = customerResult.data.id;
      
      // Update user with new customer ID
      const updateData = {
        [`providerCustomerIds.${provider.getProviderType()}`]: customerId,
      };
      
      // Also update legacy customerId field for backward compatibility
      if (provider.getProviderType() === "stripe") {
        updateData.customerId = customerId;
      }

      await updateOneDoc("User", { _id: user._id }, updateData);
      revalidateTag("userDetails");
    }

    const flightItinerary = await getOneDoc(
      "FlightItinerary",
      {
        flightCode: body.flightNumber,
        date: new Date(body.flightDateTimestamp),
      },
      ["flight"],
      0,
    );
    
    const bookingData = await getOneDoc(
      "FlightBooking",
      {
        flightItineraryId: strToObjectId(flightItinerary._id),
        userId: strToObjectId(user._id),
        paymentStatus: "pending",
        ticketStatus: "pending",
      },
      ["userFlightBooking"],
      0,
    );

    if (Object.keys(bookingData).length < 1) {
      return Response.json({
        success: false,
        message: "There is no pending flight booking",
      });
    }

    const isSeatTakenPromise = bookingData.selectedSeats.map(async (el) => {
      return await isSeatTakenByElse(el.seatId._id, el.passengerId);
    });

    const isTaken = (await Promise.all(isSeatTakenPromise)).some(Boolean);

    if (isTaken) {
      const cancellationData = {
        reason: "Seat taken by another passenger due to expired reservation",
        canceledAt: new Date(),
        canceledBy: "system",
      };

      await cancelBooking(bookingData.pnrCode, cancellationData);
      return Response.json({
        success: false,
        message:
          "Your seat is taken by someone else, thus we have canceled your booking",
      });
    }

    // Track payment initiated analytics (non-blocking)
    const paymentAnalyticsData = {
      paymentIntentId: `pending_${bookingData._id}`,
      amount: bookingData.totalFare,
      currency: body.currency || bookingData.currency || "USD",
      provider: provider.getProviderType(),
      bookingType: "flight",
      bookingId: bookingData._id.toString(),
      sessionId: req.headers.get('x-session-id') || null
    };

    // Don't wait for analytics to complete
    analyticsIntegrationService.trackPaymentInitiated(paymentAnalyticsData, user._id.toString())
      .catch(error => console.error('Analytics tracking failed:', error));

    // Create payment intent with provider
    const paymentResult = await provider.createPaymentIntent({
      amount: bookingData.totalFare,
      currency: body.currency || bookingData.currency || "USD",
      customerId,
      paymentMethodId: body.paymentMethodId,
      metadata: {
        type: "flightBooking",
        flightItineraryId: flightItinerary._id.toString(),
        flightBookingId: bookingData._id.toString(),
        pnrCode: bookingData.pnrCode,
        userId: user._id.toString(),
        userEmail: user.email,
        customerName: user.firstName + " " + user.lastName,
        companyName: "Travel Agency",
        description: `Flight booking for ${body.flightNumber}`,
        bookingId: bookingData._id.toString(),
      },
      receiptEmail: user.email,
      idempotencyKey: bookingData.pnrCode,
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/user/my_bookings/flights/${bookingData._id}/payment/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/user/my_bookings/flights/${bookingData._id}/payment/cancel`,
    });

    if (!paymentResult.success) {
      throw new Error(`Payment intent creation failed: ${paymentResult.error.message}`);
    }

    // Track flight booking analytics (non-blocking)
    const bookingAnalyticsData = {
      bookingId: bookingData._id.toString(),
      pnrCode: bookingData.pnrCode,
      flightNumber: body.flightNumber,
      origin: flightItinerary.origin,
      destination: flightItinerary.destination,
      departureDate: flightItinerary.date,
      totalFare: bookingData.totalFare,
      currency: body.currency || bookingData.currency || "USD",
      passengers: bookingData.passengers?.length || 1,
      sessionId: req.headers.get('x-session-id') || null
    };

    // Don't wait for analytics to complete
    analyticsIntegrationService.trackFlightBooking(bookingAnalyticsData, user._id.toString())
      .catch(error => console.error('Analytics tracking failed:', error));

    return Response.json(
      {
        success: true,
        message: "Success",
        data: {
          provider: provider.getProviderType(),
          paymentIntents: paymentResult.data,
          paymentStatus: paymentResult.data.status,
          clientConfig: provider.getClientConfig(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Flight payment intent creation error:", error);
    const resObj = {
      success: false,
      message: "Something went wrong",
      error: error.message,
    };
    
    if (error.message.includes("connection")) {
      resObj.message = "Unable to connect to payment provider";
    }

    return Response.json(resObj, { status: 500 });
  }
}

function validateReqBody(data) {
  const schema = z
    .object({
      paymentMethodId: z.string().optional(),
      flightNumber: z.string(),
      flightDateTimestamp: z.union([z.string(), z.number()]),
      shouldSavePaymentMethod: z.boolean().optional(),
      provider: z.enum(["stripe", "razorpay", "paypal"]).optional(),
      currency: z.string().optional(),
    })
    .safeParse(data);

  return schema;
}