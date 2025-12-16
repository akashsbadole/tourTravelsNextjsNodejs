/**
 * Hotel Search Edge Case Handler
 * Provides comprehensive validation and handling for edge cases in hotel search
 */

import { HotelErrorFactory } from '@/lib/errors/hotel-search-errors';

/**
 * Location Validator
 */
export class LocationValidator {
  constructor() {
    this.validCities = new Set();
    this.validCountries = new Set();
    this.nearbyCities = new Map();
    this.loadLocationData();
  }

  /**
   * Load location data (mock implementation)
   */
  loadLocationData() {
    // Major cities with their countries
    const majorCities = [
      { name: 'New York', country: 'USA', code: 'NYC' },
      { name: 'Los Angeles', country: 'USA', code: 'LAX' },
      { name: 'London', country: 'UK', code: 'LON' },
      { name: 'Paris', country: 'France', code: 'PAR' },
      { name: 'Tokyo', country: 'Japan', code: 'TYO' },
      { name: 'Dubai', country: 'UAE', code: 'DXB' },
      { name: 'Mumbai', country: 'India', code: 'BOM' },
      { name: 'Delhi', country: 'India', code: 'DEL' },
      { name: 'Singapore', country: 'Singapore', code: 'SIN' }
    ];

    majorCities.forEach(city => {
      this.validCities.add(city.name.toLowerCase());
      this.validCountries.add(city.country.toLowerCase());
    });

    // Setup nearby cities mapping
    this.nearbyCities.set('new york', ['brooklyn', 'queens', 'jersey city']);
    this.nearbyCities.set('london', ['westminster', 'camden', 'shoreditch']);
    this.nearbyCities.set('paris', ['versailles', 'nanterre', 'boulogne']);
    this.nearbyCities.set('tokyo', ['shibuya', 'shinjuku', 'ginza']);
  }

  /**
   * Validate location format
   */
  validateFormat(location) {
    if (!location || typeof location !== 'string') {
      return {
        valid: false,
        error: 'Location is required and must be a string'
      };
    }

    const cleanLocation = location.trim();
    
    if (cleanLocation.length < 2) {
      return {
        valid: false,
        error: 'Location name must be at least 2 characters'
      };
    }

    if (cleanLocation.length > 50) {
      return {
        valid: false,
        error: 'Location name cannot exceed 50 characters'
      };
    }

    return {
      valid: true,
      location: cleanLocation
    };
  }

  /**
   * Check if location exists in our database
   */
  async validateExists(location) {
    const formatValidation = this.validateFormat(location);
    if (!formatValidation.valid) {
      return formatValidation;
    }

    const cleanLocation = formatValidation.location.toLowerCase();
    
    if (!this.validCities.has(cleanLocation)) {
      return {
        valid: false,
        error: `Unknown location: ${location}`,
        suggestions: await this.getSuggestions(cleanLocation)
      };
    }

    return {
      valid: true,
      location: cleanLocation
    };
  }

