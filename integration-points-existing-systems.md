# Integration Points with Existing Systems

## Overview
This document outlines how the travel agent requirement system integrates with the existing Golobe Travel Agency application, including authentication, flight/hotel booking systems, notification system, and payment system.

## 1. Authentication System Integration

### Current Authentication System
- **Technology**: NextAuth v5 with MongoDB adapter
- **Existing Models**: User, Account, Session, Verification_Token
- **Current Roles**: Basic user authentication

### Integration Approach

#### 1.1 User Model Extension
```javascript
// Extension to existing lib/db/schema/user.js
const agentRelatedDataSchema = new Schema({
  _id: false,
  agentProfile: { 
    type: Schema.Types.ObjectId, 
    ref: "AgentProfile" 
  },
  requirements: [{ 
    type: Schema.Types.ObjectId, 
    ref: "TravelRequirement" 
  }],
  communications: [{ 
    type: Schema.Types.ObjectId, 
    ref: "Communication" 
  }],
  quotations: [{ 
    type: Schema.Types.ObjectId, 
    ref: "Quotation" 
  }],
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true }
  }
});

// Add roles array to existing userSchema
userSchema.add({
  roles: [{
    type: String,
    enum: ["user", "agent", "admin"],
    default: ["user"]
  }]
});

// Add agentData to existing userSchema
userSchema.add({
  agentData: agentRelatedDataSchema
});
```

#### 1.2 Authentication Middleware Updates
```javascript
// Update middleware.js for role-based access
import authConfig from "./auth.config";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const response = NextResponse.next();
  response.headers.set("x-pathname", req.nextUrl.pathname);
  response.headers.set("x-url", req.nextUrl.href);
  
  // Add user role to headers for client-side access
  const session = await auth();
  if (session?.user) {
    const user = await getUserDetails(session.user.id);
    response.headers.set("x-user-roles", JSON.stringify(user.roles || []));
  }
  
  return response;
});
```

#### 1.3 Session Provider Updates
```javascript
// Update app/SessionProvider.js
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export const SessionProvider = ({ children, session }) => {
  // Enhanced session with user roles and agent data
  const enhancedSession = {
    ...session,
    user: {
      ...session?.user,
      roles: session?.user?.roles || ["user"],
      agentData: session?.user?.agentData || null
    }
  };

  return (
    <NextAuthSessionProvider session={enhancedSession}>
      {children}
    </NextAuthSessionProvider>
  );
};
```

### 1.4 Route Protection Implementation
```javascript
// lib/auth/routeProtection.js
export const withRoleProtection = (allowedRoles) => {
  return async (context) => {
    const session = await auth(context);
    
    if (!session) {
      return {
        redirect: {
          destination: '/login',
          permanent: false
        }
      };
    }
    
    const user = await getUserDetails(session.user.id);
    const hasRequiredRole = allowedRoles.some(role => 
      user.roles.includes(role)
    );
    
    if (!hasRequiredRole) {
      return {
        redirect: {
          destination: '/unauthorized',
          permanent: false
        }
      };
    }
    
    return {
      props: {
        session,
        user
      }
    };
  };
};

// Usage in pages
export const getServerSideProps = withRoleProtection(['agent', 'admin']);
```

## 2. Flight Booking System Integration

### Current Flight System
- **Models**: FlightItinerary, FlightSegment, FlightSeat, FlightBooking
- **API Routes**: `/api/flights/*`
- **Existing Features**: Flight search, booking, management

### Integration Approach

#### 2.1 Requirement to Flight Data Mapping
```javascript
// lib/integrations/flightIntegration.js
export const mapRequirementToFlightSearch = (requirement) => {
  return {
    origin: requirement.travelDetails.origin,
    destinations: requirement.travelDetails.destinations.map(dest => ({
      city: dest.city,
      country: dest.country
    })),
    departureDate: requirement.travelDetails.departureDate,
    returnDate: requirement.travelDetails.returnDate,
    passengers: {
      adults: requirement.travelDetails.passengers.adults,
      children: requirement.travelDetails.passengers.children,
      infants: requirement.travelDetails.passengers.infants
    },
    class: requirement.travelDetails.class,
    flexibleDates: requirement.travelDetails.flexibleDates,
    dateFlexibility: requirement.travelDetails.dateFlexibility,
    preferences: {
      airlines: requirement.travelDetails.preferences?.airlines || [],
      mealPreference: requirement.travelDetails.preferences?.mealPreference,
      seatPreference: requirement.travelDetails.preferences?.seatPreference
    },
    budget: requirement.travelDetails.budget
  };
};

export const searchFlightsForRequirement = async (requirementId) => {
  const requirement = await getOneDoc("TravelRequirement", { _id: requirementId });
  const searchParams = mapRequirementToFlightSearch(requirement);
  
  // Use existing flight search API
  const searchResponse = await fetch('/api/flights/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(searchParams)
  });
  
  return await searchResponse.json();
};
```

