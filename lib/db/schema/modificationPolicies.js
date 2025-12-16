import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const modificationTypePolicySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["date_change", "passenger_update", "seat_change", "baggage_change", "meal_change", "class_upgrade", "cancellation"],
      required: true,
    },
    isEnabled: { type: Boolean, default: true },
    timeRestrictions: {
      cutoffHoursBeforeDeparture: { type: Number, default: 24 },
      maxHoursBeforeDeparture: { type: Number },
      minHoursBeforeDeparture: { type: Number },
      blackoutDates: [Date],
      restrictedDays: [{
        type: String,
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      }],
    },
    feeStructure: {
      type: {
        type: String,
        enum: ["fixed", "percentage", "tiered", "time_based"],
        required: true,
      },
      fixedAmount: { type: Number },
      percentage: { type: Number },
      minAmount: { type: Number },
      maxAmount: { type: Number },
      tiers: [{
        hoursBeforeDeparture: { type: Number, required: true },
        fee: { type: Number, required: true },
        feeType: {
          type: String,
          enum: ["fixed", "percentage"],
          required: true,
        },
      }],
      timeBasedFees: [{
        fromHours: { type: Number, required: true },
        toHours: { type: Number, required: true },
        fee: { type: Number, required: true },
        feeType: {
          type: String,
          enum: ["fixed", "percentage"],
          required: true,
        },
      }],
    },
    restrictions: {
      maxModificationsPerBooking: { type: Number, default: 3 },
      maxModificationsPerPassenger: { type: Number, default: 2 },
      requiresApproval: { type: Boolean, default: false },
      approvalConditions: [{
        condition: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
      }],
      prohibitedFareClasses: [String],
      allowedFareClasses: [String],
      prohibitedRoutes: [String],
      allowedRoutes: [String],
    },
    specialConditions: {
      waiveFeeFor: [{
        condition: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
        description: { type: String },
      }],
      additionalRequirements: [String],
      documentationRequired: [String],
    },
  },
  { _id: false }
);

const modificationPolicySchema = new Schema(
  {
    // Reference to airline
    airlineId: {
      type: String,
      ref: "Airline",
      required: true,
      autopopulate: true,
    },
    
    // Policy identification
    policyName: { type: String, required: true },
    policyCode: { type: String, required: true, unique: true },
    version: { type: String, default: "1.0" },
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    
    // General policy settings
    modificationPolicies: [modificationTypePolicySchema],
    
    // Global restrictions
    globalRestrictions: {
      maxModificationsPerBooking: { type: Number, default: 5 },
      maxModificationsPerDay: { type: Number, default: 10 },
      maxModificationValue: { type: Number },
      requiresOriginalPaymentMethod: { type: Boolean, default: false },
      allowSameDayModifications: { type: Boolean, default: false },
      modificationProcessingTime: { type: Number, default: 24 }, // Hours
    },
    
    // Fare class specific rules
    fareClassRules: [{
      fareClass: { type: String, required: true },
      modificationAllowed: { type: Boolean, default: true },
      modificationTypes: [modificationTypePolicySchema],
      specialRestrictions: { type: Schema.Types.Mixed },
    }],
    
    // Route specific rules
    routeRules: [{
      route: { type: String, required: true }, // e.g., "JFK-LAX"
      modificationAllowed: { type: Boolean, default: true },
      modificationTypes: [modificationTypePolicySchema],
      specialRestrictions: { type: Schema.Types.Mixed },
    }],
    
    // Seasonal rules
    seasonalRules: [{
      season: { type: String, required: true }, // e.g., "summer", "winter", "holiday"
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      modificationTypes: [modificationTypePolicySchema],
      specialRestrictions: { type: Schema.Types.Mixed },
    }],
    
    // Customer tier benefits
    customerTierBenefits: [{
      tier: {
        type: String,
        enum: ["bronze", "silver", "gold", "platinum", "diamond"],
        required: true,
      },
      benefits: {
        feeWaiverPercentage: { type: Number, default: 0 },
        additionalModificationsAllowed: { type: Number, default: 0 },
        extendedModificationWindow: { type: Number }, // Hours
        priorityProcessing: { type: Boolean, default: false },
        specialConditions: { type: Schema.Types.Mixed },
      },
    }],
    
    // Integration settings
    integrationSettings: {
      airlineAPIRequired: { type: Boolean, default: true },
      realTimeValidation: { type: Boolean, default: true },
      automaticApproval: { type: Boolean, default: false },
      confirmationRequired: { type: Boolean, default: true },
      notificationSettings: {
        emailRequired: { type: Boolean, default: true },
        smsRequired: { type: Boolean, default: false },
        pushNotificationRequired: { type: Boolean, default: false },
      },
    },
    
    // Compliance and legal
    compliance: {
      regulatoryRequirements: [String],
      dataRetentionDays: { type: Number, default: 2555 }, // 7 years
      auditRequired: { type: Boolean, default: true },
      documentationRequirements: [String],
    },
    
    // Metadata
    description: { type: String },
    termsAndConditions: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      autopopulate: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      autopopulate: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
modificationPolicySchema.index({ airlineId: 1, isActive: 1 });
modificationPolicySchema.index({ policyCode: 1 });
modificationPolicySchema.index({ effectiveFrom: 1, effectiveTo: 1 });
modificationPolicySchema.index({ isActive: 1, effectiveFrom: 1 });

modificationPolicySchema.plugin(mongooseAutoPopulate);

export default modificationPolicySchema;