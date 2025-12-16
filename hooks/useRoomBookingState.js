import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing room booking state
 * @param {string} hotelId - Hotel ID
 * @returns {Object} - Booking state and management functions
 */
export function useRoomBookingState(hotelId) {
  const [bookingState, setBookingState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch booking state on mount
  useEffect(() => {
    if (hotelId) {
      fetchBookingState();
    }
  }, [hotelId]);

  const fetchBookingState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/hotels/rooms/booking-state?hotelId=${hotelId}`);
      const result = await response.json();
      
      if (result.success) {
        setBookingState(result.data);
      } else {
        setError(result.error || 'Failed to fetch booking state');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  const updateBookingState = useCallback(async (action, data) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/hotels/rooms/booking-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotelId,
          action,
          data
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBookingState(result.data);
        return { success: true, data: result.data };
      } else {
        const errorMessage = result.error || 'Failed to update booking state';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  const addRoom = useCallback(async (room, quantity = 1, customization = {}) => {
    return updateBookingState('addRoom', { room, quantity, customization });
  }, [updateBookingState]);

  const removeRoom = useCallback(async (roomId, customization = {}) => {
    return updateBookingState('removeRoom', { roomId, removeCustomization: customization });
  }, [updateBookingState]);

  const updateRoomQuantity = useCallback(async (roomId, quantity, customization = {}) => {
    return updateBookingState('updateQuantity', { roomId, quantity, updateCustomization: customization });
  }, [updateBookingState]);

  const updateGuestInfo = useCallback(async (guestInfo) => {
    return updateBookingState('updateGuestInfo', { guestInfo });
  }, [updateBookingState]);

  const updateCustomization = useCallback(async (customizationOptions) => {
    return updateBookingState('updateCustomization', { customizationOptions });
  }, [updateBookingState]);

  const updateDates = useCallback(async (checkIn, checkOut, guests) => {
    return updateBookingState('updateDates', { checkIn, checkOut, guests });
  }, [updateBookingState]);

  const updatePromoCode = useCallback(async (promoCode) => {
    return updateBookingState('updatePromoCode', { promoCode });
  }, [updateBookingState]);

  const calculateTotal = useCallback(async (nights, promoCode) => {
    try {
      const response = await fetch('/api/hotels/rooms/booking-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotelId,
          action: 'calculateTotal',
          data: { nights, promoCode }
        })
      });
      
      const result = await response.json();
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [hotelId]);

  const validateState = useCallback(async () => {
    try {
      const response = await fetch('/api/hotels/rooms/booking-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotelId,
          action: 'validate',
          data: {}
        })
      });
      
      const result = await response.json();
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [hotelId]);

  const clearBookingState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/hotels/rooms/booking-state?hotelId=${hotelId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBookingState(null);
        return { success: true };
      } else {
        const errorMessage = result.error || 'Failed to clear booking state';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const selectedRoomsCount = bookingState?.selectedRooms?.reduce((total, room) => total + room.quantity, 0) || 0;
  const hasSelectedRooms = selectedRoomsCount > 0;
  const isGuestInfoComplete = bookingState?.guestInfo?.firstName && 
                             bookingState?.guestInfo?.lastName && 
                             bookingState?.guestInfo?.email;
  const hasValidDates = bookingState?.checkIn && bookingState?.checkOut && 
                       new Date(bookingState.checkIn) < new Date(bookingState.checkOut);

  return {
    // State
    bookingState,
    loading,
    error,
    
    // Computed values
    selectedRoomsCount,
    hasSelectedRooms,
    isGuestInfoComplete,
    hasValidDates,
    
    // Actions
    fetchBookingState,
    addRoom,
    removeRoom,
    updateRoomQuantity,
    updateGuestInfo,
    updateCustomization,
    updateDates,
    updatePromoCode,
    calculateTotal,
    validateState,
    clearBookingState,
    resetError
  };
}

/**
 * Custom hook for room comparison functionality
 * @returns {Object} - Room comparison state and functions
 */
export function useRoomComparison() {
  const [comparisonRooms, setComparisonRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addToComparison = useCallback(async (room) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/hotels/rooms/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          data: { room }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setComparisonRooms(result.data.rooms || []);
        return { success: true };
      } else {
        const errorMessage = result.error || 'Failed to add room to comparison';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const removeFromComparison = useCallback(async (roomId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/hotels/rooms/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          data: { roomId }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setComparisonRooms(result.data.rooms || []);
        return { success: true };
      } else {
        const errorMessage = result.error || 'Failed to remove room from comparison';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearComparison = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/hotels/rooms/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clear',
          data: {}
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setComparisonRooms([]);
        return { success: true };
      } else {
        const errorMessage = result.error || 'Failed to clear comparison';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchComparison = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/hotels/rooms/compare');
      const result = await response.json();
      
      if (result.success) {
        setComparisonRooms(result.data.rooms || []);
      } else {
        const errorMessage = result.error || 'Failed to fetch comparison';
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch comparison on mount
  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const isRoomInComparison = useCallback((roomId) => {
    return comparisonRooms.some(room => room._id === roomId);
  }, [comparisonRooms]);

  const comparisonCount = comparisonRooms.length;
  const canAddMore = comparisonCount < 4; // Max 4 rooms for comparison

  return {
    // State
    comparisonRooms,
    loading,
    error,
    
    // Computed values
    comparisonCount,
    canAddMore,
    isRoomInComparison,
    
    // Actions
    addToComparison,
    removeFromComparison,
    clearComparison,
    fetchComparison
  };
}

/**
 * Custom hook for room availability checking
 * @returns {Object} - Availability checking functions
 */
export function useRoomAvailability() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkAvailability = useCallback(async (hotelId, roomIds, checkIn, checkOut, guests = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/hotels/rooms/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotelId,
          roomIds,
          checkIn,
          checkOut,
          guests
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        const errorMessage = result.error || 'Failed to check availability';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSingleRoomAvailability = useCallback(async (hotelId, roomId, checkIn, checkOut, guests = 1) => {
    return checkAvailability(hotelId, [roomId], checkIn, checkOut, guests);
  }, [checkAvailability]);

  return {
    loading,
    error,
    checkAvailability,
    checkSingleRoomAvailability
  };
}