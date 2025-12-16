import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import abTestingService from "@/lib/services/abTesting";

/**
 * GET /api/analytics/abtesting/experiments
 * Get all experiments
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const { success, experiments } = await abTestingService.getAllExperiments(status);

    return NextResponse.json({
      success: true,
      data: experiments,
      count: experiments.length
    });
  } catch (error) {
    console.error("Error fetching experiments:", error);
    return NextResponse.json(
      { error: "Failed to fetch experiments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/abtesting/experiments
 * Create a new experiment
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const experimentData = await request.json();

    const experiment = await abTestingService.createExperiment(experimentData);

    return NextResponse.json({
      success: true,
      data: experiment,
      message: "Experiment created successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating experiment:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to create experiment" },
      { status: 400 }
    );
  }
}