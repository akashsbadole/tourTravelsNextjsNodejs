import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const coverageDetailSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "trip_cancellation",
      "trip_interruption",
      "medical_expenses",
      "emergency_evacuation",
      "baggage_loss",
      "baggage_delay",
      "flight_delay",
      "travel_delay",
      "rental_car_damage",
      "adventure_sports",
      "pre_existing_conditions",
      "covid_coverage",
    ],
  },
  coverageLimit: { type: Number, required: true },
  deductible: { type: Number, default: 0 },
  description: { type: String },
  isIncluded: { type: Boolean, default: true },
}, { _id: false });

const eligibilityCriteriaSchema = new Schema({
  minAge: { type: Number, default: 0 },
  maxAge: { type: Number, default: 120 },
  minTripDuration: { type: Number, default: 1 }, // in days
  maxTripDuration: { type: Number, default: 365 }, // in days
  residencyCountries: [{ type: String }],
  destinationCountries: [{ type: String }],
  preExistingConditions: {
    allowed: { type: Boolean, default: false },
    waitingPeriod: { type: Number, default: 0 }, // in days
    conditions: [{ type: String }],
  },
  restrictions: [{ type: String }],
}, { _id: false });

const pricingTierSchema = new Schema({
  ageGroup: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  basePrice: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  tripDurationMultiplier: { type: Number, default: 1.0 },
  coverageMultiplier: { type: Number, default: 1.0 },
}, { _id: false });

const insuranceProductSchema = new Schema(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "InsuranceProvider",
      required: true,
      autopopulate: true,
    },
    name: { type: String, required: true },
    displayName: { type: String, required: true },
    description: { type: String, required: true },
    productCode: { type: String, required: true, unique: true },
    productType: {
      type: String,
      enum: ["single_trip", "annual_multi_trip", "backpacker", "business", "family", "student", "senior"],
      required: true,
    },
    coverageDetails: [coverageDetailSchema],
    eligibilityCriteria: eligibilityCriteriaSchema,
    pricingTiers: [pricingTierSchema],
    basePrice: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    pricingModel: {
      type: String,
      enum: ["fixed", "percentage", "tiered"],
      default: "percentage",
    },
    pricingPercentage: { type: Number, default: 5.0 }, // percentage of trip cost
    maxCoverageAmount: { type: Number, required: true },
    durationLimits: {
      minDays: { type: Number, default: 1 },
      maxDays: { type: Number, default: 365 },
    },
    benefits: [{ type: String }],
    exclusions: [{ type: String }],
    termsAndConditions: { type: String },
    policyDocumentUrl: { type: String },
    brochureUrl: { type: String },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    tags: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

insuranceProductSchema.plugin(mongooseAutoPopulate);

// Indexes for efficient queries
insuranceProductSchema.index({ providerId: 1, isActive: 1 });
insuranceProductSchema.index({ productType: 1, isActive: 1 });
insuranceProductSchema.index({ "coverageDetails.type": 1 });
insuranceProductSchema.index({ basePrice: 1 });
insuranceProductSchema.index({ isFeatured: 1, sortOrder: 1 });

export default insuranceProductSchema;