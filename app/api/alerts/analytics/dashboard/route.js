import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  getAlertAnalyticsService, 
  getAlertSuccessMetrics,
  getNotificationDeliveryTracking 
} from "@/lib/services";

/**
 * GET /api/alerts/analytics/dashboard
 * Get dashboard analytics data
 */
export async function GET(request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "7d";
    const refresh = searchParams.get("refresh") === "true";

    // Get analytics services
    const analyticsService = getAlertAnalyticsService();
    const successMetrics = getAlertSuccessMetrics();
    const deliveryTracking = getNotificationDeliveryTracking();

    // Get dashboard metrics
    const [
      alertSummary,
      successScores,
      deliveryMetrics,
      recentActivity,
      topPerformers
    ] = await Promise.all([
      analyticsService.getAlertSummary(timeRange),
      successMetrics.calculateSuccessMetrics({ timeRange }),
      deliveryTracking.getDeliveryMetrics(),
      analyticsService.getRecentActivity(10),
      analyticsService.getTopPerformingAlerts(5, timeRange)
    ]);

    // Get chart data
    const [
      timeSeriesData,
      distributionData,
      performanceData
    ] = await Promise.all([
      analyticsService.getTimeSeriesData(timeRange),
      analyticsService.getDistributionData(timeRange),
      analyticsService.getPerformanceData(timeRange)
    ]);

    // Get KPIs
    const kpis = {
      totalAlerts: alertSummary.total,
      activeAlerts: alertSummary.active,
      triggeredAlerts: alertSummary.triggered,
      successRate: successScores.successScores.overall,
      deliveryRate: deliveryMetrics.deliveryRate,
      averageResponseTime: deliveryMetrics.averageResponseTime,
      totalSavings: successScores.financialImpact.totalSavings,
      roi: successScores.financialImpact.roi
    };

    // Get alerts by status
    const alertsByStatus = {
      active: alertSummary.active,
      triggered: alertSummary.triggered,
      expired: alertSummary.expired,
      paused: alertSummary.paused
    };

    // Get alerts by type
    const alertsByType = alertSummary.byType;

    // Get recent trends
    const recentTrends = await analyticsService.getRecentTrends(timeRange);

    return NextResponse.json({
      success: true,
      timeRange,
      lastUpdated: new Date(),
      kpis,
      alertsByStatus,
      alertsByType,
      successScores: successScores.successScores,
      deliveryMetrics,
      recentActivity,
      topPerformers,
      chartData: {
        timeSeries: timeSeriesData,
        distribution: distributionData,
        performance: performanceData
      },
      recentTrends,
      recommendations: successScores.recommendations.slice(0, 3)
    });
  } catch (error) {
    console.error("Error in dashboard analytics API:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch dashboard analytics",
        details: error.message 
      },
      { status: 500 }
    );
  }
}