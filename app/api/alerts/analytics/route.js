import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  getAlertAnalyticsService, 
  getAlertSuccessMetrics,
  getNotificationDeliveryTracking 
} from "@/lib/services";

/**
 * GET /api/alerts/analytics
 * Get comprehensive alert analytics and metrics
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
    const timeRange = searchParams.get("timeRange") || "30d";
    const alertTypes = searchParams.get("alertTypes")?.split(",") || [];
    const includeSegmentation = searchParams.get("includeSegmentation") === "true";
    const includeTrends = searchParams.get("includeTrends") === "true";
    const includePredictions = searchParams.get("includePredictions") === "true";
    const reportType = searchParams.get("reportType");

    // Get analytics service
    const analyticsService = getAlertAnalyticsService();
    const successMetrics = getAlertSuccessMetrics();
    const deliveryTracking = getNotificationDeliveryTracking();

    let response = {};

    // Get alert analytics
    if (!reportType || reportType === "general") {
      const alertAnalytics = await analyticsService.getAlertAnalytics({
        timeRange,
        alertTypes,
        includeSegmentation,
        includeTrends
      });
      response.alertAnalytics = alertAnalytics;
    }

    // Get success metrics
    if (!reportType || reportType === "success") {
      const successMetricsData = await successMetrics.calculateSuccessMetrics({
        timeRange,
        alertTypes,
        includeSegmentation,
        includeTrends,
        includePredictions
      });
      response.successMetrics = successMetricsData;
    }

    // Get delivery analytics
    if (!reportType || reportType === "delivery") {
      const deliveryAnalytics = await deliveryTracking.getDeliveryAnalytics({
        timeRange,
        includeEngagement: true,
        includePatterns: true
      });
      response.deliveryAnalytics = deliveryAnalytics;
    }

    // Get automated report
    if (reportType && ["daily", "weekly", "monthly"].includes(reportType)) {
      const report = await successMetrics.generateAutomatedReport(reportType);
      response.automatedReport = report;
    }

    return NextResponse.json({
      success: true,
      timeRange,
      generatedAt: new Date(),
      ...response
    });
  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch analytics data",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts/analytics
 * Generate custom analytics report
 */
export async function POST(request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      reportName,
      timeRange = "30d",
      alertTypes = [],
      filters = {},
      includeCharts = true,
      format = "json"
    } = body;

    // Validate required fields
    if (!reportName) {
      return NextResponse.json(
        { error: "Report name is required" },
        { status: 400 }
      );
    }

    // Get analytics services
    const successMetrics = getAlertSuccessMetrics();
    const deliveryTracking = getNotificationDeliveryTracking();

    // Generate comprehensive report
    const reportData = await successMetrics.calculateSuccessMetrics({
      timeRange,
      alertTypes,
      includeSegmentation: true,
      includeTrends: true,
      includePredictions: true
    });

    const deliveryData = await deliveryTracking.getDeliveryAnalytics({
      timeRange,
      includeEngagement: true,
      includePatterns: true
    });

    // Create custom report
    const customReport = {
      reportName,
      generatedAt: new Date(),
      timeRange,
      filters,
      summary: {
        totalAlerts: reportData.totalAlerts,
        overallSuccessScore: reportData.successScores.overall,
        successGrade: reportData.successScores.grade,
        totalSavings: reportData.financialImpact.totalSavings,
        roi: reportData.financialImpact.roi,
        deliveryRate: deliveryData.overall.deliveryRate
      },
      details: {
        successMetrics: reportData,
        deliveryAnalytics: deliveryData
      }
    };

    // Store custom report
    const { createDoc } = await import("@/lib/db/operations");
    await createDoc("CustomAnalyticsReport", {
      userId: session.user.id,
      reportName,
      timeRange,
      filters,
      reportData: customReport,
      createdAt: new Date()
    });

    return NextResponse.json({
      success: true,
      report: customReport,
      message: "Custom report generated successfully"
    });
  } catch (error) {
    console.error("Error generating custom report:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate custom report",
        details: error.message 
      },
      { status: 500 }
    );
  }
}