import { Schema } from "mongoose";

/**
 * Airline Partnership Schema
 * Defines partnership agreements between travel agency and airlines
 */
const airlinePartnershipSchema = new Schema({
  // Partnership identification
  partnershipId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  airlineCode: {
    type: String,
    required: true,
    ref: 'Airline',
    index: true
  },
  
  // Partnership details
  partnershipType: {
    type: String,
    enum: ['gds', 'direct_api', 'low_cost_carrier', 'regional', 'charter', 'cargo'],
    required: true
  },
  
  // Partnership tier and status
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'terminated', 'trial'],
    default: 'pending'
  },
  
  // Contract information
  contract: {
    contractId: String,
    startDate: { type: Date, required: true },
    endDate: Date,
    renewalDate: Date,
    autoRenewal: { type: Boolean, default: false },
    signedBy: String,
    signedAt: Date,
    contractDocument: String, // URL to contract document
    terms: String, // Contract terms summary
  },
  
  // Financial arrangements
  financial: {
    commissionStructure: {
      type: {
        type: String,
        enum: ['percentage', 'fixed', 'tiered', 'hybrid'],
        required: true
      },
      baseRate: { type: Number, required: true }, // Base commission rate
      tiers: [{
        minVolume: Number,
        maxVolume: Number,
        rate: Number
      }],
      bonusThresholds: [{
        type: String,
        value: Number,
        bonus: Number
      }]
    },
    paymentTerms: {
      paymentFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly'],
        default: 'monthly'
      },
      paymentMethod: {
        type: String,
        enum: ['wire', 'ach', 'check', 'electronic'],
        default: 'wire'
      },
      paymentDelay: { type: Number, default: 30 }, // Days
      currency: { type: String, default: 'USD' }
    },
    settlement: {
      reportingPeriod: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'monthly'
      },
      reconciliationPeriod: { type: Number, default: 7 }, // Days
      disputeResolution: String
    }
  },
  
  // API and integration details
  integration: {
    type: {
      type: String,
      enum: ['rest_api', 'soap_api', 'xml_feed', 'ftp', 'edi', 'direct_connect'],
      required: true
    },
    endpoint: String,
    authentication: {
      type: {
        type: String,
        enum: ['api_key', 'oauth2', 'basic_auth', 'certificate', 'token'],
        required: true
      },
      credentials: {
        // Encrypted credentials storage
        apiKey: String,
        apiSecret: String,
        clientId: String,
        clientSecret: String,
        username: String,
        password: String,
        token: String,
        certificate: String,
        privateKey: String
      }
    },
    rateLimits: {
      requestsPerMinute: { type: Number, default: 100 },
      requestsPerHour: { type: Number, default: 5000 },
      requestsPerDay: { type: Number, default: 50000 },
      concurrentConnections: { type: Number, default: 10 }
    },
    dataFormats: {
      requestFormat: {
        type: String,
        enum: ['json', 'xml', 'soap', 'edi'],
        default: 'json'
      },
      responseFormat: {
        type: String,
        enum: ['json', 'xml', 'soap', 'edi'],
        default: 'json'
      }
    },
    features: {
      realTimePricing: { type: Boolean, default: false },
      seatMapAccess: { type: Boolean, default: false },
      ancillaryServices: { type: Boolean, default: false },
      loyaltyIntegration: { type: Boolean, default: false },
      groupBookings: { type: Boolean, default: false },
      corporateRates: { type: Boolean, default: false }
    }
  },
  
  // Partnership benefits and features
  benefits: {
    exclusiveFares: { type: Boolean, default: false },
    priorityBooking: { type: Boolean, default: false },
    preferentialSeating: { type: Boolean, default: false },
    enhancedCommission: { type: Boolean, default: false },
    marketingSupport: { type: Boolean, default: false },
    trainingAccess: { type: Boolean, default: false },
    dedicatedSupport: { type: Boolean, default: false },
    whiteLabelOptions: { type: Boolean, default: false }
  },
  
  // Coverage and routes
  coverage: {
    regions: [{
      type: String,
      enum: ['north_america', 'south_america', 'europe', 'asia', 'africa', 'middle_east', 'oceania']
    }],
    countries: [String], // ISO country codes
    routes: [{
      origin: String, // Airport code
      destination: String, // Airport code
      exclusivity: { type: Boolean, default: false }
    }],
    flightTypes: [{
      type: String,
      enum: ['scheduled', 'charter', 'cargo', 'seasonal']
    }]
  },
  
  // Performance metrics
  performance: {
    bookingVolume: {
      total: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 },
      quarterly: { type: Number, default: 0 },
      yearly: { type: Number, default: 0 }
    },
    revenue: {
      total: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 },
      quarterly: { type: Number, default: 0 },
      yearly: { type: Number, default: 0 }
    },
    commission: {
      total: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 },
      quarterly: { type: Number, default: 0 },
      yearly: { type: Number, default: 0 }
    },
    metrics: {
      conversionRate: { type: Number, default: 0 },
      averageBookingValue: { type: Number, default: 0 },
      cancellationRate: { type: Number, default: 0 },
      customerSatisfaction: { type: Number, default: 0 }
    }
  },
  
  // Marketing and branding
  marketing: {
    coBranding: {
      enabled: { type: Boolean, default: false },
      logoUrl: String,
      brandColors: [String],
      brandGuidelines: String
    },
    promotionalMaterials: {
      enabled: { type: Boolean, default: false },
      materials: [{
        type: {
          type: String,
          enum: ['banner', 'email_template', 'social_media', 'print', 'video']
        },
        url: String,
        description: String,
        expiryDate: Date
      }]
    },
    landingPages: [{
      url: String,
      title: String,
      description: String,
      targetAudience: String,
      isActive: { type: Boolean, default: true }
    }]
  },
  
  // Support and communication
  support: {
    dedicatedContact: {
      name: String,
      email: String,
      phone: String,
      title: String
    },
    technicalSupport: {
      email: String,
      phone: String,
      hours: String,
      responseTime: String
    },
    accountManagement: {
      manager: String,
      contactInfo: String,
      reviewFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'semiannually', 'annually'],
        default: 'quarterly'
      }
    }
  },
  
  // Compliance and regulatory
  compliance: {
    certifications: [String],
    licenses: [String],
    insurance: {
      required: { type: Boolean, default: true },
      coverage: String,
      expiryDate: Date,
      documentUrl: String
    },
    dataProtection: {
      gdprCompliant: { type: Boolean, default: false },
      dataProcessingAgreement: String,
      privacyPolicy: String
    }
  },
  
  // Metadata
  metadata: {
    createdBy: {
      type: String,
      required: true,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    notes: String,
    tags: [String],
    documents: [{
      type: {
        type: String,
        enum: ['contract', 'certificate', 'license', 'technical', 'marketing', 'compliance']
      },
      url: String,
      description: String,
      uploadedAt: { type: Date, default: Date.now }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
airlinePartnershipSchema.index({ airlineCode: 1, status: 1 });
airlinePartnershipSchema.index({ partnershipType: 1, tier: 1 });
airlinePartnershipSchema.index({ 'contract.endDate': 1 });
airlinePartnershipSchema.index({ 'performance.bookingVolume.monthly': -1 });

// Virtual fields
airlinePartnershipSchema.virtual('isActive').get(function() {
  return this.status === 'active' && 
         (!this.contract.endDate || this.contract.endDate > new Date());
});

airlinePartnershipSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.contract.endDate) return null;
  const today = new Date();
  const diffTime = this.contract.endDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
airlinePartnershipSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default airlinePartnershipSchema;