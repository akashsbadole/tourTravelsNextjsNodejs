import { requireAuth, requireAgentAuth, createErrorResponse, createSuccessResponse, checkResourceOwnership } from "@/lib/middleware/auth";
import { getOneDoc, updateOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";
import { assignAgentSchema } from "@/lib/zodSchemas/travelRequirementValidation";

export async function POST(req, { params }) {
  try {
    // Authenticate user (can be either requirement owner or agent)
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;
    const { id } = params;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = assignAgentSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const { agentId } = validationResult.data;

    // Check if requirement exists
    const existingRequirement = await getOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(id) }
    );

    if (!existingRequirement) {
      return createErrorResponse("Travel requirement not found", 404);
    }

    // Check if user owns the requirement
    const isOwner = checkResourceOwnership(user.id, existingRequirement.userId);
    if (!isOwner) {
      return createErrorResponse("Only the requirement owner can assign agents", 403);
    }

    // Check if requirement is in a status that allows assignment
    if (!["draft", "published"].includes(existingRequirement.status)) {
      return createErrorResponse("Cannot assign agent to requirement in current status", 400);
    }

    // Check if agent exists and is verified
    const agentProfile = await getOneDoc(
      "AgentProfile",
      { 
        _id: strToObjectId(agentId),
        verificationStatus: "verified",
        isActive: true
      }
    );

    if (!agentProfile) {
      return createErrorResponse("Agent not found or not verified", 404);
    }

    // Assign agent to requirement
    await updateOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(id) },
      { 
        $set: {
          assignedAgent: strToObjectId(agentId),
          assignedAt: new Date(),
          status: "assigned"
        }
      }
    );

    // Get updated requirement
    const updatedRequirement = await getOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(id) },
      ["requirement"]
    );

    return createSuccessResponse({
      message: "Agent assigned successfully",
      data: updatedRequirement
    });

  } catch (error) {
    console.error("Error assigning agent to travel requirement:", error);
    return createErrorResponse("Internal server error", 500);
  }
}