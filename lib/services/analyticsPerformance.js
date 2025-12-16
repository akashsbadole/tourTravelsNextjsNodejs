import "server-only";
import { getManyDocs, updateOneDoc } from "../db/getOperationDB";
import { createOneDoc } from "../db/createOperationDB";
import { AggregatedAnalytics } from "../db/models";

/**
 * Analytics Performance Service
 * Handles performance optimization for analytics data processing
 */

class AnalyticsPerformanceService {
  constructor() {
    this.batchSize = 1000;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Process analytics events in batches
   */
  async processBatchEvents() {
    try {
      // Get unprocessed events
      const unprocessedEvents = await getManyDocs("Event", {
        processed: false,
        retryCount: { $lt: this.maxRetries }
      }, [], false, {
        limit: this.batchSize,
        sort: { timestamp: 1 }
      });

      if (unprocessedEvents.length === 0) {
        return { success: true, processed: 0 };
      }

      // Process events in batches
      const batches = this.chunkArray(unprocessedEvents, 100);
      let totalProcessed = 0;

      for (const batch of batches) {
        const processed = await this.processEventBatch(batch);
        totalProcessed += processed;
      }

      return { success: true, processed: totalProcessed };
    } catch (error) {
      console.error("Error processing batch events:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a batch of events
   */
  async processEventBatch(events) {
    try {
      const aggregatedData = {};

      // Aggregate events by type and user
      for (const event of events) {
        const key = `${event.eventType}_${event.userId || 'anonymous'}`;
        
        if (!aggregatedData[key]) {
          aggregatedData[key] = {
            eventType: event.eventType,
            userId: event.userId,
            date: new Date(event.timestamp).toISOString().split('T')[0],
            count: 0,
            uniqueUsers: new Set(),
            metadata: {}
          };
        }

        aggregatedData[key].count++;
        if (event.userId) {
          aggregatedData[key].uniqueUsers.add(event.userId);
        }

        // Aggregate specific metrics based on event type
        this.aggregateEventMetrics(aggregatedData[key], event);
      }

      // Store aggregated data
      for (const [key, data] of Object.entries(aggregatedData)) {
        await this.storeAggregatedData(data);
      }

      // Mark events as processed
      const eventIds = events.map(e => e._id);
      await updateOneDoc(
        "Event",
        { _id: { $in: eventIds } },
        { 
          processed: true,
          processedAt: new Date()
        },
        { multi: true }
      );

      return events.length;
    } catch (error) {
      console.error("Error processing event batch:", error);
      
      // Mark events with retry count
      const eventIds = events.map(e => e._id);
      await updateOneDoc(
        "Event",
        { _id: { $in: eventIds } },
        { $inc: { retryCount: 1 } },
        { multi: true }
      );

      return 0;
    }
  }

  /**
   * Aggregate event-specific metrics
   */
  aggregateEventMetrics(aggregatedData, event) {
    switch (event.eventType) {
      case 'flight_search':
      case 'hotel_search':
        aggregatedData.metadata.searchCount = (aggregatedData.metadata.searchCount || 0) + 1;
        if (event.metadata?.resultsCount !== undefined) {
          aggregatedData.metadata.totalResults = (aggregatedData.metadata.totalResults || 0) + event.metadata.resultsCount;
        }
        break;

      case 'flight_booking':
      case 'hotel_booking':
        aggregatedData.metadata.bookingCount = (aggregatedData.metadata.bookingCount || 0) + 1;
        if (event.metadata?.conversionValue) {
          aggregatedData.metadata.totalRevenue = (aggregatedData.metadata.totalRevenue || 0) + event.metadata.conversionValue;
        }
        break;

      case 'payment_completed':
        aggregatedData.metadata.paymentCount = (aggregatedData.metadata.paymentCount || 0) + 1;
        if (event.metadata?.conversionValue) {
          aggregatedData.metadata.totalRevenue = (aggregatedData.metadata.totalRevenue || 0) + event.metadata.conversionValue;
        }
        break;

      case 'page_view':
        aggregatedData.metadata.pageViewCount = (aggregatedData.metadata.pageViewCount || 0) + 1;
        break;

      case 'click':
        aggregatedData.metadata.clickCount = (aggregatedData.metadata.clickCount || 0) + 1;
        break;
    }
  }

  /**
   * Store aggregated data
   */
  async storeAggregatedData(data) {
    try {
      const existingData = await getOneDoc("AggregatedAnalytics", {
        eventType: data.eventType,
        userId: data.userId,
        date: data.date
      });

      if (existingData) {
        // Update existing record
        await updateOneDoc(
          "AggregatedAnalytics",
          { _id: existingData._id },
          {
            $inc: {
              count: data.count,
              'metadata.searchCount': data.metadata.searchCount || 0,
              'metadata.bookingCount': data.metadata.bookingCount || 0,
              'metadata.paymentCount': data.metadata.paymentCount || 0,
              'metadata.pageViewCount': data.metadata.pageViewCount || 0,
              'metadata.clickCount': data.metadata.clickCount || 0,
              'metadata.totalResults': data.metadata.totalResults || 0,
              'metadata.totalRevenue': data.metadata.totalRevenue || 0
            },
            $addToSet: {
              uniqueUsers: { $each: Array.from(data.uniqueUsers) }
            },
            $set: {
              lastUpdated: new Date()
            }
          }
        );
      } else {
        // Create new record
        await createOneDoc("AggregatedAnalytics", {
          eventType: data.eventType,
          userId: data.userId,
          date: data.date,
          count: data.count,
          uniqueUsers: Array.from(data.uniqueUsers),
          metadata: data.metadata,
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error("Error storing aggregated data:", error);
      throw error;
    }
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldData(retentionDays = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean up raw events
      const deletedEvents = await this.deleteOldEvents("Event", cutoffDate);
      
      // Clean up search history
      const deletedSearchHistory = await this.deleteOldEvents("EnhancedSearchHistory", cutoffDate);
      
      // Clean up user behavior (keep longer)
      const behaviorCutoffDate = new Date();
      behaviorCutoffDate.setDate(behaviorCutoffDate.getDate() - (retentionDays * 2));
      const deletedBehavior = await this.deleteOldEvents("UserAnalytics", behaviorCutoffDate);

      return {
        success: true,
        deletedEvents,
        deletedSearchHistory,
        deletedBehavior
      };
    } catch (error) {
      console.error("Error cleaning up old data:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete old documents from a collection
   */
  async deleteOldEvents(collectionName, cutoffDate) {
    try {
      // This would need to be implemented based on your database setup
      // For now, return a placeholder
      console.log(`Would delete old ${collectionName} data before ${cutoffDate}`);
      return 0;
    } catch (error) {
      console.error(`Error deleting old ${collectionName} data:`, error);
      return 0;
    }
  }

  /**
   * Optimize database indexes
   */
  async optimizeIndexes() {
    try {
      // This would create indexes for better query performance
      const indexes = [
        { collection: "Event", fields: { eventType: 1, timestamp: 1, userId: 1 } },
        { collection: "EnhancedSearchHistory", fields: { userId: 1, searchDate: -1, searchType: 1 } },
        { collection: "UserAnalytics", fields: { userId: 1, lastActivity: -1 } },
        { collection: "AggregatedAnalytics", fields: { eventType: 1, date: -1, userId: 1 } },
        { collection: "Experiment", fields: { status: 1, "schedule.startDate": -1 } },
        { collection: "UserExperimentAssignment", fields: { userId: 1, "assignments.experimentId": 1 } }
      ];

      // This would create indexes based on your database setup
      console.log("Optimizing analytics indexes:", indexes);
      
      return { success: true, indexes };
    } catch (error) {
      console.error("Error optimizing indexes:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport() {
    try {
      const report = {
        timestamp: new Date(),
        metrics: {
          totalEvents: await this.countDocuments("Event"),
          unprocessedEvents: await this.countDocuments("Event", { processed: false }),
          aggregatedRecords: await this.countDocuments("AggregatedAnalytics"),
          searchHistoryRecords: await this.countDocuments("EnhancedSearchHistory"),
          userAnalyticsRecords: await this.countDocuments("UserAnalytics"),
          averageProcessingTime: await this.getAverageProcessingTime(),
          databaseSize: await this.getDatabaseSize()
        },
        recommendations: []
      };

      // Generate recommendations
      if (report.metrics.unprocessedEvents > 10000) {
        report.recommendations.push("Consider increasing batch processing frequency");
      }

      if (report.metrics.averageProcessingTime > 5000) {
        report.recommendations.push("Optimize event processing logic");
      }

      if (report.metrics.databaseSize > 1000000000) { // 1GB
        report.recommendations.push("Consider data archiving or compression");
      }

      return report;
    } catch (error) {
      console.error("Error generating performance report:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Count documents in a collection
   */
  async countDocuments(collectionName, filter = {}) {
    try {
      // This would count documents based on your database setup
      console.log(`Counting documents in ${collectionName} with filter:`, filter);
      return 0;
    } catch (error) {
      console.error(`Error counting documents in ${collectionName}:`, error);
      return 0;
    }
  }

  /**
   * Get average processing time
   */
  async getAverageProcessingTime() {
    try {
      // This would calculate average processing time
      console.log("Calculating average processing time");
      return 0;
    } catch (error) {
      console.error("Error calculating average processing time:", error);
      return 0;
    }
  }

  /**
   * Get database size
   */
  async getDatabaseSize() {
    try {
      // This would get database size
      console.log("Getting database size");
      return 0;
    } catch (error) {
      console.error("Error getting database size:", error);
      return 0;
    }
  }

  /**
   * Chunk array into smaller arrays
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Schedule periodic tasks
   */
  schedulePeriodicTasks() {
    // Process batch events every 5 minutes
    setInterval(async () => {
      try {
        await this.processBatchEvents();
      } catch (error) {
        console.error("Error in periodic batch processing:", error);
      }
    }, 5 * 60 * 1000);

    // Clean up old data daily
    setInterval(async () => {
      try {
        await this.cleanupOldData();
      } catch (error) {
        console.error("Error in periodic cleanup:", error);
      }
    }, 24 * 60 * 60 * 1000);

    // Optimize indexes weekly
    setInterval(async () => {
      try {
        await this.optimizeIndexes();
      } catch (error) {
        console.error("Error in periodic optimization:", error);
      }
    }, 7 * 24 * 60 * 60 * 1000);

    // Generate performance report daily
    setInterval(async () => {
      try {
        const report = await this.generatePerformanceReport();
        console.log("Analytics Performance Report:", report);
      } catch (error) {
        console.error("Error generating performance report:", error);
      }
    }, 24 * 60 * 60 * 1000);
  }
}

// Singleton instance
const analyticsPerformanceService = new AnalyticsPerformanceService();

export default analyticsPerformanceService;