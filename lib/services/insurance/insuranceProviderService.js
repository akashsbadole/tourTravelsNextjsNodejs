import { getOneDoc, getManyDocs, createDoc, updateOneDoc, deleteOneDoc } from "@/lib/db/operations";
import { strToObjectId } from "@/lib/db/utilsDB";

class InsuranceProviderService {
  /**
   * Get all insurance providers
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of insurance providers
   */
  async getAllProviders(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'name',
        sortOrder = 'asc',
        integrationStatus,
        supportedCountries
      } = options;

      const query = { ...filters };
      
      if (integrationStatus) {
        query.integrationStatus = integrationStatus;
      }
      
      if (supportedCountries) {
        query.supportedCountries = { $in: supportedCountries };
      }

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const providers = await getManyDocs(
        "InsuranceProvider",
        query,
        [],
        (page - 1) * limit,
        limit,
        sort
      );

      return providers;
    } catch (error) {
      console.error('Error fetching insurance providers:', error);
      throw new Error('Failed to fetch insurance providers');
    }
  }

  /**
   * Get insurance provider by ID
   * @param {string} providerId - Provider ID
   * @returns {Promise<Object>} Insurance provider object
   */
  async getProviderById(providerId) {
    try {
      const provider = await getOneDoc(
        "InsuranceProvider",
        { _id: strToObjectId(providerId) },
        []
      );

      return provider;
    } catch (error) {
      console.error('Error fetching insurance provider:', error);
      throw new Error('Failed to fetch insurance provider');
    }
  }

  /**
   * Create a new insurance provider
   * @param {Object} providerData - Provider data
   * @returns {Promise<Object>} Created provider object
   */
  async createProvider(providerData) {
    try {
      const provider = await createDoc("InsuranceProvider", providerData);
      return provider;
    } catch (error) {
      console.error('Error creating insurance provider:', error);
      throw new Error('Failed to create insurance provider');
    }
  }

  /**
   * Update insurance provider
   * @param {string} providerId - Provider ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated provider object
   */
  async updateProvider(providerId, updateData) {
    try {
      const provider = await updateOneDoc(
        "InsuranceProvider",
        { _id: strToObjectId(providerId) },
        updateData
      );
      return provider;
    } catch (error) {
      console.error('Error updating insurance provider:', error);
      throw new Error('Failed to update insurance provider');
    }
  }

  /**
   * Delete insurance provider
   * @param {string} providerId - Provider ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProvider(providerId) {
    try {
      // Check if provider has any active policies
      const policies = await getManyDocs(
        "InsurancePolicy",
        { providerId: strToObjectId(providerId) },
        [],
        0,
        1
      );

      if (policies.length > 0) {
        throw new Error('Cannot delete provider with active policies');
      }

      await deleteOneDoc("InsuranceProvider", { _id: strToObjectId(providerId) });
      return true;
    } catch (error) {
      console.error('Error deleting insurance provider:', error);
      throw new Error('Failed to delete insurance provider');
    }
  }

  /**
   * Get providers by coverage type
   * @param {string} coverageType - Coverage type
   * @returns {Promise<Array>} Array of providers
   */
  async getProvidersByCoverageType(coverageType) {
    try {
      const providers = await getManyDocs(
        "InsuranceProvider",
        { 
          coverageTypes: { $in: [coverageType] },
          integrationStatus: 'active'
        },
        []
      );

      return providers;
    } catch (error) {
      console.error('Error fetching providers by coverage type:', error);
      throw new Error('Failed to fetch providers by coverage type');
    }
  }

  /**
   * Update provider health status
   * @param {string} providerId - Provider ID
   * @param {string} status - Health status
   * @returns {Promise<Object>} Updated provider
   */
  async updateProviderHealth(providerId, status) {
    try {
      const updateData = {
        integrationStatus: status,
        lastHealthCheck: new Date()
      };

      return await this.updateProvider(providerId, updateData);
    } catch (error) {
      console.error('Error updating provider health:', error);
      throw new Error('Failed to update provider health');
    }
  }

  /**
   * Get provider commission structure
   * @param {string} providerId - Provider ID
   * @param {number} amount - Amount for commission calculation
   * @returns {Promise<number>} Commission amount
   */
  async calculateCommission(providerId, amount) {
    try {
      const provider = await this.getProviderById(providerId);
      
      if (!provider) {
        throw new Error('Provider not found');
      }

      const { commissionStructure } = provider;
      let commission = 0;

      switch (commissionStructure.type) {
        case 'percentage':
          commission = amount * (commissionStructure.value / 100);
          break;
        case 'fixed':
          commission = commissionStructure.value;
          break;
        case 'tiered':
          const tier = commissionStructure.tiers.find(
            t => amount >= t.minAmount && amount <= t.maxAmount
          );
          if (tier) {
            commission = amount * (tier.commission / 100);
          }
          break;
        default:
          throw new Error('Invalid commission structure');
      }

      return commission;
    } catch (error) {
      console.error('Error calculating commission:', error);
      throw new Error('Failed to calculate commission');
    }
  }

  /**
   * Get supported countries for a provider
   * @param {string} providerId - Provider ID
   * @returns {Promise<Array>} Array of supported countries
   */
  async getSupportedCountries(providerId) {
    try {
      const provider = await this.getProviderById(providerId);
      return provider?.supportedCountries || [];
    } catch (error) {
      console.error('Error fetching supported countries:', error);
      throw new Error('Failed to fetch supported countries');
    }
  }

  /**
   * Check if provider supports specific coverage
   * @param {string} providerId - Provider ID
   * @param {string} coverageType - Coverage type
   * @returns {Promise<boolean>} Support status
   */
  async supportsCoverage(providerId, coverageType) {
    try {
      const provider = await this.getProviderById(providerId);
      return provider?.coverageTypes?.includes(coverageType) || false;
    } catch (error) {
      console.error('Error checking coverage support:', error);
      throw new Error('Failed to check coverage support');
    }
  }
}

export default new InsuranceProviderService();