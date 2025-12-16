import { requireAuth, createErrorResponse, createSuccessResponse, checkResourceOwnership } from "@/lib/middleware/auth";
import { createOneDoc, getManyDocs } from "@/lib/db";
import { countDocs } from "@/lib/db/utilsDB";
import { strToObjectId } from "@/lib/db/utilsDB";
import { 
  createCommunicationSchema, 
  communicationFilterSchema 
} from "@/lib/zodSchemas/communicationValidation";

export async function GET(req) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validationResult = communicationFilterSchema.safeParse(query);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const {
      requirementId,
      status,
      priority,
      participantType,
      participantId,
      page = 1,
      limit = 10,
      sortBy = "lastMessageAt",
      sortOrder = "desc"
    } = validationResult.data;

    // Build filter - user must be a participant
    const filter = {
      "participants.user": strToObjectId(user.id)
    };

    // Add requirement filter
    if (requirementId) {
      filter.requirementId = strToObjectId(requirementId);
    }

    // Add status filter
    if (status) {
      filter.status = status;
    }

    // Add priority filter
    if (priority) {
      filter.priority = priority;
    }

    // Add participant type filter
    if (participantType) {
      filter["participants.userType"] = participantType;
    }

    // Add specific participant filter
    if (participantId) {
      filter["participants.user"] = strToObjectId(participantId);
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get communications with pagination
    const communications = await getManyDocs(
      "Communication",
      filter,
      ["communications", `page:${page}`, `limit:${limit}`],
      false,
      {
        sort: sortOptions,
        skip,
        limit
      }
    );

    // Get total count for pagination
    const totalCount = await countDocs("Communication", filter);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return createSuccessResponse({
      data: communications,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error("Error listing communications:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function POST(req) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = createCommunicationSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const { requirementId, participants } = validationResult.data;

    // Check if requirement exists and user has access
    const { getOneDoc } = await import("@/lib/db/getOperationDB");
    const requirement = await getOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(requirementId) }
    );

    if (!requirement) {
      return createErrorResponse("Travel requirement not found", 404);
    }

    const isOwner = checkResourceOwnership(user.id, requirement.userId);
    const isAssignedAgent = requirement.assignedAgent && checkResourceOwnership(user.id, requirement.assignedAgent);
    
    if (!isOwner && !isAssignedAgent) {
      return createErrorResponse("You can only create communications for requirements you own or are assigned to", 403);
    }

    // Prepare participants data
    const participantsData = participants.map(p => ({
      user: strToObjectId(p.user),
      userType: p.userType,
      joinedAt: new Date(),
      lastReadAt: new Date(),
      unreadCount: 0,
      isActive: true,
      hasLeft: false
    }));

    // Ensure current user is a participant
    const currentUserParticipant = {
      user: strToObjectId(user.id),
      userType: isOwner ? "user" : "agent",
      joinedAt: new Date(),
      lastReadAt: new Date(),
      unreadCount: 0,
      isActive: true,
      hasLeft: false
    };

    // Check if current user is already in participants
    const userAlreadyParticipant = participantsData.some(
      p => p.user.toString() === user.id
    );

    if (!userAlreadyParticipant) {
      participantsData.push(currentUserParticipant);
    }

    const communicationData = {
      ...validationResult.data,
      requirementId: strToObjectId(requirementId),
      participants: participantsData,
      totalMessages: 0,
    };

    // Create communication
    const newCommunication = await createOneDoc("Communication", communicationData);

    return createSuccessResponse({
      message: "Communication created successfully",
      data: newCommunication
    }, 201);

  } catch (error) {
    console.error("Error creating communication:", error);
    return createErrorResponse("Internal server error", 500);
  }
}