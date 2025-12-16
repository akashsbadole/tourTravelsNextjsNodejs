import { z } from "zod";

// Commission settings schema
const commissionSettingsSchema = z.object({
  flightCommission: z.number().min(0).max(100).default(0),
  hotelCommission: z.number().min(0).max(100).default(0),
  packageCommission: z.number().min(0).max(100).default(0),
  customCommission: z.number().min(0).max(100).default(0),
});

// Contact details schema
const contactDetailsSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  alternatePhone: z.string().optional(),
  officeAddress: z.string().min(1, "Office address is required"),
  website: z.string().url().optional().or(z.literal("")),
});

// Working hours schema
const workingHoursSchema = z.object({
  monday: z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().default(false),
  }),
  tuesday: z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().default(false),
  }),
  wednesday: z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().default(false),
  }),
  thursday: z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().default(false),
  }),
  friday: z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().default(false),
  }),
  saturday: z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().default(false),
  }),
  sunday: z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().default(false),
  }),
});

// Create agent profile schema
export const createAgentProfileSchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseExpiryDate: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate > new Date();
  }, "License expiry date must be a valid future date"),
  experience: z.number().min(0, "Experience must be a positive number"),
  specialties: z.array(z.enum([
    "flights", "hotels", "packages", "corporate", "luxury", "adventure", "medical", "education"
  ])).min(1, "At least one specialty is required"),
  contactDetails: contactDetailsSchema,
  verificationDocuments: z.array(z.string().url()).optional(),
  commissionSettings: commissionSettingsSchema.optional(),
  bio: z.string().max(1000, "Bio must be less than 1000 characters").optional(),
  languages: z.array(z.string()).optional(),
  workingHours: workingHoursSchema.optional(),
});

// Update agent profile schema
export const updateAgentProfileSchema = createAgentProfileSchema.partial();

// Agent filter schema for listing
export const agentFilterSchema = z.object({
  specialties: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxRating: z.number().min(0).max(5).optional(),
  verificationStatus: z.enum(["pending", "verified", "rejected", "suspended"]).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["rating", "experience", "createdAt"]).default("rating"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});