/**
 * Social Login Tests
 * Tests for all social media login providers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signIn, signOut, getSession } from 'next-auth/react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthenticateWith } from '@/components/local-ui/authenticateWith';
import { SocialAccountLinking } from '@/components/local-ui/socialAccountLinking';
import { SocialLoginErrorHandler } from '@/components/local-ui/socialLoginErrorHandler';
import socialLoginAnalytics from '@/lib/services/socialLoginAnalytics';

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  useSession: vi.fn()
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Social Login Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socialLoginAnalytics.clearData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Google OAuth', () => {
    it('should initiate Google OAuth flow', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: true });

      render(<AuthenticateWith message="Or login with" />);
      
      const googleButton = screen.getByAltText('google_icon');
      await userEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('google', {
          redirect: false
        });
      });
    });

    it('should handle Google OAuth success', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@gmail.com',
          name: 'Test User',
          image: 'https://lh3.googleusercontent.com/test.jpg',
          provider: 'google',
          providerAccountId: '123456789'
        }
      };

      const mockGetSession = vi.mocked(getSession);
      mockGetSession.mockResolvedValue(mockSession);

      // Simulate successful Google login
      const result = await socialLoginAnalytics.trackSocialLogin('google', 'test-user-id', true);
      
      expect(result).toMatchObject({
        type: 'social_login',
        provider: 'google',
        userId: 'test-user-id',
        isNewUser: true,
        success: true
      });
    });

    it('should handle Google OAuth errors', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockRejectedValue(new Error('access_denied'));

      render(
        <SocialLoginErrorHandler 
          error={{ error: 'access_denied' }}
          provider="google"
        />
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You denied access to your Google account/)).toBeInTheDocument();
    });
  });

  describe('Facebook OAuth', () => {
    it('should initiate Facebook OAuth flow', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: true });

      render(<AuthenticateWith message="Or login with" />);
      
      const facebookButton = screen.getByAltText('facebook_icon');
      await userEvent.click(facebookButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('facebook', {
          redirect: false
        });
      });
    });

    it('should handle Facebook OAuth success', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@facebook.com',
          name: 'Test User',
          image: 'https://graph.facebook.com/test/picture',
          provider: 'facebook',
          providerAccountId: '987654321'
        }
      };

      const result = await socialLoginAnalytics.trackSocialLogin('facebook', 'test-user-id', false);
      
      expect(result).toMatchObject({
        type: 'social_login',
        provider: 'facebook',
        userId: 'test-user-id',
        isNewUser: false,
        success: true
      });
    });

    it('should handle Facebook OAuth errors', async () => {
      render(
        <SocialLoginErrorHandler 
          error={{ error: 'access_denied' }}
          provider="facebook"
        />
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You denied access to your Facebook account/)).toBeInTheDocument();
    });
  });

  describe('Apple Sign In', () => {
    it('should initiate Apple Sign In flow', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: true });

      render(<AuthenticateWith message="Or login with" />);
      
      const appleButton = screen.getByAltText('apple_icon');
      await userEvent.click(appleButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('apple', {
          redirect: false
        });
      });
    });

    it('should handle Apple Sign In success', async () => {
      const result = await socialLoginAnalytics.trackSocialLogin('apple', 'test-user-id', true);
      
      expect(result).toMatchObject({
        type: 'social_login',
        provider: 'apple',
        userId: 'test-user-id',
        isNewUser: true,
        success: true
      });
    });

    it('should handle Apple Sign In errors', async () => {
      render(
        <SocialLoginErrorHandler 
          error={{ error: 'access_denied' }}
          provider="apple"
        />
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You denied access to your Apple ID/)).toBeInTheDocument();
    });
  });

  describe('Twitter/X OAuth', () => {
    it('should initiate Twitter/X OAuth flow', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: true });

      render(<AuthenticateWith message="Or login with" />);
      
      const twitterButton = screen.getByAltText('twitter_icon');
      await userEvent.click(twitterButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('twitter', {
          redirect: false
        });
      });
    });

    it('should handle Twitter/X OAuth success', async () => {
      const result = await socialLoginAnalytics.trackSocialLogin('twitter', 'test-user-id', false);
      
      expect(result).toMatchObject({
        type: 'social_login',
        provider: 'twitter',
        userId: 'test-user-id',
        isNewUser: false,
        success: true
      });
    });

    it('should handle Twitter/X OAuth errors', async () => {
      render(
        <SocialLoginErrorHandler 
          error={{ error: 'access_denied' }}
          provider="twitter"
        />
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You denied access to your Twitter\/X account/)).toBeInTheDocument();
    });
  });

  describe('LinkedIn OAuth', () => {
    it('should initiate LinkedIn OAuth flow', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: true });

      render(<AuthenticateWith message="Or login with" />);
      
      const linkedinButton = screen.getByAltText('linkedin_icon');
      await userEvent.click(linkedinButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('linkedin', {
          redirect: false
        });
      });
    });

    it('should handle LinkedIn OAuth success', async () => {
      const result = await socialLoginAnalytics.trackSocialLogin('linkedin', 'test-user-id', true);
      
      expect(result).toMatchObject({
        type: 'social_login',
        provider: 'linkedin',
        userId: 'test-user-id',
        isNewUser: true,
        success: true
      });
    });

    it('should handle LinkedIn OAuth errors', async () => {
      render(
        <SocialLoginErrorHandler 
          error={{ error: 'access_denied' }}
          provider="linkedin"
        />
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You denied access to your LinkedIn account/)).toBeInTheDocument();
    });
  });

  describe('Instagram OAuth', () => {
    it('should initiate Instagram OAuth flow', async () => {
      const mockSignIn = vi.mocked(signIn);
      mockSignIn.mockResolvedValue({ ok: true });

      render(<AuthenticateWith message="Or login with" />);
      
      const instagramButton = screen.getByAltText('instagram_icon');
      await userEvent.click(instagramButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('instagram', {
          redirect: false
        });
      });
    });

    it('should handle Instagram OAuth success', async () => {
      const result = await socialLoginAnalytics.trackSocialLogin('instagram', 'test-user-id', false);
      
      expect(result).toMatchObject({
        type: 'social_login',
        provider: 'instagram',
        userId: 'test-user-id',
        isNewUser: false,
        success: true
      });
    });

    it('should handle Instagram OAuth errors', async () => {
      render(
        <SocialLoginErrorHandler 
          error={{ error: 'access_denied' }}
          provider="instagram"
        />
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You denied access to your Instagram account/)).toBeInTheDocument();
    });
  });
});

describe('Social Account Linking', () => {
  beforeEach(() => {
    // Mock successful fetch for account linking
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  it('should display linked social accounts', () => {
    const linkedProviders = [
      { provider: 'google', providerAccountId: '123', linkedAt: '2023-01-01' },
      { provider: 'facebook', providerAccountId: '456', linkedAt: '2023-01-02' }
    ];

    render(
      <SocialAccountLinking 
        linkedProviders={linkedProviders}
      />
    );

    expect(screen.getByText('Linked Social Accounts')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
  });

  it('should allow linking new social accounts', async () => {
    const onLinkSuccess = vi.fn();
    
    render(
      <SocialAccountLinking 
        linkedProviders={[]}
        onLinkSuccess={onLinkSuccess}
      />
    );

    const linkButton = screen.getByText('Link');
    await userEvent.click(linkButton);

    await waitFor(() => {
      expect(onLinkSuccess).toHaveBeenCalled();
    });
  });

  it('should allow unlinking social accounts', async () => {
    const linkedProviders = [
      { provider: 'google', providerAccountId: '123', linkedAt: '2023-01-01' }
    ];
    const onUnlinkSuccess = vi.fn();
    
    // Mock confirm dialog
    window.confirm = vi.fn(() => true);
    
    render(
      <SocialAccountLinking 
        linkedProviders={linkedProviders}
        onUnlinkSuccess={onUnlinkSuccess}
      />
    );

    const unlinkButton = screen.getByText('Unlink');
    await userEvent.click(unlinkButton);

    await waitFor(() => {
      expect(onUnlinkSuccess).toHaveBeenCalledWith('google');
    });
  });
});

describe('Social Login Analytics', () => {
  it('should track social login events', () => {
    const event = socialLoginAnalytics.trackSocialLogin('google', 'user-123', true, {
      ip: '127.0.0.1',
      referrer: 'https://example.com'
    });

    expect(event).toMatchObject({
      type: 'social_login',
      provider: 'google',
      userId: 'user-123',
      isNewUser: true,
      ip: '127.0.0.1',
      referrer: 'https://example.com',
      success: true
    });
  });

  it('should track social login errors', () => {
    const event = socialLoginAnalytics.trackSocialLoginError('facebook', 'access_denied', {
      ip: '127.0.0.1',
      errorCode: 'AUTH_001'
    });

    expect(event).toMatchObject({
      type: 'social_login_error',
      provider: 'facebook',
      error: 'access_denied',
      ip: '127.0.0.1',
      errorCode: 'AUTH_001'
    });
  });

  it('should generate social login statistics', () => {
    // Add some test events
    socialLoginAnalytics.trackSocialLogin('google', 'user-1', true);
    socialLoginAnalytics.trackSocialLogin('facebook', 'user-2', false);
    socialLoginAnalytics.trackSocialLoginError('twitter', 'timeout');

    const stats = socialLoginAnalytics.getSocialLoginStats();

    expect(stats).toMatchObject({
      totalLogins: 2,
      totalErrors: 1,
      successRate: 66.67, // 2/3 * 100
      newUsers: 1,
      returningUsers: 1,
      mostPopularProvider: expect.any(String)
    });
  });

  it('should generate provider usage trends', () => {
    // Add some test events over different days
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    socialLoginAnalytics.trackSocialLogin('google', 'user-1', true);
    socialLoginAnalytics.trackSocialLogin('facebook', 'user-2', false);

    const trends = socialLoginAnalytics.getProviderUsageTrends(2);

    expect(trends).toHaveProperty('google');
    expect(trends).toHaveProperty('facebook');
    expect(trends.google.total).toBe(1);
    expect(trends.facebook.total).toBe(1);
  });

  it('should generate conversion funnel data', () => {
    // Add test events
    socialLoginAnalytics.trackSocialLogin('google', 'user-1', true);
    socialLoginAnalytics.trackSocialLoginError('facebook', 'access_denied');

    const funnel = socialLoginAnalytics.getConversionFunnel();

    expect(funnel).toMatchObject({
      initiated: 2,
      completed: 1,
      failed: 1,
      newUserCompleted: 1,
      completionRate: 50,
      newUserConversionRate: 100
    });
  });
});

describe('Social Login Security', () => {
  it('should validate OAuth tokens', async () => {
    // Mock token validation endpoint
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true })
    });

    const response = await fetch('/api/auth/validate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'google',
        token: 'valid-oauth-token'
      })
    });

    expect(response.ok).toBe(true);
  });

  it('should reject invalid OAuth tokens', async () => {
    // Mock token validation endpoint
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid token' })
    });

    const response = await fetch('/api/auth/validate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'google',
        token: 'invalid-oauth-token'
      })
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  it('should handle CSRF protection', async () => {
    // Mock CSRF token endpoint
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ csrfToken: 'test-csrf-token' })
    });

    const response = await fetch('/api/auth/csrf-token');
    const { csrfToken } = await response.json();

    expect(csrfToken).toBe('test-csrf-token');
  });
});