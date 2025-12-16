import { auth } from "@/lib/auth";
import { getOneDoc } from "@/lib/db/getOperationDB";
import { strToObjectId } from "@/lib/db/utilsDB";

/**
 * Authentication middleware to verify user session
 * @returns {Promise<Object|null>} User object if authenticated, null otherwise
 */
export async function authenticate() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }
    return session.user;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

/**
 * Authorization middleware to check if user is an agent
 * @param {string} userId - User ID to check
 * @returns {Promise<Object|null>} Agent profile if user is an agent, null otherwise
 */
export async function authorizeAgent(userId) {
  try {
    if (!userId) return null;
    
    const agentProfile = await getOneDoc(
      "AgentProfile",
      { 
        userId: strToObjectId(userId),
        verificationStatus: "verified",
        isActive: true
      },
      ["agentProfile"]
    );
    
    return agentProfile || null;
  } catch (error) {
    console.error("Agent authorization error:", error);
    return null;
  }
}

/**
 * Authorization middleware to check resource ownership
 * @param {string} userId - User ID to check
 * @param {string} resourceUserId - Resource owner's user ID
 * @returns {boolean} True if user owns the resource
 */
export function checkResourceOwnership(userId, resourceUserId) {
  return userId && resourceUserId && userId === resourceUserId.toString();
}

/**
 * Middleware to protect API routes that require authentication
 * @returns {Promise<Object>} Response object with user data or error
 */
export async function requireAuth() {
  const user = await authenticate();
  
  if (!user) {
    return {
      success: false,
      error: "Authentication required",
      status: 401
    };
  }
  
  return {
    success: true,
    user
  };
}

/**
 * Middleware to protect API routes that require agent authentication
 * @returns {Promise<Object>} Response object with agent data or error
 */
export async function requireAgentAuth() {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }
  
  const agentProfile = await authorizeAgent(authResult.user.id);
  
  if (!agentProfile) {
    return {
      success: false,
      error: "Agent authentication required or agent not verified",
      status: 403
    };
  }
  
  return {
    success: true,
    user: authResult.user,
    agentProfile
  };
}

/**
 * Create a standardized error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response} Error response object
 */
export function createErrorResponse(message, status = 500) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Create a standardized success response
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response} Success response object
 */
export function createSuccessResponse(data, status = 200) {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}