import { cookies } from 'next/headers';
import { getOneDoc } from '@/lib/db/getOperationDB';
import { strToObjectId } from '@/lib/db/utilsDB';

/**
 * Get room booking state from cookies or database
 * @param {string} hotelId - Hotel ID
 * @param {string} userId - User ID (optional)
 * @returns {Object} - Room booking state
 */
export async function getRoomBookingState(hotelId, userId = null) {
  try {
    // Try to get booking state from cookies first
    const cookieStore = cookies();
    const bookingStateCookie = cookieStore.get(`roomBookingState_${hotelId}`);
    
    if (bookingStateCookie) {
      const bookingState = JSON.parse(bookingStateCookie.value);
      return {
        success: true,
        data: bookingState,
        source: 'cookie'
      };
    }
    
    // If no cookie and user is authenticated, try to get from database
    if (userId) {
      const userBookingState = await getOneDoc(
        'UserBookingState',
        { 
          userId: strToObjectId(userId),
          hotelId: strToObjectId(hotelId),
          isActive: true
        },
        [`userBookingState_${userId}_${hotelId}`]
      );
      
      if (userBookingState) {
        return {
          success: true,
          data: userBookingState,
          source: 'database'
        };
      }
    }
    
    // Return default empty state
    return {
      success: true,
      data: {
        hotelId,
        selectedRooms: [],
        guestInfo: {
          firstName: '',
          lastName: '',
          email: '',
          phone: {
            dialCode: '',
            number: ''
          }
        },
        customizationOptions: {},
        totalPrice: 0,
        currency: 'USD',
        checkIn: null,
        checkOut: null,
        guests: {
          adults: 1,
          children: 0
        },
        promoCode: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      source: 'default'
    };
  } catch (error) {
    console.error('Error getting room booking state:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Save room booking state to cookies or database
 * @param {Object} bookingState - Booking state to save
 * @param {string} userId - User ID (optional)
 * @returns {Object} - Save result
 */
export async function saveRoomBookingState(bookingState, userId = null) {
  try {
    const updatedBookingState = {
      ...bookingState,
      updatedAt: new Date().toISOString()
    };
    
    // Always save to cookies for immediate access
    const cookieStore = cookies();
    cookieStore.set(
      `roomBookingState_${bookingState.hotelId}`,
      JSON.stringify(updatedBookingState),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      }
    );
    
    // If user is authenticated, also save to database
    if (userId) {
      // This would typically be handled by an API endpoint
      // For now, we'll just return success since cookie is set
      console.log('Would save to database for user:', userId);
    }
    
    return {
      success: true,
      data: updatedBookingState
    };
  } catch (error) {
    console.error('Error saving room booking state:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clear room booking state from cookies
 * @param {string} hotelId - Hotel ID
 * @returns {Object} - Clear result
 */
export async function clearRoomBookingState(hotelId) {
  try {
    const cookieStore = cookies();
    cookieStore.delete(`roomBookingState_${hotelId}`);
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error clearing room booking state:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add room to booking state
 * @param {Object} bookingState - Current booking state
 * @param {Object} room - Room to add
 * @param {number} quantity - Number of rooms to add
 * @param {Object} customization - Room customization options
 * @returns {Object} - Updated booking state
 */
export function addRoomToBookingState(bookingState, room, quantity = 1, customization = {}) {
  try {
    const existingRoomIndex = bookingState.selectedRooms.findIndex(
      r => r.roomId === room._id && JSON.stringify(r.customization) === JSON.stringify(customization)
    );
    
    let updatedSelectedRooms;
    
    if (existingRoomIndex >= 0) {
      // Update existing room quantity
      updatedSelectedRooms = [...bookingState.selectedRooms];
      updatedSelectedRooms[existingRoomIndex].quantity += quantity;
    } else {
      // Add new room
      const newRoom = {
        roomId: room._id,
        roomType: room.roomType,
        roomName: room.name || room.roomType,
        price: room.price,
        quantity,
        customization,
        images: room.images || [],
        amenities: room.amenities || [],
        capacity: room.capacity || { adults: 2, children: 0 },
        bedOptions: room.bedOptions || '1 Queen Bed'
      };
      
      updatedSelectedRooms = [...bookingState.selectedRooms, newRoom];
    }
    
    return {
      success: true,
      data: {
        ...bookingState,
        selectedRooms: updatedSelectedRooms,
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error adding room to booking state:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Remove room from booking state
 * @param {Object} bookingState - Current booking state
 * @param {string} roomId - Room ID to remove
 * @param {Object} customization - Room customization options
 * @returns {Object} - Updated booking state
 */
export function removeRoomFromBookingState(bookingState, roomId, customization = {}) {
  try {
    const updatedSelectedRooms = bookingState.selectedRooms.filter(
      r => !(r.roomId === roomId && JSON.stringify(r.customization) === JSON.stringify(customization))
    );
    
    return {
      success: true,
      data: {
        ...bookingState,
        selectedRooms: updatedSelectedRooms,
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error removing room from booking state:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update room quantity in booking state
 * @param {Object} bookingState - Current booking state
 * @param {string} roomId - Room ID to update
 * @param {number} quantity - New quantity
 * @param {Object} customization - Room customization options
 * @returns {Object} - Updated booking state
 */
export function updateRoomQuantityInBookingState(bookingState, roomId, quantity, customization = {}) {
  try {
    if (quantity <= 0) {
      return removeRoomFromBookingState(bookingState, roomId, customization);
    }
    
    const updatedSelectedRooms = bookingState.selectedRooms.map(room => {
      if (room.roomId === roomId && JSON.stringify(room.customization) === JSON.stringify(customization)) {
        return {
          ...room,
          quantity
        };
      }
      return room;
    });
    
    return {
      success: true,
      data: {
        ...bookingState,
        selectedRooms: updatedSelectedRooms,
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error updating room quantity in booking state:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update guest information in booking state
 * @param {Object} bookingState - Current booking state
 * @param {Object} guestInfo - Guest information
 * @returns {Object} - Updated booking state
 */
export function updateGuestInfoInBookingState(bookingState, guestInfo) {
  try {
    return {
      success: true,
      data: {
        ...bookingState,
        guestInfo: {
          ...bookingState.guestInfo,
          ...guestInfo
        },
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error updating guest info in booking state:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update customization options in booking state
 * @param {Object} bookingState - Current booking state
 * @param {Object} customizationOptions - Customization options
 * @returns {Object} - Updated booking state
 */
export function updateCustomizationInBookingState(bookingState, customizationOptions) {
  try {
    return {
      success: true,
      data: {
        ...bookingState,
        customizationOptions: {
          ...bookingState.customizationOptions,
          ...customizationOptions
        },
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error updating customization in booking state:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate total price for booking state
 * @param {Object} bookingState - Booking state
 * @param {number} nights - Number of nights
 * @param {string} promoCode - Promo code (optional)
 * @returns {Object} - Price calculation result
 */
export function calculateBookingTotal(bookingState, nights, promoCode = '') {
  try {
    let subtotal = 0;
    let totalBeforeDiscount = 0;
    
    bookingState.selectedRooms.forEach(room => {
      const roomPrice = room.price?.base || 0;
      const roomTax = room.price?.tax || 0;
      const roomServiceFee = room.price?.serviceFee || 0;
      const roomTotalPerNight = roomPrice + roomTax + roomServiceFee;
      
      subtotal += roomTotalPerNight * room.quantity * nights;
      totalBeforeDiscount += roomTotalPerNight * room.quantity * nights;
    });
    
    // Apply promo code discount if valid
    let discountAmount = 0;
    let discountPercentage = 0;
    
    if (promoCode && bookingState.promoCode === promoCode) {
      // This would typically validate the promo code
      // For now, we'll assume a 10% discount
      discountPercentage = 10;
      discountAmount = subtotal * (discountPercentage / 100);
    }
    
    const total = subtotal - discountAmount;
    
    return {
      success: true,
      data: {
        subtotal,
        totalBeforeDiscount,
        discountAmount,
        discountPercentage,
        total,
        currency: bookingState.currency || 'USD'
      }
    };
  } catch (error) {
    console.error('Error calculating booking total:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate booking state completeness
 * @param {Object} bookingState - Booking state to validate
 * @returns {Object} - Validation result
 */
export function validateBookingState(bookingState) {
  try {
    const errors = [];
    const warnings = [];
    
    // Check if rooms are selected
    if (!bookingState.selectedRooms || bookingState.selectedRooms.length === 0) {
      errors.push('No rooms selected');
    }
    
    // Check guest information
    if (!bookingState.guestInfo.firstName || !bookingState.guestInfo.lastName) {
      errors.push('Guest name is required');
    }
    
    if (!bookingState.guestInfo.email) {
      errors.push('Guest email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingState.guestInfo.email)) {
      errors.push('Invalid email format');
    }
    
    if (!bookingState.guestInfo.phone || !bookingState.guestInfo.phone.number) {
      warnings.push('Phone number is recommended');
    }
    
    // Check dates
    if (!bookingState.checkIn || !bookingState.checkOut) {
      errors.push('Check-in and check-out dates are required');
    } else if (new Date(bookingState.checkIn) >= new Date(bookingState.checkOut)) {
      errors.push('Check-out date must be after check-in date');
    }
    
    // Check guests
    if (!bookingState.guests || bookingState.guests.adults < 1) {
      errors.push('At least one adult guest is required');
    }
    
    return {
      success: errors.length === 0,
      errors,
      warnings,
      isValid: errors.length === 0
    };
  } catch (error) {
    console.error('Error validating booking state:', error);
    return {
      success: false,
      errors: ['Validation error occurred'],
      warnings: [],
      isValid: false
    };
  }
}