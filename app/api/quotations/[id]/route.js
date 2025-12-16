import { requireAuth, requireAgentAuth, createErrorResponse, createSuccessResponse, checkResourceOwnership } from "@/lib/middleware/auth";
import { getOneDoc, updateOneDoc, deleteOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";
import { updateQuotationSchema } from "@/lib/zodSchemas/quotationValidation";

export async function GET(req, { params }) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;
    const { id } = params;

    // Get quotation
    const quotation = await getOneDoc(
      "Quotation",
      { _id: strToObjectId(id) },
      ["quotation"]
    );

    if (!quotation) {
      return createErrorResponse("Quotation not found", 404);
    }

    // Check if user owns the quotation or is the assigned agent
    const isOwner = checkResourceOwnership(user.id, quotation.userId);
    const isAgent = checkResourceOwnership(user.id, quotation.agentId);
    
    if (!isOwner && !isAgent) {
      return createErrorResponse("Access denied", 403);
    }

    return createSuccessResponse({
      data: quotation
    });

  } catch (error) {
    console.error("Error getting quotation:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function PUT(req, { params }) {
  try {
    // Authenticate as agent
    const authResult = await requireAgentAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user, agentProfile } = authResult;
    const { id } = params;

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

    // Check if quotation can be updated (not sent or responded)
    if (["sent", "viewed", "accepted", "rejected", "expired"].includes(existingQuotation.status)) {
      return createErrorResponse("Cannot update quotation that has been sent or responded to", 400);
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = updateQuotationSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const updateData = { ...validationResult.data };
    
    // Convert date fields if present
    if (updateData.validityPeriod) {
      if (updateData.validityPeriod.startsAt) {
        updateData.validityPeriod.startsAt = new Date(updateData.validityPeriod.startsAt);
      }
      if (updateData.validityPeriod.endsAt) {
        updateData.validityPeriod.endsAt = new Date(updateData.validityPeriod.endsAt);
      }
    }

    // Update quotation
    await updateOneDoc(
      "Quotation",
      { _id: strToObjectId(id) },
      { $set: updateData }
    );

    // Get updated quotation
    const updatedQuotation = await getOneDoc(
      "Quotation",
      { _id: strToObjectId(id) },
      ["quotation"]
    );

    return createSuccessResponse({
      message: "Quotation updated successfully",
      data: updatedQuotation
    });

  } catch (error) {
    console.error("Error updating quotation:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function DELETE(req, { params }) {
  try {
    // Authenticate as agent
    const authResult = await requireAgentAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user, agentProfile } = authResult;
    const { id } = params;

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

    // Check if quotation can be deleted (not sent or responded)
    if (["sent", "viewed", "accepted", "rejected", "expired"].includes(existingQuotation.status)) {
      return createErrorResponse("Cannot delete quotation that has been sent or responded to", 400);
    }

    // Delete quotation
    await deleteOneDoc("Quotation", { _id: strToObjectId(id) });

    // Update requirement's quotes received count
    await updateOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(existingQuotation.requirementId) },
      { $inc: { quotesReceived: -1 } }
    );

    return createSuccessResponse({
      message: "Quotation deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting quotation:", error);
    return createErrorResponse("Internal server error", 500);
  }
}