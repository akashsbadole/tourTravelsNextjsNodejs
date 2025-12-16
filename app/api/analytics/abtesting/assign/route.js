import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import abTestingService from "@/lib/services/abTesting";

/**
 * POST /api/analytics/abtesting/assign
 * Assign user to experiment variant
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { experimentId, context } = await request.json();
    const userId = session.user.id;

    const result = await abTestingService.assignUserToVariant(userId, experimentId, context);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error assigning user to variant:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to assign user to variant" },
      { status: 400 }
    );
  }
}

/**
 * GET /api/analytics/abtesting/assign
 * Get user's current experiment assignments
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // This would need to be implemented in the service
    // For now, return a placeholder
    return NextResponse.json({
      success: true,
      data: {
        assignments: [],
        message: "User assignments retrieval not yet implemented"
      }
    });
  } catch (error) {
    console.error("Error fetching user assignments:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch user assignments" },
      { status: 500 }
    );
  }
}