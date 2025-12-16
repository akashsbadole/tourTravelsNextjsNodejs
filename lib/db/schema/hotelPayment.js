import { Schema } from "mongoose";

const hotelPaymentSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "HotelBooking" },
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
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  },
);

// Index for provider queries
hotelPaymentSchema.index({ provider: 1, providerPaymentIntentId: 1 });
hotelPaymentSchema.index({ provider: 1, providerChargeId: 1 });
hotelPaymentSchema.index({ bookingId: 1, provider: 1 });

export default hotelPaymentSchema;
