// Mobile Bundle Optimizer

class MobileBundleOptimizer {
  constructor() {
    this.deviceInfo = this.getDeviceInfo();
    this.networkInfo = this.getNetworkInfo();
    this.bundleConfig = this.getOptimalBundleConfig();
  }

  getDeviceInfo() {
    return {
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ),
      isLowEnd: this.isLowEndDevice(),
      memory: navigator.deviceMemory || 4,
      cores: navigator.hardwareConcurrency || 4,
      pixelRatio: window.devicePixelRatio || 1,
    };
  }

  getNetworkInfo() {
    if ("connection" in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return {
        effectiveType: connection.effectiveType || "4g",
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
      };
    }
    return { effectiveType: "4g", downlink: 10, rtt: 100, saveData: false };
  }

  isLowEndDevice() {
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const connection = navigator.connection?.effectiveType || "4g";
    
    return (
      memory <= 2 || // Less than 2GB RAM
      cores <= 2 || // Less than 2 cores
      connection === "slow-2g" || connection === "2g" // Slow network
    );
  }

  getOptimalBundleConfig() {
    const { isMobile, isLowEnd, memory } = this.deviceInfo;
    const { effectiveType, saveData } = this.networkInfo;
    
    if (isLowEnd || saveData) {
      return {
        chunks: "minimal",
        lazyLoading: "aggressive",
        compression: "maximum",
        imageOptimization: "high",
        featureFlags: {
          animations: false,
          heavyComponents: false,
          analytics: false,
          thirdParty: false,
        },
      };
    }
    
    if (isMobile) {
      return {
        chunks: "mobile",
        lazyLoading: "normal",
        compression: "high",
        imageOptimization: "medium",
        featureFlags: {
          animations: true,
          heavyComponents: false,
          analytics: true,
          thirdParty: false,
        },
      };
    }
    
    return {
      chunks: "full",
      lazyLoading: "minimal",
      compression: "normal",
      imageOptimization: "low",
      featureFlags: {
        animations: true,
        heavyComponents: true,
        analytics: true,
        thirdParty: true,
      },
    };
  }

  // Dynamic import wrapper for mobile optimization
  async dynamicImport(importFunction, options = {}) {
    const {
      priority = "normal",
      timeout = 10000,
      fallback = null,
      retries = 2,
    } = options;

    let attempt = 0;
    
    while (attempt < retries) {
      try {
        const startTime = performance.now();
        
        // Add timeout for slow networks
        const importPromise = importFunction();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Import timeout")), timeout);
        });
        
        const module = await Promise.race([importPromise, timeoutPromise]);
        const loadTime = performance.now() - startTime;
        
        // Log performance metrics
        this.logBundleLoad(importFunction.name || "unknown", loadTime, true);
        
        return module;
      } catch (error) {
        attempt++;
        console.warn(`Import attempt ${attempt} failed:`, error);
        
        if (attempt >= retries) {
          this.logBundleLoad(importFunction.name || "unknown", 0, false);
          
          if (fallback) {
            console.warn("Using fallback component");
            return fallback;
          }
          
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Preload critical bundles
  preloadCriticalBundles(bundles) {
    const criticalBundles = bundles.filter(bundle => 
      bundle.priority === "critical" || bundle.essential
    );
    
    criticalBundles.forEach(bundle => {
      const link = document.createElement("link");
      link.rel = "modulepreload";
      link.href = bundle.url;
      link.as = "script";
      document.head.appendChild(link);
    });
  }

  // Lazy load non-critical bundles
  lazyLoadBundles(bundles) {
    const nonCriticalBundles = bundles.filter(bundle => 
      bundle.priority !== "critical" && !bundle.essential
    );
    
    // Use Intersection Observer for viewport-based loading
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bundle = entry.target.dataset.bundle;
          this.loadBundle(bundle);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "50px" });
    
    // Observe bundle triggers
    nonCriticalBundles.forEach(bundle => {
      const trigger = document.querySelector(bundle.trigger);
      if (trigger) {
        trigger.dataset.bundle = bundle.name;
        observer.observe(trigger);
      }
    });
  }

  async loadBundle(bundleName) {
    try {
      const bundle = this.bundleConfig.chunks[bundleName];
      if (!bundle) {
        console.warn(`Bundle ${bundleName} not found in config`);
        return;
      }
      
      const module = await this.dynamicImport(() => import(bundle.url), {
        priority: bundle.priority,
      });
      
      return module;
    } catch (error) {
      console.error(`Failed to load bundle ${bundleName}:`, error);
      throw error;
    }
  }

  // Optimize bundle loading based on network conditions
  optimizeNetworkLoading() {
    const { effectiveType, saveData } = this.networkInfo;
    
    if (saveData || effectiveType === "slow-2g" || effectiveType === "2g") {
      // Reduce quality and disable non-essential features
      this.enableDataSaverMode();
    } else if (effectiveType === "3g") {
      // Moderate optimization
      this.enableMediumMode();
    } else {
      // Full experience
      this.enableFullMode();
    }
  }

  enableDataSaverMode() {
    // Disable animations and transitions
    document.documentElement.style.setProperty("--animation-duration", "0ms");
    
    // Reduce image quality
    document.documentElement.style.setProperty("--image-quality", "low");
    
    // Disable non-essential scripts
    this.disableNonEssentialFeatures();
    
    console.log("Data saver mode enabled");
  }

  enableMediumMode() {
    // Moderate animations
    document.documentElement.style.setProperty("--animation-duration", "200ms");
    
    // Medium image quality
    document.documentElement.style.setProperty("--image-quality", "medium");
    
    console.log("Medium mode enabled");
  }

  enableFullMode() {
    // Full animations
    document.documentElement.style.setProperty("--animation-duration", "300ms");
    
    // High image quality
    document.documentElement.style.setProperty("--image-quality", "high");
    
    console.log("Full mode enabled");
  }

  disableNonEssentialFeatures() {
    // Disable analytics
    window.DISABLE_ANALYTICS = true;
    
    // Disable third-party scripts
    window.DISABLE_THIRD_PARTY = true;
    
    // Reduce background processes
    window.REDUCE_BACKGROUND_TASKS = true;
  }

  logBundleLoad(bundleName, loadTime, success) {
    if (typeof window !== "undefined" && window.analytics) {
      window.analytics.track("bundle_load", {
        bundle: bundleName,
        loadTime,
        success,
        device: this.deviceInfo,
        network: this.networkInfo,
      });
    }
  }

  // Generate bundle configuration for Next.js
  generateNextJSConfig() {
    const { chunks, lazyLoading, compression } = this.bundleConfig;
    
    return {
      webpack: (config, { isServer }) => {
        if (!isServer) {
          // Optimize chunk splitting for mobile
          config.optimization.splitChunks = {
            chunks: "all",
            cacheGroups: {
              default: {
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true,
              },
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: "vendors",
                priority: -10,
                chunks: chunks === "minimal" ? "async" : "all",
              },
              mobile: {
                test: /[\\/]components[\\/]mobile[\\/]/,
                name: "mobile",
                priority: 0,
                chunks: "async",
              },
              common: {
                minChunks: 2,
                chunks: "async",
                priority: -10,
                reuseExistingChunk: true,
              },
            },
          };
          
          // Enable compression
          config.optimization.minimize = compression !== "none";
        }
        
        return config;
      },
      
      // Experimental features for mobile optimization
      experimental: {
        optimizeCss: true,
        optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
        scrollRestoration: true,
      },
      
      // Image optimization
      images: {
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        formats: ["image/webp", "image/avif"],
        minimumCacheTTL: 60,
      },
    };
  }

  // Service worker for caching
  generateServiceWorker() {
    return `
      // Mobile-optimized service worker
      const CACHE_NAME = 'travel-agency-mobile-v1';
      const urlsToCache = [
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/manifest.json'
      ];
      
      // Install event - cache resources
      self.addEventListener('install', event => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
        );
      });
      
      // Fetch event - serve from cache when offline
      self.addEventListener('fetch', event => {
        event.respondWith(
          caches.match(event.request)
            .then(response => {
              // Cache hit - return response
              if (response) {
                return response;
              }
              
              // Network request
              return fetch(event.request).then(response => {
                // Check if valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                  return response;
                }
                
                // Clone response and cache it
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  });
                
                return response;
              });
            })
        );
      });
      
      // Activate event - clean up old caches
      self.addEventListener('activate', event => {
        event.waitUntil(
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => {
                if (cacheName !== CACHE_NAME) {
                  return caches.delete(cacheName);
                }
              })
            );
          })
        );
      });
    `;
  }
}

// Hook for React components
export const useMobileBundleOptimizer = () => {
  const optimizer = useRef(null);
  const [bundleConfig, setBundleConfig] = useState(null);
  
  useEffect(() => {
    if (!optimizer.current) {
      optimizer.current = new MobileBundleOptimizer();
      setBundleConfig(optimizer.current.bundleConfig);
      optimizer.current.optimizeNetworkLoading();
    }
  }, []);
  
  const dynamicImport = useCallback((importFunction, options) => {
    return optimizer.current?.dynamicImport(importFunction, options);
  }, []);
  
  const preloadBundle = useCallback((bundleName) => {
    return optimizer.current?.loadBundle(bundleName);
  }, []);
  
  return {
    bundleConfig,
    dynamicImport,
    preloadBundle,
    optimizer: optimizer.current,
  };
};

// Singleton instance
export const mobileBundleOptimizer = new MobileBundleOptimizer();

export default MobileBundleOptimizer;