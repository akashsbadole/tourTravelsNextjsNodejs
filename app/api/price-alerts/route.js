import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { 
  createDoc, 
  getManyDocs, 
  getOneDoc, 
  updateOneDoc, 
  deleteOneDoc 
} from "@/lib/db/operations";
import { PriceAlert } from "@/lib/db/models";
import { generateShareCode } from "@/lib/utils/priceAlertUtils";

// Validation schemas
const createPriceAlertSchema = z.object({
  searchCriteria: z.object({
    origin: z.object({
      airportCode: z.string().min(3).max(3),
      airportName: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
    }),
    destination: z.object({
      airportCode: z.string().min(3).max(3),
      airportName: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
    }),
    departureDate: z.coerce.date(),
    returnDate: z.coerce.date().optional(),
    tripType: z.enum(["oneway", "roundtrip", "multicity"]).default("oneway"),
    passengers: z.object({
      adults: z.number().min(1).default(1),
      children: z.number().min(0).default(0),
      infants: z.number().min(0).default(0),
    }),
    cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
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
      stops: z.enum(["direct", "1_stop", "2_plus_stops", "any"]).default("any"),
      duration: z.object({
        maxHours: z.number().optional(),
      }).optional(),
    }).optional(),
  }),
  conditions: z.object({
    percentageDrop: z.object({
      enabled: z.boolean().default(false),
      threshold: z.number().min(1).max(100).optional(),
    }),
    specificPrice: z.object({
      enabled: z.boolean().default(false),
      targetPrice: z.number().min(0).optional(),
      currency: z.string().default("USD"),
    }),
    dailyChange: z.object({
      enabled: z.boolean().default(false),
      minChangeAmount: z.number().min(0).optional(),
      changeType: z.enum(["drop", "rise", "any"]).default("drop"),
    }),
    priceTrend: z.object({
      enabled: z.boolean().default(false),
      trendType: z.enum(["falling", "rising", "stable", "volatile"]).default("falling"),
      duration: z.number().min(1).optional(),
      durationUnit: z.enum(["hours", "days"]).default("days"),
    }),
    competitivePrice: z.object({
      enabled: z.boolean().default(false),
      comparisonType: z.enum(["cheapest", "below_average", "top_3"]).default("cheapest"),
      threshold: z.number().min(1).max(100).optional(),
    }),
  }),
  notificationPreferences: z.object({
    email: z.object({
      enabled: z.boolean().default(true),
      frequency: z.enum(["immediate", "hourly", "daily", "weekly"]).default("immediate"),
      batchSize: z.number().default(1),
    }),
    push: z.object({
      enabled: z.boolean().default(true),
      frequency: z.enum(["immediate", "hourly", "daily"]).default("immediate"),
    }),
    sms: z.object({
      enabled: z.boolean().default(false),
      frequency: z.enum(["immediate", "daily"]).default("immediate"),
      phoneNumber: z.string().optional(),
    }),
    quietHours: z.object({
      enabled: z.boolean().default(false),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      timezone: z.string().default("UTC"),
    }),
    maxNotificationsPerDay: z.number().default(10),
  }).optional(),
  expiresAt: z.coerce.date(),
  source: z.enum(["manual", "search_result", "auto", "recommendation"]).default("manual"),
});

const updatePriceAlertSchema = createPriceAlertSchema.partial();

const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["active", "paused", "expired", "triggered", "cancelled"]).optional(),
  tripType: z.enum(["oneway", "roundtrip", "multicity"]).optional(),
  sortBy: z.enum(["createdAt", "departureDate", "expiresAt", "lastTriggeredAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET /api/price-alerts - Get user's price alerts
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

    if (validatedParams.status) {
      query.status = validatedParams.status;
    }

    if (validatedParams.tripType) {
      query["searchCriteria.tripType"] = validatedParams.tripType;
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

    const total = await PriceAlert.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: alerts,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        pages: Math.ceil(total / validatedParams.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching price alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch price alerts" },
      { status: 500 }
    );
  }
}

// POST /api/price-alerts - Create new price alert
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
    const validatedData = createPriceAlertSchema.parse(body);

    // Get current reference price from flight search
    const referencePrice = await getReferencePrice(validatedData.searchCriteria);
    
    if (!referencePrice) {
      return NextResponse.json(
        { error: "No flights found for the specified criteria" },
        { status: 404 }
      );
    }

    const alertData = {
      ...validatedData,
      userId: session.user.id,
      email: session.user.email,
      referencePrice: {
        amount: referencePrice.amount,
        currency: referencePrice.currency,
        recordedAt: new Date(),
      },
      currentBestPrice: {
        amount: referencePrice.amount,
        currency: referencePrice.currency,
        recordedAt: new Date(),
      },
      sharing: {
        enabled: false,
        shareCode: generateShareCode(),
        shareCount: 0,
      },
    };

    const newAlert = await createDoc("PriceAlert", alertData);

    return NextResponse.json({
      success: true,
      data: newAlert,
      message: "Price alert created successfully",
    });
  } catch (error) {
    console.error("Error creating price alert:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create price alert" },
      { status: 500 }
    );
  }
}

// Helper function to get reference price from flight search
async function getReferencePrice(searchCriteria) {
  try {
    // Import and use existing flight search service
    const { getFlights } = await import("@/lib/services/flights");
    
    const flights = await getFlights(
      {
        departureAirportCode: searchCriteria.origin.airportCode,
        arrivalAirportCode: searchCriteria.destination.airportCode,
        departureDate: searchCriteria.departureDate,
        returnDate: searchCriteria.returnDate,
        tripType: searchCriteria.tripType,
        flightClass: searchCriteria.cabinClass,
        passengersObj: searchCriteria.passengers,
        filters: searchCriteria.filters || {},
      },
      [], // No bookmarked flights needed
      {} // No metadata needed
    );

    if (flights.length === 0) {
      return null;
    }

    // Find the cheapest flight
    const cheapestFlight = flights.reduce((prev, current) => 
      (prev.fareBreakdowns?.total < current.fareBreakdowns?.total) ? prev : current
    );

    return {
      amount: cheapestFlight.fareBreakdowns?.total || 0,
      currency: "USD", // Default currency, should be dynamic
      flightId: cheapestFlight._id?.toString(),
      airlineCode: cheapestFlight.carrierInCharge?.code,
    };
  } catch (error) {
    console.error("Error getting reference price:", error);
    return null;
  }
}