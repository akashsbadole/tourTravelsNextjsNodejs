import { Schema } from "mongoose";

const searchParametersSchema = new Schema({
  _id: false,
  // Flight search parameters
  flight: {
    tripType: {
      type: String,
      enum: ['one_way', 'round_trip', 'multi_city'],
      default: 'one_way'
    },
    origin: {
      airportCode: { type: String },
      city: { type: String },
      country: { type: String }
    },
    destination: {
      airportCode: { type: String },
      city: { type: String },
      country: { type: String }
    },
    departureDate: { type: Date },
    returnDate: { type: Date },
    passengers: {
      adults: { type: Number, default: 1, min: 1 },
      children: { type: Number, default: 0, min: 0 },
      infants: { type: Number, default: 0, min: 0 }
    },
    cabinClass: {
      type: String,
      enum: ['economy', 'premium_economy', 'business', 'first'],
      default: 'economy'
    },
    airlines: [{ type: String }],
    priceRange: {
      min: { type: Number },
      max: { type: Number }
    },
    directFlightsOnly: { type: Boolean, default: false },
    flexibleDates: { type: Boolean, default: false },
    timePreferences: {
      departureTime: {
        from: { type: String }, // HH:mm format
        to: { type: String }     // HH:mm format
      },
      arrivalTime: {
        from: { type: String }, // HH:mm format
        to: { type: String }     // HH:mm format
      }
    },
    multiCityLegs: [{
      origin: { type: String },
      destination: { type: String },
      date: { type: Date }
    }]
  },
  // Hotel search parameters
  hotel: {
    destination: {
      city: { type: String },
      country: { type: String },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
      }
    },
    checkInDate: { type: Date },
    checkOutDate: { type: Date },
    rooms: {
      count: { type: Number, default: 1, min: 1 },
      guests: {
        adults: { type: Number, default: 1, min: 1 },
        children: { type: Number, default: 0, min: 0 },
        infants: { type: Number, default: 0, min: 0 }
      }
    },
    roomTypes: [{
      type: String,
      enum: ['standard', 'deluxe', 'suite', 'presidential', 'family', 'accessible']
    }],
    amenities: [{ type: String }],
    priceRange: {
      min: { type: Number },
      max: { type: Number }
    },
    starRating: {
      min: { type: Number, min: 1, max: 5 },
      max: { type: Number, min: 1, max: 5 }
    },
    propertyTypes: [{
      type: String,
      enum: ['hotel', 'resort', 'apartment', 'villa', 'hostel', 'guesthouse']
    }],
    guestRating: {
      min: { type: Number, min: 1, max: 10 }
    },
    distanceFromCenter: {
      max: { type: Number } // in kilometers
    },
    accessibility: {
      wheelchairAccessible: { type: Boolean },
      hearingAccessible: { type: Boolean },
      visualAccessible: { type: Boolean },
      mobilityAccessible: { type: Boolean }
    },
    mealPlans: [{
      type: String,
      enum: ['room_only', 'breakfast', 'half_board', 'full_board', 'all_inclusive']
    }],
    specialOffers: { type: Boolean, default: false }
  }
});

const searchResultsSchema = new Schema({
  _id: false,
  totalResults: { type: Number, required: true },
  displayedResults: { type: Number, required: true },
  searchTime: { type: Number, required: true }, // in milliseconds
  resultIds: [{ type: Schema.Types.ObjectId }], // IDs of flight/hotel results
  priceRange: {
    min: { type: Number },
    max: { type: Number },
    average: { type: Number }
  },
  filters: {
    applied: [{ type: String }],
    available: [{ type: String }]
  },
  sorting: {
    by: { type: String },
    order: { type: String, enum: ['asc', 'desc'] }
  }
});

const searchInteractionSchema = new Schema({
  _id: false,
  interactionType: {
    type: String,
    enum: ['view', 'click', 'favorite', 'compare', 'book_initiated', 'filter_applied', 'sort_changed'],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  resultId: { type: Schema.Types.ObjectId },
  position: { type: Number }, // Position in search results (1-based)
  duration: { type: Number }, // Time spent viewing in milliseconds
  metadata: { type: Schema.Types.Mixed } // Additional interaction data
});

const enhancedSearchHistorySchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  sessionId: { type: String, required: true },
  searchId: { type: String, required: true, unique: true },
  searchType: {
    type: String,
    enum: ['flight', 'hotel', 'combined'],
    required: true
  },
  searchParameters: searchParametersSchema,
  searchResults: searchResultsSchema,
  interactions: [searchInteractionSchema],
  conversion: {
    initiated: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
    bookingId: { type: Schema.Types.ObjectId },
    conversionTime: { type: Number }, // Time from search to conversion in milliseconds
    value: { type: Number } // Booking value
  },
  source: {
    type: String,
    enum: ['direct', 'search_engine', 'social_media', 'email', 'referral', 'paid_ads'],
    default: 'direct'
  },
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  location: {
    country: { type: String },
    city: { type: String },
    timezone: { type: String }
  },
  savedSearch: {
    isSaved: { type: Boolean, default: false },
    savedAt: { type: Date },
    notificationEnabled: { type: Boolean, default: false },
    notificationFrequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly'],
      default: 'daily'
    }
  },
  quality: {
    searchSuccess: { type: Boolean, default: true }, // Did search return results?
    userSatisfaction: {
      type: Number,
      min: 1,
      max: 5
    }, // User rating if provided
    abandonmentReason: {
      type: String,
      enum: ['no_results', 'too_expensive', 'wrong_dates', 'technical_issue', 'found_elsewhere']
    }
  },
  performance: {
    serverResponseTime: { type: Number }, // Server response time in ms
    clientRenderTime: { type: Number }, // Client render time in ms
    totalLoadTime: { type: Number } // Total load time in ms
  }
}, {
  timestamps: true
});

// Indexes for performance
enhancedSearchHistorySchema.index({ userId: 1, createdAt: -1 });
enhancedSearchHistorySchema.index({ sessionId: 1 });
enhancedSearchHistorySchema.index({ searchType: 1, createdAt: -1 });
enhancedSearchHistorySchema.index({ "searchParameters.flight.origin.city": 1 });
enhancedSearchHistorySchema.index({ "searchParameters.hotel.destination.city": 1 });
enhancedSearchHistorySchema.index({ "conversion.completed": 1 });
enhancedSearchHistorySchema.index({ "savedSearch.isSaved": 1 });

export default enhancedSearchHistorySchema;