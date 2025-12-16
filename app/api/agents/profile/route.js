import { requireAuth, createErrorResponse, createSuccessResponse } from "@/lib/middleware/auth";
import { createOneDoc, getOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";
import { createAgentProfileSchema } from "@/lib/zodSchemas/agentProfileValidation";

export async function POST(req) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;

    // Check if agent profile already exists for this user
    const existingProfile = await getOneDoc(
      "AgentProfile",
      { userId: strToObjectId(user.id) }
    );

    if (existingProfile) {
      return createErrorResponse("Agent profile already exists for this user", 409);
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = createAgentProfileSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const profileData = {
      ...validationResult.data,
      userId: strToObjectId(user.id),
      licenseExpiryDate: new Date(validationResult.data.licenseExpiryDate),
    };

    // Create agent profile
    const newProfile = await createOneDoc("AgentProfile", profileData);

    return createSuccessResponse({
      message: "Agent profile created successfully",
      data: newProfile
    }, 201);

  } catch (error) {
    console.error("Error creating agent profile:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function GET(req) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;

    // Get agent profile for current user
    const profile = await getOneDoc(
      "AgentProfile",
      { userId: strToObjectId(user.id) },
      ["agentProfile"]
    );

    if (!profile) {
      return createErrorResponse("Agent profile not found", 404);
    }

    return createSuccessResponse({
      data: profile
    });

  } catch (error) {
    console.error("Error getting agent profile:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function PUT(req) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user } = authResult;

    // Check if agent profile exists for this user
    const existingProfile = await getOneDoc(
      "AgentProfile",
      { userId: strToObjectId(user.id) }
    );

    if (!existingProfile) {
      return createErrorResponse("Agent profile not found", 404);
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = createAgentProfileSchema.partial().safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const updateData = { ...validationResult.data };
    
    // Convert date fields if present
    if (updateData.licenseExpiryDate) {
      updateData.licenseExpiryDate = new Date(updateData.licenseExpiryDate);
    }

    // Update agent profile
    const { updateOneDoc } = await import("@/lib/db/updateOperationDB");
    await updateOneDoc(
      "AgentProfile",
      { userId: strToObjectId(user.id) },
      { $set: updateData }
    );

    // Get updated profile
    const updatedProfile = await getOneDoc(
      "AgentProfile",
      { userId: strToObjectId(user.id) },
      ["agentProfile"]
    );

    return createSuccessResponse({
      message: "Agent profile updated successfully",
      data: updatedProfile
    });

  } catch (error) {
    console.error("Error updating agent profile:", error);
    return createErrorResponse("Internal server error", 500);
  }
}