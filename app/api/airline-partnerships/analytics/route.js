import { NextResponse } from "next/server";
import { getAirlinePartnershipAnalytics } from "@/lib/services/airlinePartnershipAnalytics";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * API endpoint for airline partnership analytics
 * GET: Retrieve analytics data
 * POST: Trigger analytics calculations
 */

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const partnershipId = searchParams.get('partnershipId');
    const analyticsType = searchParams.get('type') || 'performance';
    const period = searchParams.get('period') || 'monthly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeComparisons = searchParams.get('includeComparisons') === 'true';
    const includeAlerts = searchParams.get('includeAlerts') === 'true';
    const includeRecommendations = searchParams.get('includeRecommendations') === 'true';

    if (!partnershipId) {
      return NextResponse.json(
        { error: "Partnership ID is required" },
        { status: 400 }
      );
    }

    const analyticsService = getAirlinePartnershipAnalytics();
    let result;

    const options = {
      period,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      includeComparisons,
      includeAlerts,
      includeRecommendations
    };

    switch (analyticsType) {
      case 'performance':
        result = await analyticsService.getPartnershipPerformance(partnershipId, options);
        break;
      case 'conversion':
        result = await analyticsService.getBookingConversionAnalytics(partnershipId, options);
        break;
      case 'revenue':
        result = await analyticsService.getRevenueCommissionAnalytics(partnershipId, options);
        break;
      case 'roi':
        result = await analyticsService.getPartnershipROIAnalysis(partnershipId, options);
        break;
      case 'dashboard':
        result = await analyticsService.getPartnershipDashboard(partnershipId, options);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid analytics type. Valid types: performance, conversion, revenue, roi, dashboard" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        partnershipId,
        analyticsType,
        period,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in analytics GET:", error);
    return NextResponse.json(
      { 
        error: "Failed to retrieve analytics data",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { partnershipId, eventType, data } = body;

    if (!partnershipId || !eventType) {
      return NextResponse.json(
        { error: "Partnership ID and event type are required" },
        { status: 400 }
      );
    }

    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent(eventType, {
      partnershipId,
      ...data,
      triggeredBy: session.user.id,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: "Analytics event triggered successfully",
      meta: {
        partnershipId,
        eventType,
        triggeredAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in analytics POST:", error);
    return NextResponse.json(
      { 
        error: "Failed to trigger analytics event",
        details: error.message 
      },
      { status: 500 }
    );
  }
}