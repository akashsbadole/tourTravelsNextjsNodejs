"use client";

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

// Import the client tracking utility
import ClientAnalytics from '@/lib/analytics/clientTracking';

/**
 * Analytics Provider Component
 * Provides analytics context and functionality to the application
 */

const AnalyticsContext = createContext(null);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

export const AnalyticsProvider = ({ children, config = {} }) => {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const analyticsRef = useRef(null);

  // Initialize analytics
  useEffect(() => {
    if (typeof window !== 'undefined' && !analyticsRef.current) {
      const analyticsConfig = {
        apiEndpoint: '/api/analytics/events',
        batchSize: 10,
        batchTimeout: 5000,
        enableAutoTracking: true,
        trackPageViews: true,
        trackClicks: true,
        trackScroll: true,
        trackSessions: true,
        debug: process.env.NODE_ENV === 'development',
        ...config
      };

      const analyticsInstance = new ClientAnalytics(analyticsConfig);
      analyticsRef.current = analyticsInstance;
      setAnalytics(analyticsInstance);
      setIsInitialized(true);
    }

    return () => {
      if (analyticsRef.current) {
        analyticsRef.current.destroy();
        analyticsRef.current = null;
      }
    };
  }, [config]);

  // Update user ID when session changes
  useEffect(() => {
    if (analyticsRef.current && isInitialized) {
      if (session?.user?.id) {
        analyticsRef.current.setUserId(session.user.id);
      } else {
        analyticsRef.current.setUserId(null);
      }
    }
  }, [session, isInitialized]);

  // Analytics tracking functions
  const trackEvent = (eventType, metadata = {}, context = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.track(eventType, metadata, context);
    }
  };

  const trackPageView = (page, metadata = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.trackPageView(page, metadata);
    }
  };

  const trackSearch = (searchType, searchParams, results, context = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.track('search', {
        searchType,
        searchParams,
        resultCount: results?.totalResults || 0,
        searchTime: results?.searchTime || 0
      }, context);
    }
  };

  const trackBooking = (bookingType, bookingData, stage, context = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.track(`booking_${stage}`, {
        bookingType,
        bookingId: bookingData.bookingId,
        value: bookingData.value || 0,
        currency: bookingData.currency || 'USD',
        bookingData
      }, context);
    }
  };

  const trackClick = (element, metadata = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.track('click', {
        element: {
          tagName: element.tagName.toLowerCase(),
          className: element.className,
          id: element.id,
          text: element.textContent?.trim().substring(0, 50),
          selector: getElementSelector(element)
        },
        ...metadata
      });
    }
  };

  const trackFormSubmit = (formName, formData, context = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.track('form_submit', {
        formName,
        fieldCount: Object.keys(formData).length,
        hasErrors: context.hasErrors || false
      }, context);
    }
  };

  const trackError = (error, context = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.track('error', {
        message: error.message,
        stack: error.stack,
        type: error.name || 'Error',
        url: window.location.href,
        ...context
      });
    }
  };

  const trackUserEngagement = (action, metadata = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.track('engagement', {
        action,
        ...metadata
      });
    }
  };

  const trackConversion = (goal, value = 0, metadata = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.track('conversion', {
        goal,
        value,
        currency: metadata.currency || 'USD',
        ...metadata
      });
    }
  };

  const trackExperiment = (experimentId, variantId, context = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.track('experiment_assigned', {
        experimentId,
        variantId
      }, context);
    }
  };

  const contextValue = {
    analytics,
    isInitialized,
    trackEvent,
    trackPageView,
    trackSearch,
    trackBooking,
    trackClick,
    trackFormSubmit,
    trackError,
    trackUserEngagement,
    trackConversion,
    trackExperiment
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

/**
 * Hook for automatic page tracking
 */
export const usePageTracking = (pageName) => {
  const { trackPageView } = useAnalytics();
  const [currentPage, setCurrentPage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const newPage = pageName || window.location.pathname;
      
      if (newPage !== currentPage) {
        trackPageView(newPage);
        setCurrentPage(newPage);
      }
    }
  }, [pageName, currentPage, trackPageView]);
};

/**
 * Hook for tracking user interactions with elements
 */
export const useInteractionTracking = () => {
  const { trackClick } = useAnalytics();

  const trackElementClick = (element, metadata = {}) => {
    trackClick(element, metadata);
  };

  return { trackElementClick };
};

/**
 * Hook for tracking form submissions
 */
export const useFormTracking = (formName) => {
  const { trackFormSubmit } = useAnalytics();

  const trackSubmission = (formData, context = {}) => {
    trackFormSubmit(formName, formData, context);
  };

  return { trackSubmission };
};

/**
 * Hook for tracking search interactions
 */
export const useSearchTracking = () => {
  const { trackSearch } = useAnalytics();

  const trackSearchEvent = (searchType, searchParams, results, context = {}) => {
    trackSearch(searchType, searchParams, results, context);
  };

  return { trackSearchEvent };
};

/**
 * Hook for tracking booking funnel
 */
export const useBookingTracking = () => {
  const { trackBooking } = useAnalytics();

  const trackBookingStep = (bookingType, bookingData, stage, context = {}) => {
    trackBooking(bookingType, bookingData, stage, context);
  };

  return { trackBookingStep };
};

/**
 * Utility function to get CSS selector
 */
function getElementSelector(element) {
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

export default AnalyticsProvider;