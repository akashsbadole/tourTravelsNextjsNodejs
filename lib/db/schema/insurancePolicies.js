import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const insuredPersonSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  passportNumber: { type: String },
  nationality: { type: String },
  email: { type: String },
  phone: { type: String },
  relationship: {
    type: String,
    enum: ["primary", "spouse", "child", "parent", "other"],
    default: "primary",
  },
}, { _id: false });

const tripDetailsSchema = new Schema({
  tripType: {
    type: String,
    enum: ["flight_only", "hotel_only", "flight_hotel", "cruise", "tour", "other"],
    required: true,
  },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  departureDate: { type: Date, required: true },
  returnDate: { type: Date },
  tripCost: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  flightBookingId: { type: Schema.Types.ObjectId, ref: "FlightBooking" },
  hotelBookingId: { type: Schema.Types.ObjectId, ref: "HotelBooking" },
}, { _id: false });

const coverageSchema = new Schema({
  type: { type: String, required: true },
  limit: { type: Number, required: true },
  deductible: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const policyStatusSchema = new Schema({
  current: {
    type: String,
    enum: ["quoted", "pending_payment", "active", "expired", "cancelled", "claimed", "rejected"],
    default: "quoted",
  },
  quotedAt: { type: Date },
  paidAt: { type: Date },
  activatedAt: { type: Date },
  expiresAt: { type: Date },
  cancelledAt: { type: Date },
  cancellationReason: { type: String },
  lastStatusChange: { type: Date, default: Date.now },
}, { _id: false });

const insurancePolicySchema = new Schema(
  {
    policyNumber: { type: String, required: true, unique: true },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "InsuranceProvider",
      required: true,
      autopopulate: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "InsuranceProduct",
      required: true,
      autopopulate: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User" }, // Optional for guest bookings
    insuredPersons: [insuredPersonSchema],
    tripDetails: tripDetailsSchema,
    coverage: [coverageSchema],
    status: policyStatusSchema,
    pricing: {
      basePrice: { type: Number, required: true },
      taxes: { type: Number, default: 0 },
      fees: { type: Number, default: 0 },
      totalPrice: { type: Number, required: true },
      currency: { type: String, default: "USD" },
      commissionEarned: { type: Number, default: 0 },
    },
    payment: {
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      paymentId: { type: Schema.Types.ObjectId, ref: "InsurancePayment" },
      providerTransactionId: { type: String },
      paidAt: { type: Date },
      refundInfo: {
        status: {
          type: String,
          enum: ["not_requested", "requested", "approved", "denied", "refunded"],
          default: "not_requested",
        },
        amount: { type: Number },
        refundedAt: { type: Date },
        reason: { type: String },
      },
    },
    documents: {
      policyDocumentUrl: { type: String },
      certificateUrl: { type: String },
      termsAndConditionsUrl: { type: String },
      additionalDocuments: [{ type: String }],
    },
    providerPolicyId: { type: String }, // Policy ID from external provider
    quotes: [{
      providerId: { type: Schema.Types.ObjectId, ref: "InsuranceProvider" },
      productId: { type: Schema.Types.ObjectId, ref: "InsuranceProduct" },
      price: { type: Number },
      currency: { type: String },
      validUntil: { type: Date },
      createdAt: { type: Date, default: Date.now },
    }],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

insurancePolicySchema.plugin(mongooseAutoPopulate);

// Indexes for efficient queries
insurancePolicySchema.index({ policyNumber: 1 }, { unique: true });
insurancePolicySchema.index({ userId: 1, "status.current": 1 });
insurancePolicySchema.index({ providerId: 1, "status.current": 1 });
insurancePolicySchema.index({ productId: 1 });
insurancePolicySchema.index({ "tripDetails.departureDate": 1, "tripDetails.returnDate": 1 });
insurancePolicySchema.index({ "status.current": 1 });
insurancePolicySchema.index({ createdAt: 1 });

export default insurancePolicySchema;