import { NextResponse } from "next/server";
import { EnhancedHotelRoom, Hotel, HotelBooking } from "@/lib/db/models";
import { connectToDB } from "@/lib/db/utilsDB";
import analyticsIntegrationService from "@/lib/services/analyticsIntegration";

/**
 * Search and filter rooms with advanced options
 * GET /api/hotels/rooms/search
 * Query params:
 * - hotelId: string (optional)
 * - city: string (optional)
 * - country: string (optional)
 * - checkIn: string (ISO date, optional)
 * - checkOut: string (ISO date, optional)
 * - guests: number (optional, default 1)
 * - children: number (optional, default 0)
 * - infants: number (optional, default 0)
 * - rooms: number (optional, default 1)
 * - roomTypes: string (comma-separated, optional)
 * - categories: string (comma-separated, optional)
 * - minPrice: number (optional)
 * - maxPrice: number (optional)
 * - amenities: string (comma-separated, optional)
 * - features: string (comma-separated, optional)
 * - accessibility: string (comma-separated, optional)
 * - minSize: number (optional)
 * - maxSize: number (optional)
 * - minRating: number (optional)
 * - sortBy: string (optional, default 'price_asc')
 * - page: number (optional, default 1)
 * - limit: number (optional, default 20)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse query parameters
    const hotelId = searchParams.get('hotelId');
    const city = searchParams.get('city');
    const country = searchParams.get('country');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const guests = parseInt(searchParams.get('guests')) || 1;
    const children = parseInt(searchParams.get('children')) || 0;
    const infants = parseInt(searchParams.get('infants')) || 0;
    const rooms = parseInt(searchParams.get('rooms')) || 1;
    
    const roomTypes = searchParams.get('roomTypes')?.split(',').filter(Boolean);
    const categories = searchParams.get('categories')?.split(',').filter(Boolean);
    const amenities = searchParams.get('amenities')?.split(',').filter(Boolean);
    const features = searchParams.get('features')?.split(',').filter(Boolean);
    const accessibility = searchParams.get('accessibility')?.split(',').filter(Boolean);
    
    const minPrice = parseFloat(searchParams.get('minPrice'));
    const maxPrice = parseFloat(searchParams.get('maxPrice'));
    const minSize = parseFloat(searchParams.get('minSize'));
    const maxSize = parseFloat(searchParams.get('maxSize'));
    const minRating = parseFloat(searchParams.get('minRating'));
    
    const sortBy = searchParams.get('sortBy') || 'price_asc';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    await connectToDB();

    // Build base query
    let query = {
      status: 'active'
    };

    // Hotel filtering
    if (hotelId) {
      query.hotelId = hotelId;
    } else if (city || country) {
      // Get hotels in the specified location
      const hotelQuery = {};
      if (city) {
        hotelQuery['address.city'] = { $regex: city, $options: 'i' };
      }
      if (country) {
        hotelQuery['address.country'] = { $regex: country, $options: 'i' };
      }
      
      const hotels = await Hotel.find(hotelQuery).select('_id');
      query.hotelId = { $in: hotels.map(h => h._id) };
    }

    // Room type and category filtering
    if (roomTypes && roomTypes.length > 0) {
      query.roomType = { $in: roomTypes };
    }
    
    if (categories && categories.length > 0) {
      query.category = { $in: categories };
    }

    // Capacity filtering
    const totalGuests = guests + children + infants;
    query['capacity.maxGuests'] = { $gte: totalGuests };

    // Size filtering
    if (minSize || maxSize) {
      query['size.squareMeters'] = {};
      if (minSize) query['size.squareMeters'].$gte = minSize;
      if (maxSize) query['size.squareMeters'].$lte = maxSize;
    }

    // Rating filtering
    if (minRating) {
      query['rating.average'] = { $gte: minRating };
    }

    // Amenities filtering
    if (amenities && amenities.length > 0) {
      query['amenities.name'] = { $in: amenities };
    }

    // Features filtering
    if (features && features.length > 0) {
      query['features.name'] = { $in: features };
    }

    // Accessibility filtering
    if (accessibility && accessibility.length > 0) {
      accessibility.forEach(feature => {
        if (feature === 'wheelchair_accessible') {
          query.accessibility.wheelchairAccessible = true;
        } else if (feature === 'hearing_accessible') {
          query.accessibility.hearingAccessible = true;
        } else if (feature === 'visual_accessible') {
          query.accessibility.visualAccessible = true;
        } else if (feature === 'mobility_accessible') {
          query.accessibility.mobilityAccessible = true;
        }
      });
    }

    // Price filtering (base price per night)
    if (minPrice || maxPrice) {
      query['pricing.base'] = {};
      if (minPrice) query['pricing.base'].$gte = minPrice;
      if (maxPrice) query['pricing.base'].$lte = maxPrice;
    }

    // Availability filtering if dates are provided
    let unavailableRoomIds = [];
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      // Get booked rooms for the date range
      const bookedRooms = await HotelBooking.find({
        $or: [
          { bookingStatus: "confirmed" },
          {
            bookingStatus: "pending",
            guaranteedReservationUntil: { $gt: new Date() },
          },
        ],
        checkInDate: { $lt: checkOutDate },
        checkOutDate: { $gt: checkInDate },
      }).select('rooms');

      unavailableRoomIds = bookedRooms
        .flatMap(booking => booking.rooms)
        .map(roomId => roomId.toString());

      // Exclude unavailable rooms
      if (unavailableRoomIds.length > 0) {
        query._id = { $nin: unavailableRoomIds };
      }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    let roomsQuery = EnhancedHotelRoom.find(query)
      .populate('hotelId', 'name address images rating')
      .skip(skip)
      .limit(limit);

    // Apply sorting
    const sortOptions = getSortOptions(sortBy);
    roomsQuery.sort(sortOptions);

    const rooms = await roomsQuery.exec();

    // Get total count for pagination
    const totalCount = await EnhancedHotelRoom.countDocuments(query);

    // Calculate pricing for each room if dates are provided
    let roomsWithPricing = rooms;
    if (checkIn && checkOut) {
      const { calculateDynamicPricing } = await import("@/lib/helpers/hotels/dynamicPricing");
      
      roomsWithPricing = await Promise.all(
        rooms.map(async (room) => {
          try {
            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkOut);
            const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

            const pricing = await calculateDynamicPricing({
              room,
              checkInDate,
              checkOutDate,
              guests,
              children,
              infants,
              nights
            });

            return {
              ...room.toObject(),
              dynamicPricing: pricing,
              available: true
            };
          } catch (error) {
            console.error(`Error calculating pricing for room ${room._id}:`, error);
            return {
              ...room.toObject(),
              available: false,
              pricingError: error.message
            };
          }
        })
      );
    }

    // Track search analytics (non-blocking)
    const analyticsData = {
      hotelId,
      city,
      country,
      checkIn,
      checkOut,
      guests,
      children,
      infants,
      rooms,
      roomTypes,
      categories,
      amenities,
      features,
      accessibility,
      minPrice,
      maxPrice,
      minSize,
      maxSize,
      minRating,
      sortBy,
      sessionId: req.headers.get('x-session-id') || null,
      userAgent: req.headers.get('user-agent') || null,
      referrer: req.headers.get('referer') || null
    };

    // Don't wait for analytics to complete
    analyticsIntegrationService.trackHotelSearch(analyticsData, roomsWithPricing)
      .catch(error => console.error('Analytics tracking failed:', error));

    return NextResponse.json({
      success: true,
      data: {
        rooms: roomsWithPricing,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalRooms: totalCount,
          roomsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        },
        filters: {
          applied: {
            hotelId,
            city,
            country,
            checkIn,
            checkOut,
            guests,
            children,
            infants,
            rooms,
            roomTypes,
            categories,
            amenities,
            features,
            accessibility,
            minPrice,
            maxPrice,
            minSize,
            maxSize,
            minRating,
            sortBy
          },
          unavailableRoomIds
        }
      }
    });

  } catch (error) {
    console.error("Error searching rooms:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while searching rooms." 
      },
      { status: 500 }
    );
  }
}

/**
 * Get available filter options for rooms
 * GET /api/hotels/rooms/search/filters
 */
