import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import abTestingService from "@/lib/services/abTesting";

/**
 * POST /api/analytics/abtesting/convert
 * Track conversion for user assignment
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { experimentId, conversionData } = await request.json();
    const userId = session.user.id;

    const result = await abTestingService.trackConversion(userId, experimentId, conversionData);

    return NextResponse.json({
      success: true,
      data: result,
      message: "Conversion tracked successfully"
    });
  } catch (error) {
    console.error("Error tracking conversion:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to track conversion" },
      { status: 400 }
    );
  }
}