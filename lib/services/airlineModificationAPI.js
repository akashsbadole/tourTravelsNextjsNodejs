import { getOneDoc, updateOneDoc } from "@/lib/db/getOperationDB";
import { strToObjectId } from "@/lib/db/utilsDB";

/**
 * Airline API Integration Service
 * Handles communication with airline systems for flight modifications
 */

// Airline API configurations (would typically come from database or config)
const airlineAPIConfigs = {
  'AA': { // American Airlines
    baseURL: 'https://api.aa.com/v1',
    apiKey: process.env.AA_API_KEY,
    secret: process.env.AA_API_SECRET,
    timeout: 30000,
    retryAttempts: 3
  },
  'UA': { // United Airlines
    baseURL: 'https://api.united.com/v1',
    apiKey: process.env.UA_API_KEY,
    secret: process.env.UA_API_SECRET,
    timeout: 30000,
    retryAttempts: 3
  },
  'DL': { // Delta Airlines
    baseURL: 'https://api.delta.com/v1',
    apiKey: process.env.DL_API_KEY,
    secret: process.env.DL_API_SECRET,
    timeout: 30000,
    retryAttempts: 3
  }
  // Add more airlines as needed
};

/**
 * Process modification with airline API
 * @param {Object} params - Modification parameters
 * @returns {Object} Processing result
 */
export async function processAirlineModification(params) {
  const {
    modificationId,
    modificationType,
    bookingData,
    modificationDetails,
    airlineIataCode
  } = params;

  try {
    // Get airline API configuration
    const apiConfig = airlineAPIConfigs[airlineIataCode];
    if (!apiConfig) {
      throw new Error(`No API configuration found for airline ${airlineIataCode}`);
    }

    // Get modification request details
    const modification = await getOneDoc("FlightBookingModification", { modificationId });
    if (!modification) {
      throw new Error("Modification request not found");
    }

    // Process based on modification type
    let apiResult;
    switch (modificationType) {
      case 'date_change':
        apiResult = await processDateChange(apiConfig, modification, bookingData, modificationDetails);
        break;
      case 'passenger_update':
        apiResult = await processPassengerUpdate(apiConfig, modification, bookingData, modificationDetails);
        break;
      case 'seat_change':
        apiResult = await processSeatChange(apiConfig, modification, bookingData, modificationDetails);
        break;
      case 'baggage_change':
        apiResult = await processBaggageChange(apiConfig, modification, bookingData, modificationDetails);
        break;
      case 'meal_change':
        apiResult = await processMealChange(apiConfig, modification, bookingData, modificationDetails);
        break;
      case 'class_upgrade':
        apiResult = await processClassUpgrade(apiConfig, modification, bookingData, modificationDetails);
        break;
      default:
        throw new Error(`Unsupported modification type: ${modificationType}`);
    }

    // Update modification with airline response
    await updateOneDoc("FlightBookingModification",
      { modificationId },
      {
        "completionDetails.airlineConfirmationCode": apiResult.confirmationCode,
        "completionDetails.airlineResponse": apiResult,
        "metadata.airlineAPIResponse": {
          success: apiResult.success,
          timestamp: new Date(),
          response: apiResult
        }
      }
    );

    return {
      success: true,
      airlineResponse: apiResult,
      confirmationCode: apiResult.confirmationCode,
      processedAt: new Date()
    };

  } catch (error) {
    console.error('Error processing airline modification:', error);
    
    // Update modification with error details
    await updateOneDoc("FlightBookingModification",
      { modificationId },
      {
        "metadata.airlineAPIResponse": {
          success: false,
          timestamp: new Date(),
          error: error.message
        }
      }
    );

    throw new Error(`Airline API error: ${error.message}`);
  }
}

/**
 * Process date change with airline API
 */
