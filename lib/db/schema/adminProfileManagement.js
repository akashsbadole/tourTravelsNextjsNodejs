import { Schema } from "mongoose";

/**
 * Admin Profile Management Schema
 * Comprehensive tools for administrators to manage user profiles
 */

// Profile Verification Workflow Schema
const profileVerificationWorkflowSchema = new Schema({
  _id: false,
  workflowId: { type: String, required: true, unique: true },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  verificationType: {
    type: String,
    enum: ['identity', 'address', 'document', 'video', 'social', 'enhanced'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_review', 'approved', 'rejected', 'requires_additional_info'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }, // Admin user
  submittedAt: { type: Date, default: Date.now, required: true },
  reviewedAt: { type: Date },
  completedAt: { type: Date },
  deadline: { type: Date },
  
  // Verification data
  submissionData: {
    documents: [{
      type: { type: String, required: true },
      url: { type: String, required: true },
      filename: { type: String },
      uploadedAt: { type: Date, default: Date.now },
      fileSize: { type: Number },
      checksum: { type: String }
    }],
    information: { type: Schema.Types.Mixed },
    additionalInfo: { type: String }
  },
  
  // Review process
  reviewData: {
    reviewerNotes: { type: String },
    rejectionReason: { type: String },
    approvedLevel: {
      type: String,
      enum: ['basic', 'enhanced', 'premium']
    },
    flags: [{
      type: { type: String, enum: ['suspicious', 'incomplete', 'unclear', 'expired', 'fraud_risk'] },
      description: { type: String },
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] }
    }],
    additionalRequirements: [String],
    automatedChecks: {
      documentAuthenticity: { type: Boolean },
      dataConsistency: { type: Boolean },
      fraudDetection: { type: Boolean },
      ageVerification: { type: Boolean }
    }
  },
  
  // Workflow history
  history: [{
    action: { 
      type: String, 
      enum: ['submitted', 'assigned', 'review_started', 'additional_info_requested', 'approved', 'rejected', 'escalated'],
      required: true 
    },
    timestamp: { type: Date, default: Date.now },
    performedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    notes: { type: String },
    attachments: [String] // URLs to additional documents
  }],
  
  // Notifications
  notifications: [{
    type: { 
      type: String, 
      enum: ['email', 'sms', 'push', 'in_app'],
      required: true 
    },
    recipient: { type: String, required: true },
    template: { type: String },
    sentAt: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending' 
    }
  }],
  
  // SLA tracking
  sla: {
    firstResponseTime: { type: Number }, // hours
    resolutionTime: { type: Number }, // hours
    actualResponseTime: { type: Number },
    actualResolutionTime: { type: Number },
    metSLA: { type: Boolean }
  }
});

// Bulk Profile Operations Schema
const bulkProfileOperationsSchema = new Schema({
  _id: false,
  operationId: { type: String, required: true, unique: true },
  operationType: {
    type: String,
    enum: ['export', 'import', 'update', 'delete', 'verify', 'deactivate', 'merge'],
    required: true
  },
  initiatedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Operation parameters
  parameters: {
    filters: { type: Schema.Types.Mixed }, // User selection criteria
    fields: [String], // Fields to operate on
    updates: { type: Schema.Types.Mixed }, // Update data for bulk updates
    exportFormat: { type: String, enum: ['csv', 'json', 'xlsx', 'pdf'] },
    importFile: { type: String }, // URL to import file
    dryRun: { type: Boolean, default: false }
  },
  
  // Processing details
  processing: {
    startedAt: { type: Date },
    completedAt: { type: Date },
    estimatedDuration: { type: Number }, // minutes
    actualDuration: { type: Number }, // minutes
    batchSize: { type: Number, default: 100 },
    currentBatch: { type: Number, default: 0 },
    totalBatches: { type: Number }
  },
  
  // Results
  results: {
    totalProcessed: { type: Number, default: 0 },
    successful: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    errors: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      error: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    exportUrl: { type: String }, // URL to download export file
    summary: { type: Schema.Types.Mixed }
  },
  
  // Notifications
  notifications: {
    emailOnStart: { type: Boolean, default: true },
    emailOnComplete: { type: Boolean, default: true },
    emailOnError: { type: Boolean, default: true },
    recipients: [String]
  },
  
  createdAt: { type: Date, default: Date.now }
});

