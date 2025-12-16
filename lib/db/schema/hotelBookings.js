import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const refundInfoSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ["stripe", "razorpay", "paypal"],
      default: "stripe"
    },
    providerRefundId: { type: String },
    // Legacy Stripe field (for backward compatibility)
    stripeRefundId: { type: String },
    status: {
      type: String,
      enum: ["not_requested", "requested", "approved", "denied", "refunded"],
      default: "not_requested",
    },
    reason: { type: String },
    currency: { type: String, default: "USD" },
    amount: { type: Number },
    requestedAt: { type: Date },
    refundedAt: { type: Date },
    refundableUntil: { type: Date },
    refundDeadline: { type: Date },
    penaltyFee: { type: Number },
    isManual: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const hotelBookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    rooms: [{ type: Schema.Types.ObjectId, ref: "HotelRoom", required: true }],
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    guests: [
      {
        type: Schema.Types.ObjectId,
        ref: "HotelGuest",
        required: true,
        autopopulate: true,
      },
    ],
    fareBreakdown: Object,
    totalPrice: Number,
    bookingStatus: {
      type: String,
      enum: ["confirmed", "pending", "cancelled"],
      default: "confirmed",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "cash"],
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "HotelPayment",
      autopopulate: true,
    },
    refundInfo: refundInfoSchema,
    // Insurance integration
    insurancePolicyId: {
      type: Schema.Types.ObjectId,
      ref: "InsurancePolicy",
      autopopulate: true,
    },
    insuranceOptions: [{
      productId: { type: Schema.Types.ObjectId, ref: "InsuranceProduct" },
      providerId: { type: Schema.Types.ObjectId, ref: "InsuranceProvider" },
      price: Number,
      currency: String,
      coverage: String,
      isSelected: { type: Boolean, default: false },
    }],
    insuranceStatus: {
      type: String,
      enum: ["none", "quoted", "purchased", "waived"],
      default: "none",
    },

    source: {
      type: String,
      enum: ["web", "mobile", "api"],
      default: "web",
    },
    guaranteedReservationUntil: Date,
    bookedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

hotelBookingSchema.plugin(mongooseAutoPopulate);
export default hotelBookingSchema;