  /**
   * Get suggestions for invalid locations
   */
  async getSuggestions(invalidLocation) {
    const suggestions = [];
    const cleanLocation = invalidLocation.toLowerCase();

    // Find similar city names
    for (const city of this.validCities) {
      if (this.isSimilar(cleanLocation, city)) {
        suggestions.push({
          name: city,
          type: 'city',
          reason: 'Similar city name'
        });
      }
    }

    // Add nearby cities if we can guess the intended city
    for (const [city, nearby] of this.nearbyCities.entries()) {
      if (city.includes(cleanLocation) || cleanLocation.includes(city)) {
        nearby.forEach(nearbyCity => {
          suggestions.push({
            name: nearbyCity,
            type: 'nearby_city',
            reason: `Near ${city}`
          });
        });
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Check if two location names are similar
   */
  isSimilar(loc1, loc2) {
    if (loc1 === loc2) return true;
    
    // Simple similarity check - contains or starts with
    return loc1.includes(loc2) || loc2.includes(loc1) ||
           loc1.startsWith(loc2) || loc2.startsWith(loc1);
  }

  /**
   * Get nearby cities
   */
  getNearbyCities(city) {
    return this.nearbyCities.get(city.toLowerCase()) || [];
  }
}

/**
 * Date Validator for Hotels
 */
export class HotelDateValidator {
  constructor() {
    this.minStayNights = 1;
    this.maxStayNights = 30;
    this.minAdvanceBooking = 1; // 1 day
    this.maxAdvanceBooking = 365; // 1 year
  }

  /**
   * Validate check-in date
   */
  validateCheckIn(checkInDate) {
    const now = new Date();
    const inputDate = new Date(checkInDate);

    if (isNaN(inputDate.getTime())) {
      return {
        valid: false,
        error: 'Invalid date format'
      };
    }

    // Set times to start of day for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkIn = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());

    if (checkIn < today) {
      return {
        valid: false,
        error: 'Check-in date cannot be in the past',
        suggestions: [
          'Select today or a future date',
          'Check your calendar for correct dates'
        ]
      };
    }

    return {
      valid: true,
      date: inputDate
    };
  }

  /**
   * Validate check-out date
   */
  validateCheckOut(checkInDate, checkOutDate) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkOut.getTime())) {
      return {
        valid: false,
        error: 'Invalid check-out date format'
      };
    }

    if (checkOut <= checkIn) {
      return {
        valid: false,
        error: 'Check-out date must be after check-in date',
        suggestions: [
          'Select a check-out date after check-in',
          'Minimum stay is 1 night'
        ]
      };
    }

    // Calculate stay duration
    const stayNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (stayNights > this.maxStayNights) {
      return {
        valid: false,
        error: `Maximum stay duration is ${this.maxStayNights} nights`,
        suggestions: [
          'Select a shorter stay duration',
          'Contact hotel directly for extended stays'
        ]
      };
    }

    return {
      valid: true,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      stayNights
    };
  }

  /**
   * Validate advance booking requirements
   */
  validateAdvanceBooking(checkInDate) {
    const now = new Date();
    const inputDate = new Date(checkInDate);
    const daysInAdvance = Math.ceil((inputDate - now) / (1000 * 60 * 60 * 24));

    if (daysInAdvance < this.minAdvanceBooking) {
      return {
        valid: false,
        error: `Booking must be made at least ${this.minAdvanceBooking} day(s) in advance`,
        suggestions: [
          'Select a date further in the future',
          'Check last-minute booking options'
        ]
      };
    }

    if (daysInAdvance > this.maxAdvanceBooking) {
      return {
        valid: false,
        error: `Booking cannot be made more than ${this.maxAdvanceBooking} days in advance`,
        suggestions: [
          'Select a date within the next year',
          'Contact hotel for bookings beyond this period'
        ]
      };
    }

    return {
      valid: true,
      daysInAdvance
    };
  }

  /**
   * Get alternative dates for flexible search
   */
  getAlternativeDates(checkInDate, checkOutDate, daysBefore = 3, daysAfter = 3) {
    const alternatives = [];
    const baseCheckIn = new Date(checkInDate);
    const baseCheckOut = new Date(checkOutDate);

    // Generate alternative check-in dates
    for (let i = -daysBefore; i <= daysAfter; i++) {
      if (i === 0) continue; // Skip original date
      
      const altCheckIn = new Date(baseCheckIn);
      altCheckIn.setDate(baseCheckIn.getDate() + i);
      
      const altCheckOut = new Date(baseCheckOut);
      altCheckOut.setDate(baseCheckOut.getDate() + i);

      alternatives.push({
        checkInDate: altCheckIn,
        checkOutDate: altCheckOut,
        offset: i,
        type: i < 0 ? 'before' : 'after'
      });
    }

    return alternatives;
  }
}

/**
 * Guest Validator for Hotels
 */
export class GuestValidator {
  constructor() {
    this.maxGuestsPerRoom = 10;
    this.maxRoomsPerBooking = 5;
    this.maxTotalGuests = 20;
  }

