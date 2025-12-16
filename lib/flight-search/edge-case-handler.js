/**
 * Flight Search Edge Case Handler
 * Provides comprehensive validation and handling for edge cases in flight search
 */

import { ErrorFactory } from '@/lib/errors/flight-search-errors';

/**
 * Airport Code Validator
 */
export class AirportCodeValidator {
  constructor() {
    this.validAirportCodes = new Set();
    this.airportData = new Map();
    this.nearbyAirports = new Map();
    this.loadAirportData();
  }

  /**
   * Load airport data (mock implementation)
   */
  async loadAirportData() {
    // In a real implementation, this would load from a database or API
    const majorAirports = [
      'JFK', 'LAX', 'LHR', 'CDG', 'DXB', 'SIN', 'HKG', 'NRT', 'SYD',
      'BOM', 'DEL', 'BLR', 'MAA', 'CCU', 'HYD', 'PNQ', 'AMD', 'COK',
      'ORD', 'DFW', 'ATL', 'BOS', 'SFO', 'SEA', 'MIA', 'LAS', 'DEN'
    ];

    majorAirports.forEach(code => {
      this.validAirportCodes.add(code);
      this.airportData.set(code, {
        code,
        name: `${code} International Airport`,
        city: code,
        country: 'Unknown',
        coordinates: { lat: 0, lng: 0 }
      });
    });

    // Setup nearby airports mapping
    this.nearbyAirports.set('JFK', ['LGA', 'EWR', 'HPN']);
    this.nearbyAirports.set('LAX', ['BUR', 'SNA', 'LGB', 'ONT']);
    this.nearbyAirports.set('BOM', ['PNQ', 'AMD', 'BLR']);
    this.nearbyAirports.set('DEL', ['PNQ', 'JAI', 'LKO']);
  }

  /**
   * Validate airport code format
   */
  validateFormat(code) {
    if (!code || typeof code !== 'string') {
      return {
        valid: false,
        error: 'Airport code is required and must be a string'
      };
    }

    const cleanCode = code.trim().toUpperCase();
    
    if (cleanCode.length !== 3) {
      return {
        valid: false,
        error: 'Airport code must be exactly 3 characters long'
      };
    }

    if (!/^[A-Z]{3}$/.test(cleanCode)) {
      return {
        valid: false,
        error: 'Airport code must contain only letters'
      };
    }

    return {
      valid: true,
      code: cleanCode
    };
  }

  /**
   * Check if airport exists in our database
   */
  async validateExists(code) {
    const formatValidation = this.validateFormat(code);
    if (!formatValidation.valid) {
      return formatValidation;
    }

    const cleanCode = formatValidation.code;
    
    if (!this.validAirportCodes.has(cleanCode)) {
      return {
        valid: false,
        error: `Unknown airport code: ${cleanCode}`,
        suggestions: await this.getSuggestions(cleanCode)
      };
    }

    return {
      valid: true,
      code: cleanCode,
      airport: this.airportData.get(cleanCode)
    };
  }

