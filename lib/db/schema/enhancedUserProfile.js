import { Schema } from "mongoose";

/**
 * Enhanced User Profile Schema
 * Extends the existing user schema with comprehensive profile management features
 */

// Travel Preferences Schema
const travelPreferencesSchema = new Schema({
  _id: false,
  // Flight preferences
  flights: {
    preferredAirlines: [{ type: String }],
    preferredCabinClass: {
      type: String,
      enum: ['economy', 'premium_economy', 'business', 'first'],
      default: 'economy'
    },
    seatPreferences: [{
      type: String,
      enum: ['window', 'aisle', 'middle', 'exit_row', 'front', 'back']
    }],
    mealPreferences: [{
      type: String,
      enum: ['standard', 'vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free', 'diabetic', 'child']
    }],
    baggageRequirements: {
      carryOn: { type: Boolean, default: true },
      checked: { type: Number, default: 0 },
      specialItems: [String] // e.g., ['sports_equipment', 'musical_instrument']
    },
    airportPreferences: {
      preferredAirports: [String],
      avoidedAirports: [String],
      maxConnectionTime: { type: Number, default: 180 }, // minutes
      minConnectionTime: { type: Number, default: 45 } // minutes
    }
  },
  // Hotel preferences
  hotels: {
    preferredChains: [{ type: String }],
    roomType: {
      type: String,
      enum: ['standard', 'deluxe', 'suite', 'presidential'],
      default: 'standard'
    },
    bedPreferences: [{
      type: String,
      enum: ['king', 'queen', 'double', 'twin', 'sofa_bed']
    }],
    amenities: [{
      type: String,
      enum: ['wifi', 'parking', 'pool', 'gym', 'spa', 'restaurant', 'bar', 'pet_friendly', 'business_center']
    }],
    locationPreferences: {
      cityCenter: { type: Boolean, default: false },
      nearAirport: { type: Boolean, default: false },
      nearPublicTransport: { type: Boolean, default: false },
      nearAttractions: [String]
    }
  },
  // General travel preferences
  general: {
    travelStyle: {
      type: String,
      enum: ['budget', 'mid_range', 'luxury', 'backpacker', 'family', 'business', 'adventure'],
      default: 'mid_range'
    },
    accommodationType: [{
      type: String,
      enum: ['hotel', 'hostel', 'apartment', 'resort', 'villa', 'guesthouse']
    }],
    transportModes: [{
      type: String,
      enum: ['flight', 'train', 'bus', 'car_rental', 'cruise', 'taxi']
    }],
    tripDuration: {
      min: { type: Number, default: 1 }, // days
      max: { type: Number, default: 30 } // days
    },
    budgetRange: {
      min: { type: Number, default: 0 },
      max: { type: Number },
      currency: { type: String, default: 'USD' }
    },
    travelFrequency: {
      type: String,
      enum: ['rarely', 'occasionally', 'frequently', 'very_frequently'],
      default: 'occasionally'
    }
  }
});

// Emergency Contact Schema
const emergencyContactSchema = new Schema({
  _id: false,
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phone: {
    number: { type: String, required: true },
    dialCode: { type: String, required: true }
  },
  email: { type: String },
  address: { type: String },
  isPrimary: { type: Boolean, default: false }
});

// Travel Document Schema
const travelDocumentSchema = new Schema({
  _id: false,
  documentType: {
    type: String,
    enum: ['passport', 'visa', 'driver_license', 'national_id', 'health_certificate', 'travel_insurance'],
    required: true
  },
  documentNumber: { type: String, required: true },
  issuingCountry: { type: String, required: true }, // ISO country code
  issueDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  documentUrl: { type: String }, // Secure URL to stored document
  isVerified: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'expired'],
    default: 'pending'
  },
  verifiedAt: { type: Date },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verificationNotes: { type: String },
  reminders: [{
    type: { type: String, enum: ['email', 'sms', 'push'] },
    daysBeforeExpiry: { type: Number, default: 90 },
    enabled: { type: Boolean, default: true }
  }]
});

