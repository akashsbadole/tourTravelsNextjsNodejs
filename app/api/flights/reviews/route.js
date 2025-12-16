import { getManyDocs, getOneDoc } from "@/lib/db/getOperationDB";
import { FlightReview } from "@/lib/db/models";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { status: 'published' };
    
    // Basic filters
    if (searchParams.get('airlineId')) {
      filter.airlineId = searchParams.get('airlineId');
    }
    
    if (searchParams.get('departureAirportId')) {
      filter.departureAirportId = searchParams.get('departureAirportId');
    }
    
    if (searchParams.get('arrivalAirportId')) {
      filter.arrivalAirportId = searchParams.get('arrivalAirportId');
    }
    
    if (searchParams.get('airplaneModelName')) {
      filter.airplaneModelName = searchParams.get('airplaneModelName');
    }
    
    if (searchParams.get('flightNumber')) {
      filter.flightNumber = searchParams.get('flightNumber');
    }
    
    // Rating filters
    if (searchParams.get('minRating')) {
      filter.rating = { $gte: parseFloat(searchParams.get('minRating')) };
    }
    
    if (searchParams.get('maxRating')) {
      filter.rating = { ...filter.rating, $lte: parseFloat(searchParams.get('maxRating')) };
    }
    
    // Date range filters
    if (searchParams.get('dateFrom') || searchParams.get('dateTo')) {
      filter.flightDate = {};
      if (searchParams.get('dateFrom')) {
        filter.flightDate.$gte = new Date(searchParams.get('dateFrom'));
      }
      if (searchParams.get('dateTo')) {
        filter.flightDate.$lte = new Date(searchParams.get('dateTo'));
      }
    }
    
    // Price range filters
    if (searchParams.get('minPrice') || searchParams.get('maxPrice')) {
      filter.ticketPrice = {};
      if (searchParams.get('minPrice')) {
        filter.ticketPrice.$gte = parseFloat(searchParams.get('minPrice'));
      }
      if (searchParams.get('maxPrice')) {
        filter.ticketPrice.$lte = parseFloat(searchParams.get('maxPrice'));
      }
    }
    
    // Category filters
    if (searchParams.get('tripType')) {
      filter.tripType = searchParams.get('tripType');
    }
    
    if (searchParams.get('travelClass')) {
      filter.travelClass = searchParams.get('travelClass');
    }
    
    // Verification filters
    if (searchParams.get('verified') === 'true') {
      filter.verified = true;
    }
    
    if (searchParams.get('bookingConfirmed') === 'true') {
      filter.bookingConfirmed = true;
    }
    
    // Sentiment filter
    if (searchParams.get('sentiment')) {
      filter.sentiment = searchParams.get('sentiment');
    }
    
    // Keyword search
    if (searchParams.get('keyword')) {
      filter.$text = { $search: searchParams.get('keyword') };
    }
    
    // Category ratings filter
    const categoryRatingField = searchParams.get('categoryRatingField');
    const minCategoryRating = searchParams.get('minCategoryRating');
    if (categoryRatingField && minCategoryRating) {
      filter[`categoryRatings.${categoryRatingField}`] = { 
        $gte: parseFloat(minCategoryRating) 
      };
    }
    
    // Sort options
    let sort = { createdAt: -1 }; // default: newest first
    
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    switch (sortBy) {
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'highest_rated':
        sort = { rating: -1 };
        break;
      case 'lowest_rated':
        sort = { rating: 1 };
        break;
      case 'most_helpful':
        sort = { helpfulVotes: -1 };
        break;
      case 'price_low_high':
        sort = { ticketPrice: 1 };
        break;
      case 'price_high_low':
        sort = { ticketPrice: -1 };
        break;
      case 'flight_date':
        sort = { flightDate: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }
    
    // Apply sort order
    if (sortOrder === 'asc') {
      Object.keys(sort).forEach(key => {
        sort[key] = 1;
      });
    }
    
    // Execute query with pagination
    const reviews = await FlightReview
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('reviewer', 'name email profileImage')
      .populate('verifiedBy', 'name')
      .populate('airlineResponse.respondedBy', 'name')
      .lean();
    
    // Get total count for pagination
    const total = await FlightReview.countDocuments(filter);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages,
          totalReviews: total,
          limit,
          hasNextPage,
          hasPrevPage
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching flight reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Create new review
    const review = new FlightReview({
      ...body,
      status: 'pending' // Reviews start as pending for moderation
    });
    
    await review.save();
    
    return NextResponse.json({
      success: true,
      data: review
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating flight review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    );
  }
}