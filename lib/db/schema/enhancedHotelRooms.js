import { Schema } from "mongoose";

const roomAmenitySchema = new Schema({
  _id: false,
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ["bathroom", "entertainment", "comfort", "kitchen", "work", "safety", "wellness", "other"],
    required: true
  },
  included: { type: Boolean, default: true },
  description: String,
  icon: String,
}, { _id: false });

const roomFeatureSchema = new Schema({
  _id: false,
  name: { type: String, required: true },
  value: Schema.Types.Mixed,
  category: {
    type: String,
    enum: ["view", "bedding", "size", "accessibility", "technology", "location", "other"],
    required: true
  },
  description: String,
  icon: String,
}, { _id: false });

const roomPricingSchema = new Schema({
  base: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: {
    amount: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    validUntil: Date,
    minNights: Number,
    applicableDays: [{ type: String }], // e.g., ["monday", "tuesday"]
    seasonalPricing: [{
      season: { type: String, required: true }, // e.g., "summer", "winter", "holidays"
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      priceMultiplier: { type: Number, required: true, min: 0.1, max: 5 },
    }],
    lastMinutePricing: {
      enabled: { type: Boolean, default: false },
      hoursBeforeCheckIn: { type: Number, default: 24 },
      discountPercentage: { type: Number, default: 10 },
    },
  },
  serviceFee: { type: Number, default: 0 },
  currency: { type: String, default: "USD" },
  extraPersonFee: { type: Number, default: 0 },
  childFee: { type: Number, default: 0 },
  weekendSurcharge: { type: Number, default: 0 },
  cleaningFee: { type: Number, default: 0 },
  depositRequired: { type: Number, default: 0 },
}, { _id: false });

const roomAvailabilitySchema = new Schema({
  _id: false,
  status: {
    type: String,
    enum: ["available", "occupied", "maintenance", "out_of_service", "reserved"],
    default: "available"
  },
  blockedDates: [{
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    blockType: {
      type: String,
      enum: ["maintenance", "renovation", "private_event", "seasonal_closure", "other"],
      required: true
    }
  }],
  minimumStay: { type: Number, default: 1 }, // minimum nights
  maximumStay: { type: Number, default: 30 }, // maximum nights
  checkInDays: [{ type: String }], // days when check-in is allowed
  checkOutDays: [{ type: String }], // days when check-out is allowed
  advanceBookingRequired: { type: Number, default: 0 }, // days in advance
  lastMinuteBookingAllowed: { type: Boolean, default: true },
}, { _id: false });

const roomCustomizationSchema = new Schema({
  _id: false,
  bedType: {
    type: String,
    enum: ["king", "queen", "double", "twin", "sofa_bed", "bunk_bed", "custom"],
    default: "queen"
  },
  bedConfiguration: [{
    type: { type: String, required: true },
    count: { type: Number, required: true, min: 1 },
    size: String,
  }],
  viewPreference: {
    type: String,
    enum: ["city", "garden", "pool", "ocean", "mountain", "street", "courtyard", "none"],
    default: "none"
  },
  floorPreference: {
    type: Number,
    min: 1,
    max: 50
  },
  smokingPreference: {
    type: String,
    enum: ["smoking", "non_smoking", "either"],
    default: "non_smoking"
  },
  accessibilityFeatures: [{
    type: String,
    enum: ["wheelchair_accessible", "grab_bars", "roll_in_shower", "visual_aids", "hearing_aids", "lowered_peephole"]
  }],
  specialRequests: [String],
}, { _id: false });

