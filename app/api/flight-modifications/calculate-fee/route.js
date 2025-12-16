import { auth } from "@/lib/auth";
import { calculateModificationFee, calculateFareDifference, validateModificationEligibility } from "@/lib/services/modificationFeeCalculator";
import { getOneDoc } from "@/lib/db/getOperationDB";
import { strToObjectId } from "@/lib/db/utilsDB";
import { z } from "zod";

// Validation schema for fee calculation
const feeCalculationSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  modificationType: z.enum(["date_change", "passenger_update", "seat_change", "baggage_change", "meal_change", "class_upgrade"]),
  newFlightDetails: z.any().optional(), // For date changes
  newClass: z.string().optional(), // For class upgrades
  newBaggageAllowance: z.any().optional(), // For baggage changes
  userProfile: z.object({
    tier: z.string().optional(),
    membershipLevel: z.string().optional()
  }).optional()
});

/**
 * POST /api/flight-modifications/calculate-fee
 * Calculate modification fees and validate eligibility
 */
export async function POST(req) {
  const session = await auth();
  if (!session?.user) {
    return Response.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const validation = feeCalculationSchema.safeParse(body);

    if (!validation.success) {
      return Response.json({
        success: false,
        message: "Invalid request data",
        errors: validation.error.errors
      }, { status: 400 });
    }

    const { bookingId, modificationType, newFlightDetails, newClass, newBaggageAllowance, userProfile } = validation.data;

    // First validate eligibility
    const eligibility = await validateModificationEligibility({
      bookingId,
      modificationType,
      userProfile: { ...userProfile, userId: session.user.id }
    });

    if (!eligibility.eligible) {
      return Response.json({
        success: false,
        eligible: false,
        reason: eligibility.reason,
        message: "Modification not eligible"
      });
    }

    const { booking, itinerary } = eligibility;

    // Calculate modification fee
    const feeCalculation = await calculateModificationFee({
      bookingId,
      modificationType,
      departureDate: itinerary.segmentIds[0]?.from?.scheduledDeparture,
      airlineId: itinerary.carrierInCharge,
      fareClass: booking.passengers[0]?.seatClass,
      route: `${itinerary.departureAirportId}-${itinerary.arrivalAirportId}`,
      userProfile: { ...userProfile, userId: session.user.id },
      previousModifications: eligibility.previousModifications
    });

    // Calculate fare difference if applicable
    let fareDifference = null;
    if (modificationType === 'date_change' && newFlightDetails) {
      // This would typically fetch new flight prices
      // For now, using a placeholder calculation
      fareDifference = await calculateFareDifference({
        originalFare: booking.totalFare,
        newFare: newFlightDetails.totalFare || booking.totalFare,
        currency: booking.currency
      });
    } else if (modificationType === 'class_upgrade' && newClass) {
      // Calculate class upgrade cost
      const upgradeCost = await calculateClassUpgradeCost({
        currentClass: booking.passengers[0]?.seatClass,
        newClass,
        route: `${itinerary.departureAirportId}-${itinerary.arrivalAirportId}`,
        airlineId: itinerary.carrierInCharge
      });

      fareDifference = await calculateFareDifference({
        originalFare: booking.totalFare,
        newFare: booking.totalFare + upgradeCost,
        currency: booking.currency
      });
    }

    // Calculate total cost
    const totalAdditionalCost = (feeCalculation.fee || 0) + (fareDifference?.additionalPayment || 0);
    const totalRefundAmount = fareDifference?.refundAmount || 0;

    return Response.json({
      success: true,
      eligible: true,
      data: {
        feeCalculation,
        fareDifference,
        totalAdditionalCost,
        totalRefundAmount,
        currency: booking.currency,
        policyDetails: feeCalculation.policyDetails,
        timeRestrictions: {
          cutoffTime: feeCalculation.policyDetails?.modificationWindow || 24,
          cutoffDateTime: new Date(itinerary.segmentIds[0]?.from?.scheduledDeparture - ((feeCalculation.policyDetails?.modificationWindow || 24) * 60 * 60 * 1000))
        }
      },
      message: "Fee calculation completed successfully"
    });

  } catch (error) {
    console.error('Error calculating modification fee:', error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Calculate class upgrade cost
 * @param {Object} params - Upgrade cost parameters
 * @returns {number} Upgrade cost
 */
async function calculateClassUpgradeCost(params) {
  const { currentClass, newClass, route, airlineId } = params;
  
  // This would typically integrate with airline pricing API
  // For now, returning a placeholder calculation
  const classUpgradeMatrix = {
    'economy': { 'premium_economy': 150, 'business': 500, 'first': 1200 },
    'premium_economy': { 'business': 350, 'first': 1000 },
    'business': { 'first': 700 }
  };

  return classUpgradeMatrix[currentClass]?.[newClass] || 0;
}