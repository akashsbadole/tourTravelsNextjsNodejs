/**
 * Comprehensive Testing Framework for Flight Search Error Handling
 * Tests error scenarios, edge cases, and recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  ErrorFactory, 
  FlightSearchError, 
  ValidationError, 
  NetworkError, 
  APIError,
  DataError,
  BusinessError,
  SystemError,
  ExternalServiceError,
  ErrorRecoveryManager
} from '@/lib/errors/flight-search-errors';
import { 
  edgeCaseHandler,
  AirportCodeValidator,
  DateValidator,
  PassengerValidator,
  CurrencyValidator
} from '@/lib/flight-search/edge-case-handler';
import { 
  gracefulDegradationManager,
  FallbackCacheManager,
  StaticDataProvider,
  AlternativeSearchStrategy,
  RetryManager,
  CircuitBreaker
} from '@/lib/flight-search/graceful-degradation';
import { 
  flightSearchMonitoring,
  StructuredLogger,
  PerformanceMonitor,
  ErrorTracker,
  AlertManager,
  MetricsCollector
} from '@/lib/monitoring/flight-search-monitoring';

// Mock fetch for network tests
global.fetch = jest.fn();

describe('Error Classification System', () => {
  describe('ErrorFactory', () => {
    it('should create validation error for invalid airport code', () => {
      const error = ErrorFactory.invalidAirportCode('XYZ', 'origin');
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.field).toBe('origin');
      expect(error.message).toContain('Invalid airport code: XYZ');
      expect(error.category).toBe('validation');
      expect(error.suggestions).toContain('Enter a valid 3-letter airport code');
    });

    it('should create validation error for past date', () => {
      const pastDate = new Date('2020-01-01');
      const error = ErrorFactory.pastDate(pastDate, 'departureDate');
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.field).toBe('departureDate');
      expect(error.message).toContain('Date cannot be in the past');
    });

    it('should create network timeout error', () => {
      const error = ErrorFactory.networkTimeout(5000);
      
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.context.timeout).toBe(5000);
      expect(error.retryable).toBe(true);
      expect(error.maxRetries).toBe(2);
    });

    it('should create rate limit error', () => {
      const resetTime = Date.now() + 60000;
      const error = ErrorFactory.rateLimitExceeded(resetTime);
      
      expect(error).toBeInstanceOf(APIError);
      expect(error.statusCode).toBe(429);
      expect(error.context.resetTime).toBe(resetTime);
    });

    it('should create no flights found error', () => {
      const searchParams = { origin: 'JFK', destination: 'LAX' };
      const error = ErrorFactory.noFlightsFound(searchParams);
      
      expect(error).toBeInstanceOf(DataError);
      expect(error.message).toContain('No flights found');
      expect(error.context.searchParams).toEqual(searchParams);
    });
  });

  describe('FlightSearchError', () => {
    it('should create structured error response', () => {
      const error = new FlightSearchError('Test error', {
        category: 'validation',
        severity: 'low',
        errorCode: 'TEST_ERROR'
      });

      const response = error.toResponse();
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('TEST_ERROR');
      expect(response.error.category).toBe('validation');
      expect(response.error.severity).toBe('low');
      expect(response.error.timestamp).toBeDefined();
    });

    it('should handle retry logic correctly', () => {
      const error = new FlightSearchError('Test error', {
        maxRetries: 3,
        currentRetry: 1
      });

      expect(error.canRetry()).toBe(true);
      
      const retryError = error.createRetry();
      expect(retryError.currentRetry).toBe(2);
      expect(retryError.canRetry()).toBe(true);
      
      const finalError = retryError.createRetry().createRetry().createRetry();
      expect(finalError.canRetry()).toBe(false);
    });
  });

  describe('ErrorRecoveryManager', () => {
    let recoveryManager;

    beforeEach(() => {
      recoveryManager = new ErrorRecoveryManager();
    });

    it('should handle retry strategy with exponential backoff', async () => {
      const error = new FlightSearchError('Test error', {
        recoveryStrategy: 'retry',
        currentRetry: 1
      });

      const recovery = await recoveryManager.handleRecovery(error);
      
      expect(recovery.success).toBe(true);
      expect(recovery.retryAttempt).toBe(2);
      expect(recovery.delay).toBe(2000); // 2^1 * 1000
    });

    it('should handle fallback strategy', async () => {
      const error = new FlightSearchError('Test error', {
        recoveryStrategy: 'fallback'
      });

      const recovery = await recoveryManager.handleRecovery(error);
      
      expect(recovery.success).toBe(true);
      expect(recovery.fallbackUsed).toBe(true);
    });

    it('should handle user action strategy', async () => {
      const error = new FlightSearchError('Test error', {
        recoveryStrategy: 'user_action',
        userMessage: 'Please fix your input'
      });

      const recovery = await recoveryManager.handleRecovery(error);
      
      expect(recovery.success).toBe(false);
      expect(recovery.requiresUserAction).toBe(true);
      expect(recovery.message).toBe('Please fix your input');
    });
  });
});

describe('Edge Case Handling', () => {
  let airportValidator, dateValidator, passengerValidator;

  beforeEach(() => {
    airportValidator = new AirportCodeValidator();
    dateValidator = new DateValidator();
    passengerValidator = new PassengerValidator();
  });

  describe('AirportCodeValidator', () => {
    it('should validate correct airport code format', async () => {
      const result = await airportValidator.validateExists('JFK');
      
      expect(result.valid).toBe(true);
      expect(result.code).toBe('JFK');
    });

    it('should reject invalid airport code format', async () => {
      const result = await airportValidator.validateFormat('XX');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exactly 3 characters');
    });

    it('should reject same origin and destination', () => {
      const result = airportValidator.validateOriginDestination('JFK', 'JFK');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Origin and destination cannot be same');
    });
  });

  describe('DateValidator', () => {
    it('should validate future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const result = dateValidator.validateNotPast(futureDate);
      expect(result.valid).toBe(true);
    });

    it('should reject past date', () => {
      const pastDate = new Date('2020-01-01');
      
      const result = dateValidator.validateNotPast(pastDate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Date cannot be in the past');
    });

    it('should validate return date after departure', () => {
      const departure = new Date('2024-12-15');
      const returnDate = new Date('2024-12-20');
      
      const result = dateValidator.validateReturnDate(departure, returnDate);
      expect(result.valid).toBe(true);
    });

    it('should reject return date before departure', () => {
      const departure = new Date('2024-12-20');
      const returnDate = new Date('2024-12-15');
      
      const result = dateValidator.validateReturnDate(departure, returnDate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Return date must be after departure date');
    });
  });

  describe('PassengerValidator', () => {
    it('should validate valid passenger counts', () => {
      const passengers = { adults: 2, children: 1, infants: 0 };
      
      const result = passengerValidator.validateAll(passengers);
      expect(result.valid).toBe(true);
      expect(result.passengers).toEqual(passengers);
    });

    it('should reject infant without adult', () => {
      const passengers = { adults: 0, children: 0, infants: 1 };
      
      const result = passengerValidator.validateAll(passengers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('At least one adult is required');
    });

    it('should reject too many infants per adult', () => {
      const passengers = { adults: 1, children: 0, infants: 2 };
      
      const result = passengerValidator.validateAll(passengers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Each adult can accompany maximum one infant');
    });

    it('should reject excessive total passengers', () => {
      const passengers = { adults: 5, children: 3, infants: 2 }; // Total 10
      
      const result = passengerValidator.validateAll(passengers);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum 9 passengers allowed');
    });
  });

  describe('EdgeCaseHandler Integration', () => {
    it('should validate complete search parameters', async () => {
      const searchParams = {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2024-12-15',
        returnDate: '2024-12-22',
        passengers: { adults: 2, children: 1, infants: 0 },
        cabinClass: 'economy'
      };

      const result = await edgeCaseHandler.validateSearchParams(searchParams);
      
      expect(result.valid).toBe(true);
      expect(result.validParams.origin).toBe('JFK');
      expect(result.validParams.destination).toBe('LAX');
    });

    it('should handle multiple validation errors', async () => {
      const searchParams = {
        origin: 'XX', // Invalid
        destination: 'JFK',
        departureDate: '2020-01-01', // Past
        passengers: { adults: 0, infants: 1 }, // No adult with infant
        cabinClass: 'invalid' // Invalid class
      };

      const result = await edgeCaseHandler.validateSearchParams(searchParams);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
      expect(result.hasErrors).toBe(true);
    });
  });
});

describe('Graceful Degradation', () => {
  let fallbackCache, staticProvider, retryManager, circuitBreaker;

  beforeEach(() => {
    fallbackCache = new FallbackCacheManager();
    staticProvider = new StaticDataProvider();
    retryManager = new RetryManager();
    circuitBreaker = new CircuitBreaker();
  });

  describe('FallbackCacheManager', () => {
    it('should cache and retrieve data', () => {
      const key = 'test-key';
      const data = { flights: ['flight1', 'flight2'] };
      
      fallbackCache.set(key, data);
      const retrieved = fallbackCache.get(key);
      
      expect(retrieved).toEqual(data);
    });

    it('should handle cache expiration', (done) => {
      const key = 'test-key';
      const data = { flights: ['flight1'] };
      const shortTTL = 100; // 100ms
      
      fallbackCache.set(key, data, shortTTL);
      
      setTimeout(() => {
        const retrieved = fallbackCache.get(key);
        expect(retrieved).toBeNull();
        done();
      }, 150);
    });

    it('should clear expired entries', () => {
      const key1 = 'key1';
      const key2 = 'key2';
      
      fallbackCache.set(key1, { data: 'test1' }, 50);
      fallbackCache.set(key2, { data: 'test2' }, 200);
      
      setTimeout(() => {
        fallbackCache.clearExpired();
        expect(fallbackCache.has(key1)).toBe(false);
        expect(fallbackCache.has(key2)).toBe(true);
      }, 100);
    });
  });

  describe('RetryManager', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const failingFunction = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await retryManager.executeWithRetry(failingFunction, {
        maxRetries: 3
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should stop retrying after max attempts', async () => {
      const alwaysFailingFunction = jest.fn(() => {
        throw new Error('Permanent failure');
      });

      await expect(
        retryManager.executeWithRetry(alwaysFailingFunction, { maxRetries: 2 })
      ).rejects.toThrow('Permanent failure');

      expect(alwaysFailingFunction).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should respect retry condition', async () => {
      const nonRetryableError = new Error('Non-retryable');
      const failingFunction = jest.fn(() => {
        throw nonRetryableError;
      });

      await expect(
        retryManager.executeWithRetry(failingFunction, {
          maxRetries: 2,
          retryCondition: () => false
        })
      ).rejects.toThrow('Non-retryable');

      expect(failingFunction).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('CircuitBreaker', () => {
    it('should allow operations when closed', async () => {
      const successFunction = jest.fn(() => 'success');
      
      const result = await circuitBreaker.execute(successFunction);
      
      expect(result).toBe('success');
      expect(successFunction).toHaveBeenCalledTimes(1);
    });

    it('should open after failure threshold', async () => {
      const failingFunction = jest.fn(() => {
        throw new Error('Service failure');
      });

      // Fail enough times to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(failingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe('OPEN');
    });

    it('should reject operations when open', async () => {
      const failingFunction = jest.fn(() => {
        throw new Error('Service failure');
      });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(failingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      const testFunction = jest.fn(() => 'should not execute');
      
      await expect(circuitBreaker.execute(testFunction)).rejects.toThrow();
      expect(testFunction).not.toHaveBeenCalled();
    });
  });
});

describe('Monitoring and Logging', () => {
  let logger, performanceMonitor, errorTracker, metricsCollector;

  beforeEach(() => {
    logger = new StructuredLogger({ enableConsole: false });
    performanceMonitor = new PerformanceMonitor(logger);
    errorTracker = new ErrorTracker(logger);
    metricsCollector = new MetricsCollector();
  });

  describe('StructuredLogger', () => {
    it('should create structured log entries', () => {
      const logEntry = logger.createLogEntry('info', 'Test message', {
        key: 'value'
      });

      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('Test message');
      expect(logEntry.context.key).toBe('value');
      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.traceId).toBeDefined();
    });

    it('should filter logs by level', () => {
      const debugLogger = new StructuredLogger({ 
        logLevel: 'warn',
        enableConsole: false 
      });

      const debugLog = debugLogger.debug('Debug message');
      const warnLog = debugLogger.warn('Warning message');

      expect(debugLog).toBeUndefined(); // Filtered out
      expect(warnLog).toBeDefined(); // Included
    });
  });

  describe('PerformanceMonitor', () => {
    it('should track operation duration', () => {
      const operationId = performanceMonitor.startOperation('test_operation', 'search');
      
      // Simulate some work
      setTimeout(() => {
        const metric = performanceMonitor.endOperation(operationId, 'result');
        
        expect(metric.operationType).toBe('search');
        expect(metric.success).toBe(true);
        expect(metric.duration).toBeGreaterThan(0);
        expect(metric.result).toBe('result');
      }, 10);
    });

    it('should calculate performance statistics', () => {
      // Add some sample metrics
      performanceMonitor.startOperation('op1', 'search');
      performanceMonitor.endOperation('op1', null, new Error('test'));
      
      performanceMonitor.startOperation('op2', 'search');
      performanceMonitor.endOperation('op2', 'result');

      const stats = performanceMonitor.getStats('search');
      
      expect(stats.totalOperations).toBe(2);
      expect(stats.successRate).toBe(0.5);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });
  });

  describe('ErrorTracker', () => {
    it('should track errors with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'search' };

      const errorEntry = errorTracker.trackError(error, context);

      expect(errorEntry.message).toBe('Test error');
      expect(errorEntry.context.userId).toBe('123');
      expect(errorEntry.context.action).toBe('search');
      expect(errorEntry.id).toBeDefined();
    });

    it('should detect error patterns', () => {
      const error1 = new Error('Invalid airport code: JFK');
      const error2 = new Error('Invalid airport code: LAX');

      errorTracker.trackError(error1);
      const errorEntry2 = errorTracker.trackError(error2);

      expect(errorEntry2.pattern).toContain('Invalid airport code: <airport_code>');
    });

    it('should generate error statistics', () => {
      const error1 = new Error('Network timeout');
      const error2 = new Error('Network timeout');
      const error3 = new Error('Validation failed');

      errorTracker.trackError(error1);
      errorTracker.trackError(error2);
      errorTracker.trackError(error3);

      const stats = errorTracker.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCategory.network).toBe(2);
      expect(stats.errorsByCategory.validation).toBe(1);
    });
  });

  describe('MetricsCollector', () => {
    it('should track counters', () => {
      metricsCollector.incrementCounter('search_requests', { origin: 'JFK' });
      metricsCollector.incrementCounter('search_requests', { origin: 'LAX' });
      metricsCollector.incrementCounter('search_requests', { origin: 'JFK' });

      const metrics = metricsCollector.getMetrics();
      
      expect(metrics.counters['search_requests{origin="JFK"}']).toBe(2);
      expect(metrics.counters['search_requests{origin="LAX"}']).toBe(1);
    });

    it('should track gauges', () => {
      metricsCollector.setGauge('active_connections', {}, 5);
      metricsCollector.setGauge('active_connections', {}, 3);

      const metrics = metricsCollector.getMetrics();
      
      expect(metrics.gauges['active_connections']).toBe(3);
    });

    it('should track histograms', () => {
      metricsCollector.recordHistogram('response_time', {}, 100);
      metricsCollector.recordHistogram('response_time', {}, 200);
      metricsCollector.recordHistogram('response_time', {}, 150);

      const metrics = metricsCollector.getMetrics();
      const histogram = metrics.histograms['response_time'];
      
      expect(histogram.count).toBe(3);
      expect(histogram.min).toBe(100);
      expect(histogram.max).toBe(200);
      expect(histogram.avg).toBe(150);
    });
  });
});

describe('Integration Tests', () => {
  describe('End-to-End Error Flow', () => {
    it('should handle complete error scenario with recovery', async () => {
      // Mock network failure
      fetch.mockRejectedValueOnce(new Error('Network unreachable'));

      const searchParams = {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2024-12-15',
        passengers: { adults: 1 }
      };

      try {
        // This would be the actual search call
        await gracefulDegradationManager.executeSearch(searchParams, async () => {
          throw new Error('Network unreachable');
        });
      } catch (error) {
        expect(error).toBeDefined();
        
        // Verify error was tracked
        const dashboardData = flightSearchMonitoring.getDashboardData();
        expect(dashboardData.errors.totalErrors).toBeGreaterThan(0);
      }
    });
  });

  describe('Chaos Engineering Tests', () => {
    it('should handle service degradation gracefully', async () => {
      // Simulate partial service failure
      const circuitBreaker = new CircuitBreaker({ failureThreshold: 2 });
      
      const flakyService = jest.fn(() => {
        if (Math.random() > 0.5) {
          throw new Error('Service unstable');
        }
        return 'success';
      });

      const results = [];
      for (let i = 0; i < 10; i++) {
        try {
          const result = await circuitBreaker.execute(flakyService);
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }

      // Should have some successes and some failures
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;
      
      expect(successes + failures).toBe(10);
      expect(successes).toBeGreaterThan(0);
      expect(failures).toBeGreaterThan(0);
    });
  });
});