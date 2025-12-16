import { auth } from "@/lib/auth";
import { getManyDocs, getOneDoc } from "@/lib/db/getOperationDB";
import { strToObjectId } from "@/lib/db/utilsDB";
import { z } from "zod";

// Validation schema for analytics request
const analyticsSchema = z.object({
  period: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).default("monthly"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  airlineId: z.string().optional(),
  modificationType: z.enum(["date_change", "passenger_update", "seat_change", "baggage_change", "meal_change", "class_upgrade"]).optional()
});

/**
 * GET /api/flight-modifications/analytics
 * Get modification analytics and insights
 */
export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return Response.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const validation = analyticsSchema.safeParse({
      period: searchParams.get('period') || 'monthly',
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      airlineId: searchParams.get('airlineId'),
      modificationType: searchParams.get('modificationType')
    });

    if (!validation.success) {
      return Response.json({
        success: false,
        message: "Invalid request parameters",
        errors: validation.error.errors
      }, { status: 400 });
    }

    const { period, startDate, endDate, airlineId, modificationType } = validation.data;

    // Calculate date range based on period
    const now = new Date();
    let calculatedStartDate, calculatedEndDate;

    if (startDate && endDate) {
      calculatedStartDate = new Date(startDate);
      calculatedEndDate = new Date(endDate);
    } else {
      calculatedEndDate = now;
      
      switch (period) {
        case 'daily':
          calculatedStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          calculatedStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          calculatedStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarterly':
          calculatedStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'yearly':
          calculatedStartDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    // Build query filter
    const filter = {
      requestedAt: {
        $gte: calculatedStartDate,
        $lte: calculatedEndDate
      }
    };

    if (airlineId) {
      // This would need to join with booking and itinerary to filter by airline
      // For now, we'll skip airline filtering in the basic implementation
    }

    if (modificationType) {
      filter["modifications.type"] = modificationType;
    }

    // Get modification data
    const modifications = await getManyDocs("FlightBookingModification", filter);

    // Calculate analytics
    const analytics = await calculateModificationAnalytics(modifications, period, calculatedStartDate, calculatedEndDate);

    return Response.json({
      success: true,
      data: analytics,
      period: {
        type: period,
        startDate: calculatedStartDate,
        endDate: calculatedEndDate
      },
      message: "Analytics retrieved successfully"
    });

  } catch (error) {
    console.error('Error getting modification analytics:', error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Calculate modification analytics from raw data
 * @param {Array} modifications - Modification data
 * @param {string} period - Analytics period
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Calculated analytics
 */
async function calculateModificationAnalytics(modifications, period, startDate, endDate) {
  const totalRequests = modifications.length;
  const completedRequests = modifications.filter(m => m.status === 'completed').length;
  const failedRequests = modifications.filter(m => m.status === 'failed').length;
  const cancelledRequests = modifications.filter(m => m.status === 'cancelled').length;
  const pendingRequests = modifications.filter(m => m.status === 'requested' || m.status === 'pending_approval').length;

  const overallSuccessRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

  // Financial metrics
  const totalRevenueFromFees = modifications.reduce((sum, m) => sum + (m.totalAdditionalCost || 0), 0);
  const totalRefundAmount = modifications.reduce((sum, m) => sum + (m.totalRefundAmount || 0), 0);
  const averageModificationFee = totalRequests > 0 ? totalRevenueFromFees / totalRequests : 0;

  // Processing time metrics
  const completedModifications = modifications.filter(m => m.status === 'completed' && m.processedAt);
  const processingTimes = completedModifications.map(m => {
    const requestedTime = new Date(m.requestedAt);
    const processedTime = new Date(m.processedAt);
    return (processedTime - requestedTime) / (1000 * 60 * 60); // Convert to hours
  });

  const averageProcessingTime = processingTimes.length > 0 ? 
    processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length : 0;

  // Modification type analytics
  const modificationTypeStats = {};
  modifications.forEach(modification => {
    modification.modifications.forEach(mod => {
      const type = mod.type;
      if (!modificationTypeStats[type]) {
        modificationTypeStats[type] = {
          total: 0,
          completed: 0,
          failed: 0,
          revenue: 0
        };
      }
      modificationTypeStats[type].total++;
      if (modification.status === 'completed') {
        modificationTypeStats[type].completed++;
      }
      if (modification.status === 'failed') {
        modificationTypeStats[type].failed++;
      }
      modificationTypeStats[type].revenue += modification.totalAdditionalCost || 0;
    });
  });

  // Time-based analytics
  const hourlyDistribution = Array(24).fill(0);
  const dailyDistribution = Array(7).fill(0);
  const monthlyDistribution = Array(12).fill(0);

  modifications.forEach(modification => {
    const requestDate = new Date(modification.requestedAt);
    hourlyDistribution[requestDate.getHours()]++;
    dailyDistribution[requestDate.getDay()]++;
    monthlyDistribution[requestDate.getMonth()]++;
  });

  // Recent trends (last 7 days)
  const recentTrends = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const dayModifications = modifications.filter(m => {
      const requestDate = new Date(m.requestedAt);
      return requestDate >= dayStart && requestDate <= dayEnd;
    });

    recentTrends.push({
      date: dayStart.toISOString().split('T')[0],
      requests: dayModifications.length,
      completed: dayModifications.filter(m => m.status === 'completed').length,
      revenue: dayModifications.reduce((sum, m) => sum + (m.totalAdditionalCost || 0), 0)
    });
  }

  return {
    overview: {
      totalRequests,
      completedRequests,
      failedRequests,
      cancelledRequests,
      pendingRequests,
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100
    },
    financial: {
      totalRevenueFromFees: Math.round(totalRevenueFromFees * 100) / 100,
      totalRefundAmount: Math.round(totalRefundAmount * 100) / 100,
      averageModificationFee: Math.round(averageModificationFee * 100) / 100,
      netRevenue: Math.round((totalRevenueFromFees - totalRefundAmount) * 100) / 100
    },
    processing: {
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      fastestProcessingTime: processingTimes.length > 0 ? Math.min(...processingTimes) : 0,
      slowestProcessingTime: processingTimes.length > 0 ? Math.max(...processingTimes) : 0
    },
    modificationTypes: Object.entries(modificationTypeStats).map(([type, stats]) => ({
      type,
      total: stats.total,
      completed: stats.completed,
      failed: stats.failed,
      successRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 10000) / 100 : 0,
      revenue: Math.round(stats.revenue * 100) / 100
    })),
    timeDistribution: {
      hourly: hourlyDistribution,
      daily: dailyDistribution,
      monthly: monthlyDistribution
    },
    recentTrends,
    insights: generateInsights({
      totalRequests,
      overallSuccessRate,
      averageProcessingTime,
      totalRevenueFromFees,
      modificationTypeStats
    })
  };
}

/**
 * Generate insights from analytics data
 * @param {Object} data - Analytics data
 * @returns {Array} Generated insights
 */
function generateInsights(data) {
  const insights = [];

  // Success rate insights
  if (data.overallSuccessRate < 80) {
    insights.push({
      type: "warning",
      title: "Low Success Rate",
      description: `Modification success rate is ${data.overallSuccessRate}%, which is below the recommended 80% threshold.`
    });
  }

  // Processing time insights
  if (data.averageProcessingTime > 24) {
    insights.push({
      type: "warning",
      title: "Slow Processing",
      description: `Average processing time is ${data.averageProcessingTime} hours, which may impact customer satisfaction.`
    });
  }

  // Volume insights
  if (data.totalRequests > 100) {
    insights.push({
      type: "info",
      title: "High Modification Volume",
      description: `${data.totalRequests} modification requests processed in this period. Consider automation for efficiency.`
    });
  }

  // Revenue insights
  if (data.totalRevenueFromFees > 1000) {
    insights.push({
      type: "success",
      title: "Strong Revenue from Modifications",
      description: `$${data.totalRevenueFromFees} generated from modification fees in this period.`
    });
  }

  return insights;
}