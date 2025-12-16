import { FlightReview } from "@/lib/db/models";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Build filter object for analytics
    const filter = { status: 'published' };
    
    if (searchParams.get('airlineId')) {
      filter.airlineId = searchParams.get('airlineId');
    }
    
    if (searchParams.get('departureAirportId')) {
      filter.departureAirportId = searchParams.get('departureAirportId');
    }
    
    if (searchParams.get('arrivalAirportId')) {
      filter.arrivalAirportId = searchParams.get('arrivalAirportId');
    }
    
    // Date range for analytics
    const dateRange = searchParams.get('dateRange');
    if (dateRange) {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filter.createdAt = { $gte: startDate };
      }
    }
    
    // Overall statistics
    const totalReviews = await FlightReview.countDocuments(filter);
    const averageRating = await FlightReview.aggregate([
      { $match: filter },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);
    
    // Rating distribution
    const ratingDistribution = await FlightReview.aggregate([
      { $match: filter },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Category ratings averages
    const categoryAverages = await FlightReview.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: null,
          avgComfort: { $avg: "$categoryRatings.comfort" },
          avgService: { $avg: "$categoryRatings.service" },
          avgFood: { $avg: "$categoryRatings.food" },
          avgPunctuality: { $avg: "$categoryRatings.punctuality" },
          avgCleanliness: { $avg: "$categoryRatings.cleanliness" },
          avgAmenities: { $avg: "$categoryRatings.amenities" },
          avgValue: { $avg: "$categoryRatings.value" }
        }
      }
    ]);
    
    // Trip type distribution
    const tripTypeDistribution = await FlightReview.aggregate([
      { $match: filter },
      { $group: { _id: "$tripType", count: { $sum: 1 } } }
    ]);
    
    // Travel class distribution
    const travelClassDistribution = await FlightReview.aggregate([
      { $match: filter },
      { $group: { _id: "$travelClass", count: { $sum: 1 } } }
    ]);
    
    // Sentiment distribution
    const sentimentDistribution = await FlightReview.aggregate([
      { $match: filter },
      { $group: { _id: "$sentiment", count: { $sum: 1 } } }
    ]);
    
    // Verification statistics
    const verificationStats = await FlightReview.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: null,
          verified: { $sum: { $cond: ["$verified", 1, 0] } },
          bookingConfirmed: { $sum: { $cond: ["$bookingConfirmed", 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);
    
    // Monthly trend (last 12 months)
    const monthlyTrend = await FlightReview.aggregate([
      { 
        $match: {
          ...filter,
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    // Top airlines by rating
    const topAirlines = await FlightReview.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$airlineId",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gte: 5 } } }, // at least 5 reviews
      { $sort: { avgRating: -1 } },
      { $limit: 10 }
    ]);
    
    // Most helpful reviews
    const mostHelpful = await FlightReview.find(filter)
      .sort({ helpfulVotes: -1 })
      .limit(5)
      .populate('reviewer', 'name profileImage')
      .lean();
    
    // Recent trends
    const recentTrend = await FlightReview.aggregate([
      { 
        $match: {
          ...filter,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$createdAt" },
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" }
          },
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);
    
    const analytics = {
      overview: {
        totalReviews,
        averageRating: averageRating[0]?.avgRating || 0,
        verificationRate: verificationStats[0] ? 
          (verificationStats[0].verified / verificationStats[0].total) * 100 : 0
      },
      ratingDistribution: ratingDistribution.map(item => ({
        rating: item._id,
        count: item.count
      })),
      categoryAverages: categoryAverages[0] || {},
      distributions: {
        tripType: tripTypeDistribution,
        travelClass: travelClassDistribution,
        sentiment: sentimentDistribution
      },
      trends: {
        monthly: monthlyTrend,
        recent: recentTrend
      },
      topPerformers: {
        airlines: topAirlines,
        helpfulReviews: mostHelpful
      }
    };
    
    return NextResponse.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    console.error('Error fetching review analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}