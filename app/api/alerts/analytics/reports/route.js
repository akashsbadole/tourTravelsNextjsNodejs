import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAlertSuccessMetrics } from "@/lib/services";

/**
 * GET /api/alerts/analytics/reports
 * Get list of available reports
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
    const reportType = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit")) || 20;
    const offset = parseInt(searchParams.get("offset")) || 0;

    // Get reports from database
    const { getManyDocs } = await import("@/lib/db/operations");
    
    let query = {};
    if (reportType) {
      query.type = reportType;
    }

    const reports = await getManyDocs("AlertSuccessReport", query, [], {
      sort: { generatedAt: -1 },
      limit,
      offset
    });

    // Get custom reports
    const customReports = await getManyDocs("CustomAnalyticsReport", {
      userId: session.user.id
    }, [], {
      sort: { createdAt: -1 },
      limit: Math.floor(limit / 2),
      offset: Math.floor(offset / 2)
    });

    return NextResponse.json({
      success: true,
      reports: {
        automated: reports,
        custom: customReports
      },
      pagination: {
        limit,
        offset,
        total: reports.length + customReports.length
      }
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch reports",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts/analytics/reports
 * Generate and save a new report
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
      reportType,
      timeRange = "30d",
      alertTypes = [],
      filters = {},
      includeCharts = true,
      format = "json",
      schedule = null
    } = body;

    // Validate required fields
    if (!reportType) {
      return NextResponse.json(
        { error: "Report type is required" },
        { status: 400 }
      );
    }

    // Get success metrics service
    const successMetrics = getAlertSuccessMetrics();

    // Generate report based on type
    let report;
    switch (reportType) {
      case "daily":
      case "weekly":
      case "monthly":
        report = await successMetrics.generateAutomatedReport(reportType);
        break;
      case "custom":
        report = await successMetrics.calculateSuccessMetrics({
          timeRange,
          alertTypes,
          includeSegmentation: true,
          includeTrends: true,
          includePredictions: true
        });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        );
    }

    // Save report to database
    const { createDoc } = await import("@/lib/db/operations");
    const savedReport = await createDoc("AlertSuccessReport", {
      type: reportType,
      userId: session.user.id,
      timeRange,
      alertTypes,
      filters,
      reportData: report,
      format,
      scheduled: schedule,
      generatedAt: new Date()
    });

    // If schedule is provided, create scheduled report
    if (schedule) {
      await createDoc("ScheduledReport", {
        userId: session.user.id,
        reportType,
        timeRange,
        alertTypes,
        filters,
        schedule,
        nextRun: scheduleNextRun(schedule),
        isActive: true,
        createdAt: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      report: {
        id: savedReport.insertedId,
        type: reportType,
        timeRange,
        generatedAt: new Date(),
        data: report
      },
      message: "Report generated successfully"
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate report",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate next run time for scheduled report
 * @param {Object} schedule - Schedule configuration
 * @returns {Date} Next run time
 */
function scheduleNextRun(schedule) {
  const now = new Date();
  const nextRun = new Date(now);

  switch (schedule.frequency) {
    case "daily":
      nextRun.setDate(now.getDate() + 1);
      nextRun.setHours(schedule.hour || 9, 0, 0, 0);
      break;
    case "weekly":
      nextRun.setDate(now.getDate() + (7 - now.getDay() + (schedule.dayOfWeek || 1)) % 7);
      nextRun.setHours(schedule.hour || 9, 0, 0, 0);
      break;
    case "monthly":
      nextRun.setMonth(now.getMonth() + 1);
      nextRun.setDate(schedule.dayOfMonth || 1);
      nextRun.setHours(schedule.hour || 9, 0, 0, 0);
      break;
    default:
      nextRun.setDate(now.getDate() + 1);
  }

  return nextRun;
}