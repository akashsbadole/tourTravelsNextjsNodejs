import { z } from "zod";

// Traveler info schema
const travelerInfoSchema = z.object({
  adults: z.number().min(1, "At least one adult is required"),
  children: z.number().min(0).default(0),
  infants: z.number().min(0).default(0),
  childrenAges: z.array(z.number().min(0).max(17)).optional(),
});

// Destination info schema
const destinationInfoSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  multiCity: z.array(z.object({
    city: z.string(),
    order: z.number(),
  })).optional(),
});

// Budget schema
const budgetSchema = z.object({
  min: z.number().min(0, "Minimum budget must be positive"),
  max: z.number().min(0, "Maximum budget must be positive"),
  currency: z.string().default("USD"),
});

// Travel dates schema
const travelDatesSchema = z.object({
  departureDate: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate > new Date();
  }, "Departure date must be a valid future date"),
  returnDate: z.string().optional(),
  flexibleDates: z.boolean().default(false),
  dateFlexibility: z.number().min(1).max(30).optional(),
});

// Preferences schema
const preferencesSchema = z.object({
  accommodationType: z.array(z.enum([
    "hotel", "apartment", "villa", "resort", "hostel"
  ])).optional(),
  flightClass: z.array(z.enum([
    "economy", "premium_economy", "business", "first"
  ])).optional(),
  mealPreference: z.enum([
    "vegetarian", "vegan", "halal", "kosher", "none"
  ]).optional(),
  transportation: z.enum([
    "flight", "train", "bus", "car_rental", "mixed"
  ]).optional(),
  activities: z.array(z.string()).optional(),
  specialRequirements: z.array(z.string()).optional(),
});

// Create travel requirement schema
export const createTravelRequirementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().min(1, "Description is required").max(2000, "Description must be less than 2000 characters"),
  category: z.enum(["flight", "hotel", "package", "custom"]),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  destinationInfo: destinationInfoSchema,
  travelDates: travelDatesSchema,
  travelerInfo: travelerInfoSchema,
  budget: budgetSchema,
  preferences: preferencesSchema.optional(),
  deadline: z.string().optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    type: z.string(),
    description: z.string().optional(),
  })).optional(),
  isPublic: z.boolean().default(false),
});

// Update travel requirement schema
export const updateTravelRequirementSchema = createTravelRequirementSchema.partial();

// Travel requirement filter schema for listing
export const travelRequirementFilterSchema = z.object({
  category: z.enum(["flight", "hotel", "package", "custom"]).optional(),
  status: z.enum(["draft", "published", "assigned", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  destination: z.string().optional(),
  minBudget: z.number().min(0).optional(),
  maxBudget: z.number().min(0).optional(),
  departureDateFrom: z.string().optional(),
  departureDateTo: z.string().optional(),
  assignedAgent: z.string().optional(),
  isPublic: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["createdAt", "departureDate", "budget", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Assign agent schema
export const assignAgentSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
});