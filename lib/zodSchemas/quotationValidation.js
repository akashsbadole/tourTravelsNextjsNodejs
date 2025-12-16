import { z } from "zod";

// Pricing item schema
const pricingItemSchema = z.object({
  category: z.enum(["flight", "hotel", "transport", "activity", "insurance", "visa", "other"]),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  totalPrice: z.number().min(0, "Total price must be positive"),
  currency: z.string().default("USD"),
  details: z.any().optional(),
});

// Pricing summary schema
const pricingSummarySchema = z.object({
  subtotal: z.number().min(0, "Subtotal must be positive"),
  tax: z.number().min(0, "Tax must be positive").default(0),
  serviceFee: z.number().min(0, "Service fee must be positive").default(0),
  commission: z.number().min(0, "Commission must be positive").default(0),
  discount: z.number().min(0, "Discount must be positive").default(0),
  total: z.number().min(0, "Total must be positive"),
  currency: z.string().default("USD"),
});

// Terms and conditions schema
const termsAndConditionsSchema = z.object({
  paymentTerms: z.string().min(1, "Payment terms are required"),
  cancellationPolicy: z.string().min(1, "Cancellation policy is required"),
  refundPolicy: z.string().min(1, "Refund policy is required"),
  amendmentPolicy: z.string().optional(),
  validityPeriod: z.string().min(1, "Validity period is required"),
  additionalTerms: z.array(z.string()).optional(),
});

// Validity period schema
const validityPeriodSchema = z.object({
  startsAt: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate >= new Date();
  }, "Start date must be a valid current or future date"),
  endsAt: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate > new Date();
  }, "End date must be a valid future date"),
});

// Create quotation schema
export const createQuotationSchema = z.object({
  requirementId: z.string().min(1, "Requirement ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().min(1, "Description is required").max(2000, "Description must be less than 2000 characters"),
  items: z.array(pricingItemSchema).min(1, "At least one item is required"),
  pricing: pricingSummarySchema,
  termsAndConditions: termsAndConditionsSchema,
  validityPeriod: validityPeriodSchema,
  itinerary: z.string().max(5000, "Itinerary must be less than 5000 characters").optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    type: z.string(),
    description: z.string().optional(),
  })).optional(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
});

// Update quotation schema
export const updateQuotationSchema = createQuotationSchema.partial();

// Quotation filter schema for listing
export const quotationFilterSchema = z.object({
  requirementId: z.string().optional(),
  agentId: z.string().optional(),
  status: z.enum(["draft", "sent", "viewed", "accepted", "rejected", "expired", "withdrawn"]).optional(),
  minTotal: z.number().min(0).optional(),
  maxTotal: z.number().min(0).optional(),
  validityFrom: z.string().optional(),
  validityTo: z.string().optional(),
  isRecommended: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["createdAt", "total", "validityPeriod", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Send quotation schema
export const sendQuotationSchema = z.object({
  message: z.string().max(1000, "Message must be less than 1000 characters").optional(),
});

// Respond to quotation schema
export const respondQuotationSchema = z.object({
  response: z.enum(["accepted", "rejected"]),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
});