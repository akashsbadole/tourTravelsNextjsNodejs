import { Schema } from "mongoose";

/**
 * Enhanced Flight Data Schema
 * Extends existing flight data with partnership-specific information
 */
const enhancedFlightDataSchema = new Schema({
  // Flight identification
  flightId: {
    type: String,
    required: true,
    index: true
  },
  providerFlightId: String, // Original ID from provider
  airlineCode: {
    type: String,
    required: true,
    ref: 'Airline',
    index: true
  },
  partnershipId: {
    type: String,
    required: true,
    ref: 'AirlinePartnership',
    index: true
  },
  
  // Flight details
  flightNumber: {
    type: String,
    required: true
  },
  route: {
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
    distance: Number, // in kilometers
    flightTime: Number // in minutes
  },
  
  // Schedule information
  schedule: {
    departure: {
      scheduledTime: { type: Date, required: true },
      estimatedTime: Date,
      actualTime: Date,
      timezone: String
    },
    arrival: {
      scheduledTime: { type: Date, required: true },
      estimatedTime: Date,
      actualTime: Date,
      timezone: String
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'seasonal', 'charter', 'on_demand']
    },
    daysOfWeek: [Number], // 0-6, Sunday-Saturday
    effectiveDates: {
      startDate: Date,
      endDate: Date
    }
  },
  
  // Aircraft information
  aircraft: {
    type: String,
    registration: String,
    configuration: {
      totalSeats: { type: Number, required: true },
      cabinClasses: [{
        class: {
          type: String,
          enum: ['economy', 'premium_economy', 'business', 'first']
        },
        seats: { type: Number, required: true },
        rows: Number,
        layout: String // e.g., "3-3-3"
      }],
      features: [String] // e.g., ["wifi", "power_outlets", "entertainment"]
    }
  },
  
  // Partnership-specific pricing
  partnershipPricing: {
    baseFare: {
      amount: { type: Number, required: true },
      currency: { type: String, required: true }
    },
    taxes: {
      amount: { type: Number, required: true },
      breakdown: [{
        type: String,
        amount: Number,
        description: String
      }]
    },
    fees: {
      amount: { type: Number, required: true },
      breakdown: [{
        type: String,
        amount: Number,
        description: String
      }]
    },
    commission: {
      rate: { type: Number, required: true },
      amount: { type: Number, required: true },
      tier: String,
      isExclusive: { type: Boolean, default: false }
    },
    discounts: [{
      type: {
        type: String,
        enum: ['partnership', 'promotional', 'volume', 'loyalty', 'early_bird']
      },
      amount: Number,
      percentage: Number,
      description: String,
      validUntil: Date,
      conditions: [String]
    }],
    totalFare: {
      amount: { type: Number, required: true },
      currency: { type: String, required: true }
    }
  },
  
  // Fare class availability and pricing
  fareClasses: [{
    class: {
      type: String,
      required: true,
      enum: ['economy', 'premium_economy', 'business', 'first']
    },
    fareBasis: String,
    availability: {
      seatsAvailable: { type: Number, required: true },
      totalSeats: { type: Number, required: true },
      waitlistAvailable: { type: Boolean, default: false },
      waitlistCount: { type: Number, default: 0 }
    },
    pricing: {
      baseFare: { type: Number, required: true },
      taxes: { type: Number, required: true },
      fees: { type: Number, required: true },
      totalFare: { type: Number, required: true },
      currency: { type: String, required: true }
    },
    restrictions: {
      refundable: { type: Boolean, default: false },
      changeable: { type: Boolean, default: false },
      changeFee: Number,
      cancellationFee: Number,
      advancePurchase: Number, // Days
      minimumStay: Number, // Days
      maximumStay: Number, // Days
      blackoutDates: [Date]
    },
    benefits: [String] // e.g., ["priority_boarding", "extra_legroom", "lounge_access"]
  }],
  
  // Seat map information
  seatMap: {
    available: { type: Boolean, default: false },
    lastUpdated: Date,
    configuration: [{
      deck: {
        type: String,
        enum: ['main', 'upper', 'lower']
      },
      rows: [{
        rowNumber: Number,
        seats: [{
          seatNumber: String,
          class: String,
          available: { type: Boolean, default: true },
          characteristics: [String], // e.g., ["window", "aisle", "exit_row", "extra_legroom"]
          price: Number,
          restrictions: [String]
        }]
      }]
    }]
  },
  
  // Ancillary services
  ancillaryServices: {
    baggage: {
      carryOn: {
        included: { type: Boolean, default: true },
        weight: Number,
        dimensions: {
          length: Number,
          width: Number,
          height: Number
        },
        additionalCost: Number
      },
      checked: {
        included: { type: Boolean, default: false },
        pieces: { type: Number, default: 0 },
        weight: Number,
        dimensions: {
          length: Number,
          width: Number,
          height: Number
        },
        additionalCost: Number,
        excessWeightFee: Number
      }
    },
    meals: [{
      type: {
        type: String,
        enum: ['standard', 'vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free', 'child', 'diabetic']
      },
      included: { type: Boolean, default: false },
      price: Number,
      description: String
    }],
    entertainment: {
      included: { type: Boolean, default: false },
      options: [String],
      upgradePrice: Number
    },
    wifi: {
      available: { type: Boolean, default: false },
      included: { type: Boolean, default: false },
      price: Number,
      duration: String
    },
    seatSelection: {
      included: { type: Boolean, default: false },
      price: Number,
      restrictions: [String]
    },
    priorityServices: [{
      type: {
        type: String,
        enum: ['boarding', 'check_in', 'security', 'lounge', 'baggage']
      },
      included: { type: Boolean, default: false },
      price: Number,
      description: String
    }],
    insurance: {
      available: { type: Boolean, default: false },
      options: [{
        type: {
          type: String,
          enum: ['basic', 'comprehensive', 'premium']
        },
        price: Number,
        coverage: String,
        provider: String
      }]
    }]
  },
  
  // Loyalty program integration
  loyaltyProgram: {
    eligible: { type: Boolean, default: false },
    programName: String,
    earningRates: [{
      class: String,
      baseRate: Number,
      bonusRate: Number,
      totalRate: Number
    }],
    redemptionOptions: [{
      type: {
        type: String,
        enum: ['upgrade', 'lounge', 'extra_baggage', 'discount']
      },
      cost: Number,
      description: String
    }],
    tierBenefits: [String]
  },
  
  // Partnership benefits
  partnershipBenefits: {
    exclusiveFare: { type: Boolean, default: false },
    priorityBooking: { type: Boolean, default: false },
    enhancedCommission: { type: Boolean, default: false },
    flexibleTerms: { type: Boolean, default: false },
    dedicatedSupport: { type: Boolean, default: false },
    marketingCredits: { type: Boolean, default: false },
    trainingAccess: { type: Boolean, default: false }
  },
  
  // Real-time status
  status: {
    flightStatus: {
      type: String,
      enum: ['scheduled', 'delayed', 'cancelled', 'diverted', 'landed', 'departed', 'boarding', 'gate_closed'],
      default: 'scheduled'
    },
    delayReason: String,
    estimatedDeparture: Date,
    estimatedArrival: Date,
    gateChanges: [{
      time: Date,
      oldGate: String,
      newGate: String
    }],
    statusHistory: [{
      status: String,
      timestamp: Date,
      source: String
    }]
  },
  
  // Performance metrics
  performance: {
    loadFactor: Number, // Percentage
    onTimePerformance: Number, // Percentage
    cancellationRate: Number, // Percentage
    averageDelay: Number, // Minutes
    customerSatisfaction: Number, // Score out of 10
    revenuePerSeat: Number,
    yield: Number // Revenue per seat mile
  },
  
  // Data source and synchronization
  dataSource: {
    provider: {
      type: String,
      required: true,
      enum: ['amadeus', 'sabre', 'travelport', 'direct_api', 'static']
    },
    lastSync: { type: Date, default: Date.now },
    syncFrequency: {
      type: String,
      enum: ['real_time', 'hourly', 'daily', 'weekly'],
      default: 'daily'
    },
    dataQuality: {
      completeness: Number, // Percentage
      accuracy: Number, // Percentage
      timeliness: Number, // Percentage
      lastValidated: Date
    }
  },
  
  // Metadata
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    source: String, // Source system
    checksum: String, // For data integrity
    tags: [String],
    notes: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
