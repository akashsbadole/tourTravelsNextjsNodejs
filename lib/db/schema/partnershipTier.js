import { Schema } from "mongoose";

/**
 * Partnership Tier Schema
 * Defines different partnership tiers and their benefits
 */
const partnershipTierSchema = new Schema({
  // Tier identification
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    required: true,
    unique: true
  },
  
  // Tier display information
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Visual branding
  branding: {
    color: {
      primary: String,
      secondary: String,
      accent: String
    },
    icon: String, // URL or icon name
    badge: String // URL to badge image
  },
  
  // Commission structure
  commission: {
    baseRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    bonusRates: [{
      condition: String, // e.g., "volume_threshold", "performance_bonus"
      threshold: Number,
      bonusRate: Number,
      description: String
    }],
    escalations: [{
      period: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly']
      },
      metric: {
        type: String,
        enum: ['bookings', 'revenue', 'conversion_rate']
      },
      threshold: Number,
      newRate: Number
    }]
  },
  
  // Financial benefits
  financial: {
    paymentTerms: {
      paymentFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly'],
        default: 'monthly'
      },
      paymentDelay: { type: Number, default: 30 }, // Days
      earlyPaymentDiscount: { type: Number, default: 0 } // Percentage
    },
    creditTerms: {
      creditLimit: Number,
      creditPeriod: Number, // Days
      interestRate: Number // Annual percentage
    },
    incentives: [{
      type: {
        type: String,
        enum: ['cash_bonus', 'travel_voucher', 'upgrade_credit', 'marketing_credit']
      },
      condition: String,
      value: Number,
      frequency: {
        type: String,
        enum: ['one_time', 'monthly', 'quarterly', 'yearly']
      }
    }]
  },
  
  // Booking benefits
  booking: {
    priorityAccess: {
      enabled: { type: Boolean, default: false },
      level: {
        type: String,
        enum: ['standard', 'enhanced', 'premium', 'exclusive']
      },
      benefits: [String] // e.g., ["early_access", "priority_seating", "upgrade_priority"]
    },
    inventoryAccess: {
      exclusiveFares: { type: Boolean, default: false },
      netFares: { type: Boolean, default: false },
      consolidatorFares: { type: Boolean, default: false },
      lastSeatAvailability: { type: Boolean, default: false }
    },
    flexibility: {
      freeChanges: { type: Number, default: 0 },
      changeFeeDiscount: { type: Number, default: 0 },
      cancellationGracePeriod: { type: Number, default: 0 }, // Hours
      refundProcessingTime: { type: Number, default: 0 } // Hours
    },
    groupBookings: {
      enabled: { type: Boolean, default: false },
      minGroupSize: { type: Number, default: 10 },
      discountRate: { type: Number, default: 0 },
      freeTickets: { type: Number, default: 0 }
    }
  },
  
  // Ancillary services
  ancillary: {
    seatSelection: {
      free: { type: Boolean, default: false },
      discount: { type: Number, default: 0 },
      priorityAccess: { type: Boolean, default: false }
    },
    baggage: {
      freeAllowance: {
        carryOn: { type: Number, default: 0 },
        checked: { type: Number, default: 0 }
      },
      discountRate: { type: Number, default: 0 },
      overweightWaiver: { type: Boolean, default: false }
    },
    meals: {
      freeMeals: { type: Number, default: 0 },
      discountRate: { type: Number, default: 0 },
      priorityMealSelection: { type: Boolean, default: false }
    },
    lounge: {
      freeAccess: { type: Boolean, default: false },
      discountRate: { type: Number, default: 0 },
      guestPasses: { type: Number, default: 0 }
    },
    insurance: {
      discountRate: { type: Number, default: 0 },
      freeCoverage: { type: Boolean, default: false },
      enhancedCoverage: { type: Boolean, default: false }
    }
  },
  
  // Loyalty program integration
  loyalty: {
    integration: {
      enabled: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      realTimeSync: { type: Boolean, default: false }
    },
    earningRates: [{
      program: String,
      baseRate: Number,
      bonusRates: [{
        condition: String,
        bonusRate: Number
      }]
    }],
    redemption: {
      discountRate: { type: Number, default: 0 },
      bonusMiles: { type: Number, default: 0 },
      exclusiveAwards: [String]
    }
  },
  
  // Marketing and branding
  marketing: {
    coBranding: {
      enabled: { type: Boolean, default: false },
      logoPlacement: {
        type: String,
        enum: ['header', 'footer', 'sidebar', 'prominent', 'exclusive']
      },
      brandGuidelines: String,
      approvalRequired: { type: Boolean, default: true }
    },
    promotionalMaterials: {
      access: {
        type: String,
        enum: ['none', 'basic', 'premium', 'exclusive']
      },
      customization: {
        type: String,
        enum: ['none', 'template', 'partial', 'full']
      },
      exclusiveContent: { type: Boolean, default: false }
    },
    advertising: {
      coopFunding: { type: Boolean, default: false },
      fundingRate: { type: Number, default: 0 }, // Percentage
      campaignSupport: { type: Boolean, default: false }
    },
    landingPages: {
      customPages: { type: Number, default: 0 },
      templateAccess: {
        type: String,
        enum: ['none', 'basic', 'premium', 'exclusive']
      },
      seoOptimization: { type: Boolean, default: false }
    }
  },
  
  // Support and services
  support: {
    dedicatedSupport: {
      enabled: { type: Boolean, default: false },
      responseTime: {
        type: String,
        enum: ['24_hours', '12_hours', '6_hours', '2_hours', '1_hour', 'immediate']
      },
      channels: [{
        type: String,
        enum: ['phone', 'email', 'chat', 'video', 'dedicated_portal']
      }],
      languages: [String]
    },
    accountManagement: {
      dedicatedManager: { type: Boolean, default: false },
      reviewFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'semiannually', 'annually']
      },
      businessReviews: { type: Boolean, default: false }
    },
    training: {
      access: {
        type: String,
        enum: ['none', 'basic', 'advanced', 'premium']
      },
      certification: { type: Boolean, default: false },
      onsiteTraining: { type: Boolean, default: false }
    }
  },
  
  // Technology and integration
  technology: {
    apiAccess: {
      rateLimits: {
        requestsPerMinute: { type: Number, default: 100 },
        requestsPerHour: { type: Number, default: 5000 },
        requestsPerDay: { type: Number, default: 50000 }
      },
      features: {
        realTimePricing: { type: Boolean, default: false },
        seatMapAccess: { type: Boolean, default: false },
        ancillaryServices: { type: Boolean, default: false },
        groupBooking: { type: Boolean, default: false }
      }
    },
    data: {
      accessLevel: {
        type: String,
        enum: ['basic', 'enhanced', 'premium', 'exclusive']
      },
      analytics: {
        type: String,
        enum: ['none', 'basic', 'advanced', 'premium']
      },
      reporting: {
        frequency: {
          type: String,
          enum: ['none', 'monthly', 'weekly', 'daily', 'real_time']
        },
        customization: { type: Boolean, default: false }
      }
    }
  },
  
  // Requirements and qualifications
  requirements: {
    minimumVolume: {
      monthly: { type: Number, default: 0 },
      quarterly: { type: Number, default: 0 },
      yearly: { type: Number, default: 0 }
    },
    minimumRevenue: {
      monthly: { type: Number, default: 0 },
      quarterly: { type: Number, default: 0 },
      yearly: { type: Number, default: 0 }
    },
    performanceMetrics: [{
      metric: {
        type: String,
        enum: ['conversion_rate', 'customer_satisfaction', 'cancellation_rate']
      },
      minimum: Number,
      measurement: String
    }],
    certifications: [String],
    businessRequirements: [String]
  },
  
  // Tier progression
  progression: {
    currentTierRequirements: {
      timeInTier: { type: Number, default: 0 }, // Months
      performanceMetrics: [String]
    },
    nextTierEligibility: {
      volumeThreshold: Number,
      revenueThreshold: Number,
      performanceThresholds: [{
        metric: String,
        threshold: Number
      }],
      timeRequirement: Number // Months
    },
    demotionCriteria: {
      performanceThresholds: [{
        metric: String,
        threshold: Number
      }],
      consecutivePeriods: { type: Number, default: 2 }
    }
  },
  
  // Metadata
  metadata: {
    isActive: { type: Boolean, default: true },
    effectiveDate: { type: Date, default: Date.now },
    expiryDate: Date,
    lastReviewed: Date,
    reviewedBy: String,
    notes: String,
    tags: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
partnershipTierSchema.index({ tier: 1 });
partnershipTierSchema.index({ level: 1 });
partnershipTierSchema.index({ 'metadata.isActive': 1 });

// Virtual fields
partnershipTierSchema.virtual('totalBenefits').get(function() {
  let count = 0;
  
  // Count benefits across different categories
  if (this.booking.priorityAccess.enabled) count++;
  if (this.booking.inventoryAccess.exclusiveFares) count++;
  if (this.booking.inventoryAccess.netFares) count++;
  if (this.ancillary.seatSelection.free) count++;
  if (this.ancillary.baggage.freeAllowance.carryOn > 0) count++;
  if (this.ancillary.baggage.freeAllowance.checked > 0) count++;
  if (this.loyalty.integration.enabled) count++;
  if (this.marketing.coBranding.enabled) count++;
  if (this.support.dedicatedSupport.enabled) count++;
  if (this.technology.apiAccess.features.realTimePricing) count++;
  
  return count;
});

partnershipTierSchema.virtual('isAvailable').get(function() {
  return this.metadata.isActive && 
         (!this.metadata.expiryDate || this.metadata.expiryDate > new Date());
});

// Pre-save middleware
partnershipTierSchema.pre('save', function(next) {
  this.metadata.lastReviewed = new Date();
  next();
});

export default partnershipTierSchema;