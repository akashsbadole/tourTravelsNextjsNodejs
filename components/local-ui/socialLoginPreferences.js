"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Slider } from "../ui/slider";
import { toast } from "sonner";
import { 
  Settings, 
  Shield, 
  Bell, 
  Globe, 
  Smartphone,
  Monitor,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";

export function SocialLoginPreferences({ 
  preferences = {}, 
  onPreferencesChange,
  showAdvanced = false 
}) {
  const { data: session } = useSession();
  const [localPreferences, setLocalPreferences] = useState({
    // Basic preferences
    enableSocialLogin: true,
    defaultProvider: "",
    rememberProvider: true,
    autoProfileSync: true,
    
    // Security preferences
    requireTwoFactor: false,
    sessionTimeout: 24, // hours
    loginNotifications: true,
    suspiciousActivityAlerts: true,
    
    // Privacy preferences
    profileVisibility: "public", // public, friends, private
    shareLoginActivity: false,
    dataRetention: 365, // days
    
    // UI preferences
    showProviderBranding: true,
    compactMode: false,
    darkMode: false,
    
    // Advanced preferences
    debugMode: false,
    analyticsOptIn: true,
    betaFeatures: false,
    
    ...preferences
  });

  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    setLocalPreferences({ ...localPreferences, ...preferences });
  }, [preferences]);

  const handlePreferenceChange = (key, value) => {
    const newPreferences = { ...localPreferences, [key]: value };
    setLocalPreferences(newPreferences);
    onPreferencesChange?.(newPreferences);
  };

  const handleSavePreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          socialLoginPreferences: localPreferences
        })
      });

      if (response.ok) {
        toast.success("Social login preferences saved successfully");
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error("Failed to save preferences");
    }
  };

  const handleResetPreferences = () => {
    if (confirm('Are you sure you want to reset all social login preferences to defaults?')) {
      const defaultPreferences = {
        enableSocialLogin: true,
        defaultProvider: "",
        rememberProvider: true,
        autoProfileSync: true,
        requireTwoFactor: false,
        sessionTimeout: 24,
        loginNotifications: true,
        suspiciousActivityAlerts: true,
        profileVisibility: "public",
        shareLoginActivity: false,
        dataRetention: 365,
        showProviderBranding: true,
        compactMode: false,
        darkMode: false,
        debugMode: false,
        analyticsOptIn: true,
        betaFeatures: false
      };
      
      setLocalPreferences(defaultPreferences);
      onPreferencesChange?.(defaultPreferences);
      toast.success("Preferences reset to defaults");
    }
  };

  const socialProviders = [
    { value: "google", label: "Google" },
    { value: "facebook", label: "Facebook" },
    { value: "apple", label: "Apple" },
    { value: "twitter", label: "Twitter/X" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "instagram", label: "Instagram" }
  ];

  return (
    <div className="space-y-6">
      {/* Basic Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Basic Preferences
          </CardTitle>
          <CardDescription>
            Configure your social login experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enable-social-login">Enable Social Login</Label>
              <p className="text-sm text-gray-500">
                Allow users to log in with social media accounts
              </p>
            </div>
            <Switch
              id="enable-social-login"
              checked={localPreferences.enableSocialLogin}
              onCheckedChange={(checked) => handlePreferenceChange('enableSocialLogin', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="default-provider">Default Login Method</Label>
            <Select
              value={localPreferences.defaultProvider}
              onValueChange={(value) => handlePreferenceChange('defaultProvider', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Email/Password</SelectItem>
                {socialProviders.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="remember-provider">Remember Last Provider</Label>
              <p className="text-sm text-gray-500">
                Show the last used provider first
              </p>
            </div>
            <Switch
              id="remember-provider"
              checked={localPreferences.rememberProvider}
              onCheckedChange={(checked) => handlePreferenceChange('rememberProvider', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-profile-sync">Auto Profile Sync</Label>
              <p className="text-sm text-gray-500">
                Automatically sync profile data from social accounts
              </p>
            </div>
            <Switch
              id="auto-profile-sync"
              checked={localPreferences.autoProfileSync}
              onCheckedChange={(checked) => handlePreferenceChange('autoProfileSync', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage security for your social logins
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="require-2fa">Two-Factor Authentication</Label>
              <p className="text-sm text-gray-500">
                Require 2FA for social logins
              </p>
            </div>
            <Switch
              id="require-2fa"
              checked={localPreferences.requireTwoFactor}
              onCheckedChange={(checked) => handlePreferenceChange('requireTwoFactor', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout: {localPreferences.sessionTimeout} hours</Label>
            <Slider
              id="session-timeout"
              min={1}
              max={168} // 1 week
              step={1}
              value={[localPreferences.sessionTimeout]}
              onValueChange={([value]) => handlePreferenceChange('sessionTimeout', value)}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 hour</span>
              <span>1 week</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="login-notifications">Login Notifications</Label>
              <p className="text-sm text-gray-500">
                Get notified of new social logins
              </p>
            </div>
            <Switch
              id="login-notifications"
              checked={localPreferences.loginNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('loginNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="suspicious-activity">Suspicious Activity Alerts</Label>
              <p className="text-sm text-gray-500">
                Alert on unusual login activity
              </p>
            </div>
            <Switch
              id="suspicious-activity"
              checked={localPreferences.suspiciousActivityAlerts}
              onCheckedChange={(checked) => handlePreferenceChange('suspiciousActivityAlerts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control your social login privacy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-visibility">Profile Visibility</Label>
            <Select
              value={localPreferences.profileVisibility}
              onValueChange={(value) => handlePreferenceChange('profileVisibility', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="share-activity">Share Login Activity</Label>
              <p className="text-sm text-gray-500">
                Allow others to see your login activity
              </p>
            </div>
            <Switch
              id="share-activity"
              checked={localPreferences.shareLoginActivity}
              onCheckedChange={(checked) => handlePreferenceChange('shareLoginActivity', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="data-retention">Data Retention: {localPreferences.dataRetention} days</Label>
            <Slider
              id="data-retention"
              min={30}
              max={365}
              step={1}
              value={[localPreferences.dataRetention]}
              onValueChange={([value]) => handlePreferenceChange('dataRetention', value)}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>30 days</span>
              <span>1 year</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UI Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Display Settings
          </CardTitle>
          <CardDescription>
            Customize the social login interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="show-branding">Show Provider Branding</Label>
              <p className="text-sm text-gray-500">
                Display social provider logos and colors
              </p>
            </div>
            <Switch
              id="show-branding"
              checked={localPreferences.showProviderBranding}
              onCheckedChange={(checked) => handlePreferenceChange('showProviderBranding', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-sm text-gray-500">
                Use a more compact layout
              </p>
            </div>
            <Switch
              id="compact-mode"
              checked={localPreferences.compactMode}
              onCheckedChange={(checked) => handlePreferenceChange('compactMode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Advanced Settings
            </CardTitle>
            <CardDescription>
              Advanced configuration options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="debug-mode">Debug Mode</Label>
                <p className="text-sm text-gray-500">
                  Enable debugging information
                </p>
              </div>
              <Switch
                id="debug-mode"
                checked={localPreferences.debugMode}
                onCheckedChange={(checked) => handlePreferenceChange('debugMode', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="analytics-optin">Analytics & Tracking</Label>
                <p className="text-sm text-gray-500">
                  Help improve social login experience
                </p>
              </div>
              <Switch
                id="analytics-optin"
                checked={localPreferences.analyticsOptIn}
                onCheckedChange={(checked) => handlePreferenceChange('analyticsOptIn', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="beta-features">Beta Features</Label>
                <p className="text-sm text-gray-500">
                  Try new social login features
                </p>
              </div>
              <Switch
                id="beta-features"
                checked={localPreferences.betaFeatures}
                onCheckedChange={(checked) => handlePreferenceChange('betaFeatures', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleResetPreferences}
          className="text-red-600 hover:text-red-700"
        >
          Reset to Defaults
        </Button>
        
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowPasswords(!showPasswords)}
          >
            {showPasswords ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showPasswords ? 'Hide' : 'Show'} Advanced
          </Button>
          
          <Button onClick={handleSavePreferences}>
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}