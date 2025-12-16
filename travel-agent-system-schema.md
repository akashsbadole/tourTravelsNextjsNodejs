# Database Schema Design for Travel Agent Requirement System

## Overview
This document outlines the database schema design for the travel agent requirement system that will be integrated into the existing Golobe Travel Agency application.

## Schema Design

### 1. Agent Profile Schema

```javascript
// lib/db/schema/agentProfile.js
const agentProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  agentType: {
    type: String,
    enum: ["dedicated", "user_agent"],
    required: true
  },
  professionalDetails: {
    licenseNumber: { type: String, required: true },
    licenseExpiry: { type: Date, required: true },
    yearsOfExperience: { type: Number, default: 0 },
    company: { type: String },
    designation: { type: String },
    bio: { type: String },
    profileImage: { type: String }
  },
  specializations: [{
    type: {
      type: String,
      enum: ["flights", "hotels", "packages", "cruises", "car_rentals", "insurance", "visa"]
    },
    regions: [{ type: String }], // Geographic regions they specialize in
    expertise: { type: Number, min: 1, max: 5 } // 1-5 rating for expertise level
  }],
  availability: {
    workingHours: {
      monday: { open: String, close: String, active: { type: Boolean, default: true } },
      tuesday: { open: String, close: String, active: { type: Boolean, default: true } },
      wednesday: { open: String, close: String, active: { type: Boolean, default: true } },
      thursday: { open: String, close: String, active: { type: Boolean, default: true } },
      friday: { open: String, close: String, active: { type: Boolean, default: true } },
      saturday: { open: String, close: String, active: { type: Boolean, default: false } },
      sunday: { open: String, close: String, active: { type: Boolean, default: false } }
    },
    timezone: { type: String, default: "UTC" },
    vacationDates: [{ type: Date }],
    maxConcurrentRequests: { type: Number, default: 5 }
  },
  performance: {
    totalRequestsHandled: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // in minutes
    customerRating: { type: Number, default: 0, min: 0, max: 5 },
    totalQuotationsSent: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 } // percentage
  },
  verification: {
    isVerified: { type: Boolean, default: false },
    verificationDate: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    documents: [{
      type: { type: String, enum: ["license", "id_proof", "address_proof", "certificate"] },
      url: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
    }]
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended", "pending_verification"],
    default: "pending_verification"
  },
  commission: {
    type: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    value: { type: Number, required: true }
  }
}, {
  timestamps: true
});
```

### 2. Travel Requirement Schema

```javascript
// lib/db/schema/travelRequirement.js
const travelRequirementSchema = new Schema({
  requirementId: {
    type: String,
    unique: true,
    required: true,
    default: () => "REQ-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9)
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ["flights", "hotels", "packages", "cruises", "car_rentals", "insurance", "visa", "custom"],
    required: true
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  travelDetails: {
    tripType: {
      type: String,
      enum: ["one_way", "round_trip", "multi_city"],
      required: true
    },
    origin: {
      type: String,
      required: true
    },
    destination: [{
      city: { type: String, required: true },
      country: { type: String, required: true }
    }],
    departureDate: { type: Date, required: true },
    returnDate: { type: Date },
    flexibleDates: { type: Boolean, default: false },
    dateFlexibility: { type: Number, default: 0 }, // days before/after
    duration: { type: Number }, // in days
    passengers: {
      adults: { type: Number, default: 1, required: true },
      children: { type: Number, default: 0 },
      infants: { type: Number, default: 0 }
    },
    class: {
      type: String,
      enum: ["economy", "premium_economy", "business", "first"],
      default: "economy"
    },
    budget: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String, default: "USD" }
    },
    preferences: {
      airlines: [{ type: String }],
      hotels: [{ type: String }],
      mealPreference: { type: String },
      seatPreference: { type: String },
      accommodationType: { type: String },
      transportation: { type: String },
      activities: [{ type: String }]
    }
  },
  attachments: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    fileType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ["draft", "submitted", "assigned", "in_progress", "quotation_sent", "quotation_accepted", "quotation_rejected", "completed", "cancelled"],
    default: "draft"
  },
  assignedAgent: {
    type: Schema.Types.ObjectId,
    ref: "AgentProfile"
  },
  assignmentHistory: [{
    agentId: { type: Schema.Types.ObjectId, ref: "AgentProfile" },
    assignedAt: { type: Date, default: Date.now },
    unassignedAt: { type: Date },
    reason: { type: String }
  }],
  deadline: { type: Date },
  submittedAt: { type: Date },
  completedAt: { type: Date },
  tags: [{ type: String }],
  isPublic: { type: Boolean, default: false } // For agents to see unassigned requirements
}, {
  timestamps: true
});
```

