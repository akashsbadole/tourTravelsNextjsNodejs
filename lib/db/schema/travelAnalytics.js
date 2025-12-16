import { Schema } from "mongoose";

/**
 * Travel Analytics Schema
 * Comprehensive travel behavior and insights tracking
 */

// Travel History Schema
const travelHistorySchema = new Schema({
  _id: false,
  tripId: { type: String, required: true },
  tripType: {
    type: String,
    enum: ['leisure', 'business', 'family', 'adventure', 'romantic', 'solo', 'group'],
    required: true
  },
  destinations: [{
    city: { type: String, required: true },
    country: { type: String, required: true },
    airportCode: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    arrivalDate: { type: Date, required: true },
    departureDate: { type: Date, required: true },
    duration: { type: Number }, // days
    accommodation: {
      type: { type: String, enum: ['hotel', 'apartment', 'resort', 'hostel', 'other'] },
      name: { type: String },
      rating: { type: Number, min: 1, max: 5 },
      pricePerNight: { type: Number },
      currency: { type: String, default: 'USD' }
    },
    activities: [{
      type: { type: String, enum: ['sightseeing', 'dining', 'shopping', 'entertainment', 'sports', 'cultural', 'relaxation'] },
      name: { type: String },
      cost: { type: Number },
      rating: { type: Number, min: 1, max: 5 }
    }]
  }],
  transportation: {
    flights: [{
      flightNumber: { type: String },
      airline: { type: String },
      cabinClass: { type: String, enum: ['economy', 'premium_economy', 'business', 'first'] },
      departureAirport: { type: String },
      arrivalAirport: { type: String },
      departureTime: { type: Date },
      arrivalTime: { type: Date },
      cost: { type: Number },
      currency: { type: String, default: 'USD' }
    }],
    groundTransport: [{
      type: { type: String, enum: ['taxi', 'rental_car', 'public_transport', 'ride_sharing', 'walking'] },
      from: { type: String },
      to: { type: String },
      cost: { type: Number },
      duration: { type: Number } // minutes
    }]
  },
  totalCost: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    breakdown: {
      flights: { type: Number, default: 0 },
      accommodation: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    }
  },
  bookingDetails: {
    bookingDate: { type: Date, required: true },
    bookingPlatform: { type: String },
    bookingReference: { type: String },
    paymentMethod: { type: String },
    cancellationPolicy: { type: String }
  },
  satisfaction: {
    overallRating: { type: Number, min: 1, max: 5 },
    wouldRecommend: { type: Boolean },
    feedback: { type: String, maxlength: 1000 },
    highlights: [String],
    improvements: [String]
  },
  companions: [{
    type: { type: String, enum: ['family', 'friend', 'colleague', 'partner', 'solo'] },
    count: { type: Number, min: 1 }
  }],
  photos: [{ type: String }], // URLs to photos
  isPublic: { type: Boolean, default: false },
  tags: [String],
  notes: { type: String, maxlength: 2000 }
});

// Carbon Footprint Schema
const carbonFootprintSchema = new Schema({
  _id: false,
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalEmissions: { type: Number, required: true }, // in kg CO2
  breakdown: {
    flights: {
      emissions: { type: Number, default: 0 },
      distance: { type: Number, default: 0 }, // km
      flights: { type: Number, default: 0 }
    },
    accommodation: {
      emissions: { type: Number, default: 0 },
      nights: { type: Number, default: 0 }
    },
    groundTransport: {
      emissions: { type: Number, default: 0 },
      distance: { type: Number, default: 0 }, // km
      type: { type: String }
    },
    activities: {
      emissions: { type: Number, default: 0 }
    }
  },
  comparisons: {
    previousPeriod: { type: Number }, // percentage change
    averageTraveler: { type: Number }, // compared to average
    target: { type: Number }, // user's target
    offset: { type: Number } // carbon offset purchased
  },
  recommendations: [{
    type: { type: String, enum: ['transport', 'accommodation', 'activities', 'offset'] },
    title: { type: String },
    description: { type: String },
    potentialSavings: { type: Number }, // kg CO2
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] }
  }],
  offsets: [{
    type: { type: String, enum: ['tree_planting', 'renewable_energy', 'carbon_capture', 'verified_projects'] },
    amount: { type: Number },
    cost: { type: Number },
    currency: { type: String, default: 'USD' },
    provider: { type: String },
    certificateUrl: { type: String },
    purchasedAt: { type: Date, default: Date.now }
  }]
});

