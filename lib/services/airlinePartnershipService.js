import { createDoc, updateOneDoc, getOneDoc, getManyDocs, deleteOneDoc } from "@/lib/db/operations";
import { getAirlinePartnershipManager } from "@/lib/integrations/airline-providers/airline-partnership-manager";

/**
 * Airline Partnership Service
 * Core business logic for managing airline partnerships
 */
export class AirlinePartnershipService {
  constructor() {
    this.partnershipManager = getAirlinePartnershipManager();
  }

  /**
   * Create new airline partnership
   * @param {Object} partnershipData - Partnership data
   * @returns {Promise<Object>} Created partnership
   */
  async createPartnership(partnershipData) {
    try {
      // Generate unique partnership ID
      const partnershipId = this.generatePartnershipId(partnershipData.airlineCode);
      
      // Validate partnership data
      const validationResult = await this.validatePartnershipData(partnershipData);
      if (!validationResult.valid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Create partnership record
      const partnership = await createDoc("AirlinePartnership", {
        partnershipId,
        ...partnershipData,
        status: 'pending',
        metadata: {
          ...partnershipData.metadata,
          createdAt: new Date(),
          createdBy: partnershipData.metadata.createdBy
        }
      });

      // Initialize provider for this partnership
      await this.initializeProviderForPartnership(partnershipId);

      // Trigger integration hook
      await this.triggerPartnershipEvent('partnership_created', {
        partnershipId,
        airlineCode: partnershipData.airlineCode,
        partnershipType: partnershipData.partnershipType,
        tier: partnershipData.tier
      });

      return partnership;
    } catch (error) {
      console.error('Error creating airline partnership:', error);
      throw error;
    }
  }

  /**
   * Get partnerships with filtering and pagination
   * @param {Object} query - Query parameters
   * @param {Object} options - Options
   * @returns {Promise<Array>} Partnerships
   */
  async getPartnerships(query = {}, options = {}) {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeMetrics = false,
      includeBenefits = false
    } = options;

    try {
      // Build database query
      const dbQuery = { ...query };
      
      // Add sorting
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Get partnerships
      const partnerships = await getManyDocs("AirlinePartnership", dbQuery, [], {
        sort,
        limit,
        offset
      });

      // Enrich partnerships if requested
      if (includeMetrics || includeBenefits) {
        const enrichedPartnerships = await Promise.all(
          partnerships.map(async (partnership) => {
            const enriched = { ...partnership };
            
            if (includeMetrics) {
              enriched.performance = await this.getPartnershipMetrics(partnership.partnershipId);
            }
            
            if (includeBenefits) {
              enriched.benefits = await this.getPartnershipBenefits(partnership.partnershipId);
            }
            
            return enriched;
          })
        );
        
        return enrichedPartnerships;
      }

      return partnerships;
    } catch (error) {
      console.error('Error getting partnerships:', error);
      throw error;
    }
  }

  /**
   * Get partnership by ID
   * @param {string} partnershipId - Partnership ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Partnership
   */
  async getPartnershipById(partnershipId, options = {}) {
    const { includeMetrics = false, includeBenefits = false } = options;

    try {
      const partnership = await getOneDoc("AirlinePartnership", { partnershipId });
      
      if (!partnership) {
        throw new Error(`Partnership not found: ${partnershipId}`);
      }

      // Enrich if requested
      if (includeMetrics) {
        partnership.performance = await this.getPartnershipMetrics(partnershipId);
      }
      
      if (includeBenefits) {
        partnership.benefits = await this.getPartnershipBenefits(partnershipId);
      }

      return partnership;
    } catch (error) {
      console.error('Error getting partnership:', error);
      throw error;
    }
  }