#### 2.2 Quotation to Flight Booking Integration
```javascript
// lib/integrations/quotationToFlightBooking.js
export const createFlightBookingFromQuotation = async (quotationId, userId) => {
  const quotation = await getOneDoc("Quotation", { _id: quotationId });
  
  // Extract flight details from quotation
  const flightBookings = [];
  
  quotation.priceBreakdown.forEach(item => {
    if (item.category === 'flights') {
      // Create flight booking using existing system
      const bookingData = {
        userId: userId,
        flightItinerary: item.flightItineraryId, // Reference to existing flight
        passengers: quotation.requirement.travelDetails.passengers,
        class: quotation.requirement.travelDetails.class,
        totalPrice: item.totalPrice,
        paymentStatus: 'pending',
        source: 'quotation',
        sourceId: quotationId
      };
      
      const booking = await createOneDoc("FlightBooking", bookingData);
      flightBookings.push(booking);
    }
  });
  
  return flightBookings;
};
```

#### 2.3 Flight Data in Quotations
```javascript
// Enhanced quotation schema to include flight references
const quotationSchema = new Schema({
  // ... existing fields
  flightReferences: [{
    flightItineraryId: { type: Schema.Types.ObjectId, ref: "FlightItinerary" },
    flightSegmentIds: [{ type: Schema.Types.ObjectId, ref: "FlightSegment" }],
    price: { type: Number, required: true },
    class: { type: String, required: true },
    availability: { type: String, enum: ['available', 'limited', 'sold_out'] }
  }],
  // ... rest of schema
});
```

## 3. Hotel Booking System Integration

### Current Hotel System
- **Models**: Hotel, HotelRoom, HotelBooking, HotelGuest
- **API Routes**: `/api/hotels/*`
- **Existing Features**: Hotel search, booking, management

### Integration Approach

#### 3.1 Requirement to Hotel Search Integration
```javascript
// lib/integrations/hotelIntegration.js
export const mapRequirementToHotelSearch = (requirement) => {
  return {
    destination: requirement.travelDetails.destinations[0], // Use first destination
    checkIn: requirement.travelDetails.departureDate,
    checkOut: requirement.travelDetails.returnDate,
    guests: {
      adults: requirement.travelDetails.passengers.adults,
      children: requirement.travelDetails.passengers.children,
      infants: requirement.travelDetails.passengers.infants
    },
    rooms: Math.ceil((requirement.travelDetails.passengers.adults + 
                   requirement.travelDetails.passengers.children) / 2),
    preferences: {
      hotelTypes: requirement.travelDetails.preferences?.accommodationType ? 
        [requirement.travelDetails.preferences.accommodationType] : [],
      hotels: requirement.travelDetails.preferences?.hotels || []
    },
    budget: requirement.travelDetails.budget
  };
};

export const searchHotelsForRequirement = async (requirementId) => {
  const requirement = await getOneDoc("TravelRequirement", { _id: requirementId });
  const searchParams = mapRequirementToHotelSearch(requirement);
  
  // Use existing hotel search API
  const searchResponse = await fetch('/api/hotels/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(searchParams)
  });
  
  return await searchResponse.json();
};
```

#### 3.2 Hotel Booking from Quotation
```javascript
// lib/integrations/quotationToHotelBooking.js
export const createHotelBookingFromQuotation = async (quotationId, userId) => {
  const quotation = await getOneDoc("Quotation", { _id: quotationId });
  
  const hotelBookings = [];
  
  quotation.priceBreakdown.forEach(item => {
    if (item.category === 'hotels') {
      const bookingData = {
        userId: userId,
        hotelId: item.hotelId,
        roomId: item.roomId,
        checkIn: quotation.itinerary[0]?.date,
        checkOut: quotation.itinerary[quotation.itinerary.length - 1]?.date,
        guests: quotation.requirement.travelDetails.passengers,
        totalPrice: item.totalPrice,
        paymentStatus: 'pending',
        source: 'quotation',
        sourceId: quotationId
      };
      
      const booking = await createOneDoc("HotelBooking", bookingData);
      hotelBookings.push(booking);
    }
  });
  
  return hotelBookings;
};
```

