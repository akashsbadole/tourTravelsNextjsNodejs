"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAnalytics } from './AnalyticsProvider';

/**
 * Hook for user behavior tracking and analysis
 * Provides behavior tracking, pattern analysis, and insights
 */

export const useUserBehavior = (userId, options = {}) => {
  const { trackEvent, trackPageView } = useAnalytics();
  const [behaviorData, setBehaviorData] = useState({
    patterns: {},
    preferences: {},
    engagement: {},
    predictions: {},
    insights: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const sessionStartRef = useRef(Date.now());
  const pageViewCountRef = useRef(0);
  const interactionCountRef = useRef(0);

  const {
    autoTrack = true,
    enableAnalysis = true,
    trackEngagement = true,
    trackPatterns = true,
    updateFrequency = 30000 // 30 seconds
  } = options;

  /**
   * Track user behavior event
   */
  const trackBehavior = useCallback(async (eventType, metadata = {}, context = {}) => {
    try {
      const behaviorData = {
        userId,
        sessionId: getSessionId(),
        eventType,
        page: window.location.pathname,
        context: {
          ...context,
          ...getDeviceContext(),
          ...getLocationContext()
        },
        metadata: {
          ...metadata,
          timestamp: new Date(),
          duration: calculateSessionDuration(),
          scrollDepth: getScrollDepth()
        }
      };

      // Track via analytics
      if (autoTrack) {
        await trackEvent(eventType, metadata, context);
      }

      // Update local counters
      if (eventType === 'page_view') {
        pageViewCountRef.current++;
      } else {
        interactionCountRef.current++;
      }

      // Send to server for analysis
      if (enableAnalysis) {
        await sendBehaviorToServer(behaviorData);
      }

      return behaviorData;
    } catch (error) {
      console.error('Error tracking behavior:', error);
      setError(error.message);
      throw error;
    }
  }, [autoTrack, enableAnalysis, trackEvent, userId]);

  /**
   * Track page engagement
   */
  const trackPageEngagement = useCallback((engagementData) => {
    if (!trackEngagement) return;

    const engagement = {
      timeOnPage: calculateSessionDuration(),
      scrollDepth: getScrollDepth(),
      clicks: interactionCountRef.current,
      formInteractions: engagementData.formInteractions || 0,
      videoWatchTime: engagementData.videoWatchTime || 0,
      resourceDownloads: engagementData.resourceDownloads || 0
    };

    trackBehavior('page_engagement', engagement);
  }, [trackEngagement, trackBehavior]);

  /**
   * Track user journey
   */
  const trackJourney = useCallback(async (goal, step, stepData = {}) => {
    try {
      const journeyId = getJourneyId(goal);
      
      const journeyData = {
        userId,
        journeyId,
        goal,
        step,
        stepData,
        context: {
          page: window.location.pathname,
          deviceType: getDeviceType(),
          timestamp: new Date()
        }
      };

      await sendJourneyToServer(journeyData);
      
      trackBehavior('journey_step', {
        journeyId,
        goal,
        step,
        stepData
      });

      return journeyId;
    } catch (error) {
      console.error('Error tracking journey:', error);
      setError(error.message);
      throw error;
    }
  }, [trackBehavior, userId]);

  /**
   * Complete user journey
   */
  const completeJourney = useCallback(async (goal, conversionValue = 0, dropOffPoint = null) => {
    try {
      const journeyId = getJourneyId(goal);
      
      const journeyData = {
        userId,
        journeyId,
        conversionValue,
        dropOffPoint
      };

      await completeJourneyOnServer(journeyData);
      
      trackBehavior('journey_completed', {
        journeyId,
        goal,
        conversionValue,
        dropOffPoint
      });

      return journeyId;
    } catch (error) {
      console.error('Error completing journey:', error);
      setError(error.message);
      throw error;
    }
  }, [trackBehavior, userId]);

  /**
   * Get user behavior analysis
   */
  const getBehaviorAnalysis = useCallback(async (period = '30d') => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/analytics/behavior/analysis?userId=${userId}&period=${period}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch behavior analysis');
      }

      const analysis = await response.json();
      setBehaviorData(analysis);
      setLoading(false);
      
      return analysis;
    } catch (error) {
      console.error('Error getting behavior analysis:', error);
      setError(error.message);
      setLoading(false);
      throw error;
    }
  }, [userId]);

  /**
   * Get real-time behavior insights
   */
  const getRealTimeInsights = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/behavior/insights?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch real-time insights');
      }

      const insights = await response.json();
      
      // Update behavior data with new insights
      setBehaviorData(prev => ({
        ...prev,
        insights: [...prev.insights, ...insights]
      }));

      return insights;
    } catch (error) {
      console.error('Error getting real-time insights:', error);
      setError(error.message);
      throw error;
    }
  }, [userId]);

  /**
   * Track user preferences
   */
  const updatePreferences = useCallback(async (preferences) => {
    try {
      const response = await fetch('/api/analytics/behavior/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          preferences
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      trackBehavior('preferences_updated', preferences);
      
      return await response.json();
    } catch (error) {
      console.error('Error updating preferences:', error);
      setError(error.message);
      throw error;
    }
  }, [trackBehavior, userId]);

  /**
   * Get behavior predictions
   */
  const getPredictions = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/behavior/predictions?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }

      const predictions = await response.json();
      
      setBehaviorData(prev => ({
        ...prev,
        predictions
      }));

      return predictions;
    } catch (error) {
      console.error('Error getting predictions:', error);
      setError(error.message);
      throw error;
    }
  }, [userId]);

  // Auto-tracking effects
  useEffect(() => {
    if (autoTrack && userId) {
      // Track initial page view
      trackPageView(window.location.pathname);

      // Setup periodic behavior updates
      const interval = setInterval(() => {
        trackPageEngagement({
          formInteractions: 0,
          videoWatchTime: 0,
          resourceDownloads: 0
        });
      }, updateFrequency);

      return () => clearInterval(interval);
    }
  }, [autoTrack, userId, trackPageView, trackPageEngagement, updateFrequency]);

  // Load initial behavior data
  useEffect(() => {
    if (enableAnalysis && userId) {
      getBehaviorAnalysis();
      getRealTimeInsights();
      getPredictions();
    }
  }, [enableAnalysis, userId, getBehaviorAnalysis, getRealTimeInsights, getPredictions]);

  return {
    // State
    behaviorData,
    loading,
    error,
    
    // Actions
    trackBehavior,
    trackPageEngagement,
    trackJourney,
    completeJourney,
    getBehaviorAnalysis,
    getRealTimeInsights,
    updatePreferences,
    getPredictions,
    
    // Computed values
    sessionDuration: calculateSessionDuration(),
    pageViews: pageViewCountRef.current,
    interactions: interactionCountRef.current,
    engagementScore: calculateEngagementScore()
  };
};

