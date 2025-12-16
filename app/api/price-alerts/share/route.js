import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { 
  getOneDoc, 
  updateOneDoc, 
  createDoc 
} from "@/lib/db/operations";
import { PriceAlert } from "@/lib/db/models";
import { getSocialSharingService } from "@/lib/services/socialSharing";

// Validation schema for query parameters
const queryParamsSchema = z.object({
  code: z.string().min(6).max(10),
});

const shareRequestSchema = z.object({
  platforms: z.array(z.enum(["facebook", "twitter", "linkedin", "whatsapp", "email"])).min(1).max(5),
  message: z.string().max(500).optional(),
});

/**
 * GET /api/price-alerts/share - Get shared alert by code
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const { code } = queryParamsSchema.parse(Object.fromEntries(searchParams));

    const socialSharing = getSocialSharingService();
    const result = await socialSharing.getSharedAlert(code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Shared alert not found or expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching shared alert:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared alert" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/price-alerts/share - Share price alert
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { alertId, platforms, message } = shareRequestSchema.parse(body);

    // Get alert to share
    const alert = await getOneDoc("PriceAlert", {
      _id: alertId,
      userId: session.user.id,
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Price alert not found" },
        { status: 404 }
      );
    }

    // Check if user can share this alert
    if (alert.userId.toString() !== session.user.id.toString()) {
      return NextResponse.json(
        { error: "You can only share your own price alerts" },
        { status: 403 }
      );
    }

    const socialSharing = getSocialSharingService();
    const shareResults = await socialSharing.shareOnSocialMedia(alert, platforms);

    // Track sharing activity
    await trackSharingActivity(alert._id, session.user.id, platforms, shareResults);

    return NextResponse.json({
      success: true,
      data: {
        shareResults,
        sharedAlert: {
          id: alert._id,
          summary: `${alert.searchCriteria.origin.airportCode} → ${alert.searchCriteria.destination.airportCode}`,
          currentPrice: alert.currentBestPrice,
          expiresAt: alert.expiresAt,
        },
      },
    });
  } catch (error) {
    console.error("Error sharing price alert:", error);
    return NextResponse.json(
      { error: "Failed to share price alert" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/price-alerts/share/campaign - Create viral sharing campaign
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { alertId, campaignConfig } = z.object({
      alertId: z.string(),
      campaignConfig: z.object({
        duration: z.number().min(1).max(30).default(7),
        targetShares: z.number().min(10).max(1000).default(100),
        incentives: z.object({
          type: z.enum(["discount", "bonus_miles", "free_upgrade"]).default("discount"),
          value: z.number().min(1).max(100).default(5),
          maxDiscount: z.number().min(1).max(100).default(25),
        }).optional(),
      }),
    }).parse(body);

    // Get alert to create campaign for
    const alert = await getOneDoc("PriceAlert", {
      _id: campaignConfig.alertId,
      userId: session.user.id,
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Price alert not found" },
        { status: 404 }
      );
    }

    const socialSharing = getSocialSharingService();
    const campaignResult = await socialSharing.createViralCampaign(alert, campaignConfig);

    return NextResponse.json({
      success: true,
      data: {
        campaign: campaignResult.data,
        shareUrl: campaignResult.data.shareUrl,
      },
    });
  } catch (error) {
    console.error("Error creating viral campaign:", error);
    return NextResponse.json(
      { error: "Failed to create viral campaign" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/price-alerts/share/analytics - Get sharing analytics
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
    const alertId = searchParams.get('alertId');

    if (!alertId) {
      return NextResponse.json(
        { error: "Alert ID is required" },
        { status: 400 }
      );
    }

    const socialSharing = getSocialSharingService();
    const analytics = await socialSharing.getSharingAnalytics(alertId);

    return NextResponse.json({
      success: true,
      data: analytics.data,
    });
  } catch (error) {
    console.error("Error fetching sharing analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch sharing analytics" },
      { status: 500 }
    );
  }
}

/**
 * Track sharing activity for analytics
 * @param {string} alertId - Alert ID
 * @param {string} userId - User ID
 * @param {Array} platforms - Platforms shared on
 * @param {Object} results - Share results
 */
async function trackSharingActivity(alertId, userId, platforms, results) {
  try {
    const trackingData = {
      alertId,
      userId,
      platforms,
      results: Object.values(results).filter(r => r.success).length,
      timestamp: new Date(),
      userAgent: 'api', // Would be extracted from request headers
    };

    // This would be stored in analytics database
    console.log('Sharing activity tracked:', trackingData);
    
    // Also could create a sharing activity document
    await createDoc("SharingActivity", trackingData);
  } catch (error) {
    console.error('Error tracking sharing activity:', error);
  }
}