async function processDateChange(apiConfig, modification, bookingData, modificationDetails) {
  const newFlightDetails = modificationDetails.newValue;
  
  const requestBody = {
    action: 'change_flight_date',
    pnrCode: modification.pnrCode,
    originalFlight: {
      flightNumber: bookingData.itineraryFlightNumber,
      date: bookingData.segments[0]?.departureDateTime
    },
    newFlight: {
      flightNumber: newFlightDetails.flightNumber,
      date: newFlightDetails.departureDateTime,
      cabinClass: bookingData.passengers[0]?.seatClass
    },
    passengers: bookingData.passengers.map(p => ({
      firstName: p.firstName,
      lastName: p.lastName,
      passengerType: p.passengerType
    })),
    modificationFee: modification.totalAdditionalCost
  };

  return await makeAirlineAPIRequest(apiConfig, '/modifications/date-change', 'POST', requestBody);
}

/**
 * Process passenger update with airline API
 */
async function processPassengerUpdate(apiConfig, modification, bookingData, modificationDetails) {
  const updatedPassenger = modificationDetails.newValue;
  const passengerIndex = modificationDetails.passengerIndex || 0;

  const requestBody = {
    action: 'update_passenger',
    pnrCode: modification.pnrCode,
    flightNumber: bookingData.itineraryFlightNumber,
    passengerIndex,
    passengerUpdate: {
      firstName: updatedPassenger.firstName,
      lastName: updatedPassenger.lastName,
      email: updatedPassenger.email,
      phoneNumber: updatedPassenger.phoneNumber
    }
  };

  return await makeAirlineAPIRequest(apiConfig, '/modifications/passenger-update', 'POST', requestBody);
}

/**
 * Process seat change with airline API
 */
async function processSeatChange(apiConfig, modification, bookingData, modificationDetails) {
  const newSeatPreference = modificationDetails.newValue;
  const passengerIndex = modificationDetails.passengerIndex || 0;

  const requestBody = {
    action: 'change_seat',
    pnrCode: modification.pnrCode,
    flightNumber: bookingData.itineraryFlightNumber,
    passengerIndex,
    seatPreference: {
      position: newSeatPreference,
      class: bookingData.passengers[passengerIndex]?.seatClass
    }
  };

  return await makeAirlineAPIRequest(apiConfig, '/modifications/seat-change', 'POST', requestBody);
}

/**
 * Process baggage change with airline API
 */
async function processBaggageChange(apiConfig, modification, bookingData, modificationDetails) {
  const newBaggageAllowance = modificationDetails.newValue;

  const requestBody = {
    action: 'update_baggage',
    pnrCode: modification.pnrCode,
    flightNumber: bookingData.itineraryFlightNumber,
    newBaggageAllowance: {
      checked: {
        pieces: newBaggageAllowance.checked?.pieces || 1,
        weight: newBaggageAllowance.checked?.weight || 23
      },
      carryOn: {
        pieces: newBaggageAllowance.carryOn?.pieces || 1,
        weight: newBaggageAllowance.carryOn?.weight || 7
      }
    },
    additionalFee: modification.totalAdditionalCost
  };

  return await makeAirlineAPIRequest(apiConfig, '/modifications/baggage-update', 'POST', requestBody);
}

/**
 * Process meal change with airline API
 */
async function processMealChange(apiConfig, modification, bookingData, modificationDetails) {
  const newMealPreference = modificationDetails.newValue;
  const passengerIndex = modificationDetails.passengerIndex || 0;

  const requestBody = {
    action: 'update_meal_preference',
    pnrCode: modification.pnrCode,
    flightNumber: bookingData.itineraryFlightNumber,
    passengerIndex,
    mealPreference: newMealPreference
  };

  return await makeAirlineAPIRequest(apiConfig, '/modifications/meal-update', 'POST', requestBody);
}

/**
 * Process class upgrade with airline API
 */
async function processClassUpgrade(apiConfig, modification, bookingData, modificationDetails) {
  const newClass = modificationDetails.newValue;

  const requestBody = {
    action: 'upgrade_class',
    pnrCode: modification.pnrCode,
    flightNumber: bookingData.itineraryFlightNumber,
    upgrade: {
      fromClass: bookingData.passengers[0]?.seatClass,
      toClass: newClass,
      allPassengers: true
    },
    additionalCost: modification.totalAdditionalCost
  };

  return await makeAirlineAPIRequest(apiConfig, '/modifications/class-upgrade', 'POST', requestBody);
}

