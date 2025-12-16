import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { AggregatedAnalytics } from '@/lib/db/models';
import { getOneDoc, getManyDocs } from '@/lib/db/getOperationDB';

/**
 * API endpoint for aggregated analytics data
 * GET /api/analytics/aggregated
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const metrics = searchParams.get('metrics')?.split(',') || [];
    const limit = parseInt(searchParams.get('limit')) || 30;

    // Get user session for authorization (admin only)
    const session = await getServerSession();
    const userId = session?.user?.id;

    // Check if user has admin privileges (simplified check)
    if (!userId || !session?.user?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Build date filter
    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.date = {};
      if (dateFrom) {
        dateFilter.date.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateFilter.date.$lte = new Date(dateTo);
      }
    }

    // Build query
    const filter = {
      period,
      ...dateFilter
    };

    // Get aggregated analytics data
    const analyticsData = await getManyDocs(
      "AggregatedAnalytics",
      filter,
      [],
      false,
      {
        sort: { date: -1 },
        limit
      }
    );

    // Process and format the data
    const processedData = processAnalyticsData(analyticsData, metrics);

    return NextResponse.json({
      success: true,
      data: processedData,
      metadata: {
        period,
        dateRange: {
          from: dateFrom || null,
          to: dateTo || null
        },
        totalRecords: analyticsData.length,
        requestedMetrics: metrics
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in aggregated analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for creating/updating aggregated analytics
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { period, date, data } = body;

    // Get user session for authorization (admin only)
    const session = await getServerSession();
    const userId = session?.user?.id;

    // Check if user has admin privileges
    if (!userId || !session?.user?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!period || !date || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: period, date, data' },
        { status: 400 }
      );
    }

    // Create or update aggregated analytics
    const analyticsId = `${date.split('T')[0]}:${period}`;
    
    const existingAnalytics = await getOneDoc("AggregatedAnalytics", { _id: analyticsId });
    
    if (existingAnalytics) {
      // Update existing record
      await AggregatedAnalytics.updateOne(
        { _id: analyticsId },
        { $set: data }
      );
    } else {
      // Create new record
      await AggregatedAnalytics.createOne("AggregatedAnalytics", {
        _id: analyticsId,
        date: new Date(date),
        period,
        ...data
      });
    }

    return NextResponse.json({
      success: true,
      analyticsId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in aggregated analytics POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process and format analytics data based on requested metrics
 */
function processAnalyticsData(analyticsData, requestedMetrics) {
  if (!analyticsData || analyticsData.length === 0) {
    return {
      overview: {},
      trends: [],
      insights: []
    };
  }

  // Aggregate data across all records
  const aggregated = {
    overview: {},
    trends: {},
    insights: []
  };

  // Calculate overview metrics
  aggregated.overview = {
    totalUsers: analyticsData.reduce((sum, record) => sum + (record.overview?.totalUsers || 0), 0),
    totalSessions: analyticsData.reduce((sum, record) => sum + (record.overview?.totalSessions || 0), 0),
    totalPageViews: analyticsData.reduce((sum, record) => sum + (record.overview?.totalPageViews || 0), 0),
    totalBookings: analyticsData.reduce((sum, record) => sum + (record.overview?.totalBookings || 0), 0),
    totalRevenue: analyticsData.reduce((sum, record) => sum + (record.overview?.totalRevenue || 0), 0),
    averageConversionRate: analyticsData.reduce((sum, record) => sum + (record.overview?.conversionRate || 0), 0) / analyticsData.length,
    averageSessionDuration: analyticsData.reduce((sum, record) => sum + (record.overview?.averageSessionDuration || 0), 0) / analyticsData.length,
    bounceRate: analyticsData.reduce((sum, record) => sum + (record.overview?.bounceRate || 0), 0) / analyticsData.length
  };

  // Process trends if requested
  if (requestedMetrics.includes('trends') || requestedMetrics.length === 0) {
    aggregated.trends = processTrends(analyticsData);
  }

  // Generate insights
  aggregated.insights = generateInsights(analyticsData);

  // Filter to only requested metrics
  if (requestedMetrics.length > 0) {
    const filtered = { overview: {} };
    
    requestedMetrics.forEach(metric => {
      if (aggregated.overview[metric] !== undefined) {
        filtered.overview[metric] = aggregated.overview[metric];
      }
    });
    
    filtered.trends = aggregated.trends;
    filtered.insights = aggregated.insights;
    
    return filtered;
  }

  return aggregated;
}

/**
 * Process trends from analytics data
 */