## 4. Notification System Integration

### Current Notification System
- **Technology**: Sonner toast notifications
- **Email**: Mailjet integration
- **Current Usage**: Booking confirmations, payment receipts

### Integration Approach

#### 4.1 Enhanced Notification Types
```javascript
// lib/notifications/notificationTypes.js
export const notificationTypes = {
  // Existing notifications
  FLIGHT_BOOKING_CONFIRMED: 'flight_booking_confirmed',
  HOTEL_BOOKING_CONFIRMED: 'hotel_booking_confirmed',
  PAYMENT_SUCCESSFUL: 'payment_successful',
  
  // New agent system notifications
  REQUIREMENT_SUBMITTED: 'requirement_submitted',
  REQUIREMENT_ASSIGNED: 'requirement_assigned',
  QUOTATION_SENT: 'quotation_sent',
  QUOTATION_ACCEPTED: 'quotation_accepted',
  QUOTATION_REJECTED: 'quotation_rejected',
  NEW_MESSAGE: 'new_message',
  AGENT_VERIFIED: 'agent_verified',
  AGENT_SUSPENDED: 'agent_suspended'
};

export const notificationTemplates = {
  [notificationTypes.REQUIREMENT_SUBMITTED]: {
    title: 'Requirement Submitted',
    message: 'Your travel requirement has been submitted successfully',
    emailTemplate: 'requirementSubmitted',
    pushEnabled: true,
    emailEnabled: true
  },
  [notificationTypes.QUOTATION_SENT]: {
    title: 'Quotation Sent',
    message: 'Agent has sent a quotation for your requirement',
    emailTemplate: 'quotationSent',
    pushEnabled: true,
    emailEnabled: true
  },
  // ... other templates
};
```

#### 4.2 Notification Service Enhancement
```javascript
// lib/services/notificationService.js
export class NotificationService {
  static async sendNotification(userId, type, data, channels = ['push', 'email']) {
    const user = await getUserDetails(userId);
    const template = notificationTemplates[type];
    
    if (!template) {
      throw new Error(`Notification type ${type} not found`);
    }
    
    const notificationData = {
      userId,
      type,
      title: template.title,
      message: this personalizeMessage(template.message, data),
      data,
      createdAt: new Date(),
      read: false
    };
    
    // Save notification to database
    await createOneDoc("Notification", notificationData);
    
    // Send push notification
    if (channels.includes('push') && template.pushEnabled && user.preferences?.pushNotifications) {
      await this.sendPushNotification(userId, notificationData);
    }
    
    // Send email notification
    if (channels.includes('email') && template.emailEnabled && user.preferences?.emailNotifications) {
      await this.sendEmailNotification(userId, template.emailTemplate, data);
    }
    
    // Send SMS notification
    if (channels.includes('sms') && user.preferences?.smsNotifications) {
      await this.sendSMSNotification(userId, notificationData);
    }
  }
  
  static personalizeMessage(message, data) {
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }
  
  static async sendPushNotification(userId, notificationData) {
    // Use existing push notification system or implement WebSocket-based notifications
    const pushPayload = {
      title: notificationData.title,
      body: notificationData.message,
      data: notificationData.data,
      icon: '/icon.png',
      badge: '/badge.png'
    };
    
    // Send to WebSocket connection or push service
    await pushToUser(userId, pushPayload);
  }
  
  static async sendEmailNotification(userId, template, data) {
    const user = await getUserDetails(userId);
    
    const emailData = {
      to: user.email,
      template,
      data: {
        ...data,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email
      }
    };
    
    // Use existing email service
    await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });
  }
}
```

#### 4.3 Real-time Notifications
```javascript
// lib/notifications/websocketNotifications.js
export class WebSocketNotificationService {
  constructor() {
    this.connections = new Map(); // userId -> WebSocket connection
  }
  
  addUserConnection(userId, ws) {
    this.connections.set(userId, ws);
    
    ws.on('close', () => {
      this.connections.delete(userId);
    });
  }
  
  async sendToUser(userId, notification) {
    const connection = this.connections.get(userId);
    
    if (connection) {
      connection.send(JSON.stringify({
        type: 'notification',
        data: notification
      }));
    }
  }
  
  async broadcastToRole(role, notification) {
    const users = await getManyDocs("User", { roles: role });
    
    users.forEach(user => {
      this.sendToUser(user._id.toString(), notification);
    });
  }
}

export const notificationService = new WebSocketNotificationService();
```

