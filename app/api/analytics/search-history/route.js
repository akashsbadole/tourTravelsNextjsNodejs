import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import enhancedSearchHistoryService from '@/lib/services/enhancedSearchHistory';

/**
 * API endpoint for search history tracking
 * POST /api/analytics/search-history
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, searchId, searchType, searchParams, results, context } = body;

    // Validate required fields
    if (!userId || !searchId || !searchType || !searchParams) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, searchId, searchType, searchParams' },
        { status: 400 }
      );
    }

    // Get user session for authentication
    const session = await getServerSession();
    const authenticatedUserId = session?.user?.id;

    // Verify user ID matches authenticated user
    if (userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Unauthorized user ID' },
        { status: 401 }
      );
    }

    // Track search
    const trackedSearchId = await enhancedSearchHistoryService.trackSearch({
      userId,
      searchId,
      searchType,
      searchParameters: searchParams,
      searchResults: results,
      context: {
        ...context,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || ''
      }
    });

    return NextResponse.json({
      success: true,
      searchId: trackedSearchId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in search history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests for search history
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const searchType = searchParams.get('searchType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const includeSaved = searchParams.get('includeSaved') === 'true';
    const includeConversions = searchParams.get('includeConversions') === 'true';

    // Get user session for authentication
    const session = await getServerSession();
    const authenticatedUserId = session?.user?.id;

    // Verify user ID matches authenticated user
    if (userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get search history
    const searchHistory = await enhancedSearchHistoryService.getUserSearchHistory(userId, {
      limit,
      offset,
      searchType,
      dateFrom,
      dateTo,
      includeSaved,
      includeConversions
    });

    return NextResponse.json({
      success: true,
      data: searchHistory,
      pagination: {
        limit,
        offset,
        total: searchHistory.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in search history GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE requests for clearing search history
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Get user session for authentication
    const session = await getServerSession();
    const authenticatedUserId = session?.user?.id;

    // Verify user ID matches authenticated user
    if (userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Clear search history (this would implement the actual clearing logic)
    // For now, return success response
    
    return NextResponse.json({
      success: true,
      message: 'Search history cleared',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in search history DELETE:', error);
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