import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import eventTrackingService from '../services/eventTracking';

/**
 * Analytics tracking middleware
 * Automatically tracks requests and user behavior
 */

class TrackingMiddleware {
  constructor() {
    this.trackedRoutes = [
      '/flights/search',
      '/hotels/search',
      '/flights/[flightNumber]',
      '/hotels/[slug]',
      '/flights/[flightNumber]/book',
      '/hotels/[slug]/book',
      '/api/flights/search',
      '/api/hotels/rooms/search'
    ];
    
    this.excludedRoutes = [
      '/api/analytics',
      '/_next',
      '/favicon.ico',
      '/robots.txt'
    ];
  }

  /**
   * Middleware function for Next.js
   */
  middleware = async (request) => {
    const { pathname } = request.nextUrl;
    
    // Skip tracking for excluded routes
    if (this.shouldExclude(pathname)) {
      return NextResponse.next();
    }

    // Get user session
    const session = await getServerSession();
    const userId = session?.user?.id || null;

    // Get session ID from cookies or create new one
    const sessionId = this.getOrCreateSessionId(request);

    // Track the request
    await this.trackRequest(request, userId, sessionId);

    // Add tracking headers to response
    const response = NextResponse.next();
    response.headers.set('x-analytics-session-id', sessionId);
    response.headers.set('x-analytics-user-id', userId || 'anonymous');

    return response;
  };

  /**
   * Check if route should be excluded from tracking
   */
  shouldExclude(pathname) {
    return this.excludedRoutes.some(route => pathname.startsWith(route));
  }

  /**
   * Get or create session ID
   */
  getOrCreateSessionId(request) {
    const sessionId = request.cookies.get('analytics_session_id')?.value;
    
    if (sessionId) {
      return sessionId;
    }

    // Generate new session ID
    const newSessionId = this.generateSessionId();
    
    // Return response with session cookie (handled in middleware)
    return newSessionId;
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track API request
   */
  async trackRequest(request, userId, sessionId) {
    try {
      const { pathname, searchParams } = request.nextUrl;
      const method = request.method;
      const userAgent = request.headers.get('user-agent') || '';
      const referer = request.headers.get('referer') || '';
      const ipAddress = this.getClientIP(request);

      // Determine event type based on request
      const eventType = this.getEventType(pathname, method);

      // Prepare tracking data
      const trackingData = {
        userId,
        sessionId,
        eventType,
        page: pathname,
        context: {
          userAgent,
          referer,
          ipAddress,
          deviceType: this.detectDeviceType(userAgent),
          browser: this.detectBrowser(userAgent),
          os: this.detectOS(userAgent),
          method,
          query: Object.fromEntries(searchParams)
        },
        metadata: {
          timestamp: new Date(),
          url: request.url,
          method,
          pathname
        }
      };

      // Track specific event types
      if (eventType === 'search') {
        await this.trackSearchEvent(request, userId, sessionId, trackingData);
      } else if (eventType === 'booking_initiated' || eventType === 'booking_completed') {
        await this.trackBookingEvent(request, userId, sessionId, trackingData);
      } else {
        // General event tracking
        await eventTrackingService.trackEvent(trackingData);
      }
    } catch (error) {
      console.error('Error tracking request:', error);
      // Don't block the request due to tracking errors
    }
  }

  /**
   * Determine event type from request
   */
  getEventType(pathname, method) {
    if (pathname.includes('/search')) {
      return 'search';
    } else if (pathname.includes('/book')) {
      return method === 'POST' ? 'booking_initiated' : 'booking_page_view';
    } else if (pathname.includes('/flights/')) {
      return 'flight_details_view';
    } else if (pathname.includes('/hotels/')) {
      return 'hotel_details_view';
    } else if (pathname.includes('/api/payments/')) {
      return 'payment_event';
    } else if (pathname.includes('/user/profile')) {
      return 'profile_view';
    } else if (pathname.includes('/user/my_bookings')) {
      return 'bookings_view';
    } else {
      return 'page_view';
    }
  }

  /**
   * Track search events with detailed parameters
   */
  async trackSearchEvent(request, userId, sessionId, trackingData) {
    const { pathname, searchParams } = request.nextUrl;
    
    let searchParamsObj = {};
    let searchType = 'unknown';

    if (pathname.includes('/flights/search')) {
      searchType = 'flight';
      searchParamsObj = {
        origin: searchParams.get('origin'),
        destination: searchParams.get('destination'),
        departureDate: searchParams.get('departureDate'),
        returnDate: searchParams.get('returnDate'),
        passengers: {
          adults: parseInt(searchParams.get('adults')) || 1,
          children: parseInt(searchParams.get('children')) || 0,
          infants: parseInt(searchParams.get('infants')) || 0
        },
        cabinClass: searchParams.get('cabinClass') || 'economy',
        tripType: searchParams.get('tripType') || 'one_way'
      };
    } else if (pathname.includes('/hotels/search')) {
      searchType = 'hotel';
      searchParamsObj = {
        destination: searchParams.get('destination'),
        checkIn: searchParams.get('checkIn'),
        checkOut: searchParams.get('checkOut'),
        guests: {
          adults: parseInt(searchParams.get('adults')) || 1,
          children: parseInt(searchParams.get('children')) || 0
        },
        rooms: parseInt(searchParams.get('rooms')) || 1
      };
    }

    await eventTrackingService.trackSearch(
      userId,
      sessionId,
      searchType,
      searchParamsObj,
      { totalResults: 0, searchTime: 0 }, // Will be updated by API response
      trackingData.context
    );
  }

  /**
   * Track booking events
   */
  async trackBookingEvent(request, userId, sessionId, trackingData) {
    const { pathname } = request.nextUrl;
    const bookingType = pathname.includes('/flights/') ? 'flight' : 'hotel';

    // Extract booking data from request body if available
    let bookingData = {};
    try {
      if (request.body) {
        const body = await request.json();
        bookingData = {
          bookingId: body.bookingId,
          value: body.totalAmount || body.amount,
          currency: body.currency || 'USD'
        };
      }
    } catch (error) {
      // Body might not be available or not JSON
    }

    await eventTrackingService.trackBooking(
      userId,
      sessionId,
      bookingType,
      bookingData,
      trackingData.eventType.replace('booking_', ''),
      trackingData.context
    );
  }

  /**
   * Get client IP address
   */
  getClientIP(request) {
    // Try various headers for IP address
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
   * Detect device type from user agent
   */
  detectDeviceType(userAgent) {
    if (/mobile/i.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Detect browser from user agent
   */
  detectBrowser(userAgent) {
    if (userAgent.includes('Chrome')) {
      return 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari';
    } else if (userAgent.includes('Edge')) {
      return 'Edge';
    }
    return 'Unknown';
  }

  /**
   * Detect OS from user agent
   */
  detectOS(userAgent) {
    if (userAgent.includes('Windows')) {
      return 'Windows';
    } else if (userAgent.includes('Mac')) {
      return 'macOS';
    } else if (userAgent.includes('Linux')) {
      return 'Linux';
    } else if (userAgent.includes('Android')) {
      return 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'iOS';
    }
    return 'Unknown';
  }

  /**
   * Create session cookie response
   */
  createSessionCookie(sessionId) {
    const response = NextResponse.next();
    response.cookies.set('analytics_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    });
    return response;
  }
}

// Create singleton instance
const trackingMiddleware = new TrackingMiddleware();

export default trackingMiddleware.middleware;