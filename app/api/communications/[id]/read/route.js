import { requireAuth, createErrorResponse, createSuccessResponse, checkResourceOwnership } from "@/lib/middleware/auth";
import { getOneDoc, updateOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";
import { markAsReadSchema } from "@/lib/zodSchemas/communicationValidation";

export async function PUT(req, { params }) {
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
    const validationResult = markAsReadSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const { messageIds, markAll } = validationResult.data;

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

    const now = new Date();

    if (markAll) {
      // Mark all messages as read for this participant
      await updateOneDoc(
        "Communication",
        { 
          _id: strToObjectId(id),
          "participants.user": strToObjectId(user.id)
        },
        { 
          $set: { 
            "participants.$.unreadCount": 0,
            "participants.$.lastReadAt": now
          }
        }
      );

      // Mark all messages as read by this user
      await updateOneDoc(
        "Communication",
        { 
          _id: strToObjectId(id),
          "messages.sender": { $ne: strToObjectId(user.id) } // Only messages from others
        },
        { 
          $addToSet: { 
            "messages.$[elem].readBy": {
              user: strToObjectId(user.id),
              readAt: now
            }
          }
        },
        {
          arrayFilters: [
            { "elem.sender": { $ne: strToObjectId(user.id) } }
          ]
        }
      );

    } else if (messageIds && messageIds.length > 0) {
      // Mark specific messages as read
      const messageObjectIds = messageIds.map(id => strToObjectId(id));

      // Update unread count (decrement by number of messages being marked)
      await updateOneDoc(
        "Communication",
        { 
          _id: strToObjectId(id),
          "participants.user": strToObjectId(user.id)
        },
        { 
          $set: { 
            "participants.$.lastReadAt": now
          },
          $inc: { 
            "participants.$.unreadCount": -Math.min(messageIds.length, participant.unreadCount || 0)
          }
        }
      );

      // Mark specific messages as read by this user
      await updateOneDoc(
        "Communication",
        { 
          _id: strToObjectId(id),
          "messages._id": { $in: messageObjectIds }
        },
        { 
          $addToSet: { 
            "messages.$[elem].readBy": {
              user: strToObjectId(user.id),
              readAt: now
            }
          }
        },
        {
          arrayFilters: [
            { "elem._id": { $in: messageObjectIds } }
          ]
        }
      );
    }

    // Get updated communication
    const updatedCommunication = await getOneDoc(
      "Communication",
      { _id: strToObjectId(id) },
      ["communication"]
    );

    return createSuccessResponse({
      message: "Messages marked as read successfully",
      data: updatedCommunication
    });

  } catch (error) {
    console.error("Error marking messages as read:", error);
    return createErrorResponse("Internal server error", 500);
  }
}