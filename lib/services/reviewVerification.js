import { FlightReview } from "@/lib/db/models";
import { getOneDoc, updateOneDoc } from "../db/getOperationDB";

// Verification levels
export const VERIFICATION_LEVELS = {
  NONE: 'none',
  BASIC: 'basic',
  BOOKING_CONFIRMED: 'booking_confirmed',
  VERIFIED_PASSENGER: 'verified_passenger'
};

// Verification criteria
const VERIFICATION_CRITERIA = {
  [VERIFICATION_LEVELS.BASIC]: {
    requires: ['user_profile_complete'],
    weight: 1
  },
  [VERIFICATION_LEVELS.BOOKING_CONFIRMED]: {
    requires: ['user_profile_complete', 'booking_reference_match'],
    weight: 2
  },
  [VERIFICATION_LEVELS.VERIFIED_PASSENGER]: {
    requires: ['user_profile_complete', 'booking_reference_match', 'flight_manifest_match'],
    weight: 3
  }
};

// Check if user profile is complete
export function isUserProfileComplete(user) {
  return !!(
    user.name &&
    user.email &&
    user.profileImage &&
    user.phoneNumber
  );
}

// Verify booking reference
export async function verifyBookingReference(bookingReference, flightDetails, userId) {
  if (!bookingReference || !flightDetails) {
    return { valid: false, reason: 'Missing booking reference or flight details' };
  }

  try {
    // In a real implementation, this would check against the booking system
    // For now, we'll do basic validation
    const bookingPattern = /^[A-Z0-9]{6,10}$/i;
    
    if (!bookingPattern.test(bookingReference)) {
      return { valid: false, reason: 'Invalid booking reference format' };
    }

    // Check if booking exists for this user and flight
    // This would integrate with the actual booking system
    const mockBookingExists = true; // Placeholder
    
    if (!mockBookingExists) {
      return { valid: false, reason: 'Booking not found' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error verifying booking reference:', error);
    return { valid: false, reason: 'Verification service error' };
  }
}

// Verify against flight manifest (advanced verification)
export async function verifyFlightManifest(userId, flightNumber, flightDate) {
  if (!userId || !flightNumber || !flightDate) {
    return { valid: false, reason: 'Missing required information' };
  }

  try {
    // In a real implementation, this would check against airline manifest data
    // This requires integration with airline systems or third-party services
    
    // Mock implementation
    const mockPassengerFound = true; // Placeholder
    
    if (!mockPassengerFound) {
      return { valid: false, reason: 'Passenger not found on flight manifest' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error verifying flight manifest:', error);
    return { valid: false, reason: 'Manifest verification service error' };
  }
}

// Calculate verification level for a review
export async function calculateVerificationLevel(review, user) {
  let verificationLevel = VERIFICATION_LEVELS.NONE;
  const verificationSteps = [];

  // Check basic user profile completion
  if (isUserProfileComplete(user)) {
    verificationSteps.push('user_profile_complete');
  }

  // Check booking confirmation
  if (review.bookingReference && review.bookingConfirmed) {
    const bookingVerification = await verifyBookingReference(
      review.bookingReference,
      {
        flightNumber: review.flightNumber,
        airlineId: review.airlineId,
        departureDate: review.flightDate
      },
      user._id
    );

    if (bookingVerification.valid) {
      verificationSteps.push('booking_reference_match');
    }
  }

  // Check flight manifest verification
  if (review.flightNumber && review.flightDate) {
    const manifestVerification = await verifyFlightManifest(
      review.reviewer,
      review.flightNumber,
      review.flightDate
    );

    if (manifestVerification.valid) {
      verificationSteps.push('flight_manifest_match');
    }
  }

  // Determine verification level based on completed steps
  for (const [level, criteria] of Object.entries(VERIFICATION_CRITERIA)) {
    if (criteria.requires.every(step => verificationSteps.includes(step))) {
      verificationLevel = level;
    }
  }

  return {
    level: verificationLevel,
    steps: verificationSteps,
    weight: VERIFICATION_CRITERIA[verificationLevel]?.weight || 0
  };
}

// Update review verification status
export async function updateReviewVerification(reviewId, verificationData) {
  try {
    const updateData = {
      verified: verificationData.verified,
      verificationLevel: verificationData.level,
      verificationSteps: verificationData.steps,
      verificationWeight: verificationData.weight,
      verifiedBy: verificationData.verifiedBy,
      verificationDate: new Date()
    };

    await updateOneDoc(
      "FlightReview",
      { _id: reviewId },
      updateData
    );

    return { success: true, data: updateData };
  } catch (error) {
    console.error('Error updating review verification:', error);
    return { success: false, error: error.message };
  }
}

// Batch verification for multiple reviews
export async function batchVerifyReviews(reviewIds, verifierId) {
  const results = [];
  
  for (const reviewId of reviewIds) {
    try {
      const review = await getOneDoc("FlightReview", { _id: reviewId });
      if (!review) {
        results.push({ reviewId, success: false, error: 'Review not found' });
        continue;
      }

      const verificationResult = await calculateVerificationLevel(review);
      
      await updateReviewVerification(reviewId, {
        ...verificationResult,
        verified: verificationResult.level !== VERIFICATION_LEVELS.NONE,
        verifiedBy: verifierId
      });

      results.push({ 
        reviewId, 
        success: true, 
        level: verificationResult.level,
        steps: verificationResult.steps 
      });
    } catch (error) {
      results.push({ reviewId, success: false, error: error.message });
    }
  }

  return results;
}

// Get verification statistics
export async function getVerificationStats(filter = {}) {
  try {
    const stats = await FlightReview.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$verificationLevel',
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: '$count' },
          verificationLevels: {
            $push: {
              level: '$_id',
              count: '$count'
            }
          }
        }
      }
    ]);

    const result = stats[0] || { totalReviews: 0, verificationLevels: [] };
    
    // Calculate percentages
    const verificationStats = {};
    result.verificationLevels.forEach(vl => {
      verificationStats[vl.level] = {
        count: vl.count,
        percentage: (vl.count / result.totalReviews) * 100
      };
    });

    return {
      totalReviews: result.totalReviews,
      verificationLevels: verificationStats
    };
  } catch (error) {
    console.error('Error getting verification stats:', error);
    return { totalReviews: 0, verificationLevels: {} };
  }
}

