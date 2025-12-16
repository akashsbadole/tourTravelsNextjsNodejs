import { getOneDoc, getManyDocs } from "@/lib/db/getOperationDB";
import { strToObjectId } from "@/lib/db/utilsDB";

/**
 * Calculate modification fees based on airline policies, timing, and modification type
 * @param {Object} params - Calculation parameters
 * @param {string} params.bookingId - Original booking ID
 * @param {string} params.modificationType - Type of modification
 * @param {Date} params.departureDate - Flight departure date
 * @param {string} params.airlineId - Airline ID
 * @param {string} params.fareClass - Current fare class
 * @param {string} params.route - Flight route (e.g., "JFK-LAX")
 * @param {Object} params.userProfile - User profile information
 * @param {Array} params.previousModifications - Previous modification history
 * @returns {Object} Fee calculation result
 */
export async function calculateModificationFee(params) {
  const {
    bookingId,
    modificationType,
    departureDate,
    airlineId,
    fareClass,
    route,
    userProfile,
    previousModifications = []
  } = params;

  try {
    // Get airline modification policy
    const policy = await getModificationPolicy(airlineId);
    if (!policy) {
      throw new Error(`No modification policy found for airline ${airlineId}`);
    }

    // Check if modification is allowed
    const isAllowed = await isModificationAllowed({
      policy,
      modificationType,
      departureDate,
      fareClass,
      route,
      previousModifications
    });

    if (!isAllowed.allowed) {
      return {
        allowed: false,
        reason: isAllowed.reason,
        fee: 0,
        feeBreakdown: []
      };
    }

    // Calculate base fee
    const baseFee = await calculateBaseFee({
      policy,
      modificationType,
      departureDate,
      fareClass,
      route
    });

    // Apply customer tier discounts
    const tierDiscount = await calculateTierDiscount({
      policy,
      userProfile,
      baseFee
    });

    // Apply time-based adjustments
    const timeAdjustment = await calculateTimeAdjustment({
      policy,
      modificationType,
      departureDate,
      baseFee
    });

    // Calculate final fee
    const finalFee = Math.max(0, baseFee - tierDiscount + timeAdjustment);

    return {
      allowed: true,
      fee: finalFee,
      feeBreakdown: {
        baseFee,
        tierDiscount,
        timeAdjustment,
        calculationMethod: policy.modificationPolicies.find(p => p.type === modificationType)?.feeStructure?.type || 'fixed'
      },
      policyDetails: {
        policyCode: policy.policyCode,
        modificationWindow: policy.modificationPolicies.find(p => p.type === modificationType)?.timeRestrictions?.cutoffHoursBeforeDeparture || 24
      }
    };

  } catch (error) {
    console.error('Error calculating modification fee:', error);
    throw new Error(`Fee calculation failed: ${error.message}`);
  }
}

/**
 * Get modification policy for an airline
 * @param {string} airlineId - Airline ID
 * @returns {Object} Modification policy
 */
async function getModificationPolicy(airlineId) {
  const policies = await getManyDocs("ModificationPolicy", {
    airlineId,
    isActive: true,
    effectiveFrom: { $lte: new Date() },
    $or: [
      { effectiveTo: { $exists: false } },
      { effectiveTo: { $gte: new Date() } }
    ]
  });

  // Return the most recent policy
  return policies.sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];
}

/**
 * Check if modification is allowed based on policies
 * @param {Object} params - Check parameters
 * @returns {Object} Allowance check result
 */
