/**
 * Social Login Analytics Service
 * Tracks and analyzes social authentication patterns
 */

class SocialLoginAnalytics {
  constructor() {
    this.events = [];
    this.providers = ['google', 'facebook', 'apple', 'twitter', 'linkedin', 'instagram'];
  }

  /**
   * Track social login event
   * @param {string} provider - Social provider name
   * @param {string} userId - User ID
   * @param {boolean} isNewUser - Whether this is a new user
   * @param {Object} metadata - Additional metadata
   */
  trackSocialLogin(provider, userId, isNewUser = false, metadata = {}) {
    const event = {
      type: 'social_login',
      provider,
      userId,
      isNewUser,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      ip: metadata.ip || null,
      sessionId: metadata.sessionId || null,
      referrer: metadata.referrer || null,
      success: metadata.success !== false,
      error: metadata.error || null
    };

    this.events.push(event);
    this.persistEvent(event);
    this.updateProviderStats(provider, isNewUser);
    
    console.log('Social login tracked:', event);
    return event;
  }

  /**
   * Track social account linking/unlinking
   * @param {string} provider - Social provider name
   * @param {string} userId - User ID
   * @param {string} action - 'link' or 'unlink'
   * @param {Object} metadata - Additional metadata
   */
  trackAccountLinking(provider, userId, action, metadata = {}) {
    const event = {
      type: 'account_linking',
      provider,
      userId,
      action,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      success: metadata.success !== false,
      error: metadata.error || null
    };

    this.events.push(event);
    this.persistEvent(event);
    
    console.log('Account linking tracked:', event);
    return event;
  }

  /**
   * Track social login errors
   * @param {string} provider - Social provider name
   * @param {string} error - Error message
   * @param {Object} metadata - Additional metadata
   */
  trackSocialLoginError(provider, error, metadata = {}) {
    const event = {
      type: 'social_login_error',
      provider,
      error,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      ip: metadata.ip || null,
      referrer: metadata.referrer || null,
      errorCode: metadata.errorCode || null,
      errorDetails: metadata.errorDetails || null
    };

    this.events.push(event);
    this.persistEvent(event);
    this.updateErrorStats(provider, error);
    
    console.error('Social login error tracked:', event);
    return event;
  }

