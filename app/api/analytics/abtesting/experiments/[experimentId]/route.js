import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import abTestingService from "@/lib/services/abTesting";

/**
 * GET /api/analytics/abtesting/experiments/[experimentId]
 * Get experiment details and results
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { experimentId } = params;

    const { success, experiment, results } = await abTestingService.getExperimentResults(experimentId);

    return NextResponse.json({
      success: true,
      data: {
        experiment,
        results
      }
    });
  } catch (error) {
    console.error("Error fetching experiment:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch experiment" },
      { status: 404 }
    );
  }
}

/**
 * PUT /api/analytics/abtesting/experiments/[experimentId]
 * Update experiment (start, pause, complete)
 */
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { experimentId } = params;
    const { action, results } = await request.json();

    let response;

    switch (action) {
      case 'start':
        response = await abTestingService.startExperiment(experimentId);
        break;
      case 'pause':
        response = await abTestingService.pauseExperiment(experimentId);
        break;
      case 'complete':
        response = await abTestingService.completeExperiment(experimentId, results);
        break;
      default:
        throw new Error('Invalid action');
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Experiment ${action}ed successfully`
    });
  } catch (error) {
    console.error("Error updating experiment:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to update experiment" },
      { status: 400 }
    );
  }
}