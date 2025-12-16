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
    amount: { type: Number },
    currency: { type: String, default: "USD" },
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

const cancellationInfoSchema = new Schema(
  {
    reason: { type: String },
    cancelableUntil: { type: Date },
    canceledAt: { type: Date },
    canceledBy: {
      type: String,
      enum: ["user", "admin", "system"],
    },
    cancellationFee: { type: Number },
  },
  { _id: false },
);

const flightBookingSchema = new Schema(
  {
    pnrCode: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" }, // Optional for guest bookings
    flightItineraryId: {
      type: Schema.Types.ObjectId,
      ref: "FlightItinerary",
      required: true,
    },
    segmentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "FlightSegment",
        required: true,
        autopopulate: true,
      },
    ],
    passengers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Passenger",
        required: true,
        autopopulate: true,
      },
    ],
    selectedSeats: [
      {
        _id: false,
        passengerId: {
          type: Schema.Types.ObjectId,
          ref: "Passenger",
          required: true,
        },
        seatId: {
          type: Schema.Types.ObjectId,
          ref: "FlightSeat",
          required: true,
          autopopulate: true,
        },
      },
    ],
    fareBreakdown: Object,
    totalFare: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    promoCode: { type: String, ref: "PromoCode" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    ticketStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    cancellationInfo: cancellationInfoSchema,
    refundInfo: refundInfoSchema,
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "FlightPayment",
      autopopulate: true,
    },
    earnedMiles: { type: Number, default: 0 },

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

    // metadata
    guaranteedReservationUntil: Date,
    userTimeZone: String,
    source: {
      type: String,
      enum: ["web", "mobile", "api"],
      default: "web",
    },
    bookedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

flightBookingSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 365 },
);
flightBookingSchema.plugin(mongooseAutoPopulate);

export default flightBookingSchema;
