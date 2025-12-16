import "server-only";
import { 
  UserAnalytics, 
  EnhancedSearchHistory, 
  AggregatedAnalytics,
  UserExperimentAssignment 
} from "../db/models";
import { createOneDoc, updateOneDoc } from "../db/createOperationDB";
import { getOneDoc } from "../db/getOperationDB";
import { v4 as uuidv4 } from "uuid";

/**
 * Event tracking service for comprehensive user behavior analytics
 * Handles all user interactions, sessions, and journey tracking
 */

class EventTrackingService {
  constructor() {
    this.batchEvents = [];
    this.batchSize = 100;
    this.batchTimeout = 5000; // 5 seconds
    this.batchTimer = null;
  }

  /**
   * Track a user event
   * @param {Object} eventData - Event data
   * @param {string} eventData.userId - User ID (null for anonymous)
   * @param {string} eventData.sessionId - Session ID
   * @param {string} eventData.eventType - Type of event
   * @param {string} eventData.page - Current page
   * @param {Object} eventData.metadata - Additional event data
   * @param {Object} eventData.context - Context data (device, browser, etc.)
   */
  async trackEvent(eventData) {
    try {
      const event = {
        eventType: eventData.eventType,
        timestamp: new Date(),
        sessionId: eventData.sessionId,
        page: eventData.page,
        referrer: eventData.context?.referrer || null,
        userAgent: eventData.context?.userAgent || null,
        ipAddress: eventData.context?.ipAddress || null,
        deviceType: eventData.context?.deviceType || 'desktop',
        browser: eventData.context?.browser || null,
        os: eventData.context?.os || null,
        location: eventData.context?.location || {},
        metadata: eventData.metadata || {},
        duration: eventData.duration || null,
        scrollDepth: eventData.scrollDepth || null,
        viewport: eventData.context?.viewport || {}
      };

      // Add to batch for processing
      this.batchEvents.push(event);

      // Process batch if needed
      if (this.batchEvents.length >= this.batchSize) {
        await this.processBatch();
      } else {
        this.scheduleBatchProcessing();
      }

      return event;
    } catch (error) {
      console.error("Error tracking event:", error);
      throw error;
    }
  }

