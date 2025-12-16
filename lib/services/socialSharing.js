import "server-only";
import { 
  getOneDoc, 
  updateOneDoc 
} from "@/lib/db/operations";
import { PriceAlert } from "@/lib/db/models";
import { formatPrice, generateAlertSummary } from "@/lib/utils/priceAlertUtils";

/**
 * Social Sharing Service
 * Handles social sharing of price alerts and deals
 */
export class SocialSharingService {
  constructor(options = {}) {
    this.options = {
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://golobe-travel-agency.vercel.app',
      enableTracking: true,
      shareExpiry: 30, // days
      maxSharesPerAlert: 10,
      ...options
    };
  }

  /**
   * Generate shareable link for price alert
   * @param {string} alertId - Price alert ID
   * @param {Object} alert - Price alert object
   * @returns {Object} Share link data
   */
  async generateShareLink(alertId, alert) {
    try {
      // Generate or retrieve existing share code
      let shareCode = alert.sharing?.shareCode;
      
      if (!shareCode) {
        shareCode = await this.generateShareCode();
        
        // Update alert with share code
        await updateOneDoc(
          "PriceAlert",
          { _id: alertId },
          {
            $set: {
              "sharing.enabled": true,
              "sharing.shareCode": shareCode,
              "sharing.sharedAt": new Date(),
            }
          }
        );
      }

      const shareUrl = `${this.options.baseUrl}/shared-alerts/${shareCode}`;
      
      return {
        shareCode,
        shareUrl,
        shortUrl: await this.generateShortUrl(shareUrl),
        expiresAt: new Date(Date.now() + this.options.shareExpiry * 24 * 60 * 60 * 1000),
        trackingParams: this.generateTrackingParams(alertId, shareCode),
      };
    } catch (error) {
      console.error('Error generating share link:', error);
      throw error;
    }
  }

  /**
   * Generate unique share code
   * @returns {string} Unique share code
   */
  async generateShareCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Generate short URL for sharing
   * @param {string} longUrl - Original URL
   * @returns {string} Shortened URL
   */
  async generateShortUrl(longUrl) {
    // This would integrate with URL shortening service like bit.ly
    // For now, return a mock short URL
    const hash = this.simpleHash(longUrl);
    return `${this.options.baseUrl}/s/${hash}`;
  }

  /**
   * Simple hash function for URL shortening
   * @param {string} str - String to hash
   * @returns {string} Hash
   */
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate tracking parameters for shared links
   * @param {string} alertId - Price alert ID
   * @param {string} shareCode - Share code
   * @returns {string} Tracking parameters
   */
  generateTrackingParams(alertId, shareCode) {
    if (!this.options.enableTracking) {
      return '';
    }

    const params = new URLSearchParams({
      utm_source: 'price_alert_share',
      utm_medium: 'social',
      utm_campaign: 'price_drops',
      utm_content: shareCode,
      alert_id: alertId,
      ref: 'price_alert'
    });

    return `?${params.toString()}`;
  }

  /**
   * Share price alert on social media
   * @param {Object} alert - Price alert object
   * @param {Array} platforms - Social platforms to share on
   * @returns {Object} Sharing results
   */
  async shareOnSocialMedia(alert, platforms = ['facebook', 'twitter', 'linkedin']) {
    try {
      const shareData = await this.generateShareLink(alert._id, alert);
      const results = {};

      for (const platform of platforms) {
        results[platform] = await this.shareOnPlatform(platform, shareData, alert);
      }

      // Update share count
      await this.updateShareCount(alert._id);

      return results;
    } catch (error) {
      console.error('Error sharing on social media:', error);
      throw error;
    }
  }

