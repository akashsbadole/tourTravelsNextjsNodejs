import { Schema } from "mongoose";

const userBehaviorSchema = new Schema({
  _id: false,
  eventType: {
    type: String,
    enum: [
      'page_view',
      'search',
      'click',
      'booking_initiated',
      'booking_completed',
      'booking_cancelled',
      'favorite_added',
      'favorite_removed',
      'filter_applied',
      'sort_changed',
      'session_start',
      'session_end',
      'login',
      'logout',
      'signup',
      'profile_view',
      'profile_update',
      'payment_initiated',
      'payment_completed',
      'payment_failed'
    ],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  sessionId: { type: String, required: true },
  page: { type: String, required: true },
  referrer: { type: String },
  userAgent: { type: String },
  ipAddress: { type: String },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  browser: { type: String },
  os: { type: String },
  location: {
    country: { type: String },
    city: { type: String },
    timezone: { type: String }
  },
  metadata: { type: Schema.Types.Mixed }, // Additional event-specific data
  duration: { type: Number }, // Time spent on page in milliseconds
  scrollDepth: { type: Number }, // How far user scrolled (0-100)
  viewport: {
    width: { type: Number },
    height: { type: Number }
  }
});

const userSessionSchema = new Schema({
  _id: false,
  sessionId: { type: String, required: true, unique: true },
  startTime: { type: Date, default: Date.now, required: true },
  endTime: { type: Date },
  duration: { type: Number }, // Session duration in milliseconds
  pageViews: { type: Number, default: 0 },
  events: { type: Number, default: 0 },
  bounceRate: { type: Boolean, default: false }, // true if only one page view
  entryPage: { type: String },
  exitPage: { type: String },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  browser: { type: String },
  os: { type: String },
  location: {
    country: { type: String },
    city: { type: String },
    timezone: { type: String }
  },
  referrer: { type: String },
  utm: {
    source: { type: String },
    medium: { type: String },
    campaign: { type: String },
    term: { type: String },
    content: { type: String }
  }
});

const userJourneySchema = new Schema({
  _id: false,
  journeyId: { type: String, required: true, unique: true },
  startTime: { type: Date, default: Date.now, required: true },
  endTime: { type: Date },
  goal: {
    type: String,
    enum: ['flight_booking', 'hotel_booking', 'flight_search', 'hotel_search', 'signup', 'profile_completion'],
    required: true
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress'
  },
  steps: [{
    step: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    duration: { type: Number }, // Time spent on this step
    page: { type: String },
    metadata: { type: Schema.Types.Mixed }
  }],
  conversionValue: { type: Number, default: 0 }, // Monetary value if converted
  conversionProbability: { type: Number, default: 0 }, // Predicted conversion probability
  dropOffPoint: { type: String }, // Where user abandoned the journey
  totalDuration: { type: Number } // Total journey duration in milliseconds
});

const userEngagementMetricsSchema = new Schema({
  _id: false,
  date: { type: Date, required: true },
  sessions: { type: Number, default: 0 },
  pageViews: { type: Number, default: 0 },
  uniquePageViews: { type: Number, default: 0 },
  averageSessionDuration: { type: Number, default: 0 }, // in milliseconds
  bounceRate: { type: Number, default: 0 }, // percentage
  eventsPerSession: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 }, // percentage
  goalCompletions: { type: Number, default: 0 },
  timeOnSite: { type: Number, default: 0 }, // in milliseconds
  newVsReturning: {
    new: { type: Number, default: 0 },
    returning: { type: Number, default: 0 }
  },
  deviceBreakdown: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  },
  topPages: [{
    page: { type: String },
    views: { type: Number },
    uniqueViews: { type: Number },
    averageTime: { type: Number }
  }],
  topEvents: [{
    eventType: { type: String },
    count: { type: Number }
  }]
});

const userAnalyticsSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true
  },
  consent: {
    analytics: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false },
    personalization: { type: Boolean, default: false },
    consentDate: { type: Date },
    consentVersion: { type: String, default: "1.0" }
  },
  behaviors: [userBehaviorSchema],
  sessions: [userSessionSchema],
  journeys: [userJourneySchema],
  engagementMetrics: [userEngagementMetricsSchema],
  aggregatedMetrics: {
    totalSessions: { type: Number, default: 0 },
    totalPageViews: { type: Number, default: 0 },
    totalEvents: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
    firstActivity: { type: Date, default: Date.now },
    totalValue: { type: Number, default: 0 }, // Total monetary value generated
    favoriteCategories: [{ type: String }], // Most searched/booked categories
    preferredDestinations: [{ type: String }],
    priceSensitivity: {
      type: String,
      enum: ['budget', 'mid_range', 'premium', 'luxury'],
      default: 'mid_range'
    },
    bookingFrequency: {
      type: String,
      enum: ['rare', 'occasional', 'regular', 'frequent'],
      default: 'occasional'
    },
    loyaltyScore: { type: Number, default: 0, min: 0, max: 100 },
    churnRisk: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    content: {
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'USD' },
      timezone: { type: String }
    },
    travel: {
      preferredAirlines: [{ type: String }],
      preferredHotels: [{ type: String }],
      travelClass: {
        type: String,
        enum: ['economy', 'premium_economy', 'business', 'first'],
        default: 'economy'
      },
      roomType: {
        type: String,
        enum: ['standard', 'deluxe', 'suite', 'presidential'],
        default: 'standard'
      }
    }
  },
  privacy: {
    dataRetentionPeriod: { type: Number, default: 365 }, // days
    anonymizedAt: { type: Date },
    deletedAt: { type: Date },
    dataProcessingConsent: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Indexes for performance
userAnalyticsSchema.index({ userId: 1 });
userAnalyticsSchema.index({ "behaviors.timestamp": -1 });
userAnalyticsSchema.index({ "sessions.startTime": -1 });
userAnalyticsSchema.index({ "engagementMetrics.date": -1 });
userAnalyticsSchema.index({ "aggregatedMetrics.lastActivity": -1 });
userAnalyticsSchema.index({ "consent.analytics": 1 });

export default userAnalyticsSchema;