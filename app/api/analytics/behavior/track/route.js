import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import userBehaviorTrackingService from '@/lib/services/userBehaviorTracking';

/**
 * API endpoint for tracking user behavior
 * POST /api/analytics/behavior/track
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, sessionId, eventType, page, context, metadata } = body;

    // Validate required fields
    if (!eventType || !page) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, page' },
        { status: 400 }
      );
    }

    // Get user session for authentication
    const session = await getServerSession();
    const authenticatedUserId = session?.user?.id;

    // Verify user ID matches authenticated user (or allow anonymous)
    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Unauthorized user ID' },
        { status: 401 }
      );
    }

    // Track behavior
    const behaviorEvent = await userBehaviorTrackingService.trackBehavior({
      userId: authenticatedUserId || userId, // Use authenticated ID if available
      sessionId,
      eventType,
      page,
      context: {
        ...context,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || ''
      },
      metadata
    });

    return NextResponse.json({
      success: true,
      event: behaviorEvent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in behavior tracking API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests for behavior verification/debugging
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit')) || 50;

    // Get user session for authentication
    const session = await getServerSession();
    const authenticatedUserId = session?.user?.id;

    // Verify user ID matches authenticated user
    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // This would typically query your behavior analytics database
    // For now, return placeholder data
    const recentBehaviors = {
      behaviors: [],
      summary: {
        totalEvents: 0,
        sessionDuration: 0,
        pageViews: 0,
        interactions: 0
      }
    };

    return NextResponse.json({
      success: true,
      data: recentBehaviors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in behavior tracking GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get client IP address
 */
function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  } else if (realIP) {
    return realIP;
  } else if (clientIP) {
    return clientIP;
  }

  return '127.0.0.1'; // Fallback for local development
}