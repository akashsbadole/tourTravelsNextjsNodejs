import { auth } from "@/lib/auth";
import { processModificationRequest, approveModificationRequest, rejectModificationRequest } from "@/lib/services/flightBookingModification";
import { getOneDoc } from "@/lib/db/getOperationDB";
import { z } from "zod";

// Validation schema for approval/rejection
const approvalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().optional()
});

// Validation schema for processing
const processingSchema = z.object({
  processedBy: z.string().optional(),
  newPNRCode: z.string().optional(),
  newTicketNumbers: z.array(z.string()).optional(),
  airlineConfirmationCode: z.string().optional(),
  newFlightDetails: z.any().optional(),
  newSeat: z.any().optional(),
  newClass: z.string().optional()
});

/**
 * GET /api/flight-modifications/[modificationId]
 * Get specific modification details
 */
export async function GET(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 }
    );
  }

  try {
    const { modificationId } = params;

    const modification = await getOneDoc("FlightBookingModification", { 
      modificationId,
      requestedBy: session.user.id 
    }, ["modificationDetails"]);

    if (!modification) {
      return Response.json(
        { success: false, message: "Modification not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: modification,
      message: "Modification details retrieved successfully"
    });

  } catch (error) {
    console.error('Error getting modification details:', error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/flight-modifications/[modificationId]
 * Process, approve, or reject modification
 */
export async function PUT(req, { params }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 }
    );
  }

  try {
    const { modificationId } = params;
    const body = await req.json();

    // Get modification to check current status
    const modification = await getOneDoc("FlightBookingModification", { modificationId });
    if (!modification) {
      return Response.json(
        { success: false, message: "Modification not found" },
        { status: 404 }
      );
    }

    // Determine action based on body and current status
    if (body.action === "approve" || body.action === "reject") {
      // Approval/rejection action
      const validation = approvalSchema.safeParse(body);
      if (!validation.success) {
        return Response.json({
          success: false,
          message: "Invalid approval data",
          errors: validation.error.errors
        }, { status: 400 });
      }

      const { action, notes } = validation.data;

      if (action === "approve") {
        const result = await approveModificationRequest(modificationId, session.user.id, notes);
        return Response.json({
          success: true,
          data: result,
          message: "Modification approved successfully"
        });
      } else {
        const result = await rejectModificationRequest(modificationId, session.user.id, notes);
        return Response.json({
          success: true,
          data: result,
          message: "Modification rejected successfully"
        });
      }

    } else {
      // Processing action
      const validation = processingSchema.safeParse(body);
      if (!validation.success) {
        return Response.json({
          success: false,
          message: "Invalid processing data",
          errors: validation.error.errors
        }, { status: 400 });
      }

      const processingData = {
        ...validation.data,
        processedBy: session.user.id
      };

      const result = await processModificationRequest(modificationId, processingData);
      return Response.json({
        success: true,
        data: result,
        message: "Modification processed successfully"
      });
    }

  } catch (error) {
    console.error('Error processing modification:', error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}