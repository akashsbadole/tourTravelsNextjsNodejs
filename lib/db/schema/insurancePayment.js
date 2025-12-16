import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const insurancePaymentSchema = new Schema(
  {
    policyId: { 
      type: Schema.Types.ObjectId, 
      ref: "InsurancePolicy", 
      required: true,
      autopopulate: true,
    },
    provider: {
      type: String,
      enum: ["stripe", "razorpay", "paypal"],
      required: true,
      default: "stripe"
    },
    // Provider-specific IDs
    transactionId: { type: String, required: true },
    providerTransactionId: { type: String },
    providerPaymentIntentId: { type: String },
    providerChargeId: { type: String },
    providerOrderId: { type: String }, // For Razorpay orders
    // Legacy Stripe fields (for backward compatibility)
    stripe_paymentIntentId: { type: String },
    stripe_chargeId: { type: String },
    paymentMethod: {
      id: String,
      type: String,
      methodType: String,
      brand: String,
      last4: String,
      wallet: String, // For Razorpay wallets
      vpa: String, // For Razorpay UPI
      bank: String, // For Razorpay netbanking
      email: String, // For PayPal
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "USD" },
    paymentDate: { type: Number, required: true },
    receiptUrl: { type: String },
    status: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "refunded"],
      default: "pending"
    },
    refundInfo: {
      status: {
        type: String,
        enum: ["not_requested", "requested", "approved", "denied", "refunded"],
        default: "not_requested",
      },
      providerRefundId: { type: String },
      stripeRefundId: { type: String }, // Legacy field
      amount: { type: Number },
      currency: { type: String, default: "USD" },
      requestedAt: { type: Date },
      refundedAt: { type: Date },
      refundableUntil: { type: Date },
      refundDeadline: { type: Date },
      penaltyFee: { type: Number },
      reason: { type: String },
      isManual: { type: Boolean, default: false },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  },
);

// Index for provider queries
insurancePaymentSchema.index({ provider: 1, providerPaymentIntentId: 1 });
insurancePaymentSchema.index({ provider: 1, providerChargeId: 1 });
insurancePaymentSchema.index({ policyId: 1, provider: 1 });

export default insurancePaymentSchema;