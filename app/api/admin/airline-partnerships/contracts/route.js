import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getManyDocs, createDoc, updateOneDoc, deleteOneDoc } from "@/lib/db/operations";
import { getAirlinePartnershipAnalytics } from "@/lib/services/airlinePartnershipAnalytics";
import { v4 as uuidv4 } from 'uuid';

/**
 * Admin API endpoint for partnership contract and terms management
 * GET: List contracts or get specific contract
 * POST: Create new contract
 * PUT: Update contract
 * DELETE: Delete contract
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
    const contractId = searchParams.get('contractId');
    const partnershipId = searchParams.get('partnershipId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const includeVersions = searchParams.get('includeVersions') === 'true';
    const includeCompliance = searchParams.get('includeCompliance') === 'true';

    if (contractId) {
      // Get specific contract
      const contract = await getOneDoc("PartnershipContract", { contractId });
      
      if (!contract) {
        return NextResponse.json(
          { error: "Contract not found" },
          { status: 404 }
        );
      }

      // Include versions if requested
      let versions = [];
      if (includeVersions) {
        versions = await getManyDocs("ContractVersion", { contractId }, {
          sort: { version: -1 }
        });
      }

      // Include compliance if requested
      let compliance = null;
      if (includeCompliance) {
        compliance = await getOneDoc("ContractCompliance", { contractId });
      }

      return NextResponse.json({
        success: true,
        data: {
          ...contract,
          versions: includeVersions ? versions.data : [],
          compliance
        },
        meta: {
          contractId,
          includeVersions,
          includeCompliance,
          retrievedAt: new Date().toISOString()
        }
      });
    } else {
      // List contracts
      const filters = {};
      if (partnershipId) filters.partnershipId = partnershipId;
      if (status) filters.status = status;
      if (type) filters.type = type;

      const contracts = await getManyDocs("PartnershipContract", filters, {
        page,
        limit,
        sort: { createdAt: -1 }
      });

      // Get partnership details for each contract
      const contractsWithPartnerships = await Promise.all(
        contracts.data.map(async (contract) => {
          const partnership = await getOneDoc("AirlinePartnership", { partnershipId: contract.partnershipId });
          return {
            ...contract,
            partnership: partnership ? {
              partnershipId: partnership.partnershipId,
              airlineCode: partnership.airlineCode,
              airlineName: partnership.airlineName,
              tier: partnership.tier
            } : null
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: contractsWithPartnerships,
        pagination: {
          page,
          limit,
          total: contracts.total,
          pages: contracts.pages
        },
        meta: {
          filters: Object.keys(filters).length > 0 ? filters : null,
          retrievedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error("Error in contracts GET:", error);
    return NextResponse.json(
      { 
        error: "Failed to retrieve contracts",
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
    const {
      partnershipId,
      type,
      title,
      description,
      terms,
      financialTerms,
      complianceRequirements,
      renewalTerms,
      documents = []
    } = body;

    if (!partnershipId || !type || !title) {
      return NextResponse.json(
        { error: "Partnership ID, type, and title are required" },
        { status: 400 }
      );
    }

    // Check if partnership exists
    const partnership = await getOneDoc("AirlinePartnership", { partnershipId });
    if (!partnership) {
      return NextResponse.json(
        { error: "Partnership not found" },
        { status: 404 }
      );
    }

    // Validate contract data
    const validation = await validateContractData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    // Create contract
    const contractId = uuidv4();
    const contractData = {
      contractId,
      partnershipId,
      type,
      title,
      description,
      terms: terms || {},
      financialTerms: financialTerms || {},
      complianceRequirements: complianceRequirements || [],
      renewalTerms: renewalTerms || {},
      status: 'draft',
      version: '1.0',
      effectiveDate: null,
      expiryDate: null,
      documents,
      signatures: [],
      amendments: [],
      compliance: {
        status: 'pending',
        lastChecked: null,
        issues: [],
        score: null
      },
      created: {
        by: session.user.id,
        at: new Date()
      },
      updated: {
        by: session.user.id,
        at: new Date()
      }
    };

    const contract = await createDoc("PartnershipContract", contractData);

    // Create initial version
    const versionData = {
      versionId: uuidv4(),
      contractId,
      version: '1.0',
      title,
      description,
      terms: terms || {},
      financialTerms: financialTerms || {},
      complianceRequirements: complianceRequirements || [],
      renewalTerms: renewalTerms || {},
      status: 'draft',
      changes: {
        type: 'initial',
        description: 'Initial contract creation',
        sections: Object.keys(terms || {})
      },
      created: {
        by: session.user.id,
        at: new Date()
      }
    };

    await createDoc("ContractVersion", versionData);

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('contract_created', {
      contractId,
      partnershipId,
      type,
      createdBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: contract,
      message: "Contract created successfully",
      meta: {
        contractId,
        partnershipId,
        createdBy: session.user.id,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in contracts POST:", error);
    return NextResponse.json(
      { 
        error: "Failed to create contract",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { contractId, action, data } = body;

    if (!contractId) {
      return NextResponse.json(
        { error: "Contract ID is required" },
        { status: 400 }
      );
    }

    // Get existing contract
    const contract = await getOneDoc("PartnershipContract", { contractId });
    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    let updatedContract = { ...contract };

    switch (action) {
      case 'update_terms':
        updatedContract = await updateContractTerms(contract, data, session.user.id);
        break;
      case 'update_status':
        updatedContract = await updateContractStatus(contract, data.status, session.user.id);
        break;
      case 'add_signature':
        updatedContract = await addContractSignature(contract, data.signature, session.user.id);
        break;
      case 'add_amendment':
        updatedContract = await addContractAmendment(contract, data.amendment, session.user.id);
        break;
      case 'add_document':
        updatedContract = await addContractDocument(contract, data.document, session.user.id);
        break;
      case 'update_compliance':
        updatedContract = await updateContractCompliance(contract, data.compliance, session.user.id);
        break;
      case 'renew_contract':
        updatedContract = await renewContract(contract, data.renewalTerms, session.user.id);
        break;
      case 'terminate_contract':
        updatedContract = await terminateContract(contract, data.termination, session.user.id);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Update the contract in database
    await updateOneDoc("PartnershipContract", { contractId }, updatedContract);

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('contract_updated', {
      contractId,
      partnershipId: contract.partnershipId,
      action,
      updatedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: updatedContract,
      message: `Contract ${action} completed successfully`,
      meta: {
        contractId,
        action,
        updatedBy: session.user.id,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in contracts PUT:", error);
    return NextResponse.json(
      { 
        error: "Failed to update contract",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contractId');

    if (!contractId) {
      return NextResponse.json(
        { error: "Contract ID is required" },
        { status: 400 }
      );
    }

    // Check if contract exists
    const contract = await getOneDoc("PartnershipContract", { contractId });
    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Check if contract can be deleted
    if (['active', 'signed'].includes(contract.status)) {
      return NextResponse.json(
        { error: "Cannot delete active or signed contract" },
        { status: 400 }
      );
    }

    // Delete contract and related data
    await deleteOneDoc("PartnershipContract", { contractId });
    await deleteManyDocs("ContractVersion", { contractId });
    await deleteOneDoc("ContractCompliance", { contractId });

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('contract_deleted', {
      contractId,
      partnershipId: contract.partnershipId,
      deletedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      message: "Contract deleted successfully",
      meta: {
        contractId,
        deletedBy: session.user.id,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in contracts DELETE:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete contract",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Validate contract data
 * @param {Object} data - Contract data
 * @returns {Promise<Object>} Validation result
 */
