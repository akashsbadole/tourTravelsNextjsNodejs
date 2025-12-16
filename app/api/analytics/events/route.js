import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import eventTrackingService from '@/lib/services/eventTracking';

/**
 * API endpoint for collecting client-side analytics events
 * POST /api/analytics/events
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { events, context } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid events data' },
        { status: 400 }
      );
    }

    // Get user session
    const session = await getServerSession();
    const userId = session?.user?.id || null;

    // Process each event
    const processedEvents = [];
    
    for (const event of events) {
      try {
        // Enhance event with server-side context
        const enhancedEvent = {
          ...event,
          userId: event.userId || userId,
          context: {
            ...event.context,
            ...context,
            ipAddress: getClientIP(request),
            timestamp: new Date()
          }
        };

        // Track the event
        await eventTrackingService.trackEvent(enhancedEvent);
        processedEvents.push(enhancedEvent);
      } catch (error) {
        console.error('Error processing individual event:', error);
        // Continue processing other events
      }
    }

    // Flush events immediately for real-time tracking
    await eventTrackingService.flush();

    return NextResponse.json({
      success: true,
      processed: processedEvents.length,
      total: events.length
    });

  } catch (error) {
    console.error('Error in analytics events API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests for event verification/debugging
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    // Return recent events for debugging (limited)
    const recentEvents = await getRecentEvents(userId, sessionId, 10);

    return NextResponse.json({
      success: true,
      events: recentEvents,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in analytics events GET:', error);
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

/**
 * Get recent events for debugging
 */
async function getRecentEvents(userId, sessionId, limit = 10) {
  try {
    // This would typically query your analytics database
    // For now, return empty array as placeholder
    return [];
  } catch (error) {
    console.error('Error getting recent events:', error);
    return [];
  }
}