// Profile Completion Tracking Schema
const profileCompletionSchema = new Schema({
  _id: false,
  overallPercentage: { type: Number, default: 0, min: 0, max: 100 },
  sections: {
    basicInfo: { type: Number, default: 0 }, // name, email, phone
    personalDetails: { type: Number, default: 0 }, // DOB, address
    preferences: { type: Number, default: 0 }, // travel preferences
    documents: { type: Number, default: 0 }, // travel documents
    emergency: { type: Number, default: 0 }, // emergency contacts
    verification: { type: Number, default: 0 }, // profile verification
    social: { type: Number, default: 0 }, // social features
    security: { type: Number, default: 0 } // 2FA, security settings
  },
  lastUpdated: { type: Date, default: Date.now },
  rewards: [{
    type: { type: String, enum: ['points', 'badge', 'discount', 'upgrade'] },
    value: { type: Schema.Types.Mixed },
    unlockedAt: { type: Date, default: Date.now },
    description: { type: String }
  }]
});

// Profile Verification Schema
const profileVerificationSchema = new Schema({
  _id: false,
  isVerified: { type: Boolean, default: false },
  verificationLevel: {
    type: String,
    enum: ['basic', 'enhanced', 'premium'],
    default: 'basic'
  },
  verificationMethods: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'document', 'video', 'social', 'government_id']
    },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    expiresAt: { type: Date },
    verificationData: { type: Schema.Types.Mixed }
  }],
  badges: [{
    type: {
      type: String,
      enum: ['verified_traveler', 'premium_member', 'frequent_flyer', 'trusted_reviewer', 'early_adopter', 'community_leader']
    },
    name: { type: String, required: true },
    description: { type: String },
    iconUrl: { type: String },
    earnedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    isVisible: { type: Boolean, default: true }
  }],
  trustScore: { type: Number, default: 0, min: 0, max: 100 },
  verificationHistory: [{
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
  }]
});

// Privacy Settings Schema
const privacySettingsSchema = new Schema({
  _id: false,
  profileVisibility: {
    type: String,
    enum: ['public', 'friends_only', 'private'],
    default: 'private'
  },
  dataSharing: {
    analytics: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
    personalization: { type: Boolean, default: true },
    partners: { type: Boolean, default: false }
  },
  communicationPreferences: {
    email: {
      promotional: { type: Boolean, default: true },
      transactional: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
      priceAlerts: { type: Boolean, default: true }
    },
    sms: {
      promotional: { type: Boolean, default: false },
      transactional: { type: Boolean, default: true },
      alerts: { type: Boolean, default: true }
    },
    push: {
      promotional: { type: Boolean, default: true },
      transactional: { type: Boolean, default: true },
      recommendations: { type: Boolean, default: true }
    }
  },
  socialSettings: {
    allowFriendRequests: { type: Boolean, default: true },
    showTravelHistory: { type: Boolean, default: false },
    showCurrentTrips: { type: Boolean, default: true },
    showWishlist: { type: Boolean, default: false },
    allowTagging: { type: Boolean, default: true }
  },
  dataRetention: {
    searchHistory: { type: Number, default: 365 }, // days
    bookingHistory: { type: Number, default: 2555 }, // days (7 years)
    analytics: { type: Number, default: 365 }, // days
    documents: { type: Number, default: 2555 } // days
  }
});

// Security Settings Schema
const securitySettingsSchema = new Schema({
  _id: false,
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    methods: [{
      type: {
        type: String,
        enum: ['sms', 'email', 'authenticator_app', 'hardware_key']
      },
      isEnabled: { type: Boolean, default: false },
      secret: { type: String }, // For authenticator apps
      phoneNumber: { type: String },
      backupCodes: [String]
    }],
    enforced: { type: Boolean, default: false }
  },
  loginMonitoring: {
    enabled: { type: Boolean, default: true },
    alertOnNewDevice: { type: Boolean, default: true },
    alertOnSuspiciousActivity: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 1440 }, // minutes
    maxConcurrentSessions: { type: Number, default: 3 }
  },
  passwordPolicy: {
    lastChanged: { type: Date },
    expiryDays: { type: Number, default: 90 },
    complexityRequired: { type: Boolean, default: true },
    preventReuse: { type: Number, default: 5 } // number of previous passwords
  },
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    location: {
      country: { type: String },
      city: { type: String }
    },
    success: { type: Boolean, default: true },
    failureReason: { type: String }
  }]
});

