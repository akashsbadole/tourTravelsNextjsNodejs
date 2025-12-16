import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getManyDocs } from "@/lib/db/operations";
import { PriceAlert } from "@/lib/db/models";

// Validation schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  status: z.enum(["active", "paused", "expired", "triggered", "cancelled"]).optional(),
  tripType: z.enum(["oneway", "roundtrip", "multicity"]).optional(),
  sortBy: z.enum(["createdAt", "lastTriggeredAt", "triggerCount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * GET /api/price-alerts/history - Get price alert history
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const validatedParams = queryParamsSchema.parse(Object.fromEntries(searchParams));

    const query = {
      userId: session.user.id,
    };

    // Add optional filters
    if (validatedParams.status) {
      query.status = validatedParams.status;
    }

    if (validatedParams.tripType) {
      query["searchCriteria.tripType"] = validatedParams.tripType;
    }

    // Calculate date range filter
    const now = new Date();
    let dateFilter = {};
    
    switch (validatedParams.timeRange) {
      case "24h":
        dateFilter = {
          $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          $lte: now
        };
        break;
      case "7d":
        dateFilter = {
          $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          $lte: now
        };
        break;
      case "30d":
        dateFilter = {
          $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          $lte: now
        };
        break;
      case "90d":
        dateFilter = {
          $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          $lte: now
        };
        break;
    }

    // Apply date filter to relevant fields
    if (Object.keys(dateFilter).length > 0) {
      query.$or = [
        { createdAt: dateFilter },
        { lastTriggeredAt: dateFilter }
      ];
    }

    const sort = {};
    sort[validatedParams.sortBy] = validatedParams.sortOrder === "desc" ? -1 : 1;

    const skip = (validatedParams.page - 1) * validatedParams.limit;

    const alerts = await getManyDocs(
      "PriceAlert",
      query,
      ["user"],
      300, // 5 minute cache
      {
        sort,
        skip,
        limit: validatedParams.limit,
      }
    );

    // Process alerts to add computed fields
    const processedAlerts = alerts.map(alert => {
      const processedAlert = { ...alert };
      
      // Calculate time remaining
      if (alert.expiresAt) {
        const timeDiff = new Date(alert.expiresAt) - now;
        if (timeDiff > 0) {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          
          processedAlert.timeRemaining = `${days}d ${hours}h ${minutes}m`;
          processedAlert.expiresSoon = days <= 3;
        } else {
          processedAlert.timeRemaining = "Expired";
          processedAlert.expiresSoon = false;
        }
      }
      
      // Calculate savings if available
      if (alert.currentBestPrice && alert.referencePrice) {
        const savings = alert.referencePrice.amount - alert.currentBestPrice.amount;
        if (savings > 0) {
          processedAlert.totalSavings = savings;
          processedAlert.savingsPercentage = ((savings / alert.referencePrice.amount) * 100).toFixed(1);
        }
      }
      
      // Get last triggered info
      if (alert.lastTriggeredAt && alert.notificationsSent && alert.notificationsSent.length > 0) {
        const lastNotification = alert.notificationsSent[alert.notificationsSent.length - 1];
        processedAlert.lastTriggered = alert.lastTriggeredAt;
        processedAlert.lastNotificationChannel = lastNotification.type;
        processedAlert.lastNotificationSuccess = lastNotification.success;
      }
      
      return processedAlert;
    });

    const total = await PriceAlert.countDocuments({ userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: processedAlerts,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        pages: Math.ceil(total / validatedParams.limit),
      },
      summary: {
        totalAlerts: total,
        activeAlerts: processedAlerts.filter(a => a.status === 'active').length,
        triggeredAlerts: processedAlerts.filter(a => a.status === 'triggered').length,
        totalSavings: processedAlerts.reduce((sum, a) => sum + (a.totalSavings || 0), 0),
      }
    });
  } catch (error) {
    console.error("Error fetching price alert history:", error);
    return NextResponse.json(
      { error: "Failed to fetch price alert history" },
      { status: 500 }
    );
  }
}