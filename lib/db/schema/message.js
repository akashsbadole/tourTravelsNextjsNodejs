import { Schema } from "mongoose";

const messageSchema = new Schema({
  _id: false,
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  senderType: {
    type: String,
    enum: ["user", "agent"],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  messageType: {
    type: String,
    enum: ["text", "image", "document", "link", "quote_reference"],
    default: "text",
  },
  attachments: [{
    type: String, // URLs to files
    filename: String,
    mimetype: String,
    size: Number, // in bytes
  }],
  metadata: {
    type: Schema.Types.Mixed, // Additional metadata based on message type
  },
  readAt: {
    type: Date,
  },
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    readAt: {
      type: Date,
    },
  }],
  editedAt: {
    type: Date,
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  deletedAt: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  reactions: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  replyTo: {
    type: Schema.Types.ObjectId, // Reference to another message in the same communication
  },
  mentions: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["user", "agent"],
    },
  }],
  priority: {
    type: String,
    enum: ["normal", "high", "urgent"],
    default: "normal",
  },
  tags: [{
    type: String,
  }],
  isSystemMessage: {
    type: Boolean,
    default: false,
  },
  systemMessageType: {
    type: String,
    enum: ["requirement_assigned", "quotation_sent", "quotation_accepted", "quotation_rejected", "requirement_completed", "agent_joined", "agent_left"],
  },
});

export default messageSchema;