const enhancedHotelRoomSchema = new Schema(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    roomType: {
      type: String,
      enum: ["standard", "deluxe", "suite", "executive", "family", "penthouse", "studio", "apartment", "villa"],
      required: true
    },
    category: {
      type: String,
      enum: ["budget", "mid_range", "luxury", "ultra_luxury"],
      required: true
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    shortDescription: { type: String }, // for quick previews
    size: {
      squareMeters: { type: Number, required: true },
      squareFeet: Number,
    },
    images: [{
      url: { type: String, required: true },
      alt: String,
      category: {
        type: String,
        enum: ["bedroom", "bathroom", "view", "living_area", "dining", "balcony", "other"],
        default: "bedroom"
      },
      isPrimary: { type: Boolean, default: false }
    }],
    virtualTour: {
      enabled: { type: Boolean, default: false },
      url: String,
      thumbnail: String,
    },
    amenities: [roomAmenitySchema],
    features: [roomFeatureSchema],
    pricing: roomPricingSchema,
    availability: roomAvailabilitySchema,
    customization: roomCustomizationSchema,
    capacity: {
      maxAdults: { type: Number, required: true, min: 1 },
      maxChildren: { type: Number, default: 0 },
      maxGuests: { type: Number, required: true, min: 1 },
      infantAllowed: { type: Boolean, default: true },
      extraBedAllowed: { type: Boolean, default: false },
      maxExtraBeds: { type: Number, default: 0 },
    },
    bedding: {
      totalBeds: { type: Number, required: true, min: 1 },
      bedOptions: String,
      bedTypes: [String],
    },
    location: {
      floor: { type: Number, required: true },
      roomNumber: { type: String, required: true },
      building: String,
      wing: String,
      section: String,
    },
    accessibility: {
      wheelchairAccessible: { type: Boolean, default: false },
      hearingAccessible: { type: Boolean, default: false },
      visualAccessible: { type: Boolean, default: false },
      mobilityAccessible: { type: Boolean, default: false },
    },
    policies: {
      smokingAllowed: { type: Boolean, default: false },
      petsAllowed: { type: Boolean, default: false },
      petFee: { type: Number, default: 0 },
      childrenAllowed: { type: Boolean, default: true },
      partiesAllowed: { type: Boolean, default: false },
      checkInTime: { type: String, default: "15:00" },
      checkOutTime: { type: String, default: "11:00" },
    },
    technology: {
      wifi: { type: Boolean, default: true },
      wifiSpeed: String,
      smartTV: { type: Boolean, default: false },
      streamingServices: [String],
      workDesk: { type: Boolean, default: true },
      airConditioning: { type: Boolean, default: true },
      heating: { type: Boolean, default: true },
      thermostatControl: { type: Boolean, default: false },
    },
    bathroom: {
      privateBathroom: { type: Boolean, default: true },
      bathtub: { type: Boolean, default: false },
      shower: { type: Boolean, default: true },
      hairdryer: { type: Boolean, default: true },
      toiletries: { type: Boolean, default: true },
      bathrobes: { type: Boolean, default: false },
    },
    tags: [{ type: String }],
    rating: {
      average: { type: Number, min: 0, max: 5, default: 0 },
      reviewCount: { type: Number, default: 0 },
    },
    popularity: {
      bookingCount: { type: Number, default: 0 },
      viewCount: { type: Number, default: 0 },
      wishlistCount: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance", "deprecated"],
      default: "active"
    },
    lastRenovated: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
enhancedHotelRoomSchema.index({ hotelId: 1, status: 1 });
enhancedHotelRoomSchema.index({ roomType: 1, category: 1 });
enhancedHotelRoomSchema.index({ "capacity.maxGuests": 1 });
enhancedHotelRoomSchema.index({ "pricing.base": 1 });
enhancedHotelRoomSchema.index({ "rating.average": -1 });
enhancedHotelRoomSchema.index({ "popularity.bookingCount": -1 });
enhancedHotelRoomSchema.index({ tags: 1 });

// Virtual for calculated fields
enhancedHotelRoomSchema.virtual('pricePerNight').get(function() {
  return this.pricing.base + this.pricing.tax + this.pricing.serviceFee;
});

enhancedHotelRoomSchema.virtual('isAvailable').get(function() {
  return this.availability.status === 'available';
});

export default enhancedHotelRoomSchema;