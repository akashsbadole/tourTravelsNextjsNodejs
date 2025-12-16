import { getOneDoc, updateOneDoc } from "@/lib/db/getOperationDB";
import { strToObjectId } from "@/lib/db/utilsDB";

/**
 * Send modification notification to user
 * @param {Object} params - Notification parameters
 * @returns {Object} Notification result
 */
export async function sendModificationNotification(params) {
  const {
    modificationId,
    userId,
    type, // 'requested', 'approved', 'rejected', 'completed', 'failed'
    modificationDetails,
    bookingData,
    additionalData = {}
  } = params;

  try {
    // Get user details for email
    const user = await getOneDoc("User", { _id: strToObjectId(userId) });
    if (!user) {
      throw new Error("User not found");
    }

    // Get modification details
    const modification = await getOneDoc("FlightBookingModification", { modificationId });
    if (!modification) {
      throw new Error("Modification not found");
    }

    // Prepare notification content
    const notificationContent = await prepareNotificationContent({
      type,
      modification,
      bookingData,
      user,
      additionalData
    });

    // Send email notification
    const emailResult = await sendEmailNotification({
      to: user.email,
      subject: notificationContent.emailSubject,
      template: notificationContent.emailTemplate,
      data: notificationContent.emailData
    });

    // Send SMS notification if enabled
    let smsResult = null;
    if (user.phoneNumber && user.smsNotifications) {
      smsResult = await sendSMSNotification({
        to: user.phoneNumber,
        message: notificationContent.smsMessage
      });
    }

    // Send push notification if enabled
    let pushResult = null;
    if (user.pushNotifications && user.deviceTokens?.length > 0) {
      pushResult = await sendPushNotification({
        tokens: user.deviceTokens,
        title: notificationContent.pushTitle,
        body: notificationContent.pushBody,
        data: {
          type: "modification_update",
          modificationId,
          status: type
        }
      });
    }

    // Update modification notification status
    await updateOneDoc("FlightBookingModification", 
      { modificationId }, 
      { 
        notificationSent: true,
        notificationSentAt: new Date(),
        emailSent: emailResult.success,
        emailSentAt: emailResult.success ? new Date() : null,
        metadata: {
          ...modification.metadata,
          notifications: {
            email: emailResult,
            sms: smsResult,
            push: pushResult
          }
        }
      }
    );

    return {
      success: true,
      email: emailResult,
      sms: smsResult,
      push: pushResult
    };

  } catch (error) {
    console.error('Error sending modification notification:', error);
    throw new Error(`Failed to send notification: ${error.message}`);
  }
}

/**
 * Prepare notification content based on type
 * @param {Object} params - Content preparation parameters
 * @returns {Object} Notification content
 */
