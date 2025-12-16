import { z } from "zod";
import { auth } from "../auth";
import { getOneDoc, updateOneDoc, createOneDoc } from "../db";
import { revalidateTag } from "next/cache";
import { strToObjectId } from "../db/utilsDB";
import { 
  EnhancedUserProfile, 
  TravelAnalytics, 
  AdminProfileManagement 
} from "../db/models";

// Validation schemas
const travelPreferencesSchema = z.object({
  travelStyle: z.enum(['budget', 'mid_range', 'luxury', 'backpacker', 'family', 'business', 'adventure']),
  accommodationTypes: z.array(z.string()).min(1),
  transportModes: z.array(z.string()).min(1),
  tripDuration: z.object({
    min: z.number().min(1).max(365),
    max: z.number().min(1).max(365),
  }),
  budgetRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default('USD'),
  }),
  flightPreferences: z.object({
    preferredAirlines: z.array(z.string()).optional(),
    preferredCabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']),
    seatPreferences: z.array(z.string()).optional(),
    mealPreferences: z.array(z.string()).optional(),
  }),
  hotelPreferences: z.object({
    preferredChains: z.array(z.string()).optional(),
    roomType: z.enum(['standard', 'deluxe', 'suite', 'presidential']),
    bedPreferences: z.array(z.string()).optional(),
    amenities: z.array(z.string()).optional(),
  }),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1).max(100),
  relationship: z.string().min(1).max(50),
  phone: z.object({
    number: z.string().regex(/^\d+$/),
    dialCode: z.string().min(1),
  }),
  email: z.string().email().optional(),
  address: z.string().max(200).optional(),
  isPrimary: z.boolean().default(false),
});

const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'friends_only', 'private']),
  dataSharing: z.object({
    analytics: z.boolean(),
    marketing: z.boolean(),
    personalization: z.boolean(),
    partners: z.boolean(),
  }),
  communicationPreferences: z.object({
    email: z.object({
      promotional: z.boolean(),
      transactional: z.boolean(),
      newsletter: z.boolean(),
      priceAlerts: z.boolean(),
    }),
    sms: z.object({
      promotional: z.boolean(),
      transactional: z.boolean(),
      alerts: z.boolean(),
    }),
    push: z.object({
      promotional: z.boolean(),
      transactional: z.boolean(),
      recommendations: z.boolean(),
    }),
  }),
  socialSettings: z.object({
    allowFriendRequests: z.boolean(),
    showTravelHistory: z.boolean(),
    showCurrentTrips: z.boolean(),
    showWishlist: z.boolean(),
    allowTagging: z.boolean(),
  }),
});

const travelDocumentSchema = z.object({
  documentType: z.enum(['passport', 'visa', 'driver_license', 'national_id', 'health_certificate', 'travel_insurance']),
  documentNumber: z.string().min(1),
  issuingCountry: z.string().min(2).max(2),
  issueDate: z.date(),
  expiryDate: z.date(),
  documentUrl: z.string().url().optional(),
});

const loyaltyProgramSchema = z.object({
  programName: z.string().min(1),
  programType: z.enum(['airline', 'hotel', 'credit_card', 'travel_agency', 'general']),
  membershipNumber: z.string().min(1),
  membershipLevel: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Enhanced profile actions
export async function updateTravelPreferencesAction(prevState, formData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: "Unauthorized" };
  }

  const data = Object.fromEntries(formData);
  const validation = travelPreferencesSchema.safeParse(data);

  if (!validation.success) {
    const errors = {};
    validation.error.issues.forEach((issue) => {
      errors[issue.path.join('.')] = issue.message;
    });
    return { success: false, error: errors };
  }

  try {
    const userId = session.user.id;
    
    // Get or create enhanced user profile
    let enhancedProfile = await getOneDoc("EnhancedUserProfile", { userId });
    
    if (!enhancedProfile) {
      // Create new enhanced profile
      enhancedProfile = await createOneDoc("EnhancedUserProfile", {
        userId,
        travelPreferences: validation.data,
        profileCompletion: {
          overallPercentage: 0,
          sections: {
            basicInfo: 0,
            personalDetails: 0,
            preferences: 25,
            documents: 0,
            emergency: 0,
            verification: 0,
            social: 0,
            security: 0,
          },
          lastUpdated: new Date(),
          rewards: [],
        },
      });
    } else {
      // Update existing profile
      await updateOneDoc(
        "EnhancedUserProfile",
        { userId },
        { 
          $set: { 
            'travelPreferences': validation.data,
            'metadata.updatedAt': new Date()
          }
        }
      );
    }

    // Trigger profile completion recalculation
    await calculateProfileCompletion(userId);

    revalidateTag("enhancedProfile");
    return { 
      success: true, 
      message: "Travel preferences updated successfully" 
    };
  } catch (error) {
    console.error("Error updating travel preferences:", error);
    return { 
      success: false, 
      message: "Failed to update travel preferences" 
    };
  }
}