## 5. Payment System Integration

### Current Payment System
- **Technology**: Stripe integration
- **Models**: FlightPayment, HotelPayment
- **Current Usage**: Flight and hotel bookings

### Integration Approach

#### 5.1 Quotation Payment Integration
```javascript
// lib/payments/quotationPayment.js
export class QuotationPaymentService {
  static async createPaymentIntent(quotationId, userId) => {
    const quotation = await getOneDoc("Quotation", { _id: quotationId });
    const user = await getUserDetails(userId);
    
    const paymentIntentData = {
      amount: Math.round(quotation.totalPrice * 100), // Convert to cents
      currency: quotation.currency.toLowerCase(),
      customer: user.customerId,
      metadata: {
        quotationId: quotationId,
        requirementId: quotation.requirementId,
        userId: userId,
        type: 'quotation_payment'
      },
      automatic_payment_methods: {
        enabled: ['card']
      }
    };
    
    // Use existing Stripe payment intent creation
    const response = await fetch('/api/stripe/create_quotation_payment_intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentIntentData)
    });
    
    return await response.json();
  }
  
  static async handlePaymentSuccess(paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const { quotationId, userId } = paymentIntent.metadata;
    
    // Update quotation status
    await updateOneDoc("Quotation", 
      { _id: quotationId },
      { 
        status: 'accepted',
        paymentId: paymentIntentId,
        paidAt: new Date()
      }
    );
    
    // Update requirement status
    await updateOneDoc("TravelRequirement",
      { _id: paymentIntent.metadata.requirementId },
      { 
        status: 'completed',
        completedAt: new Date()
      }
    );
    
    // Create booking records
    await this.createBookingsFromQuotation(quotationId, userId);
    
    // Send notifications
    await NotificationService.sendNotification(userId, 'QUOTATION_ACCEPTED', {
      quotationId,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase()
    });
    
    // Notify agent
    const quotation = await getOneDoc("Quotation", { _id: quotationId });
    await NotificationService.sendNotification(quotation.agentId, 'QUOTATION_ACCEPTED', {
      quotationId,
      userId,
      amount: paymentIntent.amount / 100
    });
  }
  
  static async createBookingsFromQuotation(quotationId, userId) {
    const quotation = await getOneDoc("Quotation", { _id: quotationId });
    
    // Create flight bookings
    await createFlightBookingFromQuotation(quotationId, userId);
    
    // Create hotel bookings
    await createHotelBookingFromQuotation(quotationId, userId);
    
    // Create other bookings based on quotation items
    for (const item of quotation.priceBreakdown) {
      if (item.category === 'car_rental') {
        // Create car rental booking
      } else if (item.category === 'insurance') {
        // Create insurance booking
      }
      // Add other booking types as needed
    }
  }
}
```

#### 5.2 Commission Payment System
```javascript
// lib/payments/commissionPayment.js
export class CommissionPaymentService {
  static async calculateCommission(quotationId) {
    const quotation = await getOneDoc("Quotation", { _id: quotationId });
    const agent = await getOneDoc("AgentProfile", { _id: quotation.agentId });
    
    let commissionAmount = 0;
    
    if (agent.commission.type === 'percentage') {
      commissionAmount = quotation.totalPrice * (agent.commission.value / 100);
    } else {
      commissionAmount = agent.commission.value;
    }
    
    return {
      amount: commissionAmount,
      type: agent.commission.type,
      value: agent.commission.value
    };
  }
  
  static async processCommissionPayment(quotationId) {
    const commission = await this.calculateCommission(quotationId);
    const quotation = await getOneDoc("Quotation", { _id: quotationId });
    const agent = await getOneDoc("AgentProfile", { _id: quotation.agentId });
    const user = await getUserDetails(agent.userId);
    
    // Create commission record
    const commissionRecord = {
      agentId: quotation.agentId,
      quotationId: quotationId,
      amount: commission.amount,
      type: commission.type,
      status: 'pending',
      createdAt: new Date(),
      processedAt: null
    };
    
    await createOneDoc("Commission", commissionRecord);
    
    // Process commission payment to agent's Stripe account
    if (user.stripeAccountId) {
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(commission.amount * 100), // Convert to cents
          currency: quotation.currency.toLowerCase(),
          destination: user.stripeAccountId,
          metadata: {
            quotationId: quotationId,
            agentId: quotation.agentId
          }
        });
        
        // Update commission record
        await updateOneDoc("Commission",
          { quotationId, agentId: quotation.agentId },
          {
            status: 'paid',
            processedAt: new Date(),
            transferId: transfer.id
          }
        );
        
        // Notify agent
        await NotificationService.sendNotification(agent.userId, 'COMMISSION_PAID', {
          amount: commission.amount,
          quotationId: quotationId
        });
        
      } catch (error) {
        console.error('Error processing commission payment:', error);
        // Mark commission as failed
        await updateOneDoc("Commission",
          { quotationId, agentId: quotation.agentId },
          {
            status: 'failed',
            error: error.message
          }
        );
      }
    }
  }
}
```

