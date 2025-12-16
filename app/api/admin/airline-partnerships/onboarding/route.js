import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getManyDocs, createDoc, updateOneDoc } from "@/lib/db/operations";
import { getAirlinePartnershipService } from "@/lib/services/airlinePartnershipService";
import { getAirlinePartnershipAnalytics } from "@/lib/services/airlinePartnershipAnalytics";
import { v4 as uuidv4 } from 'uuid';

/**
 * Admin API endpoint for airline partnership onboarding workflow
 * GET: Get onboarding workflow status and steps
 * POST: Initiate onboarding process
 * PUT: Update onboarding progress
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
    const onboardingId = searchParams.get('onboardingId');
    const partnershipId = searchParams.get('partnershipId');
    const status = searchParams.get('status');

    if (onboardingId) {
      // Get specific onboarding process
      const onboarding = await getOneDoc("PartnershipOnboarding", { onboardingId });
      
      if (!onboarding) {
        return NextResponse.json(
          { error: "Onboarding process not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: onboarding,
        meta: {
          retrievedAt: new Date().toISOString()
        }
      });
    } else if (partnershipId) {
      // Get onboarding for specific partnership
      const onboarding = await getOneDoc("PartnershipOnboarding", { partnershipId });
      
      return NextResponse.json({
        success: true,
        data: onboarding || null,
        meta: {
          partnershipId,
          retrievedAt: new Date().toISOString()
        }
      });
    } else {
      // List all onboarding processes
      const filters = {};
      if (status) filters.status = status;

      const onboardings = await getManyDocs("PartnershipOnboarding", filters, {
        sort: { createdAt: -1 }
      });

      return NextResponse.json({
        success: true,
        data: onboardings.data,
        meta: {
          total: onboardings.total,
          filters: Object.keys(filters).length > 0 ? filters : null,
          retrievedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error("Error in onboarding GET:", error);
    return NextResponse.json(
      { 
        error: "Failed to retrieve onboarding data",
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
    const { partnershipId, onboardingType = 'standard', skipSteps = [] } = body;

    if (!partnershipId) {
      return NextResponse.json(
        { error: "Partnership ID is required" },
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

    // Check if onboarding already exists
    const existingOnboarding = await getOneDoc("PartnershipOnboarding", { partnershipId });
    if (existingOnboarding) {
      return NextResponse.json(
        { error: "Onboarding process already exists for this partnership" },
        { status: 409 }
      );
    }

    // Create onboarding workflow
    const onboardingId = uuidv4();
    const workflowSteps = getOnboardingSteps(onboardingType, partnership.partnershipType);
    
    // Filter out skipped steps
    const activeSteps = workflowSteps.filter(step => !skipSteps.includes(step.id));

    const onboardingData = {
      onboardingId,
      partnershipId,
      airlineCode: partnership.airlineCode,
      airlineName: partnership.airlineName,
      partnershipType: partnership.partnershipType,
      tier: partnership.tier,
      onboardingType,
      status: 'initiated',
      currentStep: activeSteps[0]?.id || null,
      steps: activeSteps.map(step => ({
        ...step,
        status: step.id === activeSteps[0]?.id ? 'in_progress' : 'pending',
        startedAt: step.id === activeSteps[0]?.id ? new Date() : null,
        completedAt: null,
        notes: null,
        assignedTo: null
      })),
      progress: {
        total: activeSteps.length,
        completed: 0,
        percentage: 0
      },
      timeline: {
        initiatedAt: new Date(),
        estimatedCompletion: calculateEstimatedCompletion(activeSteps),
        actualCompletion: null
      },
      team: {
        initiatedBy: session.user.id,
        assignedTo: getDefaultAssignee(onboardingType, partnership.partnershipType),
        stakeholders: getStakeholders(onboardingType, partnership.partnershipType)
      },
      documents: [],
      communications: [],
      risks: [],
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const onboarding = await createDoc("PartnershipOnboarding", onboardingData);

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('onboarding_initiated', {
      onboardingId,
      partnershipId,
      airlineCode: partnership.airlineCode,
      onboardingType,
      initiatedBy: session.user.id
    });

    // Send notifications
    await sendOnboardingNotifications('initiated', onboardingData);

    return NextResponse.json({
      success: true,
      data: onboarding,
      message: "Onboarding process initiated successfully",
      meta: {
        onboardingId,
        partnershipId,
        initiatedBy: session.user.id,
        initiatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in onboarding POST:", error);
    return NextResponse.json(
      { 
        error: "Failed to initiate onboarding process",
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
    const { onboardingId, stepId, action, data } = body;

    if (!onboardingId) {
      return NextResponse.json(
        { error: "Onboarding ID is required" },
        { status: 400 }
      );
    }

    // Get existing onboarding
    const onboarding = await getOneDoc("PartnershipOnboarding", { onboardingId });
    if (!onboarding) {
      return NextResponse.json(
        { error: "Onboarding process not found" },
        { status: 404 }
      );
    }

    let updatedOnboarding = { ...onboarding };

    switch (action) {
      case 'complete_step':
        updatedOnboarding = await completeOnboardingStep(onboarding, stepId, data, session.user.id);
        break;
      case 'skip_step':
        updatedOnboarding = await skipOnboardingStep(onboarding, stepId, data, session.user.id);
        break;
      case 'update_step':
        updatedOnboarding = await updateOnboardingStep(onboarding, stepId, data, session.user.id);
        break;
      case 'assign_step':
        updatedOnboarding = await assignOnboardingStep(onboarding, stepId, data.assignedTo, session.user.id);
        break;
      case 'add_document':
        updatedOnboarding = await addOnboardingDocument(onboarding, data.document, session.user.id);
        break;
      case 'add_communication':
        updatedOnboarding = await addOnboardingCommunication(onboarding, data.communication, session.user.id);
        break;
      case 'add_risk':
        updatedOnboarding = await addOnboardingRisk(onboarding, data.risk, session.user.id);
        break;
      case 'update_status':
        updatedOnboarding = await updateOnboardingStatus(onboarding, data.status, session.user.id);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Update the onboarding in database
    await updateOneDoc("PartnershipOnboarding", { onboardingId }, updatedOnboarding);

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('onboarding_updated', {
      onboardingId,
      partnershipId: onboarding.partnershipId,
      action,
      stepId,
      updatedBy: session.user.id
    });

    // Send notifications if needed
    if (action === 'complete_step' || action === 'update_status') {
      await sendOnboardingNotifications(action, updatedOnboarding);
    }

    return NextResponse.json({
      success: true,
      data: updatedOnboarding,
      message: `Onboarding ${action} completed successfully`,
      meta: {
        onboardingId,
        action,
        updatedBy: session.user.id,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in onboarding PUT:", error);
    return NextResponse.json(
      { 
        error: "Failed to update onboarding process",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Get onboarding workflow steps based on type
 * @param {string} onboardingType - Onboarding type
 * @param {string} partnershipType - Partnership type
 * @returns {Array} Workflow steps
 */
