import { NextResponse } from "next/server";
import { RoomComparisonList, EnhancedHotelRoom, User } from "@/lib/db/models";
import { connectToDB } from "@/lib/db/utilsDB";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.config";

/**
 * Get room comparison list for a user
 * GET /api/hotels/rooms/compare
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    await connectToDB();

    let comparisonList;

    if (session?.user) {
      // Authenticated user - get their comparison list
      comparisonList = await RoomComparisonList.findOne({
        userId: session.user.id,
        isActive: true
      }).populate({
        path: 'rooms.roomId',
        populate: {
          path: 'hotelId',
          select: 'name address images rating'
        }
      });
    } else if (sessionId) {
      // Guest user - get comparison by session
      comparisonList = await RoomComparisonList.findOne({
        sessionId,
        isActive: true
      }).populate({
        path: 'rooms.roomId',
        populate: {
          path: 'hotelId',
          select: 'name address images rating'
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: "Authentication required or sessionId must be provided." 
        },
        { status: 401 }
      );
    }

    if (!comparisonList) {
      return NextResponse.json({
        success: true,
        data: {
          rooms: [],
          searchCriteria: {},
          comparisonMetrics: {
            priceWeight: 0.3,
            amenitiesWeight: 0.2,
            locationWeight: 0.2,
            sizeWeight: 0.1,
            ratingWeight: 0.2,
          }
        }
      });
    }

    // Check if comparison is expired
    if (comparisonList.isExpired) {
      // Mark as inactive
      await RoomComparisonList.findByIdAndUpdate(comparisonList._id, {
        isActive: false
      });

      return NextResponse.json({
        success: true,
        data: {
          rooms: [],
          searchCriteria: {},
          comparisonMetrics: comparisonList.comparisonMetrics,
          expired: true,
          message: "Comparison list has expired"
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: comparisonList._id,
        rooms: comparisonList.rooms,
        searchCriteria: comparisonList.searchCriteria,
        comparisonMetrics: comparisonList.comparisonMetrics,
        createdAt: comparisonList.createdAt,
        expiresAt: comparisonList.expiresAt
      }
    });

  } catch (error) {
    console.error("Error getting room comparison:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while getting room comparison." 
      },
      { status: 500 }
    );
  }
}

/**
 * Add room to comparison list
 * POST /api/hotels/rooms/compare
 * Body: { roomId: string, sessionId?: string, customNotes?: string }
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { roomId, sessionId, customNotes } = body;

    if (!roomId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Room ID is required." 
        },
        { status: 400 }
      );
    }

    await connectToDB();

    // Verify room exists
    const room = await EnhancedHotelRoom.findById(roomId);
    if (!room) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Room not found." 
        },
        { status: 404 }
      );
    }

    let comparisonList;
    const userId = session?.user?.id;

    if (userId) {
      // Authenticated user
      comparisonList = await RoomComparisonList.findOneAndUpdate(
        { userId, isActive: true },
        {
          $setOnInsert: {
            userId,
            sessionId: `user_${userId}_${Date.now()}`,
            isActive: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            createdAt: new Date(),
            rooms: [],
            searchCriteria: {},
            comparisonMetrics: {
              priceWeight: 0.3,
              amenitiesWeight: 0.2,
              locationWeight: 0.2,
              sizeWeight: 0.1,
              ratingWeight: 0.2,
            }
          }
        },
        { new: true, upsert: true }
      );
    } else if (sessionId) {
      // Guest user
      comparisonList = await RoomComparisonList.findOneAndUpdate(
        { sessionId, isActive: true },
        {
          $setOnInsert: {
            sessionId,
            isActive: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            rooms: [],
            searchCriteria: {},
            comparisonMetrics: {
              priceWeight: 0.3,
              amenitiesWeight: 0.2,
              locationWeight: 0.2,
              sizeWeight: 0.1,
              ratingWeight: 0.2,
            }
          }
        },
        { new: true, upsert: true }
      );
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: "Authentication required or sessionId must be provided." 
        },
        { status: 401 }
      );
    }

    // Check if room is already in comparison
    const existingRoom = comparisonList.rooms.find(
      r => r.roomId.toString() === roomId
    );

    if (existingRoom) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Room is already in comparison list." 
        },
        { status: 400 }
      );
    }

    // Check maximum rooms limit (e.g., 5 rooms)
    if (comparisonList.rooms.length >= 5) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Maximum 5 rooms can be compared at once." 
        },
        { status: 400 }
      );
    }

    // Add room to comparison
    const updatedList = await RoomComparisonList.findByIdAndUpdate(
      comparisonList._id,
      {
        $push: {
          rooms: {
            roomId,
            hotelId: room.hotelId,
            addedAt: new Date(),
            customNotes: customNotes || '',
            priority: comparisonList.rooms.length
          }
        },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    ).populate({
      path: 'rooms.roomId',
      populate: {
        path: 'hotelId',
        select: 'name address images rating'
      }
    });

    return NextResponse.json({
      success: true,
      message: "Room added to comparison successfully.",
      data: {
        comparisonList: updatedList,
        addedRoom: updatedList.rooms[updatedList.rooms.length - 1]
      }
    });

  } catch (error) {
    console.error("Error adding room to comparison:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while adding room to comparison." 
      },
      { status: 500 }
    );
  }
}

/**
 * Remove room from comparison list
 * DELETE /api/hotels/rooms/compare?roomId=<roomId>
 */
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const sessionId = searchParams.get('sessionId');

    if (!roomId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Room ID is required." 
        },
        { status: 400 }
      );
    }

    await connectToDB();

    let comparisonList;
    const userId = session?.user?.id;

    if (userId) {
      comparisonList = await RoomComparisonList.findOne({
        userId,
        isActive: true
      });
    } else if (sessionId) {
      comparisonList = await RoomComparisonList.findOne({
        sessionId,
        isActive: true
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: "Authentication required or sessionId must be provided." 
        },
        { status: 401 }
      );
    }

    if (!comparisonList) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Comparison list not found." 
        },
        { status: 404 }
      );
    }

    // Remove room from comparison
    const updatedList = await RoomComparisonList.findByIdAndUpdate(
      comparisonList._id,
      {
        $pull: { rooms: { roomId } },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    ).populate({
      path: 'rooms.roomId',
      populate: {
        path: 'hotelId',
        select: 'name address images rating'
      }
    });

    return NextResponse.json({
      success: true,
      message: "Room removed from comparison successfully.",
      data: {
        comparisonList: updatedList,
        removedRoomId: roomId
      }
    });

  } catch (error) {
    console.error("Error removing room from comparison:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while removing room from comparison." 
      },
      { status: 500 }
    );
  }
}

