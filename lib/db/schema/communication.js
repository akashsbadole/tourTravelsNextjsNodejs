import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";
import messageSchema from "./message";

const communicationSchema = new Schema(
  {
    requirementId: {
      type: Schema.Types.ObjectId,
      ref: "TravelRequirement",
      required: true,
      autopopulate: true,
    },
    participants: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        autopopulate: true,
      },
      userType: {
        type: String,
        enum: ["user", "agent"],
        required: true,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      lastReadAt: {
        type: Date,
      },
      unreadCount: {
        type: Number,
        default: 0,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      hasLeft: {
        type: Boolean,
        default: false,
      },
      leftAt: {
        type: Date,
      },
    }],
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ["active", "archived", "closed"],
      default: "active",
    },
    messages: [messageSchema],
    lastMessageAt: {
      type: Date,
    },
    lastMessagePreview: {
      type: String,
      maxlength: 100,
    },
    metadata: {
      type: Schema.Types.Mixed, // Additional metadata for the communication
    },
    tags: [{
      type: String,
    }],
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    escalationLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    escalatedTo: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      escalatedAt: {
        type: Date,
        default: Date.now,
      },
      reason: {
        type: String,
        maxlength: 500,
      },
    }],
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    satisfactionFeedback: {
      type: String,
      maxlength: 1000,
    },
    resolutionTime: {
      type: Number, // in minutes
    },
    firstResponseTime: {
      type: Number, // in minutes
    },
    averageResponseTime: {
      type: Number, // in minutes
    },
    totalMessages: {
      type: Number,
      default: 0,
    },
    archivedAt: {
      type: Date,
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    closedAt: {
      type: Date,
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    closeReason: {
      type: String,
      maxlength: 500,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    autoReplyEnabled: {
      type: Boolean,
      default: false,
    },
    autoReplyMessage: {
      type: String,
      maxlength: 500,
    },
    scheduledMessages: [{
      message: messageSchema,
      scheduledFor: {
        type: Date,
        required: true,
      },
      sentAt: {
        type: Date,
      },
      status: {
        type: String,
        enum: ["pending", "sent", "failed", "cancelled"],
        default: "pending",
      },
    }],
  },
  {
    timestamps: true,
  }
);

communicationSchema.index({ requirementId: 1 });
communicationSchema.index({ "participants.user": 1 });
communicationSchema.index({ status: 1 });
communicationSchema.index({ priority: 1 });
communicationSchema.index({ lastMessageAt: -1 });
communicationSchema.index({ createdAt: -1 });
communicationSchema.index({ escalationLevel: 1 });
communicationSchema.plugin(mongooseAutoPopulate);

export default communicationSchema;