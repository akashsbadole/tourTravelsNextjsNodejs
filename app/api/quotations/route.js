import { requireAuth, requireAgentAuth, createErrorResponse, createSuccessResponse, checkResourceOwnership } from "@/lib/middleware/auth";
import { createOneDoc, getManyDocs } from "@/lib/db";
import { countDocs } from "@/lib/db/utilsDB";
import { strToObjectId } from "@/lib/db/utilsDB";
import { 
  createQuotationSchema, 
  quotationFilterSchema 
} from "@/lib/zodSchemas/quotationValidation";

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
    const validationResult = quotationFilterSchema.safeParse(query);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const {
      requirementId,
      agentId,
      status,
      minTotal,
      maxTotal,
      validityFrom,
      validityTo,
      isRecommended,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = validationResult.data;

    // Build filter
    const filter = {
      userId: strToObjectId(user.id)
    };

    // Add requirement filter
    if (requirementId) {
      filter.requirementId = strToObjectId(requirementId);
    }

    // Add agent filter
    if (agentId) {
      filter.agentId = strToObjectId(agentId);
    }

    // Add status filter
    if (status) {
      filter.status = status;
    }

    // Add total price filter
    if (minTotal !== undefined || maxTotal !== undefined) {
      filter["pricing.total"] = {};
      if (minTotal !== undefined) filter["pricing.total"].$gte = minTotal;
      if (maxTotal !== undefined) filter["pricing.total"].$lte = maxTotal;
    }

    // Add validity period filter
    if (validityFrom || validityTo) {
      filter["validityPeriod.endsAt"] = {};
      if (validityFrom) {
        filter["validityPeriod.endsAt"].$gte = new Date(validityFrom);
      }
      if (validityTo) {
        filter["validityPeriod.endsAt"].$lte = new Date(validityTo);
      }
    }

    // Add recommended filter
    if (isRecommended !== undefined) {
      filter.isRecommended = isRecommended;
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get quotations with pagination
    const quotations = await getManyDocs(
      "Quotation",
      filter,
      ["quotations", `page:${page}`, `limit:${limit}`],
      false,
      {
        sort: sortOptions,
        skip,
        limit
      }
    );

    // Get total count for pagination
    const totalCount = await countDocs("Quotation", filter);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return createSuccessResponse({
      data: quotations,
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
    console.error("Error listing quotations:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function POST(req) {
  try {
    // Authenticate as agent
    const authResult = await requireAgentAuth();
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { user, agentProfile } = authResult;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = createQuotationSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const { requirementId } = validationResult.data;

    // Check if requirement exists and is assigned to this agent
    const { getOneDoc } = await import("@/lib/db/getOperationDB");
    const requirement = await getOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(requirementId) }
    );

    if (!requirement) {
      return createErrorResponse("Travel requirement not found", 404);
    }

    const isAssignedAgent = checkResourceOwnership(agentProfile._id.toString(), requirement.assignedAgent);
    if (!isAssignedAgent) {
      return createErrorResponse("Quotation can only be created for requirements assigned to you", 403);
    }

    // Check if requirement is in a status that allows quotation
    if (!["assigned", "in_progress"].includes(requirement.status)) {
      return createErrorResponse("Cannot create quotation for requirement in current status", 400);
    }

    const quotationData = {
      ...validationResult.data,
      requirementId: strToObjectId(requirementId),
      agentId: strToObjectId(agentProfile._id.toString()),
      userId: strToObjectId(requirement.userId),
      validityPeriod: {
        startsAt: new Date(validationResult.data.validityPeriod.startsAt),
        endsAt: new Date(validationResult.data.validityPeriod.endsAt),
      },
    };

    // Create quotation
    const newQuotation = await createOneDoc("Quotation", quotationData);

    // Update requirement's quotes received count
    const { updateOneDoc } = await import("@/lib/db/updateOperationDB");
    await updateOneDoc(
      "TravelRequirement",
      { _id: strToObjectId(requirementId) },
      { $inc: { quotesReceived: 1 } }
    );

    return createSuccessResponse({
      message: "Quotation created successfully",
      data: newQuotation
    }, 201);

  } catch (error) {
    console.error("Error creating quotation:", error);
    return createErrorResponse("Internal server error", 500);
  }
}