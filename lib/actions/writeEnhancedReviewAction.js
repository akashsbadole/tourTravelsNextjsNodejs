import { z } from "zod";
import { auth } from "../auth";
import { getOneDoc } from "../db/getOperationDB.js";
import { revalidateTag } from "next/cache";
import { createOneDoc } from "../db/createOperationDB.js";
import { updateOneDoc } from "../db/updateOperationDB";
import { strToObjectId } from "../db/utilsDB";
import { analyzeSentiment, extractKeywords, advancedSentimentAnalysis } from "../services/sentimentAnalysis";

// Enhanced review schema for flight reviews
const enhancedFlightReviewSchema = z.object({
  // Basic info
  title: z.string().optional(),
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().trim().min(1, "Please write a review comment"),
  
  // Category ratings
  categoryRatings: z.object({
    comfort: z.number().min(0).max(5).optional(),
    service: z.number().min(0).max(5).optional(),
    food: z.number().min(0).max(5).optional(),
    punctuality: z.number().min(0).max(5).optional(),
    cleanliness: z.number().min(0).max(5).optional(),
    amenities: z.number().min(0).max(5).optional(),
    value: z.number().min(0).max(5).optional(),
  }).optional(),
  
  // Trip details
  tripType: z.enum(['business', 'leisure', 'family', 'solo', 'couple', 'group']).optional(),
  travelClass: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
  ticketPrice: z.number().optional(),
  flightDate: z.string().optional(),
  bookingReference: z.string().optional(),
  
  // Pros and cons
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  recommendations: z.string().optional(),
  
  // Verification
  bookingConfirmed: z.boolean().optional(),
});

// Legacy schema for backward compatibility
const legacyReviewSchema = z.object({
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  reviewComment: z.string().trim().min(1, "Please write a review comment"),
});

export default async function writeEnhancedReviewAction(
  reviewKeys,
  isAlreadyReviewed,
  flightOrHotel,
  prevState,
  formData,
) {
  const reviewer = (await auth())?.user?.id;

  if (!reviewer) {
    return { success: false, message: "You are not logged in" };
  }

  let reviewData;
  let validationResult;

  // Try to parse as enhanced review first
  if (typeof formData === 'object' && !formData.get) {
    // New enhanced format
    validationResult = enhancedFlightReviewSchema.safeParse(formData);
    if (validationResult.success) {
      reviewData = {
        reviewer,
        ...validationResult.data,
        comment: validationResult.data.comment,
        // Parse flight date if provided
        flightDate: validationResult.data.flightDate ? new Date(validationResult.data.flightDate) : undefined,
      };
    }
  } else {
    // Legacy format for backward compatibility
    validationResult = legacyReviewSchema.safeParse({
      rating: parseFloat(parseFloat(formData.get("rating")).toFixed(1)),
      reviewComment: formData.get("reviewComment"),
    });
    
    if (validationResult.success) {
      reviewData = {
        reviewer,
        rating: validationResult.data.rating,
        comment: validationResult.data.reviewComment,
      };
    }
  }

  if (!validationResult?.success) {
    const errors = {};
    validationResult.error.issues.forEach((issue) => {
      errors[issue.path[0]] = issue.message;
    });
    return { success: false, error: errors };
  }

  // Add flight-specific fields
  if (flightOrHotel === "flight") {
    reviewData.airlineId = reviewKeys.airlineId;
    reviewData.departureAirportId = reviewKeys.departureAirportId;
    reviewData.arrivalAirportId = reviewKeys.arrivalAirportId;
    reviewData.airplaneModelName = reviewKeys.airplaneModelName;
    reviewData.flightNumber = reviewKeys.flightNumber;

    // Check for duplicate review
    const getFlightReview = await getOneDoc(
      "FlightReview",
      {
        reviewer: reviewData.reviewer,
        airlineId: reviewData.airlineId,
        departureAirportId: reviewData.departureAirportId,
        arrivalAirportId: reviewData.arrivalAirportId,
        airplaneModelName: reviewData.airplaneModelName,
      },
      [
        reviewData.reviewer + "_review",
        "flightReviews",
        reviewKeys.flightNumber + "_review",
      ],
      false,
    );
    
    if (
      getFlightReview &&
      +getFlightReview?.rating === +reviewData.rating &&
      getFlightReview?.comment === reviewData.comment
    ) {
      return {
        success: false,
        message: "You are submitting the same review. Please make some edits.",
      };
    }
  }

  // Add hotel-specific fields
  if (flightOrHotel === "hotel") {
    reviewData.hotelId = strToObjectId(reviewKeys.hotelId);
    reviewData.slug = reviewKeys.slug;
    
    // Check for duplicate review
    const getHotelReview = await getOneDoc(
      "HotelReview",
      {
        reviewer: reviewData.reviewer,
        hotelId: reviewData.hotelId,
        slug: reviewKeys.slug,
      },
      [
        reviewData.reviewer + "_review",
        "hotelReviews",
        reviewKeys.hotelId + "_review",
        reviewKeys.slug + "_review",
      ],
      false,
    );
    
    if (
      getHotelReview &&
      +getHotelReview?.rating === +reviewData.rating &&
      getHotelReview?.comment === reviewData.comment
    ) {
      return {
        success: false,
        message: "You are submitting the same review. Please make some edits.",
      };
    }
  }

  // Perform sentiment analysis
  const sentimentAnalysis = advancedSentimentAnalysis(reviewData.comment, {
    rating: reviewData.rating,
    tripType: reviewData.tripType,
  });
  
  reviewData.sentiment = sentimentAnalysis.sentiment;
  reviewData.sentimentScore = sentimentAnalysis.score;
  reviewData.keywords = sentimentAnalysis.keywords;

  // Add metadata
  reviewData.version = isAlreadyReviewed ? (reviewData.version || 1) + 1 : 1;
  if (isAlreadyReviewed) {
    reviewData.editedAt = new Date();
    reviewData.editReason = "Updated by user";
  }

  let dbModel = "";
  let dbOperationFilterObj = {};

  if (flightOrHotel === "flight") {
    dbModel = "FlightReview";
    dbOperationFilterObj = {
      reviewer: reviewData.reviewer,
      airlineId: reviewData.airlineId,
      departureAirportId: reviewData.departureAirportId,
      arrivalAirportId: reviewData.arrivalAirportId,
      airplaneModelName: reviewData.airplaneModelName,
    };
  } else if (flightOrHotel === "hotel") {
    dbModel = "HotelReview";
    dbOperationFilterObj = {
      reviewer: reviewData.reviewer,
      hotelId: reviewData.hotelId,
      slug: reviewKeys.slug,
    };
  }

  try {
    if (isAlreadyReviewed) {
      await updateOneDoc(dbModel, dbOperationFilterObj, reviewData);
    } else {
      await createOneDoc(dbModel, { 
        ...reviewData, 
        flagged: [], 
        helpfulVotes: [], 
        notHelpfulVotes: [],
        status: 'pending' // Reviews start as pending for moderation
      });
    }
    return { success: true, message: "Thanks for your review" };
  } catch (error) {
    console.error("Error saving review:", error);
    return { success: false, message: error.message };
  } finally {
    // Revalidate cache
    if (flightOrHotel === "flight") {
      revalidateTag(reviewKeys.flightNumber + "_review");
      revalidateTag("flightReviews");
    }
    if (flightOrHotel === "hotel") {
      revalidateTag(reviewKeys.slug + "_review");
      revalidateTag("hotelReviews");
    }
  }
}