## 6. File Storage Integration

### Current File Storage
- **Technology**: File uploads to server storage
- **Existing Usage**: Profile images, attachments

### Integration Approach

#### 6.1 Enhanced File Management
```javascript
// lib/services/fileService.js
export class FileService {
  static async uploadFile(file, context = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', JSON.stringify(context));
    
    const response = await fetch('/api/travel-agent/files/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('File upload failed');
    }
    
    const result = await response.json();
    return result.data;
  }
  
  static async uploadQuotationFiles(files, quotationId) {
    const uploadedFiles = [];
    
    for (const file of files) {
      const uploadedFile = await this.uploadFile(file, {
        type: 'quotation_attachment',
        quotationId
      });
      uploadedFiles.push(uploadedFile);
    }
    
    return uploadedFiles;
  }
  
  static async uploadRequirementFiles(files, requirementId) {
    const uploadedFiles = [];
    
    for (const file of files) {
      const uploadedFile = await this.uploadFile(file, {
        type: 'requirement_attachment',
        requirementId
      });
      uploadedFiles.push(uploadedFile);
    }
    
    return uploadedFiles;
  }
  
  static async uploadAgentDocument(file, agentId, documentType) {
    return await this.uploadFile(file, {
      type: 'agent_document',
      agentId,
      documentType
    });
  }
}
```

## 7. Search and Analytics Integration

### Current Analytics
- **Model**: Analytic
- **Current Usage**: Website traffic and user behavior

### Integration Approach

#### 7.1 Enhanced Analytics Tracking
```javascript
// lib/analytics/travelAgentAnalytics.js
export class TravelAgentAnalytics {
  static async trackRequirementEvent(eventType, data) {
    const analyticsEvent = {
      eventType: `requirement_${eventType}`,
      data: {
        requirementId: data.requirementId,
        userId: data.userId,
        category: data.category,
        priority: data.priority,
        budget: data.budget,
        timestamp: new Date()
      }
    };
    
    await createOneDoc("Analytic", analyticsEvent);
  }
  
  static async trackQuotationEvent(eventType, data) {
    const analyticsEvent = {
      eventType: `quotation_${eventType}`,
      data: {
        quotationId: data.quotationId,
        agentId: data.agentId,
        requirementId: data.requirementId,
        amount: data.amount,
        currency: data.currency,
        timestamp: new Date()
      }
    };
    
    await createOneDoc("Analytic", analyticsEvent);
  }
  
  static async trackAgentPerformance(agentId, metrics) {
    const performanceEvent = {
      eventType: 'agent_performance',
      data: {
        agentId,
        metrics: {
          totalRequirements: metrics.totalRequirements,
          responseTime: metrics.averageResponseTime,
          conversionRate: metrics.conversionRate,
          customerRating: metrics.customerRating,
          totalRevenue: metrics.totalRevenue
        },
        timestamp: new Date()
      }
    };
    
    await createOneDoc("Analytic", performanceEvent);
  }
}
```

## 8. Database Migration Strategy

