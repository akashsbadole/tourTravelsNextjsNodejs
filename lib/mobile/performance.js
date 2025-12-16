// Mobile Performance Monitoring Utility

class MobilePerformanceMonitor {
  constructor() {
    this.metrics = {
      navigation: {},
      resources: [],
      vitals: {},
      userInteractions: [],
      networkInfo: {},
      deviceInfo: {},
    };
    
    this.observers = new Map();
    this.isSupported = this.checkSupport();
    
    if (this.isSupported) {
      this.init();
    }
  }

  checkSupport() {
    return (
      typeof window !== "undefined" &&
      "performance" in window &&
      "PerformanceObserver" in window
    );
  }

  init() {
    this.collectDeviceInfo();
    this.collectNetworkInfo();
    this.observeNavigation();
    this.observeResources();
    this.observeWebVitals();
    this.observeUserInteractions();
  }

  collectDeviceInfo() {
    this.metrics.deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      deviceMemory: navigator.deviceMemory || "unknown",
      hardwareConcurrency: navigator.hardwareConcurrency || "unknown",
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      isMobile: this.isMobileDevice(),
      pixelRatio: window.devicePixelRatio || 1,
    };
  }

  collectNetworkInfo() {
    if ("connection" in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      this.metrics.networkInfo = {
        effectiveType: connection.effectiveType || "unknown",
        downlink: connection.downlink || "unknown",
        rtt: connection.rtt || "unknown",
        saveData: connection.saveData || false,
      };
    }
  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  observeNavigation() {
    if (!("PerformanceNavigationTiming" in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === "navigation") {
          this.metrics.navigation = {
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            firstByte: entry.responseStart - entry.requestStart,
            domInteractive: entry.domInteractive - entry.navigationStart,
            domComplete: entry.domComplete - entry.navigationStart,
          };
        }
      });
    });

    observer.observe({ entryTypes: ["navigation"] });
    this.observers.set("navigation", observer);
  }

  observeResources() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === "resource") {
          this.metrics.resources.push({
            name: entry.name,
            type: this.getResourceType(entry.name),
            size: entry.transferSize || 0,
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      });
    });

    observer.observe({ entryTypes: ["resource"] });
    this.observers.set("resources", observer);
  }

  getResourceType(url) {
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return "image";
    if (url.match(/\.(css)$/i)) return "stylesheet";
    if (url.match(/\.(js)$/i)) return "script";
    if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return "font";
    return "other";
  }

  observeWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeLCP();
    
    // First Input Delay (FID)
    this.observeFID();
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS();
    
    // Time to First Byte (TTFB)
    this.observeTTFB();
  }

  observeLCP() {
    if (!("PerformanceObserver" in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.vitals.lcp = {
        value: lastEntry.startTime,
        element: lastEntry.element?.tagName || "unknown",
        url: lastEntry.url || "",
      };
    });

    observer.observe({ entryTypes: ["largest-contentful-paint"] });
    this.observers.set("lcp", observer);
  }

  observeFID() {
    if (!("PerformanceObserver" in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === "first-input") {
          this.metrics.vitals.fid = {
            value: entry.processingStart - entry.startTime,
            inputType: entry.name,
          };
        }
      });
    });

    observer.observe({ entryTypes: ["first-input"] });
    this.observers.set("fid", observer);
  }

  observeCLS() {
    if (!("PerformanceObserver" in window)) return;

    let clsValue = 0;
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.metrics.vitals.cls = { value: clsValue };
        }
      });
    });

    observer.observe({ entryTypes: ["layout-shift"] });
    this.observers.set("cls", observer);
  }

  observeTTFB() {
    if (!("PerformanceObserver" in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === "navigation") {
          this.metrics.vitals.ttfb = {
            value: entry.responseStart - entry.requestStart,
          };
        }
      });
    });

    observer.observe({ entryTypes: ["navigation"] });
    this.observers.set("ttfb", observer);
  }

  observeUserInteractions() {
    const events = ["click", "touchstart", "keydown"];
    
    events.forEach(eventType => {
      const handler = (event) => {
        this.metrics.userInteractions.push({
          type: eventType,
          timestamp: Date.now(),
          target: event.target.tagName,
          coordinates: {
            x: event.clientX || 0,
            y: event.clientY || 0,
          },
        });
        
        // Keep only last 100 interactions
        if (this.metrics.userInteractions.length > 100) {
          this.metrics.userInteractions.shift();
        }
      };
      
      document.addEventListener(eventType, handler, { passive: true });
    });
  }

  measureRenderTime(componentName) {
    const startTime = performance.now();
    
    return {
      end: () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        if (!this.metrics.renderTimes) {
          this.metrics.renderTimes = [];
        }
        
        this.metrics.renderTimes.push({
          component: componentName,
          renderTime,
          timestamp: Date.now(),
        });
        
        return renderTime;
      },
    };
  }

  measureMemoryUsage() {
    if ("memory" in performance) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  getNetworkSpeed() {
    if (!this.metrics.networkInfo.effectiveType) return "unknown";
    
    const speeds = {
      "slow-2g": "Very Slow",
      "2g": "Slow",
      "3g": "Medium",
      "4g": "Fast",
    };
    
    return speeds[this.metrics.networkInfo.effectiveType] || "unknown";
  }

  getPerformanceScore() {
    const vitals = this.metrics.vitals;
    let score = 100;
    
    // LCP scoring (0-2.5s good, 2.5-4s needs improvement, >4s poor)
    if (vitals.lcp) {
      if (vitals.lcp.value > 4000) score -= 25;
      else if (vitals.lcp.value > 2500) score -= 15;
    }
    
    // FID scoring (0-100ms good, 100-300ms needs improvement, >300ms poor)
    if (vitals.fid) {
      if (vitals.fid.value > 300) score -= 25;
      else if (vitals.fid.value > 100) score -= 15;
    }
    
    // CLS scoring (0-0.1 good, 0.1-0.25 needs improvement, >0.25 poor)
    if (vitals.cls) {
      if (vitals.cls.value > 0.25) score -= 25;
      else if (vitals.cls.value > 0.1) score -= 15;
    }
    
    return Math.max(0, score);
  }

  generateReport() {
    return {
      timestamp: Date.now(),
      deviceInfo: this.metrics.deviceInfo,
      networkInfo: this.metrics.networkInfo,
      vitals: this.metrics.vitals,
      navigation: this.metrics.navigation,
      performanceScore: this.getPerformanceScore(),
      networkSpeed: this.getNetworkSpeed(),
      memoryUsage: this.measureMemoryUsage(),
      resourceSummary: this.getResourceSummary(),
      userInteractionSummary: this.getUserInteractionSummary(),
    };
  }

  getResourceSummary() {
    const summary = {
      total: this.metrics.resources.length,
      totalSize: 0,
      byType: {},
      slowResources: [],
    };
    
    this.metrics.resources.forEach(resource => {
      summary.totalSize += resource.size;
      
      if (!summary.byType[resource.type]) {
        summary.byType[resource.type] = { count: 0, size: 0 };
      }
      
      summary.byType[resource.type].count++;
      summary.byType[resource.type].size += resource.size;
      
      if (resource.duration > 1000) {
        summary.slowResources.push(resource);
      }
    });
    
    return summary;
  }

  getUserInteractionSummary() {
    const interactions = this.metrics.userInteractions;
    if (interactions.length === 0) return null;
    
    const summary = {
      total: interactions.length,
      byType: {},
      averageResponseTime: 0,
    };
    
    interactions.forEach(interaction => {
      if (!summary.byType[interaction.type]) {
        summary.byType[interaction.type] = 0;
      }
      summary.byType[interaction.type]++;
    });
    
    return summary;
  }

  sendToAnalytics(endpoint = "/api/mobile-analytics") {
    const report = this.generateReport();
    
    if (typeof fetch !== "undefined") {
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(report),
      }).catch(error => {
        console.warn("Failed to send performance metrics:", error);
      });
    }
  }

  destroy() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

// Hook for React components
export const useMobilePerformance = (componentName) => {
  const monitor = useRef(null);
  
  useEffect(() => {
    if (!monitor.current) {
      monitor.current = new MobilePerformanceMonitor();
    }
    
    return () => {
      monitor.current?.destroy();
    };
  }, []);
  
  const measureRender = useCallback(() => {
    return monitor.current?.measureRenderTime(componentName);
  }, [componentName]);
  
  const getMetrics = useCallback(() => {
    return monitor.current?.generateReport();
  }, []);
  
  return {
    measureRender,
    getMetrics,
    monitor: monitor.current,
  };
};

// Singleton instance
export const mobilePerformanceMonitor = new MobilePerformanceMonitor();

export default MobilePerformanceMonitor;