/**
 * Update comparison metrics
 * PUT /api/hotels/rooms/compare/metrics
 * Body: { priceWeight: number, amenitiesWeight: number, locationWeight: number, sizeWeight: number, ratingWeight: number }
 */
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { sessionId, ...metrics } = body;

    // Validate metrics sum to 1.0
    const totalWeight = Object.values(metrics).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Weights must sum to 1.0 (100%)." 
        },
        { status: 400 }
      );
    }

    await connectToDB();

    let comparisonList;
    const userId = session?.user?.id;

    if (userId) {
      comparisonList = await RoomComparisonList.findOneAndUpdate(
        { userId, isActive: true },
        { 
          $set: { 
            comparisonMetrics: metrics,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
    } else if (sessionId) {
      comparisonList = await RoomComparisonList.findOneAndUpdate(
        { sessionId, isActive: true },
        { 
          $set: { 
            comparisonMetrics: metrics,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: "Authentication required or sessionId must be provided." 
        },
        { status: 401 }
      );
    }

    if (!comparisonList) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Comparison list not found." 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Comparison metrics updated successfully.",
      data: {
        comparisonMetrics: comparisonList.comparisonMetrics
      }
    });

  } catch (error) {
    console.error("Error updating comparison metrics:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while updating comparison metrics." 
      },
      { status: 500 }
    );
  }
}

/**
 * Clear comparison list
 * DELETE /api/hotels/rooms/compare/clear
 */
export async function CLEAR(req) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    await connectToDB();

    let result;
    const userId = session?.user?.id;

    if (userId) {
      result = await RoomComparisonList.updateMany(
        { userId, isActive: true },
        { $set: { isActive: false, updatedAt: new Date() } }
      );
    } else if (sessionId) {
      result = await RoomComparisonList.updateMany(
        { sessionId, isActive: true },
        { $set: { isActive: false, updatedAt: new Date() } }
      );
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: "Authentication required or sessionId must be provided." 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Comparison list cleared successfully.",
      data: {
        clearedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error("Error clearing comparison list:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error while clearing comparison list." 
      },
      { status: 500 }
    );
  }
}