### Migration Plan
```javascript
// migrations/addTravelAgentSystem.js
export const up = async () => {
  // Create new collections
  await createCollection("AgentProfile");
  await createCollection("TravelRequirement");
  await createCollection("Quotation");
  await createCollection("Communication");
  await createCollection("Commission");
  
  // Update existing User collection
  await updateCollection("User", {
    $add: {
      roles: ["user"],
      agentData: null
    }
  });
  
  // Create indexes
  await createIndexes("AgentProfile", [
    { userId: 1 },
    { status: 1 },
    { "specializations.type": 1, "specializations.regions": 1 }
  ]);
  
  await createIndexes("TravelRequirement", [
    { userId: 1 },
    { status: 1 },
    { assignedAgent: 1 },
    { category: 1 }
  ]);
  
  await createIndexes("Quotation", [
    { requirementId: 1 },
    { agentId: 1 },
    { status: 1 }
  ]);
};

export const down = async () => {
  // Rollback changes if needed
  await dropCollection("AgentProfile");
  await dropCollection("TravelRequirement");
  await dropCollection("Quotation");
  await dropCollection("Communication");
  await dropCollection("Commission");
  
  await updateCollection("User", {
    $remove: {
      roles: "",
      agentData: null
    }
  });
};
```

## 9. API Route Integration

### New API Routes Structure
```
/api/
├── auth/[...nextauth]/route.js (existing - enhanced)
├── travel-agent/
│   ├── profile/
│   │   ├── create/route.js
│   │   ├── [agentId]/route.js
│   │   └── list/route.js
│   ├── requirements/
│   │   ├── create/route.js
│   │   ├── [requirementId]/route.js
│   │   └── list/route.js
│   ├── quotations/
│   │   ├── create/route.js
│   │   ├── [quotationId]/route.js
│   │   └── list/route.js
│   ├── communications/
│   │   ├── [communicationId]/route.js
│   │   └── list/route.js
│   ├── files/
│   │   └── upload/route.js
│   └── notifications/
│       ├── settings/route.js
│       └── [notificationId]/read/route.js
├── flights/ (existing)
├── hotels/ (existing)
├── stripe/ (existing - enhanced)
│   ├── create_quotation_payment_intent/route.js
│   └── commission_transfer/route.js
└── email/ (existing - enhanced)
    └── templates/
        ├── requirementSubmitted.hbs
        ├── quotationSent.hbs
        └── commissionPaid.hbs
```

## 10. Frontend Integration Points

### Component Integration
```javascript
// Enhanced layout.js for role-based navigation
// app/(pages)/layout.js
import { useSession } from "next-auth/react";

const Layout = ({ children }) => {
  const { data: session } = useSession();
  
  const isAgent = session?.user?.roles?.includes('agent');
  const isAdmin = session?.user?.roles?.includes('admin');
  
  return (
    <div className="layout">
      <Navigation>
        <NavItem href="/flights">Flights</NavItem>
        <NavItem href="/hotels">Hotels</NavItem>
        {isAgent && <NavItem href="/agent/dashboard">Agent Dashboard</NavItem>}
        {isAdmin && <NavItem href="/admin/dashboard">Admin</NavItem>}
      </Navigation>
      <main>{children}</main>
    </div>
  );
};
```

### State Management Integration
```javascript
// Enhanced Redux store for agent system
// store/agentSlice.js
import { createSlice } from '@reduxjs/toolkit';

const agentSlice = createSlice({
  name: 'agent',
  initialState: {
    profile: null,
    requirements: [],
    quotations: [],
    communications: [],
    notifications: [],
    loading: false
  },
  reducers: {
    setAgentProfile: (state, action) => {
      state.profile = action.payload;
    },
    addRequirement: (state, action) => {
      state.requirements.unshift(action.payload);
    },
    updateRequirement: (state, action) => {
      const index = state.requirements.findIndex(req => req._id === action.payload._id);
      if (index !== -1) {
        state.requirements[index] = action.payload;
      }
    },
    // ... other reducers
  }
});

export const { setAgentProfile, addRequirement, updateRequirement } = agentSlice.actions;
export default agentSlice.reducer;
```

## Summary

The travel agent requirement system integrates seamlessly with the existing Golobe Travel Agency application through:

1. **Authentication Enhancement**: Extended user model with roles and agent data
2. **Flight/Hotel Integration**: Leveraging existing booking systems for quotations
3. **Notification System**: Enhanced notifications for agent-specific events
4. **Payment Integration**: Extended Stripe integration for quotation payments and commissions
5. **File Management**: Enhanced file upload system for agent documents
6. **Analytics**: Extended analytics tracking for agent performance
7. **Database Migration**: Structured approach to adding new collections
8. **API Integration**: New API routes following existing patterns
9. **Frontend Integration**: Role-based navigation and state management

This integration approach ensures minimal disruption to existing functionality while adding comprehensive travel agent capabilities.