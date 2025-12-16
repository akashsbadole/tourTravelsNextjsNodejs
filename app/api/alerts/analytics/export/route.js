import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  getAlertAnalyticsService, 
  getAlertSuccessMetrics,
  getNotificationDeliveryTracking 
} from "@/lib/services";

/**
 * POST /api/alerts/analytics/export
 * Export analytics data in various formats
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
      exportType = "analytics", // analytics, reports, alerts, delivery
      format = "json", // json, csv, xlsx, pdf
      timeRange = "30d",
      alertTypes = [],
      filters = {},
      includeCharts = false,
      emailReport = false,
      emailRecipients = []
    } = body;

    // Get analytics services
    const analyticsService = getAlertAnalyticsService();
    const successMetrics = getAlertSuccessMetrics();
    const deliveryTracking = getNotificationDeliveryTracking();

    let exportData;

    // Get data based on export type
    switch (exportType) {
      case "analytics":
        exportData = await successMetrics.calculateSuccessMetrics({
          timeRange,
          alertTypes,
          includeSegmentation: true,
          includeTrends: true,
          includePredictions: true
        });
        break;
      case "reports":
        const { getManyDocs } = await import("@/lib/db/operations");
        exportData = await getManyDocs("AlertSuccessReport", {
          generatedAt: { $gte: calculateTimeCutoff(timeRange) }
        }, [], { sort: { generatedAt: -1 } });
        break;
      case "alerts":
        exportData = await analyticsService.getAlertAnalytics({
          timeRange,
          alertTypes,
          includeSegmentation: true,
          includeTrends: true
        });
        break;
      case "delivery":
        exportData = await deliveryTracking.getDeliveryAnalytics({
          timeRange,
          includeEngagement: true,
          includePatterns: true
        });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid export type" },
          { status: 400 }
        );
    }

    // Format data based on requested format
    let formattedData;
    let contentType;
    let filename;

    switch (format) {
      case "json":
        formattedData = JSON.stringify(exportData, null, 2);
        contentType = "application/json";
        filename = `alert-${exportType}-${timeRange}-${Date.now()}.json`;
        break;
      case "csv":
        formattedData = convertToCSV(exportData, exportType);
        contentType = "text/csv";
        filename = `alert-${exportType}-${timeRange}-${Date.now()}.csv`;
        break;
      case "xlsx":
        // For Excel export, we'd need a library like xlsx
        // For now, return JSON as placeholder
        formattedData = JSON.stringify(exportData, null, 2);
        contentType = "application/json";
        filename = `alert-${exportType}-${timeRange}-${Date.now()}.json`;
        break;
      case "pdf":
        // For PDF export, we'd need a library like puppeteer
        // For now, return JSON as placeholder
        formattedData = JSON.stringify(exportData, null, 2);
        contentType = "application/json";
        filename = `alert-${exportType}-${timeRange}-${Date.now()}.json`;
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported export format" },
          { status: 400 }
        );
    }

    // Save export record
    const { createDoc } = await import("@/lib/db/operations");
    await createDoc("AnalyticsExport", {
      userId: session.user.id,
      exportType,
      format,
      timeRange,
      alertTypes,
      filters,
      filename,
      exportedAt: new Date(),
      recordCount: Array.isArray(exportData) ? exportData.length : 1
    });

    // Email report if requested
    if (emailReport && emailRecipients.length > 0) {
      await emailExportReport(formattedData, filename, emailRecipients, exportType);
    }

    // Return the export
    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: exportData,
        filename,
        exportedAt: new Date(),
        recordCount: Array.isArray(exportData) ? exportData.length : 1
      });
    } else {
      // For non-JSON formats, return as file download
      return new NextResponse(formattedData, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }
  } catch (error) {
    console.error("Error exporting analytics:", error);
    return NextResponse.json(
      { 
        error: "Failed to export analytics data",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Convert data to CSV format
 * @param {Object|Array} data - Data to convert
 * @param {string} exportType - Type of export
 * @returns {string} CSV string
 */
function convertToCSV(data, exportType) {
  if (!data) return "";

  // Handle different export types
  switch (exportType) {
    case "analytics":
      return convertAnalyticsToCSV(data);
    case "reports":
      return convertReportsToCSV(data);
    case "alerts":
      return convertAlertsToCSV(data);
    case "delivery":
      return convertDeliveryToCSV(data);
    default:
      return convertGenericToCSV(data);
  }
}

/**
 * Convert analytics data to CSV
 * @param {Object} analytics - Analytics data
 * @returns {string} CSV string
 */
function convertAnalyticsToCSV(analytics) {
  const rows = [];
  
  // Header
  rows.push("Metric,Value,Category");
  
  // Core metrics
  if (analytics.coreMetrics) {
    rows.push(`Total Alerts,${analytics.coreMetrics.total},Core`);
    rows.push(`Triggered Alerts,${analytics.coreMetrics.triggered},Core`);
    rows.push(`Delivered Alerts,${analytics.coreMetrics.delivered},Core`);
    rows.push(`Engaged Alerts,${analytics.coreMetrics.engaged},Core`);
    rows.push(`Converted Alerts,${analytics.coreMetrics.converted},Core`);
    rows.push(`Trigger Rate,${analytics.coreMetrics.triggerRate},Core`);
    rows.push(`Delivery Rate,${analytics.coreMetrics.deliveryRate},Core`);
    rows.push(`Engagement Rate,${analytics.coreMetrics.engagementRate},Core`);
    rows.push(`Conversion Rate,${analytics.coreMetrics.conversionRate},Core`);
  }
  
  // Success scores
  if (analytics.successScores) {
    rows.push(`Overall Success Score,${analytics.successScores.overall},Success`);
    rows.push(`Delivery Score,${analytics.successScores.delivery},Success`);
    rows.push(`Engagement Score,${analytics.successScores.engagement},Success`);
    rows.push(`Accuracy Score,${analytics.successScores.accuracy},Success`);
    rows.push(`Relevance Score,${analytics.successScores.relevance},Success`);
    rows.push(`Satisfaction Score,${analytics.successScores.satisfaction},Success`);
  }
  
  // Financial impact
  if (analytics.financialImpact) {
    rows.push(`Total Savings,${analytics.financialImpact.totalSavings},Financial`);
    rows.push(`Average Savings Per Alert,${analytics.financialImpact.averageSavingsPerAlert},Financial`);
    rows.push(`Total Revenue,${analytics.financialImpact.totalRevenue},Financial`);
    rows.push(`Average Revenue Per Alert,${analytics.financialImpact.averageRevenuePerAlert},Financial`);
    rows.push(`ROI,${analytics.financialImpact.roi},Financial`);
  }
  
  return rows.join("\n");
}

