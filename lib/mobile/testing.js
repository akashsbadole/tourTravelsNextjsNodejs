// Mobile Testing Framework

class MobileTestingFramework {
  constructor() {
    this.tests = [];
    this.results = [];
    this.deviceInfo = this.getDeviceInfo();
    this.viewportInfo = this.getViewportInfo();
    this.touchSupport = this.checkTouchSupport();
  }

  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      isMobile: this.isMobileDevice(),
      isTablet: this.isTabletDevice(),
      isIOS: this.isIOSDevice(),
      isAndroid: this.isAndroidDevice(),
      devicePixelRatio: window.devicePixelRatio || 1,
      screenWidth: screen.width,
      screenHeight: screen.height,
      colorDepth: screen.colorDepth,
      orientation: screen.orientation?.type || "unknown",
    };
  }

  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
    };
  }

  checkTouchSupport() {
    return {
      maxTouchPoints: navigator.maxTouchPoints || 0,
      touchEvent: "ontouchstart" in window,
      touchSupport: "TouchEvent" in window,
      pointerEvent: "PointerEvent" in window,
    };
  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  isTabletDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    return /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
  }

  isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  isAndroidDevice() {
    return /Android/.test(navigator.userAgent);
  }

  // Test registration
  test(name, testFunction, category = "general") {
    this.tests.push({
      name,
      testFunction,
      category,
      timestamp: Date.now(),
    });
  }

  // Test execution
  async runTests(category = null) {
    this.results = [];
    const testsToRun = category 
      ? this.tests.filter(test => test.category === category)
      : this.tests;

    for (const test of testsToRun) {
      try {
        const startTime = performance.now();
        const result = await test.testFunction();
        const endTime = performance.now();
        
        this.results.push({
          name: test.name,
          category: test.category,
          passed: result.passed,
          message: result.message,
          duration: endTime - startTime,
          details: result.details || {},
          timestamp: Date.now(),
        });
      } catch (error) {
        this.results.push({
          name: test.name,
          category: test.category,
          passed: false,
          message: `Test failed with error: ${error.message}`,
          duration: 0,
          details: { error: error.stack },
          timestamp: Date.now(),
        });
      }
    }

    return this.results;
  }

  // Built-in tests
  setupBuiltInTests() {
    // Touch interaction tests
    this.test("Touch Support Detection", () => {
      const hasTouch = this.touchSupport.touchEvent || this.touchSupport.maxTouchPoints > 0;
      return {
        passed: hasTouch,
        message: hasTouch ? "Touch support detected" : "No touch support detected",
        details: this.touchSupport,
      };
    }, "touch");

    this.test("Touch Target Size", () => {
      const buttons = document.querySelectorAll("button, a, input[type='button'], input[type='submit']");
      const smallButtons = Array.from(buttons).filter(button => {
        const rect = button.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44; // Minimum touch target size
      });
      
      return {
        passed: smallButtons.length === 0,
        message: smallButtons.length === 0 
          ? "All touch targets meet minimum size requirements"
          : `Found ${smallButtons.length} touch targets below minimum size (44x44px)`,
        details: { smallButtons: smallButtons.length, totalButtons: buttons.length },
      };
    }, "touch");

    // Responsive design tests
    this.test("Viewport Breakpoint", () => {
      const width = this.viewportInfo.width;
      let breakpoint = "unknown";
      
      if (width < 375) breakpoint = "xs";
      else if (width < 425) breakpoint = "sm";
      else if (width < 768) breakpoint = "md";
      else if (width < 1024) breakpoint = "lg";
      else if (width < 1280) breakpoint = "xl";
      else breakpoint = "2xl";
      
      return {
        passed: true,
        message: `Current viewport: ${width}px (${breakpoint} breakpoint)`,
        details: { width, breakpoint },
      };
    }, "responsive");

    this.test("Font Size Readability", () => {
      const bodyStyles = window.getComputedStyle(document.body);
      const fontSize = parseFloat(bodyStyles.fontSize);
      const isReadable = fontSize >= 16; // Minimum readable font size
      
      return {
        passed: isReadable,
        message: isReadable 
          ? `Font size is readable: ${fontSize}px`
          : `Font size too small: ${fontSize}px (minimum 16px recommended)`,
        details: { fontSize, recommended: 16 },
      };
    }, "accessibility");

    // Performance tests
    this.test("Page Load Performance", () => {
      if (!performance.timing) {
        return {
          passed: false,
          message: "Performance timing not available",
        };
      }
      
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      const isFast = loadTime < 3000; // 3 seconds threshold
      
      return {
        passed: isFast,
        message: isFast 
          ? `Page loaded quickly: ${loadTime}ms`
          : `Page load slow: ${loadTime}ms (target: <3000ms)`,
        details: { loadTime, target: 3000 },
      };
    }, "performance");

    this.test("Image Optimization", () => {
      const images = document.querySelectorAll("img");
      const unoptimizedImages = Array.from(images).filter(img => {
        return !img.srcset && !img.sizes && (img.naturalWidth > 1000 || img.naturalHeight > 1000);
      });
      
      return {
        passed: unoptimizedImages.length === 0,
        message: unoptimizedImages.length === 0
          ? "All images appear optimized"
          : `Found ${unoptimizedImages.length} potentially unoptimized images`,
        details: { 
          unoptimized: unoptimizedImages.length, 
          total: images.length 
        },
      };
    }, "performance");

    // Accessibility tests
    this.test("Alt Text for Images", () => {
      const images = document.querySelectorAll("img");
      const imagesWithoutAlt = Array.from(images).filter(img => !img.alt);
      
      return {
        passed: imagesWithoutAlt.length === 0,
        message: imagesWithoutAlt.length === 0
          ? "All images have alt text"
          : `Found ${imagesWithoutAlt.length} images without alt text`,
        details: { 
          withoutAlt: imagesWithoutAlt.length, 
          total: images.length 
        },
      };
    }, "accessibility");

    this.test("Form Labels", () => {
      const inputs = document.querySelectorAll("input, textarea, select");
      const inputsWithoutLabel = Array.from(inputs).filter(input => {
        const hasLabel = document.querySelector(`label[for="${input.id}"]`) ||
                       input.getAttribute("aria-label") ||
                       input.getAttribute("title");
        return !hasLabel;
      });
      
      return {
        passed: inputsWithoutLabel.length === 0,
        message: inputsWithoutLabel.length === 0
          ? "All form inputs have proper labels"
          : `Found ${inputsWithoutLabel.length} inputs without labels`,
        details: { 
          withoutLabel: inputsWithoutLabel.length, 
          total: inputs.length 
        },
      };
    }, "accessibility");

    // Mobile-specific tests
    this.test("Horizontal Scrolling", () => {
      const body = document.body;
      const hasHorizontalScroll = body.scrollWidth > body.clientWidth;
      
      return {
        passed: !hasHorizontalScroll,
        message: hasHorizontalScroll
          ? "Unwanted horizontal scrolling detected"
          : "No unwanted horizontal scrolling",
        details: { 
          scrollWidth: body.scrollWidth, 
          clientWidth: body.clientWidth 
        },
      };
    }, "mobile");

    this.test("Zoom and Pinch", () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      const hasZoomControl = viewport && 
        viewport.getAttribute("content").includes("user-scalable=no") === false;
      
      return {
        passed: hasZoomControl,
        message: hasZoomControl
          ? "Viewport allows zoom and pinch"
          : "Viewport may restrict zoom and pinch",
        details: { 
          hasViewport: !!viewport,
          content: viewport?.getAttribute("content") 
        },
      };
    }, "mobile");

    this.test("Safe Area Support", () => {
      const hasSafeAreaSupport = CSS.supports("padding", "env(safe-area-inset-top)");
      
      return {
        passed: hasSafeAreaSupport,
        message: hasSafeAreaSupport
          ? "Safe area insets supported"
          : "Safe area insets not supported",
        details: { supported: hasSafeAreaSupport },
      };
    }, "mobile");
  }

  // Generate test report
  generateReport() {
    const passed = this.results.filter(result => result.passed).length;
    const failed = this.results.filter(result => !result.passed).length;
    const total = this.results.length;
    
    const categories = {};
    this.results.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { passed: 0, failed: 0 };
      }
      if (result.passed) {
        categories[result.category].passed++;
      } else {
        categories[result.category].failed++;
      }
    });

    return {
      summary: {
        total,
        passed,
        failed,
        passRate: Math.round((passed / total) * 100),
      },
      categories,
      deviceInfo: this.deviceInfo,
      viewportInfo: this.viewportInfo,
      results: this.results,
      timestamp: Date.now(),
    };
  }

  // Export results
  exportResults(format = "json") {
    const report = this.generateReport();
    
    switch (format.toLowerCase()) {
      case "json":
        return JSON.stringify(report, null, 2);
      
      case "html":
        return this.generateHTMLReport(report);
      
      case "csv":
        return this.generateCSVReport(report);
      
      default:
        return report;
    }
  }

  generateHTMLReport(report) {
    const { summary, categories, results } = report;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Mobile Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-result { margin: 10px 0; padding: 15px; border-radius: 8px; }
        .passed { background: #d4edda; border-left: 4px solid #28a745; }
        .failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .category { margin: 30px 0; }
        .category h3 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mobile Test Report</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <p style="font-size: 2em; color: #333;">${summary.total}</p>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <p style="font-size: 2em; color: #28a745;">${summary.passed}</p>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <p style="font-size: 2em; color: #dc3545;">${summary.failed}</p>
        </div>
        <div class="metric">
            <h3>Pass Rate</h3>
            <p style="font-size: 2em; color: #333;">${summary.passRate}%</p>
        </div>
    </div>
    
    ${Object.entries(categories).map(([category, stats]) => `
        <div class="category">
            <h3>${category.charAt(0).toUpperCase() + category.slice(1)} (${stats.passed}/${stats.passed + stats.failed} passed)</h3>
            ${results
              .filter(result => result.category === category)
              .map(result => `
                <div class="test-result ${result.passed ? 'passed' : 'failed'}">
                    <strong>${result.name}</strong>
                    <p>${result.message}</p>
                    <small>Duration: ${result.duration.toFixed(2)}ms</small>
                </div>
              `).join('')}
        </div>
    `).join('')}
</body>
</html>`;
  }

  generateCSVReport(report) {
    const headers = ["Name", "Category", "Passed", "Message", "Duration (ms)", "Timestamp"];
    const rows = report.results.map(result => [
      result.name,
      result.category,
      result.passed,
      result.message,
      result.duration,
      new Date(result.timestamp).toISOString(),
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");
  }
}

// Hook for React components
export const useMobileTesting = (componentName) => {
  const tester = useRef(null);
  const [testResults, setTestResults] = useState(null);
  
  useEffect(() => {
    if (!tester.current) {
      tester.current = new MobileTestingFramework();
      tester.current.setupBuiltInTests();
    }
  }, []);
  
  const runTests = useCallback(async (category = null) => {
    if (!tester.current) return null;
    
    const results = await tester.current.runTests(category);
    setTestResults(results);
    return results;
  }, []);
  
  const getReport = useCallback((format = "json") => {
    if (!tester.current) return null;
    return tester.current.exportResults(format);
  }, []);
  
  return {
    runTests,
    getReport,
    testResults,
    tester: tester.current,
  };
};

// Singleton instance
export const mobileTester = new MobileTestingFramework();

export default MobileTestingFramework;