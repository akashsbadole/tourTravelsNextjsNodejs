# Social Media Login Implementation Guide

This guide provides comprehensive information about the social media login implementation for the Travel Agency application.

## Overview

The Travel Agency application supports social media login from multiple providers:
- Google OAuth
- Facebook OAuth
- Apple Sign In
- Twitter/X OAuth
- LinkedIn OAuth
- Instagram OAuth

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Facebook OAuth
AUTH_FACEBOOK_ID=your-facebook-client-id
AUTH_FACEBOOK_SECRET=your-facebook-client-secret

# Apple Sign In
AUTH_APPLE_ID=your-apple-client-id
AUTH_APPLE_SECRET=your-apple-client-secret

# Twitter/X OAuth
AUTH_TWITTER_ID=your-twitter-client-id
AUTH_TWITTER_SECRET=your-twitter-client-secret

# LinkedIn OAuth
AUTH_LINKEDIN_ID=your-linkedin-client-id
AUTH_LINKEDIN_SECRET=your-linkedin-client-secret

# Instagram OAuth
AUTH_INSTAGRAM_ID=your-instagram-client-id
AUTH_INSTAGRAM_SECRET=your-instagram-client-secret

# Social Login Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000
```

### 2. Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Google OAuth2 API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret

#### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URI: `http://localhost:3000/api/auth/callback/facebook`
5. Copy App ID and App Secret

#### Apple Sign In
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create a new App ID
3. Enable Sign In with Apple
4. Configure redirect URI: `http://localhost:3000/api/auth/callback/apple`
5. Generate and download private key
6. Copy Team ID, App ID, and Key ID

#### Twitter/X OAuth
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new project
3. Create a new app within the project
4. Enable OAuth 2.0
5. Configure callback URL: `http://localhost:3000/api/auth/callback/twitter`
6. Copy API Key and API Secret

#### LinkedIn OAuth
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Configure OAuth 2.0
4. Add redirect URI: `http://localhost:3000/api/auth/callback/linkedin`
5. Copy Client ID and Client Secret

#### Instagram OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Instagram Basic Display product
4. Configure OAuth redirect URI: `http://localhost:3000/api/auth/callback/instagram`
5. Copy App ID and App Secret

## Implementation Details

### Authentication Flow

1. **User Initiates Login**: User clicks on social login button
2. **OAuth Redirect**: User is redirected to provider's authorization page
3. **User Consent**: User grants permissions to the application
4. **Authorization Code**: Provider redirects back with authorization code
5. **Token Exchange**: Application exchanges code for access token
6. **User Profile**: Application fetches user profile data
7. **Session Creation**: Application creates user session
8. **Account Linking**: If user exists, link new provider to existing account

### Account Linking

The system supports linking multiple social accounts to a single user account:

- **New User**: Creates new user account with social provider
- **Existing User**: Links new social provider to existing user account
- **Profile Sync**: Automatically syncs profile data from social accounts
- **Provider Switching**: Users can switch between linked providers

### Security Features

- **Token Validation**: Validates OAuth tokens on each request
- **CSRF Protection**: Prevents cross-site request forgery
- **Session Management**: Secure session handling with configurable timeout
- **Two-Factor Authentication**: Optional 2FA for social logins
- **Suspicious Activity Detection**: Alerts on unusual login patterns

## API Endpoints

### Social Account Management

#### GET /api/user/social-accounts
Get user's linked social accounts

```javascript
const response = await fetch('/api/user/social-accounts');
const { accounts, linkedProviders } = await response.json();
```

#### POST /api/user/social-accounts
Link a new social account

```javascript
const response = await fetch('/api/user/social-accounts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    provider: 'google',
    providerAccountId: '123456789',
    accessToken: 'oauth-access-token',
    refreshToken: 'oauth-refresh-token',
    profile: {
      name: 'John Doe',
      email: 'john@example.com',
      image: 'https://example.com/avatar.jpg'
    }
  })
});
```

#### DELETE /api/user/social-accounts?provider=google
Unlink a social account

```javascript
const response = await fetch('/api/user/social-accounts?provider=google', {
  method: 'DELETE'
});
```

### Token Validation

#### POST /api/auth/validate-token
Validate OAuth token

```javascript
const response = await fetch('/api/auth/validate-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    provider: 'google',
    token: 'oauth-access-token'
  })
});
```

## Components

### AuthenticateWith Component

Main social login buttons component with provider-specific styling:

```javascript
import { AuthenticateWith } from '@/components/local-ui/authenticateWith';

<AuthenticateWith 
  message="Or login with" 
  showLabels={true}
/>
```

### SocialAccountLinking Component

Account management interface for linked social accounts:

```javascript
import { SocialAccountLinking } from '@/components/local-ui/socialAccountLinking';

<SocialAccountLinking 
  linkedProviders={linkedAccounts}
  onLinkSuccess={handleLinkSuccess}
  onUnlinkSuccess={handleUnlinkSuccess}
/>
```

### SocialLoginErrorHandler Component

Error handling component for social login issues:

```javascript
import { SocialLoginErrorHandler } from '@/components/local-ui/socialLoginErrorHandler';

<SocialLoginErrorHandler 
  error={loginError}
  provider="google"
  onRetry={handleRetry}
  onUseDifferentMethod={handleDifferentMethod}
  showDetails={true}
/>
```

### SocialLoginPreferences Component

User preferences for social login:

```javascript
import { SocialLoginPreferences } from '@/components/local-ui/socialLoginPreferences';

<SocialLoginPreferences 
  preferences={userPreferences}
  onPreferencesChange={handlePreferencesChange}
  showAdvanced={true}
/>
```

