import "server-only";
import eventTrackingService from "./eventTracking";
import enhancedSearchHistoryService from "./enhancedSearchHistory";
import userBehaviorTrackingService from "./userBehaviorTracking";
import abTestingService from "./abTesting";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";

/**
 * Analytics Integration Service
 * Integrates analytics tracking with existing booking and search systems
 */

class AnalyticsIntegrationService {
  constructor() {
    this.eventTypes = {
      FLIGHT_SEARCH: "flight_search",
      HOTEL_SEARCH: "hotel_search",
      FLIGHT_VIEW: "flight_view",
      HOTEL_VIEW: "hotel_view",
      FLIGHT_BOOKING: "flight_booking",
      HOTEL_BOOKING: "hotel_booking",
      PAYMENT_INITIATED: "payment_initiated",
      PAYMENT_COMPLETED: "payment_completed",
      PAYMENT_FAILED: "payment_failed",
      BOOKING_CONFIRMED: "booking_confirmed",
      BOOKING_CANCELLED: "booking_cancelled"
    };
  }

  /**
   * Get current user ID from session
   */
  async getCurrentUserId() {
    try {
      const session = await getServerSession(authOptions);
      return session?.user?.id || null;
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return null;
    }
  }

  /**
   * Track flight search with analytics
   */
  async trackFlightSearch(searchParams, results, userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn("No user ID available for flight search tracking");
        return null;
      }

      // Track search history
      const searchHistory = await enhancedSearchHistoryService.trackFlightSearch(
        currentUserId,
        searchParams,
        results
      );

      // Track event for analytics
      const eventData = {
        eventType: this.eventTypes.FLIGHT_SEARCH,
        userId: currentUserId,
        sessionId: searchParams.sessionId || null,
        metadata: {
          searchParams,
          resultsCount: results?.length || 0,
          searchId: searchHistory?.searchId || null,
          timestamp: new Date().toISOString(),
          userAgent: searchParams.userAgent || null,
          referrer: searchParams.referrer || null
        }
      };

      await eventTrackingService.trackEvent(eventData);

      // Update user behavior
      await userBehaviorTrackingService.updateUserBehavior(currentUserId, {
        lastActivity: new Date(),
        searchCount: 1,
        flightSearchCount: 1
      });

