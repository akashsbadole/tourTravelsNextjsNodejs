import emailDefaultData from "@/data/emailDefaultData";
import { assignSeatsToFlightBooking } from "@/lib/services/flights";
import { createOneDoc } from "@/lib/db/createOperationDB";
import { getOneDoc } from "@/lib/db/getOperationDB";
import { updateOneDoc } from "@/lib/db/updateOperationDB";
import { strToObjectId } from "@/lib/db/utilsDB";
import sendEmail from "@/lib/email/sendEmail";
import { flightBookingConfirmedEmailTemplate, hotelBookingConfirmedEmailTemplate } from "@/lib/email/templates";
import paymentFactory from "@/lib/payment/factory";
import paymentConfig from "@/lib/payment/config";
import mongoose from "mongoose";
import { revalidateTag } from "next/cache";

export async function POST(req) {
  const buf = await req.arrayBuffer();
  const rawBody = Buffer.from(buf);
  
  // Get provider type from URL query or headers
  const provider = req.nextUrl.searchParams.get("provider") || 
                  req.headers.get("x-payment-provider") || 
                  "stripe"; // Default to stripe for backward compatibility

  try {
    // Initialize payment factory
    await paymentFactory.initialize(paymentConfig.loadConfiguration());
    
    // Get the specific provider
    const paymentProvider = paymentFactory.getProvider(provider);
    
    // Get signature from headers (provider-specific)
    const signature = getWebhookSignature(req, provider);
    
    // Handle webhook with provider
    const webhookResult = await paymentProvider.handleWebhook(
      rawBody.toString(),
      signature
    );

    if (!webhookResult.success) {
      console.error(`Webhook processing failed for ${provider}:`, webhookResult.error);
      return Response.json(
        { success: false, message: webhookResult.error.message },
        { status: 400 },
      );
    }

    // Process the webhook event
    await processWebhookEvent(webhookResult.data, provider);

    return Response.json({ success: true, message: "Success" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/**
 * Get webhook signature based on provider
 * @param {Request} req - Request object
 * @param {string} provider - Provider type
 * @returns {string} Webhook signature
 */
function getWebhookSignature(req, provider) {
  switch (provider) {
    case "stripe":
      return req.headers.get("stripe-signature");
    case "razorpay":
      return req.headers.get("x-razorpay-signature");
    case "paypal":
      return req.headers.get("paypal-auth-algo") + "=" + req.headers.get("paypal-transmission-id");
    default:
      return null;
  }
}

/**
 * Process webhook event based on provider and event type
 * @param {Object} eventData - Webhook event data
 * @param {string} provider - Provider type
 */
async function processWebhookEvent(eventData, provider) {
  const { type, data } = eventData;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    switch (provider) {
      case "stripe":
        await processStripeEvent(type, data, session);
        break;
      case "razorpay":
        await processRazorpayEvent(type, data, session);
        break;
      case "paypal":
        await processPayPalEvent(type, data, session);
        break;
      default:
        console.warn(`Unknown provider: ${provider}`);
    }

    await session.commitTransaction();
  } catch (error) {
    console.error(`Error processing ${provider} event:`, error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Process Stripe webhook events
 * @param {string} eventType - Event type
 * @param {Object} charge - Charge data
 * @param {ClientSession} session - MongoDB session
 */
async function processStripeEvent(eventType, charge, session) {
  if (eventType === "charge.updated") {
    await processPaymentSuccess(charge, "stripe", session);
  } else if (eventType === "charge.refund.updated") {
    await processRefund(charge, "stripe", session);
  }
}

/**
 * Process Razorpay webhook events
 * @param {string} eventType - Event type
 * @param {Object} payment - Payment data
 * @param {ClientSession} session - MongoDB session
 */
async function processRazorpayEvent(eventType, payment, session) {
  if (eventType === "payment.captured") {
    await processPaymentSuccess(payment, "razorpay", session);
  } else if (eventType === "refund.processed") {
    await processRefund(payment, "razorpay", session);
  }
}

/**
 * Process PayPal webhook events
 * @param {string} eventType - Event type
 * @param {Object} capture - Capture data
 * @param {ClientSession} session - MongoDB session
 */
async function processPayPalEvent(eventType, capture, session) {
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    await processPaymentSuccess(capture, "paypal", session);
  } else if (eventType === "PAYMENT.CAPTURE.DENIED") {
    await processPaymentFailure(capture, "paypal", session);
  } else if (eventType === "PAYMENT.REFUND.COMPLETED") {
    await processRefund(capture, "paypal", session);
  }
}

/**
 * Process successful payment
 * @param {Object} paymentData - Payment data from provider
 * @param {string} provider - Provider type
 * @param {ClientSession} session - MongoDB session
 */
async function processPaymentSuccess(paymentData, provider, session) {
  const paymentProvider = paymentFactory.getProvider(provider);
  const extractedPaymentData = paymentProvider.extractPaymentData(paymentData);

  if (extractedPaymentData.metadata?.type === "flightBooking") {
    await processFlightPaymentSuccess(extractedPaymentData, provider, session);
  } else if (extractedPaymentData.metadata?.type === "hotelBooking") {
    await processHotelPaymentSuccess(extractedPaymentData, provider, session);
  }
}

/**
 * Process successful flight payment
 * @param {Object} paymentData - Extracted payment data
 * @param {string} provider - Provider type
 * @param {ClientSession} session - MongoDB session
 */
async function processFlightPaymentSuccess(paymentData, provider, session) {
  const bookingId = paymentData.metadata.flightBookingId;
  
  const booking = await getOneDoc(
    "FlightBooking",
    { _id: strToObjectId(bookingId) },
    ["userFlightBooking"],
    0,
  );

  // Create payment record
  const paymentInfo = await createOneDoc(
    "FlightPayment",
    {
      ...paymentData,
      bookingId: strToObjectId(bookingId),
    },
    { session },
  );

  // Update booking
  await updateOneDoc(
    "FlightBooking",
    { _id: strToObjectId(bookingId) },
    {
      ticketStatus: "confirmed",
      paymentStatus: "paid",
      paymentId: paymentInfo._id,
      bookedAt: paymentData.paymentDate,
    },
    { session },
  );

  // Assign seats
  await assignSeatsToFlightBooking(booking, "permanent", 0, session);

  // Send confirmation email
  await sendFlightConfirmationEmail(booking, paymentInfo, provider);
  
  revalidateTag("userFlightBooking");
}

/**
 * Process successful hotel payment
 * @param {Object} paymentData - Extracted payment data
 * @param {string} provider - Provider type
 * @param {ClientSession} session - MongoDB session
 */
async function processHotelPaymentSuccess(paymentData, provider, session) {
  const bookingId = paymentData.metadata.hotelBookingId;

  // Create payment record
  const paymentInfo = await createOneDoc(
    "HotelPayment",
    {
      ...paymentData,
      bookingId: strToObjectId(bookingId),
    },
    { session },
  );

  // Update booking
  await updateOneDoc(
    "HotelBooking",
    { _id: strToObjectId(bookingId) },
    {
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "card",
      paymentId: paymentInfo._id,
      bookedAt: paymentData.paymentDate,
    },
    { session },
  );

  // Send confirmation email
  await sendHotelConfirmationEmail(bookingId, paymentInfo, provider);
  
  revalidateTag("hotelBookings");
}

/**
 * Process refund
 * @param {Object} refundData - Refund data from provider
 * @param {string} provider - Provider type
 * @param {ClientSession} session - MongoDB session
 */
async function processRefund(refundData, provider, session) {
  const paymentProvider = paymentFactory.getProvider(provider);
  const extractedRefundData = paymentProvider.extractRefundData(refundData);

  if (refundData.metadata?.type === "flightBooking") {
    await updateOneDoc(
      "FlightBooking",
      { _id: strToObjectId(refundData.metadata.flightBookingId) },
      {
        ticketStatus: "cancelled",
        paymentStatus: "refunded",
        refundInfo: {
          ...extractedRefundData,
          provider,
        },
      },
      { session },
    );
    revalidateTag("userFlightBooking");
  } else if (refundData.metadata?.type === "hotelBooking") {
    await updateOneDoc(
      "HotelBooking",
      { _id: strToObjectId(refundData.metadata.hotelBookingId) },
      {
        bookingStatus: "cancelled",
        paymentStatus: "refunded",
        refundInfo: {
          ...extractedRefundData,
          provider,
        },
      },
      { session },
    );
    revalidateTag("hotelBookings");
  }
}

/**
 * Send flight confirmation email
 * @param {Object} booking - Booking data
 * @param {Object} paymentInfo - Payment information
 * @param {string} provider - Provider type
 */
async function sendFlightConfirmationEmail(booking, paymentInfo, provider) {
  const flight = await getOneDoc(
    "FlightItinerary",
    { _id: strToObjectId(booking.flightItineraryId) },
    ["flight"],
    0,
  );

  const updatedBooking = await getOneDoc(
    "FlightBooking",
    { _id: booking._id },
    ["userFlightBooking"],
    0,
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const { emailFlightDetails, emailBookingDetails } = processFlightBookingDataForEmail(
    flight,
    updatedBooking,
  );

  const htmlEmail = flightBookingConfirmedEmailTemplate({
    ...emailDefaultData,
    main: {
      manageBookingUrl:
        baseUrl + `/user/my_bookings/flights/${updatedBooking._id}`,
      downloadTicketUrl:
        baseUrl + `/user/my_bookings/flights/${updatedBooking._id}/ticket`,
      flightDetails: emailFlightDetails,
      bookingDetails: emailBookingDetails,
    },
  });

  await sendEmail(
    [{ Email: paymentInfo.metadata.userEmail }],
    "Thank you for booking flight with golobe",
    htmlEmail,
  );
}

/**
 * Send hotel confirmation email
 * @param {string} bookingId - Booking ID
 * @param {Object} paymentInfo - Payment information
 * @param {string} provider - Provider type
 */
async function sendHotelConfirmationEmail(bookingId, paymentInfo, provider) {
  const booking = await getOneDoc(
    "HotelBooking",
    { _id: strToObjectId(bookingId) },
    ["hotel", "guests"],
    0,
  );

  const htmlEmail = hotelBookingConfirmedEmailTemplate({
    ...emailDefaultData,
    main: {
      manageBookingUrl:
        process.env.NEXT_PUBLIC_BASE_URL + `/user/my_bookings/hotels/${bookingId}`,
      bookingDetails: {
        hotelName: booking.hotelId.name,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        guests: booking.guests,
        totalPrice: booking.totalPrice,
        currency: booking.currency,
        paymentMethod: provider,
      },
    },
  });

  await sendEmail(
    [{ Email: paymentInfo.metadata.userEmail }],
    "Thank you for booking hotel with golobe",
    htmlEmail,
  );
}

function processFlightBookingDataForEmail(dbFlightData, dbBookingData) {
  return {
    emailFlightDetails: {
      itineraryFlightNumber: dbFlightData.flightCode,
      segments: dbFlightData.segmentIds.map((s) => ({
        flightNumber: s.flightNumber,
        airlineName: s.airlineId.name,
        departureDateTime: s.from.scheduledDeparture,
        departureAirportName: s.from.airport.name,
        departureAirportIataCode: s.from.airport.iataCode,
        arrivalDateTime: s.to.scheduledArrival,
        arrivalAirportName: s.to.airport.name,
        arrivalAirportIataCode: s.to.airport.iataCode,
        totalDurationMinutes: s.durationMinutes,
        airplaneModelName: s.airplaneId.model,
      })),
    },
    emailBookingDetails: {
      pnrCode: dbBookingData.pnrCode,
      userTimeZone: dbBookingData.userTimeZone,
      totalfare: dbBookingData.totalFare,
      currency: dbBookingData.currency || "USD",
      bookedAt: dbBookingData.bookedAt || dbBookingData.createdAt,
      ticketType: "refundable",
      fareClass: "",
      paymentMethod: {
        brand: dbBookingData.paymentId?.paymentMethod?.brand,
        last4: dbBookingData.paymentId?.paymentMethod?.last4,
        receiptUrl: dbBookingData.paymentId?.receiptUrl,
      },
      passengers: dbBookingData.passengers.map((p) => {
        const seat = dbBookingData.selectedSeats.find(
          (s) => s.passengerId === p._id,
        );

        return {
          firstName: p.firstName,
          lastName: p.lastName,
          seatNumber: seat?.seatId?.seatNumber,
          seatClass: seat?.seatId?.class,
          passengerType: p.passengerType,
        };
      }),
    },
  };
}