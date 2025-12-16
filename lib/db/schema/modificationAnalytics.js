import { Schema } from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

const modificationMetricsSchema = new Schema(
  {
    modificationType: {
      type: String,
      enum: ["date_change", "passenger_update", "seat_change", "baggage_change", "meal_change", "class_upgrade", "cancellation"],
      required: true,
    },
    totalRequests: { type: Number, default: 0 },
    completedRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    cancelledRequests: { type: Number, default: 0 },
    averageProcessingTime: { type: Number, default: 0 }, // In hours
    totalRevenueFromFees: { type: Number, default: 0 },
    averageFeeAmount: { type: Number, default: 0 },
    totalRefundAmount: { type: Number, default: 0 },
    averageRefundAmount: { type: Number, default: 0 },
    peakModificationHours: [Number], // Hours of day (0-23)
    commonModificationReasons: [{
      reason: { type: String, required: true },
      count: { type: Number, required: true },
    }],
  },
  { _id: false }
);

const modificationAnalyticsSchema = new Schema(
  {
    // Time period for this analytics record
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly", "quarterly", "yearly"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    
    // Reference to airline (optional - can be aggregate across all airlines)
    airlineId: {
      type: String,
      ref: "Airline",
      autopopulate: true,
    },
    
    // Overall metrics
    totalModificationRequests: { type: Number, default: 0 },
    totalCompletedModifications: { type: Number, default: 0 },
    totalFailedModifications: { type: Number, default: 0 },
    totalCancelledModifications: { type: Number, default: 0 },
    overallSuccessRate: { type: Number, default: 0 }, // Percentage
    
    // Financial metrics
    totalRevenueFromModificationFees: { type: Number, default: 0 },
    totalModificationFeesWaived: { type: Number, default: 0 },
    averageModificationFee: { type: Number, default: 0 },
    totalFareDifferencesCollected: { type: Number, default: 0 },
    totalFareDifferencesRefunded: { type: Number, default: 0 },
    netRevenueFromModifications: { type: Number, default: 0 },
    
    // Processing metrics
    averageProcessingTime: { type: Number, default: 0 }, // In hours
    medianProcessingTime: { type: Number, default: 0 }, // In hours
    fastestProcessingTime: { type: Number, default: 0 }, // In hours
    slowestProcessingTime: { type: Number, default: 0 }, // In hours
    
    // Type-specific metrics
    modificationTypeMetrics: [modificationMetricsSchema],
    
    // Route analytics
    topModifiedRoutes: [{
      route: { type: String, required: true }, // e.g., "JFK-LAX"
      modificationCount: { type: Number, required: true },
      revenueGenerated: { type: Number, default: 0 },
    }],
    
    // Time-based analytics
    modificationFrequencyByHour: [{
      hour: { type: Number, required: true }, // 0-23
      count: { type: Number, required: true },
    }],
    modificationFrequencyByDayOfWeek: [{
      day: { type: Number, required: true }, // 0-6 (Sunday-Saturday)
      count: { type: Number, required: true },
    }],
    modificationFrequencyByMonth: [{
      month: { type: Number, required: true }, // 1-12
      count: { type: Number, required: true },
    }],
    
    // Customer analytics
    customerSegmentAnalytics: [{
      segment: {
        type: String,
        enum: ["new", "returning", "vip", "corporate", "leisure"],
        required: true,
      },
      modificationCount: { type: Number, required: true },
      averageModificationValue: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 },
    }],
    
    // Fare class analytics
    fareClassAnalytics: [{
      fareClass: { type: String, required: true },
      modificationCount: { type: Number, required: true },
      averageModificationFee: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 },
    }],
    
    // Seasonal analytics
    seasonalTrends: [{
      season: { type: String, required: true },
      modificationCount: { type: Number, required: true },
      averageModificationFee: { type: Number, default: 0 },
      commonModificationTypes: [String],
    }],
    
    // Performance indicators
    kpis: {
      modificationRequestGrowth: { type: Number, default: 0 }, // Percentage change from previous period
      revenueGrowth: { type: Number, default: 0 }, // Percentage change from previous period
      customerSatisfactionScore: { type: Number, default: 0 }, // 1-5 scale
      processingEfficiencyScore: { type: Number, default: 0 }, // 1-5 scale
      errorRate: { type: Number, default: 0 }, // Percentage
    },
    
    // Anomaly detection
    anomalies: [{
      type: {
        type: String,
        enum: ["unusual_spike", "processing_delay", "revenue_drop", "error_increase"],
        required: true,
      },
      detectedAt: { type: Date, required: true },
      description: { type: String, required: true },
      severity: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        required: true,
      },
      affectedMetrics: [String],
      recommendedActions: [String],
    }],
    
    // Predictions and forecasts
    forecasts: [{
      metric: { type: String, required: true },
      forecastPeriod: { type: String, required: },
      predictedValue: { type: Number, required: true },
      confidence: { type: Number, default: 0 }, // 0-1
      modelUsed: { type: String },
      generatedAt: { type: Date, default: Date.now },
    }],
    
    // Metadata
    generatedAt: { type: Date, default: Date.now },
    dataQuality: {
      completeness: { type: Number, default: 100 }, // Percentage
      accuracy: { type: Number, default: 100 }, // Percentage
      lastUpdated: { type: Date, default: Date.now },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
modificationAnalyticsSchema.index({ period: 1, startDate: 1, endDate: 1 });
modificationAnalyticsSchema.index({ airlineId: 1, period: 1 });
modificationAnalyticsSchema.index({ generatedAt: -1 });
modificationAnalyticsSchema.index({ "anomalies.detectedAt": -1 });

modificationAnalyticsSchema.plugin(mongooseAutoPopulate);

export default modificationAnalyticsSchema;