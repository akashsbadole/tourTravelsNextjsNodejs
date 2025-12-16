"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, ArrowDown } from "lucide-react";

const MobilePullToRefresh = ({
  children,
  onRefresh,
  className,
  threshold = 80,
  resistance = 2.5,
  disabled = false,
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const isScrolling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    startY.current = touch.clientY;
    
    // Check if we're at the top of the scrollable content
    if (contentRef.current) {
      isScrolling.current = contentRef.current.scrollTop > 0;
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e) => {
    if (disabled || isRefreshing || isScrolling.current) return;
    
    const touch = e.touches[0];
    currentY.current = touch.clientY;
    const distance = (currentY.current - startY.current) / resistance;
    
    // Only allow pulling down, not up
    if (distance > 0) {
      e.preventDefault();
      setIsPulling(true);
      setPullDistance(Math.min(distance, threshold * 1.5));
      
      // Check if we've crossed the threshold
      if (distance >= threshold && !shouldRefresh) {
        setShouldRefresh(true);
      } else if (distance < threshold && shouldRefresh) {
        setShouldRefresh(false);
      }
    }
  }, [disabled, isRefreshing, threshold, resistance, shouldRefresh]);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling || isRefreshing) return;
    
    setIsPulling(false);
    
    if (shouldRefresh && pullDistance >= threshold) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      // Call the refresh function
      onRefresh?.().finally(() => {
        setIsRefreshing(false);
        setShouldRefresh(false);
        setPullDistance(0);
      });
    } else {
      // Reset position
      setPullDistance(0);
      setShouldRefresh(false);
    }
  }, [isPulling, isRefreshing, shouldRefresh, pullDistance, threshold, onRefresh]);

  // Handle scroll events to track if user is scrolling
  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      isScrolling.current = contentRef.current.scrollTop > 0;
    }
  }, []);

  // Add touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate pull progress for visual feedback
  const pullProgress = Math.min(pullDistance / threshold, 1);
  const rotation = pullProgress * 360;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full overflow-hidden",
        className
      )}
    >
      {/* Pull to Refresh Indicator */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center pointer-events-none"
        style={{
          height: `${Math.max(0, pullDistance)}px`,
          opacity: pullProgress,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 transition-all duration-200",
            shouldRefresh && "bg-primary/20"
          )}
        >
          {isRefreshing ? (
            <RefreshCw className="h-6 w-6 text-primary animate-spin" />
          ) : (
            <ArrowDown
              className="h-6 w-6 text-primary transition-transform duration-200"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Content Container */}
      <div
        ref={contentRef}
        className="h-full overflow-y-auto scrollbar-hide"
        onScroll={handleScroll}
        style={{
          transform: isPulling ? `translateY(${pullDistance}px)` : "translateY(0)",
          transition: isPulling ? "none" : "transform 0.3s ease-out",
        }}
      >
        {/* Spacer to prevent content from being hidden behind the pull indicator */}
        <div style={{ height: isRefreshing ? `${threshold}px` : "0" }} />
        
        {children}
      </div>

      {/* Refresh Status Overlay */}
      {isRefreshing && (
        <div className="absolute top-4 left-4 right-4 z-20">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Refreshing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for programmatic refresh
export const usePullToRefresh = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshPromise = useRef(null);

  const refresh = useCallback(async (refreshFunction) => {
    if (isRefreshing) return refreshPromise.current;
    
    setIsRefreshing(true);
    
    try {
      refreshPromise.current = refreshFunction();
      await refreshPromise.current;
      return refreshPromise.current;
    } finally {
      setIsRefreshing(false);
      refreshPromise.current = null;
    }
  }, [isRefreshing]);

  return {
    isRefreshing,
    refresh,
  };
};

export { MobilePullToRefresh };