  /**
   * Get social login statistics
   * @param {Object} filters - Filters for the statistics
   * @returns {Object} Social login statistics
   */
  getSocialLoginStats(filters = {}) {
    const { startDate, endDate, provider } = filters;
    
    let filteredEvents = this.events.filter(event => 
      event.type === 'social_login' || event.type === 'social_login_error'
    );

    if (startDate) {
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) >= new Date(startDate)
      );
    }

    if (endDate) {
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) <= new Date(endDate)
      );
    }

    if (provider) {
      filteredEvents = filteredEvents.filter(event => 
        event.provider === provider
      );
    }

    const stats = {
      totalLogins: filteredEvents.filter(e => e.type === 'social_login').length,
      totalErrors: filteredEvents.filter(e => e.type === 'social_login_error').length,
      successRate: 0,
      providerBreakdown: {},
      newUsers: 0,
      returningUsers: 0,
      averageTimeToLogin: 0,
      mostPopularProvider: null,
      errorBreakdown: {}
    };

    // Calculate provider breakdown
    this.providers.forEach(p => {
      const providerEvents = filteredEvents.filter(e => e.provider === p);
      const providerLogins = providerEvents.filter(e => e.type === 'social_login');
      const providerErrors = providerEvents.filter(e => e.type === 'social_login_error');
      
      stats.providerBreakdown[p] = {
        logins: providerLogins.length,
        errors: providerErrors.length,
        successRate: providerLogins.length > 0 ? 
          (providerLogins.filter(l => l.success).length / providerLogins.length) * 100 : 0,
        newUsers: providerLogins.filter(l => l.isNewUser).length
      };
    });

    // Calculate overall stats
    stats.totalLogins = filteredEvents.filter(e => e.type === 'social_login').length;
    stats.totalErrors = filteredEvents.filter(e => e.type === 'social_login_error').length;
    stats.successRate = stats.totalLogins > 0 ? 
      ((stats.totalLogins - stats.totalErrors) / stats.totalLogins) * 100 : 0;
    stats.newUsers = filteredEvents.filter(e => e.type === 'social_login' && e.isNewUser).length;
    stats.returningUsers = stats.totalLogins - stats.newUsers;

    // Find most popular provider
    let maxLogins = 0;
    this.providers.forEach(p => {
      if (stats.providerBreakdown[p] && stats.providerBreakdown[p].logins > maxLogins) {
        maxLogins = stats.providerBreakdown[p].logins;
        stats.mostPopularProvider = p;
      }
    });

    // Calculate error breakdown
    const errorEvents = filteredEvents.filter(e => e.type === 'social_login_error');
    errorEvents.forEach(event => {
      if (!stats.errorBreakdown[event.provider]) {
        stats.errorBreakdown[event.provider] = {};
      }
      if (!stats.errorBreakdown[event.provider][event.error]) {
        stats.errorBreakdown[event.provider][event.error] = 0;
      }
      stats.errorBreakdown[event.provider][event.error]++;
    });

    return stats;
  }

  /**
   * Get provider usage trends
   * @param {number} days - Number of days to analyze
   * @returns {Object} Provider usage trends
   */
  getProviderUsageTrends(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const recentEvents = this.events.filter(event => 
      new Date(event.timestamp) >= startDate &&
      (event.type === 'social_login' || event.type === 'social_login_error')
    );

    const trends = {};
    this.providers.forEach(provider => {
      const providerEvents = recentEvents.filter(e => e.provider === provider);
      const dailyUsage = {};
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        dailyUsage[dateStr] = providerEvents.filter(e => 
          e.timestamp.startsWith(dateStr) && e.type === 'social_login'
        ).length;
      }
      
      trends[provider] = {
        daily: dailyUsage,
        total: providerEvents.filter(e => e.type === 'social_login').length,
        average: Object.values(dailyUsage).reduce((a, b) => a + b, 0) / days
      };
    });

    return trends;
  }

  /**
   * Get conversion funnel data
   * @returns {Object} Conversion funnel data
   */
  getConversionFunnel() {
    const socialLoginEvents = this.events.filter(e => e.type === 'social_login');
    
    const funnel = {
      initiated: socialLoginEvents.length,
      completed: socialLoginEvents.filter(e => e.success).length,
      failed: socialLoginEvents.filter(e => !e.success).length,
      newUserCompleted: socialLoginEvents.filter(e => e.success && e.isNewUser).length,
      returningUserCompleted: socialLoginEvents.filter(e => e.success && !e.isNewUser).length
    };

    funnel.completionRate = funnel.initiated > 0 ? 
      (funnel.completed / funnel.initiated) * 100 : 0;
    funnel.newUserConversionRate = funnel.completed > 0 ? 
      (funnel.newUserCompleted / funnel.completed) * 100 : 0;

    return funnel;
  }

  /**
   * Persist event to storage
   * @param {Object} event - Event to persist
   */
  persistEvent(event) {
    // In production, this would send to your analytics service
    // For now, we'll store in localStorage for demo purposes
    if (typeof window !== 'undefined') {
      const existingEvents = JSON.parse(localStorage.getItem('social_login_analytics') || '[]');
      existingEvents.push(event);
      
      // Keep only last 1000 events to avoid storage issues
      if (existingEvents.length > 1000) {
        existingEvents.splice(0, existingEvents.length - 1000);
      }
      
      localStorage.setItem('social_login_analytics', JSON.stringify(existingEvents));
    }
  }

  /**
   * Update provider statistics
   * @param {string} provider - Provider name
   * @param {boolean} isNewUser - Whether this is a new user
   */
  updateProviderStats(provider, isNewUser) {
    // This would update a database or analytics service
    // For now, we'll just log it
    console.log(`Updated stats for ${provider}: new user = ${isNewUser}`);
  }

  /**
   * Update error statistics
   * @param {string} provider - Provider name
   * @param {string} error - Error message
   */
  updateErrorStats(provider, error) {
    // This would update a database or analytics service
    // For now, we'll just log it
    console.error(`Updated error stats for ${provider}: ${error}`);
  }

  /**
   * Export analytics data
   * @returns {Object} All analytics data
   */
  exportData() {
    return {
      events: this.events,
      stats: this.getSocialLoginStats(),
      trends: this.getProviderUsageTrends(),
      funnel: this.getConversionFunnel(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Clear all analytics data
   */
  clearData() {
    this.events = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('social_login_analytics');
    }
  }
}

// Create singleton instance
const socialLoginAnalytics = new SocialLoginAnalytics();

export default socialLoginAnalytics;
export { SocialLoginAnalytics };