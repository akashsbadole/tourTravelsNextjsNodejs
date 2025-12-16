/**
 * Advanced Flight Filtering System
 * Comprehensive filter definitions, utilities, and data structures
 */

// Filter category definitions
export const FILTER_CATEGORIES = {
  PRICE: 'price',
  DURATION: 'duration',
  STOPS: 'stops',
  AIRLINES: 'airlines',
  AIRPORTS: 'airports',
  TIMES: 'times',
  AMENITIES: 'amenities',
  AIRCRAFT: 'aircraft',
  BAGGAGE: 'baggage',
  LAYOVER: 'layover',
  CLASS: 'class',
  REFUNDABLE: 'refundable',
  ENVIRONMENTAL: 'environmental'
};

// Filter types
export const FILTER_TYPES = {
  RANGE: 'range',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  TOGGLE: 'toggle',
  SLIDER: 'slider',
  DATE_RANGE: 'date_range',
  TIME_RANGE: 'time_range'
};

// Default filter configurations
export const DEFAULT_FILTER_CONFIGS = {
  [FILTER_CATEGORIES.PRICE]: {
    type: FILTER_TYPES.RANGE,
    label: 'Price Range',
    field: 'price',
    min: 0,
    max: 5000,
    step: 50,
    unit: '$',
    icon: 'dollar-sign'
  },
  [FILTER_CATEGORIES.DURATION]: {
    type: FILTER_TYPES.RANGE,
    label: 'Flight Duration',
    field: 'totalDurationMinutes',
    min: 0,
    max: 1440, // 24 hours in minutes
    step: 30,
    unit: 'min',
    formatter: (value) => formatDuration(value),
    icon: 'clock'
  },
  [FILTER_CATEGORIES.STOPS]: {
    type: FILTER_TYPES.CHECKBOX,
    label: 'Stops',
    field: 'stops',
    options: [
      { value: 0, label: 'Non-stop', description: 'Direct flights' },
      { value: 1, label: '1 Stop', description: 'One connection' },
      { value: 2, label: '2+ Stops', description: 'Multiple connections' }
    ],
    icon: 'route'
  },
  [FILTER_CATEGORIES.AIRLINES]: {
    type: FILTER_TYPES.CHECKBOX,
    label: 'Airlines',
    field: 'airline',
    options: [], // Will be populated dynamically
    searchable: true,
    icon: 'plane'
  },
  [FILTER_CATEGORIES.AIRPORTS]: {
    type: FILTER_TYPES.MULTI_SELECT,
    label: 'Airports',
    field: 'airports',
    subFields: {
      departure: 'departureAirport',
      arrival: 'arrivalAirport'
    },
    options: [], // Will be populated dynamically
    searchable: true,
    icon: 'map-pin'
  },
  [FILTER_CATEGORIES.TIMES]: {
    type: FILTER_TYPES.TIME_RANGE,
    label: 'Departure & Arrival Times',
    fields: {
      departure: 'departureTime',
      arrival: 'arrivalTime'
    },
    ranges: [
      { label: 'Early Morning (6AM-12PM)', start: 360, end: 720 },
      { label: 'Afternoon (12PM-6PM)', start: 720, end: 1080 },
      { label: 'Evening (6PM-12AM)', start: 1080, end: 1440 },
      { label: 'Late Night (12AM-6AM)', start: 0, end: 360 }
    ],
    icon: 'clock'
  },
  [FILTER_CATEGORIES.AMENITIES]: {
    type: FILTER_TYPES.CHECKBOX,
    label: 'Amenities',
    field: 'amenities',
    options: [
      { value: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
      { value: 'meal', label: 'Meal Service', icon: 'utensils' },
      { value: 'entertainment', label: 'Entertainment', icon: 'tv' },
      { value: 'power', label: 'Power Outlets', icon: 'battery-charging' },
      { value: 'extra_legroom', label: 'Extra Legroom', icon: 'maximize' }
    ],
    icon: 'star'
  },
  [FILTER_CATEGORIES.AIRCRAFT]: {
    type: FILTER_TYPES.CHECKBOX,
    label: 'Aircraft Type',
    field: 'aircraftType',
    options: [
      { value: 'narrow_body', label: 'Narrow Body' },
      { value: 'wide_body', label: 'Wide Body' },
      { value: 'regional', label: 'Regional' },
      { value: 'turboprop', label: 'Turboprop' }
    ],
    icon: 'plane'
  },
  [FILTER_CATEGORIES.BAGGAGE]: {
    type: FILTER_TYPES.RANGE,
    label: 'Baggage Allowance',
    field: 'baggage',
    subFields: {
      cabin: 'cabinBaggage',
      checked: 'checkedBaggage'
    },
    min: 0,
    max: 50,
    step: 5,
    unit: 'kg',
    icon: 'luggage'
  },
  [FILTER_CATEGORIES.LAYOVER]: {
    type: FILTER_TYPES.RANGE,
    label: 'Layover Duration',
    field: 'layoverDuration',
    min: 0,
    max: 480, // 8 hours
    step: 15,
    unit: 'min',
    formatter: (value) => formatDuration(value),
    icon: 'clock'
  },
  [FILTER_CATEGORIES.CLASS]: {
    type: FILTER_TYPES.CHECKBOX,
    label: 'Travel Class',
    field: 'class',
    options: [
      { value: 'economy', label: 'Economy' },
      { value: 'premium_economy', label: 'Premium Economy' },
      { value: 'business', label: 'Business' },
      { value: 'first', label: 'First Class' }
    ],
    icon: 'user'
  },
  [FILTER_CATEGORIES.REFUNDABLE]: {
    type: FILTER_TYPES.TOGGLE,
    label: 'Refundable',
    field: 'refundable',
    description: 'Show only refundable flights',
    icon: 'shield-check'
  },
  [FILTER_CATEGORIES.ENVIRONMENTAL]: {
    type: FILTER_TYPES.RANGE,
    label: 'Carbon Footprint',
    field: 'carbonEmission',
    min: 0,
    max: 1000,
    step: 10,
    unit: 'kg CO₂',
    description: 'Lower carbon emissions',
    icon: 'leaf'
  }
};

// Filter presets for quick selection
export const FILTER_PRESETS = {
  CHEAPEST: {
    name: 'Cheapest',
    description: 'Lowest price flights',
    icon: 'dollar-sign',
    filters: {
      [FILTER_CATEGORIES.PRICE]: { min: 0, max: 500 }
    }
  },
  QUICKEST: {
    name: 'Quickest',
    description: 'Shortest flight duration',
    icon: 'zap',
    filters: {
      [FILTER_CATEGORIES.DURATION]: { min: 0, max: 240 },
      [FILTER_CATEGORIES.STOPS]: [0]
    }
  },
  BEST_VALUE: {
    name: 'Best Value',
    description: 'Balance of price and time',
    icon: 'star',
    filters: {
      [FILTER_CATEGORIES.PRICE]: { min: 200, max: 800 },
      [FILTER_CATEGORIES.DURATION]: { min: 60, max: 480 },
      [FILTER_CATEGORIES.STOPS]: [0, 1]
    }
  },
  COMFORT: {
    name: 'Comfort',
    description: 'Premium experience',
    icon: 'crown',
    filters: {
      [FILTER_CATEGORIES.CLASS]: ['business', 'first'],
      [FILTER_CATEGORIES.STOPS]: [0, 1],
      [FILTER_CATEGORIES.AMENITIES]: ['wifi', 'meal', 'entertainment', 'power']
    }
  },
  ECO_FRIENDLY: {
    name: 'Eco-Friendly',
    description: 'Low carbon emissions',
    icon: 'leaf',
    filters: {
      [FILTER_CATEGORIES.ENVIRONMENTAL]: { min: 0, max: 200 },
      [FILTER_CATEGORIES.AIRCRAFT]: ['narrow_body', 'wide_body']
    }
  },
  BUSINESS: {
    name: 'Business Travel',
    description: 'Business-friendly options',
    icon: 'briefcase',
    filters: {
      [FILTER_CATEGORIES.CLASS]: ['business', 'first'],
      [FILTER_CATEGORIES.STOPS]: [0, 1],
      [FILTER_CATEGORIES.AMENITIES]: ['wifi', 'power'],
      [FILTER_CATEGORIES.REFUNDABLE]: true
    }
  }
};

// Utility functions
export function formatDuration(minutes) {
  if (!minutes || minutes === 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatTime(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

export function formatPrice(price, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(price);
}

export function getFilterValue(filter, field, defaultValue = null) {
  if (!filter || !field) return defaultValue;
  return filter[field] ?? defaultValue;
}

export function setFilterValue(currentFilters, field, value) {
  return {
    ...currentFilters,
    [field]: value
  };
}

export function toggleFilterValue(currentFilters, field, value) {
  const currentValues = getFilterValue(currentFilters, field, []);
  const isArray = Array.isArray(currentValues);
  
  if (isArray) {
    if (currentValues.includes(value)) {
      return setFilterValue(currentFilters, field, 
        currentValues.filter(v => v !== value)
      );
    } else {
      return setFilterValue(currentFilters, field, [...currentValues, value]);
    }
  }
  
  return setFilterValue(currentFilters, field, value);
}

export function isFilterActive(filter, field, value = null) {
  const filterValue = getFilterValue(filter, field);
  
  if (value !== null) {
    if (Array.isArray(filterValue)) {
      return filterValue.includes(value);
    }
    return filterValue === value;
  }
  
  // Check if filter has any non-default value
  if (Array.isArray(filterValue)) {
    return filterValue.length > 0;
  }
  
  if (typeof filterValue === 'object' && filterValue !== null) {
    return Object.keys(filterValue).length > 0;
  }
  
  return filterValue !== null && filterValue !== undefined;
}

export function getActiveFiltersCount(filters) {
  let count = 0;
  
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      count += value.length;
    } else if (typeof value === 'object' && value !== null) {
      count += Object.keys(value).length;
    } else if (value !== null && value !== undefined && value !== '') {
      count += 1;
    }
  }
  
  return count;
}

export function resetFilters(defaultValues = {}) {
  return { ...defaultValues };
}

export function validateFilterValue(filterConfig, value) {
  if (!filterConfig || value === null || value === undefined) {
    return { valid: true };
  }
  
  const { type, min, max, options } = filterConfig;
  
  switch (type) {
    case FILTER_TYPES.RANGE:
    case FILTER_TYPES.SLIDER:
      if (typeof value === 'object') {
        const { min: valueMin, max: valueMax } = value;
        if (valueMin < min || valueMax > max || valueMin > valueMax) {
          return {
            valid: false,
            message: `Value must be between ${min} and ${max}`
          };
        }
      }
      break;
      
    case FILTER_TYPES.CHECKBOX:
    case FILTER_TYPES.MULTI_SELECT:
      if (Array.isArray(value) && options) {
        const invalidValues = value.filter(v => 
          !options.some(option => option.value === v)
        );
        if (invalidValues.length > 0) {
          return {
            valid: false,
            message: `Invalid values: ${invalidValues.join(', ')}`
          };
        }
      }
      break;
      
    case FILTER_TYPES.RADIO:
    case FILTER_TYPES.SELECT:
      if (options && !options.some(option => option.value === value)) {
        return {
          valid: false,
          message: 'Invalid selection'
        };
      }
      break;
  }
  
  return { valid: true };
}

export function getFilterConflicts(filters) {
  const conflicts = [];
  
  // Check for conflicting stops and duration
  const stops = getFilterValue(filters, FILTER_CATEGORIES.STOPS);
  const duration = getFilterValue(filters, FILTER_CATEGORIES.DURATION);
  
  if (stops && stops.includes(0) && duration && duration.max < 120) {
    conflicts.push({
      type: 'warning',
      message: 'Non-stop flights may not be available within this duration range',
      fields: [FILTER_CATEGORIES.STOPS, FILTER_CATEGORIES.DURATION]
    });
  }
  
  // Check for conflicting price and class
  const price = getFilterValue(filters, FILTER_CATEGORIES.PRICE);
  const travelClass = getFilterValue(filters, FILTER_CATEGORIES.CLASS);
  
  if (price && price.max < 300 && travelClass && 
      (travelClass.includes('business') || travelClass.includes('first'))) {
    conflicts.push({
      type: 'warning',
      message: 'Business/First class flights may not be available in this price range',
      fields: [FILTER_CATEGORIES.PRICE, FILTER_CATEGORIES.CLASS]
    });
  }
  
  return conflicts;
}

export function optimizeFilters(filters, availableFlights = []) {
  const optimized = { ...filters };
  
  // If no flights match current filters, suggest relaxed options
  if (availableFlights.length === 0) {
    // Expand price range
    const price = getFilterValue(filters, FILTER_CATEGORIES.PRICE);
    if (price && price.max < 1000) {
      optimized[FILTER_CATEGORIES.PRICE] = { ...price, max: price.max * 1.5 };
    }
    
    // Add more stop options
    const stops = getFilterValue(filters, FILTER_CATEGORIES.STOPS);
    if (stops && stops.length === 1 && stops[0] === 0) {
      optimized[FILTER_CATEGORIES.STOPS] = [0, 1];
    }
  }
  
  return optimized;
}

export function generateFilterRecommendations(searchState, availableFlights) {
  const recommendations = [];
  
  // Analyze popular filters based on search patterns
  if (searchState.tripType === 'business') {
    recommendations.push({
      type: 'preset',
      preset: FILTER_PRESETS.BUSINESS,
      reason: 'Recommended for business travel'
    });
  }
  
  // Suggest filters based on flight availability
  if (availableFlights.length > 50) {
    recommendations.push({
      type: 'filter',
      category: FILTER_CATEGORIES.STOPS,
      value: [0],
      reason: 'Many direct flights available'
    });
  }
  
  return recommendations;
}

export function exportFilters(filters) {
  return JSON.stringify(filters, null, 2);
}

export function importFilters(filterString) {
  try {
    return JSON.parse(filterString);
  } catch (error) {
    console.error('Invalid filter format:', error);
    return {};
  }
}