export async function addEmergencyContactAction(prevState, formData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: "Unauthorized" };
  }

  const data = Object.fromEntries(formData);
  const validation = emergencyContactSchema.safeParse(data);

  if (!validation.success) {
    const errors = {};
    validation.error.issues.forEach((issue) => {
      errors[issue.path.join('.')] = issue.message;
    });
    return { success: false, error: errors };
  }

  try {
    const userId = session.user.id;
    
    // Get or create enhanced user profile
    let enhancedProfile = await getOneDoc("EnhancedUserProfile", { userId });
    
    if (!enhancedProfile) {
      enhancedProfile = await createOneDoc("EnhancedUserProfile", {
        userId,
        emergencyContacts: [validation.data],
        profileCompletion: {
          overallPercentage: 0,
          sections: {
            basicInfo: 0,
            personalDetails: 0,
            preferences: 0,
            documents: 0,
            emergency: 10,
            verification: 0,
            social: 0,
            security: 0,
          },
          lastUpdated: new Date(),
          rewards: [],
        },
      });
    } else {
      // If setting as primary, unset other primary contacts
      if (validation.data.isPrimary) {
        await updateOneDoc(
          "EnhancedUserProfile",
          { 
            userId, 
            'emergencyContacts.isPrimary': true 
          },
          { 
            $set: { 
              'emergencyContacts.$.isPrimary': false 
            } 
          }
        );
      }
      
      // Add new emergency contact
      await updateOneDoc(
        "EnhancedUserProfile",
        { userId },
        { 
          $push: { 
            emergencyContacts: validation.data 
          },
          $set: { 
            'metadata.updatedAt': new Date() 
          }
        }
      );
    }

    // Trigger profile completion recalculation
    await calculateProfileCompletion(userId);

    revalidateTag("enhancedProfile");
    return { 
      success: true, 
      message: "Emergency contact added successfully" 
    };
  } catch (error) {
    console.error("Error adding emergency contact:", error);
    return { 
      success: false, 
      message: "Failed to add emergency contact" 
    };
  }
}

export async function updatePrivacySettingsAction(prevState, formData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: "Unauthorized" };
  }

  const data = Object.fromEntries(formData);
  const validation = privacySettingsSchema.safeParse(data);

  if (!validation.success) {
    const errors = {};
    validation.error.issues.forEach((issue) => {
      errors[issue.path.join('.')] = issue.message;
    });
    return { success: false, error: errors };
  }

  try {
    const userId = session.user.id;
    
    // Get or create enhanced user profile
    let enhancedProfile = await getOneDoc("EnhancedUserProfile", { userId });
    
    if (!enhancedProfile) {
      enhancedProfile = await createOneDoc("EnhancedUserProfile", {
        userId,
        privacy: validation.data,
        profileCompletion: {
          overallPercentage: 0,
          sections: {
            basicInfo: 0,
            personalDetails: 0,
            preferences: 0,
            documents: 0,
            emergency: 0,
            verification: 0,
            social: 0,
            security: 20,
          },
          lastUpdated: new Date(),
          rewards: [],
        },
      });
    } else {
      // Update existing profile
      await updateOneDoc(
        "EnhancedUserProfile",
        { userId },
        { 
          $set: { 
            'privacy': validation.data,
            'metadata.updatedAt': new Date()
          }
        }
      );
    }

    // Trigger profile completion recalculation
    await calculateProfileCompletion(userId);

    revalidateTag("enhancedProfile");
    return { 
      success: true, 
      message: "Privacy settings updated successfully" 
    };
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return { 
      success: false, 
      message: "Failed to update privacy settings" 
    };
  }
}