/**
 * Convert reports data to CSV
 * @param {Array} reports - Reports data
 * @returns {string} CSV string
 */
function convertReportsToCSV(reports) {
  if (!Array.isArray(reports) || reports.length === 0) {
    return "No reports found";
  }
  
  const rows = [];
  
  // Header
  rows.push("Report ID,Type,Generated At,Time Range,Total Alerts,Success Score,Grade,Savings,ROI");
  
  // Data rows
  for (const report of reports) {
    const generatedAt = new Date(report.generatedAt).toISOString();
    const summary = report.summary || {};
    
    rows.push(
      `${report._id || report.id},${report.type},${generatedAt},${report.timeRange},${summary.totalAlerts},${summary.overallSuccessScore},${summary.successGrade},${summary.totalSavings},${summary.roi}`
    );
  }
  
  return rows.join("\n");
}

/**
 * Convert alerts data to CSV
 * @param {Object} alerts - Alerts data
 * @returns {string} CSV string
 */
function convertAlertsToCSV(alerts) {
  const rows = [];
  
  // Header
  rows.push("Alert ID,Type,Status,Created At,Triggered At,Target Price,Current Price,Price Drop");
  
  // Data rows (if alerts array is available)
  if (alerts.alerts && Array.isArray(alerts.alerts)) {
    for (const alert of alerts.alerts) {
      const createdAt = new Date(alert.createdAt).toISOString();
      const triggeredAt = alert.triggeredAt ? new Date(alert.triggeredAt).toISOString() : "";
      
      rows.push(
        `${alert._id},${alert.type},${alert.status},${createdAt},${triggeredAt},${alert.targetPrice},${alert.currentPrice},${alert.priceDrop || ""}`
      );
    }
  } else {
    rows.push("No alert data available");
  }
  
  return rows.join("\n");
}

/**
 * Convert delivery data to CSV
 * @param {Object} delivery - Delivery data
 * @returns {string} CSV string
 */
function convertDeliveryToCSV(delivery) {
  const rows = [];
  
  // Header
  rows.push("Channel,Total,Successful,Failed,Delivery Rate,Average Response Time");
  
  // Channel breakdown
  if (delivery.channelAnalytics) {
    for (const [channel, analytics] of Object.entries(delivery.channelAnalytics)) {
      rows.push(
        `${channel},${analytics.total},${analytics.successful},${analytics.failed},${analytics.deliveryRate},${analytics.averageResponseTime}`
      );
    }
  }
  
  // Overall metrics
  if (delivery.overall) {
    rows.push(`Overall,${delivery.overall.totalNotifications},${delivery.overall.successfulDeliveries},${delivery.overall.failedDeliveries},${delivery.overall.deliveryRate || ""},${delivery.overall.averageDeliveryTime || ""}`);
  }
  
  return rows.join("\n");
}

/**
 * Convert generic data to CSV
 * @param {Object|Array} data - Data to convert
 * @returns {string} CSV string
 */
function convertGenericToCSV(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) return "No data available";
    
    // Use first object to determine headers
    const headers = Object.keys(data[0]);
    const rows = [headers.join(",")];
    
    for (const item of data) {
      const values = headers.map(header => {
        const value = item[header];
        return typeof value === "string" && value.includes(",") ? `"${value}"` : value;
      });
      rows.push(values.join(","));
    }
    
    return rows.join("\n");
  } else if (typeof data === "object") {
    const rows = ["Key,Value"];
    
    for (const [key, value] of Object.entries(data)) {
      const stringValue = typeof value === "string" && value.includes(",") ? `"${value}"` : value;
      rows.push(`${key},${stringValue}`);
    }
    
    return rows.join("\n");
  }
  
  return "No data available";
}

/**
 * Calculate time cutoff
 * @param {string} timeRange - Time range
 * @returns {Date} Cutoff date
 */
function calculateTimeCutoff(timeRange) {
  const now = new Date();
  const match = timeRange.match(/(\d+)([hd])/);
  
  if (!match) {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'h':
      return new Date(now.getTime() - value * 60 * 60 * 1000);
    case 'd':
      return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Email export report
 * @param {string} data - Export data
 * @param {string} filename - Filename
 * @param {Array} recipients - Email recipients
 * @param {string} exportType - Export type
 */
async function emailExportReport(data, filename, recipients, exportType) {
  try {
    // This would integrate with email service
    // For now, just log the email action
    console.log(`Emailing ${exportType} export ${filename} to ${recipients.join(", ")}`);
    
    // Store email record
    const { createDoc } = await import("@/lib/db/operations");
    await createDoc("ExportEmail", {
      filename,
      exportType,
      recipients,
      sentAt: new Date()
    });
  } catch (error) {
    console.error("Error emailing export report:", error);
  }
}