// Social Features Schema
const socialFeaturesSchema = new Schema({
  _id: false,
  profileSharing: {
    shareCode: { type: String, unique: true, sparse: true },
    isPublic: { type: Boolean, default: false },
    publicProfileUrl: { type: String },
    allowPublicView: { type: Boolean, default: false }
  },
  travelBuddy: {
    preferences: [{
      type: String,
      enum: ['adventure', 'relaxation', 'culture', 'nightlife', 'nature', 'photography', 'food', 'shopping']
    }],
    travelStyle: {
      type: String,
      enum: ['budget', 'mid_range', 'luxury', 'backpacker'],
      default: 'mid_range'
    },
    bio: { type: String, maxlength: 500 },
    interests: [String],
    languages: [{
      language: { type: String },
      proficiency: {
        type: String,
        enum: ['basic', 'conversational', 'fluent', 'native']
      }
    }],
    availability: {
      type: String,
      enum: ['available', 'busy', 'not_interested'],
      default: 'not_interested'
    },
    preferredDestinations: [String],
    avoidedDestinations: [String]
  },
  wishlist: [{
    _id: { type: Schema.Types.ObjectId, auto: true },
    itemType: {
      type: String,
      enum: ['destination', 'hotel', 'flight', 'activity', 'restaurant']
    },
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    estimatedCost: {
      amount: { type: Number },
      currency: { type: String, default: 'USD' }
    },
    targetDate: { type: Date },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    notes: { type: String },
    addedAt: { type: Date, default: Date.now },
    isPublic: { type: Boolean, default: false },
    tags: [String]
  }],
  socialFeed: {
    isEnabled: { type: Boolean, default: true },
    autoShareBookings: { type: Boolean, default: false },
    autoShareReviews: { type: Boolean, default: true },
    showRecommendations: { type: Boolean, default: true }
  }
});

// Loyalty Programs Integration Schema
const loyaltyProgramsSchema = new Schema({
  _id: false,
  programs: [{
    programName: { type: String, required: true },
    programType: {
      type: String,
      enum: ['airline', 'hotel', 'credit_card', 'travel_agency', 'general'],
      required: true
    },
    membershipNumber: { type: String, required: true },
    membershipLevel: { type: String },
    pointsBalance: { type: Number, default: 0 },
    pointsExpiry: { type: Date },
    benefits: [String],
    linkedAccount: { type: Schema.Types.ObjectId, ref: 'Account' },
    isActive: { type: Boolean, default: true },
    lastSynced: { type: Date, default: Date.now },
    syncFrequency: {
      type: String,
      enum: ['real_time', 'daily', 'weekly', 'manual'],
      default: 'weekly'
    },
    apiCredentials: {
      apiKey: { type: String },
      memberSecret: { type: String },
      programId: { type: String }
    }
  }],
  totalPoints: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 }, // Estimated monetary value
  preferredProgram: { type: String },
  autoRedeem: { type: Boolean, default: false },
  notifications: {
    pointsExpiring: { type: Boolean, default: true },
    levelChanges: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true }
  }
});

// Mobile Settings Schema
const mobileSettingsSchema = new Schema({
  _id: false,
  biometricAuth: {
    enabled: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ['fingerprint', 'face_id', 'voice', 'iris'],
      required: function() { return this.enabled; }
    },
    deviceId: { type: String }
  },
  quickActions: [{
    action: {
      type: String,
      enum: ['search_flights', 'search_hotels', 'view_bookings', 'check_in', 'contact_support']
    },
    isEnabled: { type: Boolean, default: true },
    position: { type: Number }
  }],
  mobilePreferences: {
    offlineMode: { type: Boolean, default: true },
    autoDownloadDocuments: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    locationServices: { type: Boolean, default: false },
    dataUsage: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  devices: [{
    deviceId: { type: String, required: true },
    deviceType: {
      type: String,
      enum: ['ios', 'android', 'tablet', 'desktop'],
      required: true
    },
    deviceName: { type: String },
    lastActive: { type: Date, default: Date.now },
    pushToken: { type: String },
    isTrusted: { type: Boolean, default: false },
    registeredAt: { type: Date, default: Date.now }
  }]
});

