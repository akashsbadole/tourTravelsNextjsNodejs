import { requireAuth, requireAgentAuth, createErrorResponse, createSuccessResponse, checkResourceOwnership } from "@/lib/middleware/auth";
import { getOneDoc, updateOneDoc, deleteOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";
import { updateTravelRequirementSchema } from "@/lib/zodSchemas/travelRequirementValidation";

export async function GET(req, { params }) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;
    const { id } = params;

    // Get requirement
    const requirement = await getOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(id) },
      ["requirement"]
    );

    if (!requirement) {
      return createErrorResponse("Travel requirement not found", 404);
    }

    // Check if user owns the requirement or it's public
    const isOwner = checkResourceOwnership(user.id, requirement.userId);
    const isPublic = requirement.isPublic;
    
    if (!isOwner && !isPublic) {
      return createErrorResponse("Access denied", 403);
    }

    return createSuccessResponse({
      data: requirement
    });

  } catch (error) {
    console.error("Error getting travel requirement:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function PUT(req, { params }) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;
    const { id } = params;

    // Check if requirement exists and user owns it
    const existingRequirement = await getOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(id) }
    );

    if (!existingRequirement) {
      return createErrorResponse("Travel requirement not found", 404);
    }

    const isOwner = checkResourceOwnership(user.id, existingRequirement.userId);
    if (!isOwner) {
      return createErrorResponse("Access denied", 403);
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = updateTravelRequirementSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const updateData = { ...validationResult.data };
    
    // Convert date fields if present
    if (updateData.travelDates) {
      if (updateData.travelDates.departureDate) {
        updateData.travelDates.departureDate = new Date(updateData.travelDates.departureDate);
      }
      if (updateData.travelDates.returnDate) {
        updateData.travelDates.returnDate = new Date(updateData.travelDates.returnDate);
      }
    }
    
    if (updateData.deadline) {
      updateData.deadline = new Date(updateData.deadline);
    }

    // Update requirement
    await updateOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(id) },
      { $set: updateData }
    );

    // Get updated requirement
    const updatedRequirement = await getOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(id) },
      ["requirement"]
    );

    return createSuccessResponse({
      message: "Travel requirement updated successfully",
      data: updatedRequirement
    });

  } catch (error) {
    console.error("Error updating travel requirement:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function DELETE(req, { params }) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;
    const { id } = params;

    // Check if requirement exists and user owns it
    const existingRequirement = await getOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(id) }
    );

    if (!existingRequirement) {
      return createErrorResponse("Travel requirement not found", 404);
    }

    const isOwner = checkResourceOwnership(user.id, existingRequirement.userId);
    if (!isOwner) {
      return createErrorResponse("Access denied", 403);
    }

    // Check if requirement can be deleted (not in progress or completed)
    if (["in_progress", "completed"].includes(existingRequirement.status)) {
      return createErrorResponse("Cannot delete requirement that is in progress or completed", 400);
    }

    // Delete requirement
    await deleteOneDoc("TravelRequirement", { _id: strToObjectId(id) });

    return createSuccessResponse({
      message: "Travel requirement deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting travel requirement:", error);
    return createErrorResponse("Internal server error", 500);
  }
}