import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import privacyComplianceService from '@/lib/services/privacyCompliance';

/**
 * API endpoint for user privacy settings
 * GET /api/analytics/user/privacy
 * POST /api/analytics/user/privacy
 */

export async function GET(request) {
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

    // Get current consent status
    const consentStatus = await privacyComplianceService.getConsentStatus(userId);

    return NextResponse.json({
      success: true,
      data: consentStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in privacy settings GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, consent } = body;

    // Validate required fields
    if (!userId || consent === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, consent' },
        { status: 400 }
      );
    }

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

    // Update consent preferences
    const result = await privacyComplianceService.updateConsent(userId, consent);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in privacy settings POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE requests for data deletion (right to be forgotten)
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const { userId, email, password, twoFactorCode } = Object.fromEntries(searchParams);

    // Validate required fields
    if (!userId || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, password' },
        { status: 400 }
      );
    }

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

    // Delete user data
    const verificationData = { email, password, twoFactorCode };
    const result = await privacyComplianceService.deleteUserData(userId, verificationData);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in privacy settings DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}