import { z } from "zod";

// Participant schema
const participantSchema = z.object({
  user: z.string().min(1, "User ID is required"),
  userType: z.enum(["user", "agent"]),
});

// Create communication schema
export const createCommunicationSchema = z.object({
  requirementId: z.string().min(1, "Requirement ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  participants: z.array(participantSchema).min(1, "At least one participant is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  tags: z.array(z.string()).optional(),
  metadata: z.any().optional(),
});

// Communication filter schema for listing
export const communicationFilterSchema = z.object({
  requirementId: z.string().optional(),
  status: z.enum(["active", "archived", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  participantType: z.enum(["user", "agent"]).optional(),
  participantId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["createdAt", "lastMessageAt", "priority"]).default("lastMessageAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Message schema
export const createMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(2000, "Message content must be less than 2000 characters"),
  messageType: z.enum(["text", "image", "document", "link", "quote_reference"]).default("text"),
  attachments: z.array(z.object({
    type: z.string(),
    filename: z.string(),
    mimetype: z.string(),
    size: z.number(),
  })).optional(),
  metadata: z.any().optional(),
  replyTo: z.string().optional(),
  mentions: z.array(z.object({
    user: z.string(),
    type: z.enum(["user", "agent"]),
  })).optional(),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
  tags: z.array(z.string()).optional(),
});

// Mark as read schema
export const markAsReadSchema = z.object({
  messageIds: z.array(z.string()).optional(), // Specific message IDs to mark as read
  markAll: z.boolean().default(false), // Mark all messages as read
});