import { NextResponse } from "next/server";
import { getAirlinePartnershipAnalytics } from "@/lib/services/airlinePartnershipAnalytics";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * API endpoint for comparative analytics across multiple airline partnerships
 * GET: Retrieve comparative analytics data
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
    const partnershipIds = searchParams.get('partnershipIds');
    const period = searchParams.get('period') || 'monthly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const metrics = searchParams.get('metrics')?.split(',') || ['performance', 'revenue', 'conversion'];
    const benchmarkType = searchParams.get('benchmarkType') || 'tier';

    if (!partnershipIds) {
      return NextResponse.json(
        { error: "Partnership IDs are required" },
        { status: 400 }
      );
    }

    const partnershipIdArray = partnershipIds.split(',').map(id => id.trim());
    
    if (partnershipIdArray.length < 2) {
      return NextResponse.json(
        { error: "At least 2 partnership IDs are required for comparison" },
        { status: 400 }
      );
    }

    const analyticsService = getAirlinePartnershipAnalytics();
    
    const result = await analyticsService.getComparativeAnalytics(partnershipIdArray, {
      period,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      metrics,
      benchmarkType
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        partnershipIds: partnershipIdArray,
        period,
        metrics,
        benchmarkType,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in comparative analytics GET:", error);
    return NextResponse.json(
      { 
        error: "Failed to retrieve comparative analytics data",
        details: error.message 
      },
      { status: 500 }
    );
  }
}