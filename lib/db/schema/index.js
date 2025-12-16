import subscriptionSchema from "./subscription";
import userSchema from "./user";
import anonymousUserSchema from "./anonymousUser";
import accountsSchema from "./accounts";
import flightItinerarySchema from "./flightItineraries";
import flightSegmentSchema from "./flightSegments";
import flightSeatsSchema from "./flightSeats";
import flightBookingSchema from "./flightBookings";
import flightReviewSchema from "./flightReviews";
import flightPaymentSchema from "./flightPayment";
import passengerSchema from "./passengers";
import airportSchema from "./airports";
import airlineSchema from "./airlines";
import airlineFlightPricesSchema from "./airlineFlightPrices";

import hotelSchema from "./hotels";
import hotelRoomSchema from "./hotelRooms";
import enhancedHotelRoomSchema from "./enhancedHotelRooms";
import hotelGuestSchema from "./hotelGuests";
import hotelBookingSchema from "./hotelBookings";
import hotelReviewSchema from "./hotelReviews";
import hotelPaymentSchema from "./hotelPayment";
import roomComparisonListSchema from "./roomComparison";

import verificationTokenSchema from "./verificationTokens";
import sessionSchema from "./sessions";
import seatSchema from "./seat";
import airplaneSchema from "./airplane";

import promoCodeSchema from "./promoCodes";

import searchHistorySchema from "./searchHistory";
import websiteReviewSchema from "./websiteReviews";
import websiteConfigSchema from "./websiteConfigSchema";
import analyticsSchema from "./analytics";
import agentProfileSchema from "./agentProfile";
import travelRequirementSchema from "./travelRequirement";
import quotationSchema from "./quotation";
import communicationSchema from "./communication";
import messageSchema from "./message";
import realtimeFlightDataSchema from "./realtimeFlightData";

// Price alert system schemas
import priceAlertSchema from "./priceAlerts";
import priceHistorySchema from "./priceHistory";
import notificationTrackingSchema from "./notificationTracking";

// Analytics schemas
import userAnalyticsSchema from "./userAnalytics";
import enhancedSearchHistorySchema from "./enhancedSearchHistory";
import aggregatedAnalyticsSchema from "./aggregatedAnalytics";
import { experimentSchema, userExperimentAssignmentSchema } from "./abTesting";

// Flight booking modification schemas
import flightBookingModificationSchema from "./flightBookingModifications";
import modificationPolicySchema from "./modificationPolicies";
import modificationAnalyticsSchema from "./modificationAnalytics";

// Enhanced user profile management schemas
import enhancedUserProfileSchema from "./enhancedUserProfile";
import travelAnalyticsSchema from "./travelAnalytics";
import adminProfileManagementSchema from "./adminProfileManagement";

// Insurance schemas
import insuranceProviderSchema from "./insuranceProviders";
import insuranceProductSchema from "./insuranceProducts";
import insurancePolicySchema from "./insurancePolicies";
import insuranceClaimSchema from "./insuranceClaims";
import insurancePaymentSchema from "./insurancePayment";

export {
  subscriptionSchema,
  userSchema,
  anonymousUserSchema,
  flightItinerarySchema,
  flightSegmentSchema,
  flightSeatsSchema,
  accountsSchema,
  flightBookingSchema,
  flightReviewSchema,
  flightPaymentSchema,
  passengerSchema,
  airportSchema,
  airlineSchema,
  airlineFlightPricesSchema,
  hotelSchema,
  hotelRoomSchema,
  enhancedHotelRoomSchema,
  hotelGuestSchema,
  hotelBookingSchema,
  hotelReviewSchema,
  hotelPaymentSchema,
  roomComparisonListSchema,
  verificationTokenSchema,
  sessionSchema,
  seatSchema,
  airplaneSchema,
  promoCodeSchema,
  searchHistorySchema,
  websiteReviewSchema,
  websiteConfigSchema,
  analyticsSchema,
  agentProfileSchema,
  travelRequirementSchema,
  quotationSchema,
  communicationSchema,
  messageSchema,
  realtimeFlightDataSchema,
  // Price alert system schemas
  priceAlertSchema,
  priceHistorySchema,
  notificationTrackingSchema,
  // Analytics schemas
  userAnalyticsSchema,
  enhancedSearchHistorySchema,
  aggregatedAnalyticsSchema,
  experimentSchema,
  userExperimentAssignmentSchema,
  // Flight booking modification schemas
  flightBookingModificationSchema,
  modificationPolicySchema,
  modificationAnalyticsSchema,
  // Enhanced user profile management schemas
  enhancedUserProfileSchema,
  travelAnalyticsSchema,
  adminProfileManagementSchema,
  // Insurance schemas
  insuranceProviderSchema,
  insuranceProductSchema,
  insurancePolicySchema,
  insuranceClaimSchema,
  insurancePaymentSchema,
};
