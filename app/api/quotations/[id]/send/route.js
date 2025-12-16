import { requireAgentAuth, createErrorResponse, createSuccessResponse, checkResourceOwnership } from "@/lib/middleware/auth";
import { getOneDoc, updateOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";
import { sendQuotationSchema } from "@/lib/zodSchemas/quotationValidation";

export async function POST(req, { params }) {
  try {
    // Authenticate as agent
    const authResult = await requireAgentAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user, agentProfile } = authResult;
    const { id } = params;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = sendQuotationSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    // Check if quotation exists and agent owns it
    const existingQuotation = await getOneDoc(
      "Quotation",
      { _id: strToObjectId(id) }
    );

    if (!existingQuotation) {
      return createErrorResponse("Quotation not found", 404);
    }

    const isAgent = checkResourceOwnership(agentProfile._id.toString(), existingQuotation.agentId);
    if (!isAgent) {
      return createErrorResponse("Access denied", 403);
    }

    // Check if quotation can be sent (must be in draft status)
    if (existingQuotation.status !== "draft") {
      return createErrorResponse("Only draft quotations can be sent", 400);
    }

    // Check if validity period is valid
    const now = new Date();
    const startDate = new Date(existingQuotation.validityPeriod.startsAt);
    const endDate = new Date(existingQuotation.validityPeriod.endsAt);

    if (startDate > now) {
      return createErrorResponse("Quotation validity period has not started yet", 400);
    }

    if (endDate <= now) {
      return createErrorResponse("Quotation validity period has already expired", 400);
    }

    // Send quotation (update status and timestamps)
    await updateOneDoc(
      "Quotation",
      { _id: strToObjectId(id) },
      { 
        $set: {
          status: "sent",
          sentAt: new Date(),
          notes: validationResult.data.message || existingQuotation.notes
        }
      }
    );

    // Get updated quotation
    const updatedQuotation = await getOneDoc(
      "Quotation",
      { _id: strToObjectId(id) },
      ["quotation"]
    );

    // TODO: Send notification to user (email, in-app notification, etc.)
    // This would integrate with your notification system

    return createSuccessResponse({
      message: "Quotation sent successfully",
      data: updatedQuotation
    });

  } catch (error) {
    console.error("Error sending quotation:", error);
    return createErrorResponse("Internal server error", 500);
  }
}