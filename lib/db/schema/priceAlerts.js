import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

/**
 * Price Alert Conditions Schema
 * Defines the conditions under which an alert should be triggered
 */
const priceAlertConditionsSchema = new Schema({
  _id: false,
  // Percentage drop condition
  percentageDrop: {
    enabled: { type: Boolean, default: false },
    threshold: { type: Number, min: 1, max: 100 }, // Percentage drop required
  },
  // Specific price condition
  specificPrice: {
    enabled: { type: Boolean, default: false },
    targetPrice: { type: Number, min: 0 },
    currency: { type: String, default: "USD" },
  },
  // Daily change condition
  dailyChange: {
    enabled: { type: Boolean, default: false },
    minChangeAmount: { type: Number, min: 0 },
    changeType: { 
      type: String, 
      enum: ["drop", "rise", "any"], 
      default: "drop" 
    },
  },
  // Price trend condition
  priceTrend: {
    enabled: { type: Boolean, default: false },
    trendType: { 
      type: String, 
      enum: ["falling", "rising", "stable", "volatile"], 
      default: "falling" 
    },
    duration: { type: Number, min: 1 }, // Duration in hours/days
    durationUnit: { 
      type: String, 
      enum: ["hours", "days"], 
      default: "days" 
    },
  },
  // Competitive price condition
  competitivePrice: {
    enabled: { type: Boolean, default: false },
    comparisonType: { 
      type: String, 
      enum: ["cheapest", "below_average", "top_3"], 
      default: "cheapest" 
    },
    threshold: { type: Number, min: 1, max: 100 }, // Percentage threshold
  },
});

/**
 * Notification Preferences Schema
 * Defines how and when notifications should be sent
 */
const notificationPreferencesSchema = new Schema({
  _id: false,
  // Notification channels
  email: {
    enabled: { type: Boolean, default: true },
    frequency: { 
      type: String, 
      enum: ["immediate", "hourly", "daily", "weekly"], 
      default: "immediate" 
    },
    batchSize: { type: Number, default: 1 }, // Max alerts per email
  },
  push: {
    enabled: { type: Boolean, default: true },
    frequency: { 
      type: String, 
      enum: ["immediate", "hourly", "daily"], 
      default: "immediate" 
    },
  },
  sms: {
    enabled: { type: Boolean, default: false },
    frequency: { 
      type: String, 
      enum: ["immediate", "daily"], 
      default: "immediate" 
    },
    phoneNumber: String,
  },
  // Quiet hours
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: String, // HH:mm format
    endTime: String,   // HH:mm format
    timezone: { type: String, default: "UTC" },
  },
  // Maximum notifications per day
  maxNotificationsPerDay: { type: Number, default: 10 },
});

/**
 * Price Alert Schema
 * Main schema for flight price alerts
 */
const priceAlertSchema = new Schema(
  {
    // User information
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: { type: String, required: true }, // For guest users
    
    // Flight search criteria
    searchCriteria: {
      origin: {
        airportCode: { type: String, required: true },
        airportName: String,
        city: String,
        country: String,
      },
      destination: {
        airportCode: { type: String, required: true },
        airportName: String,
        city: String,
        country: String,
      },
      departureDate: {
        type: Date,
        required: true,
      },
      returnDate: Date, // For round-trip alerts
      tripType: {
        type: String,
        enum: ["oneway", "roundtrip", "multicity"],
        default: "oneway",
      },
      passengers: {
        adults: { type: Number, default: 1, min: 1 },
        children: { type: Number, default: 0, min: 0 },
        infants: { type: Number, default: 0, min: 0 },
      },
      cabinClass: {
        type: String,
        enum: ["economy", "premium_economy", "business", "first"],
        default: "economy",
      },
      airlines: [String], // Preferred airlines
      filters: {
        priceRange: {
          min: Number,
          max: Number,
        },
        departureTime: {
          start: String, // HH:mm
          end: String,   // HH:mm
        },
        arrivalTime: {
          start: String, // HH:mm
          end: String,   // HH:mm
        },
        stops: {
          type: String,
          enum: ["direct", "1_stop", "2_plus_stops", "any"],
          default: "any",
        },
        duration: {
          maxHours: Number,
        },
      },
    },
    
    // Alert conditions
    conditions: {
      type: priceAlertConditionsSchema,
      required: true,
    },
    
    // Notification preferences
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    
    // Alert status and metadata
    status: {
      type: String,
      enum: ["active", "paused", "expired", "triggered", "cancelled"],
      default: "active",
      index: true,
    },
    
    // Reference price (price when alert was created)
    referencePrice: {
      amount: { type: Number, required: true },
      currency: { type: String, default: "USD" },
      recordedAt: { type: Date, default: Date.now },
    },
    
    // Current best price
    currentBestPrice: {
      amount: Number,
      currency: { type: String, default: "USD" },
      flightId: String,
      airlineCode: String,
      recordedAt: Date,
    },
    
    // Alert lifecycle
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastTriggeredAt: Date,
    triggerCount: { type: Number, default: 0 },
    
    // Notification tracking
    notificationsSent: [{
      type: { type: String, enum: ["email", "push", "sms"] },
      sentAt: { type: Date, default: Date.now },
      price: { amount: Number, currency: String },
      flightId: String,
      success: { type: Boolean, default: true },
      error: String,
    }],
    
    // Performance metrics
    metrics: {
      totalChecks: { type: Number, default: 0 },
      lastCheckedAt: Date,
      averageCheckDuration: Number, // in milliseconds
      priceHistory: [{
        price: Number,
        currency: String,
        recordedAt: { type: Date, default: Date.now },
        flightId: String,
      }],
    },
    
    // Alert source
    source: {
      type: String,
      enum: ["manual", "search_result", "auto", "recommendation"],
      default: "manual",
    },
    
    // Sharing and social features
    sharing: {
      enabled: { type: Boolean, default: false },
      shareCode: String, // Unique code for sharing
      sharedAt: Date,
      shareCount: { type: Number, default: 0 },
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
      { userId: 1, status: 1 },
      { status: 1, expiresAt: 1 },
      { "searchCriteria.origin.airportCode": 1, "searchCriteria.destination.airportCode": 1 },
      { "searchCriteria.departureDate": 1, status: 1 },
    ],
  }
);

// Add text index for search functionality
priceAlertSchema.index({
  "searchCriteria.origin.airportCode": "text",
  "searchCriteria.destination.airportCode": "text",
  "searchCriteria.origin.city": "text",
  "searchCriteria.destination.city": "text",
});

priceAlertSchema.plugin(mongooseAutoPopulate);

export default priceAlertSchema;