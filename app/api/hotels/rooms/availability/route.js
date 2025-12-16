import { NextResponse } from "next/server";
import { EnhancedHotelRoom, HotelBooking } from "@/lib/db/models";
import { connectToDB } from "@/lib/db/utilsDB";
import { isDateOverlap } from "@/lib/utils";

/**
 * Check room availability for specific dates
 * GET /api/hotels/rooms/availability
 * Query params:
 * - roomId: string (required)
 * - checkIn: string (ISO date, required)
 * - checkOut: string (ISO date, required)
 * - guests: number (optional, default 1)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const guests = parseInt(searchParams.get('guests')) || 1;

    // Validate required parameters
    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Missing required parameters: roomId, checkIn, checkOut" 
        },
        { status: 400 }
      );
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid date format. Please use ISO date format." 
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

    if (checkInDate < new Date().setHours(0, 0, 0, 0)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Check-in date cannot be in the past." 
        },
        { status: 400 }
      );
    }

    await connectToDB();

    // Get room details
    const room = await EnhancedHotelRoom.findById(roomId).populate('hotelId');
    if (!room) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Room not found." 
        },
        { status: 404 }
      );
    }

    // Check if room can accommodate guests
    if (guests > room.capacity.maxGuests) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Room can only accommodate ${room.capacity.maxGuests} guests.` 
        },
        { status: 400 }
      );
    }

    // Check room availability status
    if (room.status !== 'active') {
      return NextResponse.json(
        { 
          success: false, 
          message: `Room is currently ${room.status}.` 
        },
        { status: 400 }
      );
    }

    // Check blocked dates
    const hasBlockedDates = room.availability.blockedDates.some(blocked => {
      return isDateOverlap(
        { start: checkInDate, end: checkOutDate },
        { start: blocked.startDate, end: blocked.endDate }
      );
    });

    if (hasBlockedDates) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Room is not available for the selected dates due to maintenance or other restrictions." 
        },
        { status: 400 }
      );
    }

    // Check minimum/maximum stay requirements
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    if (nights < room.availability.minimumStay) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Minimum stay requirement is ${room.availability.minimumStay} nights.` 
        },
        { status: 400 }
      );
    }

    if (nights > room.availability.maximumStay) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Maximum stay allowed is ${room.availability.maximumStay} nights.` 
        },
        { status: 400 }
      );
    }

    // Check existing bookings
    const existingBookings = await HotelBooking.find({
      rooms: roomId,
      $or: [
        {
          bookingStatus: "confirmed",
        },
        {
          bookingStatus: "pending",
          guaranteedReservationUntil: { $gt: new Date() },
        },
      ],
      $expr: {
        $or: [
          // Check-in overlaps
          {
            $and: [
              { $lte: ["$checkInDate", checkInDate] },
              { $gt: ["$checkOutDate", checkInDate] }
            ]
          },
          // Check-out overlaps
          {
            $and: [
              { $lt: ["$checkInDate", checkOutDate] },
              { $gte: ["$checkOutDate", checkOutDate] }
            ]
          },
          // Complete overlap
          {
            $and: [
              { $gte: ["$checkInDate", checkInDate] },
              { $lte: ["$checkOutDate", checkOutDate] }
            ]
          }
        ]
      }
    });

    if (existingBookings.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Room is already booked for the selected dates." 
        },
        { status: 400 }
      );
    }

    // Check advance booking requirement
    const advanceDaysRequired = room.availability.advanceBookingRequired;
    const today = new Date();
    const daysInAdvance = Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysInAdvance < advanceDaysRequired) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Room requires ${advanceDaysRequired} days advance booking.` 
        },
        { status: 400 }
      );
    }

    // Check last minute booking
    if (!room.availability.lastMinuteBookingAllowed && daysInAdvance < 1) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Last minute booking is not allowed for this room." 
        },
        { status: 400 }
      );
    }

    // Check check-in/check-out day restrictions
    const checkInDay = checkInDate.toLocaleLowerCaseDateString('en-US', { weekday: 'long' });
    const checkOutDay = checkOutDate.toLocaleLowerCaseDateString('en-US', { weekday: 'long' });

    if (room.availability.checkInDays.length > 0 && 
        !room.availability.checkInDays.includes(checkInDay)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Check-in is not allowed on ${checkInDay} for this room.` 
        },
        { status: 400 }
      );
    }

    if (room.availability.checkOutDays.length > 0 && 
        !room.availability.checkOutDays.includes(checkOutDay)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Check-out is not allowed on ${checkOutDay} for this room.` 
        },
        { status: 400 }
      );
    }

    // Room is available
    return NextResponse.json({
      success: true,
      data: {
        roomId: room._id,
        available: true,
        roomDetails: {
          title: room.title,
          type: room.roomType,
          category: room.category,
          capacity: room.capacity,
          size: room.size,
          amenities: room.amenities,
          features: room.features,
          images: room.images,
          hotelName: room.hotelId?.name,
          hotelId: room.hotelId?._id,
        },
        pricing: room.pricing,
        policies: room.policies,
        nights,
        guests,
        checkIn: checkInDate,
        checkOut: checkOutDate,
      }
    });

  } catch (error) {
    console.error("Error checking room availability:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while checking room availability." 
      },
      { status: 500 }
    );
  }
}

/**
 * Check availability for multiple rooms at once
 * POST /api/hotels/rooms/availability/bulk
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { roomRequests } = body;

    if (!roomRequests || !Array.isArray(roomRequests)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid request body. Expected roomRequests array." 
        },
        { status: 400 }
      );
    }

    await connectToDB();

    const results = await Promise.all(
      roomRequests.map(async (request) => {
        try {
          const { roomId, checkIn, checkOut, guests = 1 } = request;

          // Validate required parameters
          if (!roomId || !checkIn || !checkOut) {
            return {
              roomId,
              success: false,
              message: "Missing required parameters"
            };
          }

          // Get room details
          const room = await EnhancedHotelRoom.findById(roomId);
          if (!room) {
            return {
              roomId,
              success: false,
              message: "Room not found"
            };
          }

          // Check existing bookings (simplified version for bulk)
          const existingBookings = await HotelBooking.countDocuments({
            rooms: roomId,
            $or: [
              { bookingStatus: "confirmed" },
              {
                bookingStatus: "pending",
                guaranteedReservationUntil: { $gt: new Date() },
              },
            ],
            checkInDate: { $lt: new Date(checkOut) },
            checkOutDate: { $gt: new Date(checkIn) },
          });

          const isAvailable = existingBookings === 0 && room.status === 'active';

          return {
            roomId,
            success: true,
            available: isAvailable,
            roomDetails: {
              title: room.title,
              type: room.roomType,
              category: room.category,
              capacity: room.capacity,
              pricing: room.pricing,
            }
          };

        } catch (error) {
          return {
            roomId: request.roomId,
            success: false,
            message: "Error checking availability",
            error: error.message
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error("Error in bulk availability check:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error during bulk availability check." 
      },
      { status: 500 }
    );
  }
}