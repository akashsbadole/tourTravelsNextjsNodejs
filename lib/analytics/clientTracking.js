/**
 * Client-side analytics tracking utility
 * Handles browser-based event collection and transmission
 */

class ClientAnalytics {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/analytics/events',
      batchSize: config.batchSize || 10,
      batchTimeout: config.batchTimeout || 5000,
      enableAutoTracking: config.enableAutoTracking !== false,
      trackPageViews: config.trackPageViews !== false,
      trackClicks: config.trackClicks !== false,
      trackScroll: config.trackScroll !== false,
      trackSessions: config.trackSessions !== false,
      debug: config.debug || false,
      ...config
    };

    this.sessionId = this.getSessionId();
    this.userId = null;
    this.events = [];
    this.batchTimer = null;
    this.isTracking = false;
    this.pageStartTime = Date.now();
    this.lastScrollPosition = 0;
    this.scrollThreshold = 0.9; // Track when user scrolls 90% down

    this.init();
  }

  /**
   * Initialize analytics tracking
   */
  init() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.log('Analytics initialized');

    // Auto-tracking features
    if (this.config.enableAutoTracking) {
      this.setupAutoTracking();
    }

    // Track initial page view
    if (this.config.trackPageViews) {
      this.trackPageView();
    }

    // Setup batch processing
    this.setupBatchProcessing();

    // Handle page unload
    this.setupUnloadHandling();
  }

  /**
   * Setup automatic event tracking
   */
  setupAutoTracking() {
    // Track page changes for SPAs
    this.trackPageChanges();

    // Track clicks if enabled
    if (this.config.trackClicks) {
      this.setupClickTracking();
    }

    // Track scroll if enabled
    if (this.config.trackScroll) {
      this.setupScrollTracking();
    }

    // Track session start/end
    if (this.config.trackSessions) {
      this.trackSessionStart();
    }
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId) {
    this.userId = userId;
    this.log(`User ID set: ${userId}`);
  }

  /**
   * Track custom event
   */
  track(eventType, metadata = {}, context = {}) {
    const event = {
      eventType,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      metadata,
      context: {
        ...context,
        ...this.getDeviceContext(),
        ...this.getLocationContext()
      }
    };

    this.events.push(event);
    this.log(`Event tracked: ${eventType}`, event);

    // Process batch if needed
    if (this.events.length >= this.config.batchSize) {
      this.sendBatch();
    }
  }

  /**
   * Track page view
   */
  trackPageView() {
    const pageLoadTime = performance.timing ? 
      performance.timing.loadEventEnd - performance.timing.navigationStart : 0;

    this.track('page_view', {
      url: window.location.href,
      title: document.title,
      loadTime: pageLoadTime,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });

    this.pageStartTime = Date.now();
  }

  /**
   * Track click events
   */
  setupClickTracking() {
    document.addEventListener('click', (event) => {
      const target = event.target;
      const elementInfo = this.getElementInfo(target);

      this.track('click', {
        element: elementInfo,
        coordinates: {
          x: event.clientX,
          y: event.clientY
        },
        pageScroll: window.pageYOffset
      });
    });
  }

  /**
   * Track scroll events
   */
  setupScrollTracking() {
    let scrollTimeout;
    
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPercentage = this.getScrollPercentage();
        
        // Track when user reaches scroll threshold
        if (scrollPercentage >= this.scrollThreshold && 
            this.lastScrollPosition < this.scrollThreshold) {
          this.track('scroll_depth', {
            depth: scrollPercentage,
            maxDepth: scrollPercentage
          });
        }
        
        this.lastScrollPosition = scrollPercentage;
      }, 100);
    });
  }

  /**
   * Track page changes for SPAs
   */
  trackPageChanges() {
    // Override history methods for SPA tracking
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handlePageChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handlePageChange();
    };

    window.addEventListener('popstate', () => {
      this.handlePageChange();
    });
  }

  /**
   * Handle page change for SPAs
   */
  handlePageChange() {
    // Track time on previous page
    const timeOnPage = Date.now() - this.pageStartTime;
    
    this.track('page_exit', {
      timeOnPage,
      url: window.location.href
    });

    // Track new page view
    setTimeout(() => {
      this.trackPageView();
    }, 0);
  }

  /**
   * Track session start
   */
  trackSessionStart() {
    this.track('session_start', {
      entryTime: new Date().toISOString(),
      landingPage: window.location.href,
      referrer: document.referrer
    });
  }

  /**
   * Setup batch processing
   */
  setupBatchProcessing() {
    this.batchTimer = setInterval(() => {
      if (this.events.length > 0) {
        this.sendBatch();
      }
    }, this.config.batchTimeout);
  }

  /**
   * Send batch of events to server
   */
  async sendBatch() {
    if (this.events.length === 0) return;

    const events = [...this.events];
    this.events = [];

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          context: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ...this.getDeviceContext(),
            ...this.getLocationContext()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.log(`Batch sent successfully: ${events.length} events`);
    } catch (error) {
      this.log('Error sending batch:', error);
      // Re-add events to queue for retry
      this.events.unshift(...events);
    }
  }

  /**
   * Handle page unload
   */
  setupUnloadHandling() {
    // Send remaining events before page unload
    window.addEventListener('beforeunload', () => {
      // Track session end
      this.track('session_end', {
        sessionDuration: Date.now() - this.pageStartTime,
        exitPage: window.location.href
      });

      // Send remaining events synchronously if possible
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          events: this.events,
          context: { flush: true }
        });
        
        navigator.sendBeacon(this.config.apiEndpoint, data);
      }
    });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('page_hidden', {
          timeOnPage: Date.now() - this.pageStartTime
        });
      } else {
        this.track('page_visible');
        this.pageStartTime = Date.now();
      }
    });
  }

  /**
   * Get device context information
   */
  getDeviceContext() {
    return {
      deviceType: this.getDeviceType(),
      browser: this.getBrowserInfo(),
      os: this.getOSInfo(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height
      },
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Get location context
   */
  getLocationContext() {
    return {
      // Note: Location services should be implemented with user consent
      // This is a placeholder for country/language detection
      country: this.detectCountry(),
      city: null // Would need geolocation API
    };
  }

  /**
   * Get device type
   */
  getDeviceType() {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    if (ua.indexOf('Chrome') > -1) {
      browserName = 'Chrome';
      browserVersion = ua.match(/Chrome\/(\d+)/)?.[1];
    } else if (ua.indexOf('Safari') > -1) {
      browserName = 'Safari';
      browserVersion = ua.match(/Version\/(\d+)/)?.[1];
    } else if (ua.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
      browserVersion = ua.match(/Firefox\/(\d+)/)?.[1];
    }

    return `${browserName} ${browserVersion}`;
  }

  /**
   * Get OS information
   */
  getOSInfo() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Windows') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'macOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iOS') > -1) return 'iOS';
    return 'Unknown';
  }

  /**
   * Detect country from locale
   */
  detectCountry() {
    // Basic country detection from locale
    const locale = navigator.language || navigator.userLanguage;
    return locale?.split('-')[1] || 'Unknown';
  }

  /**
   * Get scroll percentage
   */
  getScrollPercentage() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    return scrollHeight > 0 ? (scrollTop / scrollHeight) : 0;
  }

  /**
   * Get element information for click tracking
   */
  getElementInfo(element) {
    const tagName = element.tagName.toLowerCase();
    const className = element.className;
    const id = element.id;
    const text = element.textContent?.trim().substring(0, 50);
    
    // Get data attributes
    const dataAttributes = {};
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-')) {
        dataAttributes[attr.name] = attr.value;
      }
    }

    return {
      tagName,
      className,
      id,
      text,
      dataAttributes,
      selector: this.getCSSSelector(element)
    };
  }

  /**
   * Get CSS selector for element
   */
  getCSSSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      if (element.className) {
        selector += '.' + element.className.split(' ').join('.');
      }
      path.unshift(selector);
      element = element.parentNode;
    }
    
    return path.join(' > ');
  }

  /**
   * Log debug messages
   */
  log(message, data = null) {
    if (this.config.debug) {
      console.log(`[Analytics] ${message}`, data);
    }
  }

  /**
   * Destroy analytics instance
   */
  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Send remaining events
    this.sendBatch();
    
    this.isTracking = false;
    this.log('Analytics destroyed');
  }
}

// Export for use in components
export default ClientAnalytics;

// Auto-initialize if script is loaded
if (typeof window !== 'undefined') {
  window.ClientAnalytics = ClientAnalytics;
}