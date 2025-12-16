import { Schema } from "mongoose";

const conversionFunnelSchema = new Schema({
  _id: false,
  funnelName: {
    type: String,
    enum: ['flight_booking', 'hotel_booking', 'user_signup', 'quote_request'],
    required: true
  },
  steps: [{
    stepName: { type: String, required: true },
    stepNumber: { type: Number, required: true },
    users: { type: Number, default: 0 },
    dropoffRate: { type: Number, default: 0 }, // percentage
    conversionRate: { type: Number, default: 0 }, // percentage to next step
    averageTime: { type: Number, default: 0 } // time spent on this step in ms
  }],
  totalUsers: { type: Number, default: 0 },
  completedUsers: { type: Number, default: 0 },
  overallConversionRate: { type: Number, default: 0 },
  averageCompletionTime: { type: Number, default: 0 }, // in milliseconds
  revenue: { type: Number, default: 0 },
  date: { type: Date, required: true }
});

const trafficSourceSchema = new Schema({
  _id: false,
  source: {
    type: String,
    enum: ['direct', 'organic_search', 'paid_search', 'social', 'referral', 'email', 'display', 'affiliate'],
    required: true
  },
  sessions: { type: Number, default: 0 },
  users: { type: Number, default: 0 },
  newUsers: { type: Number, default: 0 },
  pageViews: { type: Number, default: 0 },
  bounceRate: { type: Number, default: 0 },
  averageSessionDuration: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  revenuePerSession: { type: Number, default: 0 },
  cost: { type: Number, default: 0 }, // Marketing cost
  roi: { type: Number, default: 0 }, // Return on investment
  utmCampaigns: [{
    campaign: { type: String },
    sessions: { type: Number },
    conversions: { type: Number },
    revenue: { type: Number }
  }]
});

const contentPerformanceSchema = new Schema({
  _id: false,
  contentType: {
    type: String,
    enum: ['page', 'flight_search', 'hotel_search', 'booking_page', 'profile', 'blog', 'landing_page'],
    required: true
  },
  contentIdentifier: { type: String, required: true }, // URL, page name, etc.
  title: { type: String },
  pageViews: { type: Number, default: 0 },
  uniquePageViews: { type: Number, default: 0 },
  averageTimeOnPage: { type: Number, default: 0 },
  bounceRate: { type: Number, default: 0 },
  exitRate: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  searchQueries: [{ // What searches led to this content
    query: { type: String },
    count: { type: Number }
  }],
  relatedConversions: [{
    type: { type: String },
    count: { type: Number },
    value: { type: Number }
  }]
});

const userSegmentSchema = new Schema({
  _id: false,
  segmentName: {
    type: String,
    enum: ['new_users', 'returning_users', 'high_value', 'at_risk', 'loyal', 'mobile_users', 'desktop_users'],
    required: true
  },
  criteria: { type: Schema.Types.Mixed }, // Segment definition
  users: { type: Number, default: 0 },
  sessions: { type: Number, default: 0 },
  pageViews: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  averageOrderValue: { type: Number, default: 0 },
  lifetimeValue: { type: Number, default: 0 },
  retentionRate: { type: Number, default: 0 },
  churnRate: { type: Number, default: 0 },
  engagement: {
    averageSessionDuration: { type: Number, default: 0 },
    pagesPerSession: { type: Number, default: 0 },
    eventsPerSession: { type: Number, default: 0 }
  },
  demographics: {
    ageGroups: [{
      range: { type: String }, // e.g., "18-24", "25-34"
      percentage: { type: Number }
    }],
    gender: [{
      type: { type: String },
      percentage: { type: Number }
    }],
    locations: [{
      country: { type: String },
      city: { type: String },
      percentage: { type: Number }
    }],
    devices: [{
      type: { type: String },
      percentage: { type: Number }
    }]
  }
});

const realTimeMetricsSchema = new Schema({
  _id: false,
  timestamp: { type: Date, default: Date.now },
  activeUsers: { type: Number, default: 0 },
  currentSessions: { type: Number, default: 0 },
  pageViewsLastMinute: { type: Number, default: 0 },
  searchesLastMinute: { type: Number, default: 0 },
  bookingsLastMinute: { type: Number, default: 0 },
  revenueLastMinute: { type: Number, default: 0 },
  averageResponseTime: { type: Number, default: 0 },
  errorRate: { type: Number, default: 0 },
  serverLoad: { type: Number, default: 0 },
  topPages: [{
    page: { type: String },
    activeUsers: { type: Number }
  }],
  topEvents: [{
    event: { type: String },
    count: { type: Number }
  }],
  topSearches: [{
    query: { type: String },
    count: { type: Number }
  }]
});