export async function uploadTravelDocumentAction(prevState, formData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: "Unauthorized" };
  }

  const data = Object.fromEntries(formData);
  const validation = travelDocumentSchema.safeParse(data);

  if (!validation.success) {
    const errors = {};
    validation.error.issues.forEach((issue) => {
      errors[issue.path.join('.')] = issue.message;
    });
    return { success: false, error: errors };
  }

  try {
    const userId = session.user.id;
    
    // Get or create enhanced user profile
    let enhancedProfile = await getOneDoc("EnhancedUserProfile", { userId });
    
    const documentData = {
      ...validation.data,
      isVerified: false,
      verificationStatus: 'pending',
      verifiedAt: null,
      verifiedBy: null,
      verificationNotes: null,
      reminders: [{
        type: 'email',
        daysBeforeExpiry: 90,
        enabled: true
      }]
    };
    
    if (!enhancedProfile) {
      enhancedProfile = await createOneDoc("EnhancedUserProfile", {
        userId,
        travelDocuments: [documentData],
        profileCompletion: {
          overallPercentage: 0,
          sections: {
            basicInfo: 0,
            personalDetails: 0,
            preferences: 0,
            documents: 15,
            emergency: 0,
            verification: 0,
            social: 0,
            security: 0,
          },
          lastUpdated: new Date(),
          rewards: [],
        },
      });
    } else {
      // Add new document
      await updateOneDoc(
        "EnhancedUserProfile",
        { userId },
        { 
          $push: { 
            travelDocuments: documentData 
          },
          $set: { 
            'metadata.updatedAt': new Date() 
          }
        }
      );
    }

    // Create verification workflow for admin review
    await createOneDoc("AdminProfileManagement", {
      configuration: {},
      activeWorkflows: [{
        workflowId: `doc_${Date.now()}_${userId}`,
        userId: strToObjectId(userId),
        verificationType: 'document',
        status: 'pending',
        priority: 'medium',
        submittedAt: new Date(),
        submissionData: {
          documents: [{
            type: documentData.documentType,
            url: documentData.documentUrl,
            filename: `${documentData.documentType}_${documentData.documentNumber}`,
            uploadedAt: new Date(),
            fileSize: 0, // Would be calculated from actual file
            checksum: '', // Would be calculated from actual file
          }],
          information: {
            documentType: documentData.documentType,
            documentNumber: documentData.documentNumber,
            issuingCountry: documentData.issuingCountry,
            issueDate: documentData.issueDate,
            expiryDate: documentData.expiryDate,
          },
          additionalInfo: null
        },
        history: [{
          action: 'submitted',
          timestamp: new Date(),
          performedBy: strToObjectId(userId),
          notes: 'Document submitted for verification',
          attachments: [documentData.documentUrl]
        }],
        notifications: [{
          type: 'email',
          recipient: session.user.email,
          template: 'document_submitted',
          sentAt: new Date(),
          status: 'pending'
        }],
        sla: {
          firstResponseTime: 24,
          resolutionTime: 72,
          actualResponseTime: null,
          actualResolutionTime: null,
          metSLA: null
        }
      }],
      bulkOperations: [],
      analytics: [],
      auditLogs: [],
      adminTeam: {
        members: [],
        workload: {
          pendingCases: 0,
          criticalCases: 0,
          averageWorkload: 0
        }
      },
      systemHealth: {
        lastBackup: new Date(),
        lastMaintenance: new Date(),
        performanceMetrics: {
          averageResponseTime: 0,
          errorRate: 0,
          uptime: 100
        },
        alerts: []
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        lastAnalyticsUpdate: new Date(),
        maintenanceMode: false,
        maintenanceMessage: null
      }
    });

    // Trigger profile completion recalculation
    await calculateProfileCompletion(userId);

    revalidateTag("enhancedProfile");
    return { 
      success: true, 
      message: "Document uploaded successfully and sent for verification" 
    };
  } catch (error) {
    console.error("Error uploading travel document:", error);
    return { 
      success: false, 
      message: "Failed to upload document" 
    };
  }
}