function processTrends(analyticsData) {
  const trends = {
    daily: [],
    weekly: [],
    monthly: []
  };

  // Group data by date
  const dailyData = {};
  analyticsData.forEach(record => {
    const date = record.date.toISOString().split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = {
        users: 0,
        sessions: 0,
        pageViews: 0,
        bookings: 0,
        revenue: 0
      };
    }
    
    const day = dailyData[date];
    day.users += record.overview?.totalUsers || 0;
    day.sessions += record.overview?.totalSessions || 0;
    day.pageViews += record.overview?.totalPageViews || 0;
    day.bookings += record.overview?.totalBookings || 0;
    day.revenue += record.overview?.totalRevenue || 0;
  });

  // Convert to array and sort
  trends.daily = Object.entries(dailyData)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30); // Last 30 days

  // Calculate weekly and monthly trends (simplified)
  trends.weekly = calculateWeeklyTrends(trends.daily);
  trends.monthly = calculateMonthlyTrends(trends.daily);

  return trends;
}

/**
 * Calculate weekly trends from daily data
 */
function calculateWeeklyTrends(dailyData) {
  const weeklyData = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        weekStart: weekKey,
        users: 0,
        sessions: 0,
        pageViews: 0,
        bookings: 0,
        revenue: 0
      };
    }
    
    const week = weeklyData[weekKey];
    week.users += day.users;
    week.sessions += day.sessions;
    week.pageViews += day.pageViews;
    week.bookings += day.bookings;
    week.revenue += day.revenue;
  });

  return Object.values(weeklyData)
    .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart))
    .slice(-12); // Last 12 weeks
}

/**
 * Calculate monthly trends from daily data
 */
function calculateMonthlyTrends(dailyData) {
  const monthlyData = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        users: 0,
        sessions: 0,
        pageViews: 0,
        bookings: 0,
        revenue: 0
      };
    }
    
    const month = monthlyData[monthKey];
    month.users += day.users;
    month.sessions += day.sessions;
    month.pageViews += day.pageViews;
    month.bookings += day.bookings;
    month.revenue += day.revenue;
  });

  return Object.values(monthlyData)
    .sort((a, b) => new Date(b.month) - new Date(a.month))
    .slice(-12); // Last 12 months
}

/**
 * Generate insights from analytics data
 */
function generateInsights(analyticsData) {
  const insights = [];
  
  if (analyticsData.length === 0) return insights;

  // Calculate growth rates
  const recent = analyticsData.slice(-7); // Last 7 days
  const previous = analyticsData.slice(-14, -7); // Previous 7 days
  
  if (recent.length > 0 && previous.length > 0) {
    const recentUsers = recent.reduce((sum, r) => sum + (r.overview?.totalUsers || 0), 0);
    const previousUsers = previous.reduce((sum, r) => sum + (r.overview?.totalUsers || 0), 0);
    
    const userGrowth = previousUsers > 0 ? ((recentUsers - previousUsers) / previousUsers) * 100 : 0;
    
    if (Math.abs(userGrowth) > 10) {
      insights.push({
        type: 'user_growth',
        title: userGrowth > 0 ? 'Significant User Growth' : 'User Decline',
        description: `User count changed by ${userGrowth.toFixed(1)}% compared to previous period`,
        severity: userGrowth > 0 ? 'positive' : 'negative',
        value: userGrowth
      });
    }

    const recentRevenue = recent.reduce((sum, r) => sum + (r.overview?.totalRevenue || 0), 0);
    const previousRevenue = previous.reduce((sum, r) => sum + (r.overview?.totalRevenue || 0), 0);
    
    const revenueGrowth = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    if (Math.abs(revenueGrowth) > 15) {
      insights.push({
        type: 'revenue_growth',
        title: revenueGrowth > 0 ? 'Revenue Increase' : 'Revenue Decrease',
        description: `Revenue changed by ${revenueGrowth.toFixed(1)}% compared to previous period`,
        severity: revenueGrowth > 0 ? 'positive' : 'negative',
        value: revenueGrowth
      });
    }
  }

  // Analyze conversion rates
  const avgConversionRate = analyticsData.reduce((sum, r) => sum + (r.overview?.conversionRate || 0), 0) / analyticsData.length;
  
  if (avgConversionRate < 2) {
    insights.push({
      type: 'low_conversion',
      title: 'Low Conversion Rate',
      description: `Average conversion rate is ${avgConversionRate.toFixed(2)}%, which is below optimal levels`,
      severity: 'warning',
      value: avgConversionRate
    });
  } else if (avgConversionRate > 8) {
    insights.push({
      type: 'high_conversion',
      title: 'High Conversion Rate',
      description: `Average conversion rate is ${avgConversionRate.toFixed(2)}%, indicating strong performance`,
      severity: 'positive',
      value: avgConversionRate
    });
  }

  // Analyze bounce rates
  const avgBounceRate = analyticsData.reduce((sum, r) => sum + (r.overview?.bounceRate || 0), 0) / analyticsData.length;
  
  if (avgBounceRate > 60) {
    insights.push({
      type: 'high_bounce',
      title: 'High Bounce Rate',
      description: `Average bounce rate is ${avgBounceRate.toFixed(1)}%, which may indicate user experience issues`,
      severity: 'warning',
      value: avgBounceRate
    });
  }

  return insights;
}