// Profile Analytics Schema (for admins)
const profileAnalyticsSchema = new Schema({
  _id: false,
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  generatedAt: { type: Date, default: Date.now },
  
  // User metrics
  userMetrics: {
    totalUsers: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    inactiveUsers: { type: Number, default: 0 },
    verifiedUsers: { type: Number, default: 0 },
    premiumUsers: { type: Number, default: 0 },
    userGrowthRate: { type: Number, default: 0 }, // percentage
    retentionRate: { type: Number, default: 0 }, // percentage
    churnRate: { type: Number, default: 0 } // percentage
  },
  
  // Profile completion metrics
  profileCompletion: {
    averageCompletion: { type: Number, default: 0 },
    completionDistribution: {
      lessThan25: { type: Number, default: 0 },
      between25And50: { type: Number, default: 0 },
      between50And75: { type: Number, default: 0 },
      between75And100: { type: Number, default: 0 },
      complete: { type: Number, default: 0 }
    },
    sectionCompletion: {
      basicInfo: { type: Number, default: 0 },
      personalDetails: { type: Number, default: 0 },
      preferences: { type: Number, default: 0 },
      documents: { type: Number, default: 0 },
      emergency: { type: Number, default: 0 },
      verification: { type: Number, default: 0 },
      social: { type: Number, default: 0 },
      security: { type: Number, default: 0 }
    }
  },
  
  // Verification metrics
  verificationMetrics: {
    pendingVerifications: { type: Number, default: 0 },
    completedVerifications: { type: Number, default: 0 },
    averageProcessingTime: { type: Number, default: 0 }, // hours
    approvalRate: { type: Number, default: 0 }, // percentage
    rejectionRate: { type: Number, default: 0 }, // percentage
    verificationBreakdown: {
      identity: { type: Number, default: 0 },
      address: { type: Number, default: 0 },
      document: { type: Number, default: 0 },
      video: { type: Number, default: 0 },
      social: { type: Number, default: 0 },
      enhanced: { type: Number, default: 0 }
    }
  },
  
  // Document management metrics
  documentMetrics: {
    totalDocuments: { type: Number, default: 0 },
    uploadedDocuments: { type: Number, default: 0 },
    verifiedDocuments: { type: Number, default: 0 },
    expiredDocuments: { type: Number, default: 0 },
    expiringSoonDocuments: { type: Number, default: 0 },
    documentTypes: {
      passport: { type: Number, default: 0 },
      visa: { type: Number, default: 0 },
      driverLicense: { type: Number, default: 0 },
      nationalId: { type: Number, default: 0 },
      healthCertificate: { type: Number, default: 0 },
      travelInsurance: { type: Number, default: 0 }
    }
  },
  
  // Security metrics
  securityMetrics: {
    twoFactorEnabled: { type: Number, default: 0 },
    twoFactorDisabled: { type: Number, default: 0 },
    securityIncidents: { type: Number, default: 0 },
    suspiciousActivities: { type: Number, default: 0 },
    blockedAttempts: { type: Number, default: 0 },
    passwordResets: { type: Number, default: 0 },
    accountLockouts: { type: Number, default: 0 }
  },
  
  // Social features metrics
  socialMetrics: {
    publicProfiles: { type: Number, default: 0 },
    privateProfiles: { type: Number, default: 0 },
    profileShares: { type: Number, default: 0 },
    travelBuddyConnections: { type: Number, default: 0 },
    wishlistItems: { type: Number, default: 0 },
    socialInteractions: { type: Number, default: 0 }
  },
  
  // Mobile usage metrics
  mobileMetrics: {
    mobileUsers: { type: Number, default: 0 },
    biometricEnabled: { type: Number, default: 0 },
    pushNotificationEnabled: { type: Number, default: 0 },
    offlineModeUsage: { type: Number, default: 0 },
    deviceBreakdown: {
      ios: { type: Number, default: 0 },
      android: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 }
    }
  }
});