  /**
   * Share on specific social platform
   * @param {string} platform - Platform name
   * @param {Object} shareData - Share data
   * @param {Object} alert - Price alert object
   * @returns {Object} Share result
   */
  async shareOnPlatform(platform, shareData, alert) {
    try {
      const shareContent = this.generateShareContent(platform, shareData, alert);
      
      switch (platform) {
        case 'facebook':
          return await this.shareOnFacebook(shareContent);
        case 'twitter':
          return await this.shareOnTwitter(shareContent);
        case 'linkedin':
          return await this.shareOnLinkedIn(shareContent);
        case 'whatsapp':
          return await this.shareOnWhatsApp(shareContent);
        case 'email':
          return await this.shareViaEmail(shareContent);
        default:
          return { success: false, error: 'Unsupported platform' };
      }
    } catch (error) {
      console.error(`Error sharing on ${platform}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate share content for different platforms
   * @param {string} platform - Platform name
   * @param {Object} shareData - Share data
   * @param {Object} alert - Price alert object
   * @returns {Object} Platform-specific content
   */
  generateShareContent(platform, shareData, alert) {
    const baseContent = {
      title: `Price Drop Alert: ${alert.searchCriteria.origin.airportCode} → ${alert.searchCriteria.destination.airportCode}`,
      description: `Set up price alerts for ${alert.searchCriteria.origin.airportCode} to ${alert.searchCriteria.destination.airportCode}. Current best price: ${formatPrice(alert.currentBestPrice?.amount || 0, alert.currentBestPrice?.currency || 'USD')}`,
      url: shareData.shareUrl,
      imageUrl: `${this.options.baseUrl}/images/price-alert-share.png`,
      hashtags: ['#PriceAlert', '#FlightDeals', '#TravelAlerts', '#GolobeTravel'],
    };

    switch (platform) {
      case 'facebook':
        return {
          ...baseContent,
          text: `Check out this price drop alert I found: ${baseContent.title}. ${baseContent.description}`,
        };

      case 'twitter':
        return {
          ...baseContent,
          text: `${baseContent.title} - ${baseContent.description} ${baseContent.url} ${baseContent.hashtags.slice(0, 2).join(' ')}`,
          characterLimit: 280,
        };

      case 'linkedin':
        return {
          ...baseContent,
          text: `I found a great price drop alert for flights from ${alert.searchCriteria.origin.airportCode} to ${alert.searchCriteria.destination.airportCode}. ${baseContent.description}`,
        };

      case 'whatsapp':
        return {
          ...baseContent,
          text: `Price Drop Alert: ${baseContent.title}\n\n${baseContent.description}\n\n${baseContent.url}`,
        };

      case 'email':
        return {
          ...baseContent,
          subject: baseContent.title,
          text: `Hi,\n\nI thought you might be interested in this price drop alert I found:\n\n${baseContent.description}\n\n${baseContent.url}\n\nBest regards`,
        };

      default:
        return baseContent;
    }
  }

  /**
   * Share on Facebook
   * @param {Object} content - Share content
   * @returns {Object} Share result
   */
  async shareOnFacebook(content) {
    try {
      // This would integrate with Facebook API
      console.log('Sharing on Facebook:', content);
      
      return {
        success: true,
        platform: 'facebook',
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(content.url)}`,
        shareId: this.generateShareId(),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Share on Twitter
   * @param {Object} content - Share content
   * @returns {Object} Share result
   */
  async shareOnTwitter(content) {
    try {
      // This would integrate with Twitter API
      console.log('Sharing on Twitter:', content);
      
      const tweetText = content.text.length > content.characterLimit ? 
        content.text.substring(0, content.characterLimit - 3) + '...' :
        content.text;

      return {
        success: true,
        platform: 'twitter',
        url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
        shareId: this.generateShareId(),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Share on LinkedIn
   * @param {Object} content - Share content
   * @returns {Object} Share result
   */
  async shareOnLinkedIn(content) {
    try {
      // This would integrate with LinkedIn API
      console.log('Sharing on LinkedIn:', content);
      
      return {
        success: true,
        platform: 'linkedin',
        url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(content.url)}`,
        shareId: this.generateShareId(),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Share on WhatsApp
   * @param {Object} content - Share content
   * @returns {Object} Share result
   */
  async shareOnWhatsApp(content) {
    try {
      // This would integrate with WhatsApp API
      console.log('Sharing on WhatsApp:', content);
      
      return {
        success: true,
        platform: 'whatsapp',
        url: `https://wa.me/?text=${encodeURIComponent(content.text)}`,
        shareId: this.generateShareId(),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Share via email
   * @param {Object} content - Share content
   * @returns {Object} Share result
   */
  async shareViaEmail(content) {
    try {
      // This would integrate with email service
      console.log('Sharing via email:', content);
      
      return {
        success: true,
        platform: 'email',
        shareId: this.generateShareId(),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate unique share ID
   * @returns {string} Share ID
   */
  generateShareId() {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update share count for alert
   * @param {string} alertId - Price alert ID
   */
  async updateShareCount(alertId) {
    try {
      await updateOneDoc(
        "PriceAlert",
        { _id: alertId },
        {
          $inc: { "sharing.shareCount": 1 }
        }
      );
    } catch (error) {
      console.error('Error updating share count:', error);
    }
  }

  /**
   * Get shared alert by share code
   * @param {string} shareCode - Share code
   * @returns {Object} Shared alert data
   */
  async getSharedAlert(shareCode) {
    try {
      const alert = await getOneDoc("PriceAlert", {
        "sharing.shareCode": shareCode,
        "sharing.enabled": true,
        "expiresAt": { $gt: new Date() }
      });

      if (!alert) {
        return { success: false, error: 'Shared alert not found or expired' };
      }

      // Increment view count
      await updateOneDoc(
        "PriceAlert",
        { _id: alert._id },
        {
          $inc: { "sharing.viewCount": 1 }
        }
      );

      return {
        success: true,
        data: {
          ...alert,
          shareUrl: `${this.options.baseUrl}/shared-alerts/${shareCode}`,
        },
      };
    } catch (error) {
      console.error('Error getting shared alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sharing analytics for alert
   * @param {string} alertId - Price alert ID
   * @returns {Object} Sharing analytics
   */
  async getSharingAnalytics(alertId) {
    try {
      const alert = await getOneDoc("PriceAlert", { _id: alertId });
      
      if (!alert) {
        return { success: false, error: 'Alert not found' };
      }

      // This would integrate with analytics service
      // For now, return mock analytics data
      const mockAnalytics = {
        totalShares: alert.sharing?.shareCount || 0,
        totalViews: alert.sharing?.viewCount || 0,
        shareToViewRatio: alert.sharing?.shareCount > 0 ? 
          ((alert.sharing?.viewCount || 0) / alert.sharing.shareCount).toFixed(2) : 0,
        platforms: {
          facebook: Math.floor(Math.random() * 5),
          twitter: Math.floor(Math.random() * 8),
          linkedin: Math.floor(Math.random() * 3),
          whatsapp: Math.floor(Math.random() * 12),
          email: Math.floor(Math.random() * 2),
        },
        topReferringSources: [
          { source: 'direct', count: Math.floor(Math.random() * 10) + 5 },
          { source: 'facebook', count: Math.floor(Math.random() * 8) + 2 },
          { source: 'twitter', count: Math.floor(Math.random() * 6) + 1 },
        ],
        conversionRate: 0.15 + (Math.random() * 0.1), // 15-25% conversion rate
        averageSharesPerAlert: 2.3 + (Math.random() * 0.7),
      };

      return {
        success: true,
        data: mockAnalytics,
      };
    } catch (error) {
      console.error('Error getting sharing analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create viral sharing campaign
   * @param {Object} alert - Price alert object
   * @param {Object} campaignConfig - Campaign configuration
   * @returns {Object} Campaign result
   */
  async createViralCampaign(alert, campaignConfig) {
    try {
      const shareData = await this.generateShareLink(alert._id, alert);
      
      const campaign = {
        id: this.generateCampaignId(),
        alertId: alert._id,
        shareCode: shareData.shareCode,
        shareUrl: shareData.shareUrl,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (campaignConfig.duration || 7) * 24 * 60 * 60 * 1000),
        targetShares: campaignConfig.targetShares || 100,
        currentShares: 0,
        status: 'active',
        incentives: campaignConfig.incentives || {
          type: 'discount',
          value: 5, // 5% discount for sharing
          maxDiscount: 25, // Maximum 25% discount
        },
        socialProof: {
          totalShares: 0,
          uniqueSharers: new Set(),
          conversionRate: 0,
        },
      };

      // Store campaign (would save to database)
      console.log('Created viral campaign:', campaign);

      return {
        success: true,
        data: campaign,
      };
    } catch (error) {
      console.error('Error creating viral campaign:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate unique campaign ID
   * @returns {string} Campaign ID
   */
  generateCampaignId() {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update viral campaign metrics
   * @param {string} campaignId - Campaign ID
   * @param {Object} metrics - Campaign metrics
   */
  async updateViralCampaign(campaignId, metrics) {
    try {
      // This would update campaign in database
      console.log('Updating viral campaign:', campaignId, metrics);
      
      return {
        success: true,
        campaignId,
        metrics,
      };
    } catch (error) {
      console.error('Error updating viral campaign:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
let socialSharingInstance = null;

/**
 * Get or create social sharing service instance
 * @param {Object} options - Configuration options
 * @returns {SocialSharingService} Social sharing service instance
 */
export function getSocialSharingService(options) {
  if (!socialSharingInstance) {
    socialSharingInstance = new SocialSharingService(options);
  }
  return socialSharingInstance;
}

export { SocialSharingService };