function getOnboardingSteps(onboardingType, partnershipType) {
  const baseSteps = [
    {
      id: 'initial_setup',
      name: 'Initial Setup',
      description: 'Set up basic partnership configuration',
      category: 'setup',
      required: true,
      estimatedDuration: 1, // days
      dependencies: [],
      tasks: [
        'Create partnership record',
        'Set up basic configuration',
        'Assign team members'
      ]
    },
    {
      id: 'legal_review',
      name: 'Legal Review',
      description: 'Review and sign partnership agreements',
      category: 'legal',
      required: true,
      estimatedDuration: 3,
      dependencies: ['initial_setup'],
      tasks: [
        'Review partnership agreement',
        'Check compliance requirements',
        'Obtain legal approvals'
      ]
    },
    {
      id: 'technical_integration',
      name: 'Technical Integration',
      description: 'Set up technical integrations and APIs',
      category: 'technical',
      required: true,
      estimatedDuration: 5,
      dependencies: ['legal_review'],
      tasks: [
        'Configure API connections',
        'Set up authentication',
        'Test integrations'
      ]
    },
    {
      id: 'data_mapping',
      name: 'Data Mapping',
      description: 'Map data fields and formats',
      category: 'technical',
      required: true,
      estimatedDuration: 2,
      dependencies: ['technical_integration'],
      tasks: [
        'Map flight data fields',
        'Configure fare classes',
        'Set up ancillary services'
      ]
    },
    {
      id: 'testing',
      name: 'Testing & Validation',
      description: 'Test all integrations and functionalities',
      category: 'testing',
      required: true,
      estimatedDuration: 3,
      dependencies: ['data_mapping'],
      tasks: [
        'Perform integration tests',
        'Validate data accuracy',
        'Test booking flows'
      ]
    },
    {
      id: 'training',
      name: 'Team Training',
      description: 'Train team on partnership systems',
      category: 'training',
      required: true,
      estimatedDuration: 2,
      dependencies: ['testing'],
      tasks: [
        'Train support team',
        'Train sales team',
        'Create documentation'
      ]
    },
    {
      id: 'go_live',
      name: 'Go Live',
      description: 'Launch partnership and make it available',
      category: 'launch',
      required: true,
      estimatedDuration: 1,
      dependencies: ['training'],
      tasks: [
        'Enable partnership',
        'Monitor initial bookings',
        'Provide support'
      ]
    }
  ];

  // Add partnership type specific steps
  if (partnershipType === 'gds') {
    baseSteps.splice(3, 0, {
      id: 'gds_configuration',
      name: 'GDS Configuration',
      description: 'Configure GDS-specific settings',
      category: 'technical',
      required: true,
      estimatedDuration: 3,
      dependencies: ['technical_integration'],
      tasks: [
        'Configure GDS connections',
        'Set up fare rules',
        'Configure inventory management'
      ]
    });
  }

  if (partnershipType === 'direct') {
    baseSteps.splice(3, 0, {
      id: 'direct_api_setup',
      name: 'Direct API Setup',
      description: 'Configure direct airline API connections',
      category: 'technical',
      required: true,
      estimatedDuration: 4,
      dependencies: ['technical_integration'],
      tasks: [
        'Set up OAuth2 authentication',
        'Configure API endpoints',
        'Test rate limiting'
      ]
    });
  }

  return baseSteps;
}

