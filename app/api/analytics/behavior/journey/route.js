import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import userBehaviorTrackingService from '@/lib/services/userBehaviorTracking';

/**
 * API endpoint for tracking user journeys
 * POST /api/analytics/behavior/journey
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, journeyId, goal, step, stepData, context } = body;

    // Validate required fields
    if (!journeyId || !goal || !step) {
      return NextResponse.json(
        { error: 'Missing required fields: journeyId, goal, step' },
        { status: 400 }
      );
    }

    // Get user session for authentication
    const session = await getServerSession();
    const authenticatedUserId = session?.user?.id;

    // Verify user ID matches authenticated user
    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Unauthorized user ID' },
        { status: 401 }
      );
    }

    // Track journey step
    const journeyStep = await userBehaviorTrackingService.trackJourney({
      userId: authenticatedUserId || userId,
      journeyId,
      goal,
      step,
      stepData,
      context: {
        ...context,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || ''
      }
    });

    return NextResponse.json({
      success: true,
      journeyStep,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in journey tracking API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests for journey data
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const journeyId = searchParams.get('journeyId');
    const limit = parseInt(searchParams.get('limit')) || 20;

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

    // This would typically query your journey analytics database
    // For now, return placeholder data
    const journeyData = {
      journeyId,
      steps: [],
      status: 'in_progress',
      startTime: new Date(),
      totalSteps: 0,
      completedSteps: 0
    };

    return NextResponse.json({
      success: true,
      data: journeyData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in journey tracking GET:', error);
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