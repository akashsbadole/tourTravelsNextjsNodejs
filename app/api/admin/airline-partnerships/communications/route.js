import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getManyDocs, createDoc, updateOneDoc, deleteOneDoc } from "@/lib/db/operations";
import { getAirlinePartnershipAnalytics } from "@/lib/services/airlinePartnershipAnalytics";
import { v4 as uuidv4 } from 'uuid';

/**
 * Admin API endpoint for partnership communication management
 * GET: List communications or get specific communication
 * POST: Create new communication
 * PUT: Update communication
 * DELETE: Delete communication
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
    const communicationId = searchParams.get('communicationId');
    const partnershipId = searchParams.get('partnershipId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const includeThreads = searchParams.get('includeThreads') === 'true';
    const includeAttachments = searchParams.get('includeAttachments') === 'true';

    if (communicationId) {
      // Get specific communication
      const communication = await getOneDoc("PartnershipCommunication", { communicationId });
      
      if (!communication) {
        return NextResponse.json(
          { error: "Communication not found" },
          { status: 404 }
        );
      }

      // Include thread if requested
      let thread = [];
      if (includeThreads) {
        thread = await getManyDocs("CommunicationThread", { 
          parentCommunicationId: communicationId 
        }, {
          sort: { createdAt: 1 }
        });
      }

      // Include attachments if requested
      let attachments = [];
      if (includeAttachments) {
        attachments = await getManyDocs("CommunicationAttachment", { 
          communicationId 
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          ...communication,
          thread: includeThreads ? thread.data : [],
          attachments: includeAttachments ? attachments.data : []
        },
        meta: {
          communicationId,
          includeThreads,
          includeAttachments,
          retrievedAt: new Date().toISOString()
        }
      });
    } else {
      // List communications
      const filters = {};
      if (partnershipId) filters.partnershipId = partnershipId;
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (priority) filters.priority = priority;

      const communications = await getManyDocs("PartnershipCommunication", filters, {
        page,
        limit,
        sort: { createdAt: -1 }
      });

      // Get partnership details for each communication
      const communicationsWithPartnerships = await Promise.all(
        communications.data.map(async (communication) => {
          const partnership = await getOneDoc("AirlinePartnership", { 
            partnershipId: communication.partnershipId 
          });
          return {
            ...communication,
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
        data: communicationsWithPartnerships,
        pagination: {
          page,
          limit,
          total: communications.total,
          pages: communications.pages
        },
        meta: {
          filters: Object.keys(filters).length > 0 ? filters : null,
          retrievedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error("Error in communications GET:", error);
    return NextResponse.json(
      { 
        error: "Failed to retrieve communications",
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
      subject,
      content,
      priority = 'normal',
      recipients = [],
      attachments = [],
      scheduledFor = null,
      templateId = null,
      metadata = {}
    } = body;

    if (!partnershipId || !type || !subject || !content) {
      return NextResponse.json(
        { error: "Partnership ID, type, subject, and content are required" },
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

    // Validate communication data
    const validation = await validateCommunicationData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    // Create communication
    const communicationId = uuidv4();
    const communicationData = {
      communicationId,
      partnershipId,
      type,
      subject,
      content,
      priority,
      status: scheduledFor ? 'scheduled' : 'draft',
      recipients,
      attachments: attachments.map(att => ({
        attachmentId: uuidv4(),
        name: att.name,
        type: att.type,
        size: att.size,
        url: att.url
      })),
      templateId,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      responses: [],
      metadata,
      tracking: {
        opens: 0,
        clicks: 0,
        forwards: 0,
        replies: 0,
        lastActivity: null
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

    const communication = await createDoc("PartnershipCommunication", communicationData);

    // Process template if provided
    if (templateId) {
      await processCommunicationTemplate(communicationId, templateId);
    }

    // Schedule communication if needed
    if (scheduledFor) {
      await scheduleCommunication(communicationId, scheduledFor);
    }

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('communication_created', {
      communicationId,
      partnershipId,
      type,
      priority,
      createdBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: communication,
      message: "Communication created successfully",
      meta: {
        communicationId,
        partnershipId,
        createdBy: session.user.id,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in communications POST:", error);
    return NextResponse.json(
      { 
        error: "Failed to create communication",
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
    const { communicationId, action, data } = body;

    if (!communicationId) {
      return NextResponse.json(
        { error: "Communication ID is required" },
        { status: 400 }
      );
    }

    // Get existing communication
    const communication = await getOneDoc("PartnershipCommunication", { communicationId });
    if (!communication) {
      return NextResponse.json(
        { error: "Communication not found" },
        { status: 404 }
      );
    }

    let updatedCommunication = { ...communication };

    switch (action) {
      case 'update_content':
        updatedCommunication = await updateCommunicationContent(communication, data, session.user.id);
        break;
      case 'send':
        updatedCommunication = await sendCommunication(communication, data, session.user.id);
        break;
      case 'schedule':
        updatedCommunication = await scheduleCommunication(communication, data.scheduledFor, session.user.id);
        break;
      case 'add_recipient':
        updatedCommunication = await addCommunicationRecipient(communication, data.recipient, session.user.id);
        break;
      case 'remove_recipient':
        updatedCommunication = await removeCommunicationRecipient(communication, data.recipientId, session.user.id);
        break;
      case 'add_attachment':
        updatedCommunication = await addCommunicationAttachment(communication, data.attachment, session.user.id);
        break;
      case 'update_status':
        updatedCommunication = await updateCommunicationStatus(communication, data.status, session.user.id);
        break;
      case 'add_response':
        updatedCommunication = await addCommunicationResponse(communication, data.response, session.user.id);
        break;
      case 'update_tracking':
        updatedCommunication = await updateCommunicationTracking(communication, data.tracking, session.user.id);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Update the communication in database
    await updateOneDoc("PartnershipCommunication", { communicationId }, updatedCommunication);

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('communication_updated', {
      communicationId,
      partnershipId: communication.partnershipId,
      action,
      updatedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: updatedCommunication,
      message: `Communication ${action} completed successfully`,
      meta: {
        communicationId,
        action,
        updatedBy: session.user.id,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in communications PUT:", error);
    return NextResponse.json(
      { 
        error: "Failed to update communication",
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
    const communicationId = searchParams.get('communicationId');

    if (!communicationId) {
      return NextResponse.json(
        { error: "Communication ID is required" },
        { status: 400 }
      );
    }

    // Check if communication exists
    const communication = await getOneDoc("PartnershipCommunication", { communicationId });
    if (!communication) {
      return NextResponse.json(
        { error: "Communication not found" },
        { status: 404 }
      );
    }

    // Check if communication can be deleted
    if (['sent', 'delivered'].includes(communication.status)) {
      return NextResponse.json(
        { error: "Cannot delete sent or delivered communication" },
        { status: 400 }
      );
    }

    // Delete communication and related data
    await deleteOneDoc("PartnershipCommunication", { communicationId });
    await deleteManyDocs("CommunicationThread", { parentCommunicationId: communicationId });
    await deleteManyDocs("CommunicationAttachment", { communicationId });

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('communication_deleted', {
      communicationId,
      partnershipId: communication.partnershipId,
      deletedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      message: "Communication deleted successfully",
      meta: {
        communicationId,
        deletedBy: session.user.id,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in communications DELETE:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete communication",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Validate communication data
 * @param {Object} data - Communication data
 * @returns {Promise<Object>} Validation result
 */