/**
 * Make request to airline API
 * @param {Object} apiConfig - Airline API configuration
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} body - Request body
 * @returns {Object} API response
 */
async function makeAirlineAPIRequest(apiConfig, endpoint, method, body) {
  const url = `${apiConfig.baseURL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiConfig.apiKey}`,
    'X-API-Secret': apiConfig.secret,
    'User-Agent': 'TravelAgency-Modifications/1.0'
  };

  const requestOptions = {
    method,
    headers,
    body: JSON.stringify(body)
  };

  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout);

  try {
    console.log(`Making ${method} request to ${url}`, body);
    
    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Airline API response:', responseData);

    return {
      success: true,
      confirmationCode: responseData.confirmationCode || responseData.reference || `CONF-${Date.now()}`,
      processedAt: new Date(),
      ...responseData
    };

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }

    console.error('Airline API request failed:', error);
    throw error;
  }
}

/**
 * Check modification availability with airline
 * @param {Object} params - Availability check parameters
 * @returns {Object} Availability result
 */
export async function checkModificationAvailability(params) {
  const {
    modificationType,
    airlineIataCode,
    flightNumber,
    departureDate,
    newDetails
  } = params;

  try {
    const apiConfig = airlineAPIConfigs[airlineIataCode];
    if (!apiConfig) {
      throw new Error(`No API configuration found for airline ${airlineIataCode}`);
    }

    const requestBody = {
      action: 'check_availability',
      modificationType,
      flightNumber,
      departureDate,
      newDetails
    };

    const result = await makeAirlineAPIRequest(
      apiConfig,
      '/modifications/check-availability',
      'POST',
      requestBody
    );

    return {
      available: result.available,
      alternatives: result.alternatives || [],
      restrictions: result.restrictions || [],
      additionalFees: result.additionalFees || {},
      confirmationRequired: result.confirmationRequired || false
    };

  } catch (error) {
    console.error('Error checking modification availability:', error);
    return {
      available: false,
      error: error.message,
      alternatives: []
    };
  }
}

/**
 * Get modification status from airline
 * @param {Object} params - Status check parameters
 * @returns {Object} Status result
 */
export async function getModificationStatus(params) {
  const {
    modificationId,
    airlineIataCode,
    confirmationCode
  } = params;

  try {
    const apiConfig = airlineAPIConfigs[airlineIataCode];
    if (!apiConfig) {
      throw new Error(`No API configuration found for airline ${airlineIataCode}`);
    }

    const requestBody = {
      action: 'get_status',
      modificationId,
      confirmationCode
    };

    const result = await makeAirlineAPIRequest(
      apiConfig,
      '/modifications/status',
      'POST',
      requestBody
    );

    return {
      status: result.status,
      processedAt: result.processedAt,
      details: result.details,
      nextSteps: result.nextSteps || []
    };

  } catch (error) {
    console.error('Error getting modification status:', error);
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Cancel modification with airline
 * @param {Object} params - Cancellation parameters
 * @returns {Object} Cancellation result
 */
export async function cancelModificationWithAirline(params) {
  const {
    modificationId,
    airlineIataCode,
    confirmationCode,
    reason
  } = params;

  try {
    const apiConfig = airlineAPIConfigs[airlineIataCode];
    if (!apiConfig) {
      throw new Error(`No API configuration found for airline ${airlineIataCode}`);
    }

    const requestBody = {
      action: 'cancel_modification',
      modificationId,
      confirmationCode,
      reason
    };

    const result = await makeAirlineAPIRequest(
      apiConfig,
      '/modifications/cancel',
      'POST',
      requestBody
    );

    return {
      cancelled: true,
      refundAmount: result.refundAmount || 0,
      refundProcessed: result.refundProcessed || false,
      cancellationCode: result.cancellationCode
    };

  } catch (error) {
    console.error('Error cancelling modification with airline:', error);
    return {
      cancelled: false,
      error: error.message
    };
  }
}

export default {
  processAirlineModification,
  checkModificationAvailability,
  getModificationStatus,
  cancelModificationWithAirline
};