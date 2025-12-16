import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const insuranceProviderSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    logo: { type: String },
    website: { type: String },
    description: { type: String },
    contactInfo: {
      phone: String,
      email: String,
      address: String,
    },
    apiConfig: {
      baseUrl: { type: String, required: true },
      apiKey: { type: String, required: true },
      apiSecret: { type: String, required: true },
      webhookUrl: String,
      environment: {
        type: String,
        enum: ["sandbox", "production"],
        default: "sandbox",
      },
      rateLimitPerMinute: { type: Number, default: 60 },
      timeoutMs: { type: Number, default: 30000 },
    },
    commissionStructure: {
      type: {
        type: String,
        enum: ["percentage", "fixed", "tiered"],
        default: "percentage",
      },
      value: { type: Number, required: true },
      tiers: [{
        minAmount: Number,
        maxAmount: Number,
        commission: Number,
      }],
    },
    supportedCountries: [{ type: String }],
    supportedCurrencies: [{ type: String }],
    coverageTypes: [{
      type: String,
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
    }],
    integrationStatus: {
      type: String,
      enum: ["active", "inactive", "maintenance", "error"],
      default: "inactive",
    },
    lastHealthCheck: { type: Date },
    lastSyncAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

insuranceProviderSchema.plugin(mongooseAutoPopulate);
export default insuranceProviderSchema;