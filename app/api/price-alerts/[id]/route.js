import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { 
  getOneDoc, 
  updateOneDoc, 
  deleteOneDoc 
} from "@/lib/db/operations";
import { PriceAlert } from "@/lib/db/models";

// Validation schemas
const updatePriceAlertSchema = z.object({
  searchCriteria: z.object({
    origin: z.object({
      airportCode: z.string().min(3).max(3).optional(),
      airportName: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
    }),
    destination: z.object({
      airportCode: z.string().min(3).max(3).optional(),
      airportName: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
    }),
    departureDate: z.coerce.date().optional(),
    returnDate: z.coerce.date().optional(),
    tripType: z.enum(["oneway", "roundtrip", "multicity"]).optional(),
    passengers: z.object({
      adults: z.number().min(1).optional(),
      children: z.number().min(0).optional(),
      infants: z.number().min(0).optional(),
    }).optional(),
    cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
    airlines: z.array(z.string()).optional(),
    filters: z.object({
      priceRange: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
      departureTime: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }).optional(),
      arrivalTime: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }).optional(),
      stops: z.enum(["direct", "1_stop", "2_plus_stops", "any"]).optional(),
      duration: z.object({
        maxHours: z.number().optional(),
      }).optional(),
    }).optional(),
  }).optional(),
  conditions: z.object({
    percentageDrop: z.object({
      enabled: z.boolean().optional(),
      threshold: z.number().min(1).max(100).optional(),
    }),
    specificPrice: z.object({
      enabled: z.boolean().optional(),
      targetPrice: z.number().min(0).optional(),
      currency: z.string().optional(),
    }),
    dailyChange: z.object({
      enabled: z.boolean().optional(),
      minChangeAmount: z.number().min(0).optional(),
      changeType: z.enum(["drop", "rise", "any"]).optional(),
    }),
    priceTrend: z.object({
      enabled: z.boolean().optional(),
      trendType: z.enum(["falling", "rising", "stable", "volatile"]).optional(),
      duration: z.number().min(1).optional(),
      durationUnit: z.enum(["hours", "days"]).optional(),
    }),
    competitivePrice: z.object({
      enabled: z.boolean().optional(),
      comparisonType: z.enum(["cheapest", "below_average", "top_3"]).optional(),
      threshold: z.number().min(1).max(100).optional(),
    }),
  }).optional(),
  notificationPreferences: z.object({
    email: z.object({
      enabled: z.boolean().optional(),
      frequency: z.enum(["immediate", "hourly", "daily", "weekly"]).optional(),
      batchSize: z.number().optional(),
    }).optional(),
    push: z.object({
      enabled: z.boolean().optional(),
      frequency: z.enum(["immediate", "hourly", "daily"]).optional(),
    }).optional(),
    sms: z.object({
      enabled: z.boolean().optional(),
      frequency: z.enum(["immediate", "daily"]).optional(),
      phoneNumber: z.string().optional(),
    }).optional(),
    quietHours: z.object({
      enabled: z.boolean().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      timezone: z.string().optional(),
    }).optional(),
    maxNotificationsPerDay: z.number().optional(),
  }).optional(),
  status: z.enum(["active", "paused", "expired", "triggered", "cancelled"]).optional(),
  expiresAt: z.coerce.date().optional(),
}).partial();

// GET /api/price-alerts/[id] - Get specific price alert
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const alert = await getOneDoc(
      "PriceAlert",
      {
        _id: params.id,
        userId: session.user.id,
      },
      ["user"]
    );

    if (!alert) {
      return NextResponse.json(
        { error: "Price alert not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    console.error("Error fetching price alert:", error);
    return NextResponse.json(
      { error: "Failed to fetch price alert" },
      { status: 500 }
    );
  }
}

// PUT /api/price-alerts/[id] - Update price alert
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if alert exists and belongs to user
    const existingAlert = await getOneDoc("PriceAlert", {
      _id: params.id,
      userId: session.user.id,
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: "Price alert not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updatePriceAlertSchema.parse(body);

    // Prevent updating certain fields after creation
    const { userId, email, referencePrice, createdAt, ...updatableData } = validatedData;

    const updatedAlert = await updateOneDoc(
      "PriceAlert",
      { _id: params.id, userId: session.user.id },
      updatableData
    );

    return NextResponse.json({
      success: true,
      data: updatedAlert,
      message: "Price alert updated successfully",
    });
  } catch (error) {
    console.error("Error updating price alert:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update price alert" },
      { status: 500 }
    );
  }
}

// DELETE /api/price-alerts/[id] - Delete price alert
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if alert exists and belongs to user
    const existingAlert = await getOneDoc("PriceAlert", {
      _id: params.id,
      userId: session.user.id,
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: "Price alert not found" },
        { status: 404 }
      );
    }

    await deleteOneDoc("PriceAlert", {
      _id: params.id,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Price alert deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting price alert:", error);
    return NextResponse.json(
      { error: "Failed to delete price alert" },
      { status: 500 }
    );
  }
}

// PATCH /api/price-alerts/[id]/pause - Pause price alert
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action !== 'pause' && action !== 'resume') {
      return NextResponse.json(
        { error: "Invalid action. Use 'pause' or 'resume'" },
        { status: 400 }
      );
    }

    const existingAlert = await getOneDoc("PriceAlert", {
      _id: params.id,
      userId: session.user.id,
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: "Price alert not found" },
        { status: 404 }
      );
    }

    const updatedAlert = await updateOneDoc(
      "PriceAlert",
      { _id: params.id, userId: session.user.id },
      { 
        status: action === 'pause' ? 'paused' : 'active'
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedAlert,
      message: `Price alert ${action}d successfully`,
    });
  } catch (error) {
    console.error(`Error ${action}ing price alert:`, error);
    return NextResponse.json(
      { error: `Failed to ${action} price alert` },
      { status: 500 }
    );
  }
}