import { FlightReview } from "@/lib/db/models";
import { getOneDoc, getManyDocs } from "../db/getOperationDB.js";
import { updateOneDoc } from "../db/updateOperationDB.js";

// Prompt types and timing
export const PROMPT_TYPES = {
  POST_FLIGHT: 'post_flight',
  POST_STAY: 'post_stay',
  REMINDER: 'reminder',
  INCENTIVE: 'incentive'
};

export const PROMPT_TRIGGERS = {
  FLIGHT_COMPLETED: 'flight_completed',
  CHECKED_IN: 'checked_in',
  BAGGAGE_CLAIMED: 'baggage_claimed',
  DELAY_RESOLVED: 'delay_resolved',
  TIME_ELAPSED: 'time_elapsed'
};

// Prompt timing configurations
const PROMPT_TIMING = {
  [PROMPT_TYPES.POST_FLIGHT]: {
    trigger: PROMPT_TRIGGERS.FLIGHT_COMPLETED,
    delay: 24 * 60 * 60 * 1000, // 24 hours after flight
    maxAttempts: 3,
    retryInterval: 7 * 24 * 60 * 60 * 1000 // 7 days between attempts
  },
  [PROMPT_TYPES.POST_STAY]: {
    trigger: PROMPT_TRIGGERS.CHECKED_OUT,
    delay: 24 * 60 * 60 * 1000, // 24 hours after checkout
    maxAttempts: 3,
    retryInterval: 7 * 24 * 60 * 60 * 1000 // 7 days between attempts
  },
  [PROMPT_TYPES.REMINDER]: {
    trigger: PROMPT_TRIGGERS.TIME_ELAPSED,
    delay: 3 * 24 * 60 * 60 * 1000, // 3 days after flight
    maxAttempts: 2,
    retryInterval: 5 * 24 * 60 * 60 * 1000 // 5 days between attempts
  },
  [PROMPT_TYPES.INCENTIVE]: {
    trigger: PROMPT_TRIGGERS.TIME_ELAPSED,
    delay: 7 * 24 * 60 * 60 * 1000, // 7 days after flight
    maxAttempts: 1,
    retryInterval: 30 * 24 * 60 * 60 * 1000 // 30 days between attempts
  }
};

// Check if user should be prompted for review
export async function shouldPromptForReview(userId, bookingId, promptType = PROMPT_TYPES.POST_FLIGHT) {
  try {
    // Check if user already reviewed this booking
    const existingReview = await getOneDoc("FlightReview", {
      reviewer: userId,
      bookingReference: bookingId
    });

    if (existingReview) {
      return { shouldPrompt: false, reason: 'Review already exists' };
    }

    // Check prompt history
    const promptHistory = await getPromptHistory(userId, bookingId, promptType);
    const timing = PROMPT_TIMING[promptType];

    if (!timing) {
      return { shouldPrompt: false, reason: 'Invalid prompt type' };
    }

    // Check if max attempts reached
    if (promptHistory.length >= timing.maxAttempts) {
      return { shouldPrompt: false, reason: 'Max attempts reached' };
    }

    // Check if enough time has passed since last attempt
    const lastAttempt = promptHistory[promptHistory.length - 1];
    if (lastAttempt) {
      const timeSinceLastAttempt = Date.now() - new Date(lastAttempt.sentAt).getTime();
      if (timeSinceLastAttempt < timing.retryInterval) {
        return { shouldPrompt: false, reason: 'Too soon since last attempt' };
      }
    }

    // Check if trigger conditions are met
    const triggerConditionMet = await checkTriggerCondition(userId, bookingId, timing.trigger);
    if (!triggerConditionMet) {
      return { shouldPrompt: false, reason: 'Trigger condition not met' };
    }

    return { shouldPrompt: true };
  } catch (error) {
    console.error('Error checking review prompt eligibility:', error);
    return { shouldPrompt: false, reason: 'System error' };
  }
}