  /**
   * Get suggestions for invalid airport codes
   */
  async getSuggestions(invalidCode) {
    const suggestions = [];
    const cleanCode = invalidCode.toUpperCase();

    // Find similar codes (simple Levenshtein distance)
    for (const validCode of this.validAirportCodes) {
      if (this.isSimilar(cleanCode, validCode)) {
        suggestions.push({
          code: validCode,
          airport: this.airportData.get(validCode),
          reason: 'Similar airport code'
        });
      }
    }

    // Add nearby airports if we can guess the intended airport
    const nearby = this.nearbyAirports.get(cleanCode);
    if (nearby) {
      nearby.forEach(nearbyCode => {
        if (this.validAirportCodes.has(nearbyCode)) {
          suggestions.push({
            code: nearbyCode,
            airport: this.airportData.get(nearbyCode),
            reason: 'Nearby airport'
          });
        }
      });
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Check if two codes are similar (simple implementation)
   */
  isSimilar(code1, code2) {
    if (code1 === code2) return true;
    
    let differences = 0;
    for (let i = 0; i < 3; i++) {
      if (code1[i] !== code2[i]) differences++;
      if (differences > 1) return false;
    }
    
    return differences === 1;
  }

  /**
   * Validate origin and destination are different
   */
  validateOriginDestination(origin, destination) {
    if (origin === destination) {
      return {
        valid: false,
        error: 'Origin and destination cannot be the same',
        suggestions: [
          'Select a different destination airport',
          'Check that you selected the correct airports'
        ]
      };
    }

    return { valid: true };
  }

  /**
   * Get nearby airports for a given airport
   */
  getNearbyAirports(code) {
    return this.nearbyAirports.get(code.toUpperCase()) || [];
  }
}

/**
 * Date Validator
 */
export class DateValidator {
  constructor() {
    this.minAdvanceBooking = 1; // 1 day
    this.maxAdvanceBooking = 365; // 1 year
  }

  /**
   * Validate date is not in the past
   */
  validateNotPast(date) {
    const now = new Date();
    const inputDate = new Date(date);

    if (isNaN(inputDate.getTime())) {
      return {
        valid: false,
        error: 'Invalid date format'
      };
    }

    // Set time to start of day for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkDate = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());

    if (checkDate < today) {
      return {
        valid: false,
        error: 'Date cannot be in the past',
        suggestions: [
          'Select a future date',
          'Check your calendar for the correct travel date'
        ]
      };
    }

    return {
      valid: true,
      date: inputDate
    };
  }

  /**
   * Validate advance booking requirements
   */
  validateAdvanceBooking(date) {
    const now = new Date();
    const inputDate = new Date(date);
    const daysDifference = Math.ceil((inputDate - now) / (1000 * 60 * 60 * 24));

    if (daysDifference < this.minAdvanceBooking) {
      return {
        valid: false,
        error: `Booking must be made at least ${this.minAdvanceBooking} day(s) in advance`,
        suggestions: [
          'Select a date further in the future',
          'Consider last-minute booking options if available'
        ]
      };
    }

    if (daysDifference > this.maxAdvanceBooking) {
      return {
        valid: false,
        error: `Booking cannot be made more than ${this.maxAdvanceBooking} days in advance`,
        suggestions: [
          'Select a date within the next year',
          'Contact support for bookings beyond this period'
        ]
      };
    }

    return {
      valid: true,
      date: inputDate,
      daysInAdvance: daysDifference
    };
  }

  /**
   * Validate return date is after departure date
   */
  validateReturnDate(departureDate, returnDate) {
    const departure = new Date(departureDate);
    const returnD = new Date(returnDate);

    if (returnD <= departure) {
      return {
        valid: false,
        error: 'Return date must be after departure date',
        suggestions: [
          'Select a return date after your departure date',
          'Choose a one-way trip if you don\'t need a return flight'
        ]
      };
    }

    const maxStayDays = 365; // Maximum stay duration
    const stayDuration = Math.ceil((returnD - departure) / (1000 * 60 * 60 * 24));

    if (stayDuration > maxStayDays) {
      return {
        valid: false,
        error: `Stay duration cannot exceed ${maxStayDays} days`,
        suggestions: [
          'Select a shorter stay duration',
          'Consider booking separate trips for longer stays'
        ]
      };
    }

    return {
      valid: true,
      departureDate: departure,
      returnDate: returnD,
      stayDuration
    };
  }

  /**
   * Validate date range for flexible search
   */
  validateDateRange(startDate, endDate, maxDays = 30) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const rangeDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (rangeDays > maxDays) {
      return {
        valid: false,
        error: `Date range cannot exceed ${maxDays} days`,
        suggestions: [
          'Select a narrower date range',
          'Perform multiple searches for different periods'
        ]
      };
    }

    return {
      valid: true,
      startDate: start,
      endDate: end,
      rangeDays
    };
  }

  /**
   * Get alternative dates for flexible search
   */
  getAlternativeDates(date, daysBefore = 3, daysAfter = 3) {
    const baseDate = new Date(date);
    const alternatives = [];

    for (let i = -daysBefore; i <= daysAfter; i++) {
      if (i === 0) continue; // Skip the original date
      
      const altDate = new Date(baseDate);
      altDate.setDate(baseDate.getDate() + i);
      
      alternatives.push({
        date: altDate,
        offset: i,
        type: i < 0 ? 'before' : 'after'
      });
    }

    return alternatives;
  }
}

/**
 * Passenger Validator
 */
export class PassengerValidator {
  constructor() {
    this.maxPassengers = 9;
    this.maxInfantsPerAdult = 1;
    this.minAdults = 1;
    this.childAgeLimit = 12;
    this.infantAgeLimit = 2;
  }

