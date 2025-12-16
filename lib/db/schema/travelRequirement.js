import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const travelerInfoSchema = new Schema({
  _id: false,
  adults: {
    type: Number,
    required: true,
    min: 1,
  },
  children: {
    type: Number,
    default: 0,
    min: 0,
  },
  infants: {
    type: Number,
    default: 0,
    min: 0,
  },
  childrenAges: [{
    type: Number,
    min: 0,
    max: 17,
  }],
});

const destinationInfoSchema = new Schema({
  _id: false,
  origin: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
  },
  multiCity: [{
    city: String,
    order: Number,
  }],
});

const budgetSchema = new Schema({
  _id: false,
  min: {
    type: Number,
    required: true,
    min: 0,
  },
  max: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: "USD",
  },
});

const travelRequirementSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      autopopulate: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ["flight", "hotel", "package", "custom"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "assigned", "in_progress", "completed", "cancelled"],
      default: "draft",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    destinationInfo: {
      type: destinationInfoSchema,
      required: true,
    },
    travelDates: {
      departureDate: {
        type: Date,
        required: true,
      },
      returnDate: {
        type: Date,
      },
      flexibleDates: {
        type: Boolean,
        default: false,
      },
      dateFlexibility: {
        type: Number, // days before/after preferred dates
        min: 1,
        max: 30,
      },
    },
    travelerInfo: {
      type: travelerInfoSchema,
      required: true,
    },
    budget: {
      type: budgetSchema,
      required: true,
    },
    preferences: {
      accommodationType: [{
        type: String,
        enum: ["hotel", "apartment", "villa", "resort", "hostel"],
      }],
      flightClass: [{
        type: String,
        enum: ["economy", "premium_economy", "business", "first"],
      }],
      mealPreference: {
        type: String,
        enum: ["vegetarian", "vegan", "halal", "kosher", "none"],
      },
      transportation: {
        type: String,
        enum: ["flight", "train", "bus", "car_rental", "mixed"],
      },
      activities: [{
        type: String,
      }],
      specialRequirements: [{
        type: String,
      }],
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: "AgentProfile",
      autopopulate: true,
    },
    assignedAt: {
      type: Date,
    },
    deadline: {
      type: Date,
    },
    tags: [{
      type: String,
    }],
    attachments: [{
      type: String, // URLs to documents
      description: String,
    }],
    isPublic: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    quotesRequested: {
      type: Number,
      default: 0,
    },
    quotesReceived: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
    },
    completionNotes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

travelRequirementSchema.index({ userId: 1 });
travelRequirementSchema.index({ category: 1 });
travelRequirementSchema.index({ status: 1 });
travelRequirementSchema.index({ priority: 1 });
travelRequirementSchema.index({ assignedAgent: 1 });
travelRequirementSchema.index({ "destinationInfo.destination": 1 });
travelRequirementSchema.index({ "travelDates.departureDate": 1 });
travelRequirementSchema.index({ "budget.max": 1 });
travelRequirementSchema.index({ createdAt: -1 });
travelRequirementSchema.plugin(mongooseAutoPopulate);

export default travelRequirementSchema;