// Main Enhanced User Profile Schema
const enhancedUserProfileSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  
  // Enhanced profile sections
  travelPreferences: {
    type: travelPreferencesSchema,
    default: () => ({})
  },
  
  emergencyContacts: [emergencyContactSchema],
  
  travelDocuments: [travelDocumentSchema],
  
  profileCompletion: {
    type: profileCompletionSchema,
    default: () => ({})
  },
  
  verification: {
    type: profileVerificationSchema,
    default: () => ({})
  },
  
  privacy: {
    type: privacySettingsSchema,
    default: () => ({})
  },
  
  security: {
    type: securitySettingsSchema,
    default: () => ({})
  },
  
  social: {
    type: socialFeaturesSchema,
    default: () => ({})
  },
  
  loyaltyPrograms: {
    type: loyaltyProgramsSchema,
    default: () => ({})
  },
  
  mobile: {
    type: mobileSettingsSchema,
    default: () => ({})
  },
  
  // Metadata
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    profileVersion: { type: Number, default: 1 },
    migrationHistory: [{
      from: { type: Number },
      to: { type: Number },
      migratedAt: { type: Date, default: Date.now },
      notes: { type: String }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
enhancedUserProfileSchema.index({ userId: 1 });
enhancedUserProfileSchema.index({ 'profileCompletion.overallPercentage': -1 });
enhancedUserProfileSchema.index({ 'verification.verificationLevel': 1 });
enhancedUserProfileSchema.index({ 'verification.isVerified': 1 });
enhancedUserProfileSchema.index({ 'social.profileSharing.shareCode': 1 });
enhancedUserProfileSchema.index({ 'loyaltyPrograms.programs.programName': 1 });
enhancedUserProfileSchema.index({ 'travelDocuments.expiryDate': 1 });
enhancedUserProfileSchema.index({ 'metadata.lastLoginAt': -1 });

// Virtual fields
enhancedUserProfileSchema.virtual('isProfileComplete').get(function() {
  return this.profileCompletion.overallPercentage >= 80;
});

enhancedUserProfileSchema.virtual('hasValidDocuments').get(function() {
  const now = new Date();
  return this.travelDocuments.some(doc => 
    doc.isVerified && doc.expiryDate > now
  );
});

enhancedUserProfileSchema.virtual('activeLoyaltyPrograms').get(function() {
  return this.loyaltyPrograms.programs.filter(program => 
    program.isActive && program.pointsBalance > 0
  );
});

enhancedUserProfileSchema.virtual('expiringDocuments').get(function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return this.travelDocuments.filter(doc => 
    doc.expiryDate <= thirtyDaysFromNow && doc.expiryDate > new Date()
  );
});

// Pre-save middleware
enhancedUserProfileSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  
  // Auto-calculate profile completion
  this.calculateProfileCompletion();
  
  next();
});

// Instance methods
enhancedUserProfileSchema.methods.calculateProfileCompletion = function() {
  let totalScore = 0;
  const sections = this.profileCompletion.sections;
  
  // Basic info (25%)
  sections.basicInfo = this.basicInfoComplete() ? 25 : 0;
  
  // Personal details (15%)
  sections.personalDetails = this.personalDetailsComplete() ? 15 : 0;
  
  // Preferences (20%)
  sections.preferences = this.preferencesComplete() ? 20 : 0;
  
  // Documents (15%)
  sections.documents = this.documentsComplete() ? 15 : 0;
  
  // Emergency contacts (10%)
  sections.emergency = this.emergencyComplete() ? 10 : 0;
  
  // Verification (10%)
  sections.verification = this.verificationComplete() ? 10 : 0;
  
  // Social (5%)
  sections.social = this.socialComplete() ? 5 : 0;
  
  // Security (10%)
  sections.security = this.securityComplete() ? 10 : 0;
  
  // Calculate overall percentage
  this.profileCompletion.overallPercentage = Object.values(sections).reduce((sum, score) => sum + score, 0);
  this.profileCompletion.lastUpdated = new Date();
  
  return this.profileCompletion.overallPercentage;
};

enhancedUserProfileSchema.methods.basicInfoComplete = function() {
  // This would reference the base User model
  return true; // Placeholder - would check User model fields
};

enhancedUserProfileSchema.methods.personalDetailsComplete = function() {
  // This would reference the base User model
  return true; // Placeholder - would check User model fields
};

enhancedUserProfileSchema.methods.preferencesComplete = function() {
  const prefs = this.travelPreferences;
  return prefs && (
    prefs.flights.preferredAirlines.length > 0 ||
    prefs.hotels.preferredChains.length > 0 ||
    prefs.general.travelStyle !== 'mid_range'
  );
};

enhancedUserProfileSchema.methods.documentsComplete = function() {
  return this.travelDocuments.length > 0 && 
         this.travelDocuments.some(doc => doc.isVerified);
};

enhancedUserProfileSchema.methods.emergencyComplete = function() {
  return this.emergencyContacts.length > 0;
};

enhancedUserProfileSchema.methods.verificationComplete = function() {
  return this.verification.isVerified;
};

enhancedUserProfileSchema.methods.socialComplete = function() {
  return this.social.profileSharing.shareCode || 
         this.social.wishlist.length > 0;
};

enhancedUserProfileSchema.methods.securityComplete = function() {
  return this.security.twoFactorAuth.enabled;
};

export default enhancedUserProfileSchema;