enhancedFlightDataSchema.index({ airlineCode: 1, 'schedule.departure.scheduledTime': 1 });
enhancedFlightDataSchema.index({ partnershipId: 1, 'route.origin.airportCode': 1, 'route.destination.airportCode': 1 });
enhancedFlightDataSchema.index({ 'fareClasses.availability.seatsAvailable': -1 });
enhancedFlightDataSchema.index({ 'partnershipPricing.totalFare.amount': 1 });
enhancedFlightDataSchema.index({ 'dataSource.lastSync': 1 });
enhancedFlightDataSchema.index({ 'status.flightStatus': 1 });

// Virtual fields
enhancedFlightDataSchema.virtual('isAvailable').get(function() {
  return this.status.flightStatus !== 'cancelled' && 
         this.status.flightStatus !== 'diverted' &&
         this.schedule.departure.scheduledTime > new Date();
});

enhancedFlightDataSchema.virtual('hasAvailableSeats').get(function() {
  return this.fareClasses.some(fareClass => 
    fareClass.availability.seatsAvailable > 0
  );
});

enhancedFlightDataSchema.virtual('lowestFare').get(function() {
  if (!this.fareClasses.length) return null;
  
  const lowestFareClass = this.fareClasses.reduce((lowest, current) => 
    current.pricing.totalFare < lowest.pricing.totalFare ? current : lowest
  );
  
  return {
    class: lowestFareClass.class,
    fare: lowestFareClass.pricing.totalFare,
    currency: lowestFareClass.pricing.currency,
    seatsAvailable: lowestFareClass.availability.seatsAvailable
  };
});

enhancedFlightDataSchema.virtual('partnershipDiscount').get(function() {
  if (!this.partnershipPricing.discounts.length) return 0;
  
  const totalDiscount = this.partnershipPricing.discounts.reduce((total, discount) => {
    if (discount.type === 'partnership') {
      return total + (discount.percentage || 0);
    }
    return total;
  }, 0);
  
  return totalDiscount;
});

// Pre-save middleware
enhancedFlightDataSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  this.metadata.version += 1;
  
  // Calculate checksum for data integrity
  const crypto = require('crypto');
  const dataString = JSON.stringify(this.toObject());
  this.metadata.checksum = crypto.createHash('md5').update(dataString).digest('hex');
  
  next();
});

export default enhancedFlightDataSchema;