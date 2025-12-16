import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const commissionSettingsSchema = new Schema({
  _id: false,
  flightCommission: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  hotelCommission: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  packageCommission: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  customCommission: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
});

const performanceMetricsSchema = new Schema({
  _id: false,
  totalRequirements: {
    type: Number,
    default: 0,
  },
  completedRequirements: {
    type: Number,
    default: 0,
  },
  averageResponseTime: {
    type: Number, // in minutes
    default: 0,
  },
  customerSatisfactionRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
});

const agentProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      autopopulate: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    licenseExpiryDate: {
      type: Date,
      required: true,
    },
    experience: {
      type: Number, // years of experience
      required: true,
      min: 0,
    },
    specialties: [{
      type: String,
      enum: ["flights", "hotels", "packages", "corporate", "luxury", "adventure", "medical", "education"],
    }],
    contactDetails: {
      phone: {
        type: String,
        required: true,
      },
      alternatePhone: {
        type: String,
      },
      officeAddress: {
        type: String,
        required: true,
      },
      website: {
        type: String,
      },
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "suspended"],
      default: "pending",
    },
    verificationDocuments: [{
      type: String, // URLs to documents
    }],
    commissionSettings: {
      type: commissionSettingsSchema,
      default: function() {
        return {};
      },
    },
    performanceMetrics: {
      type: performanceMetricsSchema,
      default: function() {
        return {};
      },
    },
    bio: {
      type: String,
      maxlength: 1000,
    },
    languages: [{
      type: String,
    }],
    workingHours: {
      monday: { open: String, close: String, closed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
      friday: { open: String, close: String, closed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, closed: { type: Boolean, default: false } },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

agentProfileSchema.index({ userId: 1 });
agentProfileSchema.index({ licenseNumber: 1 });
agentProfileSchema.index({ verificationStatus: 1 });
agentProfileSchema.index({ specialties: 1 });
agentProfileSchema.index({ rating: -1 });
agentProfileSchema.plugin(mongooseAutoPopulate);

export default agentProfileSchema;