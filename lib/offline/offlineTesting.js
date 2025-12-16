/**
 * Offline Testing Utilities
 * Comprehensive testing suite for offline functionality
 */

import indexedDBManager from './indexedDB';
import cacheManager from './cacheManager';
import offlineManager from './offlineManager';
import backgroundSyncManager from './backgroundSync';
import storageQuotaManager from './storageQuota';

// Test types
const TEST_TYPES = {
  CACHE: 'cache',
  SYNC: 'sync',
  STORAGE: 'storage',
  OFFLINE_DETECTION: 'offline-detection',
  ERROR_HANDLING: 'error-handling',
  PERFORMANCE: 'performance'
};

// Test results
const TEST_RESULTS = {
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  WARNING: 'warning'
};

class OfflineTestingSuite {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
    this.currentTest = null;
    this.testCallbacks = [];
  }

  /**
   * Run complete test suite
   */
  async runFullTestSuite() {
    if (this.isRunning) {
      throw new Error('Test suite is already running');
    }

    this.isRunning = true;
    this.testResults = [];
    
    console.log('[OfflineTesting] Starting full test suite');
    
    try {
      // Run all test categories
      await this.runCacheTests();
      await this.runStorageTests();
      await this.runOfflineDetectionTests();
      await this.runSyncTests();
      await this.runErrorHandlingTests();
      await this.runPerformanceTests();
      
      const summary = this.generateTestSummary();
      console.log('[OfflineTesting] Test suite completed:', summary);
      
      return summary;
    } finally {
      this.isRunning = false;
      this.currentTest = null;
    }
  }

  /**
   * Run cache tests
   */
  async runCacheTests() {
    const testCategory = TEST_TYPES.CACHE;
    
    await this.runTest('Cache - Store and Retrieve', async () => {
      const testData = { id: 'test', data: 'test data', timestamp: Date.now() };
      
      // Store test data
      await cacheManager.setCache('FLIGHT_SEARCH', 'test-key', testData, cacheManager.CACHE_TYPES.FLIGHT_SEARCH);
      
      // Retrieve test data
      const retrieved = await cacheManager.getFromCache('FLIGHT_SEARCH', 'test-key');
      
      if (!retrieved || retrieved.data.data !== testData.data) {
        throw new Error('Cache storage/retrieval failed');
      }
      
      return true;
    }, testCategory);

    await this.runTest('Cache - Expiration', async () => {
      const testData = { id: 'expire-test', data: 'expire data' };
      
      // Store with very short TTL
      const shortTTLConfig = { ...cacheManager.CACHE_TYPES.FLIGHT_SEARCH, maxAge: 100 };
      await cacheManager.setCache('FLIGHT_SEARCH', 'expire-key', testData, shortTTLConfig);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Try to retrieve expired data
      const retrieved = await cacheManager.getFromCache('FLIGHT_SEARCH', 'expire-key');
      
      if (retrieved) {
        throw new Error('Cache expiration not working');
      }
      
      return true;
    }, testCategory);

    await this.runTest('Cache - Stale-While-Revalidate', async () => {
      const testData = { id: 'stale-test', data: 'stale data' };
      
      // Store test data
      await cacheManager.setCache('FLIGHT_SEARCH', 'stale-key', testData, cacheManager.CACHE_TYPES.FLIGHT_SEARCH);
      
      // Manually make data stale (simulate time passing)
      const cache = await cacheManager.getFromCache('FLIGHT_SEARCH', 'stale-key');
      cache.timestamp = Date.now() - (cacheManager.CACHE_TYPES.FLIGHT_SEARCH.maxAge * 1.5);
      
      // Test stale-while-revalidate
      const result = await cacheManager.get(
        'FLIGHT_SEARCH',
        'stale-key',
        () => Promise.resolve(testData),
        cacheManager.CACHE_TYPES.FLIGHT_SEARCH
      );
      
      if (!result || result.data !== testData.data) {
        throw new Error('Stale-while-revalidate not working');
      }
      
      return true;
    }, testCategory);
  }

  /**
   * Run storage tests
   */
  async runStorageTests() {
    const testCategory = TEST_TYPES.STORAGE;
    
    await this.runTest('Storage - IndexedDB Operations', async () => {
      const testData = { id: 'storage-test', data: 'storage test data' };
      
      // Test storage
      await indexedDBManager.setUserPreference('test-key', testData);
      
      // Test retrieval
      const retrieved = await indexedDBManager.getUserPreference('test-key');
      
      if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(testData)) {
        throw new Error('IndexedDB storage/retrieval failed');
      }
      
      return true;
    }, testCategory);

    await this.runTest('Storage - Quota Management', async () => {
      // Get current quota
      const quotaBefore = await indexedDBManager.getStorageUsage();
      
      if (!quotaBefore) {
        throw new Error('Failed to get storage quota information');
      }
      
      // Add some test data
      const testData = new Array(1000).fill(0).map((_, i) => ({
        id: `test-${i}`,
        data: 'x'.repeat(1000) // 1KB per item
      }));
      
      for (const item of testData) {
        await indexedDBManager.setUserPreference(`bulk-test-${item.id}`, item);
      }
      
      // Check quota after
      const quotaAfter = await indexedDBManager.getStorageUsage();
      
      if (!quotaAfter || quotaAfter.usage <= quotaBefore.usage) {
        throw new Error('Storage quota tracking not working');
      }
      
      // Cleanup test data
      for (const item of testData) {
        await indexedDBManager.delete(STORES.USER_PREFERENCES, `bulk-test-${item.id}`);
      }
      
      return true;
    }, testCategory);

    await this.runTest('Storage - Cleanup', async () => {
      // Add test data that will expire
      const expiredData = {
        id: 'cleanup-test',
        data: 'cleanup test data',
        timestamp: Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days ago
      };
      
      await indexedDBManager.put(STORES.SEARCH_RESULTS, expiredData);
      
      // Run cleanup
      await storageQuotaManager.performCleanup('moderate');
      
      // Verify cleanup
      const cleaned = await indexedDBManager.get(STORES.SEARCH_RESULTS, 'cleanup-test');
      
      if (cleaned) {
        throw new Error('Storage cleanup not working');
      }
      
      return true;
    }, testCategory);
  }

  /**
   * Run offline detection tests
   */
  async runOfflineDetectionTests() {
    const testCategory = TEST_TYPES.OFFLINE_DETECTION;
    
    await this.runTest('Offline Detection - Status', async () => {
      const status = offlineManager.getStatus();
      
      if (typeof status.isOnline !== 'boolean') {
        throw new Error('Online status detection failed');
      }
      
      if (!status.connectionType) {
        throw new Error('Connection type detection failed');
      }
      
      return true;
    }, testCategory);

    await this.runTest('Offline Detection - Network Quality', async () => {
      const metrics = offlineManager.getNetworkMetrics();
      
      if (!metrics.networkQuality) {
        throw new Error('Network quality detection failed');
      }
      
      if (typeof metrics.estimateRequestTime !== 'function') {
        throw new Error('Request time estimation not available');
      }
      
      return true;
    }, testCategory);

    await this.runTest('Offline Detection - Connectivity Check', async () => {
      const isOnline = await offlineManager.checkConnectivity();
      
      if (typeof isOnline !== 'boolean') {
        throw new Error('Connectivity check failed');
      }
      
      return true;
    }, testCategory);
  }

  /**
   * Run sync tests
   */
  async runSyncTests() {
    const testCategory = TEST_TYPES.SYNC;
    
    await this.runTest('Sync - Queue Management', async () => {
      const testItem = {
        id: 'sync-test',
        data: 'sync test data',
        action: 'test'
      };
      
      // Add to sync queue
      const queueId = await backgroundSyncManager.addToSyncQueue(
        testItem,
        backgroundSyncManager.SYNC_TYPES.ANALYTICS,
        backgroundSyncManager.SYNC_PRIORITIES.HIGH
      );
      
      if (!queueId) {
        throw new Error('Failed to add item to sync queue');
      }
      
      // Check queue status
      const queueStatus = backgroundSyncManager.getSyncStatus();
      
      if (queueStatus.queueLength === 0) {
        throw new Error('Sync queue not working');
      }
      
      // Cleanup
      await backgroundSyncManager.clearSyncQueue();
      
      return true;
    }, testCategory);

    await this.runTest('Sync - Conflict Resolution', async () => {
      const cachedData = {
        id: 'conflict-test',
        data: 'cached data',
        version: 1
      };
      
      const freshData = {
        id: 'conflict-test',
        data: 'fresh data',
        version: 2
      };
      
      // Test conflict resolution
      const resolution = backgroundSyncManager.resolveSearchConflicts(cachedData, freshData);
      
      if (!resolution.resolved) {
        throw new Error('Conflict resolution failed');
      }
      
      // Should prefer fresh data
      if (resolution.resolvedData.version !== 2) {
        throw new Error('Conflict resolution not preferring fresh data');
      }
      
      return true;
    }, testCategory);
  }

  /**
   * Run error handling tests
   */
  async runErrorHandlingTests() {
    const testCategory = TEST_TYPES.ERROR_HANDLING;
    
    await this.runTest('Error Handling - Network Error', async () => {
      // Simulate network error
      const networkError = new TypeError('Failed to fetch');
      networkError.name = 'TypeError';
      networkError.message = 'Network error';
      
      // Test error analysis
      const errorInfo = offlineErrorHandler.analyzeError(networkError, {
        url: 'https://example.com/api/test'
      });
      
      if (!errorInfo || errorInfo.type !== offlineErrorHandler.ERROR_TYPES.NETWORK) {
        throw new Error('Network error analysis failed');
      }
      
      if (!errorInfo.userMessage || !errorInfo.recoverySuggestions) {
        throw new Error('Error user message/recovery not generated');
      }
      
      return true;
    }, testCategory);

    await this.runTest('Error Handling - Retry Logic', async () => {
      let attemptCount = 0;
      
      const failingFunction = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Simulated failure');
        }
        return 'success';
      };
      
      // Test retry logic
      const recovery = await offlineErrorHandler.attemptRetry({
        attempts: 0,
        maxRetries: 3
      }, {});
      
      if (!recovery.success || recovery.nextAttempt !== 1) {
        throw new Error('Retry logic not working');
      }
      
      return true;
    }, testCategory);
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    const testCategory = TEST_TYPES.PERFORMANCE;
    
    await this.runTest('Performance - Cache Hit Rate', async () => {
      // Reset metrics
      performanceMonitor.resetMetrics();
      
      // Simulate cache hits and misses
      performanceMonitor.recordCacheHit('FLIGHT_SEARCH', 100, true); // Hit
      performanceMonitor.recordCacheHit('FLIGHT_SEARCH', 200, false); // Miss
      performanceMonitor.recordCacheHit('FLIGHT_SEARCH', 150, true); // Hit
      
      // Get metrics
      const metrics = performanceMonitor.getMetrics(performanceMonitor.METRICS.CACHE_HIT_RATE);
      
      if (!metrics || metrics.totalRequests !== 3) {
        throw new Error('Cache hit rate tracking failed');
      }
      
      const expectedHitRate = 2 / 3; // 2 hits out of 3 requests
      const actualHitRate = metrics.hits / metrics.totalRequests;
      
      if (Math.abs(actualHitRate - expectedHitRate) > 0.01) {
        throw new Error('Cache hit rate calculation incorrect');
      }
      
      return true;
    }, testCategory);

    await this.runTest('Performance - Response Time', async () => {
      // Reset metrics
      performanceMonitor.resetMetrics();
      
      // Simulate response times
      performanceMonitor.recordResponseTime('FLIGHT_SEARCH', 150, false);
      performanceMonitor.recordResponseTime('FLIGHT_SEARCH', 200, false);
      performanceMonitor.recordResponseTime('FLIGHT_SEARCH', 100, true); // From cache
      
      // Get metrics
      const metrics = performanceMonitor.getMetrics(performanceMonitor.METRICS.RESPONSE_TIME);
      
      if (!metrics || metrics.samples.length !== 3) {
        throw new Error('Response time tracking failed');
      }
      
      if (typeof metrics.average !== 'number' || metrics.average <= 0) {
        throw new Error('Response time average calculation failed');
      }
      
      if (typeof metrics.p95 !== 'number' || metrics.p95 <= 0) {
        throw new Error('Response time p95 calculation failed');
      }
      
      return true;
    }, testCategory);
  }

  /**
   * Run individual test
   */
  async runTest(testName, testFunction, category) {
    const testResult = {
      name: testName,
      category,
      startTime: Date.now(),
      result: TEST_RESULTS.PASSED,
      error: null,
      duration: 0
    };
    
    this.currentTest = testName;
    
    try {
      console.log(`[OfflineTesting] Running test: ${testName}`);
      
      await testFunction();
      
      testResult.result = TEST_RESULTS.PASSED;
      console.log(`[OfflineTesting] Test passed: ${testName}`);
    } catch (error) {
      testResult.result = TEST_RESULTS.FAILED;
      testResult.error = error.message;
      console.error(`[OfflineTesting] Test failed: ${testName}`, error);
    } finally {
      testResult.duration = Date.now() - testResult.startTime;
      this.testResults.push(testResult);
      
      // Notify callbacks
      this.notifyTestCallbacks(testResult);
    }
  }

  /**
   * Generate test summary
   */
  generateTestSummary() {
    const summary = {
      totalTests: this.testResults.length,
      passed: 0,
      failed: 0,
      warnings: 0,
      skipped: 0,
      duration: 0,
      byCategory: {},
      timestamp: Date.now()
    };
    
    this.testResults.forEach(test => {
      summary[test.result]++;
      summary.duration += test.duration;
      
      if (!summary.byCategory[test.category]) {
        summary.byCategory[test.category] = {
          total: 0,
          passed: 0,
          failed: 0
        };
      }
      
      summary.byCategory[test.category].total++;
      summary.byCategory[test.category][test.result]++;
    });
    
    summary.successRate = (summary.passed / summary.totalTests) * 100;
    
    return summary;
  }

  /**
   * Add test callback
   */
  addTestCallback(callback) {
    this.testCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.testCallbacks.indexOf(callback);
      if (index > -1) {
        this.testCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify test callbacks
   */
  notifyTestCallbacks(testResult) {
    this.testCallbacks.forEach(callback => {
      try {
        callback(testResult);
      } catch (error) {
        console.error('[OfflineTesting] Test callback error:', error);
      }
    });
  }

  /**
   * Get test results
   */
  getTestResults() {
    return this.testResults;
  }

  /**
   * Clear test results
   */
  clearTestResults() {
    this.testResults = [];
    console.log('[OfflineTesting] Test results cleared');
  }

  /**
   * Export test results
   */
  exportTestResults() {
    const summary = this.generateTestSummary();
    
    return {
      summary,
      detailed: this.testResults,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Run specific test category
   */
  async runTestCategory(category) {
    switch (category) {
      case TEST_TYPES.CACHE:
        await this.runCacheTests();
        break;
      case TEST_TYPES.STORAGE:
        await this.runStorageTests();
        break;
      case TEST_TYPES.OFFLINE_DETECTION:
        await this.runOfflineDetectionTests();
        break;
      case TEST_TYPES.SYNC:
        await this.runSyncTests();
        break;
      case TEST_TYPES.ERROR_HANDLING:
        await this.runErrorHandlingTests();
        break;
      case TEST_TYPES.PERFORMANCE:
        await this.runPerformanceTests();
        break;
      default:
        throw new Error(`Unknown test category: ${category}`);
    }
    
    return this.testResults.filter(test => test.category === category);
  }
}

// Create singleton instance
const offlineTestingSuite = new OfflineTestingSuite();

// React hook for offline testing
export function useOfflineTesting() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);

  const runFullTestSuite = useCallback(async () => {
    setIsRunning(true);
    setCurrentTest('Running full test suite...');
    
    try {
      const summary = await offlineTestingSuite.runFullTestSuite();
      setTestResults(offlineTestingSuite.getTestResults());
      return summary;
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  }, []);

  const runTestCategory = useCallback(async (category) => {
    setIsRunning(true);
    setCurrentTest(`Running ${category} tests...`);
    
    try {
      const results = await offlineTestingSuite.runTestCategory(category);
      setTestResults(prev => [...prev, ...results]);
      return results;
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  }, []);

  const clearResults = useCallback(() => {
    offlineTestingSuite.clearTestResults();
    setTestResults([]);
  }, []);

  const exportResults = useCallback(() => {
    return offlineTestingSuite.exportTestResults();
  }, []);

  useEffect(() => {
    const unsubscribe = offlineTestingSuite.addTestCallback((testResult) => {
      setTestResults(prev => [...prev, testResult]);
    });

    return unsubscribe;
  }, []);

  return {
    testResults,
    isRunning,
    currentTest,
    runFullTestSuite,
    runTestCategory,
    clearResults,
    exportResults
  };
}

export default offlineTestingSuite;
export { TEST_TYPES, TEST_RESULTS };