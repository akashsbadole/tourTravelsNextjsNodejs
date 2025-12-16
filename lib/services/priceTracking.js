import "server-only";
import {
  getManyDocs,
  getOneDoc,
  updateOneDoc,
  createDoc
} from "@/lib/db/operations";
import { PriceAlert, PriceHistory, NotificationTracking } from "@/lib/db/models";
import { getFlights } from "./flights";
import {
  checkAlertConditions,
  shouldSendNotification,
  hasExceededDailyLimit,
  calculatePriceChange
} from "@/lib/utils/priceAlertUtils";
import { sendPriceAlertNotification } from "./notifications";
import { getPerformanceOptimizer } from "@/lib/services/performanceOptimizer";

/**
 * Price Tracking Engine
 * Handles real-time price monitoring and alert triggering
 */
export class PriceTrackingEngine {
  constructor(options = {}) {
    this.options = {
      checkInterval: 5 * 60 * 1000, // 5 minutes
      batchSize: 100,
      maxConcurrentChecks: 5,
      enableRealTime: true,
      priceHistoryRetention: 30, // days
      ...options
    };
    
    this.isRunning = false;
    this.checkTimer = null;
    this.activeAlerts = new Map();
    
    // Initialize performance optimizer
    this.performanceOptimizer = getPerformanceOptimizer();
  }

