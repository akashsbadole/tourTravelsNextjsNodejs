import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

/**
 * Notification Content Schema
 * Defines the content of a notification
 */
const notificationContentSchema = new Schema({
  _id: false,
  subject: { type: String, required: true },
  body: { type: String, required: true },
  template: String, // Template name used
  variables: {
    type: Schema.Types.Mixed,
    default: {},
  },
  personalization: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

/**
 * Notification Delivery Schema
 * Tracks delivery information for each channel
 */
const notificationDeliverySchema = new Schema({
  _id: false,
  channel: {
    type: String,
    enum: ["email", "push", "sms", "webhook"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "sent", "delivered", "failed", "bounced", "opened", "clicked"],
    default: "pending",
  },
  sentAt: Date,
  deliveredAt: Date,
  openedAt: Date,
  clickedAt: Date,
  failedAt: Date,
  failureReason: String,
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  nextRetryAt: Date,
  externalId: String, // External service ID (e.g., Mailjet message ID)
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

/**
 * Notification Tracking Schema
 * Main schema for tracking all notifications sent by the system
 */
const notificationTrackingSchema = new Schema(
  {
    // Notification identification
    notificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Related entities
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    alertId: {
      type: Schema.Types.ObjectId,
      ref: "PriceAlert",
      required: true,
      index: true,
    },
    priceHistoryId: {
      type: Schema.Types.ObjectId,
      ref: "PriceHistory",
      index: true,
    },
    
    // Recipient information
    recipient: {
      email: String,
      phoneNumber: String,
      pushToken: String,
      webhookUrl: String,
    },
    
    // Notification content
    content: {
      type: notificationContentSchema,
      required: true,
    },
    
    // Notification type and priority
    type: {
      type: String,
      enum: [
        "price_drop",
        "price_alert_created",
        "price_alert_expiring",
        "price_trend_change",
        "competitive_price",
        "daily_digest",
        "weekly_summary",
      ],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    
    // Delivery information
    delivery: [notificationDeliverySchema],
    
    // Notification status
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    
    // Scheduling
    scheduledAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: Date,
    completedAt: Date,
    
    // Batch information (for digest notifications)
    batch: {
      id: String,
      size: Number,
      position: Number,
    },
    
    // Flight information context
    flightContext: {
      flightId: String,
      flightCode: String,
      airlineCode: String,
      route: {
        origin: {
          airportCode: String,
          city: String,
        },
        destination: {
          airportCode: String,
          city: String,
        },
      },
      departureDate: Date,
      price: {
        amount: Number,
        currency: String,
      },
      priceChange: {
        amount: Number,
        percentage: Number,
        previousPrice: Number,
      },
    },
    
    // Performance metrics
    metrics: {
      totalDeliveryTime: Number, // in milliseconds
      channelResponseTimes: [{
        channel: String,
        responseTime: Number, // in milliseconds
      }],
      engagement: {
        opened: { type: Boolean, default: false },
        openedAt: Date,
        clicked: { type: Boolean, default: false },
        clickedAt: Date,
        clickCount: { type: Number, default: 0 },
      },
      cost: {
        amount: Number,
        currency: { type: String, default: "USD" },
      },
    },
    
    // Error handling
    errors: [{
      type: {
        type: String,
        enum: ["validation", "delivery", "template", "rate_limit", "system"],
      },
      message: String,
      code: String,
      occurredAt: { type: Date, default: Date.now },
      resolved: { type: Boolean, default: false },
      resolvedAt: Date,
    }],
    
    // User preferences applied
    userPreferences: {
      channels: [{
        type: String,
        enum: ["email", "push", "sms", "webhook"],
      }],
      quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: String,
        endTime: String,
        timezone: String,
      },
      frequency: {
        type: String,
        enum: ["immediate", "hourly", "daily", "weekly"],
      },
      maxPerDay: Number,
    },
    
    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    // Add compound indexes for performance
    index: [
      { status: 1, scheduledAt: 1 },
      { alertId: 1, status: 1 },
      { type: 1, status: 1 },
      { userId: 1, scheduledAt: -1 },
      { "delivery.channel": 1, "delivery.status": 1 },
      { "flightContext.departureDate": 1, type: 1 },
    ],
  }
);

// TTL index for automatic cleanup (1 year)
notificationTrackingSchema.index(
  { createdAt: 1 }, 
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// Add text index for search functionality
notificationTrackingSchema.index({
  "content.subject": "text",
  "content.body": "text",
  "flightContext.flightCode": "text",
  "flightContext.route.origin.airportCode": "text",
  "flightContext.route.destination.airportCode": "text",
});

notificationTrackingSchema.plugin(mongooseAutoPopulate);

export default notificationTrackingSchema;