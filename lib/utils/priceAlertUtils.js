import { randomBytes } from "crypto";
import { checkPriceTrendCondition, checkCompetitivePriceCondition } from "./priceTrendConditions";

/**
 * Generate unique share code for price alerts
 * @returns {string} Unique share code
 */
export function generateShareCode() {
  const bytes = randomBytes(8);
  return bytes.toString('base64').replace(/[+/=]/g, '').substring(0, 8);
}

/**
 * Calculate price change percentage
 * @param {number} oldPrice - Previous price
 * @param {number} newPrice - Current price
 * @returns {number} Percentage change
 */
export function calculatePriceChange(oldPrice, newPrice) {
  if (!oldPrice || oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Check if price drop meets alert conditions
 * @param {Object} alert - Price alert object
 * @param {Object} currentPrice - Current price information
 * @param {Object} previousPrice - Previous price information
 * @returns {Object} Alert trigger information
 */
export async function checkAlertConditions(alert, currentPrice, previousPrice) {
  const triggers = [];
  const conditions = alert.conditions;

  // Check percentage drop condition
  if (conditions.percentageDrop?.enabled) {
    const priceChange = calculatePriceChange(
      alert.referencePrice.amount,
      currentPrice.amount
    );
    
    if (priceChange <= -conditions.percentageDrop.threshold) {
      triggers.push({
        type: 'percentage_drop',
        triggered: true,
        value: Math.abs(priceChange),
        threshold: conditions.percentageDrop.threshold,
      });
    }
  }

  // Check specific price condition
  if (conditions.specificPrice?.enabled) {
    if (currentPrice.amount <= conditions.specificPrice.targetPrice) {
      triggers.push({
        type: 'specific_price',
        triggered: true,
        value: currentPrice.amount,
        threshold: conditions.specificPrice.targetPrice,
      });
    }
  }

  // Check daily change condition
  if (conditions.dailyChange?.enabled && previousPrice) {
    const priceChange = calculatePriceChange(
      previousPrice.amount,
      currentPrice.amount
    );
    
    const meetsCondition = 
      (conditions.dailyChange.changeType === 'drop' && priceChange <= -conditions.dailyChange.minChangeAmount) ||
      (conditions.dailyChange.changeType === 'rise' && priceChange >= conditions.dailyChange.minChangeAmount) ||
      (conditions.dailyChange.changeType === 'any' && Math.abs(priceChange) >= conditions.dailyChange.minChangeAmount);

    if (meetsCondition) {
      triggers.push({
        type: 'daily_change',
        triggered: true,
        value: priceChange,
        threshold: conditions.dailyChange.minChangeAmount,
      });
    }
  }

  // Check price trend condition
  if (conditions.priceTrend?.enabled) {
    const trendResult = await checkPriceTrendCondition(alert, conditions.priceTrend);
    if (trendResult.triggered) {
      triggers.push(trendResult);
    }
  }

  // Check competitive price condition
  if (conditions.competitivePrice?.enabled) {
    const competitiveResult = await checkCompetitivePriceCondition(alert, conditions.competitivePrice);
    if (competitiveResult.triggered) {
      triggers.push(competitiveResult);
    }
  }

  return {
    triggered: triggers.some(t => t.triggered),
    triggers,
  };
}

/**
 * Check if notification should be sent based on quiet hours
 * @param {Object} notificationPreferences - User notification preferences
 * @returns {boolean} Whether notification should be sent
 */
export function shouldSendNotification(notificationPreferences) {
  if (!notificationPreferences.quietHours?.enabled) {
    return true;
  }

  const now = new Date();
  const userTimezone = notificationPreferences.quietHours.timezone || 'UTC';
  
  // Convert to user's timezone
  const userTime = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
  const currentHour = userTime.getHours();
  const currentMinute = userTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = notificationPreferences.quietHours.startTime.split(':').map(Number);
  const [endHour, endMinute] = notificationPreferences.quietHours.endTime.split(':').map(Number);
  
  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;

  // Check if current time is within quiet hours
  if (startTimeInMinutes <= endTimeInMinutes) {
    // Same day (e.g., 22:00 to 06:00)
    return currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes > endTimeInMinutes;
  } else {
    // Spans midnight (e.g., 22:00 to 06:00)
    return currentTimeInMinutes < startTimeInMinutes && currentTimeInMinutes > endTimeInMinutes;
  }
}

/**
 * Check if user has exceeded daily notification limit
 * @param {Object} alert - Price alert object
 * @returns {boolean} Whether limit is exceeded
 */
export function hasExceededDailyLimit(alert) {
  const maxNotifications = alert.notificationPreferences?.maxNotificationsPerDay || 10;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayNotifications = alert.notificationsSent?.filter(notification => {
    const notificationDate = new Date(notification.sentAt);
    notificationDate.setHours(0, 0, 0, 0);
    return notificationDate.getTime() === today.getTime();
  }) || [];

  return todayNotifications.length >= maxNotifications;
}

/**
 * Format price for display
 * @param {number} amount - Price amount
 * @param {string} currency - Currency code
 * @returns {string} Formatted price
 */
export function formatPrice(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Calculate time remaining until alert expires
 * @param {Date} expiresAt - Expiration date
 * @returns {Object} Time remaining information
 */
export function getTimeRemaining(expiresAt) {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires - now;

  if (diff <= 0) {
    return { expired: true, text: 'Expired' };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return {
    expired: false,
    text: parts.join(' ') || 'Less than 1m',
    days,
    hours,
    minutes,
    totalMinutes: Math.floor(diff / (1000 * 60)),
  };
}

/**
 * Validate search criteria completeness
 * @param {Object} searchCriteria - Flight search criteria
 * @returns {Object} Validation result
 */
export function validateSearchCriteria(searchCriteria) {
  const errors = [];

  if (!searchCriteria.origin?.airportCode) {
    errors.push('Origin airport code is required');
  }

  if (!searchCriteria.destination?.airportCode) {
    errors.push('Destination airport code is required');
  }

  if (!searchCriteria.departureDate) {
    errors.push('Departure date is required');
  }

  if (searchCriteria.departureDate && new Date(searchCriteria.departureDate) <= new Date()) {
    errors.push('Departure date must be in future');
  }

  if (searchCriteria.returnDate && searchCriteria.departureDate) {
    if (new Date(searchCriteria.returnDate) <= new Date(searchCriteria.departureDate)) {
      errors.push('Return date must be after departure date');
    }
  }

  const totalPassengers = (searchCriteria.passengers?.adults || 0) + 
                        (searchCriteria.passengers?.children || 0) + 
                        (searchCriteria.passengers?.infants || 0);
  
  if (totalPassengers === 0) {
    errors.push('At least one passenger is required');
  }

  if (totalPassengers > 9) {
    errors.push('Maximum 9 passengers allowed');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate alert summary text
 * @param {Object} alert - Price alert object
 * @returns {string} Alert summary
 */
export function generateAlertSummary(alert) {
  const { searchCriteria, conditions } = alert;
  const parts = [];

  // Route
  parts.push(`${searchCriteria.origin.airportCode} → ${searchCriteria.destination.airportCode}`);

  // Date
  const departureDate = new Date(searchCriteria.departureDate);
  parts.push(departureDate.toLocaleDateString());

  // Trip type
  if (searchCriteria.tripType === 'roundtrip') {
    parts.push('Round-trip');
  }

  // Passengers
  const totalPassengers = (searchCriteria.passengers?.adults || 0) + 
                        (searchCriteria.passengers?.children || 0) + 
                        (searchCriteria.passengers?.infants || 0);
  parts.push(`${totalPassengers} passenger${totalPassengers > 1 ? 's' : ''}`);

  // Conditions
  const conditionParts = [];
  if (conditions.percentageDrop?.enabled) {
    conditionParts.push(`${conditions.percentageDrop.threshold}% drop`);
  }
  if (conditions.specificPrice?.enabled) {
    conditionParts.push(`≤ ${formatPrice(conditions.specificPrice.targetPrice, conditions.specificPrice.currency)}`);
  }
  if (conditions.dailyChange?.enabled) {
    conditionParts.push(`Daily ${conditions.dailyChange.changeType} ≥ ${conditions.dailyChange.minChangeAmount}`);
  }

  if (conditionParts.length > 0) {
    parts.push(`Alert: ${conditionParts.join(', ')}`);
  }

  return parts.join(' • ');
}

/**
 * Get alert status color for UI
 * @param {string} status - Alert status
 * @returns {string} Color code
 */
export function getAlertStatusColor(status) {
  const colors = {
    active: 'green',
    paused: 'yellow',
    expired: 'gray',
    triggered: 'blue',
    cancelled: 'red',
  };
  return colors[status] || 'gray';
}