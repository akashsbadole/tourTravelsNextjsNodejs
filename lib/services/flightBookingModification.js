import { createDoc, getOneDoc, getManyDocs, updateOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";
import { calculateModificationFee, calculateFareDifference, validateModificationEligibility } from "./modificationFeeCalculator";
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new booking modification request
 * @param {Object} params - Modification request parameters
 * @returns {Object} Created modification request
 */
export async function createModificationRequest(params) {
  const {
    bookingId,
    userId,
    modifications,
    paymentMethodId,
    notes,
    source = "web"
  } = params;

  try {
    // Validate eligibility
    const eligibility = await validateModificationEligibility({
      bookingId,
      modificationType: modifications[0]?.type,
      userProfile: { userId }
    });

    if (!eligibility.eligible) {
      throw new Error(eligibility.reason);
    }

    const { booking, itinerary, policy } = eligibility;

    // Calculate fees and fare differences
    const feeCalculation = await calculateModificationFee({
      bookingId,
      modificationType: modifications[0]?.type,
      departureDate: itinerary.segmentIds[0]?.from?.scheduledDeparture,
      airlineId: itinerary.carrierInCharge,
      fareClass: booking.passengers[0]?.seatClass,
      route: `${itinerary.departureAirportId}-${itinerary.arrivalAirportId}`,
      userProfile: { userId },
      previousModifications: eligibility.previousModifications
    });

    if (!feeCalculation.allowed) {
      throw new Error(feeCalculation.reason);
    }

    // Calculate fare differences if applicable
    let fareDifference = null;
    if (modifications.some(m => m.type === 'date_change' || m.type === 'class_upgrade')) {
      // This would typically involve fetching new flight prices
      // For now, we'll use a placeholder
      fareDifference = await calculateFareDifference({
        originalFare: booking.totalFare,
        newFare: booking.totalFare, // Would be calculated based on new flight selection
        currency: booking.currency
      });
    }

    // Generate unique modification ID
    const modificationId = `MOD-${uuidv4().toUpperCase().slice(0, 8)}`;

    // Create modification request
    const modificationData = {
      bookingId: strToObjectId(bookingId),
      pnrCode: booking.pnrCode,
      modificationId,
      requestedBy: strToObjectId(userId),
      modifications: modifications.map(mod => ({
        ...mod,
        status: "pending"
      })),
      modificationFees: [{
        type: modifications[0]?.type,
        amount: feeCalculation.fee,
        currency: booking.currency,
        calculatedAt: new Date(),
        calculationBasis: feeCalculation.feeBreakdown.calculationMethod,
        description: `Modification fee for ${modifications[0]?.type}`
      }],
      fareDifference,
      totalAdditionalCost: (feeCalculation.fee || 0) + (fareDifference?.additionalPayment || 0),
      totalRefundAmount: fareDifference?.refundAmount || 0,
      currency: booking.currency,
      status: "requested",
      requiresApproval: feeCalculation.policyDetails?.modificationWindow < 24 || false,
      modificationTimeRestrictions: {
        cutoffTime: new Date(itinerary.segmentIds[0]?.from?.scheduledDeparture - (feeCalculation.policyDetails?.modificationWindow || 24) * 60 * 60 * 1000),
        modificationWindow: feeCalculation.policyDetails?.modificationWindow || 24,
        airlinePolicy: policy._id,
        isWithinTimeRestrictions: true
      },
      source,
      notes,
      modificationHistory: [{
        timestamp: new Date(),
        action: "requested",
        performedBy: strToObjectId(userId),
        details: { modifications, feeCalculation },
        reason: notes || "User requested modification"
      }]
    };

    const modification = await createDoc("FlightBookingModification", modificationData);

    // Update analytics
    await updateModificationAnalytics({
      airlineId: itinerary.carrierInCharge,
      modificationType: modifications[0]?.type,
      action: "requested",
      amount: feeCalculation.fee
    });

    return {
      success: true,
      modification,
      feeCalculation,
      fareDifference,
      nextSteps: feeCalculation.policyDetails?.requiresApproval ? 
        ["awaiting_approval", "payment_processing"] : 
        ["payment_processing", "modification_processing"]
    };

  } catch (error) {
    console.error('Error creating modification request:', error);
    throw new Error(`Failed to create modification request: ${error.message}`);
  }
}

/**
 * Process modification request
 * @param {string} modificationId - Modification ID
 * @param {Object} processingData - Processing details
 * @returns {Object} Processing result
 */
export async function processModificationRequest(modificationId, processingData) {
  try {
    // Get modification request
    const modification = await getOneDoc("FlightBookingModification", { modificationId });
    if (!modification) {
      throw new Error("Modification request not found");
    }

    // Check if modification can be processed
    if (modification.status !== "requested" && modification.status !== "pending_approval") {
      throw new Error(`Cannot process modification in status: ${modification.status}`);
    }

    // Update status to processing
    await updateOneDoc("FlightBookingModification", 
      { modificationId }, 
      { 
        status: "processing",
        processedAt: new Date(),
        processedBy: processingData.processedBy || "system",
        modificationHistory: {
          $push: {
            timestamp: new Date(),
            action: "processing_started",
            performedBy: processingData.processedBy ? strToObjectId(processingData.processedBy) : null,
            details: processingData,
            reason: "Modification processing started"
          }
        }
      }
    );

    // Process each modification type
    const processingResults = [];
    for (const modificationDetail of modification.modifications) {
      const result = await processModificationType(modificationDetail, modification, processingData);
      processingResults.push(result);
    }

    // Check if all modifications were successful
    const allSuccessful = processingResults.every(r => r.success);
    const newStatus = allSuccessful ? "completed" : "failed";

    // Update modification status
    const updateData = {
      status: newStatus,
      processedAt: new Date(),
      processedBy: processingData.processedBy || "system",
      modifications: modification.modifications.map((mod, index) => ({
        ...mod,
        status: processingResults[index]?.success ? "completed" : "failed",
        processedAt: new Date(),
        failureReason: processingResults[index]?.error || null
      }))
    };

    if (allSuccessful) {
      updateData.completionDetails = {
        newPNRCode: processingData.newPNRCode,
        newTicketNumbers: processingData.newTicketNumbers || [],
        modifiedSegments: modification.modifications.map(m => m.segmentIndex).filter(Boolean),
        airlineConfirmationCode: processingData.airlineConfirmationCode
      };
    }

    await updateOneDoc("FlightBookingModification", { modificationId }, updateData);

    // Update analytics
    await updateModificationAnalytics({
      modificationId,
      action: newStatus,
      success: allSuccessful
    });

    return {
      success: allSuccessful,
      status: newStatus,
      processingResults,
      modificationId
    };

  } catch (error) {
    console.error('Error processing modification request:', error);
    
    // Update modification status to failed
    await updateOneDoc("FlightBookingModification", 
      { modificationId }, 
      { 
        status: "failed",
        processedAt: new Date(),
        processedBy: "system",
        modificationHistory: {
          $push: {
            timestamp: new Date(),
            action: "processing_failed",
            performedBy: null,
            details: { error: error.message },
            reason: "Processing failed due to error"
          }
        }
      }
    );

    throw new Error(`Failed to process modification: ${error.message}`);
  }
}

/**
 * Process individual modification type
 * @param {Object} modificationDetail - Modification details
 * @param {Object} modification - Full modification request
 * @param {Object} processingData - Processing data
 * @returns {Object} Processing result
 */
async function processModificationType(modificationDetail, modification, processingData) {
  try {
    switch (modificationDetail.type) {
      case "date_change":
        return await processDateChange(modificationDetail, modification, processingData);
      case "passenger_update":
        return await processPassengerUpdate(modificationDetail, modification, processingData);
      case "seat_change":
        return await processSeatChange(modificationDetail, modification, processingData);
      case "baggage_change":
        return await processBaggageChange(modificationDetail, modification, processingData);
      case "meal_change":
        return await processMealChange(modificationDetail, modification, processingData);
      case "class_upgrade":
        return await processClassUpgrade(modificationDetail, modification, processingData);
      default:
        throw new Error(`Unsupported modification type: ${modificationDetail.type}`);
    }
  } catch (error) {
    console.error(`Error processing ${modificationDetail.type}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Process date change modification
 */
async function processDateChange(modificationDetail, modification, processingData) {
  // This would integrate with airline API to change flight dates
  // For now, returning a mock success response
  return {
    success: true,
    newFlightDetails: processingData.newFlightDetails,
    confirmationCode: `CONF-${uuidv4().slice(0, 8).toUpperCase()}`
  };
}

/**
 * Process passenger update modification
 */
async function processPassengerUpdate(modificationDetail, modification, processingData) {
  // Update passenger information
  const passengerId = modificationDetail.passengerId;
  const updateData = modificationDetail.newValue;

  await updateOneDoc("Passenger", { _id: passengerId }, updateData);

  return {
    success: true,
    updatedFields: Object.keys(updateData)
  };
}

/**
 * Process seat change modification
 */
async function processSeatChange(modificationDetail, modification, processingData) {
  // This would integrate with airline API to change seats
  // For now, returning a mock success response
  return {
    success: true,
    newSeat: processingData.newSeat,
    confirmationCode: `SEAT-${uuidv4().slice(0, 8).toUpperCase()}`
  };
}

/**
 * Process baggage change modification
 */
async function processBaggageChange(modificationDetail, modification, processingData) {
  // Update baggage allowance
  const bookingId = modification.bookingId;
  const newBaggageAllowance = modificationDetail.newValue;

  await updateOneDoc("FlightBooking", 
    { _id: bookingId }, 
    { 
      "baggageAllowance": newBaggageAllowance,
      "modificationHistory": {
        $push: {
          timestamp: new Date(),
          action: "baggage_updated",
          details: { newBaggageAllowance }
        }
      }
    }
  );

  return {
    success: true,
    newBaggageAllowance
  };
}

/**
 * Process meal change modification
 */
async function processMealChange(modificationDetail, modification, processingData) {
  // Update meal preferences
  const passengerId = modificationDetail.passengerId;
  const newMealPreference = modificationDetail.newValue;

  await updateOneDoc("Passenger", 
    { _id: passengerId }, 
    { 
      "preferences.mealPreference": newMealPreference
    }
  );

  return {
    success: true,
    newMealPreference
  };
}

/**
 * Process class upgrade modification
 */
async function processClassUpgrade(modificationDetail, modification, processingData) {
  // This would integrate with airline API to upgrade class
  // For now, returning a mock success response
  return {
    success: true,
    newClass: processingData.newClass,
    confirmationCode: `UPG-${uuidv4().slice(0, 8).toUpperCase()}`
  };
}

/**
 * Approve modification request
 * @param {string} modificationId - Modification ID
 * @param {string} approvedBy - User ID who approved
 * @param {string} notes - Approval notes
 * @returns {Object} Approval result
 */
export async function approveModificationRequest(modificationId, approvedBy, notes) {
  try {
    const modification = await getOneDoc("FlightBookingModification", { modificationId });
    if (!modification) {
      throw new Error("Modification request not found");
    }

    if (modification.status !== "pending_approval") {
      throw new Error(`Cannot approve modification in status: ${modification.status}`);
    }

    await updateOneDoc("FlightBookingModification", 
      { modificationId }, 
      { 
        status: "approved",
        approvedBy: strToObjectId(approvedBy),
        approvedAt: new Date(),
        modificationHistory: {
          $push: {
            timestamp: new Date(),
            action: "approved",
            performedBy: strToObjectId(approvedBy),
            details: { notes },
            reason: "Modification approved by admin"
          }
        }
      }
    );

    // Update analytics
    await updateModificationAnalytics({
      modificationId,
      action: "approved",
      approvedBy
    });

    return {
      success: true,
      status: "approved",
      approvedAt: new Date()
    };

  } catch (error) {
    console.error('Error approving modification request:', error);
    throw new Error(`Failed to approve modification: ${error.message}`);
  }
}

/**
 * Reject modification request
 * @param {string} modificationId - Modification ID
 * @param {string} rejectedBy - User ID who rejected
 * @param {string} reason - Rejection reason
 * @returns {Object} Rejection result
 */
export async function rejectModificationRequest(modificationId, rejectedBy, reason) {
  try {
    const modification = await getOneDoc("FlightBookingModification", { modificationId });
    if (!modification) {
      throw new Error("Modification request not found");
    }

    await updateOneDoc("FlightBookingModification", 
      { modificationId }, 
      { 
        status: "cancelled",
        rejectionReason: reason,
        modificationHistory: {
          $push: {
            timestamp: new Date(),
            action: "rejected",
            performedBy: strToObjectId(rejectedBy),
            details: { reason },
            reason: "Modification rejected"
          }
        }
      }
    );

    // Update analytics
    await updateModificationAnalytics({
      modificationId,
      action: "rejected",
      rejectedBy
    });

    return {
      success: true,
      status: "cancelled",
      rejectionReason: reason
    };

  } catch (error) {
    console.error('Error rejecting modification request:', error);
    throw new Error(`Failed to reject modification: ${error.message}`);
  }
}

/**
 * Get modification history for a booking
 * @param {string} bookingId - Booking ID
 * @returns {Array} Modification history
 */
export async function getModificationHistory(bookingId) {
  try {
    const modifications = await getManyDocs("FlightBookingModification", {
      bookingId: strToObjectId(bookingId)
    }, {}, { createdAt: -1 });

    return modifications.map(mod => ({
      modificationId: mod.modificationId,
      requestedAt: mod.requestedAt,
      status: mod.status,
      modifications: mod.modifications,
      totalCost: mod.totalAdditionalCost,
      totalRefund: mod.totalRefundAmount,
      processedAt: mod.processedAt,
      notes: mod.notes
    }));

  } catch (error) {
    console.error('Error getting modification history:', error);
    throw new Error(`Failed to get modification history: ${error.message}`);
  }
}

/**
 * Update modification analytics
 * @param {Object} params - Analytics update parameters
 */
async function updateModificationAnalytics(params) {
  try {
    // This would update the modification analytics collection
    // For now, just logging the action
    console.log('Updating modification analytics:', params);
  } catch (error) {
    console.error('Error updating modification analytics:', error);
  }
}

export default {
  createModificationRequest,
  processModificationRequest,
  approveModificationRequest,
  rejectModificationRequest,
  getModificationHistory
};