// Travel Goals Schema
const travelGoalsSchema = new Schema({
  _id: false,
  goalId: { type: String, required: true, unique: true },
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  category: {
    type: String,
    enum: ['destinations', 'experiences', 'budget', 'frequency', 'learning', 'fitness', 'social'],
    required: true
  },
  type: {
    type: String,
    enum: ['visit_destinations', 'visit_countries', 'total_trips', 'budget_limit', 'carbon_reduction', 'skill_learning'],
    required: true
  },
  target: {
    value: { type: Number, required: true },
    unit: { type: String, required: true }, // e.g., 'countries', 'trips', 'USD', 'kg CO2'
    deadline: { type: Date, required: true }
  },
  current: { type: Number, default: 0 },
  progress: { type: Number, default: 0 }, // percentage
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  milestones: [{
    value: { type: Number, required: true },
    achieved: { type: Boolean, default: false },
    achievedAt: { type: Date },
    reward: { type: String }
  }],
  rewards: [{
    type: { type: String, enum: ['points', 'badge', 'discount', 'upgrade'] },
    value: { type: Schema.Types.Mixed },
    description: { type: String }
  }],
  reminders: [{
    type: { type: String, enum: ['email', 'push', 'sms'] },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    enabled: { type: Boolean, default: true }
  }],
  isPublic: { type: Boolean, default: false },
  supporters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// Travel Insights Schema
const travelInsightsSchema = new Schema({
  _id: false,
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  generatedAt: { type: Date, default: Date.now },
  
  // Travel patterns
  patterns: {
    preferredDestinations: [{
      destination: { type: String },
      visits: { type: Number },
      satisfaction: { type: Number },
      averageCost: { type: Number }
    }],
    seasonalPreferences: [{
      season: { type: String, enum: ['spring', 'summer', 'fall', 'winter'] },
      trips: { type: Number },
      averageSpend: { type: Number }
    }],
    tripDuration: {
      average: { type: Number },
      shortest: { type: Number },
      longest: { type: Number },
      preferred: { type: Number }
    },
    bookingPatterns: {
      averageBookingLeadTime: { type: Number }, // days before travel
      preferredBookingDays: [Number], // 0-6, Sunday-Saturday
      lastMinuteBookings: { type: Number, default: 0 } // percentage
    }
  },
  
  // Financial insights
  financial: {
    totalSpent: { type: Number },
    averageTripCost: { type: Number },
    spendingByCategory: {
      flights: { type: Number, default: 0 },
      accommodation: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      shopping: { type: Number, default: 0 }
    },
    savingsOpportunities: [{
      category: { type: String },
      potentialSavings: { type: Number },
      recommendation: { type: String }
    }],
    budgetAdherence: {
      planned: { type: Number },
      actual: { type: Number },
      variance: { type: Number } // percentage
    }
  },
  
  // Preferences insights
  preferences: {
    accommodationTrends: [{
      type: { type: String },
      frequency: { type: Number },
      averageRating: { type: Number },
      averagePrice: { type: Number }
    }],
    transportPreferences: [{
      mode: { type: String },
      usage: { type: Number },
      satisfaction: { type: Number }
    }],
    activityPreferences: [{
      activity: { type: String },
      frequency: { type: Number },
      averageRating: { type: Number },
      averageCost: { type: Number }
    }]
  },
  
  // Recommendations
  recommendations: [{
    type: {
      type: String,
      enum: ['destination', 'accommodation', 'activity', 'savings', 'timing', 'experience']
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1 }, // AI confidence score
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    estimatedBenefit: { type: String },
    actionItems: [String],
    validUntil: { type: Date }
  }],
  
  // Predictions
  predictions: {
    nextTripLikelihood: { type: Number, min: 0, max: 1 },
    likelyDestinations: [{
      destination: { type: String },
      probability: { type: Number, min: 0, max: 1 },
      reasons: [String]
    }],
    estimatedNextSpend: { type: Number },
    seasonalRecommendations: [String]
  }
});

// Main Travel Analytics Schema
const travelAnalyticsSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  
  // Analytics sections
  travelHistory: [travelHistorySchema],
  
  carbonFootprint: {
    current: carbonFootprintSchema,
    historical: [carbonFootprintSchema],
    lifetime: {
      totalEmissions: { type: Number, default: 0 },
      totalOffsets: { type: Number, default: 0 },
      netEmissions: { type: Number, default: 0 },
      tripsTracked: { type: Number, default: 0 }
    }
  },
  
  travelGoals: [travelGoalsSchema],
  
  insights: {
    current: travelInsightsSchema,
    historical: [travelInsightsSchema]
  },
  
  // Aggregated metrics
  metrics: {
    totalTrips: { type: Number, default: 0 },
    totalCountries: { type: Number, default: 0 },
    totalCities: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageTripCost: { type: Number, default: 0 },
    averageTripDuration: { type: Number, default: 0 },
    favoriteDestination: { type: String },
    favoriteAirline: { type: String },
    favoriteHotelChain: { type: String },
    loyaltyPointsEarned: { type: Number, default: 0 },
    reviewsWritten: { type: Number, default: 0 },
    photosUploaded: { type: Number, default: 0 }
  },
  
  // Preferences analysis
  analyzedPreferences: {
    travelStyle: {
      type: String,
      enum: ['budget', 'mid_range', 'luxury', 'backpacker', 'family', 'business', 'adventure'],
      default: 'mid_range'
    },
    tripFrequency: {
      type: String,
      enum: ['rare', 'occasional', 'regular', 'frequent'],
      default: 'occasional'
    },
    destinationPreferences: {
      type: { type: String, enum: ['domestic', 'international', 'mixed'] },
      regions: [{ type: String }], // e.g., ['europe', 'asia', 'north_america']
      climate: { type: String, enum: ['tropical', 'temperate', 'cold', 'desert', 'mediterranean'] }
    },
    accommodationPreferences: {
      type: { type: String, enum: ['hotel', 'apartment', 'resort', 'hostel', 'mixed'] },
      amenities: [String]
    },
    transportPreferences: {
      primary: { type: String, enum: ['flight', 'train', 'car', 'bus', 'mixed'] },
      class: { type: String, enum: ['economy', 'business', 'mixed'] }
    }
  },
  
  // Social insights
  socialMetrics: {
    sharedTrips: { type: Number, default: 0 },
    travelBuddyConnections: { type: Number, default: 0 },
    wishlistShares: { type: Number, default: 0 },
    recommendationsGiven: { type: Number, default: 0 },
    recommendationsReceived: { type: Number, default: 0 },
    influenceScore: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  // Privacy settings for analytics
  privacy: {
    shareAnonymizedData: { type: Boolean, default: true },
    shareTravelPatterns: { type: Boolean, default: false },
    shareSpendingHabits: { type: Boolean, default: false },
    allowPersonalizedRecommendations: { type: Boolean, default: true }
  },
  
  // Metadata
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastAnalysisDate: { type: Date, default: Date.now },
    dataQuality: {
      completeness: { type: Number, default: 0, min: 0, max: 100 },
      accuracy: { type: Number, default: 0, min: 0, max: 100 },
      lastValidated: { type: Date }
    },
    version: { type: Number, default: 1 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
travelAnalyticsSchema.index({ userId: 1 });
travelAnalyticsSchema.index({ 'travelHistory.tripId': 1 });
travelAnalyticsSchema.index({ 'travelGoals.status': 1 });
travelAnalyticsSchema.index({ 'travelGoals.deadline': 1 });
travelAnalyticsSchema.index({ 'carbonFootprint.current.endDate': -1 });
travelAnalyticsSchema.index({ 'insights.current.generatedAt': -1 });
travelAnalyticsSchema.index({ 'metrics.totalTrips': -1 });
travelAnalyticsSchema.index({ 'metadata.lastAnalysisDate': -1 });

// Virtual fields
travelAnalyticsSchema.virtual('activeGoals').get(function() {
  return this.travelGoals.filter(goal => goal.status === 'active');
});

travelAnalyticsSchema.virtual('completedGoals').get(function() {
  return this.travelGoals.filter(goal => goal.status === 'completed');
});

travelAnalyticsSchema.virtual('recentTrips').get(function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.travelHistory.filter(trip => 
    trip.destinations.some(dest => dest.arrivalDate >= thirtyDaysAgo)
  );
});

travelAnalyticsSchema.virtual('carbonEfficiency').get(function() {
  if (this.metrics.totalTrips === 0) return 0;
  return this.carbonFootprint.lifetime.totalEmissions / this.metrics.totalTrips;
});

// Pre-save middleware
travelAnalyticsSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  
  // Auto-update metrics
  this.updateMetrics();
  
  next();
});

// Instance methods
travelAnalyticsSchema.methods.updateMetrics = function() {
  // Update basic metrics
  this.metrics.totalTrips = this.travelHistory.length;
  
  // Calculate unique countries and cities
  const countries = new Set();
  const cities = new Set();
  let totalSpent = 0;
  let totalDuration = 0;
  
  this.travelHistory.forEach(trip => {
    trip.destinations.forEach(dest => {
      countries.add(dest.country);
      cities.add(dest.city);
    });
    totalSpent += trip.totalCost.amount;
    
    // Calculate trip duration
    if (trip.destinations.length > 0) {
      const arrival = new Date(trip.destinations[0].arrivalDate);
      const departure = new Date(trip.destinations[trip.destinations.length - 1].departureDate);
      totalDuration += Math.ceil((departure - arrival) / (1000 * 60 * 60 * 24));
    }
  });
  
  this.metrics.totalCountries = countries.size;
  this.metrics.totalCities = cities.size;
  this.metrics.totalSpent = totalSpent;
  this.metrics.averageTripCost = this.metrics.totalTrips > 0 ? totalSpent / this.metrics.totalTrips : 0;
  this.metrics.averageTripDuration = this.metrics.totalTrips > 0 ? totalDuration / this.metrics.totalTrips : 0;
  
  // Update goal progress
  this.travelGoals.forEach(goal => {
    this.updateGoalProgress(goal);
  });
};

travelAnalyticsSchema.methods.updateGoalProgress = function(goal) {
  let current = 0;
  
  switch (goal.type) {
    case 'visit_destinations':
      const destinations = new Set();
      this.travelHistory.forEach(trip => {
        trip.destinations.forEach(dest => destinations.add(dest.destination));
      });
      current = destinations.size;
      break;
      
    case 'visit_countries':
      const countries = new Set();
      this.travelHistory.forEach(trip => {
        trip.destinations.forEach(dest => countries.add(dest.country));
      });
      current = countries.size;
      break;
      
    case 'total_trips':
      current = this.metrics.totalTrips;
      break;
      
    case 'budget_limit':
      // Calculate spending in goal period
      const periodTrips = this.travelHistory.filter(trip => 
        trip.bookingDetails.bookingDate >= goal.createdAt &&
        trip.bookingDetails.bookingDate <= goal.target.deadline
      );
      current = periodTrips.reduce((sum, trip) => sum + trip.totalCost.amount, 0);
      break;
      
    case 'carbon_reduction':
      // Calculate carbon footprint reduction
      current = this.carbonFootprint.lifetime.totalOffsets;
      break;
  }
  
  goal.current = current;
  goal.progress = Math.min((current / goal.target.value) * 100, 100);
  
  // Check milestones
  goal.milestones.forEach(milestone => {
    if (!milestone.achieved && current >= milestone.value) {
      milestone.achieved = true;
      milestone.achievedAt = new Date();
    }
  });
  
  // Check if goal is completed
  if (goal.progress >= 100 && goal.status === 'active') {
    goal.status = 'completed';
    goal.completedAt = new Date();
  }
};

export default travelAnalyticsSchema;