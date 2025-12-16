/**
 * Check if two date ranges overlap
 * @param {Object} range1 - First date range { start: Date, end: Date }
 * @param {Object} range2 - Second date range { start: Date, end: Date }
 * @returns {boolean} - True if ranges overlap
 */
export function isDateOverlap(range1, range2) {
  if (!range1?.start || !range1?.end || !range2?.start || !range2?.end) {
    return false;
  }

  // Normalize dates to ensure start <= end
  const start1 = new Date(Math.min(range1.start, range1.end));
  const end1 = new Date(Math.max(range1.start, range1.end));
  const start2 = new Date(Math.min(range2.start, range2.end));
  const end2 = new Date(Math.max(range2.start, range2.end));

  // Check for overlap
  return start1 < end2 && start2 < end1;
}

/**
 * Get nights between two dates
 * @param {Date|string} checkIn - Check-in date
 * @param {Date|string} checkOut - Check-out date
 * @returns {number} - Number of nights
 */
export function getNightsBetween(checkIn, checkOut) {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return 0;
  }

  const diffTime = checkOutDate.getTime() - checkInDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string (default: 'MMM DD, YYYY')
 * @returns {string} - Formatted date string
 */
export function formatDate(date, format = 'MMM DD, YYYY') {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  try {
    return dateObj.toLocaleDateString('en-US', options);
  } catch (error) {
    return dateObj.toISOString().split('T')[0];
  }
}

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if date is in the past
 */
export function isDateInPast(date) {
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day
  
  return dateObj < today;
}

/**
 * Add days to a date
 * @param {Date|string} date - Original date
 * @param {number} days - Number of days to add
 * @returns {Date} - New date
 */
export function addDays(date, days) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return new Date();
  }

  return new Date(dateObj.getTime() + (days * 24 * 60 * 60 * 1000));
}

/**
 * Get day name from date
 * @param {Date|string} date - Date to get day from
 * @returns {string} - Day name (e.g., 'Monday')
 */
export function getDayName(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  return dateObj.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Check if a date is a weekend
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const day = dateObj.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Get a range of dates between start and end
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Date[]} - Array of dates
 */
export function getDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return dates;
  }

  const currentDate = new Date(start);
  currentDate.setHours(0, 0, 0, 0); // Set to start of day

  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

/**
 * Check if a date is within a date range
 * @param {Date|string} date - Date to check
 * @param {Date|string} rangeStart - Start of range
 * @param {Date|string} rangeEnd - End of range
 * @returns {boolean} - True if date is within range
 */
export function isDateInRange(date, rangeStart, rangeEnd) {
  const dateObj = new Date(date);
  const startObj = new Date(rangeStart);
  const endObj = new Date(rangeEnd);

  if (isNaN(dateObj.getTime()) || isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
    return false;
  }

  return dateObj >= startObj && dateObj <= endObj;
}

/**
 * Get the difference in days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} - Difference in days (can be negative)
 */
export function getDaysDifference(date1, date2) {
  const dateObj1 = new Date(date1);
  const dateObj2 = new Date(date2);

  if (isNaN(dateObj1.getTime()) || isNaN(dateObj2.getTime())) {
    return 0;
  }

  const diffTime = dateObj2.getTime() - dateObj1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format time from date string
 * @param {string} timeString - Time string (e.g., "15:00")
 * @returns {string} - Formatted time (e.g., "3:00 PM")
 */
export function formatTime(timeString) {
  if (!timeString) return '';

  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeString;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Validate date string format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid ISO date string
 */
export function isValidDateString(dateString) {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}

/**
 * Get relative time from now
 * @param {Date|string} date - Date to compare
 * @returns {string} - Relative time string (e.g., "2 days ago")
 */
export function getRelativeTime(date) {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const now = new Date();
  const diffMs = now - dateObj;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}