import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Link2, 
  Mail, 
  WhatsApp, 
  Copy, 
  Check,
  X,
  MessageCircle,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Plane,
  AlertCircle
} from 'lucide-react';

/**
 * Social Sharing Component
 * Allows users to share price alerts with others
 */
const SocialSharing = ({ 
  alert, 
  priceData, 
  onShare, 
  className = '',
  showAnalytics = false 
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [shareStats, setShareStats] = useState(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  // Generate share data when modal opens
  useEffect(() => {
    if (isShareModalOpen && alert) {
      generateShareData();
    }
  }, [isShareModalOpen, alert]);

  // Generate shareable data
  const generateShareData = async () => {
    setIsGeneratingShare(true);
    try {
      const data = {
        alertId: alert._id,
        shareCode: alert.shareCode || generateShareCode(),
        route: {
          origin: alert.searchCriteria.origin,
          destination: alert.searchCriteria.destination
        },
        currentPrice: priceData?.currentPrice || alert.currentBestPrice,
        priceChange: priceData?.priceChange || alert.priceChange,
        departureDate: alert.searchCriteria.departureDate,
        cabinClass: alert.searchCriteria.cabinClass,
        passengers: alert.searchCriteria.passengers,
        createdAt: alert.createdAt,
        expiresAt: alert.expiresAt,
        savings: calculateSavings(priceData || alert)
      };

      setShareData(data);
      
      // Generate share URL
      const url = `${window.location.origin}/shared-alerts/${data.shareCode}`;
      setShareUrl(url);
      
      // Get share stats if enabled
      if (showAnalytics) {
        const stats = await getShareStats(alert._id);
        setShareStats(stats);
      }
    } catch (error) {
      console.error('Error generating share data:', error);
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Generate share code
  const generateShareCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Calculate savings
  const calculateSavings = (data) => {
    if (!data.priceChange?.amount) return null;
    
    return {
      amount: data.priceChange.amount,
      percentage: data.priceChange.percentage,
      currency: data.currentPrice?.currency || 'USD'
    };
  };

  // Get share statistics
  const getShareStats = async (alertId) => {
    // In a real implementation, this would fetch from the database
    return {
      totalShares: Math.floor(Math.random() * 50) + 5,
      totalViews: Math.floor(Math.random() * 200) + 20,
      totalClicks: Math.floor(Math.random() * 100) + 10,
      conversionRate: Math.floor(Math.random() * 30) + 5,
      platforms: {
        facebook: Math.floor(Math.random() * 20) + 2,
        twitter: Math.floor(Math.random() * 15) + 1,
        whatsapp: Math.floor(Math.random() * 10) + 1,
        email: Math.floor(Math.random() * 8) + 1,
        direct: Math.floor(Math.random() * 5) + 1
      }
    };
  };

  // Handle share action
  const handleShare = async (platform) => {
    try {
      if (!shareData) return;

      const shareText = generateShareText(platform);
      let shareUrl = '';

      switch (platform) {
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}/shared-alerts/${shareData.shareCode}`;
          break;
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.origin)}/shared-alerts/${shareData.shareCode}`;
          break;
        case 'whatsapp':
          shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + window.location.origin + '/shared-alerts/' + shareData.shareCode)}`;
          break;
        case 'email':
          shareUrl = `mailto:?subject=${encodeURIComponent('Check out this flight deal!')}&body=${encodeURIComponent(shareText + '\n\n' + window.location.origin + '/shared-alerts/' + shareData.shareCode)}`;
          break;
        case 'copy':
          await navigator.clipboard.writeText(shareText + '\n\n' + window.location.origin + '/shared-alerts/' + shareData.shareCode);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
          return;
        default:
          return;
      }

      // Open share dialog
      window.open(shareUrl, '_blank', 'width=600,height=400');

      // Track share
      if (onShare) {
        await onShare(alert._id, platform, shareData);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Generate share text for different platforms
  const generateShareText = (platform) => {
    const route = `${shareData.route.origin.airportCode} → ${shareData.route.destination.airportCode}`;
    const price = shareData.currentPrice ? 
      `$${shareData.currentPrice.amount.toFixed(2)}` : 'Great price';
    const savings = shareData.savings ? 
      `Save $${shareData.savings.amount.toFixed(2)} (${shareData.savings.percentage}%)` : '';

    let text = '';
    
    switch (platform) {
      case 'facebook':
        text = `🛫 Flight Deal Alert! 🛫\n\n${route} on ${new Date(shareData.departureDate).toLocaleDateString()}\nCurrent price: ${price}\n${savings ? savings + '\n' : ''}Check out this deal before it's gone!`;
        break;
      case 'twitter':
        text = `🛫 Flight Deal: ${route} - ${price}${savings ? ' (Save ' + savings + ')' : ''} - ${new Date(shareData.departureDate).toLocaleDateString()}`;
        break;
      case 'whatsapp':
        text = `Hey! I found a great flight deal:\n\n${route}\nDate: ${new Date(shareData.departureDate).toLocaleDateString()}\nPrice: ${price}\n${savings ? savings + '\n' : ''}Check it out:`;
        break;
      case 'email':
        text = `Hi,\n\nI wanted to share this great flight deal I found:\n\nRoute: ${route}\nDate: ${new Date(shareData.departureDate).toLocaleDateString()}\nClass: ${shareData.cabinClass}\n${shareData.passengers ? `Passengers: ${shareData.passengers.adults} adult${shareData.passengers.adults > 1 ? 's' : ''}` : ''}\n\nCurrent Price: ${price}\n${savings ? 'Savings: ' + savings + '\n' : ''}\n\nThis alert expires on ${new Date(shareData.expiresAt).toLocaleDateString()}, so check it out soon!`;
        break;
      default:
        text = `Flight Deal: ${route} - ${price} on ${new Date(shareData.departureDate).toLocaleDateString()}${savings ? ' (Save ' + savings + ')' : ''}`;
    }

    return text;
  };

  // Copy share URL to clipboard
  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Error copying URL:', error);
    }
  };

  if (!alert) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Share Button */}
      <button
        onClick={() => setIsShareModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share Alert
      </button>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Share Price Alert</h2>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {isGeneratingShare ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-gray-600">Generating share link...</span>
                </div>
              ) : shareData ? (
                <>
                  {/* Alert Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Plane className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">
                        {shareData.route.origin.airportCode} → {shareData.route.destination.airportCode}
                      </h3>
                    </div>
                    <div className="space-y-1 text-sm text-blue-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(shareData.departureDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          {shareData.currentPrice ? 
                            `$${shareData.currentPrice.amount.toFixed(2)} ${shareData.currentPrice.currency}` : 
                            'Great price'
                          }
                        </span>
                        {shareData.savings && (
                          <span className="text-green-600 font-medium">
                            (Save ${shareData.savings.amount.toFixed(2)} - {shareData.savings.percentage}%)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Expires {new Date(shareData.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Share Options */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Share via</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleShare('facebook')}
                        className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Facebook className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium">Facebook</span>
                      </button>
                      <button
                        onClick={() => handleShare('twitter')}
                        className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Twitter className="w-5 h-5 text-sky-500" />
                        <span className="text-sm font-medium">Twitter</span>
                      </button>
                      <button
                        onClick={() => handleShare('whatsapp')}
                        className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <WhatsApp className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium">WhatsApp</span>
                      </button>
                      <button
                        onClick={() => handleShare('email')}
                        className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Mail className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-medium">Email</span>
                      </button>
                    </div>
                  </div>

                  {/* Share Link */}
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-900 mb-2">Share Link</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                      />
                      <button
                        onClick={copyShareUrl}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <p className="mt-1 text-sm text-green-600">Link copied to clipboard!</p>
                    )}
                  </div>

                  {/* Share Statistics */}
                  {showAnalytics && shareStats && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-3">Share Statistics</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">Total Shares</span>
                          </div>
                          <div className="text-xl font-semibold text-gray-900">
                            {shareStats.totalShares}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm">Total Views</span>
                          </div>
                          <div className="text-xl font-semibold text-gray-900">
                            {shareStats.totalViews}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Shares by Platform</h4>
                        {Object.entries(shareStats.platforms).map(([platform, count]) => (
                          <div key={platform} className="flex items-center justify-between text-sm">
                            <span className="capitalize text-gray-600">{platform}</span>
                            <span className="font-medium text-gray-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Unable to generate share link</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialSharing;