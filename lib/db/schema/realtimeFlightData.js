import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

/**
 * Real-time Flight Data Schema
 * Stores real-time flight information from external providers
 */
const realtimeFlightDataSchema = new Schema(
  {
    // Flight identification
    flightId: {
      type: String,
      required: true,
      index: true
    },
    provider: {
      type: String,
      required: true,
      enum: ['amadeus', 'sabre', 'static', 'other'],
      index: true
    },
    providerFlightId: {
      type: String,
      required: true
    },
    
    // Flight details
    flightCode: { type: String, required: true },
    airlineCode: { type: String, required: true },
    flightNumber: { type: String, required: true },
    
    // Route information
    origin: {
      airportCode: { type: String, required: true },
      airportName: String,
      city: String,
      country: String,
      terminal: String,
      gate: String
    },
    destination: {
      airportCode: { type: String, required: true },
      airportName: String,
      city: String,
      country: String,
      terminal: String,
      gate: String
    },
    
    // Schedule information
    scheduledDeparture: { type: Date, required: true },
    scheduledArrival: { type: Date, required: true },
    estimatedDeparture: Date,
    estimatedArrival: Date,
    actualDeparture: Date,
    actualArrival: Date,
    
    // Flight status
    status: {
      type: String,
      enum: ['scheduled', 'delayed', 'departed', 'arrived', 'cancelled', 'diverted'],
      default: 'scheduled',
      index: true
    },
    statusReason: String,
    
    // Aircraft information
    aircraftType: String,
    aircraftRegistration: String,
    
    // Duration and distance
    durationMinutes: { type: Number, required: true },
    distanceMiles: Number,
    
    // Real-time availability
    availability: {
      totalSeats: { type: Number, required: true },
      availableSeats: { type: Number, required: true },
      bookedSeats: { type: Number, default: 0 },
      waitlistedSeats: { type: Number, default: 0 },
      
      // Availability by cabin class
      cabinClasses: [{
        className: {
          type: String,
          enum: ['economy', 'premium_economy', 'business', 'first'],
          required: true
        },
        totalSeats: { type: Number, required: true },
        availableSeats: { type: Number, required: true },
        bookedSeats: { type: Number, default: 0 },
        fareBasisCodes: [String]
      }]
    },
    
    // Pricing information
    pricing: {
      currency: { type: String, default: 'USD' },
      
      // Base prices by passenger type and class
      basePrices: {
        economy: {
          adult: Number,
          child: Number,
          infant: Number
        },
        premium_economy: {
          adult: Number,
          child: Number,
          infant: Number
        },
        business: {
          adult: Number,
          child: Number,
          infant: Number
        },
        first: {
          adult: Number,
          child: Number,
          infant: Number
        }
      },
      
      // Taxes and fees
      taxes: {
        amount: Number,
        type: {
          type: String,
          enum: ['percentage', 'fixed'],
          default: 'percentage'
        }
      },
      fees: {
        amount: Number,
        type: {
          type: String,
          enum: ['percentage', 'fixed'],
          default: 'fixed'
        }
      },
      
      // Last updated pricing
      lastUpdated: { type: Date, default: Date.now }
    },
    
    // Provider-specific data
    providerData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    
    // Data freshness and tracking
    lastUpdated: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    lastChecked: {
      type: Date,
      default: Date.now
    },
    dataAge: {
      type: Number,
      default: 0 // Age in seconds
    },
    
    // Cache and synchronization
    cacheKey: String,
    cacheExpiry: Date,
    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'error'],
      default: 'pending'
    },
    syncError: String,
    
    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    // Add indexes for performance
    index: [
      { flightId: 1, provider: 1 },
      { origin: 1, destination: 1, scheduledDeparture: 1 },
      { lastUpdated: -1 },
      { status: 1, scheduledDeparture: 1 }
    ]
  }
);

realtimeFlightDataSchema.plugin(mongooseAutoPopulate);

// TTL index for automatic cleanup (30 days)
realtimeFlightDataSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default realtimeFlightDataSchema;