/**
 * Helper functions
 */

function getSessionId() {
  let sessionId = sessionStorage.getItem('behavior_session_id');
  if (!sessionId) {
    sessionId = `beh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('behavior_session_id', sessionId);
  }
  return sessionId;
}

function getJourneyId(goal) {
  const journeyKey = `journey_${goal}`;
  let journeyId = sessionStorage.getItem(journeyKey);
  if (!journeyId) {
    journeyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(journeyKey, journeyId);
  }
  return journeyId;
}

function calculateSessionDuration() {
  return Date.now() - sessionStartRef.current;
}

function getScrollDepth() {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  return scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
}

function getDeviceContext() {
  return {
    deviceType: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

function getLocationContext() {
  return {
    country: detectCountry(),
    city: null // Would need geolocation API with consent
  };
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getOS() {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function detectCountry() {
  const locale = navigator.language || navigator.userLanguage;
  return locale?.split('-')[1] || 'Unknown';
}

function calculateEngagementScore() {
  const timeOnPage = calculateSessionDuration();
  const interactions = interactionCountRef.current;
  const pageViews = pageViewCountRef.current;
  
  // Simple engagement score calculation
  let score = 0;
  
  // Time factor (0-40 points)
  if (timeOnPage > 60000) score += 40; // > 1 minute
  else if (timeOnPage > 30000) score += 30; // > 30 seconds
  else if (timeOnPage > 10000) score += 20; // > 10 seconds
  else if (timeOnPage > 5000) score += 10; // > 5 seconds
  
  // Interaction factor (0-30 points)
  if (interactions > 10) score += 30;
  else if (interactions > 5) score += 20;
  else if (interactions > 2) score += 15;
  else if (interactions > 0) score += 10;
  
  // Page view factor (0-30 points)
  if (pageViews > 5) score += 30;
  else if (pageViews > 3) score += 25;
  else if (pageViews > 1) score += 20;
  else score += 10;
  
  return Math.min(100, score);
}

/**
 * API helper functions
 */

async function sendBehaviorToServer(behaviorData) {
  try {
    const response = await fetch('/api/analytics/behavior/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(behaviorData)
    });

    if (!response.ok) {
      throw new Error('Failed to send behavior data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending behavior to server:', error);
  }
}

async function sendJourneyToServer(journeyData) {
  try {
    const response = await fetch('/api/analytics/behavior/journey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(journeyData)
    });

    if (!response.ok) {
      throw new Error('Failed to send journey data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending journey to server:', error);
  }
}

async function completeJourneyOnServer(journeyData) {
  try {
    const response = await fetch('/api/analytics/behavior/journey/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(journeyData)
    });

    if (!response.ok) {
      throw new Error('Failed to complete journey');
    }

    return await response.json();
  } catch (error) {
    console.error('Error completing journey on server:', error);
  }
}

export default useUserBehavior;