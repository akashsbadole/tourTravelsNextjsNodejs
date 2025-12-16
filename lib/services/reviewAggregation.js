import { FlightReview } from "@/lib/db/models";
import { getManyDocs } from "../db/getOperationDB";

// Aggregation time periods
export const AGGREGATION_PERIODS = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
};

// Create aggregation tables for airline performance
export async function createAirlinePerformanceAggregation(airlineId, period = AGGREGATION_PERIODS.MONTHLY) {
  try {
    const matchStage = {
      airlineId,
      status: 'published'
    };

    // Date grouping based on period
    let groupStage;
    let projectStage;
    
    switch (period) {
      case AGGREGATION_PERIODS.HOURLY:
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            hour: { $hour: '$createdAt' }
          }
        };
        break;
      
      case AGGREGATION_PERIODS.DAILY:
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          }
        };
        break;
      
      case AGGREGATION_PERIODS.WEEKLY:
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          }
        };
        break;
      
      case AGGREGATION_PERIODS.MONTHLY:
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          }
        };
        break;
      
      case AGGREGATION_PERIODS.QUARTERLY:
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            quarter: { $cond: [{ $eq: [{ $month: '$createdAt' }, [1, 2, 3]] }, 1,
                     { $eq: [{ $month: '$createdAt' }, [4, 5, 6]] }, 2,
                     { $eq: [{ $month: '$createdAt' }, [7, 8, 9]] }, 3,
                     { $eq: [{ $month: '$createdAt' }, [10, 11, 12]] }, 4] }
          }
        };
        break;
      
      case AGGREGATION_PERIODS.YEARLY:
        groupStage = {
          _id: {
            year: { $year: '$createdAt' }
          }
        };
        break;
      
      default:
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          }
        };
    }

    projectStage = {
      _id: 0,
      airlineId: '$_id.airlineId',
      period: '$_id',
      totalReviews: { $sum: 1 },
      averageRating: { $avg: '$rating' },
      ratingDistribution: {
        $push: {
          rating: '$rating',
          count: 1
        }
      },
      categoryAverages: {
        avgComfort: { $avg: '$categoryRatings.comfort' },
        avgService: { $avg: '$categoryRatings.service' },
        avgFood: { $avg: '$categoryRatings.food' },
        avgPunctuality: { $avg: '$categoryRatings.punctuality' },
        avgCleanliness: { $avg: '$categoryRatings.cleanliness' },
        avgAmenities: { $avg: '$categoryRatings.amenities' },
        avgValue: { $avg: '$categoryRatings.value' }
      },
      sentimentDistribution: {
        $push: '$sentiment'
      },
      verificationStats: {
        verified: { $sum: { $cond: ['$verified', 1, 0] } },
        bookingConfirmed: { $sum: { $cond: ['$bookingConfirmed', 1, 0] } },
        total: { $sum: 1 }
      },
      helpfulnessStats: {
        totalHelpfulVotes: { $sum: { $size: '$helpfulVotes' } },
        totalNotHelpfulVotes: { $sum: { $size: '$notHelpfulVotes' } },
        totalVotes: { $sum: { $add: [{ $size: '$helpfulVotes' }, { $size: '$notHelpfulVotes' }] }
      },
      dateRange: {
        minDate: { $min: '$createdAt' },
        maxDate: { $max: '$createdAt' }
      }
    };

    const aggregation = await FlightReview.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $project: projectStage },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return aggregation;
  } catch (error) {
    console.error('Error creating airline performance aggregation:', error);
    throw error;
  }
}

// Create route performance aggregation
export async function createRoutePerformanceAggregation(
  departureAirportId,
  arrivalAirportId,
  period = AGGREGATION_PERIODS.MONTHLY
) {
  try {
    const aggregation = await FlightReview.aggregate([
      {
        $match: {
          departureAirportId,
          arrivalAirportId,
          status: 'published'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          }
        }
      },
      {
        $project: {
          _id: 0,
          departureAirportId: '$departureAirportId',
          arrivalAirportId: '$arrivalAirportId',
          period: '$_id',
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          averageTicketPrice: { $avg: '$ticketPrice' },
          topAirlines: {
            $push: '$airlineId'
          },
          sentimentScore: { $avg: '$sentimentScore' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return aggregation;
  } catch (error) {
    console.error('Error creating route performance aggregation:', error);
    throw error;
  }
}

// Create global review trends aggregation
export async function createGlobalReviewTrends(period = AGGREGATION_PERIODS.DAILY) {
  try {
    const aggregation = await FlightReview.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          }
        }
      },
      {
        $project: {
          _id: 0,
          period: '$_id',
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          averageSentiment: { $avg: '$sentimentScore' },
          uniqueReviewers: { $addToSet: '$reviewer' },
          uniqueAirlines: { $addToSet: '$airlineId' },
          uniqueRoutes: { $addToSet: { departure: '$departureAirportId', arrival: '$arrivalAirportId' } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return aggregation;
  } catch (error) {
    console.error('Error creating global review trends:', error);
    throw error;
  }
}

// Get airline performance comparison
export async function getAirlinePerformanceComparison(airlineIds = [], period = AGGREGATION_PERIODS.MONTHLY) {
  try {
    const matchStage = {
      status: 'published'
    };

    if (airlineIds.length > 0) {
      matchStage.airlineId = { $in: airlineIds };
    }

    const comparison = await FlightReview.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$airlineId',
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          },
          categoryAverages: {
            avgComfort: { $avg: '$categoryRatings.comfort' },
            avgService: { $avg: '$categoryRatings.service' },
            avgFood: { $avg: '$categoryRatings.food' },
            avgPunctuality: { $avg: '$categoryRatings.punctuality' },
            avgCleanliness: { $avg: '$categoryRatings.cleanliness' },
            avgAmenities: { $avg: '$categoryRatings.amenities' },
            avgValue: { $avg: '$categoryRatings.value' }
          },
          sentimentScore: { $avg: '$sentimentScore' },
          helpfulnessScore: {
            $avg: {
              $divide: [
                { $sum: { $size: '$helpfulVotes' } },
                { $add: [{ $sum: { $size: '$helpfulVotes' } }, { $sum: { $size: '$notHelpfulVotes' }] }
              ]
            }
          }
        }
      },
      {
        $project: {
          airlineId: '$_id',
          totalReviews: 1,
          averageRating: 1,
          categoryAverages: 1,
          sentimentScore: 1,
          helpfulnessScore: 1,
          ratingPercentiles: {
            $filter: {
              input: '$ratingDistribution',
              as: 'ratings',
              cond: { $gte: ['$$ratings', 4] }
            }
          }
        }
      },
      { $sort: { averageRating: -1 } }
    ]);

    return comparison;
  } catch (error) {
    console.error('Error getting airline performance comparison:', error);
    throw error;
  }
}

