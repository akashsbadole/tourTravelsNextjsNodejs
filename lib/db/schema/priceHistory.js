import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

/**
 * Price Point Schema
 * Represents a single price point in the history
 */
const pricePointSchema = new Schema({
  _id: false,
  price: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  recordedAt: { type: Date, default: Date.now },
  source: {
    type: String,
    enum: ["api", "cache", "manual", "provider"],
    default: "api",
  },
  provider: String, // Flight provider name
  flightId: String, // Internal flight ID
  availability: {
    totalSeats: Number,
    availableSeats: Number,
    bookedSeats: Number,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

/**
 * Price Trend Analysis Schema
 * Stores calculated trend information
 */
const priceTrendAnalysisSchema = new Schema({
  _id: false,
  trend: {
    type: String,
    enum: ["rising", "falling", "stable", "volatile"],
    default: "stable",
  },
  confidence: { type: Number, min: 0, max: 1 }, // Confidence score 0-1
  changeRate: Number, // Price change rate per day
  volatility: Number, // Price volatility index
  prediction: {
    nextDayPrice: Number,
    nextWeekPrice: Number,
    confidence: { type: Number, min: 0, max: 1 },
  },
  lastAnalyzedAt: { type: Date, default: Date.now },
});

/**
 * Competitive Price Schema
 * Stores competitive pricing information
 */
const competitivePriceSchema = new Schema({
  _id: false,
  averagePrice: Number,
  medianPrice: Number,
  lowestPrice: Number,
  highestPrice: Number,
  pricePercentile: { type: Number, min: 0, max: 100 }, // This flight's price percentile
  competitorCount: Number,
  lastComparedAt: { type: Date, default: Date.now },
  competitors: [{
    airlineCode: String,
    flightNumber: String,
    price: Number,
    currency: String,
    departureTime: String,
    arrivalTime: String,
    stops: Number,
  }],
});

/**
 * Price History Schema
 * Main schema for tracking flight price history
 */
const priceHistorySchema = new Schema(
  {
    // Flight identification
    flightId: {
      type: String,
      required: true,
      index: true,
    },
    flightCode: { type: String, required: true },
    airlineCode: { type: String, required: true },
    flightNumber: { type: String, required: true },
    
    // Route information
    route: {
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
      distanceMiles: Number,
    },
    
    // Schedule information
    schedule: {
      departureDate: { type: Date, required: true },
      arrivalDate: { type: Date, required: true },
      departureTime: String,
      arrivalTime: String,
      durationMinutes: { type: Number, required: true },
      timezone: String,
    },
    
    // Cabin class information
    cabinClass: {
      type: String,
      enum: ["economy", "premium_economy", "business", "first"],
      required: true,
    },
    
    // Price history data
    priceHistory: [pricePointSchema],
    
    // Current price information
    currentPrice: {
      amount: { type: Number, required: true },
      currency: { type: String, default: "USD" },
      recordedAt: { type: Date, default: Date.now },
      source: {
        type: String,
        enum: ["api", "cache", "manual", "provider"],
        default: "api",
      },
      provider: String,
      availability: {
        totalSeats: Number,
        availableSeats: Number,
        bookedSeats: Number,
      },
    },
    
    // Price statistics
    statistics: {
      lowestPrice: {
        amount: Number,
        currency: { type: String, default: "USD" },
        recordedAt: Date,
      },
      highestPrice: {
        amount: Number,
        currency: { type: String, default: "USD" },
        recordedAt: Date,
      },
      averagePrice: Number,
      medianPrice: Number,
      priceRange: {
        min: Number,
        max: Number,
        spread: Number,
      },
      standardDeviation: Number,
      sampleSize: { type: Number, default: 0 }, // Number of price points
      lastCalculatedAt: Date,
    },
    
    // Trend analysis
    trendAnalysis: priceTrendAnalysisSchema,
    
    // Competitive pricing
    competitivePricing: competitivePriceSchema,
    
    // Alert triggers
    alertTriggers: [{
      alertId: {
        type: Schema.Types.ObjectId,
        ref: "PriceAlert",
      },
      triggeredAt: { type: Date, default: Date.now },
      triggerType: {
        type: String,
        enum: ["percentage_drop", "specific_price", "daily_change", "trend", "competitive"],
      },
      triggerValue: Number,
      priceAtTrigger: {
        amount: Number,
        currency: String,
      },
    }],
    
    // Data quality and freshness
    dataQuality: {
      completeness: { type: Number, min: 0, max: 1 }, // Data completeness score
      accuracy: { type: Number, min: 0, max: 1 }, // Data accuracy score
      freshness: { type: Number, min: 0, max: 1 }, // Data freshness score
      lastValidatedAt: Date,
    },
    
    // Caching and performance
    cache: {
      key: String,
      expiresAt: Date,
      lastAccessedAt: Date,
      accessCount: { type: Number, default: 0 },
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
      { flightId: 1, cabinClass: 1 },
      { "route.origin.airportCode": 1, "route.destination.airportCode": 1 },
      { "schedule.departureDate": 1, cabinClass: 1 },
      { "currentPrice.recordedAt": -1 },
      { "trendAnalysis.lastAnalyzedAt": -1 },
      { "competitivePricing.lastComparedAt": -1 },
    ],
  }
);

// TTL index for automatic cleanup (90 days after departure)
priceHistorySchema.index(
  { "schedule.departureDate": 1 }, 
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// Add text index for search functionality
priceHistorySchema.index({
  flightCode: "text",
  airlineCode: "text",
  "route.origin.airportCode": "text",
  "route.destination.airportCode": "text",
  "route.origin.city": "text",
  "route.destination.city": "text",
});

priceHistorySchema.plugin(mongooseAutoPopulate);

export default priceHistorySchema;