// Check trigger conditions
async function checkTriggerCondition(userId, bookingId, trigger) {
  try {
    switch (trigger) {
      case PROMPT_TRIGGERS.FLIGHT_COMPLETED:
        // Check if flight is completed and landed
        const booking = await getOneDoc("FlightBooking", { _id: bookingId });
        if (!booking || booking.status !== 'completed') {
          return false;
        }
        
        // Check if flight arrival time is in the past
        const arrivalTime = new Date(booking.segments[booking.segments.length - 1].arrivalTime);
        return arrivalTime < new Date();

      case PROMPT_TRIGGERS.CHECKED_IN:
        // Check if user has checked in
        // This would integrate with check-in system
        return true; // Placeholder

      case PROMPT_TRIGGERS.BAGGAGE_CLAIMED:
        // Check if baggage has been claimed
        // This would integrate with baggage system
        return true; // Placeholder

      case PROMPT_TRIGGERS.DELAY_RESOLVED:
        // Check if flight delay has been resolved
        const booking = await getOneDoc("FlightBooking", { _id: bookingId });
        if (!booking) return false;
        
        return booking.status === 'completed' && booking.hadDelay === true;

      case PROMPT_TRIGGERS.TIME_ELAPSED:
        // Time-based trigger - always return true for time-based prompts
        return true;

      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking trigger condition:', error);
    return false;
  }
}

// Get prompt history for user
async function getPromptHistory(userId, bookingId, promptType) {
  try {
    // In a real implementation, this would query a PromptHistory collection
    // For now, we'll return empty array
    return [];
  } catch (error) {
    console.error('Error getting prompt history:', error);
    return [];
  }
}

// Create review prompt
export async function createReviewPrompt(userId, bookingId, promptType, customMessage = null) {
  try {
    const timing = PROMPT_TIMING[promptType];
    if (!timing) {
      throw new Error('Invalid prompt type');
    }

    const prompt = {
      userId,
      bookingId,
      type: promptType,
      trigger: timing.trigger,
      message: customMessage || generatePromptMessage(promptType),
      sentAt: new Date(),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
    };

    // In a real implementation, this would save to a PromptHistory collection
    console.log(`Created review prompt for user ${userId}, booking ${bookingId}`);

    return { success: true, prompt };
  } catch (error) {
    console.error('Error creating review prompt:', error);
    return { success: false, error: error.message };
  }
}

// Generate prompt message based on type
function generatePromptMessage(promptType) {
  const messages = {
    [PROMPT_TYPES.POST_FLIGHT]: {
      subject: "How was your flight?",
      body: "Share your experience to help other travelers make informed decisions.",
      cta: "Write a Review"
    },
    [PROMPT_TYPES.POST_STAY]: {
      subject: "How was your stay?",
      body: "Tell us about your accommodation experience.",
      cta: "Review Your Stay"
    },
    [PROMPT_TYPES.REMINDER]: {
      subject: "Reminder: Share your feedback",
      body: "Your recent travel experience could help others. Take a moment to share your thoughts.",
      cta: "Leave a Review"
    },
    [PROMPT_TYPES.INCENTIVE]: {
      subject: "Earn rewards for your review!",
      body: "Share your detailed review and earn bonus points in our loyalty program.",
      cta: "Review & Earn"
    }
  };

  return messages[promptType] || messages[PROMPT_TYPES.POST_FLIGHT];
}

// Send review prompt notification
export async function sendReviewPrompt(userId, prompt) {
  try {
    // In a real implementation, this would:
    // 1. Send email notification
    // 2. Send push notification
    // 3. Create in-app notification
    // 4. Update user notification center

    console.log(`Sending review prompt to user ${userId}:`, prompt);

    // Mark prompt as sent
    prompt.status = 'sent';
    prompt.sentAt = new Date();

    return { success: true, prompt };
  } catch (error) {
    console.error('Error sending review prompt:', error);
    return { success: false, error: error.message };
  }
}

// Batch create prompts for multiple users
export async function batchCreateReviewPrompts(prompts) {
  const results = [];

  for (const promptData of prompts) {
    try {
      const shouldPromptResult = await shouldPromptForReview(
        promptData.userId,
        promptData.bookingId,
        promptData.type
      );

      if (shouldPromptResult.shouldPrompt) {
        const prompt = await createReviewPrompt(
          promptData.userId,
          promptData.bookingId,
          promptData.type,
          promptData.customMessage
        );

        if (prompt.success) {
          await sendReviewPrompt(promptData.userId, prompt.prompt);
          results.push({
            userId: promptData.userId,
            bookingId: promptData.bookingId,
            success: true,
            promptId: prompt.prompt._id
          });
        } else {
          results.push({
            userId: promptData.userId,
            bookingId: promptData.bookingId,
            success: false,
            error: prompt.error
          });
        }
      } else {
        results.push({
          userId: promptData.userId,
          bookingId: promptData.bookingId,
          success: false,
          reason: shouldPromptResult.reason
        });
      }
    } catch (error) {
      results.push({
        userId: promptData.userId,
        bookingId: promptData.bookingId,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

// Get prompt statistics
export async function getPromptStats(timeRange = '30days') {
  try {
    const endDate = new Date();
    let startDate;

    switch (timeRange) {
      case '7days':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // In a real implementation, this would aggregate from PromptHistory collection
    const mockStats = {
      totalPrompts: 1250,
      sentPrompts: 1180,
      deliveredPrompts: 1150,
      openedPrompts: 420,
      clickedPrompts: 180,
      conversionRate: 15.2,
      promptTypeBreakdown: {
        [PROMPT_TYPES.POST_FLIGHT]: 850,
        [PROMPT_TYPES.POST_STAY]: 300,
        [PROMPT_TYPES.REMINDER]: 80,
        [PROMPT_TYPES.INCENTIVE]: 20
      },
      timeRange
    };

    return mockStats;
  } catch (error) {
    console.error('Error getting prompt stats:', error);
    return {
      totalPrompts: 0,
      sentPrompts: 0,
      deliveredPrompts: 0,
      openedPrompts: 0,
      clickedPrompts: 0,
      conversionRate: 0,
      promptTypeBreakdown: {},
      timeRange
    };
  }
}

// Track prompt conversion
export async function trackPromptConversion(promptId, action, metadata = {}) {
  try {
    const conversion = {
      promptId,
      action, // 'opened', 'clicked', 'review_started', 'review_completed'
      timestamp: new Date(),
      metadata
    };

    // In a real implementation, this would save to a PromptConversion collection
    console.log('Tracking prompt conversion:', conversion);

    return { success: true, conversion };
  } catch (error) {
    console.error('Error tracking prompt conversion:', error);
    return { success: false, error: error.message };
  }
}

// Get optimal prompt timing for user
export async function getOptimalPromptTiming(userId) {
  try {
    // Analyze user's past behavior to determine optimal timing
    const userHistory = await getPromptHistory(userId);
    
    // In a real implementation, this would analyze:
    // - When user typically opens emails
    // - When user typically uses the app
    // - User's time zone
    // - Past prompt response rates by time of day
    
    // For now, return a reasonable default
    return {
      optimalHour: 19, // 7 PM user local time
      optimalDay: 'friday', // Friday
      timezone: 'UTC'
    };
  } catch (error) {
    console.error('Error getting optimal prompt timing:', error);
    return {
      optimalHour: 19,
      optimalDay: 'friday',
      timezone: 'UTC'
    };
  }
}

// Personalize prompt message based on user preferences
export async function personalizePromptMessage(baseMessage, userId, bookingData) {
  try {
    // In a real implementation, this would:
    // - Use user's preferred language
    // - Reference specific flight details
    // - Use user's name
    // - Consider user's review history
    
    const personalization = {
      userName: 'Traveler', // Would get from user profile
      flightNumber: bookingData.flightNumber,
      route: `${bookingData.departureAirport} → ${bookingData.arrivalAirport}`,
      airline: bookingData.airlineName,
      language: 'en' // Would get from user preferences
    };

    return {
      ...baseMessage,
      personalization,
      subject: baseMessage.subject.replace('your', `${personalization.userName}'s`),
      body: baseMessage.body
        .replace('your experience', `${personalization.userName}'s experience`)
        .replace('flight', `flight ${personalization.flightNumber}`)
        .replace('travel', `travel from ${personalization.route}`)
    };
  } catch (error) {
    console.error('Error personalizing prompt message:', error);
    return baseMessage;
  }
}