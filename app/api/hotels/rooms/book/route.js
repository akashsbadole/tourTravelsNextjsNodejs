import { NextResponse } from "next/server";
import { EnhancedHotelRoom, HotelBooking, HotelGuest, HotelPayment, User } from "@/lib/db/models";
import { connectToDB } from "@/lib/db/utilsDB";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.config";
import { calculateDynamicPricing } from "@/lib/helpers/hotels/dynamicPricing";

/**
 * Create a room booking with enhanced room selection
 * POST /api/hotels/rooms/book
 * Body: {
 *   hotelId: string,
 *   rooms: [{
 *     roomId: string,
 *     quantity: number,
 *     guests: { adults: number, children: number, infants: number },
 *     customizations: {
 *       bedType?: string,
 *       viewPreference?: string,
 *       floorPreference?: number,
 *       specialRequests?: string,
 *       smokingPreference?: string
 *     }
 *   }],
 *   dates: { checkIn: string, checkOut: string },
 *   guestDetails: {
 *     firstName: string,
 *     lastName: string,
 *     email: string,
 *     phone: { dialCode: string, number: string }
 *   },
 *   paymentInfo?: {
 *     method: string,
 *     cardId?: string,
 *     saveCard?: boolean
 *   }
 * }
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Authentication required to make a booking." 
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      hotelId,
      rooms,
      dates,
      guestDetails,
      paymentInfo
    } = body;

    // Validate required fields
    if (!hotelId || !rooms || !dates || !guestDetails) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Missing required booking information." 
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "At least one room must be selected." 
        },
        { status: 400 }
      );
    }

    await connectToDB();

    // Validate dates
    const checkInDate = new Date(dates.checkIn);
    const checkOutDate = new Date(dates.checkOut);
    const today = new Date();

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid date format." 
        },
        { status: 400 }
      );
    }

    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Check-out date must be after check-in date." 
        },
        { status: 400 }
      );
    }

    if (checkInDate < today.setHours(0, 0, 0, 0)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Check-in date cannot be in the past." 
        },
        { status: 400 }
      );
    }

    // Get user details
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "User not found." 
        },
        { status: 404 }
      );
    }

    // Validate rooms availability
    const roomValidationPromises = rooms.map(async (roomSelection) => {
      const room = await EnhancedHotelRoom.findById(roomSelection.roomId);
      if (!room) {
        throw new Error(`Room ${roomSelection.roomId} not found`);
      }

      // Check room availability
      const existingBookings = await HotelBooking.find({
        rooms: roomSelection.roomId,
        $or: [
          { bookingStatus: "confirmed" },
          {
            bookingStatus: "pending",
            guaranteedReservationUntil: { $gt: new Date() },
          },
        ],
        checkInDate: { $lt: checkOutDate },
        checkOutDate: { $gt: checkInDate },
      });

      if (existingBookings.length > 0) {
        throw new Error(`Room ${room.title} is not available for the selected dates`);
      }

      // Calculate pricing
      const pricing = await calculateDynamicPricing({
        room,
        checkInDate,
        checkOutDate,
        guests: roomSelection.guests.adults,
        children: roomSelection.guests.children,
        infants: roomSelection.guests.infants,
        nights: Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
      });

      return {
        room,
        roomSelection,
        pricing,
        available: true
      };
    });

    let validatedRooms;
    try {
      validatedRooms = await Promise.all(roomValidationPromises);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          message: error.message || "Room validation failed." 
        },
        { status: 400 }
      );
    }

    // Calculate total pricing
    const totalSubtotal = validatedRooms.reduce((sum, room) => sum + room.pricing.subtotal, 0);
    const totalTaxes = validatedRooms.reduce((sum, room) => sum + room.pricing.taxes, 0);
    const totalFees = validatedRooms.reduce((sum, room) => sum + room.pricing.serviceFee, 0);
    const totalDeposit = validatedRooms.reduce((sum, room) => sum + room.pricing.deposit, 0);
    const totalPrice = validatedRooms.reduce((sum, room) => sum + room.pricing.total, 0);

    // Create booking
    const bookingData = {
      userId: session.user.id,
      hotelId,
      rooms: validatedRooms.map(vr => vr.room._id),
      checkInDate,
      checkOutDate,
      fareBreakdown: {
        rooms: validatedRooms.map(vr => ({
          roomId: vr.room._id,
          title: vr.room.title,
          roomType: vr.room.roomType,
          quantity: vr.roomSelection.quantity,
          guests: vr.roomSelection.guests,
          customizations: vr.roomSelection.customizations,
          pricing: vr.pricing
        })),
        subtotal: totalSubtotal,
        taxes: totalTaxes,
        fees: totalFees,
        deposit: totalDeposit,
        total: totalPrice,
        currency: validatedRooms[0]?.pricing?.currency || 'USD'
      },
      totalPrice,
      bookingStatus: "pending",
      paymentStatus: "pending",
      paymentMethod: paymentInfo?.method || "card",
      source: "web",
      guaranteedReservationUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    };

    const booking = new HotelBooking(bookingData);
    await booking.save();

    // Create guest records
    const guestPromises = [];
    let guestIndex = 0;

    for (const roomSelection of rooms) {
      for (let i = 0; i < roomSelection.quantity; i++) {
        const guestData = {
          hotelBookingId: booking._id,
          firstName: guestDetails.firstName,
          lastName: guestDetails.lastName,
          email: guestDetails.email,
          phone: guestDetails.phone,
          type: guestIndex === 0 ? "primary" : "additional",
          roomAssignment: {
            roomId: roomSelection.roomId,
            customizations: roomSelection.customizations
          }
        };

        guestPromises.push(
          new HotelGuest(guestData).save()
        );
        guestIndex++;
      }
    }

    await Promise.all(guestPromises);

    // Create payment record if payment info provided
    let paymentRecord = null;
    if (paymentInfo) {
      const paymentData = {
        bookingId: booking._id,
        provider: "stripe",
        amount: totalPrice,
        currency: validatedRooms[0]?.pricing?.currency || 'USD',
        status: "pending",
        paymentMethod: paymentInfo.method,
        metadata: {
          userId: session.user.id,
          hotelId,
          rooms: validatedRooms.map(vr => vr.room._id),
          saveCard: paymentInfo.saveCard || false
        }
      };

      if (paymentInfo.cardId) {
        paymentData.providerPaymentMethodId = paymentInfo.cardId;
      }

      paymentRecord = new HotelPayment(paymentData);
      await paymentRecord.save();

      // Update booking with payment reference
      booking.paymentId = paymentRecord._id;
      await booking.save();
    }

    // Update room popularity
    for (const validatedRoom of validatedRooms) {
      await EnhancedHotelRoom.findByIdAndUpdate(validatedRoom.room._id, {
        $inc: {
          'popularity.bookingCount': 1
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Room booking created successfully.",
      data: {
        bookingId: booking._id,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        totalPrice,
        depositRequired: totalDeposit > 0,
        depositAmount: totalDeposit,
        guaranteedUntil: booking.guaranteedReservationUntil,
        rooms: validatedRooms.map(vr => ({
          roomId: vr.room._id,
          title: vr.room.title,
          roomType: vr.room.roomType,
          quantity: vr.roomSelection.quantity,
          guests: vr.roomSelection.guests,
          customizations: vr.roomSelection.customizations,
          pricing: vr.pricing
        })),
        guestDetails,
        paymentInfo: paymentRecord ? {
          paymentId: paymentRecord._id,
          method: paymentInfo.method,
          status: paymentRecord.status
        } : null
      }
    });

  } catch (error) {
    console.error("Error creating room booking:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while creating room booking." 
      },
      { status: 500 }
    );
  }
}

/**
 * Get booking details for a specific room booking
 * GET /api/hotels/rooms/book/[bookingId]
 */
