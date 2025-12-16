import { requireAuth, createErrorResponse, createSuccessResponse, checkResourceOwnership } from "@/lib/middleware/auth";
import { getOneDoc, updateOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";
import { respondQuotationSchema } from "@/lib/zodSchemas/quotationValidation";

export async function POST(req, { params }) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;
    const { id } = params;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = respondQuotationSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const { response, notes } = validationResult.data;

    // Check if quotation exists and user owns it
    const existingQuotation = await getOneDoc(
      "Quotation",
      { _id: strToObjectId(id) }
    );

    if (!existingQuotation) {
      return createErrorResponse("Quotation not found", 404);
    }

    const isOwner = checkResourceOwnership(user.id, existingQuotation.userId);
    if (!isOwner) {
      return createErrorResponse("Access denied", 403);
    }

    // Check if quotation can be responded to (must be sent or viewed)
    if (!["sent", "viewed"].includes(existingQuotation.status)) {
      return createErrorResponse("Cannot respond to quotation in current status", 400);
    }

    // Check if quotation is still valid
    const now = new Date();
    const endDate = new Date(existingQuotation.validityPeriod.endsAt);

    if (endDate <= now) {
      return createErrorResponse("Quotation has expired", 400);
    }

    // Update quotation with response
    await updateOneDoc(
      "Quotation",
      { _id: strToObjectId(id) },
      { 
        $set: {
          status: response,
          respondedAt: new Date(),
          responseNotes: notes || "",
          viewedAt: existingQuotation.viewedAt || new Date() // Mark as viewed if not already
        }
      }
    );

    // Get updated quotation
    const updatedQuotation = await getOneDoc(
      "Quotation",
      { _id: strToObjectId(id) },
      ["quotation"]
    );

    // If accepted, update requirement status
    if (response === "accepted") {
      await updateOneDoc(
        "TravelRequirement",
        { _id: strToObjectId(existingQuotation.requirementId) },
        { 
          $set: {
            status: "in_progress",
            completedAt: new Date()
          }
        }
      );
    }

    // TODO: Send notification to agent about the response
    // This would integrate with your notification system

    return createSuccessResponse({
      message: `Quotation ${response} successfully`,
      data: updatedQuotation
    });

  } catch (error) {
    console.error("Error responding to quotation:", error);
    return createErrorResponse("Internal server error", 500);
  }
}