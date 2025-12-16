import { requireAuth, createErrorResponse, createSuccessResponse } from "@/lib/middleware/auth";
import { createOneDoc, getManyDocs } from "@/lib/db";
import { countDocs } from "@/lib/db/utilsDB";
import { strToObjectId } from "@/lib/db/utilsDB";
import { 
  createTravelRequirementSchema, 
  travelRequirementFilterSchema 
} from "@/lib/zodSchemas/travelRequirementValidation";

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
    const validationResult = travelRequirementFilterSchema.safeParse(query);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const {
      category,
      status,
      priority,
      destination,
      minBudget,
      maxBudget,
      departureDateFrom,
      departureDateTo,
      assignedAgent,
      isPublic,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = validationResult.data;

    // Build filter
    const filter = {
      userId: strToObjectId(user.id)
    };

    // Add category filter
    if (category) {
      filter.category = category;
    }

    // Add status filter
    if (status) {
      filter.status = status;
    }

    // Add priority filter
    if (priority) {
      filter.priority = priority;
    }

    // Add destination filter
    if (destination) {
      filter["destinationInfo.destination"] = { $regex: destination, $options: "i" };
    }

    // Add budget filter
    if (minBudget !== undefined || maxBudget !== undefined) {
      filter["budget.min"] = {};
      if (minBudget !== undefined) filter["budget.min"].$gte = minBudget;
      if (maxBudget !== undefined) filter["budget.max"].$lte = maxBudget;
    }

    // Add departure date filter
    if (departureDateFrom || departureDateTo) {
      filter["travelDates.departureDate"] = {};
      if (departureDateFrom) {
        filter["travelDates.departureDate"].$gte = new Date(departureDateFrom);
      }
      if (departureDateTo) {
        filter["travelDates.departureDate"].$lte = new Date(departureDateTo);
      }
    }

    // Add assigned agent filter
    if (assignedAgent) {
      filter.assignedAgent = strToObjectId(assignedAgent);
    }

    // Add public filter
    if (isPublic !== undefined) {
      filter.isPublic = isPublic;
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get requirements with pagination
    const requirements = await getManyDocs(
      "TravelRequirement",
      filter,
      ["requirements", `page:${page}`, `limit:${limit}`],
      false,
      {
        sort: sortOptions,
        skip,
        limit
      }
    );

    // Get total count for pagination
    const totalCount = await countDocs("TravelRequirement", filter);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return createSuccessResponse({
      data: requirements,
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
    console.error("Error listing travel requirements:", error);
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
    const validationResult = createTravelRequirementSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message);
      return createErrorResponse(`Validation error: ${errorMessages.join(", ")}`, 400);
    }

    const requirementData = {
      ...validationResult.data,
      userId: strToObjectId(user.id),
      travelDates: {
        ...validationResult.data.travelDates,
        departureDate: new Date(validationResult.data.travelDates.departureDate),
        returnDate: validationResult.data.travelDates.returnDate 
          ? new Date(validationResult.data.travelDates.returnDate) 
          : undefined,
      },
      deadline: validationResult.data.deadline 
        ? new Date(validationResult.data.deadline) 
        : undefined,
    };

    // Create travel requirement
    const newRequirement = await createOneDoc("TravelRequirement", requirementData);

    return createSuccessResponse({
      message: "Travel requirement created successfully",
      data: newRequirement
    }, 201);

  } catch (error) {
    console.error("Error creating travel requirement:", error);
    return createErrorResponse("Internal server error", 500);
  }
}