  /**
   * Validate passenger counts
   */
  validateCounts(passengers) {
    const { adults = 0, children = 0, infants = 0 } = passengers;
    const total = adults + children + infants;

    if (total === 0) {
      return {
        valid: false,
        error: 'At least one passenger is required',
        suggestions: ['Add passengers to continue']
      };
    }

    if (adults < this.minAdults) {
      return {
        valid: false,
        error: 'At least one adult is required',
        suggestions: [
          'Add at least one adult passenger',
          'Adults are passengers aged 12 years and above'
        ]
      };
    }

    if (total > this.maxPassengers) {
      return {
        valid: false,
        error: `Maximum ${this.maxPassengers} passengers allowed per booking`,
        suggestions: [
          'Reduce number of passengers',
          'Make separate bookings for larger groups'
        ]
      };
    }

    return {
      valid: true,
      passengers: { adults, children, infants },
      total
    };
  }

  /**
   * Validate infant to adult ratio
   */
  validateInfantRatio(passengers) {
    const { adults = 0, infants = 0 } = passengers;

    if (infants > adults * this.maxInfantsPerAdult) {
      return {
        valid: false,
        error: `Each adult can accompany maximum ${this.maxInfantsPerAdult} infant`,
        suggestions: [
          'Add more adults for additional infants',
          'Consider booking infants as children if they are over 2 years old'
        ]
      };
    }

    return { valid: true };
  }

  /**
   * Validate all passenger constraints
   */
  validateAll(passengers) {
    const countsValidation = this.validateCounts(passengers);
    if (!countsValidation.valid) {
      return countsValidation;
    }

    const ratioValidation = this.validateInfantRatio(passengers);
    if (!ratioValidation.valid) {
      return ratioValidation;
    }

    return {
      valid: true,
      passengers: countsValidation.passengers,
      total: countsValidation.total
    };
  }

  /**
   * Get passenger type descriptions
   */
  getPassengerDescriptions() {
    return {
      adults: `Adults (${this.childAgeLimit}+ years)`,
      children: `Children (${this.infantAgeLimit}-${this.childAgeLimit} years)`,
      infants: `Infants (Under ${this.infantAgeLimit} years)`
    };
  }

  /**
   * Suggest passenger configuration fixes
   */
  getSuggestions(passengers) {
    const suggestions = [];
    const { adults, children, infants } = passengers;

    if (adults === 0 && infants > 0) {
      suggestions.push('Add at least one adult to travel with infants');
    }

    if (infants > adults) {
      suggestions.push('Each adult can accompany maximum one infant');
    }

    if (adults + children + infants > this.maxPassengers) {
      suggestions.push(`Maximum ${this.maxPassengers} passengers allowed per booking`);
    }

    return suggestions;
  }
}

/**
 * Currency Validator
 */
export class CurrencyValidator {
  constructor() {
    this.supportedCurrencies = new Set([
      'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'SGD',
      'HKD', 'NZD', 'ZAR', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF'
    ]);
    
    this.currencyFormats = {
      'USD': { symbol: '$', decimalPlaces: 2 },
      'EUR': { symbol: '€', decimalPlaces: 2 },
      'GBP': { symbol: '£', decimalPlaces: 2 },
      'JPY': { symbol: '¥', decimalPlaces: 0 },
      'INR': { symbol: '₹', decimalPlaces: 2 }
    };
  }