async function validateContractData(data) {
  const errors = [];

  // Required fields
  const requiredFields = ['partnershipId', 'type', 'title'];
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  // Validate contract type
  const validTypes = ['partnership', 'sla', 'financial', 'compliance', 'amendment'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`Invalid contract type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate financial terms
  if (data.financialTerms) {
    if (data.financialTerms.commissionRate && 
        (data.financialTerms.commissionRate < 0 || data.financialTerms.commissionRate > 100)) {
      errors.push('Commission rate must be between 0 and 100');
    }
    
    if (data.financialTerms.minimumRevenue && data.financialTerms.minimumRevenue < 0) {
      errors.push('Minimum revenue cannot be negative');
    }
  }

  // Validate dates
  if (data.effectiveDate && data.expiryDate) {
    const effectiveDate = new Date(data.effectiveDate);
    const expiryDate = new Date(data.expiryDate);
    
    if (effectiveDate >= expiryDate) {
      errors.push('Effective date must be before expiry date');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Update contract terms and create new version
 * @param {Object} contract - Contract data
 * @param {Object} termsData - New terms data
 * @param {string} userId - User ID
 * @returns {Object} Updated contract
 */
async function updateContractTerms(contract, termsData, userId) {
  const updatedContract = { ...contract };
  
  // Create new version
  const newVersion = parseFloat(contract.version) + 0.1;
  const versionId = uuidv4();
  
  // Update contract
  updatedContract.terms = { ...updatedContract.terms, ...termsData.terms };
  updatedContract.financialTerms = { ...updatedContract.financialTerms, ...termsData.financialTerms };
  updatedContract.complianceRequirements = termsData.complianceRequirements || updatedContract.complianceRequirements;
  updatedContract.renewalTerms = { ...updatedContract.renewalTerms, ...termsData.renewalTerms };
  updatedContract.version = newVersion.toFixed(1);
  updatedContract.updated = {
    by: userId,
    at: new Date()
  };

  // Create version record
  const versionData = {
    versionId,
    contractId: contract.contractId,
    version: newVersion.toFixed(1),
    title: contract.title,
    description: contract.description,
    terms: updatedContract.terms,
    financialTerms: updatedContract.financialTerms,
    complianceRequirements: updatedContract.complianceRequirements,
    renewalTerms: updatedContract.renewalTerms,
    status: 'draft',
    changes: {
      type: 'update',
      description: termsData.changeDescription || 'Contract terms updated',
      sections: Object.keys(termsData.terms || {})
    },
    created: {
      by: userId,
      at: new Date()
    }
  };

  await createDoc("ContractVersion", versionData);

  return updatedContract;
}

/**
 * Update contract status
 * @param {Object} contract - Contract data
 * @param {string} status - New status
 * @param {string} userId - User ID
 * @returns {Object} Updated contract
 */
async function updateContractStatus(contract, status, userId) {
  const updatedContract = { ...contract };
  
  // Validate status transition
  const validTransitions = {
    'draft': ['review', 'signed', 'cancelled'],
    'review': ['draft', 'signed', 'cancelled'],
    'signed': ['active', 'terminated'],
    'active': ['renewed', 'terminated'],
    'renewed': ['active', 'terminated'],
    'terminated': [],
    'cancelled': []
  };

  if (!validTransitions[contract.status].includes(status)) {
    throw new Error(`Invalid status transition from ${contract.status} to ${status}`);
  }

  updatedContract.status = status;
  updatedContract.updated = {
    by: userId,
    at: new Date()
  };

  // Set effective and expiry dates for active contracts
  if (status === 'active' && !updatedContract.effectiveDate) {
    updatedContract.effectiveDate = new Date();
  }

  return updatedContract;
}

/**
 * Add signature to contract
 * @param {Object} contract - Contract data
 * @param {Object} signature - Signature data
 * @param {string} userId - User ID
 * @returns {Object} Updated contract
 */
async function addContractSignature(contract, signature, userId) {
  const updatedContract = { ...contract };
  
  const signatureData = {
    signatureId: uuidv4(),
    party: signature.party,
    name: signature.name,
    title: signature.title,
    email: signature.email,
    signatureType: signature.signatureType || 'electronic',
    signatureData: signature.signatureData,
    signedAt: new Date(),
    ipAddress: signature.ipAddress,
    userAgent: signature.userAgent
  };

  updatedContract.signatures = [...updatedContract.signatures, signatureData];
  updatedContract.updated = {
    by: userId,
    at: new Date()
  };

  // Update status if all required signatures are present
  if (updatedContract.signatures.length >= 2) { // Assuming 2 signatures required
    updatedContract.status = 'signed';
  }

  return updatedContract;
}

/**
 * Add amendment to contract
 * @param {Object} contract - Contract data
 * @param {Object} amendment - Amendment data
 * @param {string} userId - User ID
 * @returns {Object} Updated contract
 */
async function addContractAmendment(contract, amendment, userId) {
  const updatedContract = { ...contract };
  
  const amendmentData = {
    amendmentId: uuidv4(),
    title: amendment.title,
    description: amendment.description,
    changes: amendment.changes,
    effectiveDate: amendment.effectiveDate,
    status: 'draft',
    created: {
      by: userId,
      at: new Date()
    }
  };

  updatedContract.amendments = [...updatedContract.amendments, amendmentData];
  updatedContract.updated = {
    by: userId,
    at: new Date()
  };

  return updatedContract;
}