  /**
   * Start the price tracking engine
   */
  async start() {
    if (this.isRunning) {
      console.warn('Price tracking engine is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting price tracking engine');

    try {
      // Load active alerts into memory
      await this.loadActiveAlerts();

      // Start periodic checking
      if (this.options.enableRealTime) {
        this.checkTimer = setInterval(async () => {
          await this.performPriceCheck();
        }, this.options.checkInterval);

        // Perform initial check
        await this.performPriceCheck();
      }

      console.log('Price tracking engine started successfully');
    } catch (error) {
      console.error('Failed to start price tracking engine:', error);
      this.stop();
    }
  }

  /**
   * Stop the price tracking engine
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    console.log('Price tracking engine stopped');
  }

  /**
   * Load active alerts into memory
   */
  async loadActiveAlerts() {
    try {
      const alerts = await getManyDocs(
        "PriceAlert",
        {
          status: "active",
          expiresAt: { $gt: new Date() },
        },
        ["user"],
        60 // 1 minute cache
      );

      this.activeAlerts.clear();
      alerts.forEach(alert => {
        this.activeAlerts.set(alert._id.toString(), alert);
      });

      console.log(`Loaded ${alerts.length} active price alerts`);
    } catch (error) {
      console.error('Failed to load active alerts:', error);
    }
  }

  /**
   * Perform price check cycle
   */
  async performPriceCheck() {
    if (!this.isRunning || this.activeAlerts.size === 0) {
      return;
    }

    const checkStartTime = Date.now();
    let checkStats = {
      alertsChecked: 0,
      priceUpdates: 0,
      alertsTriggered: 0,
      errors: 0,
      duration: 0
    };

    try {
      console.log(`Starting optimized price check for ${this.activeAlerts.size} alerts`);

      // Use performance optimizer for batch processing
      const alertIds = Array.from(this.activeAlerts.keys());
      const batchResults = await this.performanceOptimizer.batchPriceChecks(alertIds);
      
      if (batchResults.success) {
        // Aggregate results from batch processing
        for (const result of batchResults.results) {
          checkStats.alertsChecked += result.alertsChecked || 0;
          checkStats.priceUpdates += result.priceUpdates || 0;
          checkStats.alertsTriggered += result.alertsTriggered || 0;
          checkStats.errors += result.errors || 0;
          
          // Update alerts in memory with results
          if (result.updatedAlert) {
            this.activeAlerts.set(result.updatedAlert._id.toString(), result.updatedAlert);
          }
        }
      } else {
        // Fallback to traditional batch processing if optimizer fails
        console.warn('Performance optimizer failed, falling back to traditional processing');
        const batches = this.createBatches(alertIds, this.options.batchSize);

        for (const batch of batches) {
          const batchResults = await this.processBatch(batch);
          
          checkStats.alertsChecked += batchResults.alertsChecked || 0;
          checkStats.priceUpdates += batchResults.priceUpdates || 0;
          checkStats.alertsTriggered += batchResults.alertsTriggered || 0;
          checkStats.errors += batchResults.errors || 0;

          // Small delay between batches to avoid overwhelming APIs
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      checkStats.duration = Date.now() - checkStartTime;

      console.log('Optimized price check completed:', checkStats);

      // Update alert metrics
      await this.updateAlertMetrics(checkStats);

    } catch (error) {
      console.error('Price check error:', error);
      checkStats.errors++;
    }
  }

  /**
   * Process a batch of alerts
   * @param {Array} alertIds - Array of alert IDs
   * @returns {Object} Batch processing results
   */
  async processBatch(alertIds) {
    const batchResults = {
      alertsChecked: 0,
      priceUpdates: 0,
      alertsTriggered: 0,
      errors: 0
    };

    try {
      // Get alert details
      const alerts = await getManyDocs(
        "PriceAlert",
        { _id: { $in: alertIds } },
        ["user"]
      );

      for (const alert of alerts) {
        try {
          const result = await this.checkAlertPrice(alert);
          
          batchResults.alertsChecked++;
          
          if (result.priceUpdated) {
            batchResults.priceUpdates++;
          }
          
          if (result.alertTriggered) {
            batchResults.alertsTriggered++;
          }

          // Update alert in memory
          this.activeAlerts.set(alert._id.toString(), result.updatedAlert);

        } catch (error) {
          console.error(`Error checking alert ${alert._id}:`, error);
          batchResults.errors++;
        }
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      batchResults.errors++;
    }

    return batchResults;
  }

  /**
   * Check price for a single alert
   * @param {Object} alert - Price alert object
   * @returns {Object} Check results
   */
  async checkAlertPrice(alert) {
    const result = {
      priceUpdated: false,
      alertTriggered: false,
      updatedAlert: alert,
    };

    try {
      // Get current flight prices
      const currentPrices = await this.getCurrentFlightPrices(alert.searchCriteria);
      
      if (currentPrices.length === 0) {
        // No flights found, mark as potentially expired
        result.updatedAlert = await this.updateAlertStatus(alert._id, 'active', {
          metrics: {
            ...alert.metrics,
            totalChecks: (alert.metrics?.totalChecks || 0) + 1,
            lastCheckedAt: new Date(),
          }
        });
        return result;
      }

      // Find best price
      const bestPrice = this.findBestPrice(currentPrices);
      const previousPrice = alert.currentBestPrice;

      // Update price history
      await this.updatePriceHistory(alert, bestPrice, currentPrices);

      // Check if price changed
      const priceChanged = !previousPrice || 
                       previousPrice.amount !== bestPrice.amount ||
                       previousPrice.currency !== bestPrice.currency;

      if (priceChanged) {
        result.priceUpdated = true;

        // Update alert with new best price
        const priceHistory = [
          ...(alert.metrics?.priceHistory || []),
          {
            price: bestPrice.amount,
            currency: bestPrice.currency,
            recordedAt: new Date(),
            flightId: bestPrice.flightId,
          }
        ].slice(-100); // Keep last 100 price points

        result.updatedAlert = await updateOneDoc(
          "PriceAlert",
          { _id: alert._id },
          {
            currentBestPrice: {
              amount: bestPrice.amount,
              currency: bestPrice.currency,
              recordedAt: new Date(),
              flightId: bestPrice.flightId,
              airlineCode: bestPrice.airlineCode,
            },
            metrics: {
              ...alert.metrics,
              totalChecks: (alert.metrics?.totalChecks || 0) + 1,
              lastCheckedAt: new Date(),
              averageCheckDuration: this.calculateAverageCheckDuration(
                alert.metrics?.averageCheckDuration,
                Date.now() - new Date().getTime()
              ),
              priceHistory,
            }
          }
        );

        // Check alert conditions
        const conditionCheck = checkAlertConditions(result.updatedAlert, bestPrice, previousPrice);
        
        if (conditionCheck.triggered && 
            !hasExceededDailyLimit(result.updatedAlert) &&
            shouldSendNotification(result.updatedAlert.notificationPreferences)) {
          
          result.alertTriggered = true;

          // Send notifications
          await this.sendNotifications(result.updatedAlert, bestPrice, conditionCheck.triggers);

          // Update alert as triggered
          result.updatedAlert = await updateOneDoc(
            "PriceAlert",
            { _id: alert._id },
            {
              status: 'triggered',
              lastTriggeredAt: new Date(),
              triggerCount: (alert.triggerCount || 0) + 1,
              notificationsSent: [
                ...(result.updatedAlert.notificationsSent || []),
                {
                  type: 'email',
                  sentAt: new Date(),
                  price: bestPrice,
                  flightId: bestPrice.flightId,
                  success: true,
                }
              ]
            }
          );
        }
      }

    } catch (error) {
      console.error(`Error checking price for alert ${alert._id}:`, error);
    }

    return result;
  }

  /**
   * Get current flight prices for search criteria
   * @param {Object} searchCriteria - Flight search criteria
   * @returns {Array} Array of flight prices
   */
  async getCurrentFlightPrices(searchCriteria) {
    try {
      // Generate cache key for search criteria
      const cacheKey = this.generatePriceCacheKey(searchCriteria);
      
      // Try to get from performance optimizer cache first
      const { data: cachedPrices, fromCache } = await this.performanceOptimizer.getCachedPriceData(cacheKey);
      
      if (fromCache && cachedPrices) {
        console.log(`Using cached prices for ${cacheKey}`);
        return cachedPrices;
      }
      
      // Fetch fresh data if not in cache
      const flights = await getFlights(
        {
          departureAirportCode: searchCriteria.origin.airportCode,
          arrivalAirportCode: searchCriteria.destination.airportCode,
          departureDate: searchCriteria.departureDate,
          returnDate: searchCriteria.returnDate,
          tripType: searchCriteria.tripType,
          flightClass: searchCriteria.cabinClass,
          passengersObj: searchCriteria.passengers,
          filters: searchCriteria.filters || {},
        },
        [], // No bookmarked flights
        {} // No metadata
      );

      const prices = flights.map(flight => ({
        flightId: flight._id?.toString(),
        flightCode: flight.flightCode,
        airlineCode: flight.carrierInCharge?.code,
        price: flight.fareBreakdowns?.total || 0,
        currency: "USD", // Should be dynamic
        departureTime: flight.segmentIds?.[0]?.departureTime,
        arrivalTime: flight.segmentIds?.[flight.segmentIds.length - 1]?.arrivalTime,
        stops: flight.segmentIds?.length - 1 || 0,
        duration: flight.totalDuration,
      }));
      
      // Cache the results with appropriate TTL based on route volatility
      const ttl = this.calculateCacheTTL(searchCriteria);
      await this.performanceOptimizer.redis.set(cacheKey, prices, ttl);
      
      return prices;
    } catch (error) {
      console.error('Error getting current flight prices:', error);
      return [];
    }
  }
  
  /**
   * Generate cache key for price search
   * @param {Object} searchCriteria - Flight search criteria
   * @returns {string} Cache key
   */
  generatePriceCacheKey(searchCriteria) {
    const keyData = {
      origin: searchCriteria.origin.airportCode,
      destination: searchCriteria.destination.airportCode,
      departureDate: searchCriteria.departureDate.toISOString().split('T')[0],
      returnDate: searchCriteria.returnDate?.toISOString().split('T')[0],
      cabinClass: searchCriteria.cabinClass,
      tripType: searchCriteria.tripType,
    };
    
    return `prices:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }
  
  /**
   * Calculate cache TTL based on route characteristics
   * @param {Object} searchCriteria - Flight search criteria
   * @returns {number} TTL in seconds
   */
  calculateCacheTTL(searchCriteria) {
    // Default TTL
    let ttl = 300; // 5 minutes
    
    // Longer TTL for future dates (less volatility)
    const daysUntilDeparture = Math.ceil(
      (new Date(searchCriteria.departureDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilDeparture > 30) {
      ttl = 1800; // 30 minutes
    } else if (daysUntilDeparture > 7) {
      ttl = 900; // 15 minutes
    }
    
    // Shorter TTL for popular routes (more volatility)
    const popularRoutes = ['NYC-LON', 'LON-PAR', 'LAX-NYC', 'NYC-MIA'];
    const route = `${searchCriteria.origin.airportCode}-${searchCriteria.destination.airportCode}`;
    
    if (popularRoutes.includes(route)) {
      ttl = Math.min(ttl, 180); // 3 minutes max
    }
    
    return ttl;
  }

  /**
   * Find best price from array of flight prices
   * @param {Array} prices - Array of flight prices
   * @returns {Object} Best price information
   */
  findBestPrice(prices) {
    if (prices.length === 0) {
      return null;
    }

    return prices.reduce((best, current) => 
      current.price < best.price ? current : best
    );
  }

  /**
   * Update price history for an alert
   * @param {Object} alert - Price alert object
   * @param {Object} bestPrice - Current best price
   * @param {Array} allPrices - All current prices
   */
  async updatePriceHistory(alert, bestPrice, allPrices) {
    try {
      const historyKey = this.generateHistoryKey(alert.searchCriteria);
      
      // Update or create price history record
      await updateOneDoc(
        "PriceHistory",
        { 
          flightId: bestPrice.flightId,
          cabinClass: alert.searchCriteria.cabinClass,
        },
        {
          $set: {
            currentPrice: {
              amount: bestPrice.amount,
              currency: bestPrice.currency,
              recordedAt: new Date(),
              source: 'api',
              flightId: bestPrice.flightId,
            },
            $push: {
              priceHistory: {
                price: bestPrice.amount,
                currency: bestPrice.currency,
                recordedAt: new Date(),
                source: 'api',
                flightId: bestPrice.flightId,
              }
            },
            $setOnInsert: {
              flightId: bestPrice.flightId,
              flightCode: bestPrice.flightCode,
              airlineCode: bestPrice.airlineCode,
              route: {
                origin: alert.searchCriteria.origin,
                destination: alert.searchCriteria.destination,
              },
              schedule: {
                departureDate: alert.searchCriteria.departureDate,
                arrivalDate: alert.searchCriteria.returnDate,
                departureTime: bestPrice.departureTime,
                arrivalTime: bestPrice.arrivalTime,
                durationMinutes: bestPrice.duration,
              },
              cabinClass: alert.searchCriteria.cabinClass,
            }
          }
        },
        { upsert: true }
      );

    } catch (error) {
      console.error('Error updating price history:', error);
    }
  }

  /**
   * Generate history key for price history records
   * @param {Object} searchCriteria - Flight search criteria
   * @returns {string} History key
   */
  generateHistoryKey(searchCriteria) {
    return `${searchCriteria.origin.airportCode}-${searchCriteria.destination.airportCode}-${searchCriteria.departureDate.toISOString().split('T')[0]}-${searchCriteria.cabinClass}`;
  }

  /**
   * Send notifications for triggered alert
   * @param {Object} alert - Price alert object
   * @param {Object} bestPrice - Current best price
   * @param {Array} triggers - Array of triggered conditions
   */
  async sendNotifications(alert, bestPrice, triggers) {
    try {
      await sendPriceAlertNotification(alert, bestPrice, triggers);
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  /**
   * Update alert status
   * @param {string} alertId - Alert ID
   * @param {string} status - New status
   * @param {Object} updateData - Additional update data
   */
  async updateAlertStatus(alertId, status, updateData = {}) {
    try {
      return await updateOneDoc(
        "PriceAlert",
        { _id: alertId },
        {
          status,
          ...updateData,
        }
      );
    } catch (error) {
      console.error('Error updating alert status:', error);
      throw error;
    }
  }

  /**
   * Update alert metrics
   * @param {Object} checkStats - Check statistics
   */
  async updateAlertMetrics(checkStats) {
    try {
      // Store metrics in database or monitoring system
      console.log('Alert metrics updated:', checkStats);
    } catch (error) {
      console.error('Error updating alert metrics:', error);
    }
  }

  /**
   * Calculate average check duration
   * @param {number} currentAverage - Current average duration
   * @param {number} newDuration - New check duration
   * @returns {number} New average duration
   */
  calculateAverageCheckDuration(currentAverage = 0, newDuration) {
    if (!currentAverage) return newDuration;
    return (currentAverage + newDuration) / 2;
  }

  /**
   * Create batches from array
   * @param {Array} items - Items to batch
   * @param {number} batchSize - Batch size
   * @returns {Array} Array of batches
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get engine status
   * @returns {Object} Engine status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeAlertsCount: this.activeAlerts.size,
      options: this.options,
      lastCheck: this.lastCheckTime,
    };
  }

  /**
   * Force immediate price check
   */
  async forceCheck() {
    console.log('Forcing immediate price check');
    await this.performPriceCheck();
  }

  /**
   * Add new alert to tracking
   * @param {Object} alert - New alert to track
   */
  addAlert(alert) {
    if (alert.status === 'active' && new Date(alert.expiresAt) > new Date()) {
      this.activeAlerts.set(alert._id.toString(), alert);
    }
  }

  /**
   * Remove alert from tracking
   * @param {string} alertId - Alert ID to remove
   */
  removeAlert(alertId) {
    this.activeAlerts.delete(alertId);
  }

  /**
   * Update alert in tracking
   * @param {Object} alert - Updated alert
   */
  updateAlert(alert) {
    if (alert.status === 'active' && new Date(alert.expiresAt) > new Date()) {
      this.activeAlerts.set(alert._id.toString(), alert);
    } else {
      this.activeAlerts.delete(alert._id.toString());
    }
  }
}

// Singleton instance
let trackingEngineInstance = null;

/**
 * Get or create price tracking engine instance
 * @param {Object} options - Configuration options
 * @returns {PriceTrackingEngine} Tracking engine instance
 */
export function getPriceTrackingEngine(options) {
  if (!trackingEngineInstance) {
    trackingEngineInstance = new PriceTrackingEngine(options);
  }
  return trackingEngineInstance;
}

export { PriceTrackingEngine };