async function prepareNotificationContent(params) {
  const { type, modification, bookingData, user, additionalData } = params;

  const modificationType = modification.modifications[0]?.type;
  const modificationId = modification.modificationId;
  const pnrCode = modification.pnrCode;

  const baseData = {
    firstName: user.firstName,
    lastName: user.lastName,
    modificationId,
    pnrCode,
    modificationType: modificationType.replace('_', ' ').toUpperCase(),
    flightNumber: bookingData?.itineraryFlightNumber,
    flightDate: bookingData?.segments?.[0]?.departureDateTime,
    requestedAt: modification.requestedAt,
    processedAt: modification.processedAt,
    totalCost: modification.totalAdditionalCost,
    totalRefund: modification.totalRefundAmount,
    currency: modification.currency
  };

  switch (type) {
    case 'requested':
      return {
        emailSubject: `Modification Request Received - ${pnrCode}`,
        emailTemplate: 'modification-requested',
        emailData: {
          ...baseData,
          expectedProcessingTime: '24-48 hours',
          nextSteps: [
            'We will process your modification request',
            'You will receive updates via email',
            'Contact support if you need immediate assistance'
          ]
        },
        smsMessage: `Your flight modification request (${modificationId}) has been received. We'll process it within 24-48 hours.`,
        pushTitle: 'Modification Request Received',
        pushBody: `Your request for flight modification has been received and is being processed.`
      };

    case 'approved':
      return {
        emailSubject: `Modification Approved - ${pnrCode}`,
        emailTemplate: 'modification-approved',
        emailData: {
          ...baseData,
          approvedBy: additionalData.approvedBy,
          approvedAt: modification.approvedAt,
          nextSteps: [
            'Your modification has been approved',
            'Processing will begin shortly',
            'You will receive final confirmation'
          ]
        },
        smsMessage: `Your modification request (${modificationId}) has been approved and is now being processed.`,
        pushTitle: 'Modification Approved',
        pushBody: `Your flight modification has been approved and is being processed.`
      };

    case 'rejected':
      return {
        emailSubject: `Modification Request Rejected - ${pnrCode}`,
        emailTemplate: 'modification-rejected',
        emailData: {
          ...baseData,
          rejectionReason: modification.rejectionReason,
          rejectedAt: modification.processedAt,
          nextSteps: [
            'Your modification request could not be processed',
            'Reason: ' + modification.rejectionReason,
            'Contact support for assistance'
          ]
        },
        smsMessage: `Your modification request (${modificationId}) was not approved. Please check your email for details.`,
        pushTitle: 'Modification Request Rejected',
        pushBody: `Your modification request could not be processed. Check email for details.`
      };

    case 'completed':
      return {
        emailSubject: `Modification Completed - ${pnrCode}`,
        emailTemplate: 'modification-completed',
        emailData: {
          ...baseData,
          newPNRCode: modification.completionDetails?.newPNRCode,
          newTicketNumbers: modification.completionDetails?.newTicketNumbers,
          confirmationCode: modification.completionDetails?.airlineConfirmationCode,
          nextSteps: [
            'Your modification has been completed successfully',
            'Updated tickets have been sent',
            'Check in 24 hours before departure'
          ]
        },
        smsMessage: `Your flight modification (${modificationId}) has been completed successfully. Check your email for updated tickets.`,
        pushTitle: 'Modification Completed',
        pushBody: `Your flight modification has been completed successfully!`
      };

    case 'failed':
      return {
        emailSubject: `Modification Processing Failed - ${pnrCode}`,
        emailTemplate: 'modification-failed',
        emailData: {
          ...baseData,
          failureReason: modification.modifications[0]?.failureReason,
          failedAt: modification.processedAt,
          nextSteps: [
            'We encountered an issue processing your modification',
            'Our team has been notified',
            'We will contact you shortly'
          ]
        },
        smsMessage: `We encountered an issue with your modification request (${modificationId}). Our team will contact you.`,
        pushTitle: 'Modification Processing Failed',
        pushBody: `We encountered an issue processing your modification. Our team will contact you.`
      };

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

/**
 * Send email notification
 * @param {Object} params - Email parameters
 * @returns {Object} Email result
 */
async function sendEmailNotification(params) {
  try {
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, returning a mock success response
    console.log('Sending email notification:', params);
    
    return {
      success: true,
      messageId: `email_${Date.now()}`,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send SMS notification
 * @param {Object} params - SMS parameters
 * @returns {Object} SMS result
 */
async function sendSMSNotification(params) {
  try {
    // This would integrate with your SMS service (Twilio, AWS SNS, etc.)
    // For now, returning a mock success response
    console.log('Sending SMS notification:', params);
    
    return {
      success: true,
      messageId: `sms_${Date.now()}`,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send push notification
 * @param {Object} params - Push notification parameters
 * @returns {Object} Push result
 */
async function sendPushNotification(params) {
  try {
    // This would integrate with your push notification service (Firebase, OneSignal, etc.)
    // For now, returning a mock success response
    console.log('Sending push notification:', params);
    
    return {
      success: true,
      messageId: `push_${Date.now()}`,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send modification reminder notifications
 * @param {string} modificationId - Modification ID
 * @returns {Object} Reminder result
 */
export async function sendModificationReminder(modificationId) {
  try {
    const modification = await getOneDoc("FlightBookingModification", { modificationId });
    if (!modification) {
      throw new Error("Modification not found");
    }

    // Only send reminders for pending modifications
    if (!['requested', 'pending_approval', 'processing'].includes(modification.status)) {
      return { success: true, message: "No reminder needed" };
    }

    const hoursSinceRequest = (new Date() - new Date(modification.requestedAt)) / (1000 * 60 * 60);
    
    // Send reminder if more than 24 hours have passed
    if (hoursSinceRequest < 24) {
      return { success: true, message: "Too soon for reminder" };
    }

    return await sendModificationNotification({
      modificationId,
      userId: modification.requestedBy,
      type: 'reminder',
      modification,
      additionalData: {
        hoursSinceRequest: Math.round(hoursSinceRequest),
        reminderType: 'processing_delay'
      }
    });

  } catch (error) {
    console.error('Error sending modification reminder:', error);
    throw new Error(`Failed to send reminder: ${error.message}`);
  }
}

/**
 * Send modification status update to admin
 * @param {Object} params - Admin notification parameters
 * @returns {Object} Admin notification result
 */
export async function notifyAdminModificationUpdate(params) {
  const { modificationId, action, performedBy, details } = params;

  try {
    // Get admin users who should receive notifications
    const adminUsers = await getAdminUsers();
    
    const notificationPromises = adminUsers.map(admin => 
      sendEmailNotification({
        to: admin.email,
        subject: `Modification ${action} - ${modificationId}`,
        template: 'admin-modification-update',
        data: {
          adminName: admin.firstName,
          modificationId,
          action,
          performedBy,
          details,
          timestamp: new Date()
        }
      })
    );

    const results = await Promise.allSettled(notificationPromises);
    
    return {
      success: true,
      notifiedAdmins: results.filter(r => r.status === 'fulfilled').length,
      failedNotifications: results.filter(r => r.status === 'rejected').length
    };

  } catch (error) {
    console.error('Error notifying admins:', error);
    throw new Error(`Failed to notify admins: ${error.message}`);
  }
}

/**
 * Get admin users for notifications
 * @returns {Array} Admin users
 */
async function getAdminUsers() {
  try {
    // This would query your user database for admin users
    // For now, returning a mock array
    return [
      {
        email: 'admin@travelagency.com',
        firstName: 'Admin',
        lastName: 'User'
      }
    ];

  } catch (error) {
    console.error('Error getting admin users:', error);
    return [];
  }
}

export default {
  sendModificationNotification,
  sendModificationReminder,
  notifyAdminModificationUpdate
};