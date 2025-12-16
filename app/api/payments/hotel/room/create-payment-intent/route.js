import { NextResponse } from "next/server";
import { HotelBooking, HotelPayment, User } from "@/lib/db/models";
import { connectToDB } from "@/lib/db/utilsDB";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.config";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create payment intent for specific room booking
 * POST /api/payments/hotel/room/create-payment-intent
 * Body: {
 *   bookingId: string,
 *   roomIds: string[],
 *   paymentMethod: string,
 *   savePaymentMethod: boolean,
 *   promoCode?: string
 * }
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Authentication required." 
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      bookingId,
      roomIds,
      paymentMethod = "card",
      savePaymentMethod = false,
      promoCode
    } = body;

    if (!bookingId || !roomIds || roomIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Booking ID and room IDs are required." 
        },
        { status: 400 }
      );
    }

    await connectToDB();

    // Get booking details
    const booking = await HotelBooking.findById(bookingId)
      .populate('hotelId')
      .populate('rooms')
      .populate('guests');

    if (!booking) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Booking not found." 
        },
        { status: 404 }
      );
    }

    // Verify booking belongs to user
    if (booking.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Access denied. This booking doesn't belong to you." 
        },
        { status: 403 }
      );
    }

    // Verify booking is in pending status
    if (booking.bookingStatus !== "pending") {
      return NextResponse.json(
        { 
          success: false, 
          message: "Payment can only be processed for pending bookings." 
        },
        { status: 400 }
      );
    }

    // Calculate room-specific pricing
    const roomPricingPromises = roomIds.map(async (roomId) => {
      const response = await fetch(`/api/hotels/rooms/pricing?roomId=${roomId}&checkIn=${booking.checkInDate.toISOString()}&checkOut=${booking.checkOutDate.toISOString()}&guests=${booking.guests.length}&promoCode=${promoCode || ''}`);
      const data = await response.json();
      
      if (data.success) {
        return {
          roomId,
          pricing: data.data
        };
      }
      throw new Error(data.message || 'Failed to get room pricing');
    });

    const roomPricingResults = await Promise.all(roomPricingPromises);
    
    // Calculate total amount
    const totalAmount = roomPricingResults.reduce((sum, room) => {
      return sum + (room.pricing?.total || 0);
    }, 0);

    // Apply promo code discount if provided
    let finalAmount = totalAmount;
    let discountInfo = null;

    if (promoCode) {
      try {
        const promoResponse = await fetch(`/api/payments/validate-promo?code=${encodeURIComponent(promoCode)}&amount=${totalAmount}`);
        const promoData = await promoResponse.json();
        
        if (promoData.success) {
          finalAmount = promoData.data.finalAmount;
          discountInfo = promoData.data.discountInfo;
        }
      } catch (error) {
        console.error('Error validating promo code:', error);
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        bookingId,
        userId: session.user.id,
        hotelId: booking.hotelId._id,
        roomIds: roomIds.join(','),
        paymentMethod,
        promoCode: promoCode || '',
        breakdown: JSON.stringify(roomPricingResults.map(rp => ({
          roomId: rp.roomId,
          amount: rp.pricing?.total || 0,
          currency: rp.pricing?.currency || 'usd'
        }))),
        originalAmount: totalAmount,
        finalAmount,
        discount: discountInfo
      },
      automatic_payment_methods: {
        enabled: ['card']
      }
    });

    // Save payment record
    const paymentData = {
      bookingId,
      provider: "stripe",
      providerPaymentIntentId: paymentIntent.id,
      amount: finalAmount / 100, // Convert back to dollars
      currency: 'usd',
      status: 'pending',
      paymentMethod,
      metadata: {
        userId: session.user.id,
        roomIds,
        promoCode: promoCode || '',
        breakdown: roomPricingResults.map(rp => ({
          roomId: rp.roomId,
          amount: rp.pricing?.total || 0,
          currency: rp.pricing?.currency || 'usd'
        })),
        originalAmount: totalAmount,
        finalAmount,
        discount: discountInfo
      }
    };

    const payment = new HotelPayment(paymentData);
    await payment.save();

    // Update booking with payment reference
    await HotelBooking.findByIdAndUpdate(bookingId, {
      paymentId: payment._id,
      paymentStatus: 'pending',
      fareBreakdown: {
        rooms: roomPricingResults.map(rp => ({
          roomId: rp.roomId,
          pricing: rp.pricing,
          quantity: booking.rooms.filter(roomId => roomId.toString()).length
        })),
        subtotal: roomPricingResults.reduce((sum, rp) => sum + (rp.pricing?.subtotal || 0), 0),
        taxes: roomPricingResults.reduce((sum, rp) => sum + (rp.pricing?.taxes || 0), 0),
        fees: roomPricingResults.reduce((sum, rp) => sum + (rp.pricing?.serviceFee || 0), 0),
        total: finalAmount,
        discount: discountInfo
      }
    });

    // Update user's saved payment methods if requested
    if (savePaymentMethod && paymentMethod === 'card') {
      await User.findByIdAndUpdate(session.user.id, {
        $push: {
          savedPaymentMethods: {
            type: 'card',
            lastUsed: new Date(),
            stripePaymentMethodId: paymentIntent.payment_method
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: finalAmount,
        currency: 'usd',
        roomPricing: roomPricingResults,
        discountInfo,
        bookingId
      }
    });

  } catch (error) {
    console.error("Error creating room payment intent:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while creating payment intent." 
      },
      { status: 500 }
    );
  }
}

/**
 * Get payment status for room booking
 * GET /api/payments/hotel/room/status?paymentIntentId=<id>
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!paymentIntentId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Payment intent ID is required." 
        },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Authentication required." 
        },
        { status: 401 }
      );
    }

    await connectToDB();

    // Get payment record
    const payment = await HotelPayment.findOne({
      providerPaymentIntentId: paymentIntentId
    }).populate('bookingId');

    if (!payment) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Payment not found." 
        },
        { status: 404 }
      );
    }

    // Verify booking belongs to user
    if (payment.bookingId.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Access denied. This payment doesn't belong to you." 
        },
        { status: 403 }
      );
    }

    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Update payment status based on Stripe status
    let paymentStatus = 'pending';
    let bookingStatus = 'pending';

    if (paymentIntent.status === 'succeeded') {
      paymentStatus = 'paid';
      bookingStatus = 'confirmed';
    } else if (paymentIntent.status === 'canceled') {
      paymentStatus = 'failed';
      bookingStatus = 'cancelled';
    } else if (paymentIntent.status === 'requires_payment_method') {
      paymentStatus = 'pending';
      bookingStatus = 'pending';
    }

    // Update payment record
    await HotelPayment.findByIdAndUpdate(payment._id, {
      status: paymentStatus,
      providerStatus: paymentIntent.status,
      metadata: {
        ...payment.metadata,
        stripeStatus: paymentIntent.status,
        lastUpdated: new Date().toISOString()
      }
    });

    // Update booking status
    await HotelBooking.findByIdAndUpdate(payment.bookingId._id, {
      paymentStatus: bookingStatus,
      bookingStatus: bookingStatus,
      bookedAt: bookingStatus === 'confirmed' ? new Date() : null
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentStatus,
        bookingStatus,
        paymentIntentStatus: paymentIntent.status,
        amount: payment.amount,
        currency: payment.currency
      }
    });

  } catch (error) {
    console.error("Error getting room payment status:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while getting payment status." 
      },
      { status: 500 }
    );
  }
}