async function validateCommunicationData(data) {
  const errors = [];

  // Required fields
  const requiredFields = ['partnershipId', 'type', 'subject', 'content'];
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  // Validate communication type
  const validTypes = ['email', 'sms', 'newsletter', 'alert', 'announcement', 'meeting_invitation'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`Invalid communication type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate priority
  const validPriorities = ['low', 'normal', 'high', 'urgent'];
  if (data.priority && !validPriorities.includes(data.priority)) {
    errors.push(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
  }

  // Validate recipients
  if (data.recipients && data.recipients.length > 0) {
    data.recipients.forEach((recipient, index) => {
      if (!recipient.email && !recipient.phone) {
        errors.push(`Recipient ${index + 1} must have email or phone`);
      }
    });
  }

  // Validate scheduled date
  if (data.scheduledFor) {
    const scheduledDate = new Date(data.scheduledFor);
    if (scheduledDate <= new Date()) {
      errors.push('Scheduled date must be in the future');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Send communication
 * @param {Object} communication - Communication data
 * @param {Object} options - Send options
 * @param {string} userId - User ID
 * @returns {Object} Updated communication
 */
async function sendCommunication(communication, options, userId) {
  const updatedCommunication = { ...communication };
  
  // Update status
  updatedCommunication.status = 'sent';
  updatedCommunication.sentAt = new Date();
  updatedCommunication.updated = {
    by: userId,
    at: new Date()
  };

  // Send via appropriate channel
  switch (communication.type) {
    case 'email':
      await sendEmailCommunication(communication, options);
      break;
    case 'sms':
      await sendSMSCommunication(communication, options);
      break;
    case 'newsletter':
      await sendNewsletterCommunication(communication, options);
      break;
    default:
      await sendDefaultCommunication(communication, options);
  }

  return updatedCommunication;
}

/**
 * Send email communication
 * @param {Object} communication - Communication data
 * @param {Object} options - Send options
 */
async function sendEmailCommunication(communication, options) {
  // This would typically integrate with an email service like SendGrid, AWS SES, etc.
  console.log(`Sending email communication ${communication.communicationId} to ${communication.recipients.length} recipients`);
  
  // Simulate sending
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Update status to delivered (in real implementation, this would happen via webhook)
  await updateOneDoc("PartnershipCommunication", 
    { communicationId: communication.communicationId }, 
    { 
      status: 'delivered',
      deliveredAt: new Date()
    }
  );
}

/**
 * Send SMS communication
 * @param {Object} communication - Communication data
 * @param {Object} options - Send options
 */
async function sendSMSCommunication(communication, options) {
  // This would typically integrate with an SMS service like Twilio, AWS SNS, etc.
  console.log(`Sending SMS communication ${communication.communicationId} to ${communication.recipients.length} recipients`);
  
  // Simulate sending
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Update status to delivered
  await updateOneDoc("PartnershipCommunication", 
    { communicationId: communication.communicationId }, 
    { 
      status: 'delivered',
      deliveredAt: new Date()
    }
  );
}

/**
 * Schedule communication
 * @param {Object} communication - Communication data
 * @param {Date|string} scheduledFor - Schedule date
 * @param {string} userId - User ID
 * @returns {Object} Updated communication
 */
async function scheduleCommunication(communication, scheduledFor, userId) {
  const updatedCommunication = { ...communication };
  
  updatedCommunication.status = 'scheduled';
  updatedCommunication.scheduledFor = new Date(scheduledFor);
  updatedCommunication.updated = {
    by: userId,
    at: new Date()
  };

  // Add to job queue (this would typically use a job scheduler like Bull, Agenda, etc.)
  await addToCommunicationQueue(communication.communicationId, scheduledFor);

  return updatedCommunication;
}

/**
 * Add communication response
 * @param {Object} communication - Communication data
 * @param {Object} response - Response data
 * @param {string} userId - User ID
 * @returns {Object} Updated communication
 */
async function addCommunicationResponse(communication, response, userId) {
  const updatedCommunication = { ...communication };
  
  const responseData = {
    responseId: uuidv4(),
    from: response.from,
    content: response.content,
    type: response.type || 'email',
    receivedAt: new Date(),
    metadata: response.metadata || {}
  };

  updatedCommunication.responses = [...updatedCommunication.responses, responseData];
  updatedCommunication.tracking.replies += 1;
  updatedCommunication.tracking.lastActivity = new Date();
  updatedCommunication.updated = {
    by: userId,
    at: new Date()
  };

  return updatedCommunication;
}

/**
 * Update communication tracking
 * @param {Object} communication - Communication data
 * @param {Object} tracking - Tracking data
 * @param {string} userId - User ID
 * @returns {Object} Updated communication
 */
async function updateCommunicationTracking(communication, tracking, userId) {
  const updatedCommunication = { ...communication };
  
  updatedCommunication.tracking = {
    ...updatedCommunication.tracking,
    ...tracking,
    lastActivity: new Date()
  };
  updatedCommunication.updated = {
    by: userId,
    at: new Date()
  };

  return updatedCommunication;
}

/**
 * Add communication to queue
 * @param {string} communicationId - Communication ID
 * @param {Date} scheduledFor - Schedule date
 */
async function addToCommunicationQueue(communicationId, scheduledFor) {
  // This would typically add to a job queue
  console.log(`Scheduling communication ${communicationId} for ${scheduledFor}`);
}

/**
 * Process communication template
 * @param {string} communicationId - Communication ID
 * @param {string} templateId - Template ID
 */
async function processCommunicationTemplate(communicationId, templateId) {
  // This would typically process a template and populate variables
  console.log(`Processing template ${templateId} for communication ${communicationId}`);
}