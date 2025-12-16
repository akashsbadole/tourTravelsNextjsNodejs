import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const modificationFeeSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["date_change", "passenger_update", "seat_change", "baggage_change", "meal_change", "cancellation"],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    calculatedAt: { type: Date, default: Date.now },
    calculationBasis: {
      type: String,
      enum: ["fixed", "percentage", "airline_policy", "time_based"],
      required: true,
    },
    percentage: { type: Number }, // For percentage-based fees
    baseAmount: { type: Number }, // For percentage calculations
    description: { type: String },
    waiverReason: { type: String },
    isWaived: { type: Boolean, default: false },
  },
  { _id: false }
);

const fareDifferenceSchema = new Schema(
  {
    originalFare: { type: Number, required: true },
    newFare: { type: Number, required: true },
    difference: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    isRefundable: { type: Boolean, default: true },
    refundAmount: { type: Number },
  },
  { _id: false }
);

const modificationDetailsSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["date_change", "passenger_update", "seat_change", "baggage_change", "meal_change", "class_upgrade", "route_change"],
      required: true,
    },
    description: { type: String, required: true },
    originalValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    segmentIndex: { type: Number }, // For multi-segment flights
    passengerIndex: { type: Number }, // For passenger-specific modifications
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
    },
    processedAt: { type: Date },
    processedBy: {
      type: String,
      enum: ["system", "user", "admin", "airline"],
    },
    failureReason: { type: String },
    confirmationCode: { type: String },
  },
  { _id: false }
);

const paymentDetailsSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ["stripe", "razorpay", "paypal", "credit", "wallet"],
      default: "stripe",
    },
    transactionId: { type: String },
    paymentIntentId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "refunded"],
      default: "pending",
    },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    refundId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const flightBookingModificationSchema = new Schema(
  {
    // Reference to the original booking
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "FlightBooking",
      required: true,
      autopopulate: true,
    },
    pnrCode: { type: String, required: true },
    
    // Modification request details
    modificationId: { type: String, required: true, unique: true },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      autopopulate: true,
    },
    requestedAt: { type: Date, default: Date.now },
    
    // Modification details
    modifications: [modificationDetailsSchema],
    
    // Financial details
    modificationFees: [modificationFeeSchema],
    fareDifference: fareDifferenceSchema,
    totalAdditionalCost: { type: Number, default: 0 },
    totalRefundAmount: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    
    // Payment processing
    paymentDetails: paymentDetailsSchema,
    
    // Status and workflow
    status: {
      type: String,
      enum: ["requested", "pending_approval", "approved", "processing", "completed", "failed", "cancelled", "refunded"],
      default: "requested",
    },
    
    // Approval workflow
    requiresApproval: { type: Boolean, default: false },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      autopopulate: true,
    },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    
    // Processing details
    processedAt: { type: Date },
    processedBy: {
      type: String,
      enum: ["system", "user", "admin", "airline"],
    },
    completionDetails: {
      newPNRCode: { type: String },
      newTicketNumbers: [String],
      modifiedSegments: [Number],
      airlineConfirmationCode: { type: String },
    },
    
    // Time restrictions and policies
    modificationTimeRestrictions: {
      cutoffTime: { type: Date },
      modificationWindow: { type: Number }, // Hours before departure
      airlinePolicy: { type: Schema.Types.Mixed },
      isWithinTimeRestrictions: { type: Boolean },
    },
    
    // Communication and notifications
    notificationSent: { type: Boolean, default: false },
    notificationSentAt: { type: Date },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    
    // Metadata
    source: {
      type: String,
      enum: ["web", "mobile", "api", "admin_panel"],
      default: "web",
    },
    userAgent: { type: String },
    ipAddress: { type: String },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    
    // Audit trail
    modificationHistory: [{
      timestamp: { type: Date, default: Date.now },
      action: { type: String, required: true },
      performedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      details: { type: Schema.Types.Mixed },
      reason: { type: String },
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
flightBookingModificationSchema.index({ bookingId: 1, status: 1 });
flightBookingModificationSchema.index({ modificationId: 1 });
flightBookingModificationSchema.index({ pnrCode: 1 });
flightBookingModificationSchema.index({ requestedBy: 1, status: 1 });
flightBookingModificationSchema.index({ requestedAt: -1 });
flightBookingModificationSchema.index({ status: 1, requiresApproval: 1 });

flightBookingModificationSchema.plugin(mongooseAutoPopulate);

export default flightBookingModificationSchema;