// Auto-verification based on booking system integration
export async function autoVerifyReview(reviewId, bookingData) {
  try {
    const review = await getOneDoc("FlightReview", { _id: reviewId });
    if (!review) {
      return { success: false, error: 'Review not found' };
    }

    // Verify booking data matches review
    const bookingMatches = 
      bookingData.flightNumber === review.flightNumber &&
      bookingData.airlineId === review.airlineId &&
      bookingData.departureAirportId === review.departureAirportId &&
      bookingData.arrivalAirportId === review.arrivalAirportId &&
      bookingData.passengerId === review.reviewer.toString();

    if (!bookingMatches) {
      return { success: false, error: 'Booking data does not match review' };
    }

    // Update verification
    const verificationData = {
      verified: true,
      level: VERIFICATION_LEVELS.BOOKING_CONFIRMED,
      steps: ['user_profile_complete', 'booking_reference_match'],
      weight: VERIFICATION_CRITERIA[VERIFICATION_LEVELS.BOOKING_CONFIRMED].weight,
      verifiedBy: 'system',
      bookingConfirmed: true
    };

    await updateReviewVerification(reviewId, verificationData);

    return { success: true, data: verificationData };
  } catch (error) {
    console.error('Error auto-verifying review:', error);
    return { success: false, error: error.message };
  }
}

// Get verification badge information
export function getVerificationBadge(verificationLevel) {
  const badges = {
    [VERIFICATION_LEVELS.NONE]: {
      text: 'Not Verified',
      color: 'gray',
      icon: '⚪',
      description: 'This review has not been verified'
    },
    [VERIFICATION_LEVELS.BASIC]: {
      text: 'Basic Verification',
      color: 'blue',
      icon: '🔵',
      description: 'User profile is complete'
    },
    [VERIFICATION_LEVELS.BOOKING_CONFIRMED]: {
      text: 'Booking Confirmed',
      color: 'green',
      icon: '🟢',
      description: 'Booking reference has been verified'
    },
    [VERIFICATION_LEVELS.VERIFIED_PASSENGER]: {
      text: 'Verified Passenger',
      color: 'gold',
      icon: '🟡',
      description: 'Verified as actual passenger on flight'
    }
  };

  return badges[verificationLevel] || badges[VERIFICATION_LEVELS.NONE];
}