export async function addLoyaltyProgramAction(prevState, formData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: "Unauthorized" };
  }

  const data = Object.fromEntries(formData);
  const validation = loyaltyProgramSchema.safeParse(data);

  if (!validation.success) {
    const errors = {};
    validation.error.issues.forEach((issue) => {
      errors[issue.path.join('.')] = issue.message;
    });
    return { success: false, error: errors };
  }

  try {
    const userId = session.user.id;
    
    // Get or create enhanced user profile
    let enhancedProfile = await getOneDoc("EnhancedUserProfile", { userId });
    
    const programData = {
      ...validation.data,
      pointsBalance: 0,
      pointsExpiry: null,
      benefits: [],
      linkedAccount: null,
      lastSynced: new Date(),
      syncFrequency: 'weekly',
      apiCredentials: {
        apiKey: null,
        memberSecret: null,
        programId: null
      }
    };
    
    if (!enhancedProfile) {
      enhancedProfile = await createOneDoc("EnhancedUserProfile", {
        userId,
        loyaltyPrograms: {
          programs: [programData],
          totalPoints: 0,
          totalValue: 0,
          preferredProgram: programData.programName,
          autoRedeem: false,
          notifications: {
            pointsExpiring: true,
            levelChanges: true,
            promotions: true
          }
        },
        profileCompletion: {
          overallPercentage: 0,
          sections: {
            basicInfo: 0,
            personalDetails: 0,
            preferences: 0,
            documents: 0,
            emergency: 0,
            verification: 0,
            social: 0,
            security: 0,
          },
          lastUpdated: new Date(),
          rewards: [],
        },
      });
    } else {
      // Add new loyalty program
      await updateOneDoc(
        "EnhancedUserProfile",
        { userId },
        { 
          $push: { 
            'loyaltyPrograms.programs': programData 
          },
          $set: { 
            'metadata.updatedAt': new Date() 
          }
        }
      );
    }

    revalidateTag("enhancedProfile");
    return { 
      success: true, 
      message: "Loyalty program added successfully" 
    };
  } catch (error) {
    console.error("Error adding loyalty program:", error);
    return { 
      success: false, 
      message: "Failed to add loyalty program" 
    };
  }
}