  /**
   * Update partnership
   * @param {string} partnershipId - Partnership ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated partnership
   */
  async updatePartnership(partnershipId, updateData) {
    try {
      // Validate update data
      const validationResult = await this.validatePartnershipData(updateData, true);
      if (!validationResult.valid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Update partnership
      const updatedPartnership = await updateOneDoc(
        "AirlinePartnership",
        { partnershipId },
        {
          ...updateData,
          'metadata.updatedAt': new Date(),
          'metadata.updatedBy': updateData.metadata?.updatedBy
        }
      );

      // Reinitialize provider if integration details changed
      if (updateData.integration) {
        await this.reinitializeProviderForPartnership(partnershipId);
      }

      // Trigger integration hook
      await this.triggerPartnershipEvent('partnership_updated', {
        partnershipId,
        updateData
      });

      return updatedPartnership;
    } catch (error) {
      console.error('Error updating partnership:', error);
      throw error;
    }
  }

  /**
   * Activate partnership
   * @param {string} partnershipId - Partnership ID
   * @param {string} activatedBy - User ID
   * @returns {Promise<Object>} Result
   */
  async activatePartnership(partnershipId, activatedBy) {
    try {
      // Validate partnership can be activated
      const partnership = await this.getPartnershipById(partnershipId);
      
      if (!partnership) {
        throw new Error(`Partnership not found: ${partnershipId}`);
      }

      if (partnership.status !== 'pending') {
        throw new Error(`Cannot activate partnership in status: ${partnership.status}`);
      }

      // Check if all requirements are met
      const requirementsCheck = await this.checkPartnershipRequirements(partnershipId);
      if (!requirementsCheck.met) {
        throw new Error(`Requirements not met: ${requirementsCheck.missing.join(', ')}`);
      }

      // Activate partnership
      await updateOneDoc(
        "AirlinePartnership",
        { partnershipId },
        {
          status: 'active',
          'metadata.updatedAt': new Date(),
          'metadata.updatedBy': activatedBy
        }
      );

      // Trigger integration hook
      await this.triggerPartnershipEvent('partnership_activated', {
        partnershipId,
        airlineCode: partnership.airlineCode,
        activatedBy
      });

      return {
        success: true,
        message: 'Partnership activated successfully'
      };
    } catch (error) {
      console.error('Error activating partnership:', error);
      throw error;
    }
  }

  /**
   * Suspend partnership
   * @param {string} partnershipId - Partnership ID
   * @param {string} suspendedBy - User ID
   * @param {string} reason - Suspension reason
   * @returns {Promise<Object>} Result
   */
  async suspendPartnership(partnershipId, suspendedBy, reason) {
    try {
      await updateOneDoc(
        "AirlinePartnership",
        { partnershipId },
        {
          status: 'suspended',
          'metadata.updatedAt': new Date(),
          'metadata.updatedBy': suspendedBy,
          'metadata.suspensionReason': reason,
          'metadata.suspendedAt': new Date()
        }
      );

      // Deactivate provider
      await this.deactivateProviderForPartnership(partnershipId);

      // Trigger integration hook
      await this.triggerPartnershipEvent('partnership_suspended', {
        partnershipId,
        suspendedBy,
        reason
      });

      return {
        success: true,
        message: 'Partnership suspended successfully'
      };
    } catch (error) {
      console.error('Error suspending partnership:', error);
      throw error;
    }
  }

  /**
   * Terminate partnership
   * @param {string} partnershipId - Partnership ID
   * @param {string} terminatedBy - User ID
   * @param {string} reason - Termination reason
   * @returns {Promise<Object>} Result
   */
  async terminatePartnership(partnershipId, terminatedBy, reason) {
    try {
      await updateOneDoc(
        "AirlinePartnership",
        { partnershipId },
        {
          status: 'terminated',
          'metadata.updatedAt': new Date(),
          'metadata.updatedBy': terminatedBy,
          'metadata.terminationReason': reason,
          'metadata.terminatedAt': new Date()
        }
      );

      // Remove provider
      await this.removeProviderForPartnership(partnershipId);

      // Trigger integration hook
      await this.triggerPartnershipEvent('partnership_terminated', {
        partnershipId,
        terminatedBy,
        reason
      });

      return {
        success: true,
        message: 'Partnership terminated successfully'
      };
    } catch (error) {
      console.error('Error terminating partnership:', error);
      throw error;
    }
  }

  /**
   * Get partnership metrics
   * @param {string} partnershipId - Partnership ID
   * @returns {Promise<Object>} Performance metrics
   */
  async getPartnershipMetrics(partnershipId) {
    try {
      // Get booking metrics
      const bookingMetrics = await this.getBookingMetrics(partnershipId);
      
      // Get revenue metrics
      const revenueMetrics = await this.getRevenueMetrics(partnershipId);
      
      // Get commission metrics
      const commissionMetrics = await this.getCommissionMetrics(partnershipId);
      
      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics(partnershipId);

      return {
        booking: bookingMetrics,
        revenue: revenueMetrics,
        commission: commissionMetrics,
        performance: performanceMetrics,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting partnership metrics:', error);
      throw error;
    }
  }

  /**
   * Get partnership benefits
   * @param {string} partnershipId - Partnership ID
   * @returns {Promise<Object>} Partnership benefits
   */
  async getPartnershipBenefits(partnershipId) {
    try {
      const partnership = await this.getPartnershipById(partnershipId);
      
      // Get tier benefits
      const tierBenefits = await this.getTierBenefits(partnership.tier);
      
      // Get custom benefits
      const customBenefits = partnership.benefits || {};

      return {
        tier: partnership.tier,
        tierBenefits,
        customBenefits,
        totalBenefits: this.countTotalBenefits(tierBenefits, customBenefits)
      };
    } catch (error) {
      console.error('Error getting partnership benefits:', error);
      throw error;
    }
  }

  /**
   * Search flights with partnership benefits
   * @param {Object} searchParams - Search parameters
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchPartnershipFlights(searchParams, options = {}) {
    try {
      // Get relevant partnerships for search
      const relevantPartnerships = await this.getRelevantPartnerships(searchParams);
      
      if (relevantPartnerships.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No relevant partnerships found for search criteria'
        };
      }

      // Use partnership manager to search flights
      const searchResults = await this.partnershipManager.searchFlights(searchParams, {
        ...options,
        partnershipIds: relevantPartnerships.map(p => p.partnershipId),
        usePartnershipBenefits: true
      });

      return searchResults;
    } catch (error) {
      console.error('Error searching partnership flights:', error);
      throw error;
    }
  }

  /**
   * Create booking with partnership benefits
   * @param {Object} bookingData - Booking data
   * @param {Object} options - Options
   * @returns {Promise<Object>} Booking result
   */
  async createPartnershipBooking(bookingData, options = {}) {
    try {
      // Get partnership for flight
      const partnership = await this.getPartnershipForFlight(bookingData.flightId);
      
      if (!partnership) {
        throw new Error(`No partnership found for flight: ${bookingData.flightId}`);
      }

      // Create booking through partnership manager
      const bookingResult = await this.partnershipManager.createBooking(bookingData, {
        ...options,
        usePartnershipBenefits: true
      });

      // Track booking for partnership metrics
      await this.trackPartnershipBooking(partnership.partnershipId, bookingResult);

      // Trigger integration hook
      await this.triggerPartnershipEvent('partnership_booking_created', {
        partnershipId: partnership.partnershipId,
        bookingId: bookingResult.data?.bookingId,
        bookingValue: bookingResult.data?.totalFare
      });

      return bookingResult;
    } catch (error) {
      console.error('Error creating partnership booking:', error);
      throw error;
    }
  }

  /**
   * Generate unique partnership ID
   * @param {string} airlineCode - Airline code
   * @returns {string} Partnership ID
   */
  generatePartnershipId(airlineCode) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${airlineCode.toUpperCase()}_${timestamp}_${random}`;
  }

  /**
   * Validate partnership data
   * @param {Object} data - Partnership data
   * @param {boolean} isUpdate - Whether this is an update
   * @returns {Promise<Object>} Validation result
   */
  async validatePartnershipData(data, isUpdate = false) {
    const errors = [];

    // Required field validation
    if (!isUpdate) {
      if (!data.airlineCode) errors.push('Airline code is required');
      if (!data.partnershipType) errors.push('Partnership type is required');
      if (!data.contract) errors.push('Contract information is required');
      if (!data.financial) errors.push('Financial information is required');
      if (!data.integration) errors.push('Integration information is required');
    }

    // Data format validation
    if (data.airlineCode && !/^[A-Z]{2,3}$/.test(data.airlineCode)) {
      errors.push('Invalid airline code format');
    }

    if (data.tier && !['bronze', 'silver', 'gold', 'platinum', 'diamond'].includes(data.tier)) {
      errors.push('Invalid partnership tier');
    }

    if (data.financial?.commissionStructure?.baseRate && 
        (data.financial.commissionStructure.baseRate < 0 || 
         data.financial.commissionStructure.baseRate > 100)) {
      errors.push('Commission base rate must be between 0 and 100');
    }

    // Business rule validation
    if (data.contract?.startDate && data.contract?.endDate) {
      const startDate = new Date(data.contract.startDate);
      const endDate = new Date(data.contract.endDate);
      
      if (startDate >= endDate) {
        errors.push('Contract end date must be after start date');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check partnership requirements
   * @param {string} partnershipId - Partnership ID
   * @returns {Promise<Object>} Requirements check result
   */
  async checkPartnershipRequirements(partnershipId) {
    try {
      const partnership = await this.getPartnershipById(partnershipId);
      const missing = [];

      // Check integration requirements
      if (!partnership.integration?.authentication?.credentials) {
        missing.push('Integration credentials not configured');
      }

      // Check contract requirements
      if (!partnership.contract?.signedAt) {
        missing.push('Contract not signed');
      }

      // Check compliance requirements
      if (partnership.compliance?.certifications?.length === 0) {
        missing.push('No compliance certifications found');
      }

      return {
        met: missing.length === 0,
        missing
      };
    } catch (error) {
      console.error('Error checking partnership requirements:', error);
      return {
        met: false,
        missing: ['Error checking requirements']
      };
    }
  }

  /**
   * Get tier benefits
   * @param {string} tier - Partnership tier
   * @returns {Promise<Object>} Tier benefits
   */
  async getTierBenefits(tier) {
    try {
      const tierData = await getOneDoc("PartnershipTier", { tier });
      
      if (!tierData) {
        throw new Error(`Tier not found: ${tier}`);
      }

      return {
        commission: tierData.commission,
        financial: tierData.financial,
        booking: tierData.booking,
        ancillary: tierData.ancillary,
        loyalty: tierData.loyalty,
        marketing: tierData.marketing,
        support: tierData.support,
        technology: tierData.technology
      };
    } catch (error) {
      console.error('Error getting tier benefits:', error);
      return {};
    }
  }

  /**
   * Get relevant partnerships for search
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Relevant partnerships
   */
  async getRelevantPartnerships(searchParams) {
    try {
      // Build query for active partnerships
      const query = {
        status: 'active',
        'coverage.countries': { $in: [searchParams.originCountry, searchParams.destinationCountry] },
        'coverage.routes': {
          $elemMatch: {
            $or: [
              { origin: searchParams.origin },
              { destination: searchParams.destination }
            ]
          }
        }
      };

      const partnerships = await getManyDocs("AirlinePartnership", query);
      
      return partnerships;
    } catch (error) {
      console.error('Error getting relevant partnerships:', error);
      return [];
    }
  }

  /**
   * Get partnership for flight
   * @param {string} flightId - Flight ID
   * @returns {Promise<Object|null>} Partnership
   */
  async getPartnershipForFlight(flightId) {
    try {
      // This would typically involve looking up the flight in enhanced flight data
      // to find which partnership handles it
      const flightData = await getOneDoc("EnhancedFlightData", { flightId });
      
      if (flightData && flightData.partnershipId) {
        return await this.getPartnershipById(flightData.partnershipId);
      }

      return null;
    } catch (error) {
      console.error('Error getting partnership for flight:', error);
      return null;
    }
  }

  /**
   * Count total benefits
   * @param {Object} tierBenefits - Tier benefits
   * @param {Object} customBenefits - Custom benefits
   * @returns {number} Total benefits count
   */
  countTotalBenefits(tierBenefits, customBenefits) {
    let count = 0;
    
    // Count tier benefits
    Object.values(tierBenefits).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach(benefit => {
          if (benefit === true || (Array.isArray(benefit) && benefit.length > 0)) {
            count++;
          }
        });
      }
    });
    
    // Count custom benefits
    Object.values(customBenefits).forEach(benefit => {
      if (benefit === true) {
        count++;
      }
    });
    
    return count;
  }

  /**
   * Track partnership booking for metrics
   * @param {string} partnershipId - Partnership ID
   * @param {Object} bookingResult - Booking result
   */
  async trackPartnershipBooking(partnershipId, bookingResult) {
    try {
      // Update partnership metrics
      await updateOneDoc(
        "AirlinePartnership",
        { partnershipId },
        {
          $inc: {
            'performance.bookingVolume.total': 1,
            'performance.bookingVolume.monthly': 1,
            'performance.revenue.total': bookingResult.data?.totalFare || 0,
            'performance.revenue.monthly': bookingResult.data?.totalFare || 0,
            'performance.commission.total': bookingResult.data?.commission || 0,
            'performance.commission.monthly': bookingResult.data?.commission || 0
          }
        }
      );
    } catch (error) {
      console.error('Error tracking partnership booking:', error);
    }
  }

  /**
   * Get booking metrics
   * @param {string} partnershipId - Partnership ID
   * @returns {Promise<Object>} Booking metrics
   */
  async getBookingMetrics(partnershipId) {
    try {
      // This would typically query booking data
      // For now, return placeholder data
      return {
        total: 0,
        monthly: 0,
        quarterly: 0,
        yearly: 0,
        conversionRate: 0,
        averageBookingValue: 0
      };
    } catch (error) {
      console.error('Error getting booking metrics:', error);
      return {};
    }
  }

  /**
   * Get revenue metrics
   * @param {string} partnershipId - Partnership ID
   * @returns {Promise<Object>} Revenue metrics
   */
  async getRevenueMetrics(partnershipId) {
    try {
      // This would typically query revenue data
      // For now, return placeholder data
      return {
        total: 0,
        monthly: 0,
        quarterly: 0,
        yearly: 0,
        growth: 0
      };
    } catch (error) {
      console.error('Error getting revenue metrics:', error);
      return {};
    }
  }

  /**
   * Get commission metrics
   * @param {string} partnershipId - Partnership ID
   * @returns {Promise<Object>} Commission metrics
   */
  async getCommissionMetrics(partnershipId) {
    try {
      // This would typically query commission data
      // For now, return placeholder data
      return {
        total: 0,
        monthly: 0,
        quarterly: 0,
        yearly: 0,
        averageRate: 0
      };
    } catch (error) {
      console.error('Error getting commission metrics:', error);
      return {};
    }
  }

  /**
   * Get performance metrics
   * @param {string} partnershipId - Partnership ID
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformanceMetrics(partnershipId) {
    try {
      // This would typically query performance data
      // For now, return placeholder data
      return {
        conversionRate: 0,
        averageBookingValue: 0,
        cancellationRate: 0,
        customerSatisfaction: 0
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {};
    }
  }

  /**
   * Trigger partnership event
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  async triggerPartnershipEvent(eventType, data) {
    try {
      const { getIntegrationHooks } = await import("@/lib/services/integrationHooks");
      const hooks = getIntegrationHooks();
      
      await hooks.triggerHook(eventType, data, {
        integrations: ['analytics', 'notifications'],
        async: true
      });
    } catch (error) {
      console.error('Error triggering partnership event:', error);
    }
  }

  /**
   * Initialize provider for partnership
   * @param {string} partnershipId - Partnership ID
   */
  async initializeProviderForPartnership(partnershipId) {
    try {
      await this.partnershipManager.initializeProviderForPartnership(partnershipId);
    } catch (error) {
      console.error('Error initializing provider for partnership:', error);
    }
  }

  /**
   * Reinitialize provider for partnership
   * @param {string} partnershipId - Partnership ID
   */
  async reinitializeProviderForPartnership(partnershipId) {
    try {
      await this.partnershipManager.reinitializeProviderForPartnership(partnershipId);
    } catch (error) {
      console.error('Error reinitializing provider for partnership:', error);
    }
  }

  /**
   * Deactivate provider for partnership
   * @param {string} partnershipId - Partnership ID
   */
  async deactivateProviderForPartnership(partnershipId) {
    try {
      await this.partnershipManager.deactivateProviderForPartnership(partnershipId);
    } catch (error) {
      console.error('Error deactivating provider for partnership:', error);
    }
  }

  /**
   * Remove provider for partnership
   * @param {string} partnershipId - Partnership ID
   */
  async removeProviderForPartnership(partnershipId) {
    try {
      await this.partnershipManager.removeProviderForPartnership(partnershipId);
    } catch (error) {
      console.error('Error removing provider for partnership:', error);
    }
  }
}

// Singleton instance
let partnershipServiceInstance = null;

/**
 * Get or create airline partnership service instance
 * @returns {AirlinePartnershipService} Service instance
 */
export function getAirlinePartnershipService() {
  if (!partnershipServiceInstance) {
    partnershipServiceInstance = new AirlinePartnershipService();
  }
  return partnershipServiceInstance;
}