  /**
   * Validate currency code
   */
  validateCurrency(currency) {
    if (!currency || typeof currency !== 'string') {
      return {
        valid: false,
        error: 'Currency code is required'
      };
    }

    const cleanCurrency = currency.trim().toUpperCase();

    if (!this.supportedCurrencies.has(cleanCurrency)) {
      return {
        valid: false,
        error: `Unsupported currency: ${cleanCurrency}`,
        suggestions: [
          'Use a supported currency code',
          'Available currencies: ' + Array.from(this.supportedCurrencies).join(', ')
        ]
      };
    }

    return {
      valid: true,
      currency: cleanCurrency
    };
  }

  /**
   * Validate price amount
   */
  validatePrice(amount, currency = 'USD') {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < 0) {
      return {
        valid: false,
        error: 'Price must be a valid positive number',
        suggestions: ['Enter a valid price amount']
      };
    }

    if (numAmount > 999999.99) {
      return {
        valid: false,
        error: 'Price amount exceeds maximum limit',
        suggestions: ['Enter a reasonable price amount']
      };
    }

    return {
      valid: true,
      amount: numAmount,
      formatted: this.formatPrice(numAmount, currency)
    };
  }

  /**
   * Format price with currency symbol
   */
  formatPrice(amount, currency = 'USD') {
    const format = this.currencyFormats[currency] || this.currencyFormats['USD'];
    return `${format.symbol}${amount.toFixed(format.decimalPlaces)}`;
  }

  /**
   * Convert currency (mock implementation)
   */
  async convertCurrency(amount, from, to) {
    // In a real implementation, this would call a currency conversion API
    const mockRates = {
      'USD-EUR': 0.85,
      'USD-GBP': 0.73,
      'USD-INR': 83.0,
      'EUR-USD': 1.18,
      'GBP-USD': 1.37,
      'INR-USD': 0.012
    };

    const rateKey = `${from}-${to}`;
    const reverseRateKey = `${to}-${from}`;
    
    let rate = mockRates[rateKey];
    if (!rate && mockRates[reverseRateKey]) {
      rate = 1 / mockRates[reverseRateKey];
    }

    if (!rate) {
      throw ErrorFactory.currencyConversionError(from, to, amount);
    }

    return amount * rate;
  }
}

/**
 * Main Edge Case Handler
 */
export class EdgeCaseHandler {
  constructor() {
    this.airportValidator = new AirportCodeValidator();
    this.dateValidator = new DateValidator();
    this.passengerValidator = new PassengerValidator();
    this.currencyValidator = new CurrencyValidator();
  }