## Analytics

### Social Login Analytics

Track social login events and generate insights:

```javascript
import socialLoginAnalytics from '@/lib/services/socialLoginAnalytics';

// Track login event
socialLoginAnalytics.trackSocialLogin('google', 'user-123', true, {
  ip: '127.0.0.1',
  referrer: 'https://example.com'
});

// Get statistics
const stats = socialLoginAnalytics.getSocialLoginStats();

// Get trends
const trends = socialLoginAnalytics.getProviderUsageTrends(30);

// Get conversion funnel
const funnel = socialLoginAnalytics.getConversionFunnel();
```

### Available Metrics

- **Login Count**: Total number of social logins
- **Success Rate**: Percentage of successful logins
- **Provider Usage**: Usage breakdown by provider
- **New vs Returning**: New user vs returning user ratio
- **Error Analysis**: Common errors and solutions
- **Conversion Funnel**: Login completion rates
- **Usage Trends**: Time-based usage patterns

## Error Handling

### Common Errors and Solutions

#### Access Denied
- **Cause**: User denied permission to social account
- **Solution**: Try again and grant necessary permissions

#### Invalid Request
- **Cause**: Malformed authentication request
- **Solution**: Refresh page and try again

#### Network Error
- **Cause**: Connectivity issues
- **Solution**: Check internet connection

#### Timeout
- **Cause**: Slow network or provider issues
- **Solution**: Try again or use different network

#### Unauthorized Client
- **Cause**: Application not authorized with provider
- **Solution**: Contact support

## Testing

### Running Tests

```bash
# Run all social login tests
npm run test:social-login

# Run specific provider tests
npm run test:social-login -- --provider=google

# Run with coverage
npm run test:social-login -- --coverage
```

### Test Coverage

- OAuth flow for each provider
- Account linking and unlinking
- Error handling scenarios
- Token validation
- Analytics tracking
- Security measures

## Troubleshooting

### Common Issues

#### Social Login Buttons Not Working
1. Check environment variables are set correctly
2. Verify provider credentials are valid
3. Check redirect URIs match provider configuration
4. Ensure NextAuth configuration is correct

#### Account Linking Fails
1. Check if account is already linked to another user
2. Verify user has valid session
3. Check network connectivity
4. Review server logs for specific errors

#### Token Validation Errors
1. Verify token is not expired
2. Check token format is correct
3. Ensure provider is configured correctly
4. Review token refresh logic

#### Analytics Not Tracking
1. Check analytics service is initialized
2. Verify events are being called
3. Check browser console for errors
4. Ensure data persistence is working

### Debug Mode

Enable debug mode in social login preferences to see detailed logging:

```javascript
// In browser console
localStorage.setItem('social-login-debug', 'true');
```

### Support Resources

- **Documentation**: [Social Login Docs](/docs/social-login)
- **API Reference**: [Social Login API](/api/docs/social-login)
- **Help Center**: [Social Login Help](/help/social-login)
- **Support**: [Contact Support](/support)

## Best Practices

### Security
1. Always validate OAuth tokens
2. Use HTTPS for all authentication endpoints
3. Implement proper session management
4. Enable CSRF protection
5. Monitor for suspicious activity

### User Experience
1. Provide clear error messages
2. Offer multiple login options
3. Remember user preferences
4. Enable progressive profiling
5. Provide helpful recovery options

### Performance
1. Minimize redirect chains
2. Cache user profile data
3. Optimize token refresh logic
4. Monitor authentication performance
5. Implement proper error recovery

## Migration Guide

### From Existing Auth System

1. Export existing user data
2. Map existing accounts to social providers
3. Update user schema with social fields
4. Run migration scripts
5. Test with sample users
6. Deploy to production
7. Monitor for issues

### Data Schema Updates

Add these fields to your User schema:

```javascript
{
  linkedProviders: [{
    provider: String,
    providerAccountId: String,
    linkedAt: Date,
    profile: Object
  }],
  lastLoginProvider: String,
  socialLoginPreferences: {
    enableSocialLogin: Boolean,
    defaultProvider: String,
    rememberProvider: Boolean,
    autoProfileSync: Boolean,
    requireTwoFactor: Boolean,
    sessionTimeout: Number,
    loginNotifications: Boolean,
    suspiciousActivityAlerts: Boolean,
    profileVisibility: String,
    shareLoginActivity: Boolean,
    dataRetention: Number,
    showProviderBranding: Boolean,
    compactMode: Boolean,
    darkMode: Boolean,
    debugMode: Boolean,
    analyticsOptIn: Boolean,
    betaFeatures: Boolean
  }
}
```

## Release Notes

### Version 1.0.0
- Added support for all 6 social providers
- Implemented account linking and unlinking
- Added comprehensive error handling
- Integrated analytics tracking
- Added security measures
- Created user preferences system
- Added comprehensive testing suite

### Version 1.1.0 (Planned)
- Enhanced token refresh logic
- Added social sharing features
- Improved mobile responsiveness
- Added progressive profiling
- Enhanced security monitoring
- Improved error recovery

## Contributing

### Adding New Providers

1. Add provider to NextAuth configuration
2. Create provider-specific error handling
3. Add provider branding and icons
4. Update analytics tracking
5. Add provider tests
6. Update documentation

### Reporting Issues

1. Check existing issues first
2. Provide detailed reproduction steps
3. Include environment details
4. Add relevant logs
5. Suggest possible solutions

## License

This social login implementation is part of the Travel Agency application and follows the same license terms.