const aggregatedAnalyticsSchema = new Schema({
  _id: { type: String, required: true }, // Composite key like "2023-12-15:daily"
  date: { type: Date, required: true },
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true
  },
  overview: {
    totalUsers: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    returningUsers: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    uniquePageViews: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    totalEvents: { type: Number, default: 0 },
    totalSearches: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  trafficSources: [trafficSourceSchema],
  conversionFunnels: [conversionFunnelSchema],
  contentPerformance: [contentPerformanceSchema],
  userSegments: [userSegmentSchema],
  realTimeMetrics: realTimeMetricsSchema,
  deviceBreakdown: {
    desktop: {
      users: { type: Number, default: 0 },
      sessions: { type: Number, default: 0 },
      pageViews: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 }
    },
    mobile: {
      users: { type: Number, default: 0 },
      sessions: { type: Number, default: 0 },
      pageViews: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 }
    },
    tablet: {
      users: { type: Number, default: 0 },
      sessions: { type: Number, default: 0 },
      pageViews: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 }
    }
  },
  geographicBreakdown: [{
    country: { type: String },
    city: { type: String },
    users: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  }],
  timeBreakdown: {
    hourlyData: [{
      hour: { type: Number }, // 0-23
      users: { type: Number, default: 0 },
      sessions: { type: Number, default: 0 },
      pageViews: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 }
    }],
    dailyData: [{
      dayOfWeek: { type: Number }, // 0-6 (Sunday-Saturday)
      users: { type: Number, default: 0 },
      sessions: { type: Number, default: 0 },
      pageViews: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 }
    }]
  },
  searchAnalytics: {
    totalSearches: { type: Number, default: 0 },
    flightSearches: { type: Number, default: 0 },
    hotelSearches: { type: Number, default: 0 },
    averageResultsPerSearch: { type: Number, default: 0 },
    averageSearchTime: { type: Number, default: 0 },
    topFlightRoutes: [{
      origin: { type: String },
      destination: { type: String },
      count: { type: Number },
      conversionRate: { type: Number }
    }],
    topHotelDestinations: [{
      destination: { type: String },
      count: { type: Number },
      conversionRate: { type: Number }
    }],
    searchFailures: {
      noResults: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
      timeouts: { type: Number, default: 0 }
    }
  },
  bookingAnalytics: {
    totalBookings: { type: Number, default: 0 },
    flightBookings: { type: Number, default: 0 },
    hotelBookings: { type: Number, default: 0 },
    combinedBookings: { type: Number, default: 0 },
    averageBookingValue: { type: Number, default: 0 },
    bookingConversionRate: { type: Number, default: 0 },
    cancellationRate: { type: Number, default: 0 },
    bookingFunnel: {
      searchInitiated: { type: Number, default: 0 },
      resultsViewed: { type: Number, default: 0 },
      detailsViewed: { type: Number, default: 0 },
      bookingInitiated: { type: Number, default: 0 },
      paymentInitiated: { type: Number, default: 0 },
      bookingCompleted: { type: Number, default: 0 }
    },
    paymentMethods: [{
      method: { type: String },
      count: { type: Number },
      value: { type: Number },
      successRate: { type: Number }
    }]
  },
  performanceMetrics: {
    averagePageLoadTime: { type: Number, default: 0 },
    averageServerResponseTime: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
    uptime: { type: Number, default: 100 }, // percentage
    databasePerformance: {
      averageQueryTime: { type: Number, default: 0 },
      slowQueries: { type: Number, default: 0 },
      connectionErrors: { type: Number, default: 0 }
    },
    apiPerformance: [{
      endpoint: { type: String },
      averageResponseTime: { type: Number, default: 0 },
      requests: { type: Number, default: 0 },
      errorRate: { type: Number, default: 0 }
    }]
  }
}, {
  timestamps: true
});

// Indexes for performance
aggregatedAnalyticsSchema.index({ date: -1, period: 1 });
aggregatedAnalyticsSchema.index({ "overview.totalUsers": -1 });
aggregatedAnalyticsSchema.index({ "overview.totalRevenue": -1 });
aggregatedAnalyticsSchema.index({ "trafficSources.source": 1 });
aggregatedAnalyticsSchema.index({ "conversionFunnels.funnelName": 1 });
aggregatedAnalyticsSchema.index({ "userSegments.segmentName": 1 });
aggregatedAnalyticsSchema.index({ "geographicBreakdown.country": 1 });

export default aggregatedAnalyticsSchema;