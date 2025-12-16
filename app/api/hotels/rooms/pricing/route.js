import { NextResponse } from "next/server";
import { EnhancedHotelRoom } from "@/lib/db/models";
import { connectToDB } from "@/lib/db/utilsDB";
import { calculateDynamicPricing } from "@/lib/helpers/hotels/dynamicPricing";

/**
 * Get room pricing for specific dates and guests
 * GET /api/hotels/rooms/pricing
 * Query params:
 * - roomId: string (required)
 * - checkIn: string (ISO date, required)
 * - checkOut: string (ISO date, required)
 * - guests: number (optional, default 1)
 * - children: number (optional, default 0)
 * - infants: number (optional, default 0)
 * - promoCode: string (optional)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const guests = parseInt(searchParams.get('guests')) || 1;
    const children = parseInt(searchParams.get('children')) || 0;
    const infants = parseInt(searchParams.get('infants')) || 0;
    const promoCode = searchParams.get('promoCode');

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

    // Calculate number of nights
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    if (nights <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid stay duration." 
        },
        { status: 400 }
      );
    }

    // Calculate total guests
    const totalGuests = guests + children + infants;

    // Check capacity
    if (totalGuests > room.capacity.maxGuests) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Room can only accommodate ${room.capacity.maxGuests} guests.` 
        },
        { status: 400 }
      );
    }

    // Calculate dynamic pricing
    const pricingResult = await calculateDynamicPricing({
      room,
      checkInDate,
      checkOutDate,
      guests,
      children,
      infants,
      nights,
      promoCode
    });

    return NextResponse.json({
      success: true,
      data: {
        roomId: room._id,
        roomTitle: room.title,
        roomType: room.roomType,
        hotelName: room.hotelId?.name,
        hotelId: room.hotelId?._id,
        dates: {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights
        },
        guests: {
          adults: guests,
          children,
          infants,
          total: totalGuests
        },
        pricing: pricingResult,
        breakdown: {
          baseRate: pricingResult.baseRate,
          seasonalMultiplier: pricingResult.seasonalMultiplier,
          weekendSurcharge: pricingResult.weekendSurcharge,
          lastMinuteDiscount: pricingResult.lastMinuteDiscount,
          extraPersonFees: pricingResult.extraPersonFees,
          childFees: pricingResult.childFees,
          cleaningFee: pricingResult.cleaningFee,
          serviceFee: pricingResult.serviceFee,
          taxes: pricingResult.taxes,
          discount: pricingResult.discount,
          deposit: pricingResult.deposit
        },
        policies: {
          depositRequired: pricingResult.depositRequired,
          cancellationPolicy: room.availability.minimumStay > 1 ? 
            `Minimum ${room.availability.minimumStay} nights` : 
            'Standard cancellation policy applies'
        }
      }
    });

  } catch (error) {
    console.error("Error calculating room pricing:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while calculating pricing." 
      },
      { status: 500 }
    );
  }
}

/**
 * Get pricing comparison for multiple rooms
 * POST /api/hotels/rooms/pricing/compare
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { roomIds, checkIn, checkOut, guests = 1, children = 0, infants = 0, promoCode } = body;

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid request body. Expected roomIds array." 
        },
        { status: 400 }
      );
    }

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Missing required parameters: checkIn, checkOut" 
        },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid stay duration." 
        },
        { status: 400 }
      );
    }

    await connectToDB();

    // Get all rooms
    const rooms = await EnhancedHotelRoom.find({
      _id: { $in: roomIds },
      status: 'active'
    }).populate('hotelId');

    if (rooms.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "No valid rooms found." 
        },
        { status: 404 }
      );
    }

    // Calculate pricing for each room
    const pricingComparisons = await Promise.all(
      rooms.map(async (room) => {
        try {
          const totalGuests = guests + children + infants;
          
          // Skip if room can't accommodate guests
          if (totalGuests > room.capacity.maxGuests) {
            return {
              roomId: room._id,
              roomTitle: room.title,
              roomType: room.roomType,
              hotelName: room.hotelId?.name,
              available: false,
              reason: `Room can only accommodate ${room.capacity.maxGuests} guests`
            };
          }

          const pricingResult = await calculateDynamicPricing({
            room,
            checkInDate,
            checkOutDate,
            guests,
            children,
            infants,
            nights,
            promoCode
          });

          return {
            roomId: room._id,
            roomTitle: room.title,
            roomType: room.roomType,
            category: room.category,
            hotelName: room.hotelId?.name,
            hotelId: room.hotelId?._id,
            available: true,
            pricing: pricingResult,
            valueScore: calculateValueScore(room, pricingResult, totalGuests, nights),
            amenities: room.amenities,
            features: room.features,
            size: room.size,
            capacity: room.capacity
          };

        } catch (error) {
          return {
            roomId: room._id,
            available: false,
            reason: "Error calculating pricing",
            error: error.message
          };
        }
      })
    );

    // Sort by value score (best value first)
    const sortedComparisons = pricingComparisons
      .filter(room => room.available)
      .sort((a, b) => b.valueScore - a.valueScore);

    return NextResponse.json({
      success: true,
      data: {
        searchCriteria: {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights,
          guests: {
            adults: guests,
            children,
            infants,
            total: guests + children + infants
          }
        },
        comparisons: pricingComparisons,
        bestValue: sortedComparisons.length > 0 ? sortedComparisons[0] : null,
        cheapest: pricingComparisons
          .filter(room => room.available)
          .sort((a, b) => a.pricing.total - b.pricing.total)[0] || null
      }
    });

  } catch (error) {
    console.error("Error in pricing comparison:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error during pricing comparison." 
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate a value score for room comparison
 * Higher score = better value
 */
function calculateValueScore(room, pricing, totalGuests, nights) {
  let score = 100; // Base score

  // Price per night per guest (lower is better)
  const pricePerNightPerGuest = pricing.total / nights / totalGuests;
  score -= Math.min(pricePerNightPerGuest * 2, 50);

  // Room size bonus (larger is better)
  const sizeBonus = Math.min(room.size?.squareMeters * 0.5, 20);
  score += sizeBonus;

  // Category bonus
  const categoryBonus = {
    'budget': 0,
    'mid_range': 5,
    'luxury': 10,
    'ultra_luxury': 15
  };
  score += categoryBonus[room.category] || 0;

  // Amenities bonus
  const includedAmenities = room.amenities.filter(amenity => amenity.included).length;
  score += Math.min(includedAmenities * 2, 20);

  // Rating bonus
  if (room.rating?.average > 0) {
    score += Math.min(room.rating.average * 5, 25);
  }

  // Popularity bonus
  score += Math.min(room.popularity?.bookingCount * 0.1, 10);

  return Math.max(score, 0);
}