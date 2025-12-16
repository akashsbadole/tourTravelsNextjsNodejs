"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { useEnhancedSearchHistory } from '@/components/analytics/useEnhancedSearchHistory';
import { useUserBehavior } from '@/components/analytics/useUserBehavior';

/**
 * User Analytics Dashboard
 * Personal analytics dashboard for users to view their own data
 */

export default function UserAnalyticsDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });

  // Analytics hooks
  const { trackEvent } = useAnalytics();
  const { 
    searchHistory, 
    savedSearches, 
    getSearchAnalytics 
  } = useEnhancedSearchHistory(session?.user?.id);
  
  const { 
    behaviorData, 
    getBehaviorAnalysis 
  } = useUserBehavior(session?.user?.id);

  // Fetch user analytics data
  useEffect(() => {
    if (session?.user?.id) {
      if (activeTab === 'search') {
        getSearchAnalytics('30d');
      } else if (activeTab === 'behavior') {
        getBehaviorAnalysis('30d');
      }
    }
  }, [activeTab, session?.user?.id, getSearchAnalytics, getBehaviorAnalysis]);

  const handleDateRangeChange = (type) => {
    const newDateRange = { ...dateRange };
    
    if (type === '7d') {
      newDateRange.from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      newDateRange.to = new Date();
    } else if (type === '30d') {
      newDateRange.from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      newDateRange.to = new Date();
    } else if (type === '90d') {
      newDateRange.from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      newDateRange.to = new Date();
    }
    
    setDateRange(newDateRange);
  };

  const exportMyData = async (format) => {
    try {
      const params = new URLSearchParams({
        format,
        userId: session?.user?.id
      });

      const response = await fetch(`/api/analytics/user/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-analytics-${dateRange.from.toISOString().split('T')[0]}-to-${dateRange.to.toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const updatePrivacySettings = async (settings) => {
    try {
      const response = await fetch('/api/analytics/user/privacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id,
          settings
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update privacy settings');
      }

      trackEvent('privacy_settings_updated', settings);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
    }
  };

  if (!session?.user) {
    return <div>Please sign in to view your analytics.</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Analytics</h1>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Period:</label>
            <select 
              value={dateRange.from.toISOString() === new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() ? '7d' : 
                     dateRange.from.toISOString() === new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() ? '30d' : '90d'}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button onClick={() => exportMyData('csv')} variant="outline" size="sm">
              Export CSV
            </Button>
            <Button onClick={() => exportMyData('json')} variant="outline" size="sm">
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="search">Search History</TabsTrigger>
          <TabsTrigger value="behavior">My Behavior</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab 
            behaviorData={behaviorData} 
            searchHistory={searchHistory} 
            dateRange={dateRange} 
          />
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <SearchHistoryTab 
            searchHistory={searchHistory}
            savedSearches={savedSearches}
            dateRange={dateRange}
          />
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          <BehaviorTab 
            behaviorData={behaviorData}
            dateRange={dateRange}
          />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <PrivacyTab 
            userId={session?.user?.id}
            updatePrivacySettings={updatePrivacySettings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Overview Tab Component
 */
function OverviewTab({ behaviorData, searchHistory, dateRange }) {
  const totalSearches = searchHistory?.length || 0;
  const totalSessions = behaviorData?.engagement?.totalSessions || 0;
  const avgSessionDuration = behaviorData?.engagement?.averageSessionDuration || 0;
  const conversionRate = behaviorData?.preferences?.bookingFrequency ? 
    Math.round((behaviorData.preferences.bookingFrequency === 'frequent' ? 80 : 
                   behaviorData.preferences.bookingFrequency === 'regular' ? 60 :
                   behaviorData.preferences.bookingFrequency === 'occasional' ? 30 : 10)) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSearches.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            In selected period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSessions.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            In selected period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(avgSessionDuration / 60000)}m</div>
          <p className="text-xs text-muted-foreground">
            Average time per session
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{behaviorData?.engagement?.engagementScore || 0}/100</div>
          <Progress value={behaviorData?.engagement?.engagementScore || 0} className="mt-2" />
          <p className="text-xs text-muted-foreground">
            Your engagement level
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Booking Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{behaviorData?.preferences?.bookingFrequency || 'Unknown'}</div>
          <p className="text-xs text-muted-foreground">
            How often you book
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Price Sensitivity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{behaviorData?.preferences?.priceSensitivity?.replace('_', ' ') || 'Unknown'}</div>
          <p className="text-xs text-muted-foreground">
            Your price preference
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Search History Tab Component
 */
function SearchHistoryTab({ searchHistory, savedSearches, dateRange }) {
  const recentSearches = searchHistory?.filter(search => 
    new Date(search.timestamp) >= dateRange.from && new Date(search.timestamp) <= dateRange.to
  ) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSearches.slice(0, 10).map((search, index) => (
                <div key={search.searchId} className="p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {search.searchType}
                      </Badge>
                      <p className="font-medium">{formatSearchQuery(search.searchParameters)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(search.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    {search.savedSearch?.isSaved && (
                      <Badge variant="secondary">Saved</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedSearches.slice(0, 10).map((search, index) => (
                <div key={search.searchId} className="p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {search.searchType}
                      </Badge>
                      <p className="font-medium">{formatSearchQuery(search.searchParameters)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(search.savedSearch?.savedAt).toLocaleDateString()}
                      </p>
                      {search.savedSearch?.notificationEnabled && (
                        <Badge variant="secondary" className="mt-2">
                          Notifications: {search.savedSearch?.notificationFrequency}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Behavior Tab Component
 */
function BehaviorTab({ behaviorData, dateRange }) {
  const patterns = behaviorData?.patterns || {};
  const preferences = behaviorData?.preferences || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Device Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(patterns.deviceUsage || {}).map(([device, percentage]) => (
                <div key={device} className="flex justify-between items-center">
                  <span className="capitalize">{device}</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={percentage} className="w-24" />
                    <span className="text-sm">{percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Peak Hour</span>
                <Badge variant="outline">{preferences.timePreferences?.peakHour || 'Unknown'}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Preferred Time</span>
                <Badge variant="outline">{preferences.timePreferences?.timeOfDay || 'Unknown'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Language</span>
                <Badge variant="outline">{preferences.content?.language || 'en'}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Currency</span>
                <Badge variant="outline">{preferences.content?.currency || 'USD'}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Travel Class</span>
                <Badge variant="outline">{preferences.travel?.travelClass || 'economy'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(behaviorData.insights || []).slice(0, 5).map((insight, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-start space-x-2">
                  <Badge variant={insight.severity === 'positive' ? 'default' : insight.severity === 'warning' ? 'destructive' : 'secondary'}>
                    {insight.type}
                  </Badge>
                  <div>
                    <p className="font-medium">{insight.title}</p>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Privacy Tab Component
 */
function PrivacyTab({ userId, updatePrivacySettings }) {
  const [privacySettings, setPrivacySettings] = useState({
    analytics: true,
    marketing: false,
    personalization: false,
    dataRetention: 365
  });

  const handleSettingChange = (setting, value) => {
    const newSettings = { ...privacySettings, [setting]: value };
    setPrivacySettings(newSettings);
    updatePrivacySettings(newSettings);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Analytics Tracking</h3>
                <p className="text-sm text-gray-600">
                  Help us improve our services by allowing analytics tracking
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.analytics}
                    onChange={(e) => handleSettingChange('analytics', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:after:border-white peer-checked:after:bg-blue-600 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Marketing Communications</h3>
                <p className="text-sm text-gray-600">
                  Receive promotional offers and travel deals
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.marketing}
                    onChange={(e) => handleSettingChange('marketing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:after:border-white peer-checked:after:bg-blue-600 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Personalization</h3>
                <p className="text-sm text-gray-600">
                  Allow us to personalize your experience
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.personalization}
                    onChange={(e) => handleSettingChange('personalization', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:after:border-white peer-checked:after:bg-blue-600 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Data Retention</h3>
              <p className="text-sm text-gray-600 mb-4">
                How long we retain your analytics data
              </p>
              <select
                value={privacySettings.dataRetention}
                onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
                <option value={180}>6 Months</option>
                <option value={365}>1 Year</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button 
              onClick={() => handleSettingChange('analytics', false)}
              variant="outline"
              className="w-full"
            >
              Delete All Analytics Data
            </Button>
            <p className="text-sm text-gray-600">
              This will permanently delete all your analytics data and cannot be undone.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Format search query for display
 */
function formatSearchQuery(searchParams) {
  if (searchParams.flight) {
    const { origin, destination, departureDate, returnDate } = searchParams.flight;
    return `${origin?.city || 'Unknown'} → ${destination?.city || 'Unknown'}`;
  } else if (searchParams.hotel) {
    const { destination, checkIn, checkOut } = searchParams.hotel;
    return `${destination?.city || 'Unknown'} (${checkIn} - ${checkOut})`;
  }
  return 'Unknown Search';
}