import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Share2,
  Heart,
  Bell,
  ArrowRight,
  CheckCircle,
  XCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Shared Alert Page Component
 * Displays a shared price alert to non-logged-in users
 */
const SharedAlertPage = ({ alertData, shareCode }) => {
  const router = useRouter();
  const [currentPrice, setCurrentPrice] = useState(alertData.currentPrice);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Load price history on mount
  useEffect(() => {
    loadPriceHistory();
    
    // Set up price polling
    const interval = setInterval(() => {
      checkForPriceUpdates();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Load price history
  const loadPriceHistory = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from the API
      const mockHistory = generateMockPriceHistory();
      setPriceHistory(mockHistory);
    } catch (error) {
      console.error('Error loading price history:', error);
      setError('Failed to load price history');
    } finally {
      setLoading(false);
    }
  };

  // Generate mock price history
  const generateMockPriceHistory = () => {
    const history = [];
    const now = new Date();
    const basePrice = currentPrice?.amount || 500;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Add some random variation
      const variation = (Math.random() - 0.5) * basePrice * 0.1;
      const price = basePrice + variation;
      
      history.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(price * 100) / 100,
        source: 'api'
      });
    }
    
    return history;
  };

  // Check for price updates
  const checkForPriceUpdates = async () => {
    try {
      // In a real implementation, this would fetch current price from API
      const newPrice = currentPrice.amount * (0.95 + Math.random() * 0.1);
      
      if (Math.abs(newPrice - currentPrice.amount) > currentPrice.amount * 0.02) {
        setCurrentPrice({
          ...currentPrice,
          amount: Math.round(newPrice * 100) / 100
        });
      }
    } catch (error) {
      console.error('Error checking price updates:', error);
    }
  };

  // Handle save alert
  const handleSaveAlert = () => {
    // In a real implementation, this would save to user's account
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Handle subscribe to alerts
  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    try {
      // In a real implementation, this would subscribe to alerts
      setSubscribed(true);
      setEmailError('');
    } catch (error) {
      console.error('Error subscribing to alerts:', error);
      setEmailError('Failed to subscribe. Please try again.');
    }
  };

  // Calculate price trend
  const calculatePriceTrend = () => {
    if (priceHistory.length < 2) return null;
    
    const recent = priceHistory.slice(-7);
    const older = priceHistory.slice(-14, -7);
    
    if (older.length === 0) return null;
    
    const recentAvg = recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.price, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    return {
      direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
      change: Math.abs(change)
    };
  };

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency || 'USD'
    }).format(price.amount || price);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const trend = calculatePriceTrend();
  const isGoodDeal = alertData.savings && alertData.savings.percentage > 10;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">FlightAlerts</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigator.share && navigator.share({
                title: `Flight Deal: ${alertData.route.origin.airportCode} → ${alertData.route.destination.airportCode}`,
                text: `Check out this flight deal: ${formatPrice(currentPrice)}`,
                url: window.location.href
              })}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Alert Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {alertData.route.origin.airportCode} → {alertData.route.destination.airportCode}
              </h1>
              <p className="text-gray-600">
                {alertData.route.origin.city} to {alertData.route.destination.city}
              </p>
            </div>
            
            {isGoodDeal && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                Great Deal
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Price */}
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Current Price</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatPrice(currentPrice)}
              </div>
              {alertData.savings && (
                <div className="text-green-600 font-medium mt-1">
                  Save {alertData.savings.percentage}% (${alertData.savings.amount})
                </div>
              )}
            </div>

            {/* Date */}
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Departure Date</div>
              <div className="text-xl font-semibold text-gray-900 flex items-center justify-center gap-2">
                <Calendar className="w-5 h-5" />
                {formatDate(alertData.departureDate)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {alertData.cabinClass}
              </div>
            </div>

            {/* Trend */}
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Price Trend</div>
              <div className={`text-xl font-semibold flex items-center justify-center gap-2 ${
                trend?.direction === 'up' ? 'text-red-600' : 
                trend?.direction === 'down' ? 'text-green-600' : 
                'text-gray-600'
              }`}>
                {trend?.direction === 'up' && <TrendingUp className="w-5 h-5" />}
                {trend?.direction === 'down' && <TrendingDown className="w-5 h-5" />}
                {trend?.direction === 'stable' && <div className="w-5 h-5 rounded-full bg-gray-400" />}
                {trend ? `${trend.change.toFixed(1)}% ${trend.direction}` : 'Analyzing...'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Last 7 days
              </div>
            </div>
          </div>

          {/* Alert Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">About this alert</p>
                <p>
                  This price alert was shared by another traveler and expires on{' '}
                  {formatDate(alertData.expiresAt)}. 
                  {alertData.savings && ` The current price is ${alertData.savings.percentage}% lower than when the alert was created.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Price History Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Price History</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600">Loading price history...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <XCircle className="w-12 h-12 mx-auto mb-3" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="h-64 relative">
              {/* Simple price chart */}
              <div className="absolute inset-0 flex items-end justify-between gap-1">
                {priceHistory.slice(-30).map((point, index) => {
                  const maxPrice = Math.max(...priceHistory.map(p => p.price));
                  const minPrice = Math.min(...priceHistory.map(p => p.price));
                  const height = ((point.price - minPrice) / (maxPrice - minPrice)) * 100;
                  
                  return (
                    <div
                      key={index}
                      className="flex-1 bg-blue-500 rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${formatDate(point.date)}: ${formatPrice({ amount: point.price, currency: 'USD' })}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>{formatDate(priceHistory[0]?.date)}</span>
            <span>30 days</span>
            <span>{formatDate(priceHistory[priceHistory.length - 1]?.date)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Create Similar Alert */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Create Similar Alert
            </h3>
            <p className="text-gray-600 mb-4">
              Get notified when prices drop for this route or similar flights.
            </p>
            <Link
              href="/login?redirect=/alerts/create"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Alert
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Subscribe for Updates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Subscribe for Updates
            </h3>
            <p className="text-gray-600 mb-4">
              Get email updates about this flight and similar deals.
            </p>
            
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span>Subscribed successfully!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {emailError && (
                  <p className="text-sm text-red-600">{emailError}</p>
                )}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Subscribe
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Route</span>
                <span className="font-medium">
                  {alertData.route.origin.airportCode} → {alertData.route.destination.airportCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Departure</span>
                <span className="font-medium">{formatDate(alertData.departureDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Class</span>
                <span className="font-medium capitalize">{alertData.cabinClass}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Passengers</span>
                <span className="font-medium">
                  {alertData.passengers?.adults || 1} Adult
                  {alertData.passengers?.children > 0 && 
                    `, ${alertData.passengers.children} Child${alertData.passengers.children > 1 ? 'ren' : ''}`
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Alert Expires</span>
                <span className="font-medium">{formatDate(alertData.expiresAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Share Code</span>
                <span className="font-medium font-mono text-sm">{shareCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">
            Never Miss a Flight Deal Again
          </h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Join thousands of travelers who save money with our price alerts. 
            Set up custom alerts for your favorite routes and get notified when prices drop.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Start Saving Today
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Plane className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">FlightAlerts</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <Link href="/about" className="hover:text-gray-900">About</Link>
              <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-900">Terms</Link>
              <Link href="/contact" className="hover:text-gray-900">Contact</Link>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>&copy; {new Date().getFullYear()} FlightAlerts. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SharedAlertPage;