// Admin Action Log Schema
const adminActionLogSchema = new Schema({
  _id: false,
  actionId: { type: String, required: true, unique: true },
  adminId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  actionType: {
    type: String,
    enum: [
      'user_view', 'user_update', 'user_delete', 'user_suspend', 'user_activate',
      'profile_verify', 'profile_reject', 'profile_flag',
      'document_approve', 'document_reject',
      'bulk_operation', 'export_data', 'import_data',
      'system_config', 'security_action', 'privacy_action'
    ],
    required: true
  },
  targetType: {
    type: String,
    enum: ['user', 'profile', 'document', 'verification', 'system', 'bulk'],
    required: true
  },
  targetId: { type: Schema.Types.Mixed }, // Can be single ID or array of IDs
  description: { type: String, required: true },
  
  // Action details
  details: {
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    reason: { type: String },
    parameters: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  
  // Impact assessment
  impact: {
    usersAffected: { type: Number, default: 0 },
    dataModified: { type: Boolean, default: false },
    securityImplications: { type: Boolean, default: false },
    privacyImplications: { type: Boolean, default: false }
  },
  
  // Review and approval
  requiresApproval: { type: Boolean, default: false },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  approvalNotes: { type: String },
  
  timestamp: { type: Date, default: Date.now },
  duration: { type: Number }, // Action duration in milliseconds
  
  // System context
  system: {
    version: { type: String },
    module: { type: String },
    feature: { type: String }
  }
});

// Main Admin Profile Management Schema
const adminProfileManagementSchema = new Schema({
  // Configuration
  configuration: {
    verificationSettings: {
      autoApproval: { type: Boolean, default: false },
      requiredDocuments: [String],
      verificationLevels: [{
        level: { type: String, enum: ['basic', 'enhanced', 'premium'] },
        requirements: [String],
        benefits: [String],
        autoUpgrade: { type: Boolean, default: false }
      }],
      slaSettings: {
        firstResponse: { type: Number, default: 24 }, // hours
        resolution: { type: Number, default: 72 }, // hours
        escalation: { type: Number, default: 120 } // hours
      }
    },
    bulkOperations: {
      maxBatchSize: { type: Number, default: 1000 },
      allowedFormats: [String],
      requiredPermissions: [String],
      autoRetry: { type: Boolean, default: true },
      maxRetries: { type: Number, default: 3 }
    },
    securitySettings: {
      maxLoginAttempts: { type: Number, default: 5 },
      sessionTimeout: { type: Number, default: 1440 }, // minutes
      requireTwoFactor: { type: Boolean, default: true },
      auditRetention: { type: Number, default: 2555 } // days
    },
    notifications: {
      adminAlerts: {
        newVerification: { type: Boolean, default: true },
        bulkOperationComplete: { type: Boolean, default: true },
        securityIncident: { type: Boolean, default: true },
        systemError: { type: Boolean, default: true }
      },
      userNotifications: {
        verificationStatus: { type: Boolean, default: true },
        profileChanges: { type: Boolean, default: false },
        securityAlerts: { type: Boolean, default: true }
      }
    }
  },
  
  // Active workflows
  activeWorkflows: [profileVerificationWorkflowSchema],
  
  // Bulk operations
  bulkOperations: [bulkProfileOperationsSchema],
  
  // Analytics data
  analytics: [profileAnalyticsSchema],
  
  // Audit logs
  auditLogs: [adminActionLogSchema],
  
  // Admin team management
  adminTeam: {
    members: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      role: {
        type: String,
        enum: ['super_admin', 'admin', 'moderator', 'support'],
        required: true
      },
      permissions: [String],
      specializations: [String], // e.g., ['verification', 'documents', 'security']
      isActive: { type: Boolean, default: true },
      lastActive: { type: Date, default: Date.now },
      performance: {
        casesHandled: { type: Number, default: 0 },
        averageResolutionTime: { type: Number, default: 0 },
        satisfactionScore: { type: Number, default: 0 },
        qualityScore: { type: Number, default: 0 }
      }
    }],
    workload: {
      pendingCases: { type: Number, default: 0 },
      criticalCases: { type: Number, default: 0 },
      averageWorkload: { type: Number, default: 0 }
    }
  },
  
  // System health
  systemHealth: {
    lastBackup: { type: Date },
    lastMaintenance: { type: Date },
    performanceMetrics: {
      averageResponseTime: { type: Number, default: 0 },
      errorRate: { type: Number, default: 0 },
      uptime: { type: Number, default: 100 }
    },
    alerts: [{
      type: { type: String, enum: ['error', 'warning', 'info'] },
      message: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      resolved: { type: Boolean, default: false },
      resolvedAt: { type: Date }
    }]
  },
  
  // Metadata
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    lastAnalyticsUpdate: { type: Date, default: Date.now },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
adminProfileManagementSchema.index({ 'activeWorkflows.userId': 1 });
adminProfileManagementSchema.index({ 'activeWorkflows.status': 1 });
adminProfileManagementSchema.index({ 'bulkOperations.status': 1 });
adminProfileManagementSchema.index({ 'bulkOperations.initiatedBy': 1 });
adminProfileManagementSchema.index({ 'auditLogs.adminId': 1 });
adminProfileManagementSchema.index({ 'auditLogs.timestamp': -1 });
adminProfileManagementSchema.index({ 'auditLogs.actionType': 1 });
adminProfileManagementSchema.index({ 'analytics.period': 1 });
adminProfileManagementSchema.index({ 'analytics.generatedAt': -1 });
adminProfileManagementSchema.index({ 'adminTeam.members.userId': 1 });
adminProfileManagementSchema.index({ 'adminTeam.members.isActive': 1 });
adminProfileManagementSchema.index({ 'systemHealth.alerts.resolved': 1 });
adminProfileManagementSchema.index({ 'systemHealth.alerts.timestamp': -1 });

// Virtual fields
adminProfileManagementSchema.virtual('pendingVerifications').get(function() {
  return this.activeWorkflows.filter(workflow => 
    workflow.status === 'pending'
  ).length;
});

adminProfileManagementSchema.virtual('criticalCases').get(function() {
  return this.activeWorkflows.filter(workflow => 
    workflow.priority === 'urgent' || workflow.priority === 'high'
  ).length;
});

adminProfileManagementSchema.virtual('activeAdmins').get(function() {
  return this.adminTeam.members.filter(member => 
    member.isActive
  ).length;
});

adminProfileManagementSchema.virtual('systemAlerts').get(function() {
  return this.systemHealth.alerts.filter(alert => 
    !alert.resolved
  );
});

// Pre-save middleware
adminProfileManagementSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  
  // Auto-calculate some metrics
  this.updateSystemMetrics();
  
  next();
});

