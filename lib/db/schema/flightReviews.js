import { Schema } from "mongoose";

const flightReviewSchema = new Schema(
  {
    airlineId: { type: String, required: true }, // key
    departureAirportId: { type: String, required: true }, // key
    arrivalAirportId: { type: String, required: true }, // key
    airplaneModelName: { type: String, required: true }, // key
    flightNumber: { type: String, required: true }, // flight number
    flightDate: { type: Date, required: true }, // actual flight date
    bookingReference: { type: String }, // booking reference for verification
    reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    
    // Overall rating
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    
    // Category ratings
    categoryRatings: {
      comfort: { type: Number, min: 1, max: 5, default: 0 },
      service: { type: Number, min: 1, max: 5, default: 0 },
      food: { type: Number, min: 1, max: 5, default: 0 },
      punctuality: { type: Number, min: 1, max: 5, default: 0 },
      cleanliness: { type: Number, min: 1, max: 5, default: 0 },
      amenities: { type: Number, min: 1, max: 5, default: 0 },
      value: { type: Number, min: 1, max: 5, default: 0 }
    },
    
    // Trip details
    tripType: {
      type: String,
      enum: ['business', 'leisure', 'family', 'solo', 'couple', 'group'],
      default: 'leisure'
    },
    travelClass: {
      type: String,
      enum: ['economy', 'premium_economy', 'business', 'first'],
      default: 'economy'
    },
    ticketPrice: { type: Number }, // price paid for ticket
    bookingSource: { type: String }, // where booked
    
    // Review metadata
    title: { type: String }, // review title
    pros: [{ type: String }], // positive points
    cons: [{ type: String }], // negative points
    recommendations: { type: String }, // would recommend
    
    // Media attachments
    images: [{
      url: { type: String },
      caption: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }],
    videos: [{
      url: { type: String },
      caption: { type: String },
      thumbnail: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }],
    
    // Verification and trust
    verified: { type: Boolean, default: false }, // verified as actual passenger
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" }, // admin who verified
    verificationDate: { type: Date },
    bookingConfirmed: { type: Boolean, default: false }, // confirmed via booking system
    
    // Engagement metrics
    helpfulVotes: [{ type: Schema.Types.ObjectId, ref: "User" }], // users who found helpful
    notHelpfulVotes: [{ type: Schema.Types.ObjectId, ref: "User" }], // users who found not helpful
    responseCount: { type: Number, default: 0 }, // number of responses
    
    // Moderation
    flagged: [{ type: Schema.Types.ObjectId, ref: "User" }],
    flaggedReason: { type: String },
    moderated: { type: Boolean, default: false },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderatedAt: { type: Date },
    status: {
      type: String,
      enum: ['published', 'pending', 'hidden', 'removed'],
      default: 'published'
    },
    
    // Analytics
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    sentimentScore: { type: Number, min: -1, max: 1 }, // -1 to 1 sentiment score
    keywords: [{ type: String }], // extracted keywords
    
    // Version control
    version: { type: Number, default: 1 },
    editedAt: { type: Date },
    editReason: { type: String },
    
    // Airline response
    airlineResponse: {
      content: { type: String },
      respondedBy: { type: Schema.Types.ObjectId, ref: "User" },
      respondedAt: { type: Date },
      public: { type: Boolean, default: true }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  },
);

// Virtual for helpfulness score
flightReviewSchema.virtual('helpfulnessScore').get(function() {
  const totalVotes = this.helpfulVotes.length + this.notHelpfulVotes.length;
  if (totalVotes === 0) return 0;
  return (this.helpfulVotes.length / totalVotes) * 100;
});

// Virtual for average category rating
flightReviewSchema.virtual('averageCategoryRating').get(function() {
  const ratings = Object.values(this.categoryRatings).filter(r => r > 0);
  if (ratings.length === 0) return 0;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
});

// Indexes for performance
flightReviewSchema.index({ airlineId: 1, rating: -1 });
flightReviewSchema.index({ departureAirportId: 1, arrivalAirportId: 1 });
flightReviewSchema.index({ flightDate: -1 });
flightReviewSchema.index({ reviewer: 1 });
flightReviewSchema.index({ status: 1, verified: 1 });
flightReviewSchema.index({ sentiment: 1, rating: -1 });
flightReviewSchema.index({ tripType: 1, travelClass: 1 });
flightReviewSchema.index({ createdAt: -1 });
flightReviewSchema.index({ helpfulVotes: -1 });

// Text search index
flightReviewSchema.index({
  title: 'text',
  comment: 'text',
  'pros': 'text',
  'cons': 'text'
});

export default flightReviewSchema;