// Create real-time aggregation cache
export async function cacheReviewAggregations() {
  try {
    const cacheKeys = [];
    
    // Cache airline performance for top airlines
    const topAirlines = await FlightReview.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$airlineId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    for (const airline of topAirlines) {
      const aggregation = await createAirlinePerformanceAggregation(
        airline._id,
        AGGREGATION_PERIODS.DAILY
      );
      
      // Store in cache (Redis/Memory cache would be used in production)
      cacheKeys.push(`airline_performance_${airline._id}_daily`);
    }

    // Cache route performance for popular routes
    const popularRoutes = await FlightReview.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: {
            departure: '$departureAirportId',
            arrival: '$arrivalAirportId'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    for (const route of popularRoutes) {
      const aggregation = await createRoutePerformanceAggregation(
        route._id.departure,
        route._id.arrival,
        AGGREGATION_PERIODS.DAILY
      );
      
      cacheKeys.push(`route_performance_${route._id.departure}_${route._id.arrival}_daily`);
    }

    // Cache global trends
    const globalTrends = await createGlobalReviewTrends(AGGREGATION_PERIODS.HOURLY);
    cacheKeys.push('global_review_trends_hourly');

    return {
      success: true,
      cachedKeys: cacheKeys,
      message: `Cached ${cacheKeys.length} aggregation tables`
    };
  } catch (error) {
    console.error('Error caching review aggregations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get cached aggregation data
export async function getCachedAggregation(cacheKey) {
  // In production, this would query Redis or another caching system
  // For now, we'll return null to indicate no cache
  return null;
}

// Set cached aggregation data
export async function setCachedAggregation(cacheKey, data, ttl = 3600) {
  // In production, this would store in Redis with TTL
  // For now, we'll just log it
  console.log(`Caching ${cacheKey} with TTL ${ttl}s`);
  return true;
}

// Get performance insights
export async function getPerformanceInsights(airlineId, timeRange = '30days') {
  try {
    const endDate = new Date();
    let startDate;

    switch (timeRange) {
      case '7days':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1year':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const insights = await FlightReview.aggregate([
      {
        $match: {
          airlineId,
          status: 'published',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingTrend: {
            $push: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              rating: '$rating'
            }
          },
          categoryPerformance: {
            avgComfort: { $avg: '$categoryRatings.comfort' },
            avgService: { $avg: '$categoryRatings.service' },
            avgFood: { $avg: '$categoryRatings.food' },
            avgPunctuality: { $avg: '$categoryRatings.punctuality' },
            avgCleanliness: { $avg: '$categoryRatings.cleanliness' },
            avgAmenities: { $avg: '$categoryRatings.amenities' },
            avgValue: { $avg: '$categoryRatings.value' }
          },
          sentimentTrend: {
            $push: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              sentiment: '$sentiment',
              score: '$sentimentScore'
            }
          },
          topIssues: {
            $push: {
              $filter: {
                input: '$cons',
                as: 'con',
                cond: { $ne: ['$$con', null, ''] }
              }
            }
          },
          topPraises: {
            $push: {
              $filter: {
                input: '$pros',
                as: 'pro',
                cond: { $ne: ['$$pro', null, ''] }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalReviews: 1,
          averageRating: 1,
          categoryPerformance: 1,
          ratingTrend: 1,
          sentimentTrend: 1,
          topIssues: 1,
          topPraises: 1,
          improvementAreas: {
            $filter: {
              input: '$categoryPerformance',
              as: 'category',
              cond: { $lt: ['$$category', 3.5] }
            }
          },
          strengthAreas: {
            $filter: {
              input: '$categoryPerformance',
              as: 'category',
              cond: { $gte: ['$$category', 4.0] }
            }
          }
        }
      }
    ]);

    return insights[0] || {
      totalReviews: 0,
      averageRating: 0,
      categoryPerformance: {},
      ratingTrend: [],
      sentimentTrend: [],
      topIssues: [],
      topPraises: [],
      improvementAreas: [],
      strengthAreas: []
    };
  } catch (error) {
    console.error('Error getting performance insights:', error);
    throw error;
  }
}

// Batch create aggregations for multiple entities
export async function batchCreateAggregations(entities, entityType = 'airline') {
  const results = [];
  
  for (const entity of entities) {
    try {
      let aggregation;
      
      switch (entityType) {
        case 'airline':
          aggregation = await createAirlinePerformanceAggregation(entity.id);
          break;
        case 'route':
          aggregation = await createRoutePerformanceAggregation(entity.departure, entity.arrival);
          break;
        default:
          aggregation = null;
      }
      
      results.push({
        entity,
        aggregation,
        success: !!aggregation
      });
    } catch (error) {
      results.push({
        entity,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}