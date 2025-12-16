/**
 * Enhanced Hotel Search API Endpoint
 * Provides comprehensive error handling, validation, and monitoring
 */

import { NextResponse } from 'next/server';
import { hotelEdgeCaseHandler } from '@/lib/hotel-search/edge-case-handler';
import { hotelGracefulDegradationManager } from '@/lib/hotel-search/graceful-degradation';
import { hotelSearchMonitor } from '@/lib/monitoring/hotel-search-monitoring';
import { HotelErrorFactory } from '@/lib/errors/hotel-search-errors';

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `hotel_search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract client information
 */
function getClientInfo(request) {
  return {
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown',
    referer: request.headers.get('referer'),
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate request structure
 */
function validateRequestStructure(body) {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: 'Request body must be a valid JSON object'
    };
  }

  const requiredFields = ['destination', 'checkIn', 'checkOut', 'guests'];
  const missingFields = requiredFields.filter(field => !body[field]);

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
      suggestions: [
        'Ensure all required fields are included',
        'Check the API documentation for required parameters'
      ]
    };
  }

  return { valid: true };
}

/**
 * Sanitize input parameters
 */
function sanitizeInput(params) {
  const sanitized = {};

  // Sanitize destination
  if (params.destination) {
    sanitized.destination = params.destination
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS
      .substring(0, 100); // Limit length
  }

  // Sanitize dates
  ['checkIn', 'checkOut'].forEach(dateField => {
    if (params[dateField]) {
      const date = new Date(params[dateField]);
      if (!isNaN(date.getTime())) {
        sanitized[dateField] = date.toISOString().split('T')[0];
      }
    }
  });

  // Sanitize guests
  if (params.guests && typeof params.guests === 'object') {
    sanitized.guests = {
      adults: Math.max(1, Math.min(10, parseInt(params.guests.adults) || 1)),
      children: Math.max(0, Math.min(10, parseInt(params.guests.children) || 0)),
      rooms: Math.max(1, Math.min(5, parseInt(params.guests.rooms) || 1))
    };
  }

  // Sanitize optional filters
  const optionalFields = ['minPrice', 'maxPrice', 'minRating', 'amenities'];
  optionalFields.forEach(field => {
    if (params[field] !== undefined) {
      if (field === 'amenities' && Array.isArray(params[field])) {
        sanitized[field] = params[field]
          .filter(a => typeof a === 'string')
          .map(a => a.trim())
          .filter(a => a.length > 0)
          .slice(0, 10); // Limit to 10 amenities
      } else if (typeof params[field] === 'number') {
        sanitized[field] = params[field];
      }
    }
  });

  return sanitized;
}

/**
 * GET handler for hotel search
 */
export async function GET(request) {
  const requestId = generateRequestId();
  const clientInfo = getClientInfo(request);
  const startTime = Date.now();

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Convert query params to expected format
    const searchParamsObj = {
      destination: queryParams.destination,
      checkIn: queryParams.checkIn,
      checkOut: queryParams.checkOut,
      guests: queryParams.guests ? JSON.parse(queryParams.guests) : undefined,
      minPrice: queryParams.minPrice ? parseFloat(queryParams.minPrice) : undefined,
      maxPrice: queryParams.maxPrice ? parseFloat(queryParams.maxPrice) : undefined,
      minRating: queryParams.minRating ? parseFloat(queryParams.minRating) : undefined,
      amenities: queryParams.amenities ? JSON.parse(queryParams.amenities) : undefined
    };

    return await handleSearchRequest(searchParamsObj, requestId, clientInfo, startTime);

  } catch (error) {
    hotelSearchMonitor.monitorError(error, { requestId, method: 'GET' });
    
    return NextResponse.json(
      {
        success: false,
        error: HotelErrorFactory.createValidationError(
          'Invalid request parameters',
          { 
            requestId,
            originalError: error.message,
            suggestions: ['Check query parameters and try again']
          }
        )
      },
      { status: 400 }
    );
  }
}

/**
 * POST handler for hotel search
 */
export async function POST(request) {
  const requestId = generateRequestId();
  const clientInfo = getClientInfo(request);
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();

    return await handleSearchRequest(body, requestId, clientInfo, startTime);

  } catch (error) {
    hotelSearchMonitor.monitorError(error, { requestId, method: 'POST' });
    
    return NextResponse.json(
      {
        success: false,
        error: HotelErrorFactory.createValidationError(
          'Invalid request body',
          { 
            requestId,
            originalError: error.message,
            suggestions: ['Check request body format and try again']
          }
        )
      },
      { status: 400 }
    );
  }
}

/**
 * Handle hotel search request (common logic for GET/POST)
 */
async function handleSearchRequest(searchParams, requestId, clientInfo, startTime) {
  try {
    // Start monitoring
    const monitoringContext = hotelSearchMonitor.monitorSearch(
      searchParams, 
      requestId, 
      clientInfo
    );

    // Validate request structure
    const structureValidation = validateRequestStructure(searchParams);
    if (!structureValidation.valid) {
      const error = HotelErrorFactory.createValidationError(
        structureValidation.error,
        { 
          requestId,
          suggestions: structureValidation.suggestions
        }
      );
      
      hotelSearchMonitor.monitorSearchResponse(requestId, { success: false, error }, startTime);
      
      return NextResponse.json(
        {
          success: false,
          error,
          requestId
        },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedParams = sanitizeInput(searchParams);

    // Validate search parameters using edge case handler
    const validation = await hotelEdgeCaseHandler.validateSearchParams(sanitizedParams);
    
    if (!validation.valid) {
      const error = HotelErrorFactory.createValidationError(
        'Invalid search parameters',
        {
          requestId,
          validationErrors: validation.errors,
          suggestions: validation.errors.flatMap(e => e.suggestions || [])
        }
      );
      
      hotelSearchMonitor.monitorSearchResponse(requestId, { success: false, error }, startTime);
      
      return NextResponse.json(
        {
          success: false,
          error,
          requestId,
          validationErrors: validation.errors
        },
        { status: 400 }
      );
    }

    // Perform hotel search with graceful degradation
    const searchResult = await hotelGracefulDegradationManager.searchHotels(
      validation.validParams,
      {
        useCache: true,
        useFallback: true
      }
    );

    // Enhance result with additional information
    const enhancedResult = {
      ...searchResult,
      requestId,
      searchParams: validation.validParams,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      alternatives: await hotelEdgeCaseHandler.getAlternativeSearchSuggestions(validation.validParams)
    };

    // Monitor successful response
    hotelSearchMonitor.monitorSearchResponse(requestId, enhancedResult, startTime);

    // Return success response
    return NextResponse.json({
      success: true,
      data: enhancedResult,
      requestId
    });

  } catch (error) {
    // Handle unexpected errors
    const enhancedError = HotelErrorFactory.createAPIError(
      'Hotel search failed',
      {
        requestId,
        originalError: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        suggestions: [
          'Try again in a few minutes',
          'Check your internet connection',
          'Contact support if the issue persists'
        ]
      }
    );

    hotelSearchMonitor.monitorSearchResponse(requestId, { success: false, error: enhancedError }, startTime);

    return NextResponse.json(
      {
        success: false,
        error: enhancedError,
        requestId
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function HEAD() {
  try {
    const systemHealth = hotelGracefulDegradationManager.getSystemHealth();
    const monitoringHealth = hotelSearchMonitor.getDashboardData();
    
    const isHealthy = systemHealth.circuitBreaker.isHealthy && 
                     monitoringHealth.systemHealth.healthy;

    return new NextResponse(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        'X-Health-Status': isHealthy ? 'healthy' : 'unhealthy',
        'X-Circuit-Breaker': systemHealth.circuitBreaker.state,
        'X-Total-Requests': monitoringHealth.metrics.totalRequests.toString(),
        'X-Success-Rate': monitoringHealth.metrics.successRate
      }
    });

  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Health-Status': 'unhealthy',
        'X-Error': error.message
      }
    });
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}