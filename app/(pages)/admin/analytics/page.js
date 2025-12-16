"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

/**
 * Admin Analytics Dashboard
 * Comprehensive analytics dashboard for administrators
 */

export default function AdminAnalyticsDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState({
    overview: {},
    trends: {},
    userBehavior: {},
    searchAnalytics: {},
    bookingAnalytics: {},
    realTime: {}
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Check if user is admin
  useEffect(() => {
    if (!session?.user?.role?.includes('admin')) {
      window.location.href = '/unauthorized';
    }
  }, [session]);

  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up real-time refresh
    const interval = setInterval(() => {
      if (activeTab === 'realtime') {
        fetchRealTimeData();
      }
    }, 30000); // Refresh every 30 seconds
    
    setRefreshInterval(interval);
    
    return () => clearInterval(interval);
  }, [activeTab, dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
        metrics: getMetricsForTab(activeTab)
      });

      const response = await fetch(`/api/analytics/aggregated?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(prev => ({ ...prev, ...data.data }));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setLoading(false);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const response = await fetch('/api/analytics/realtime');
      
      if (!response.ok) {
        throw new Error('Failed to fetch real-time data');
      }

      const data = await response.json();
      setAnalyticsData(prev => ({ ...prev, realTime: data.data }));
    } catch (error) {
      console.error('Error fetching real-time data:', error);
    }
  };

  const getMetricsForTab = (tab) => {
    const metricsMap = {
      overview: ['totalUsers', 'totalSessions', 'totalPageViews', 'totalBookings', 'totalRevenue'],
      trends: ['trends'],
      userBehavior: ['userBehavior'],
      searchAnalytics: ['searchAnalytics'],
      bookingAnalytics: ['bookingAnalytics'],
      realTime: ['realTime']
    };
    
    return metricsMap[tab]?.join(',') || '';
  };

  const handleDateRangeChange = (type) => {
    const newDateRange = { ...dateRange };
    
    if (type === 'today') {
      newDateRange.from = new Date(new Date().setHours(0, 0, 0, 0));
      newDateRange.to = new Date();
    } else if (type === '7d') {
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

  const exportData = async (format) => {
    try {
      const params = new URLSearchParams({
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
        format
      });

      const response = await fetch(`/api/analytics/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange.from.toISOString().split('T')[0]}-to-${dateRange.to.toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (!session?.user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Date Range:</label>
            <select 
              value={dateRange.from.toISOString() === new Date(new Date().setHours(0, 0, 0, 0)).toISOString() ? 'today' : 
                     dateRange.from.toISOString() === new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() ? '7d' :
                     dateRange.from.toISOString() === new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() ? '30d' : '90d'}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="today">Today</option>
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
          
          <Button onClick={() => fetchAnalyticsData()} variant="outline" size="sm">
            Refresh
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button onClick={() => exportData('csv')} variant="outline" size="sm">
              Export CSV
            </Button>
            <Button onClick={() => exportData('json')} variant="outline" size="sm">
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="userBehavior">User Behavior</TabsTrigger>
          <TabsTrigger value="searchAnalytics">Search Analytics</TabsTrigger>
          <TabsTrigger value="bookingAnalytics">Booking Analytics</TabsTrigger>
          <TabsTrigger value="realTime">Real-time</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab data={analyticsData.overview} loading={loading} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendsTab data={analyticsData.trends} loading={loading} />
        </TabsContent>

        <TabsContent value="userBehavior" className="space-y-6">
          <UserBehaviorTab data={analyticsData.userBehavior} loading={loading} />
        </TabsContent>

        <TabsContent value="searchAnalytics" className="space-y-6">
          <SearchAnalyticsTab data={analyticsData.searchAnalytics} loading={loading} />
        </TabsContent>

        <TabsContent value="bookingAnalytics" className="space-y-6">
          <BookingAnalyticsTab data={analyticsData.bookingAnalytics} loading={loading} />
        </TabsContent>

        <TabsContent value="realTime" className="space-y-6">
          <RealTimeTab data={analyticsData.realTime} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Overview Tab Component
 */
function OverviewTab({ data, loading }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : data.totalUsers?.toLocaleString() || 0}</div>
          <p className="text-xs text-muted-foreground">
            +12% from last period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : data.totalSessions?.toLocaleString() || 0}</div>
          <p className="text-xs text-muted-foreground">
            +8% from last period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Page Views</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : data.totalPageViews?.toLocaleString() || 0}</div>
          <p className="text-xs text-muted-foreground">
            +15% from last period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : data.totalBookings?.toLocaleString() || 0}</div>
          <p className="text-xs text-muted-foreground">
            +5% from last period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${loading ? '...' : (data.totalRevenue || 0).toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            +18% from last period
          </p>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Conversion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{loading ? '...' : `${data.conversionRate || 0}%`}</div>
          <p className="text-xs text-muted-foreground">
            Percentage of sessions resulting in bookings
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Trends Tab Component
 */
function TrendsTab({ data, loading }) {
  const chartData = data.daily || [];
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Growth Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Users"
              />
              <Line 
                type="monotone" 
                dataKey="sessions" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="Sessions"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8884d8" 
                fill="#8884d8"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * User Behavior Tab Component
 */
function UserBehaviorTab({ data, loading }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Device Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Desktop', value: data.deviceUsage?.desktop || 0, fill: '#0088FE' },
                    { name: 'Mobile', value: data.deviceUsage?.mobile || 0, fill: '#00C49F' },
                    { name: 'Tablet', value: data.deviceUsage?.tablet || 0, fill: '#FFBB28' }
                  ]}
                >
                  <Cell />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.topPages || []).slice(0, 10).map((page, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{page.page}</span>
                  <Badge variant="secondary">{page.views}</Badge>
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
 * Search Analytics Tab Component
 */
function SearchAnalyticsTab({ data, loading }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Search Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : data.totalSearches?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total searches in selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : data.averageResults?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Average results per search
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Destinations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data.topDestinations || []).slice(0, 10).map((dest, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm">{dest.destination}</span>
                <Badge variant="secondary">{dest.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Booking Analytics Tab Component
 */
function BookingAnalyticsTab({ data, loading }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.bookingFunnel || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : `${data.conversionRate || 0}%`}</div>
            <p className="text-xs text-muted-foreground">
              Search to booking conversion rate
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Real-time Tab Component
 */
function RealTimeTab({ data, loading }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Badge variant={data.activeUsers > 100 ? "destructive" : "default"}>
              {data.activeUsers > 100 ? 'High' : 'Normal'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : data.activeUsers?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Users currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : data.currentSessions?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views/Min</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : data.pageViewsPerMinute?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last minute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Load</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : `${data.serverLoad || 0}%`}</div>
            <p className="text-xs text-muted-foreground">
              Current server utilization
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}