export async function OPTIONS(req) {
  try {
    await connectToDB();

    // Get unique values for filters
    const [
      roomTypes,
      categories,
      amenities,
      features,
      accessibilityFeatures
    ] = await Promise.all([
      EnhancedHotelRoom.distinct('roomType', { status: 'active' }),
      EnhancedHotelRoom.distinct('category', { status: 'active' }),
      EnhancedHotelRoom.distinct('amenities.name', { status: 'active' }),
      EnhancedHotelRoom.distinct('features.name', { status: 'active' }),
      EnhancedHotelRoom.aggregate([
        { $match: { status: 'active' } },
        { $project: {
          accessibilityFeatures: {
            $filter: {
              input: [
                { $cond: [{ $eq: ['$accessibility.wheelchairAccessible', true] }, 'wheelchair_accessible', null] },
                { $cond: [{ $eq: ['$accessibility.hearingAccessible', true] }, 'hearing_accessible', null] },
                { $cond: [{ $eq: ['$accessibility.visualAccessible', true] }, 'visual_accessible', null] },
                { $cond: [{ $eq: ['$accessibility.mobilityAccessible', true] }, 'mobility_accessible', null] }
              ],
              cond: { $ne: ['$$this', null] }
            }
          }
        }},
        { $unwind: '$accessibilityFeatures' },
        { $group: { _id: '$accessibilityFeatures' } },
        { $project: { _id: 0, feature: '$_id' } }
      ])
    ]);

    // Get price range
    const priceRange = await EnhancedHotelRoom.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$pricing.base' },
          maxPrice: { $max: '$pricing.base' }
        }
      }
    ]);

    // Get size range
    const sizeRange = await EnhancedHotelRoom.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          minSize: { $min: '$size.squareMeters' },
          maxSize: { $max: '$size.squareMeters' }
        }
      }
    ]);

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'rating_asc', label: 'Rating: Low to High' },
      { value: 'size_desc', label: 'Size: Large to Small' },
      { value: 'size_asc', label: 'Size: Small to Large' },
      { value: 'popularity_desc', label: 'Most Popular' },
      { value: 'newest', label: 'Newest First' }
    ];

    return NextResponse.json({
      success: true,
      data: {
        roomTypes,
        categories,
        amenities,
        features,
        accessibility: accessibilityFeatures.map(item => item.feature),
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 1000 },
        sizeRange: sizeRange[0] || { minSize: 10, maxSize: 100 },
        sortOptions
      }
    });

  } catch (error) {
    console.error("Error getting filter options:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while getting filter options." 
      },
      { status: 500 }
    );
  }
}

/**
 * Get sort options for MongoDB query
 */
function getSortOptions(sortBy) {
  const sortMap = {
    'price_asc': { 'pricing.base': 1 },
    'price_desc': { 'pricing.base': -1 },
    'rating_desc': { 'rating.average': -1 },
    'rating_asc': { 'rating.average': 1 },
    'size_desc': { 'size.squareMeters': -1 },
    'size_asc': { 'size.squareMeters': 1 },
    'popularity_desc': { 'popularity.bookingCount': -1 },
    'newest': { 'createdAt': -1 }
  };

  return sortMap[sortBy] || sortMap['price_asc'];
}