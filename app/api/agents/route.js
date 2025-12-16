import { createErrorResponse, createSuccessResponse } from "@/lib/middleware/auth";
import { getManyDocs } from "@/lib/db";
import { agentFilterSchema } from "@/lib/zodSchemas/agentProfileValidation";

export async function GET(req) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validationResult = agentFilterSchema.safeParse(query);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const {
      specialties,
      minRating,
      maxRating,
      verificationStatus = "verified",
      isActive = true,
      page = 1,
      limit = 10,
      sortBy = "rating",
      sortOrder = "desc"
    } = validationResult.data;

    // Build filter
    const filter = {
      verificationStatus,
      isActive
    };

    // Add rating filter
    if (minRating !== undefined || maxRating !== undefined) {
      filter.rating = {};
      if (minRating !== undefined) filter.rating.$gte = minRating;
      if (maxRating !== undefined) filter.rating.$lte = maxRating;
    }

    // Add specialties filter
    if (specialties && specialties.length > 0) {
      filter.specialties = { $in: specialties };
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get agents with pagination
    const agents = await getManyDocs(
      "AgentProfile",
      filter,
      ["agents", `page:${page}`, `limit:${limit}`],
      false,
      {
        sort: sortOptions,
        skip,
        limit
      }
    );

    // Get total count for pagination
    const { countDocs } = await import("@/lib/db/utilsDB");
    const totalCount = await countDocs("AgentProfile", filter);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return createSuccessResponse({
      data: agents,
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
    console.error("Error listing agents:", error);
    return createErrorResponse("Internal server error", 500);
  }
}