// Instance methods
adminProfileManagementSchema.methods.updateSystemMetrics = function() {
  // Update workload metrics
  this.adminTeam.workload.pendingCases = this.activeWorkflows.filter(w => 
    w.status === 'pending'
  ).length;
  
  this.adminTeam.workload.criticalCases = this.activeWorkflows.filter(w => 
    w.priority === 'urgent' || w.priority === 'high'
  ).length;
  
  // Update admin performance
  this.adminTeam.members.forEach(member => {
    member.lastActive = new Date();
  });
  
  // Clean old audit logs based on retention policy
  const retentionDays = this.configuration.securitySettings.auditRetention;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  this.auditLogs = this.auditLogs.filter(log => 
    log.timestamp > cutoffDate
  );
};

adminProfileManagementSchema.methods.getAdminPerformance = function(adminId) {
  const member = this.adminTeam.members.find(m => 
    m.userId.toString() === adminId.toString()
  );
  
  if (!member) return null;
  
  const adminLogs = this.auditLogs.filter(log => 
    log.adminId.toString() === adminId.toString()
  );
  
  const workflows = this.activeWorkflows.filter(w => 
    w.assignedTo && w.assignedTo.toString() === adminId.toString()
  );
  
  return {
    member,
    totalActions: adminLogs.length,
    recentActions: adminLogs.filter(log => 
      log.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length,
    activeWorkflows: workflows.length,
    completedWorkflows: workflows.filter(w => w.status === 'completed').length,
    averageResolutionTime: member.performance.averageResolutionTime
  };
};

export default adminProfileManagementSchema;