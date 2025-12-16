import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const claimDocumentSchema = new Schema({
  type: {
    type: String,
    enum: [
      "medical_report",
      "receipt",
      "police_report",
      "flight_delay_proof",
      "baggage_claim_tag",
      "passport_copy",
      "travel_itinerary",
      "photographs",
      "other"
    ],
    required: true,
  },
  name: { type: String, required: true },
  url: { type: String, required: true },
  fileSize: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
  description: { type: String },
}, { _id: false });

const claimStatusSchema = new Schema({
  current: {
    type: String,
    enum: ["draft", "submitted", "under_review", "additional_info_requested", "approved", "rejected", "paid", "closed"],
    default: "draft",
  },
  submittedAt: { type: Date },
  reviewedAt: { type: Date },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  paidAt: { type: Date },
  closedAt: { type: Date },
  lastStatusChange: { type: Date, default: Date.now },
  notes: { type: String },
}, { _id: false });

const claimExpenseSchema = new Schema({
  category: {
    type: String,
    enum: [
      "medical_expenses",
      "trip_cancellation",
      "trip_interruption",
      "baggage_loss",
      "flight_delay",
      "travel_delay",
      "emergency_evacuation",
      "other"
    ],
    required: true,
  },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  date: { type: Date, required: true },
  location: { type: String },
  receiptAvailable: { type: Boolean, default: false },
  approvedAmount: { type: Number },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "partially_approved"],
    default: "pending",
  },
  rejectionReason: { type: String },
}, { _id: false });

const claimCommunicationSchema = new Schema({
  sender: {
    type: String,
    enum: ["customer", "adjuster", "system"],
    required: true,
  },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  attachments: [claimDocumentSchema],
  isInternal: { type: Boolean, default: false },
}, { _id: false });

const insuranceClaimSchema = new Schema(
  {
    claimNumber: { type: String, required: true, unique: true },
    policyId: {
      type: Schema.Types.ObjectId,
      ref: "InsurancePolicy",
      required: true,
      autopopulate: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      autopopulate: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "InsuranceProvider",
      required: true,
      autopopulate: true,
    },
    type: {
      type: String,
      enum: [
        "medical_expenses",
        "trip_cancellation",
        "trip_interruption",
        "baggage_loss",
        "flight_delay",
        "travel_delay",
        "emergency_evacuation",
        "other"
      ],
      required: true,
    },
    incidentDetails: {
      date: { type: Date, required: true },
      time: { type: String },
      location: { type: String, required: true },
      description: { type: String, required: true },
      cause: { type: String },
      policeReportFiled: { type: Boolean, default: false },
      policeReportNumber: { type: String },
      witnesses: [{
        name: String,
        contact: String,
        statement: String,
      }],
    },
    expenses: [claimExpenseSchema],
    totalClaimedAmount: { type: Number, required: true },
    totalApprovedAmount: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    status: claimStatusSchema,
    documents: [claimDocumentSchema],
    communications: [claimCommunicationSchema],
    assessment: {
      assignedAdjuster: { type: String },
      adjusterId: { type: Schema.Types.ObjectId, ref: "User" },
      assessmentNotes: { type: String },
      investigationRequired: { type: Boolean, default: false },
      investigationDetails: { type: String },
      estimatedProcessingTime: { type: Number }, // in days
    },
    payment: {
      status: {
        type: String,
        enum: ["pending", "processing", "paid", "failed"],
        default: "pending",
      },
      amount: { type: Number },
      paymentMethod: { type: String },
      paymentDate: { type: Date },
      transactionId: { type: String },
      bankDetails: {
        accountNumber: String,
        bankName: String,
        routingNumber: String,
        swiftCode: String,
      },
    },
    providerClaimId: { type: String }, // Claim ID from external provider
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

insuranceClaimSchema.plugin(mongooseAutoPopulate);

// Indexes for efficient queries
insuranceClaimSchema.index({ claimNumber: 1 }, { unique: true });
insuranceClaimSchema.index({ policyId: 1 });
insuranceClaimSchema.index({ userId: 1, "status.current": 1 });
insuranceClaimSchema.index({ providerId: 1, "status.current": 1 });
insuranceClaimSchema.index({ type: 1 });
insuranceClaimSchema.index({ "incidentDetails.date": 1 });
insuranceClaimSchema.index({ createdAt: 1 });
insuranceClaimSchema.index({ "status.current": 1 });

export default insuranceClaimSchema;