/**
 * Calculate estimated completion date
 * @param {Array} steps - Workflow steps
 * @returns {Date} Estimated completion date
 */
function calculateEstimatedCompletion(steps) {
  const totalDays = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + totalDays);
  return completionDate;
}

/**
 * Get default assignee for onboarding
 * @param {string} onboardingType - Onboarding type
 * @param {string} partnershipType - Partnership type
 * @returns {string} Default assignee ID
 */
function getDefaultAssignee(onboardingType, partnershipType) {
  // This would typically look up user roles and assignments
  // For now, return a placeholder
  return 'partnership-manager';
}

/**
 * Get stakeholders for onboarding
 * @param {string} onboardingType - Onboarding type
 * @param {string} partnershipType - Partnership type
 * @returns {Array} Stakeholder IDs
 */
function getStakeholders(onboardingType, partnershipType) {
  // This would typically look up stakeholders based on roles
  // For now, return placeholder data
  return [
    'partnership-manager',
    'technical-lead',
    'legal-team',
    'finance-team'
  ];
}

/**
 * Complete onboarding step
 * @param {Object} onboarding - Onboarding data
 * @param {string} stepId - Step ID
 * @param {Object} data - Step data
 * @param {string} userId - User ID
 * @returns {Object} Updated onboarding
 */
async function completeOnboardingStep(onboarding, stepId, data, userId) {
  const updatedOnboarding = { ...onboarding };
  const stepIndex = updatedOnboarding.steps.findIndex(step => step.id === stepId);
  
  if (stepIndex === -1) {
    throw new Error(`Step not found: ${stepId}`);
  }

  // Update step
  updatedOnboarding.steps[stepIndex] = {
    ...updatedOnboarding.steps[stepIndex],
    status: 'completed',
    completedAt: new Date(),
    notes: data?.notes || null,
    completedBy: userId
  };

  // Update progress
  const completedSteps = updatedOnboarding.steps.filter(step => step.status === 'completed').length;
  updatedOnboarding.progress = {
    total: updatedOnboarding.steps.length,
    completed: completedSteps,
    percentage: Math.round((completedSteps / updatedOnboarding.steps.length) * 100)
  };

  // Move to next step
  const nextStep = updatedOnboarding.steps.find(step => step.status === 'pending');
  if (nextStep) {
    nextStep.status = 'in_progress';
    nextStep.startedAt = new Date();
    updatedOnboarding.currentStep = nextStep.id;
  } else {
    // All steps completed
    updatedOnboarding.status = 'completed';
    updatedOnboarding.currentStep = null;
    updatedOnboarding.timeline.actualCompletion = new Date();
  }

  updatedOnboarding.updatedAt = new Date();
  return updatedOnboarding;
}

/**
 * Send onboarding notifications
 * @param {string} event - Event type
 * @param {Object} onboarding - Onboarding data
 */
async function sendOnboardingNotifications(event, onboarding) {
  // This would typically send notifications via email, Slack, etc.
  // For now, just log the event
  console.log(`Onboarding notification: ${event} for partnership ${onboarding.partnershipId}`);
}

// Additional helper functions for other actions would be implemented here...