// Helper function to calculate profile completion
async function calculateProfileCompletion(userId) {
  try {
    const enhancedProfile = await getOneDoc("EnhancedUserProfile", { userId });
    const user = await getOneDoc("User", { _id: strToObjectId(userId) });
    
    if (!enhancedProfile || !user) return;

    let totalScore = 0;
    const maxScore = 100;
    
    // Basic info (30%)
    if (user.firstName && user.lastName) totalScore += 10;
    if (user.emails?.length > 0) totalScore += 5;
    if (user.phoneNumbers?.length > 0) totalScore += 5;
    if (user.dateOfBirth) totalScore += 5;
    if (user.address) totalScore += 5;
    
    // Personal details (15%)
    if (user.profileImage) totalScore += 10;
    if (user.coverImage) totalScore += 5;
    
    // Preferences (20%)
    if (enhancedProfile.travelPreferences) {
      if (enhancedProfile.travelPreferences.travelStyle) totalScore += 5;
      if (enhancedProfile.travelPreferences.accommodationTypes?.length > 0) totalScore += 5;
      if (enhancedProfile.travelPreferences.transportModes?.length > 0) totalScore += 5;
      if (enhancedProfile.travelPreferences.flightPreferences) totalScore += 5;
    }
    
    // Documents (15%)
    if (enhancedProfile.travelDocuments?.length > 0) {
      totalScore += 10;
      const verifiedDocs = enhancedProfile.travelDocuments.filter(doc => doc.isVerified);
      if (verifiedDocs.length > 0) totalScore += 5;
    }
    
    // Emergency contacts (10%)
    if (enhancedProfile.emergencyContacts?.length > 0) {
      totalScore += 10;
    }
    
    // Verification (10%)
    if (enhancedProfile.verification?.isVerified) {
      totalScore += 10;
    }
    
    // Social (5%)
    if (enhancedProfile.social?.profileSharing?.shareCode || 
        enhancedProfile.social?.wishlist?.length > 0) {
      totalScore += 5;
    }
    
    // Security (5%)
    if (enhancedProfile.security?.twoFactorAuth?.enabled) {
      totalScore += 5;
    }

    const overallPercentage = Math.min(Math.round((totalScore / maxScore) * 100), 100);
    
    // Check for rewards
    const currentPercentage = enhancedProfile.profileCompletion?.overallPercentage || 0;
    const newRewards = [];
    
    // Reward milestones
    if (currentPercentage < 50 && overallPercentage >= 50) {
      newRewards.push({
        type: 'badge',
        value: {
          name: 'Profile Explorer',
          description: 'Completed 50% of profile',
          iconUrl: '/badges/explorer.png'
        },
        unlockedAt: new Date(),
        description: 'Profile Explorer Badge - 50% Complete'
      });
    }
    
    if (currentPercentage < 80 && overallPercentage >= 80) {
      newRewards.push({
        type: 'points',
        value: 100,
        unlockedAt: new Date(),
        description: 'Profile Completion Bonus - 80% Complete'
      });
    }
    
    if (currentPercentage < 100 && overallPercentage >= 100) {
      newRewards.push({
        type: 'badge',
        value: {
          name: 'Profile Master',
          description: 'Completed 100% of profile',
          iconUrl: '/badges/master.png'
        },
        unlockedAt: new Date(),
        description: 'Profile Master Badge - 100% Complete'
      });
      
      newRewards.push({
        type: 'discount',
        value: {
          code: 'PROFILE10',
          percentage: 10,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        unlockedAt: new Date(),
        description: 'Profile Completion Discount - 10% off next booking'
      });
    }

    // Update profile completion
    await updateOneDoc(
      "EnhancedUserProfile",
      { userId },
      { 
        $set: { 
          'profileCompletion.overallPercentage': overallPercentage,
          'profileCompletion.lastUpdated': new Date(),
          ...(newRewards.length > 0 && {
            '$push': { 'profileCompletion.rewards': { $each: newRewards } }
          })
        }
      }
    );

  } catch (error) {
    console.error("Error calculating profile completion:", error);
  }
}

// Get enhanced profile data
export async function getEnhancedProfileAction(userId) {
  try {
    const enhancedProfile = await getOneDoc("EnhancedUserProfile", { userId });
    const user = await getOneDoc("User", { _id: strToObjectId(userId) });
    
    if (!enhancedProfile) {
      // Create basic profile if it doesn't exist
      const newProfile = await createOneDoc("EnhancedUserProfile", {
        userId,
        travelPreferences: {},
        emergencyContacts: [],
        travelDocuments: [],
        profileCompletion: {
          overallPercentage: 0,
          sections: {
            basicInfo: 0,
            personalDetails: 0,
            preferences: 0,
            documents: 0,
            emergency: 0,
            verification: 0,
            social: 0,
            security: 0,
          },
          lastUpdated: new Date(),
          rewards: [],
        },
        verification: {
          isVerified: false,
          verificationLevel: 'basic',
          verificationMethods: [],
          badges: [],
          trustScore: 0,
          verificationHistory: []
        },
        privacy: {
          profileVisibility: 'private',
          dataSharing: {
            analytics: true,
            marketing: false,
            personalization: true,
            partners: false
          },
          communicationPreferences: {
            email: {
              promotional: true,
              transactional: true,
              newsletter: false,
              priceAlerts: true
            },
            sms: {
              promotional: false,
              transactional: true,
              alerts: true
            },
            push: {
              promotional: true,
              transactional: true,
              recommendations: true
            }
          },
          socialSettings: {
            allowFriendRequests: true,
            showTravelHistory: false,
            showCurrentTrips: true,
            showWishlist: false,
            allowTagging: true
          }
        },
        security: {
          twoFactorAuth: {
            enabled: false,
            methods: [],
            enforced: false
          },
          loginMonitoring: {
            enabled: true,
            alertOnNewDevice: true,
            alertOnSuspiciousActivity: true,
            sessionTimeout: 1440,
            maxConcurrentSessions: 3
          },
          passwordPolicy: {
            lastChanged: null,
            expiryDays: 90,
            complexityRequired: true,
            preventReuse: 5
          },
          loginHistory: []
        },
        social: {
          profileSharing: {
            shareCode: null,
            isPublic: false,
            publicProfileUrl: null,
            allowPublicView: false
          },
          travelBuddy: {
            preferences: [],
            travelStyle: 'mid_range',
            bio: null,
            interests: [],
            languages: [],
            availability: 'not_interested',
            preferredDestinations: [],
            avoidedDestinations: []
          },
          wishlist: [],
          socialFeed: {
            isEnabled: true,
            autoShareBookings: false,
            autoShareReviews: true,
            showRecommendations: true
          }
        },
        loyaltyPrograms: {
          programs: [],
          totalPoints: 0,
          totalValue: 0,
          preferredProgram: null,
          autoRedeem: false,
          notifications: {
            pointsExpiring: true,
            levelChanges: true,
            promotions: true
          }
        },
        mobile: {
          biometricAuth: {
            enabled: false,
            type: null,
            deviceId: null
          },
          quickActions: [],
          mobilePreferences: {
            offlineMode: true,
            autoDownloadDocuments: true,
            pushNotifications: true,
            locationServices: false,
            dataUsage: 'medium'
          },
          devices: []
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
          profileVersion: 1,
          migrationHistory: []
        }
      });
      
      return {
        success: true,
        data: {
          ...newProfile,
          user
        }
      };
    }

    return {
      success: true,
      data: {
        ...enhancedProfile,
        user
      }
    };
  } catch (error) {
    console.error("Error getting enhanced profile:", error);
    return {
      success: false,
      message: "Failed to load profile data"
    };
  }
}