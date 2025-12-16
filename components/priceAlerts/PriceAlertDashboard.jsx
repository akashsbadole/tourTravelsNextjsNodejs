import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Bell, 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

/**
 * Price Alert Dashboard Component
 * Displays comprehensive dashboard with analytics, charts, and alert history
 */
export default function PriceAlertDashboard({ userId, className = "" }) {
  const [timeframe, setTimeframe] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Timeframe options
  const timeframeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ];

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/price-alerts/analytics?timeframe=${timeframe}&type=overview`);
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError('Error loading dashboard data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch detailed alert history
  const fetchAlertHistory = async () => {
    try {
      const response = await fetch(`/api/price-alerts/history?timeframe=${timeframe}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data.alerts || [];
      }
      return [];
    } catch (err) {
      console.error('Alert history fetch error:', err);
      return [];
    }
  };

  // Load data on component mount and timeframe change
  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Get trend icon
  const getTrendIcon = (trend, size = 16) => {
    if (trend === 'up' || trend === 'increasing') {
      return <TrendingUp size={size} className="text-green-600" />;
    } else if (trend === 'down' || trend === 'decreasing') {
      return <TrendingDown size={size} className="text-red-600" />;
    }
    return <Minus size={size} className="text-gray-500" />;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'triggered':
        return <Bell className="h-4 w-4 text-blue-600" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'paused':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Export data
  const handleExport = async (format) => {
    try {
      const response = await fetch(`/api/price-alerts/analytics?timeframe=${timeframe}&format=${format}`);
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `price-alerts-${timeframe}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json();
        const dataStr = JSON.stringify(result.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `price-alerts-${timeframe}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Refresh dashboard
  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Price Alert Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Timeframe Selector */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {timeframeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Export Options */}
            <div className="relative group">
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <Download className="h-5 w-5" />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleExport('json')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Export as CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mr-3" />
            <span className="text-gray-600">Loading dashboard data...</span>
          </div>
        </div>
      ) : dashboardData ? (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Alerts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <h3 className="text-sm font-medium text-gray-600">Total Alerts</h3>
                </div>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {timeframeOptions.find(opt => opt.value === timeframe)?.label || 'Selected Period'}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData.alerts?.total || 0}
              </div>
              <div className="mt-2 flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">
                    Active: {dashboardData.alerts?.active || 0}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">
                    Triggered: {dashboardData.alerts?.triggered || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Savings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <h3 className="text-sm font-medium text-gray-600">Total Savings</h3>
                </div>
                {getTrendIcon('up')}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardData.savings?.totalSavings || 0)}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Average: {formatCurrency(dashboardData.savings?.averageSavings || 0)} per alert
              </div>
            </div>

            {/* Notification Success Rate */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <h3 className="text-sm font-medium text-gray-600">Success Rate</h3>
                </div>
                {getTrendIcon(dashboardData.notifications?.successRate > 90 ? 'up' : 'stable')}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {(dashboardData.notifications?.successRate || 0).toFixed(1)}%
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {dashboardData.notifications?.sent || 0} of {dashboardData.notifications?.total || 0} delivered
              </div>
            </div>

            {/* Price Changes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <h3 className="text-sm font-medium text-gray-600">Price Changes</h3>
                </div>
                {getTrendIcon(dashboardData.priceChanges?.totalDrops > dashboardData.priceChanges?.totalIncreases ? 'down' : 'up')}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData.priceChanges?.totalDrops || 0}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Avg drop: {formatPercentage(dashboardData.priceChanges?.averageDrop || 0)}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Price Trend Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Trends</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Price trend chart</p>
                  <p className="text-sm text-gray-500 mt-1">Interactive chart visualization</p>
                </div>
              </div>
            </div>

            {/* Alert Performance Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Performance</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Performance metrics</p>
                  <p className="text-sm text-gray-500 mt-1">Success rates and triggers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Alerts Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
                <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-800">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">View All</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Triggered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Savings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Sample data - would be fetched from API */}
                  {[
                    {
                      id: '1',
                      route: 'NYC → LON',
                      currentPrice: { amount: 450, currency: 'USD' },
                      status: 'active',
                      lastTriggered: null,
                      savings: { amount: 0, currency: 'USD' },
                    },
                    {
                      id: '2',
                      route: 'LAX → NYC',
                      currentPrice: { amount: 280, currency: 'USD' },
                      status: 'triggered',
                      lastTriggered: '2024-01-10T14:30:00Z',
                      savings: { amount: 75, currency: 'USD' },
                    },
                    {
                      id: '3',
                      route: 'CHI → MIA',
                      currentPrice: { amount: 320, currency: 'USD' },
                      status: 'expired',
                      lastTriggered: '2024-01-05T09:15:00Z',
                      savings: { amount: 45, currency: 'USD' },
                    },
                  ].map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {alert.route}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(alert.currentPrice.amount, alert.currentPrice.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(alert.status)}
                          <span className="text-sm text-gray-900 capitalize">{alert.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {alert.lastTriggered ? new Date(alert.lastTriggered).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {alert.savings.amount > 0 ? (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(alert.savings.amount, alert.savings.currency)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedAlert(alert);
                              setShowDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Best Performing Route */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Best Route</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Route:</span>
                  <span className="text-sm font-medium text-gray-900">NYC → LON</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Savings:</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(125)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Alerts:</span>
                  <span className="text-sm font-medium text-gray-900">3</span>
                </div>
              </div>
            </div>

            {/* Most Active Alert */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Active</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Route:</span>
                  <span className="text-sm font-medium text-gray-900">LAX → NYC</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Triggers:</span>
                  <span className="text-sm font-medium text-blue-600">7</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="text-sm font-medium text-green-600">Active</span>
                </div>
              </div>
            </div>

            {/* Price Drop Leader */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Biggest Drop</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Route:</span>
                  <span className="text-sm font-medium text-gray-900">CHI → MIA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Drop:</span>
                  <span className="text-sm font-medium text-red-600">
                    {formatPercentage(-18.5)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Savings:</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(85)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Alert Details Modal */}
      {showDetails && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Alert Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="space-y-6">
                {/* Route Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Route Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Route:</span>
                      <p className="text-sm font-medium text-gray-900">{selectedAlert.route}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Current Price:</span>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedAlert.currentPrice.amount, selectedAlert.currentPrice.currency)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon(selectedAlert.status)}
                        <span className="text-sm font-medium text-gray-900 capitalize">{selectedAlert.status}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Last Triggered:</span>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedAlert.lastTriggered ? new Date(selectedAlert.lastTriggered).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Total Triggers:</span>
                      <p className="text-sm font-medium text-gray-900">5</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Average Check Time:</span>
                      <p className="text-sm font-medium text-gray-900">2.3s</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Success Rate:</span>
                      <p className="text-sm font-medium text-gray-900">94%</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Total Savings:</span>
                      <p className="text-sm font-medium text-green-600">
                        {formatCurrency(selectedAlert.savings.amount, selectedAlert.savings.currency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {[
                      { date: '2024-01-10T14:30:00Z', action: 'Price drop detected', price: '$275' },
                      { date: '2024-01-08T09:15:00Z', action: 'Price check completed', price: '$285' },
                      { date: '2024-01-05T16:45:00Z', action: 'Alert triggered', price: '$290' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.date).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{activity.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}