  /**
   * Validate complete search parameters
   */
  async validateSearchParams(searchParams) {
    const errors = [];
    const validParams = {};

    try {
      // Validate origin airport
      if (searchParams.origin) {
        const originValidation = await this.airportValidator.validateExists(searchParams.origin);
        if (originValidation.valid) {
          validParams.origin = originValidation.code;
        } else {
          errors.push({
            field: 'origin',
            error: originValidation.error,
            suggestions: originValidation.suggestions
          });
        }
      } else {
        errors.push({
          field: 'origin',
          error: 'Origin airport is required',
          suggestions: ['Enter a valid 3-letter airport code']
        });
      }

      // Validate destination airport
      if (searchParams.destination) {
        const destValidation = await this.airportValidator.validateExists(searchParams.destination);
        if (destValidation.valid) {
          validParams.destination = destValidation.code;
        } else {
          errors.push({
            field: 'destination',
            error: destValidation.error,
            suggestions: destValidation.suggestions
          });
        }
      } else {
        errors.push({
          field: 'destination',
          error: 'Destination airport is required',
          suggestions: ['Enter a valid 3-letter airport code']
        });
      }

      // Validate origin/destination are different
      if (validParams.origin && validParams.destination) {
        const routeValidation = this.airportValidator.validateOriginDestination(
          validParams.origin,
          validParams.destination
        );
        if (!routeValidation.valid) {
          errors.push({
            field: 'destination',
            error: routeValidation.error,
            suggestions: routeValidation.suggestions
          });
        }
      }

      // Validate departure date
      if (searchParams.departureDate) {
        const departureValidation = this.dateValidator.validateNotPast(searchParams.departureDate);
        if (departureValidation.valid) {
          const advanceValidation = this.dateValidator.validateAdvanceBooking(searchParams.departureDate);
          if (advanceValidation.valid) {
            validParams.departureDate = advanceValidation.date;
          } else {
            errors.push({
              field: 'departureDate',
              error: advanceValidation.error,
              suggestions: advanceValidation.suggestions
            });
          }
        } else {
          errors.push({
            field: 'departureDate',
            error: departureValidation.error,
            suggestions: departureValidation.suggestions
          });
        }
      } else {
        errors.push({
          field: 'departureDate',
          error: 'Departure date is required',
          suggestions: ['Select a departure date']
        });
      }

      // Validate return date for round trips
      if (searchParams.tripType === 'round_trip' && searchParams.returnDate) {
        const returnValidation = this.dateValidator.validateReturnDate(
          validParams.departureDate,
          searchParams.returnDate
        );
        if (returnValidation.valid) {
          validParams.returnDate = returnValidation.returnDate;
        } else {
          errors.push({
            field: 'returnDate',
            error: returnValidation.error,
            suggestions: returnValidation.suggestions
          });
        }
      }

      // Validate passengers
      if (searchParams.passengers) {
        const passengerValidation = this.passengerValidator.validateAll(searchParams.passengers);
        if (passengerValidation.valid) {
          validParams.passengers = passengerValidation.passengers;
        } else {
          errors.push({
            field: 'passengers',
            error: passengerValidation.error,
            suggestions: passengerValidation.suggestions
          });
        }
      } else {
        errors.push({
          field: 'passengers',
          error: 'Passenger information is required',
          suggestions: ['Select number of passengers']
        });
      }

      // Validate cabin class
      if (searchParams.cabinClass) {
        const validClasses = ['economy', 'premium_economy', 'business', 'first'];
        if (validClasses.includes(searchParams.cabinClass.toLowerCase())) {
          validParams.cabinClass = searchParams.cabinClass.toLowerCase();
        } else {
          errors.push({
            field: 'cabinClass',
            error: `Invalid cabin class: ${searchParams.cabinClass}`,
            suggestions: [`Choose from: ${validClasses.join(', ')}`]
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        validParams,
        hasErrors: errors.length > 0
      };

    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: 'general',
          error: 'Validation system error',
          suggestions: ['Try again later']
        }],
        validParams: {},
        hasErrors: true
      };
    }
  }

  /**
   * Get alternative search suggestions
   */
  async getAlternativeSearchSuggestions(searchParams) {
    const suggestions = [];

    // Suggest nearby airports
    if (searchParams.origin) {
      const nearbyOrigins = this.airportValidator.getNearbyAirports(searchParams.origin);
      if (nearbyOrigins.length > 0) {
        suggestions.push({
          type: 'nearby_airports',
          title: 'Try Nearby Origin Airports',
          options: nearbyOrigins.map(code => ({
            code,
            description: `${code} - nearby airport`
          }))
        });
      }
    }

    if (searchParams.destination) {
      const nearbyDests = this.airportValidator.getNearbyAirports(searchParams.destination);
      if (nearbyDests.length > 0) {
        suggestions.push({
          type: 'nearby_airports',
          title: 'Try Nearby Destination Airports',
          options: nearbyDests.map(code => ({
            code,
            description: `${code} - nearby airport`
          }))
        });
      }
    }

    // Suggest alternative dates
    if (searchParams.departureDate) {
      const altDates = this.dateValidator.getAlternativeDates(searchParams.departureDate);
      if (altDates.length > 0) {
        suggestions.push({
          type: 'alternative_dates',
          title: 'Try Alternative Dates',
          options: altDates.map(alt => ({
            date: alt.date,
            description: `${alt.offset > 0 ? '+' : ''}${alt.offset} days`,
            type: alt.type
          }))
        });
      }
    }

    return suggestions;
  }
}

// Create singleton instance
export const edgeCaseHandler = new EdgeCaseHandler();

export default {
  AirportCodeValidator,
  DateValidator,
  PassengerValidator,
  CurrencyValidator,
  EdgeCaseHandler,
  edgeCaseHandler
};