  /**
   * Track page view
   */
  async trackPageView(userId, sessionId, page, context = {}) {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'page_view',
      page,
      context,
      metadata: {
        timestamp: new Date(),
        url: page
      }
    });
  }

  /**
   * Track search event
   */
  async trackSearch(userId, sessionId, searchType, searchParams, results, context = {}) {
    const searchId = uuidv4();
    
    // Create enhanced search history record
    const searchHistoryData = {
      userId,
      sessionId,
      searchId,
      searchType,
      searchParameters: searchParams,
      searchResults: results,
      source: context.source || 'direct',
      device: context.deviceType || 'desktop',
      location: context.location || {},
      performance: {
        serverResponseTime: context.responseTime || 0,
        clientRenderTime: context.renderTime || 0,
        totalLoadTime: context.loadTime || 0
      }
    };

    try {
      await createOneDoc("EnhancedSearchHistory", searchHistoryData);
    } catch (error) {
      console.error("Error creating search history:", error);
    }

    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'search',
      page: context.page || '/search',
      context,
      metadata: {
        searchId,
        searchType,
        searchParams,
        resultCount: results?.totalResults || 0,
        searchTime: results?.searchTime || 0
      }
    });
  }

  /**
   * Track booking events
   */
  async trackBooking(userId, sessionId, bookingType, bookingData, stage, context = {}) {
    const eventType = `booking_${stage}`;
    
    return this.trackEvent({
      userId,
      sessionId,
      eventType,
      page: context.page || '/booking',
      context,
      metadata: {
        bookingId: bookingData.bookingId,
        bookingType, // 'flight' or 'hotel'
        value: bookingData.value || 0,
        currency: bookingData.currency || 'USD',
        bookingData
      }
    });
  }

  /**
   * Track user journey
   */
  async trackJourney(userId, journeyId, goal, step, stepData, context = {}) {
    try {
      const userAnalytics = await getOneDoc("UserAnalytics", { userId });
      
      if (!userAnalytics) {
        // Create user analytics if doesn't exist
        await createOneDoc("UserAnalytics", {
          userId,
          journeys: [{
            journeyId,
            goal,
            status: 'in_progress',
            steps: [{
              step: step,
              timestamp: new Date(),
              page: context.page,
              metadata: stepData
            }],
            startTime: new Date()
          }]
        });
      } else {
        // Update existing journey
        const journeyIndex = userAnalytics.journeys?.findIndex(j => j.journeyId === journeyId);
        
        if (journeyIndex >= 0) {
          const update = {
            [`journeys.${journeyIndex}.steps`]: {
              step,
              timestamp: new Date(),
              page: context.page,
              metadata: stepData
            }
          };
          
          await updateOneDoc("UserAnalytics", { userId }, update);
        } else {
          // Add new journey
          await updateOneDoc("UserAnalytics", { userId }, {
            $push: {
              journeys: {
                journeyId,
                goal,
                status: 'in_progress',
                steps: [{
                  step,
                  timestamp: new Date(),
                  page: context.page,
                  metadata: stepData
                }],
                startTime: new Date()
              }
            }
          });
        }
      }

      return this.trackEvent({
        userId,
        sessionId: context.sessionId,
        eventType: 'journey_step',
        page: context.page,
        context,
        metadata: {
          journeyId,
          goal,
          step,
          stepData
        }
      });
    } catch (error) {
      console.error("Error tracking journey:", error);
      throw error;
    }
  }

  /**
   * Complete a user journey
   */
  async completeJourney(userId, journeyId, conversionValue = 0, context = {}) {
    try {
      const userAnalytics = await getOneDoc("UserAnalytics", { userId });
      const journeyIndex = userAnalytics?.journeys?.findIndex(j => j.journeyId === journeyId);
      
      if (journeyIndex >= 0) {
        const journey = userAnalytics.journeys[journeyIndex];
        const totalDuration = new Date() - new Date(journey.startTime);
        
        await updateOneDoc("UserAnalytics", { userId }, {
          [`journeys.${journeyIndex}.status`]: 'completed',
          [`journeys.${journeyIndex}.endTime`]: new Date(),
          [`journeys.${journeyIndex}.totalDuration`]: totalDuration,
          [`journeys.${journeyIndex}.conversionValue`]: conversionValue,
          $inc: {
            'aggregatedMetrics.totalValue': conversionValue
          }
        });
      }

      return this.trackEvent({
        userId,
        sessionId: context.sessionId,
        eventType: 'journey_completed',
        page: context.page,
        context,
        metadata: {
          journeyId,
          conversionValue
        }
      });
    } catch (error) {
      console.error("Error completing journey:", error);
      throw error;
    }
  }

  /**
   * Track A/B test assignment
   */
  async trackExperimentAssignment(userId, sessionId, experimentId, variantId, context = {}) {
    try {
      const assignmentData = {
        userId,
        sessionId,
        assignments: [{
          experimentId,
          variantId,
          assignedAt: new Date(),
          firstSeenAt: new Date()
        }]
      };

      const existingAssignment = await getOneDoc("UserExperimentAssignment", { 
        userId, 
        'assignments.experimentId': experimentId 
      });

      if (!existingAssignment) {
        await createOneDoc("UserExperimentAssignment", assignmentData);
      } else {
        await updateOneDoc("UserExperimentAssignment", { userId }, {
          $push: {
            assignments: {
              experimentId,
              variantId,
              assignedAt: new Date(),
              firstSeenAt: new Date()
            }
          }
        });
      }

      return this.trackEvent({
        userId,
        sessionId,
        eventType: 'experiment_assigned',
        page: context.page,
        context,
        metadata: {
          experimentId,
          variantId
        }
      });
    } catch (error) {
      console.error("Error tracking experiment assignment:", error);
      throw error;
    }
  }

  /**
   * Process batch of events
   */
  async processBatch() {
    if (this.batchEvents.length === 0) return;

    try {
      const events = [...this.batchEvents];
      this.batchEvents = [];

      // Group events by user for efficient database updates
      const eventsByUser = {};
      
      events.forEach(event => {
        const userId = event.userId || 'anonymous';
        if (!eventsByUser[userId]) {
          eventsByUser[userId] = [];
        }
        eventsByUser[userId].push(event);
      });

      // Process events for each user
      for (const [userId, userEvents] of Object.entries(eventsByUser)) {
        await this.processUserEvents(userId === 'anonymous' ? null : userId, userEvents);
      }

      // Clear batch timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
    } catch (error) {
      console.error("Error processing batch:", error);
    }
  }

  /**
   * Process events for a specific user
   */
  async processUserEvents(userId, events) {
    try {
      if (!userId) {
        // Handle anonymous events - could store in aggregated analytics
        return this.processAnonymousEvents(events);
      }

      const userAnalytics = await getOneDoc("UserAnalytics", { userId });
      
      if (!userAnalytics) {
        // Create new user analytics record
        await createOneDoc("UserAnalytics", {
          userId,
          behaviors: events,
          aggregatedMetrics: {
            totalEvents: events.length,
            totalSessions: new Set(events.map(e => e.sessionId)).size,
            lastActivity: new Date(),
            firstActivity: new Date()
          }
        });
      } else {
        // Update existing user analytics
        const updateData = {
          $push: { behaviors: { $each: events } },
          $inc: { 'aggregatedMetrics.totalEvents': events.length },
          'aggregatedMetrics.lastActivity': new Date()
        };

        // Update session count if new sessions
        const sessionIds = new Set(events.map(e => e.sessionId));
        if (sessionIds.size > 0) {
          updateData.$inc['aggregatedMetrics.totalSessions'] = sessionIds.size;
        }

        await updateOneDoc("UserAnalytics", { userId }, updateData);
      }
    } catch (error) {
      console.error("Error processing user events:", error);
    }
  }

  /**
   * Process anonymous events
   */
  async processAnonymousEvents(events) {
    try {
      // Update aggregated analytics for anonymous users
      const today = new Date().toISOString().split('T')[0];
      const analyticsId = `${today}:hourly`;
      
      const existingAnalytics = await getOneDoc("AggregatedAnalytics", { _id: analyticsId });
      
      const eventCounts = {};
      events.forEach(event => {
        eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
      });

      if (!existingAnalytics) {
        await createOneDoc("AggregatedAnalytics", {
          _id: analyticsId,
          date: new Date(),
          period: 'hourly',
          overview: {
            totalEvents: events.length,
            anonymousEvents: events.length
          }
        });
      } else {
        await updateOneDoc("AggregatedAnalytics", { _id: analyticsId }, {
          $inc: {
            'overview.totalEvents': events.length,
            'overview.anonymousEvents': events.length
          }
        });
      }
    } catch (error) {
      console.error("Error processing anonymous events:", error);
    }
  }

  /**
   * Schedule batch processing
   */
  scheduleBatchProcessing() {
    if (this.batchTimer) return;
    
    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.batchTimeout);
  }

  /**
   * Force process all pending events
   */
  async flush() {
    await this.processBatch();
  }
}

// Singleton instance
const eventTrackingService = new EventTrackingService();

export default eventTrackingService;