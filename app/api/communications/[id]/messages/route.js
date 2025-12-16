import { requireAuth, createErrorResponse, createSuccessResponse, checkResourceOwnership } from "@/lib/middleware/auth";
import { getOneDoc, updateOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";
import { createMessageSchema } from "@/lib/zodSchemas/communicationValidation";

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
    const validationResult = createMessageSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    // Check if communication exists and user is a participant
    const existingCommunication = await getOneDoc(
      "Communication",
      { _id: strToObjectId(id) }
    );

    if (!existingCommunication) {
      return createErrorResponse("Communication not found", 404);
    }

    const participant = existingCommunication.participants.find(
      p => p.user && p.user.toString() === user.id
    );
    
    if (!participant) {
      return createErrorResponse("Access denied", 403);
    }

    // Check if communication is active
    if (existingCommunication.status !== "active") {
      return createErrorResponse("Cannot send messages to inactive communications", 400);
    }

    // Create message object
    const messageData = {
      ...validationResult.data,
      sender: strToObjectId(user.id),
      senderType: participant.userType,
      createdAt: new Date(),
    };

    // Add message to communication
    await updateOneDoc(
      "Communication",
      { _id: strToObjectId(id) },
      { 
        $push: { messages: messageData },
        $set: {
          lastMessageAt: new Date(),
          lastMessagePreview: validationResult.data.content.substring(0, 100),
        },
        $inc: { totalMessages: 1 }
      }
    );

    // Update unread counts for other participants
    const otherParticipants = existingCommunication.participants.filter(
      p => p.user && p.user.toString() !== user.id
    );

    for (const otherParticipant of otherParticipants) {
      await updateOneDoc(
        "Communication",
        { 
          _id: strToObjectId(id),
          "participants.user": strToObjectId(otherParticipant.user.toString())
        },
        { 
          $inc: { "participants.$.unreadCount": 1 }
        }
      );
    }

    // Get updated communication
    const updatedCommunication = await getOneDoc(
      "Communication",
      { _id: strToObjectId(id) },
      ["communication"]
    );

    // TODO: Send notifications to other participants
    // This would integrate with your notification system

    return createSuccessResponse({
      message: "Message sent successfully",
      data: {
        message: messageData,
        communication: updatedCommunication
      }
    });

  } catch (error) {
    console.error("Error sending message:", error);
    return createErrorResponse("Internal server error", 500);
  }
}