async function isModificationAllowed(params) {
  const { policy, modificationType, departureDate, fareClass, route, previousModifications } = params;

  // Get specific policy for this modification type
  const typePolicy = policy.modificationPolicies.find(p => p.type === modificationType);
  if (!typePolicy || !typePolicy.isEnabled) {
    return { allowed: false, reason: `Modification type ${modificationType} is not enabled` };
  }

  // Check time restrictions
  const now = new Date();
  const hoursUntilDeparture = (departureDate - now) / (1000 * 60 * 60);
  
  if (typePolicy.timeRestrictions.cutoffHoursBeforeDeparture && 
      hoursUntilDeparture < typePolicy.timeRestrictions.cutoffHoursBeforeDeparture) {
    return { 
      allowed: false, 
      reason: `Modification must be made at least ${typePolicy.timeRestrictions.cutoffHoursBeforeDeparture} hours before departure` 
    };
  }

  // Check fare class restrictions
  if (typePolicy.restrictions.prohibitedFareClasses?.includes(fareClass)) {
    return { allowed: false, reason: `Modifications not allowed for fare class ${fareClass}` };
  }

  if (typePolicy.restrictions.allowedFareClasses?.length > 0 && 
      !typePolicy.restrictions.allowedFareClasses.includes(fareClass)) {
    return { allowed: false, reason: `Modifications not allowed for fare class ${fareClass}` };
  }

  // Check route restrictions
  if (typePolicy.restrictions.prohibitedRoutes?.includes(route)) {
    return { allowed: false, reason: `Modifications not allowed for route ${route}` };
  }

  if (typePolicy.restrictions.allowedRoutes?.length > 0 && 
      !typePolicy.restrictions.allowedRoutes.includes(route)) {
    return { allowed: false, reason: `Modifications not allowed for route ${route}` };
  }

  // Check modification limits
  const maxModifications = typePolicy.restrictions.maxModificationsPerBooking || policy.globalRestrictions.maxModificationsPerBooking;
  if (previousModifications.length >= maxModifications) {
    return { allowed: false, reason: `Maximum number of modifications (${maxModifications}) exceeded` };
  }

  // Check blackout dates
  if (typePolicy.timeRestrictions.blackoutDates?.length > 0) {
    const isBlackoutDate = typePolicy.timeRestrictions.blackoutDates.some(date => 
      new Date(date).toDateString() === departureDate.toDateString()
    );
    if (isBlackoutDate) {
      return { allowed: false, reason: `Modifications not allowed on this date` };
    }
  }

  // Check restricted days
  if (typePolicy.timeRestrictions.restrictedDays?.length > 0) {
    const dayOfWeek = departureDate.toLocaleLowerCase('en-US', { weekday: 'long' });
    if (typePolicy.timeRestrictions.restrictedDays.includes(dayOfWeek)) {
      return { allowed: false, reason: `Modifications not allowed on ${dayOfWeek}` };
    }
  }

  return { allowed: true };
}

/**
 * Calculate base fee for modification
 * @param {Object} params - Base fee calculation parameters
 * @returns {number} Base fee amount
 */
async function calculateBaseFee(params) {
  const { policy, modificationType, departureDate, fareClass, route } = params;

  // Get specific policy for this modification type
  const typePolicy = policy.modificationPolicies.find(p => p.type === modificationType);
  const feeStructure = typePolicy.feeStructure;

  switch (feeStructure.type) {
    case 'fixed':
      return feeStructure.fixedAmount || 0;

    case 'percentage':
      // For percentage-based fees, we need the original booking amount
      // This would typically be fetched from the booking
      const bookingAmount = await getBookingAmount(params.bookingId);
      const percentageFee = (bookingAmount * (feeStructure.percentage / 100));
      return Math.max(
        feeStructure.minAmount || 0,
        Math.min(feeStructure.maxAmount || Infinity, percentageFee)
      );

    case 'tiered':
      return calculateTieredFee(feeStructure.tiers, departureDate);

    case 'time_based':
      return calculateTimeBasedFee(feeStructure.timeBasedFees, departureDate);

    default:
      return 0;
  }
}

/**
 * Calculate tiered fee based on time before departure
 * @param {Array} tiers - Fee tiers
 * @param {Date} departureDate - Flight departure date
 * @returns {number} Tiered fee amount
 */
function calculateTieredFee(tiers, departureDate) {
  const now = new Date();
  const hoursUntilDeparture = (departureDate - now) / (1000 * 60 * 60);

  // Sort tiers by hours before departure (descending)
  const sortedTiers = tiers.sort((a, b) => b.hoursBeforeDeparture - a.hoursBeforeDeparture);

  // Find applicable tier
  const applicableTier = sortedTiers.find(tier => hoursUntilDeparture >= tier.hoursBeforeDeparture);
  
  if (!applicableTier) {
    return 0;
  }

  return applicableTier.feeType === 'percentage' ? applicableTier.fee : applicableTier.fee;
}

/**
 * Calculate time-based fee
 * @param {Array} timeBasedFees - Time-based fee structure
 * @param {Date} departureDate - Flight departure date
 * @returns {number} Time-based fee amount
 */
function calculateTimeBasedFee(timeBasedFees, departureDate) {
  const now = new Date();
  const hoursUntilDeparture = (departureDate - now) / (1000 * 60 * 60);

  const applicableFee = timeBasedFees.find(fee => 
    hoursUntilDeparture >= fee.fromHours && hoursUntilDeparture <= fee.toHours
  );

  if (!applicableFee) {
    return 0;
  }

  return applicableFee.feeType === 'percentage' ? applicableFee.fee : applicableFee.fee;
}

