import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAirlinePartnershipManager } from "@/lib/services/airlinePartnershipManager";

/**
 * GET /api/airline-partnerships
 * Get list of airline partnerships
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
    const status = searchParams.get("status");
    const tier = searchParams.get("tier");
    const partnershipType = searchParams.get("partnershipType");
    const airlineCode = searchParams.get("airlineCode");
    const limit = parseInt(searchParams.get("limit")) || 50;
    const offset = parseInt(searchParams.get("offset")) || 0;

    // Get partnership manager
    const partnershipManager = getAirlinePartnershipManager();
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (tier) query.tier = tier;
    if (partnershipType) query.partnershipType = partnershipType;
    if (airlineCode) query.airlineCode = airlineCode;

    // Get partnerships
    const partnerships = await partnershipManager.getPartnerships(query, {
      limit,
      offset,
      includeMetrics: true,
      includeBenefits: true
    });

    return NextResponse.json({
      success: true,
      partnerships,
      pagination: {
        limit,
        offset,
        total: partnerships.length
      }
    });
  } catch (error) {
    console.error("Error fetching airline partnerships:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch airline partnerships",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/airline-partnerships
 * Create new airline partnership
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
      airlineCode,
      partnershipType,
      tier = 'bronze',
      contract,
      financial,
      integration,
      benefits,
      coverage,
      marketing,
      support,
      compliance
    } = body;

    // Validate required fields
    if (!airlineCode || !partnershipType || !contract || !financial || !integration) {
      return NextResponse.json(
        { error: "Missing required fields: airlineCode, partnershipType, contract, financial, integration" },
        { status: 400 }
      );
    }

    // Get partnership manager
    const partnershipManager = getAirlinePartnershipManager();
    
    // Create partnership
    const partnership = await partnershipManager.createPartnership({
      airlineCode,
      partnershipType,
      tier,
      contract,
      financial,
      integration,
      benefits,
      coverage,
      marketing,
      support,
      compliance,
      metadata: {
        createdBy: session.user.id,
        createdAt: new Date()
      }
    });

    // Initialize provider for this partnership
    await partnershipManager.initializeProviderForPartnership(partnership.partnershipId);

    return NextResponse.json({
      success: true,
      partnership,
      message: "Airline partnership created successfully"
    });
  } catch (error) {
    console.error("Error creating airline partnership:", error);
    return NextResponse.json(
      { 
        error: "Failed to create airline partnership",
        details: error.message 
      },
      { status: 500 }
    );
  }
}