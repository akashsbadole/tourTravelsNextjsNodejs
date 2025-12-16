import { NextResponse } from "next/server";
import { getAirlinePartnershipService } from "@/lib/services/airlinePartnershipService";
import { getAirlinePartnershipAnalytics } from "@/lib/services/airlinePartnershipAnalytics";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getManyDocs, createDoc, updateOneDoc, deleteOneDoc } from "@/lib/db/operations";

/**
 * Admin API endpoint for airline partnership management
 * GET: List all partnerships with admin-level details
 * POST: Create new partnership with admin validation
 */

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status');
    const tier = searchParams.get('tier');
    const partnershipType = searchParams.get('partnershipType');
    const region = searchParams.get('region');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true';
    const includeMetrics = searchParams.get('includeMetrics') === 'true';

    // Build query filters
    const filters = {};
    if (status) filters.status = status;
    if (tier) filters.tier = tier;
    if (partnershipType) filters.partnershipType = partnershipType;
    if (region) filters['coverage.regions'] = { $in: [region] };

    // Get partnerships
    const partnerships = await getManyDocs("AirlinePartnership", filters, {
      page,
      limit,
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    });

    let partnershipsData = partnerships.data;

    // Include analytics if requested
    if (includeAnalytics && partnershipsData.length > 0) {
      const analyticsService = getAirlinePartnershipAnalytics();
      
      const analyticsPromises = partnershipsData.map(async (partnership) => {
        try {
          const analytics = await analyticsService.getPartnershipDashboard(
            partnership.partnershipId,
            { period: 'monthly', includeComparisons: false }
          );
          return {
            partnershipId: partnership.partnershipId,
            analytics
          };
        } catch (error) {
          console.error(`Error getting analytics for ${partnership.partnershipId}:`, error);
          return {
            partnershipId: partnership.partnershipId,
            analytics: null
          };
        }
      });

      const analyticsResults = await Promise.all(analyticsPromises);
      
      // Merge analytics with partnerships
      partnershipsData = partnershipsData.map(partnership => {
        const analyticsData = analyticsResults.find(a => a.partnershipId === partnership.partnershipId);
        return {
          ...partnership,
          analytics: analyticsData?.analytics || null
        };
      });
    }

    // Include metrics if requested
    if (includeMetrics && partnershipsData.length > 0) {
      const partnershipService = getAirlinePartnershipService();
      
      const metricsPromises = partnershipsData.map(async (partnership) => {
        try {
          const metrics = await partnershipService.getPartnershipMetrics(partnership.partnershipId);
          return {
            partnershipId: partnership.partnershipId,
            metrics
          };
        } catch (error) {
          console.error(`Error getting metrics for ${partnership.partnershipId}:`, error);
          return {
            partnershipId: partnership.partnershipId,
            metrics: null
          };
        }
      });

      const metricsResults = await Promise.all(metricsPromises);
      
      // Merge metrics with partnerships
      partnershipsData = partnershipsData.map(partnership => {
        const metricsData = metricsResults.find(m => m.partnershipId === partnership.partnershipId);
        return {
          ...partnership,
          metrics: metricsData?.metrics || null
        };
      });
    }

    // Get summary statistics
    const summaryStats = await getPartnershipSummaryStats();

    return NextResponse.json({
      success: true,
      data: partnershipsData,
      pagination: {
        page,
        limit,
        total: partnerships.total,
        pages: partnerships.pages
      },
      summary: summaryStats,
      meta: {
        filters: Object.keys(filters).length > 0 ? filters : null,
        includeAnalytics,
        includeMetrics,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in admin partnerships GET:", error);
    return NextResponse.json(
      { 
        error: "Failed to retrieve partnerships",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const partnershipData = {
      ...body,
      status: 'pending',
      createdAt: new Date(),
      createdBy: session.user.id,
      approvedAt: null,
      approvedBy: null
    };

    // Validate partnership data
    const validation = await validatePartnershipData(partnershipData);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    // Create partnership
    const partnershipService = getAirlinePartnershipService();
    const result = await partnershipService.createPartnership(partnershipData);

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('partnership_created', {
      partnershipId: result.partnershipId,
      airlineCode: partnershipData.airlineCode,
      tier: partnershipData.tier,
      partnershipType: partnershipData.partnershipType
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Partnership created successfully",
      meta: {
        createdBy: session.user.id,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in admin partnerships POST:", error);
    return NextResponse.json(
      { 
        error: "Failed to create partnership",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Get partnership summary statistics
 * @returns {Promise<Object>} Summary statistics
 */
async function getPartnershipSummaryStats() {
  try {
    // Get total partnerships by status
    const statusStats = await getPartnershipStatsByField('status');
    
    // Get total partnerships by tier
    const tierStats = await getPartnershipStatsByField('tier');
    
    // Get total partnerships by type
    const typeStats = await getPartnershipStatsByField('partnershipType');
    
    // Get recent partnerships
    const recentPartnerships = await getManyDocs("AirlinePartnership", {}, {
      limit: 5,
      sort: { createdAt: -1 }
    });

    // Get upcoming renewals
    const upcomingRenewals = await getManyDocs("AirlinePartnership", {
      'contract.endDate': {
        $gte: new Date(),
        $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
      }
    }, {
      limit: 5,
      sort: { 'contract.endDate': 1 }
    });

    return {
      total: statusStats.reduce((sum, stat) => sum + stat.count, 0),
      byStatus: statusStats,
      byTier: tierStats,
      byType: typeStats,
      recent: recentPartnerships.data,
      upcomingRenewals: upcomingRenewals.data
    };
  } catch (error) {
    console.error('Error getting partnership summary stats:', error);
    return {
      total: 0,
      byStatus: [],
      byTier: [],
      byType: [],
      recent: [],
      upcomingRenewals: []
    };
  }
}

/**
 * Get partnership statistics by field
 * @param {string} field - Field to group by
 * @returns {Promise<Array>} Statistics
 */
async function getPartnershipStatsByField(field) {
  try {
    // This would typically use MongoDB aggregation
    // For now, return placeholder data
    const partnerships = await getManyDocs("AirlinePartnership", {});
    
    const stats = {};
    partnerships.data.forEach(partnership => {
      const value = partnership[field] || 'unknown';
      stats[value] = (stats[value] || 0) + 1;
    });
    
    return Object.entries(stats).map(([value, count]) => ({
      value,
      count
    }));
  } catch (error) {
    console.error(`Error getting stats by ${field}:`, error);
    return [];
  }
}

/**
 * Validate partnership data
 * @param {Object} data - Partnership data
 * @returns {Promise<Object>} Validation result
 */
async function validatePartnershipData(data) {
  const errors = [];

  // Required fields
  const requiredFields = ['airlineCode', 'airlineName', 'tier', 'partnershipType'];
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  // Validate tier
  const validTiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  if (data.tier && !validTiers.includes(data.tier)) {
    errors.push(`Invalid tier. Must be one of: ${validTiers.join(', ')}`);
  }

  // Validate partnership type
  const validTypes = ['gds', 'direct', 'lowcost', 'regional', 'charter'];
  if (data.partnershipType && !validTypes.includes(data.partnershipType)) {
    errors.push(`Invalid partnership type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate contract dates
  if (data.contract) {
    if (data.contract.startDate && data.contract.endDate) {
      const startDate = new Date(data.contract.startDate);
      const endDate = new Date(data.contract.endDate);
      
      if (startDate >= endDate) {
        errors.push('Contract start date must be before end date');
      }
      
      if (startDate < new Date()) {
        errors.push('Contract start date cannot be in the past');
      }
    }
  }

  // Validate API configuration
  if (data.apiIntegration) {
    if (!data.apiIntegration.baseUrl) {
      errors.push('API base URL is required');
    }
    
    if (data.apiIntegration.authType === 'oauth2' && !data.apiIntegration.oauthConfig) {
      errors.push('OAuth2 configuration is required for OAuth2 authentication');
    }
    
    if (data.apiIntegration.authType === 'apikey' && !data.apiIntegration.apiKey) {
      errors.push('API key is required for API key authentication');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}