import { auth } from "@/lib/auth";
import { createModificationRequest, getModificationHistory } from "@/lib/services/flightBookingModification";
import { calculateModificationFee, validateModificationEligibility } from "@/lib/services/modificationFeeCalculator";
import { z } from "zod";

// Validation schema for modification request
const modificationRequestSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  modifications: z.array(z.object({
    type: z.enum(["date_change", "passenger_update", "seat_change", "baggage_change", "meal_change", "class_upgrade"]),
    description: z.string().min(1, "Description is required"),
    originalValue: z.any().optional(),
    newValue: z.any().optional(),
    segmentIndex: z.number().optional(),
    passengerIndex: z.number().optional(),
    passengerId: z.string().optional()
  })).min(1, "At least one modification is required"),
  paymentMethodId: z.string().optional(),
  notes: z.string().optional(),
  source: z.enum(["web", "mobile", "api", "admin_panel"]).default("web")
});

/**
 * GET /api/flight-modifications
 * Get modification history for a booking
 */
export async function GET(req) {
  const session = await auth();
  if (!session?.user) {
    return Response.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return Response.json(
        { success: false, message: "Booking ID is required" },
        { status: 400 }
      );
    }

    const history = await getModificationHistory(bookingId);

    return Response.json({
      success: true,
      data: history,
      message: "Modification history retrieved successfully"
    });

  } catch (error) {
    console.error('Error getting modification history:', error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flight-modifications
 * Create a new modification request
 */
export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return Response.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const validation = modificationRequestSchema.safeParse(body);

    if (!validation.success) {
      return Response.json({
        success: false,
        message: "Invalid request data",
        errors: validation.error.errors
      }, { status: 400 });
    }

    const { bookingId, modifications, paymentMethodId, notes, source } = validation.data;

    // Create modification request
    const result = await createModificationRequest({
      bookingId,
      userId: session.user.id,
      modifications,
      paymentMethodId,
      notes,
      source
    });

    return Response.json({
      success: true,
      data: result,
      message: "Modification request created successfully"
    });

  } catch (error) {
    console.error('Error creating modification request:', error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}