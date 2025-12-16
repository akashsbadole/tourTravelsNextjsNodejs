import { Schema } from "mongoose";

const roomComparisonSchema = new Schema({
  _id: false,
  roomId: { 
    type: Schema.Types.ObjectId, 
    ref: "EnhancedHotelRoom", 
    required: true 
  },
  hotelId: { 
    type: Schema.Types.ObjectId, 
    ref: "Hotel", 
    required: true 
  },
  addedAt: { 
    type: Date, 
    default: Date.now 
  },
  customNotes: String,
  priority: { 
    type: Number, 
    default: 0 
  }, // for manual sorting
}, { _id: false });

const roomComparisonListSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  sessionId: { 
    type: String, 
    required: true 
  }, // for guest users
  rooms: [roomComparisonSchema],
  searchCriteria: {
    checkInDate: Date,
    checkOutDate: Date,
    guests: Number,
    rooms: Number,
    city: String,
    country: String,
  },
  comparisonMetrics: {
    priceWeight: { type: Number, default: 0.3 },
    amenitiesWeight: { type: Number, default: 0.2 },
    locationWeight: { type: Number, default: 0.2 },
    sizeWeight: { type: Number, default: 0.1 },
    ratingWeight: { type: Number, default: 0.2 },
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
roomComparisonListSchema.index({ userId: 1, isActive: 1 });
roomComparisonListSchema.index({ sessionId: 1, isActive: 1 });
roomComparisonListSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if comparison is expired
roomComparisonListSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Virtual for room count
roomComparisonListSchema.virtual('roomCount').get(function() {
  return this.rooms.length;
});

export default roomComparisonListSchema;