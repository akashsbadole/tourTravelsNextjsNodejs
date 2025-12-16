import { requireAuth, createErrorResponse, createSuccessResponse, checkResourceOwnership } from "@/lib/middleware/auth";
import { getOneDoc, updateOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";

export async function GET(req, { params }) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;
    const { id } = params;

    // Get communication
    const communication = await getOneDoc(
      "Communication",
      { _id: strToObjectId(id) },
      ["communication"]
    );

    if (!communication) {
      return createErrorResponse("Communication not found", 404);
    }

    // Check if user is a participant
    const isParticipant = communication.participants.some(
      p => p.user && p.user.toString() === user.id
    );
    
    if (!isParticipant) {
      return createErrorResponse("Access denied", 403);
    }

    return createSuccessResponse({
      data: communication
    });

  } catch (error) {
    console.error("Error getting communication:", error);
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

    // Check if communication exists and user is a participant
    const existingCommunication = await getOneDoc(
      "Communication",
      { _id: strToObjectId(id) }
    );

    if (!existingCommunication) {
      return createErrorResponse("Communication not found", 404);
    }

    const isParticipant = existingCommunication.participants.some(
      p => p.user && p.user.toString() === user.id
    );
    
    if (!isParticipant) {
      return createErrorResponse("Access denied", 403);
    }

    // Parse and validate request body
    const body = await req.json();
    const { title, status, priority, tags, metadata } = body;

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (tags !== undefined) updateData.tags = tags;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Handle status changes
    if (status === "archived") {
      updateData.archivedAt = new Date();
      updateData.archivedBy = strToObjectId(user.id);
    } else if (status === "closed") {
      updateData.closedAt = new Date();
      updateData.closedBy = strToObjectId(user.id);
      if (body.closeReason) {
        updateData.closeReason = body.closeReason;
      }
    }

    // Update communication
    await updateOneDoc(
      "Communication",
      { _id: strToObjectId(id) },
      { $set: updateData }
    );

    // Get updated communication
    const updatedCommunication = await getOneDoc(
      "Communication",
      { _id: strToObjectId(id) },
      ["communication"]
    );

    return createSuccessResponse({
      message: "Communication updated successfully",
      data: updatedCommunication
    });

  } catch (error) {
    console.error("Error updating communication:", error);
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

    // Check if communication exists and user is a participant
    const existingCommunication = await getOneDoc(
      "Communication",
      { _id: strToObjectId(id) }
    );

    if (!existingCommunication) {
      return createErrorResponse("Communication not found", 404);
    }

    // Check if user is the requirement owner (only they can delete)
    const { getOneDoc } = await import("@/lib/db/getOperationDB");
    const requirement = await getOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(existingCommunication.requirementId) }
    );

    const isOwner = checkResourceOwnership(user.id, requirement.userId);
    
    if (!isOwner) {
      return createErrorResponse("Only requirement owner can delete communications", 403);
    }

    // Delete communication
    const { deleteOneDoc } = await import("@/lib/db/deleteOperationDB");
    await deleteOneDoc("Communication", { _id: strToObjectId(id) });

    return createSuccessResponse({
      message: "Communication deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting communication:", error);
    return createErrorResponse("Internal server error", 500);
  }
}