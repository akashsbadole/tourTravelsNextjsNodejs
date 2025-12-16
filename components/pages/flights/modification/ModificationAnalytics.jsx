"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Filter
} from "lucide-react";

export default function ModificationAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [airlineFilter, setAirlineFilter] = useState("all");
  const [modificationTypeFilter, setModificationTypeFilter] = useState("all");

  useEffect(() => {
    fetchAnalytics();
  }, [period, airlineFilter, modificationTypeFilter]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        ...(airlineFilter !== "all" && { airlineId: airlineFilter }),
        ...(modificationTypeFilter !== "all" && { modificationType: modificationTypeFilter })
      });

      const response = await fetch(`/api/flight-modifications/analytics?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setAnalytics(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const params = new URLSearchParams({
        period,
        export: 'true',
        ...(airlineFilter !== "all" && { airlineId: airlineFilter }),
        ...(modificationTypeFilter !== "all" && { modificationType: modificationTypeFilter })
      });

      const response = await fetch(`/api/flight-modifications/analytics?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modification-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analytics) {
    return null;
  }

  const { overview, financial, processing, modificationTypes, timeDistribution, recentTrends, insights } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modification Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into flight booking modifications
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={airlineFilter} onValueChange={setAirlineFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Airlines</SelectItem>
                  {/* Airline options would be populated from data */}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={modificationTypeFilter} onValueChange={setModificationTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="date_change">Date Change</SelectItem>
                  <SelectItem value="passenger_update">Passenger Update</SelectItem>
                  <SelectItem value="seat_change">Seat Change</SelectItem>
                  <SelectItem value="baggage_change">Baggage Change</SelectItem>
                  <SelectItem value="meal_change">Meal Change</SelectItem>
                  <SelectItem value="class_upgrade">Class Upgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.overallSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              +2.4% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financial.totalRevenueFromFees}</div>
            <p className="text-xs text-muted-foreground">
              +12.3% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processing.averageProcessingTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              -0.5h from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="types">Modification Types</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="font-medium">${financial.totalRevenueFromFees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Net Revenue</span>
                  <span className="font-medium">${financial.netRevenue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Refunds</span>
                  <span className="font-medium text-red-600">${financial.totalRefundAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Fee</span>
                  <span className="font-medium">${financial.averageModificationFee}</span>
                </div>
              </CardContent>
            </Card>

            {/* Processing Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Processing Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Processing Time</span>
                  <span className="font-medium">{processing.averageProcessingTime.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fastest Processing</span>
                  <span className="font-medium">{processing.fastestProcessingTime.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Slowest Processing</span>
                  <span className="font-medium">{processing.slowestProcessingTime.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Median Time</span>
                  <span className="font-medium">{processing.medianProcessingTime.toFixed(1)}h</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Modification Types Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modificationTypes.map((type) => (
                  <div key={type.type} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {type.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium">{type.total} requests</p>
                        <p className="text-sm text-muted-foreground">
                          ${type.revenue} revenue
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{type.successRate.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">success rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Recent Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTrends.map((trend, index) => (
                  <div key={trend.date} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{trend.date}</p>
                      <p className="text-sm text-muted-foreground">
                        {trend.completed} of {trend.requests} completed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${trend.revenue}</p>
                      <p className="text-sm text-muted-foreground">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Hourly Distribution</h4>
                  <div className="space-y-2">
                    {timeDistribution.hourly.map((count, hour) => (
                      <div key={hour} className="flex items-center justify-between text-sm">
                        <span>{hour}:00</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-2 bg-primary rounded" 
                            style={{ width: `${Math.max(count * 2, 2)}px` }}
                          />
                          <span className="w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Day of Week</h4>
                  <div className="space-y-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <div key={day} className="flex items-center justify-between text-sm">
                        <span>{day}</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-2 bg-primary rounded" 
                            style={{ width: `${Math.max(timeDistribution.daily[index] * 3, 2)}px` }}
                          />
                          <span className="w-8 text-right">{timeDistribution.daily[index]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Monthly Distribution</h4>
                  <div className="space-y-2">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                      <div key={month} className="flex items-center justify-between text-sm">
                        <span>{month}</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-2 bg-primary rounded" 
                            style={{ width: `${Math.max(timeDistribution.monthly[index] * 2, 2)}px` }}
                          />
                          <span className="w-8 text-right">{timeDistribution.monthly[index]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <Alert key={index} variant={insight.type === "warning" ? "destructive" : insight.type === "success" ? "default" : "default"}>
                    {insight.type === "warning" && <AlertTriangle className="h-4 w-4" />}
                    {insight.type === "success" && <CheckCircle className="h-4 w-4" />}
                    {insight.type === "info" && <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle>{insight.title}</AlertTitle>
                    <AlertDescription>{insight.description}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}