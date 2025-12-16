import { Schema } from "mongoose";

const experimentVariantSchema = new Schema({
  _id: false,
  variantId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  trafficAllocation: { type: Number, required: default: 0 }, // Percentage (0-100)
  isActive: { type: Boolean, default: true },
  configuration: { type: Schema.Types.Mixed }, // Variant-specific settings
  targeting: {
    criteria: { type: Schema.Types.Mixed }, // Targeting rules
    includeNewUsers: { type: Boolean, default: true },
    includeReturningUsers: { type: Boolean, default: true }
  },
  metrics: {
    participants: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    events: { type: Number, default: 0 },
    statisticalSignificance: { type: Number, default: 0 }, // Confidence level (0-100)
    confidenceInterval: {
      lower: { type: Number, default: 0 },
      upper: { type: Number, default: 0 }
    },
    pValue: { type: Number, default: 1 },
    isWinner: { type: Boolean, default: false }
  },
  breakdown: {
    devices: [{
      type: { type: String, enum: ['desktop', 'mobile', 'tablet'] },
      participants: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 }
    }],
    sources: [{
      source: { type: String },
      participants: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 }
    }],
    userSegments: [{
      segment: { type: String },
      participants: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 }
    }],
    timeBased: [{
      period: { type: String }, // e.g., "2023-12-15"
      participants: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 }
    }]
  }
});

const experimentGoalSchema = new Schema({
  _id: false,
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['primary', 'secondary'],
    required: true
  },
  metric: {
    type: String,
    enum: [
      'conversion_rate',
      'revenue',
      'average_order_value',
      'bounce_rate',
      'session_duration',
      'page_views',
      'click_through_rate',
      'sign_up_rate',
      'booking_completion_rate',
      'search_to_booking_rate',
      'cart_abandonment_rate'
    ],
    required: true
  },
  description: { type: String },
  targetValue: { type: Number }, // Target improvement percentage
  currentValue: { type: Number }, // Current baseline value
  improvementDirection: {
    type: String,
    enum: ['increase', 'decrease'],
    required: true
  }
});

const experimentSchema = new Schema({
  experimentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  hypothesis: { type: String, required: true },
  status: {
    type: String,
    enum: ['draft', 'running', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  type: {
    type: String,
    enum: ['ui_test', 'feature_test', 'pricing_test', 'content_test', 'algorithm_test'],
    required: true
  },
  targeting: {
    percentage: { type: Number, default: 100 }, // Percentage of traffic to include
    criteria: { type: Schema.Types.Mixed }, // Targeting rules
    includeNewUsers: { type: Boolean, default: true },
    includeReturningUsers: { type: Boolean, default: true },
    excludeFromOtherExperiments: { type: Boolean, default: true },
    requiredTraffic: { type: Number, default: 1000 } // Minimum participants needed
  },
  variants: [experimentVariantSchema],
  goals: [experimentGoalSchema],
  schedule: {
    startDate: { type: Date },
    endDate: { type: Date },
    duration: { type: Number }, // Planned duration in days
    autoStopOnSignificance: { type: Boolean, default: true },
    significanceLevel: { type: Number, default: 95 }, // Confidence level required
    minimumSampleSize: { type: Number, default: 1000 }
  },
  results: {
    startDate: { type: Date },
    endDate: { type: Date },
    totalParticipants: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    overallConversionRate: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    statisticalSignificance: { type: Number, default: 0 },
    winner: {
      variantId: { type: String },
      confidence: { type: Number, default: 0 },
      improvement: { type: Number, default: 0 } // Percentage improvement
    },
    recommendations: [{ type: String }],
    insights: [{ type: String }]
  },
  implementation: {
    component: { type: String }, // React component or page being tested
    changes: { type: Schema.Types.Mixed }, // Description of changes made
    developer: { type: String },
    reviewer: { type: String },
    deploymentDate: { type: Date }
  },
  stakeholders: [{
    name: { type: String },
    email: { type: String },
    role: { type: String },
    notifications: {
      started: { type: Boolean, default: true },
      completed: { type: Boolean, default: true },
      significant: { type: Boolean, default: true }
    }
  }],
  tags: [{ type: String }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  risks: [{
    type: {
      type: String,
      enum: ['technical', 'business', 'user_experience', 'revenue']
    },
    description: { type: String },
    mitigation: { type: String },
    probability: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    impact: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }]
}, {
  timestamps: true
});

const userExperimentAssignmentSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  sessionId: { type: String, required: true },
  assignments: [{
    experimentId: { type: String, required: true },
    variantId: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now },
    firstSeenAt: { type: Date },
    lastSeenAt: { type: Date },
    hasConverted: { type: Boolean, default: false },
    conversionEvents: [{
      eventType: { type: String },
      timestamp: { type: Date, default: Date.now },
      value: { type: Number, default: 0 },
      metadata: { type: Schema.Types.Mixed }
    }],
    interactions: [{
      action: { type: String },
      timestamp: { type: Date, default: Date.now },
      page: { type: String },
      metadata: { type: Schema.Types.Mixed }
    }]
  }],
  exclusionReasons: [{
    experimentId: { type: String },
    reason: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Indexes for performance
experimentSchema.index({ experimentId: 1 });
experimentSchema.index({ status: 1 });
experimentSchema.index({ "schedule.startDate": 1, "schedule.endDate": 1 });
experimentSchema.index({ "variants.isWinner": 1 });
experimentSchema.index({ tags: 1 });

userExperimentAssignmentSchema.index({ userId: 1 });
userExperimentAssignmentSchema.index({ sessionId: 1 });
userExperimentAssignmentSchema.index({ "assignments.experimentId": 1 });
userExperimentAssignmentSchema.index({ "assignments.variantId": 1 });

export { experimentSchema, userExperimentAssignmentSchema };
export default experimentSchema;