      return searchHistory;
    } catch (error) {
      console.error("Error tracking flight search:", error);
      return null;
    }
  }

  /**
   * Track hotel search with analytics
   */
  async trackHotelSearch(searchParams, results, userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn("No user ID available for hotel search tracking");
        return null;
      }

      // Track search history
      const searchHistory = await enhancedSearchHistoryService.trackHotelSearch(
        currentUserId,
        searchParams,
        results
      );

      // Track event for analytics
      const eventData = {
        eventType: this.eventTypes.HOTEL_SEARCH,
        userId: currentUserId,
        sessionId: searchParams.sessionId || null,
        metadata: {
          searchParams,
          resultsCount: results?.length || 0,
          searchId: searchHistory?.searchId || null,
          timestamp: new Date().toISOString(),
          userAgent: searchParams.userAgent || null,
          referrer: searchParams.referrer || null
        }
      };

      await eventTrackingService.trackEvent(eventData);

      // Update user behavior
      await userBehaviorTrackingService.updateUserBehavior(currentUserId, {
        lastActivity: new Date(),
        searchCount: 1,
        hotelSearchCount: 1
      });

      return searchHistory;
    } catch (error) {
      console.error("Error tracking hotel search:", error);
      return null;
    }
  }

  /**
   * Track flight view
   */
  async trackFlightView(flightData, userId = null, context = {}) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn("No user ID available for flight view tracking");
        return null;
      }

      // Track event for analytics
      const eventData = {
        eventType: this.eventTypes.FLIGHT_VIEW,
        userId: currentUserId,
        sessionId: context.sessionId || null,
        metadata: {
          flightData: {
            flightNumber: flightData.flightNumber,
            origin: flightData.origin,
            destination: flightData.destination,
            departureDate: flightData.departureDate,
            price: flightData.price,
            airline: flightData.airline
          },
          timestamp: new Date().toISOString(),
          referrer: context.referrer || null,
          searchId: context.searchId || null
        }
      };

      await eventTrackingService.trackEvent(eventData);

      // Update user behavior
      await userBehaviorTrackingService.updateUserBehavior(currentUserId, {
        lastActivity: new Date(),
        viewCount: 1,
        flightViewCount: 1
      });

      // Track A/B testing conversion if applicable
      if (context.experimentId) {
        await abTestingService.trackConversion(currentUserId, context.experimentId, {
          eventType: "flight_view",
          value: 0,
          metadata: eventData.metadata
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error tracking flight view:", error);
      return null;
    }
  }

  /**
   * Track hotel view
   */
  async trackHotelView(hotelData, userId = null, context = {}) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn("No user ID available for hotel view tracking");
        return null;
      }

      // Track event for analytics
      const eventData = {
        eventType: this.eventTypes.HOTEL_VIEW,
        userId: currentUserId,
        sessionId: context.sessionId || null,
        metadata: {
          hotelData: {
            hotelId: hotelData.hotelId,
            name: hotelData.name,
            location: hotelData.location,
            rating: hotelData.rating,
            price: hotelData.price
          },
          timestamp: new Date().toISOString(),
          referrer: context.referrer || null,
          searchId: context.searchId || null
        }
      };

      await eventTrackingService.trackEvent(eventData);

      // Update user behavior
      await userBehaviorTrackingService.updateUserBehavior(currentUserId, {
        lastActivity: new Date(),
        viewCount: 1,
        hotelViewCount: 1
      });

      // Track A/B testing conversion if applicable
      if (context.experimentId) {
        await abTestingService.trackConversion(currentUserId, context.experimentId, {
          eventType: "hotel_view",
          value: 0,
          metadata: eventData.metadata
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error tracking hotel view:", error);
      return null;
    }
  }

  /**
   * Track flight booking
   */
  async trackFlightBooking(bookingData, userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn("No user ID available for flight booking tracking");
        return null;
      }

      // Track event for analytics
      const eventData = {
        eventType: this.eventTypes.FLIGHT_BOOKING,
        userId: currentUserId,
        sessionId: bookingData.sessionId || null,
        metadata: {
          bookingData: {
            bookingId: bookingData.bookingId,
            pnrCode: bookingData.pnrCode,
            flightNumber: bookingData.flightNumber,
            origin: bookingData.origin,
            destination: bookingData.destination,
            departureDate: bookingData.departureDate,
            totalFare: bookingData.totalFare,
            currency: bookingData.currency || "USD",
            passengers: bookingData.passengers?.length || 1
          },
          timestamp: new Date().toISOString(),
          conversionValue: bookingData.totalFare || 0
        }
      };

      await eventTrackingService.trackEvent(eventData);

      // Update user behavior
      await userBehaviorTrackingService.updateUserBehavior(currentUserId, {
        lastActivity: new Date(),
        bookingCount: 1,
        flightBookingCount: 1,
        totalSpent: bookingData.totalFare || 0
      });

      // Track A/B testing conversion if applicable
      if (bookingData.experimentId) {
        await abTestingService.trackConversion(currentUserId, bookingData.experimentId, {
          eventType: "flight_booking",
          value: bookingData.totalFare || 0,
          currency: bookingData.currency || "USD",
          metadata: eventData.metadata
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error tracking flight booking:", error);
      return null;
    }
  }

  /**
   * Track hotel booking
   */
  async trackHotelBooking(bookingData, userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn("No user ID available for hotel booking tracking");
        return null;
      }

      // Track event for analytics
      const eventData = {
        eventType: this.eventTypes.HOTEL_BOOKING,
        userId: currentUserId,
        sessionId: bookingData.sessionId || null,
        metadata: {
          bookingData: {
            bookingId: bookingData.bookingId,
            hotelId: bookingData.hotelId,
            hotelName: bookingData.hotelName,
            checkInDate: bookingData.checkInDate,
            checkOutDate: bookingData.checkOutDate,
            totalPrice: bookingData.totalPrice,
            currency: bookingData.currency || "USD",
            rooms: bookingData.rooms?.length || 1,
            nights: bookingData.nights || 1
          },
          timestamp: new Date().toISOString(),
          conversionValue: bookingData.totalPrice || 0
        }
      };

      await eventTrackingService.trackEvent(eventData);

      // Update user behavior
      await userBehaviorTrackingService.updateUserBehavior(currentUserId, {
        lastActivity: new Date(),
        bookingCount: 1,
        hotelBookingCount: 1,
        totalSpent: bookingData.totalPrice || 0
      });

      // Track A/B testing conversion if applicable
      if (bookingData.experimentId) {
        await abTestingService.trackConversion(currentUserId, bookingData.experimentId, {
          eventType: "hotel_booking",
          value: bookingData.totalPrice || 0,
          currency: bookingData.currency || "USD",
          metadata: eventData.metadata
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error tracking hotel booking:", error);
      return null;
    }
  }

  /**
   * Track payment initiated
   */
  async trackPaymentInitiated(paymentData, userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn("No user ID available for payment tracking");
        return null;
      }

      // Track event for analytics
      const eventData = {
        eventType: this.eventTypes.PAYMENT_INITIATED,
        userId: currentUserId,
        sessionId: paymentData.sessionId || null,
        metadata: {
          paymentData: {
            paymentIntentId: paymentData.paymentIntentId,
            amount: paymentData.amount,
            currency: paymentData.currency || "USD",
            provider: paymentData.provider,
            bookingType: paymentData.bookingType, // 'flight' or 'hotel'
            bookingId: paymentData.bookingId
          },
          timestamp: new Date().toISOString()
        }
      };

      await eventTrackingService.trackEvent(eventData);

      return { success: true };
    } catch (error) {
      console.error("Error tracking payment initiated:", error);
      return null;
    }
  }

  /**
   * Track payment completed
   */
  async trackPaymentCompleted(paymentData, userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn("No user ID available for payment tracking");
        return null;
      }

      // Track event for analytics
      const eventData = {
        eventType: this.eventTypes.PAYMENT_COMPLETED,
        userId: currentUserId,
        sessionId: paymentData.sessionId || null,
        metadata: {
          paymentData: {
            paymentIntentId: paymentData.paymentIntentId,
            amount: paymentData.amount,
            currency: paymentData.currency || "USD",
            provider: paymentData.provider,
            bookingType: paymentData.bookingType, // 'flight' or 'hotel'
            bookingId: paymentData.bookingId
          },
          timestamp: new Date().toISOString(),
          conversionValue: paymentData.amount || 0
        }
      };

      await eventTrackingService.trackEvent(eventData);

      // Update user behavior
      await userBehaviorTrackingService.updateUserBehavior(currentUserId, {
        lastActivity: new Date(),
        paymentCount: 1,
        totalSpent: paymentData.amount || 0
      });

      // Track A/B testing conversion if applicable
      if (paymentData.experimentId) {
        await abTestingService.trackConversion(currentUserId, paymentData.experimentId, {
          eventType: "payment_completed",
          value: paymentData.amount || 0,
          currency: paymentData.currency || "USD",
          metadata: eventData.metadata
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error tracking payment completed:", error);
      return null;
    }
  }

  /**
   * Track booking confirmed
   */
  async trackBookingConfirmed(bookingData, userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn("No user ID available for booking confirmation tracking");
        return null;
      }

      // Track event for analytics
      const eventData = {
        eventType: this.eventTypes.BOOKING_CONFIRMED,
        userId: currentUserId,
        sessionId: bookingData.sessionId || null,
        metadata: {
          bookingData: {
            bookingId: bookingData.bookingId,
            bookingType: bookingData.bookingType, // 'flight' or 'hotel'
            totalAmount: bookingData.totalAmount,
            currency: bookingData.currency || "USD",
            confirmationDate: bookingData.confirmationDate
          },
          timestamp: new Date().toISOString(),
          conversionValue: bookingData.totalAmount || 0
        }
      };

      await eventTrackingService.trackEvent(eventData);

      // Update user behavior
      await userBehaviorTrackingService.updateUserBehavior(currentUserId, {
        lastActivity: new Date(),
        confirmedBookingCount: 1,
        totalSpent: bookingData.totalAmount || 0
      });

      // Track A/B testing conversion if applicable
      if (bookingData.experimentId) {
        await abTestingService.trackConversion(currentUserId, bookingData.experimentId, {
          eventType: "booking_confirmed",
          value: bookingData.totalAmount || 0,
          currency: bookingData.currency || "USD",
          metadata: eventData.metadata
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error tracking booking confirmed:", error);
      return null;
    }
  }

  /**
   * Track booking cancelled
   */
  async trackBookingCancelled(bookingData, userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn("No user ID available for booking cancellation tracking");
        return null;
      }

      // Track event for analytics
      const eventData = {
        eventType: this.eventTypes.BOOKING_CANCELLED,
        userId: currentUserId,
        sessionId: bookingData.sessionId || null,
        metadata: {
          bookingData: {
            bookingId: bookingData.bookingId,
            bookingType: bookingData.bookingType, // 'flight' or 'hotel'
            cancellationReason: bookingData.cancellationReason,
            cancellationDate: bookingData.cancellationDate,
            refundAmount: bookingData.refundAmount
          },
          timestamp: new Date().toISOString()
        }
      };

      await eventTrackingService.trackEvent(eventData);

      // Update user behavior
      await userBehaviorTrackingService.updateUserBehavior(currentUserId, {
        lastActivity: new Date(),
        cancelledBookingCount: 1
      });

      return { success: true };
    } catch (error) {
      console.error("Error tracking booking cancelled:", error);
      return null;
    }
  }

  /**
   * Get analytics data for a user
   */
  async getUserAnalytics(userId, filters = {}) {
    try {
      const userBehavior = await userBehaviorTrackingService.getUserBehavior(userId);
      const searchHistory = await enhancedSearchHistoryService.getUserSearchHistory(userId, filters);
      
      return {
        success: true,
        data: {
          userBehavior,
          searchHistory,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error("Error getting user analytics:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(filters = {}) {
    try {
      // This would typically query the aggregated analytics data
      // For now, return a placeholder structure
      return {
        success: true,
        data: {
          stages: [
            { name: "Search", count: 0, conversionRate: 0 },
            { name: "View", count: 0, conversionRate: 0 },
            { name: "Booking Initiated", count: 0, conversionRate: 0 },
            { name: "Payment", count: 0, conversionRate: 0 },
            { name: "Confirmed", count: 0, conversionRate: 0 }
          ],
          filters,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error("Error getting conversion funnel:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
const analyticsIntegrationService = new AnalyticsIntegrationService();

export default analyticsIntegrationService;