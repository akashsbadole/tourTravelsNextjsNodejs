import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getRoomBookingState, 
  saveRoomBookingState, 
  clearRoomBookingState,
  addRoomToBookingState,
  removeRoomFromBookingState,
  updateRoomQuantityInBookingState,
  updateGuestInfoInBookingState,
  updateCustomizationInBookingState,
  calculateBookingTotal,
  validateBookingState
} from '@/lib/helpers/hotels/roomBookingState';
import { getOneDoc, updateOneDoc, insertOneDoc } from '@/lib/db/getOperationDB';
import { strToObjectId } from '@/lib/db/utilsDB';

/**
 * GET - Retrieve room booking state
 */
export async function GET(request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    
    if (!hotelId) {
      return NextResponse.json(
        { success: false, error: 'Hotel ID is required' },
        { status: 400 }
      );
    }
    
    const result = await getRoomBookingState(hotelId, session?.user?.id);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting room booking state:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create or update room booking state
 */
export async function POST(request) {
  try {
    const session = await auth();
    const body = await request.json();
    const { hotelId, action, data } = body;
    
    if (!hotelId) {
      return NextResponse.json(
        { success: false, error: 'Hotel ID is required' },
        { status: 400 }
      );
    }
    
    // Get current booking state
    const currentStateResult = await getRoomBookingState(hotelId, session?.user?.id);
    
    if (!currentStateResult.success) {
      return NextResponse.json(
        { success: false, error: currentStateResult.error },
        { status: 500 }
      );
    }
    
    let updatedState;
    
    switch (action) {
      case 'addRoom':
        const { room, quantity, customization } = data;
        const addResult = addRoomToBookingState(
          currentStateResult.data,
          room,
          quantity || 1,
          customization || {}
        );
        
        if (!addResult.success) {
          return NextResponse.json(
            { success: false, error: addResult.error },
            { status: 400 }
          );
        }
        
        updatedState = addResult.data;
        break;
        
      case 'removeRoom':
        const { roomId, removeCustomization } = data;
        const removeResult = removeRoomFromBookingState(
          currentStateResult.data,
          roomId,
          removeCustomization || {}
        );
        
        if (!removeResult.success) {
          return NextResponse.json(
            { success: false, error: removeResult.error },
            { status: 400 }
          );
        }
        
        updatedState = removeResult.data;
        break;
        
      case 'updateQuantity':
        const { roomId, quantity, updateCustomization } = data;
        const updateResult = updateRoomQuantityInBookingState(
          currentStateResult.data,
          roomId,
          quantity,
          updateCustomization || {}
        );
        
        if (!updateResult.success) {
          return NextResponse.json(
            { success: false, error: updateResult.error },
            { status: 400 }
          );
        }
        
        updatedState = updateResult.data;
        break;
        
      case 'updateGuestInfo':
        const { guestInfo } = data;
        const guestResult = updateGuestInfoInBookingState(
          currentStateResult.data,
          guestInfo
        );
        
        if (!guestResult.success) {
          return NextResponse.json(
            { success: false, error: guestResult.error },
            { status: 400 }
          );
        }
        
        updatedState = guestResult.data;
        break;
        
      case 'updateCustomization':
        const { customizationOptions } = data;
        const customResult = updateCustomizationInBookingState(
          currentStateResult.data,
          customizationOptions
        );
        
        if (!customResult.success) {
          return NextResponse.json(
            { success: false, error: customResult.error },
            { status: 400 }
          );
        }
        
        updatedState = customResult.data;
        break;
        
      case 'updateDates':
        const { checkIn, checkOut, guests } = data;
        updatedState = {
          ...currentStateResult.data,
          checkIn,
          checkOut,
          guests: guests || currentStateResult.data.guests,
          updatedAt: new Date().toISOString()
        };
        break;
        
      case 'updatePromoCode':
        const { promoCode } = data;
        updatedState = {
          ...currentStateResult.data,
          promoCode: promoCode || '',
          updatedAt: new Date().toISOString()
        };
        break;
        
      case 'calculateTotal':
        const { nights, promoCode } = data;
        const totalResult = calculateBookingTotal(
          currentStateResult.data,
          nights || 1,
          promoCode
        );
        
        return NextResponse.json(totalResult);
        
      case 'validate':
        const validationResult = validateBookingState(currentStateResult.data);
        return NextResponse.json(validationResult);
        
      default:
        // Update entire booking state
        updatedState = {
          ...currentStateResult.data,
          ...data,
          updatedAt: new Date().toISOString()
        };
    }
    
    // Save updated state
    const saveResult = await saveRoomBookingState(updatedState, session?.user?.id);
    
    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, error: saveResult.error },
        { status: 500 }
      );
    }
    
    // If user is authenticated, also save to database
    if (session?.user?.id) {
      try {
        const existingState = await getOneDoc(
          'UserBookingState',
          { 
            userId: strToObjectId(session.user.id),
            hotelId: strToObjectId(hotelId),
            isActive: true
          },
          [`userBookingState_${session.user.id}_${hotelId}`]
        );
        
        const stateData = {
          userId: strToObjectId(session.user.id),
          hotelId: strToObjectId(hotelId),
          bookingState: saveResult.data,
          isActive: true,
          updatedAt: new Date()
        };
        
        if (existingState) {
          await updateOneDoc(
            'UserBookingState',
            { _id: existingState._id },
            stateData,
            [`userBookingState_${session.user.id}_${hotelId}`]
          );
        } else {
          await insertOneDoc(
            'UserBookingState',
            {
              ...stateData,
              createdAt: new Date()
            },
            [`userBookingState_${session.user.id}_${hotelId}`]
          );
        }
      } catch (dbError) {
        console.error('Error saving booking state to database:', dbError);
        // Continue even if database save fails
      }
    }
    
    return NextResponse.json({
      success: true,
      data: saveResult.data
    });
  } catch (error) {
    console.error('Error updating room booking state:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear room booking state
 */
export async function DELETE(request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    
    if (!hotelId) {
      return NextResponse.json(
        { success: false, error: 'Hotel ID is required' },
        { status: 400 }
      );
    }
    
    // Clear from cookies
    const clearResult = await clearRoomBookingState(hotelId);
    
    if (!clearResult.success) {
      return NextResponse.json(
        { success: false, error: clearResult.error },
        { status: 500 }
      );
    }
    
    // If user is authenticated, also deactivate in database
    if (session?.user?.id) {
      try {
        await updateOneDoc(
          'UserBookingState',
          { 
            userId: strToObjectId(session.user.id),
            hotelId: strToObjectId(hotelId),
            isActive: true
          },
          { 
            isActive: false,
            updatedAt: new Date()
          },
          [`userBookingState_${session.user.id}_${hotelId}`]
        );
      } catch (dbError) {
        console.error('Error deactivating booking state in database:', dbError);
        // Continue even if database update fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Booking state cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing room booking state:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}