export async function GET(req, { params }) {
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

    const { bookingId } = params;
    if (!bookingId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Booking ID is required." 
        },
        { status: 400 }
      );
    }

    await connectToDB();

    const booking = await HotelBooking.findById(bookingId)
      .populate('hotelId', 'name address images')
      .populate('rooms')
      .populate('guests')
      .populate('paymentId');

    if (!booking) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Booking not found." 
        },
        { status: 404 }
      );
    }

    // Check if booking belongs to the user
    if (booking.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Access denied. This booking doesn't belong to you." 
        },
        { status: 403 }
      );
    }

    // Get detailed room information
    const roomsWithDetails = await Promise.all(
      booking.rooms.map(async (roomId) => {
        return await EnhancedHotelRoom.findById(roomId);
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        booking: {
          ...booking.toObject(),
          rooms: roomsWithDetails
        },
        hotel: booking.hotelId,
        guests: booking.guests,
        payment: booking.paymentId
      }
    });

  } catch (error) {
    console.error("Error fetching booking details:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while fetching booking details." 
      },
      { status: 500 }
    );
  }
}

/**
 * Update an existing room booking
 * PUT /api/hotels/rooms/book/[bookingId]
 */
export async function PUT(req, { params }) {
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

    const { bookingId } = params;
    const body = await req.json();

    await connectToDB();

    const booking = await HotelBooking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Booking not found." 
        },
        { status: 404 }
      );
    }

    // Check if booking belongs to the user
    if (booking.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Access denied. This booking doesn't belong to you." 
        },
        { status: 403 }
      );
    }

    // Check if booking can be modified
    if (booking.bookingStatus === "confirmed" || booking.bookingStatus === "cancelled") {
      return NextResponse.json(
        { 
          success: false, 
          message: "Cannot modify a confirmed or cancelled booking." 
        },
        { status: 400 }
      );
    }

    // Update allowed fields
    const allowedUpdates = {
      guestDetails: body.guestDetails,
      customizations: body.customizations
    };

    // Remove undefined fields
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    const updatedBooking = await HotelBooking.findByIdAndUpdate(
      bookingId,
      { $set: allowedUpdates },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Booking updated successfully.",
      data: updatedBooking
    });

  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while updating booking." 
      },
      { status: 500 }
    );
  }
}

/**
 * Cancel a room booking
 * DELETE /api/hotels/rooms/book/[bookingId]
 */
export async function DELETE(req, { params }) {
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

    const { bookingId } = params;
    const { reason } = await req.json();

    await connectToDB();

    const booking = await HotelBooking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Booking not found." 
        },
        { status: 404 }
      );
    }

    // Check if booking belongs to the user
    if (booking.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Access denied. This booking doesn't belong to you." 
        },
        { status: 403 }
      );
    }

    // Check if booking can be cancelled
    if (booking.bookingStatus === "cancelled") {
      return NextResponse.json(
        { 
          success: false, 
          message: "Booking is already cancelled." 
        },
        { status: 400 }
      );
    }

    // Update booking status
    const updatedBooking = await HotelBooking.findByIdAndUpdate(
      bookingId,
      { 
        $set: { 
          bookingStatus: "cancelled",
          cancellationReason: reason || "User requested cancellation",
          cancelledAt: new Date()
        }
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully.",
      data: updatedBooking
    });

  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while cancelling booking." 
      },
      { status: 500 }
    );
  }
}