### 3. Quotation Schema

```javascript
// lib/db/schema/quotation.js
const quotationSchema = new Schema({
  quotationId: {
    type: String,
    unique: true,
    required: true,
    default: () => "QUO-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9)
  },
  requirementId: {
    type: Schema.Types.ObjectId,
    ref: "TravelRequirement",
    required: true
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: "AgentProfile",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  currency: {
    type: String,
    default: "USD"
  },
  totalPrice: {
    type: Number,
    required: true
  },
  priceBreakdown: [{
    category: { type: String, required: true }, // flights, hotels, etc.
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    commission: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    fees: { type: Number, default: 0 }
  }],
  itinerary: [{
    day: { type: Number, required: true },
    date: { type: Date, required: true },
    title: { type: String, required: true },
    description: { type: String },
    activities: [{
      time: { type: String },
      activity: { type: String, required: true },
      location: { type: String },
      details: { type: String }
    }],
    accommodation: {
      name: { type: String },
      rating: { type: Number },
      roomType: { type: String },
      checkIn: { type: String },
      checkOut: { type: String },
      meals: { type: String }
    },
    transportation: {
      type: { type: String }, // flight, car, train, bus
      details: { type: String },
      departure: { type: String },
      arrival: { type: String },
      duration: { type: String }
    }
  }],
  inclusions: [{ type: String }],
  exclusions: [{ type: String }],
  termsAndConditions: [{ type: String }],
  attachments: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    fileType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ["draft", "sent", "viewed", "accepted", "rejected", "expired", "withdrawn"],
    default: "draft"
  },
  sentAt: { type: Date },
  viewedAt: { type: Date },
  respondedAt: { type: Date },
  responseNotes: { type: String },
  paymentLink: { type: String }, // For accepting quotation and making payment
  commissionDetails: {
    type: { type: String, enum: ["percentage", "fixed"] },
    amount: { type: Number },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date }
  },
  revisionHistory: [{
    revisionNumber: { type: Number, required: true },
    revisedAt: { type: Date, default: Date.now },
    changes: { type: String },
    revisedBy: { type: Schema.Types.ObjectId, ref: "AgentProfile" }
  }]
}, {
  timestamps: true
});
```

### 4. Communication/Message Schema

```javascript
// lib/db/schema/communication.js
const communicationSchema = new Schema({
  communicationId: {
    type: String,
    unique: true,
    required: true,
    default: () => "COM-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9)
  },
  requirementId: {
    type: Schema.Types.ObjectId,
    ref: "TravelRequirement",
    required: true
  },
  quotationId: {
    type: Schema.Types.ObjectId,
    ref: "Quotation"
  },
  participants: [{
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["user", "agent"], required: true },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date }
  }],
  messages: [{
    messageId: {
      type: String,
      unique: true,
      required: true,
      default: () => "MSG-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9)
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["user", "agent"], required: true },
    content: { type: String, required: true },
    messageType: {
      type: String,
      enum: ["text", "file", "image", "quotation", "system"],
      default: "text"
    },
    attachments: [{
      filename: { type: String, required: true },
      url: { type: String, required: true },
      fileType: { type: String, required: true }
    }],
    sentAt: { type: Date, default: Date.now },
    readBy: [{
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      readAt: { type: Date, default: Date.now }
    }],
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    replyTo: { type: String } // messageId of the message being replied to
  }],
  status: {
    type: String,
    enum: ["active", "archived", "closed"],
    default: "active"
  },
  lastMessageAt: { type: Date, default: Date.now },
  emailNotifications: {
    enabled: { type: Boolean, default: true },
    lastEmailSentAt: { type: Date }
  }
}, {
  timestamps: true
});
```

