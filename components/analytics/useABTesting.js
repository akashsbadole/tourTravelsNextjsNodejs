"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook for A/B Testing functionality
 * Provides methods to assign users to variants and track conversions
 */
export function useABTesting() {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Assign user to experiment variant
   */
  const assignToVariant = useCallback(async (experimentId, context = {}) => {
    if (!session?.user?.id) {
      console.error("User not authenticated");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/abtesting/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ experimentId, context }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to assign to variant");
      }

      // Update assignments state
      setAssignments(prev => ({
        ...prev,
        [experimentId]: data.data
      }));

      return data.data;
    } catch (err) {
      setError(err.message);
      console.error("Error assigning to variant:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session]);

  /**
   * Track conversion for experiment
   */
  const trackConversion = useCallback(async (experimentId, conversionData) => {
    if (!session?.user?.id) {
      console.error("User not authenticated");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/abtesting/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ experimentId, conversionData }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to track conversion");
      }

      return data.data;
    } catch (err) {
      setError(err.message);
      console.error("Error tracking conversion:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session]);

  /**
   * Get user's current assignments
   */
  const getAssignments = useCallback(async () => {
    if (!session?.user?.id) {
      return {};
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/abtesting/assign");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get assignments");
      }

      setAssignments(data.data.assignments || {});
      return data.data.assignments;
    } catch (err) {
      setError(err.message);
      console.error("Error getting assignments:", err);
      return {};
    } finally {
      setLoading(false);
    }
  }, [session]);

  /**
   * Get variant for experiment (assign if not already assigned)
   */
  const getVariant = useCallback(async (experimentId, context = {}) => {
    // Check if already assigned
    if (assignments[experimentId]) {
      return assignments[experimentId];
    }

    // Assign to variant
    return await assignToVariant(experimentId, context);
  }, [assignments, assignToVariant]);

  /**
   * Check if user is in specific variant
   */
  const isInVariant = useCallback((experimentId, variantName) => {
    const assignment = assignments[experimentId];
    if (!assignment) return false;
    
    return assignment.variantName === variantName;
  }, [assignments]);

  /**
   * Track page view for experiment
   */
  const trackPageView = useCallback(async (experimentId, pageData = {}) => {
    return await trackConversion(experimentId, {
      eventType: "page_view",
      value: 0,
      metadata: pageData
    });
  }, [trackConversion]);

  /**
   * Track click for experiment
   */
  const trackClick = useCallback(async (experimentId, clickData = {}) => {
    return await trackConversion(experimentId, {
      eventType: "click",
      value: 0,
      metadata: clickData
    });
  }, [trackConversion]);

  /**
   * Track purchase for experiment
   */
  const trackPurchase = useCallback(async (experimentId, purchaseData) => {
    return await trackConversion(experimentId, {
      eventType: "purchase",
      value: purchaseData.value || 0,
      currency: purchaseData.currency || "USD",
      metadata: purchaseData.metadata || {}
    });
  }, [trackConversion]);

  /**
   * Track booking for experiment
   */
  const trackBooking = useCallback(async (experimentId, bookingData) => {
    return await trackConversion(experimentId, {
      eventType: "booking",
      value: bookingData.value || 0,
      currency: bookingData.currency || "USD",
      metadata: bookingData.metadata || {}
    });
  }, [trackConversion]);

  /**
   * Track search for experiment
   */
  const trackSearch = useCallback(async (experimentId, searchData) => {
    return await trackConversion(experimentId, {
      eventType: "search",
      value: 0,
      metadata: searchData
    });
  }, [trackConversion]);

  // Load assignments on mount
  useEffect(() => {
    if (session?.user?.id) {
      getAssignments();
    }
  }, [session, getAssignments]);

  return {
    assignments,
    loading,
    error,
    assignToVariant,
    trackConversion,
    getAssignments,
    getVariant,
    isInVariant,
    trackPageView,
    trackClick,
    trackPurchase,
    trackBooking,
    trackSearch
  };
}

/**
 * Hook for specific experiment variant
 */
export function useExperimentVariant(experimentId, context = {}) {
  const { getVariant, loading, error } = useABTesting();
  const [variant, setVariant] = useState(null);

  useEffect(() => {
    if (experimentId) {
      getVariant(experimentId, context).then(result => {
        setVariant(result);
      });
    }
  }, [experimentId, context, getVariant]);

  return { variant, loading, error };
}

/**
 * Hook for A/B testing component wrapper
 */
export function useABTestComponent(experimentId, components, context = {}) {
  const { getVariant, loading, error } = useABTesting();
  const [currentComponent, setCurrentComponent] = useState(null);

  useEffect(() => {
    if (experimentId && components) {
      getVariant(experimentId, context).then(result => {
        if (result && result.variantName && components[result.variantName]) {
          setCurrentComponent(components[result.variantName]);
        } else if (components.default) {
          setCurrentComponent(components.default);
        }
      });
    }
  }, [experimentId, components, context, getVariant]);

  return { component: currentComponent, loading, error };
}

export default useABTesting;