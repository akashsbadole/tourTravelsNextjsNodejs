import { auth } from "@/lib/auth";
import { cancelBooking, isRoomTakenByElse } from "@/lib/services/hotels";
import { getUserDetails } from "@/lib/services/user";
import { getOneDoc } from "@/lib/db/getOperationDB";
import { HotelBooking } from "@/lib/db/models";
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
   * @property {string} slug - Hotel slug
   * @property {string} checkInDate - Check-in date
   * @property {string} checkOutDate - Check-out date
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

    const hotel = await getOneDoc("Hotel", { slug: body.slug }, ["hotels"], 0);

    const bookingData = await HotelBooking.findOne({
      hotelId: strToObjectId(hotel._id),
      checkInDate: new Date(body.checkInDate),
      checkOutDate: new Date(body.checkOutDate),
      userId: strToObjectId(session.user.id),
      $or: [
        { bookingStatus: "pending", paymentStatus: "pending" },
        {
          bookingStatus: "confirmed",
          paymentStatus: "pending",
          paymentMethod: "cash",
        },
      ],
    }).sort({ createdAt: -1 });

    if (!bookingData) {
      return Response.json(
        { success: false, message: "No reserved hotel booking found" },
        { status: 404 },
      );
    }

    const isTakenPromise = bookingData.rooms.map(async (room) => {
      return await isRoomTakenByElse(
        room,
        body.checkInDate,
        body.checkOutDate,
        session.user.id,
      );
    });

    const isTaken = (await Promise.all(isTakenPromise)).some(Boolean);

    if (isTaken) {
      const cancelled = await cancelBooking(
        bookingData._id.toString(),
        session.user.id,
      );
      if (cancelled.modifiedCount === 0) {
        throw new Error("Failed to cancel booking");
      }
      return Response.json(
        {
          success: false,
          message:
            "Room is already taken by another person, thus booking is cancelled",
        },
        { status: 400 },
      );
    }

    // Track payment initiated analytics (non-blocking)
    const paymentAnalyticsData = {
      paymentIntentId: `pending_${bookingData._id}`,
      amount: bookingData.totalPrice,
      currency: body.currency || bookingData.currency || "USD",
      provider: provider.getProviderType(),
      bookingType: "hotel",
      bookingId: bookingData._id.toString(),
      sessionId: req.headers.get('x-session-id') || null
    };

    // Don't wait for analytics to complete
    analyticsIntegrationService.trackPaymentInitiated(paymentAnalyticsData, user._id.toString())
      .catch(error => console.error('Analytics tracking failed:', error));

    // Create payment intent with provider
    const paymentResult = await provider.createPaymentIntent({
      amount: bookingData.totalPrice,
      currency: body.currency || bookingData.currency || "USD",
      customerId,
      paymentMethodId: body.paymentMethodId,
      metadata: {
        type: "hotelBooking",
        hotelId: hotel._id.toString(),
        hotelBookingId: bookingData._id.toString(),
        userId: user._id.toString(),
        userEmail: user.email,
        customerName: user.firstName + " " + user.lastName,
        companyName: "Travel Agency",
        description: `Hotel booking at ${hotel.name}`,
        bookingId: bookingData._id.toString(),
        invoiceId: `invoice_${bookingData._id}`,
      },
      receiptEmail: user.email,
      idempotencyKey: bookingData._id.toString(),
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/user/my_bookings/hotels/${bookingData._id}/payment/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/user/my_bookings/hotels/${bookingData._id}/payment/cancel`,
    });

    if (!paymentResult.success) {
      throw new Error(`Payment intent creation failed: ${paymentResult.error.message}`);
    }

    // Track hotel booking analytics (non-blocking)
    const bookingAnalyticsData = {
      bookingId: bookingData._id.toString(),
      hotelId: hotel._id.toString(),
      hotelName: hotel.name,
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,
      totalPrice: bookingData.totalPrice,
      currency: body.currency || bookingData.currency || "USD",
      rooms: bookingData.rooms?.length || 1,
      nights: Math.ceil((new Date(bookingData.checkOutDate) - new Date(bookingData.checkInDate)) / (1000 * 60 * 60 * 24)),
      sessionId: req.headers.get('x-session-id') || null
    };

    // Don't wait for analytics to complete
    analyticsIntegrationService.trackHotelBooking(bookingAnalyticsData, user._id.toString())
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
    console.log("Hotel payment intent creation error:", error);
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
      slug: z.string(),
      checkInDate: z.union([z.string(), z.number()]),
      checkOutDate: z.union([z.string(), z.number()]),
      shouldSavePaymentMethod: z.boolean().optional(),
      provider: z.enum(["stripe", "razorpay", "paypal"]).optional(),
      currency: z.string().optional(),
    })
    .safeParse(data);

  return schema;
}