/**
 * Calculate customer tier discount
 * @param {Object} params - Discount calculation parameters
 * @returns {number} Discount amount
 */
async function calculateTierDiscount(params) {
  const { policy, userProfile, baseFee } = params;

  if (!userProfile?.tier || !policy.customerTierBenefits) {
    return 0;
  }

  const tierBenefit = policy.customerTierBenefits.find(benefit => benefit.tier === userProfile.tier);
  if (!tierBenefit || !tierBenefit.benefits.feeWaiverPercentage) {
    return 0;
  }

  return (baseFee * tierBenefit.benefits.feeWaiverPercentage) / 100;
}

/**
 * Calculate time-based adjustment to fee
 * @param {Object} params - Time adjustment parameters
 * @returns {number} Time adjustment amount
 */
async function calculateTimeAdjustment(params) {
  const { policy, modificationType, departureDate, baseFee } = params;

  // This could implement additional time-based adjustments
  // For now, returning 0 as base fee calculation already handles time-based logic
  return 0;
}

/**
 * Get booking amount for percentage-based fee calculations
 * @param {string} bookingId - Booking ID
 * @returns {number} Booking amount
 */
async function getBookingAmount(bookingId) {
  try {
    const booking = await getOneDoc("FlightBooking", { _id: strToObjectId(bookingId) });
    return booking?.totalFare || 0;
  } catch (error) {
    console.error('Error fetching booking amount:', error);
    return 0;
  }
}

/**
 * Calculate fare difference for flight changes
 * @param {Object} params - Fare difference calculation parameters
 * @returns {Object} Fare difference details
 */
export async function calculateFareDifference(params) {
  const { originalFare, newFare, currency = "USD" } = params;

  const difference = newFare - originalFare;
  const isRefundable = difference < 0;

  return {
    originalFare,
    newFare,
    difference: Math.abs(difference),
    currency,
    isRefundable,
    refundAmount: isRefundable ? Math.abs(difference) : 0,
    additionalPayment: !isRefundable ? difference : 0
  };
}

/**
 * Validate modification eligibility
 * @param {Object} params - Validation parameters
 * @returns {Object} Validation result
 */
export async function validateModificationEligibility(params) {
  const { bookingId, modificationType, userProfile } = params;

  try {
    // Get booking details
    const booking = await getOneDoc("FlightBooking", { _id: strToObjectId(bookingId) });
    if (!booking) {
      return { eligible: false, reason: "Booking not found" };
    }

    // Check booking status
    if (booking.ticketStatus !== "confirmed") {
      return { eligible: false, reason: "Booking must be confirmed to modify" };
    }

    // Check payment status
    if (booking.paymentStatus !== "paid") {
      return { eligible: false, reason: "Booking must be fully paid to modify" };
    }

    // Get flight itinerary details
    const itinerary = await getOneDoc("FlightItinerary", { _id: booking.flightItineraryId });
    if (!itinerary) {
      return { eligible: false, reason: "Flight itinerary not found" };
    }

    // Check if flight has already departed
    const now = new Date();
    const firstSegment = itinerary.segmentIds[0];
    if (firstSegment && new Date(firstSegment.from.scheduledDeparture) < now) {
      return { eligible: false, reason: "Flight has already departed" };
    }

    // Check previous modifications
    const previousModifications = await getManyDocs("FlightBookingModification", {
      bookingId: strToObjectId(bookingId),
      status: { $in: ["completed", "processing"] }
    });

    // Get modification policy
    const policy = await getModificationPolicy(itinerary.carrierInCharge);
    if (!policy) {
      return { eligible: false, reason: "No modification policy available" };
    }

    // Check modification limits
    const maxModifications = policy.globalRestrictions.maxModificationsPerBooking;
    if (previousModifications.length >= maxModifications) {
      return { eligible: false, reason: `Maximum modifications (${maxModifications}) exceeded` };
    }

    return {
      eligible: true,
      booking,
      itinerary,
      previousModifications,
      policy
    };

  } catch (error) {
    console.error('Error validating modification eligibility:', error);
    return { eligible: false, reason: "Validation failed" };
  }
}

export default {
  calculateModificationFee,
  calculateFareDifference,
  validateModificationEligibility
};