  /**
   * Validate guest count
   */
  validateGuestCount(guests) {
    const { adults = 1, children = 0, rooms = 1 } = guests;

    if (adults < 1) {
      return {
        valid: false,
        error: 'At least one adult is required',
        suggestions: [
          'Add at least one adult guest',
          'Adults are guests aged 18 and above'
        ]
      };
    }

    if (adults + children > this.maxGuestsPerRoom) {
      return {
        valid: false,
        error: `Maximum ${this.maxGuestsPerRoom} guests allowed per room`,
        suggestions: [
          'Reduce number of guests',
          'Book multiple rooms for larger groups'
        ]
      };
    }

    if (rooms > this.maxRoomsPerBooking) {
      return {
        valid: false,
        error: `Maximum ${this.maxRoomsPerBooking} rooms allowed per booking`,
        suggestions: [
          'Reduce number of rooms',
          'Make separate bookings for additional rooms'
        ]
      };
    }

    const totalGuests = (adults + children) * rooms;
    if (totalGuests > this.maxTotalGuests) {
      return {
        valid: false,
        error: `Maximum ${this.maxTotalGuests} guests allowed per booking`,
        suggestions: [
          'Reduce total number of guests',
          'Make multiple bookings for larger groups'
        ]
      };
    }

    return {
      valid: true,
      guests: { adults, children, rooms },
      totalGuests
    };
  }

  /**
   * Validate room capacity
   */
  validateRoomCapacity(roomCapacity, guestCount) {
    if (guestCount > roomCapacity) {
      return {
        valid: false,
        error: `Room capacity exceeded: ${guestCount} guests in room for ${roomCapacity}`,
        suggestions: [
          'Select a larger room',
          'Book multiple rooms',
          'Reduce number of guests'
        ]
      };
    }

    return {
      valid: true,
      roomCapacity,
      guestCount
    };
  }

  /**
   * Get guest configuration suggestions
   */
  getGuestSuggestions(guests) {
    const suggestions = [];
    const { adults, children, rooms } = guests;

    if (children > 0 && adults < children) {
      suggestions.push({
        type: 'adult_to_child_ratio',
        message: 'Consider adding more adults for child supervision',
        action: 'Add adults'
      });
    }

    if (rooms > 1 && adults + children < rooms * 2) {
      suggestions.push({
        type: 'room_distribution',
        message: 'Consider distributing guests more evenly across rooms',
        action: 'Adjust room allocation'
      });
    }

    return suggestions;
  }
}

/**
 * Main Hotel Edge Case Handler
 */
export class HotelEdgeCaseHandler {
  constructor() {
    this.locationValidator = new LocationValidator();
    this.dateValidator = new HotelDateValidator();
    this.guestValidator = new GuestValidator();
  }

