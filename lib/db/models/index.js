import { model, models } from "mongoose";

import {
  subscriptionSchema,
  userSchema,
  anonymousUserSchema,
  flightItinerarySchema,
  flightSegmentSchema,
  flightSeatsSchema,
  accountsSchema,
  airlineSchema,
  airlineFlightPricesSchema,
  airportSchema,
  flightBookingSchema,
  flightReviewSchema,
  flightPaymentSchema,
  hotelBookingSchema,
  hotelRoomSchema,
  enhancedHotelRoomSchema,
  hotelGuestSchema,
  hotelSchema,
  hotelReviewSchema,
  hotelPaymentSchema,
  roomComparisonListSchema,
  passengerSchema,
  verificationTokenSchema,
  sessionSchema,
  seatSchema,
  airplaneSchema,
  promoCodeSchema,
  utilsSchema,
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
  // Enhanced user profile management schemas
  enhancedUserProfileSchema,
  travelAnalyticsSchema,
  adminProfileManagementSchema,
} from "../schema";

const dataModels = {
  Subscription:
    models?.Subscription || model("Subscription", subscriptionSchema),
  User: models?.User || model("User", userSchema),
  AnonymousUser:
    models?.AnonymousUser || model("AnonymousUser", anonymousUserSchema),
  FlightItinerary:
    models?.FlightItinerary || model("FlightItinerary", flightItinerarySchema),
  FlightSegment:
    models?.FlightSegment || model("FlightSegment", flightSegmentSchema),
  FlightSeat: models?.FlightSeat || model("FlightSeat", flightSeatsSchema),
  Account: models?.Account || model("Account", accountsSchema),
  Airline: models?.Airline || model("Airline", airlineSchema),
  AirlineFlightPrice:
    models?.AirlineFlightPrice ||
    model("AirlineFlightPrice", airlineFlightPricesSchema),
  Airport: models?.Airport || model("Airport", airportSchema),
  FlightBooking:
    models?.FlightBooking || model("FlightBooking", flightBookingSchema),
  FlightReview:
    models?.FlightReview || model("FlightReview", flightReviewSchema),
  FlightPayment:
    models?.FlightPayment || model("FlightPayment", flightPaymentSchema),
  HotelBooking:
    models?.HotelBooking || model("HotelBooking", hotelBookingSchema),
  HotelRoom: models?.HotelRoom || model("HotelRoom", hotelRoomSchema),
  EnhancedHotelRoom: models?.EnhancedHotelRoom || model("EnhancedHotelRoom", enhancedHotelRoomSchema),
  HotelGuest: models?.HotelGuest || model("HotelGuest", hotelGuestSchema),
  Hotel: models?.Hotel || model("Hotel", hotelSchema),
  HotelPayment:
    models?.HotelPayment || model("HotelPayment", hotelPaymentSchema),
  Passenger: models?.Passenger || model("Passenger", passengerSchema),
  HotelReview: models?.HotelReview || model("HotelReview", hotelReviewSchema),
  RoomComparisonList: models?.RoomComparisonList || model("RoomComparisonList", roomComparisonListSchema),
  Verification_Token:
    models?.Verification_Token ||
    model("Verification_Token", verificationTokenSchema),
  Session: models?.Session || model("Session", sessionSchema),
  Seat: models?.Seat || model("Seat", seatSchema),
  Airplane: models?.Airplane || model("Airplane", airplaneSchema),
  PromoCode: models?.PromoCode || model("PromoCode", promoCodeSchema),
  SearchHistory:
    models?.SearchHistory || model("SearchHistory", searchHistorySchema),
  WebsiteReview:
    models?.WebsiteReview || model("WebsiteReview", websiteReviewSchema),
  WebsiteConfig:
    models?.WebsiteConfig || model("WebsiteConfig", websiteConfigSchema),
  Analytic: models?.Analytic || model("Analytic", analyticsSchema),
  AgentProfile:
    models?.AgentProfile || model("AgentProfile", agentProfileSchema),
  TravelRequirement:
    models?.TravelRequirement || model("TravelRequirement", travelRequirementSchema),
  Quotation:
    models?.Quotation || model("Quotation", quotationSchema),
  Communication:
    models?.Communication || model("Communication", communicationSchema),
  Message:
    models?.Message || model("Message", messageSchema),
  RealtimeFlightData:
    models?.RealtimeFlightData || model("RealtimeFlightData", realtimeFlightDataSchema),
  // Price alert system models
  PriceAlert:
    models?.PriceAlert || model("PriceAlert", priceAlertSchema),
  PriceHistory:
    models?.PriceHistory || model("PriceHistory", priceHistorySchema),
  NotificationTracking:
    models?.NotificationTracking || model("NotificationTracking", notificationTrackingSchema),
  // Analytics models
  UserAnalytics:
    models?.UserAnalytics || model("UserAnalytics", userAnalyticsSchema),
  EnhancedSearchHistory:
    models?.EnhancedSearchHistory || model("EnhancedSearchHistory", enhancedSearchHistorySchema),
  AggregatedAnalytics:
    models?.AggregatedAnalytics || model("AggregatedAnalytics", aggregatedAnalyticsSchema),
  Experiment:
    models?.Experiment || model("Experiment", experimentSchema),
  UserExperimentAssignment:
    models?.UserExperimentAssignment || model("UserExperimentAssignment", userExperimentAssignmentSchema),
  // Enhanced user profile management models
  EnhancedUserProfile:
    models?.EnhancedUserProfile || model("EnhancedUserProfile", enhancedUserProfileSchema),
  TravelAnalytics:
    models?.TravelAnalytics || model("TravelAnalytics", travelAnalyticsSchema),
  AdminProfileManagement:
    models?.AdminProfileManagement || model("AdminProfileManagement", adminProfileManagementSchema),
};

export const {
  Subscription,
  User,
  FlightItinerary,
  FlightSegment,
  FlightSeat,
  Account,
  Airline,
  AirlineFlightPrice,
  Airport,
  FlightBooking,
  FlightPayment,
  HotelBooking,
  HotelRoom,
  EnhancedHotelRoom,
  HotelGuest,
  Hotel,
  HotelPayment,
  Passenger,
  FlightReview,
  HotelReview,
  RoomComparisonList,
  Verification_Token,
  Session,
  Seat,
  Airplane,
  PromoCode,
  SearchHistory,
  WebsiteReview,
  WebsiteConfig,
  Analytic,
  AgentProfile,
  TravelRequirement,
  Quotation,
  Communication,
  Message,
  RealtimeFlightData,
  // Price alert system models
  PriceAlert,
  PriceHistory,
  NotificationTracking,
  // Enhanced user profile management models
  EnhancedUserProfile,
  TravelAnalytics,
  AdminProfileManagement,
} = dataModels;

export default dataModels;
