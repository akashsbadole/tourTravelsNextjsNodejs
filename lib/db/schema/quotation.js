import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const pricingItemSchema = new Schema({
  _id: false,
  category: {
    type: String,
    enum: ["flight", "hotel", "transport", "activity", "insurance", "visa", "other"],
    required: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: "USD",
  },
  details: {
    type: Schema.Types.Mixed, // Flexible field for specific details based on category
  },
});

const pricingSummarySchema = new Schema({
  _id: false,
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  tax: {
    type: Number,
    default: 0,
    min: 0,
  },
  serviceFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  commission: {
    type: Number,
    default: 0,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: "USD",
  },
});

const termsAndConditionsSchema = new Schema({
  _id: false,
  paymentTerms: {
    type: String,
    required: true,
  },
  cancellationPolicy: {
    type: String,
    required: true,
  },
  refundPolicy: {
    type: String,
    required: true,
  },
  amendmentPolicy: {
    type: String,
  },
  validityPeriod: {
    type: String,
    required: true,
  },
  additionalTerms: [{
    type: String,
  }],
});

const quotationSchema = new Schema(
  {
    requirementId: {
      type: Schema.Types.ObjectId,
      ref: "TravelRequirement",
      required: true,
      autopopulate: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "AgentProfile",
      required: true,
      autopopulate: true,
    },
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
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "accepted", "rejected", "expired", "withdrawn"],
      default: "draft",
    },
    items: [pricingItemSchema],
    pricing: {
      type: pricingSummarySchema,
      required: true,
    },
    termsAndConditions: {
      type: termsAndConditionsSchema,
      required: true,
    },
    validityPeriod: {
      startsAt: {
        type: Date,
        required: true,
      },
      endsAt: {
        type: Date,
        required: true,
      },
    },
    itinerary: {
      type: String,
      maxlength: 5000,
    },
    inclusions: [{
      type: String,
    }],
    exclusions: [{
      type: String,
    }],
    attachments: [{
      type: String, // URLs to documents
      description: String,
    }],
    notes: {
      type: String,
      maxlength: 1000,
    },
    sentAt: {
      type: Date,
    },
    viewedAt: {
      type: Date,
    },
    respondedAt: {
      type: Date,
    },
    responseNotes: {
      type: String,
      maxlength: 1000,
    },
    revisionCount: {
      type: Number,
      default: 0,
    },
    parentQuotation: {
      type: Schema.Types.ObjectId,
      ref: "Quotation",
    },
    childQuotations: [{
      type: Schema.Types.ObjectId,
      ref: "Quotation",
    }],
    comparisonScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    isRecommended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

quotationSchema.index({ requirementId: 1 });
quotationSchema.index({ agentId: 1 });
quotationSchema.index({ userId: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ "validityPeriod.endsAt": 1 });
quotationSchema.index({ "pricing.total": 1 });
quotationSchema.index({ createdAt: -1 });
quotationSchema.plugin(mongooseAutoPopulate);

export default quotationSchema;