### 5. User Schema Extension

```javascript
// Extension to existing user schema
// Add these fields to lib/db/schema/user.js

const agentRelatedDataSchema = new Schema({
  _id: false,
  agentProfile: { type: Schema.Types.ObjectId, ref: "AgentProfile" },
  requirements: [{ type: Schema.Types.ObjectId, ref: "TravelRequirement" }],
  communications: [{ type: Schema.Types.ObjectId, ref: "Communication" }],
  quotations: [{ type: Schema.Types.ObjectId, ref: "Quotation" }],
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true }
  }
});

// Add to existing userSchema
userSchema.add({
  agentData: agentRelatedDataSchema,
  roles: [{
    type: String,
    enum: ["user", "agent", "admin"],
    default: ["user"]
  }]
});
```

## Indexes for Performance

```javascript
// Recommended indexes for optimal performance

// AgentProfile indexes
db.AgentProfile.createIndex({ "userId": 1 });
db.AgentProfile.createIndex({ "status": 1 });
db.AgentProfile.createIndex({ "specializations.type": 1, "specializations.regions": 1 });
db.AgentProfile.createIndex({ "verification.isVerified": 1 });

// TravelRequirement indexes
db.TravelRequirement.createIndex({ "userId": 1 });
db.TravelRequirement.createIndex({ "status": 1 });
db.TravelRequirement.createIndex({ "assignedAgent": 1 });
db.TravelRequirement.createIndex({ "category": 1 });
db.TravelRequirement.createIndex({ "priority": 1 });
db.TravelRequirement.createIndex({ "submittedAt": -1 });
db.TravelRequirement.createIndex({ "isPublic": 1, "status": 1 });

// Quotation indexes
db.Quotation.createIndex({ "requirementId": 1 });
db.Quotation.createIndex({ "agentId": 1 });
db.Quotation.createIndex({ "status": 1 });
db.Quotation.createIndex({ "sentAt": -1 });
db.Quotation.createIndex({ "validUntil": 1 });

// Communication indexes
db.Communication.createIndex({ "requirementId": 1 });
db.Communication.createIndex({ "participants.userId": 1 });
db.Communication.createIndex({ "messages.senderId": 1 });
db.Communication.createIndex({ "lastMessageAt": -1 });
```

## Data Relationships

1. **User ↔ AgentProfile**: One-to-One (A user can have at most one agent profile)
2. **User ↔ TravelRequirement**: One-to-Many (A user can create multiple requirements)
3. **AgentProfile ↔ TravelRequirement**: One-to-Many (An agent can handle multiple requirements)
4. **TravelRequirement ↔ Quotation**: One-to-Many (A requirement can have multiple quotations)
5. **AgentProfile ↔ Quotation**: One-to-Many (An agent can create multiple quotations)
6. **TravelRequirement ↔ Communication**: One-to-One (Each requirement has one communication thread)
7. **Communication ↔ User**: Many-to-Many (Multiple users can participate in a communication)

## Validation Rules

1. **AgentProfile**: License number must be unique, license expiry must be in the future
2. **TravelRequirement**: Return date must be after departure date, budget max must be greater than min
3. **Quotation**: Valid until date must be in the future, total price must match sum of breakdown
4. **Communication**: At least two participants required, sender must be a participant

## Security Considerations

1. All sensitive data should be encrypted at rest
2. File attachments should be scanned for malware
3. Access control based on user roles and ownership
4. Audit trails for all critical operations
5. Rate limiting for API endpoints