  /**
   * Validate complete hotel search parameters
   */
  async validateSearchParams(searchParams) {
    const errors = [];
    const validParams = {};

    try {
      // Validate destination location
      if (searchParams.destination) {
        const locationValidation = await this.locationValidator.validateExists(searchParams.destination);
        if (locationValidation.valid) {
          validParams.destination = locationValidation.location;
        } else {
          errors.push({
            field: 'destination',
            error: locationValidation.error,
            suggestions: locationValidation.suggestions
          });
        }
      } else {
        errors.push({
          field: 'destination',
          error: 'Destination location is required',
          suggestions: ['Enter a city or hotel name']
        });
      }

      // Validate dates
      if (searchParams.checkIn && searchParams.checkOut) {
        const checkInValidation = this.dateValidator.validateCheckIn(searchParams.checkIn);
        if (checkInValidation.valid) {
          validParams.checkIn = checkInValidation.date;
        } else {
          errors.push({
            field: 'checkIn',
            error: checkInValidation.error,
            suggestions: checkInValidation.suggestions
          });
        }

        const checkOutValidation = this.dateValidator.validateCheckOut(
          validParams.checkIn || searchParams.checkIn,
          searchParams.checkOut
        );
        
        if (checkOutValidation.valid) {
          validParams.checkOut = checkOutValidation.checkOutDate;
          validParams.stayNights = checkOutValidation.stayNights;
        } else {
          errors.push({
            field: 'checkOut',
            error: checkOutValidation.error,
            suggestions: checkOutValidation.suggestions
          });
        }

        // Validate advance booking
        const advanceValidation = this.dateValidator.validateAdvanceBooking(
          validParams.checkIn || searchParams.checkIn
        );
        if (!advanceValidation.valid) {
          errors.push({
            field: 'checkIn',
            error: advanceValidation.error,
            suggestions: advanceValidation.suggestions
          });
        }
      } else {
        errors.push({
          field: 'checkIn',
          error: 'Check-in date is required',
          suggestions: ['Select your check-in date']
        });

        errors.push({
          field: 'checkOut',
          error: 'Check-out date is required',
          suggestions: ['Select your check-out date']
        });
      }

      // Validate guests
      if (searchParams.guests) {
        const guestValidation = this.guestValidator.validateGuestCount(searchParams.guests);
        if (guestValidation.valid) {
          validParams.guests = guestValidation.guests;
        } else {
          errors.push({
            field: 'guests',
            error: guestValidation.error,
            suggestions: guestValidation.suggestions
          });
        }
      } else {
        errors.push({
          field: 'guests',
          error: 'Guest information is required',
          suggestions: ['Select number of guests and rooms']
        });
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

    // Alternative dates
    if (searchParams.checkIn && searchParams.checkOut) {
      const dateAlternatives = this.dateValidator.getAlternativeDates(
        searchParams.checkIn,
        searchParams.checkOut
      );
      
      suggestions.push({
        type: 'alternative_dates',
        title: 'Try Different Dates',
        options: dateAlternatives.map(alt => ({
          checkInDate: alt.checkInDate,
          checkOutDate: alt.checkOutDate,
          description: `${alt.offset > 0 ? '+' : ''}${alt.offset} days`,
          type: alt.type
        }))
      });
    }

    // Alternative locations
    if (searchParams.destination) {
      const nearbyCities = this.locationValidator.getNearbyCities(searchParams.destination);
      
      if (nearbyCities.length > 0) {
        suggestions.push({
          type: 'nearby_locations',
          title: 'Try Nearby Areas',
          options: nearbyCities.map(city => ({
            location: city,
            description: `${city} - nearby area`,
            type: 'nearby_city'
          }))
        });
      }
    }

    // Alternative guest configurations
    if (searchParams.guests) {
      const guestSuggestions = this.guestValidator.getGuestSuggestions(searchParams.guests);
      
      if (guestSuggestions.length > 0) {
        suggestions.push({
          type: 'guest_configuration',
          title: 'Adjust Guest Configuration',
          options: guestSuggestions.map(suggestion => ({
            type: suggestion.type,
            description: suggestion.message,
            action: suggestion.action
          }))
        });
      }
    }

    return suggestions;
  }

  /**
   * Handle specific edge cases
   */
  handleSpecificEdgeCase(edgeCase, context = {}) {
    switch (edgeCase) {
      case 'last_minute_booking':
        return {
          handled: true,
          message: 'Last-minute booking detected',
          suggestions: [
            'Limited availability expected',
            'Premium rates may apply',
            'Consider flexible dates'
          ]
        };

      case 'peak_season':
        return {
          handled: true,
          message: 'Peak season booking detected',
          suggestions: [
            'Higher rates expected',
            'Book early for better rates',
            'Consider off-peak dates'
          ]
        };

      case 'large_group':
        return {
          handled: true,
          message: 'Large group booking detected',
          suggestions: [
            'Group discounts may be available',
            'Contact hotel directly',
            'Book well in advance'
          ]
        };

      case 'special_event':
        return {
          handled: true,
          message: 'Special event period detected',
          suggestions: [
            'Limited availability expected',
            'Premium rates may apply',
            'Book well in advance'
          ]
        };

      default:
        return {
          handled: false,
          message: 'Unknown edge case',
          suggestions: ['Contact support for assistance']
        };
    }
  }
}

// Create singleton instance
export const hotelEdgeCaseHandler = new HotelEdgeCaseHandler();

export default {
  LocationValidator,
  HotelDateValidator,
  GuestValidator,
  HotelEdgeCaseHandler,
  hotelEdgeCaseHandler
};