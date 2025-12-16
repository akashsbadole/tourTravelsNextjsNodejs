# API Design for Travel Agent Requirement System

## Overview
This document outlines the API endpoints for the travel agent requirement system that will be integrated into the existing Golobe Travel Agency application.

## API Architecture

### Base URL
```
/api/travel-agent
```

### Authentication
All endpoints require authentication using NextAuth session management. Role-based access control will be implemented based on user roles (user, agent, admin).

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "error": null
}
```

## Agent Profile Management APIs

### 1. Create Agent Profile
```http
POST /api/travel-agent/profile/create
```

**Request Body:**
```json
{
  "agentType": "dedicated|user_agent",
  "professionalDetails": {
    "licenseNumber": "string",
    "licenseExpiry": "2024-12-31",
    "yearsOfExperience": 5,
    "company": "string",
    "designation": "string",
    "bio": "string"
  },
  "specializations": [{
    "type": "flights|hotels|packages|cruises|car_rentals|insurance|visa",
    "regions": ["Europe", "Asia"],
    "expertise": 4
  }],
  "availability": {
    "workingHours": {
      "monday": { "open": "09:00", "close": "18:00", "active": true }
    },
    "timezone": "UTC",
    "maxConcurrentRequests": 5
  },
  "commission": {
    "type": "percentage|fixed",
    "value": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agentProfile": {
      "_id": "agent_id",
      "userId": "user_id",
      "status": "pending_verification",
      "createdAt": "2023-12-14T10:30:00.000Z"
    }
  }
}
```

### 2. Get Agent Profile
```http
GET /api/travel-agent/profile/[agentId]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agentProfile": {
      "_id": "agent_id",
      "userId": "user_id",
      "agentType": "dedicated",
      "professionalDetails": {},
      "specializations": [],
      "availability": {},
      "performance": {},
      "verification": {},
      "status": "active",
      "commission": {}
    }
  }
}
```

### 3. Update Agent Profile
```http
PUT /api/travel-agent/profile/[agentId]
```

### 4. List Agents
```http
GET /api/travel-agent/agents/list
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `specialization`: Filter by specialization type
- `region`: Filter by region
- `status`: Filter by agent status
- `verified`: Filter by verification status

### 5. Verify Agent
```http
POST /api/travel-agent/agents/[agentId]/verify
```

**Request Body:**
```json
{
  "verified": true,
  "verificationNotes": "Agent verified successfully"
}
```

## Travel Requirement APIs

### 1. Create Travel Requirement
```http
POST /api/travel-agent/requirements/create
```

**Request Body:**
```json
{
  "title": "European Vacation Package",
  "description": "Looking for a 2-week European vacation package",
  "category": "packages",
  "priority": "medium",
  "travelDetails": {
    "tripType": "round_trip",
    "origin": "New York",
    "destination": [
      { "city": "Paris", "country": "France" },
      { "city": "Rome", "country": "Italy" }
    ],
    "departureDate": "2024-06-15",
    "returnDate": "2024-06-30",
    "flexibleDates": true,
    "dateFlexibility": 3,
    "passengers": {
      "adults": 2,
      "children": 1,
      "infants": 0
    },
    "class": "business",
    "budget": {
      "min": 5000,
      "max": 8000,
      "currency": "USD"
    },
    "preferences": {
      "airlines": ["Lufthansa", "Air France"],
      "accommodationType": "4-star hotel",
      "activities": ["sightseeing", "museums"]
    }
  },
  "deadline": "2024-01-15",
  "isPublic": true,
  "tags": ["europe", "vacation", "family"]
}
```

### 2. Get Travel Requirement
```http
GET /api/travel-agent/requirements/[requirementId]
```

### 3. Update Travel Requirement
```http
PUT /api/travel-agent/requirements/[requirementId]
```

### 4. List Travel Requirements
```http
GET /api/travel-agent/requirements/list
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status
- `category`: Filter by category
- `priority`: Filter by priority
- `userId`: Filter by user ID
- `assignedAgent`: Filter by assigned agent

### 5. Submit Travel Requirement
```http
POST /api/travel-agent/requirements/[requirementId]/submit
```

### 6. Assign Agent to Requirement
```http
POST /api/travel-agent/requirements/[requirementId]/assign
```

**Request Body:**
```json
{
  "agentId": "agent_id",
  "notes": "Agent assigned based on specialization"
}
```

### 7. Unassign Agent from Requirement
```http
POST /api/travel-agent/requirements/[requirementId]/unassign
```

## Quotation Management APIs

### 1. Create Quotation
```http
POST /api/travel-agent/quotations/create
```

**Request Body:**
```json
{
  "requirementId": "requirement_id",
  "title": "European Vacation Package Quote",
  "description": "Complete 2-week European vacation package",
  "validUntil": "2024-02-15",
  "currency": "USD",
  "totalPrice": 7500,
  "priceBreakdown": [{
    "category": "flights",
    "description": "Round trip flights NYC-Paris-Rome-NYC",
    "quantity": 3,
    "unitPrice": 1200,
    "totalPrice": 3600,
    "commission": 180,
    "taxes": 360,
    "fees": 100
  }],
  "itinerary": [{
    "day": 1,
    "date": "2024-06-15",
    "title": "Departure from New York",
    "description": "Flight to Paris",
    "activities": [{
      "time": "10:00",
      "activity": "Check-in at JFK",
      "location": "JFK Airport",
      "details": "Terminal 4, Air France"
    }],
    "transportation": {
      "type": "flight",
      "details": "Air France AF008",
      "departure": "1:30 PM",
      "arrival": "2:45 AM+1",
      "duration": "7h 15m"
    }
  }],
  "inclusions": [
    "Round trip airfare",
    "4-star hotel accommodation",
    "Daily breakfast",
    "Airport transfers"
  ],
  "exclusions": [
    "Travel insurance",
    "Lunch and dinner",
    "Personal expenses"
  ],
  "termsAndConditions": [
    "50% advance payment required",
    "Cancellation policy applies"
  ]
}
```

### 2. Get Quotation
```http
GET /api/travel-agent/quotations/[quotationId]
```

### 3. Update Quotation
```http
PUT /api/travel-agent/quotations/[quotationId]
```

### 4. List Quotations
```http
GET /api/travel-agent/quotations/list
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `requirementId`: Filter by requirement ID
- `agentId`: Filter by agent ID
- `status`: Filter by status

### 5. Send Quotation
```http
POST /api/travel-agent/quotations/[quotationId]/send
```

### 6. Accept Quotation
```http
POST /api/travel-agent/quotations/[quotationId]/accept
```

**Request Body:**
```json
{
  "notes": "Accepted with minor modifications requested"
}
```

### 7. Reject Quotation
```http
POST /api/travel-agent/quotations/[quotationId]/reject
```

**Request Body:**
```json
{
  "reason": "Price exceeds budget",
  "notes": "Looking for more budget-friendly options"
}
```

### 8. Create Quotation Revision
```http
POST /api/travel-agent/quotations/[quotationId]/revise
```

## Communication APIs

### 1. Get Communication Thread
```http
GET /api/travel-agent/communications/[communicationId]
```

### 2. Get Communication by Requirement
```http
GET /api/travel-agent/communications/requirement/[requirementId]
```

### 3. Send Message
```http
POST /api/travel-agent/communications/[communicationId]/messages
```

**Request Body:**
```json
{
  "content": "I have updated the quotation with better flight options",
  "messageType": "text",
  "replyTo": "message_id"
}
```

### 4. Upload File Attachment
```http
POST /api/travel-agent/communications/[communicationId]/upload
```

**Request:** multipart/form-data with file

### 5. Mark Messages as Read
```http
POST /api/travel-agent/communications/[communicationId]/read
```

**Request Body:**
```json
{
  "messageIds": ["message_id_1", "message_id_2"]
}
```

### 6. List Communications
```http
GET /api/travel-agent/communications/list
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `userId`: Filter by participant
- `requirementId`: Filter by requirement
- `unreadOnly`: Filter unread messages only

## Search and Filtering APIs

### 1. Search Requirements
```http
GET /api/travel-agent/search/requirements
```

**Query Parameters:**
- `q`: Search query
- `category`: Filter by category
- `destination`: Filter by destination
- `budgetMin`: Minimum budget
- `budgetMax`: Maximum budget
- `departureFrom`: Departure date from
- `departureTo`: Departure date to
- `status`: Filter by status

### 2. Search Agents
```http
GET /api/travel-agent/search/agents
```

**Query Parameters:**
- `q`: Search query
- `specialization`: Filter by specialization
- `region`: Filter by region
- `rating`: Minimum rating
- `experience`: Minimum years of experience

### 3. Search Quotations
```http
GET /api/travel-agent/search/quotations
```

**Query Parameters:**
- `q`: Search query
- `status`: Filter by status
- `priceMin`: Minimum price
- `priceMax`: Maximum price
- `validUntil`: Valid until date
- `agentId`: Filter by agent

## Notification APIs

### 1. Get Notifications
```http
GET /api/travel-agent/notifications
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `type`: Filter by type (requirement, quotation, message)
- `read`: Filter by read status

### 2. Mark Notification as Read
```http
POST /api/travel-agent/notifications/[notificationId]/read
```

### 3. Get Notification Settings
```http
GET /api/travel-agent/notifications/settings
```

### 4. Update Notification Settings
```http
PUT /api/travel-agent/notifications/settings
```

**Request Body:**
```json
{
  "emailNotifications": true,
  "smsNotifications": false,
  "pushNotifications": true,
  "notificationTypes": {
    "newRequirement": true,
    "quotationSent": true,
    "messageReceived": true,
    "quotationAccepted": true,
    "quotationRejected": true
  }
}
```

## Analytics and Reporting APIs

### 1. Get Agent Performance Metrics
```http
GET /api/travel-agent/analytics/agents/[agentId]/performance
```

**Query Parameters:**
- `period`: Time period (week, month, quarter, year)
- `startDate`: Start date
- `endDate`: End date

### 2. Get Requirement Statistics
```http
GET /api/travel-agent/analytics/requirements/stats
```

### 3. Get Quotation Statistics
```http
GET /api/travel-agent/analytics/quotations/stats
```

### 4. Get System Overview
```http
GET /api/travel-agent/analytics/overview
```

## File Management APIs

### 1. Upload File
```http
POST /api/travel-agent/files/upload
```

**Request:** multipart/form-data with file and metadata

### 2. Get File
```http
GET /api/travel-agent/files/[fileId]
```

### 3. Delete File
```http
DELETE /api/travel-agent/files/[fileId]
```

## Admin APIs

### 1. Get System Configuration
```http
GET /api/travel-agent/admin/config
```

### 2. Update System Configuration
```http
PUT /api/travel-agent/admin/config
```

### 3. Get All Agents (Admin)
```http
GET /api/travel-agent/admin/agents
```

### 4. Suspend Agent
```http
POST /api/travel-agent/admin/agents/[agentId]/suspend
```

### 5. Get All Requirements (Admin)
```http
GET /api/travel-agent/admin/requirements
```

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "data": null,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User doesn't have permission
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Input validation failed
- `DUPLICATE_ENTRY`: Duplicate resource
- `AGENT_NOT_AVAILABLE`: Agent not available for assignment
- `QUOTATION_EXPIRED`: Quotation has expired
- `REQUIREMENT_CLOSED`: Requirement is closed

## Rate Limiting

- General endpoints: 100 requests per minute
- File upload endpoints: 10 requests per minute
- Search endpoints: 50 requests per minute
- Notification endpoints: 200 requests per minute

## Caching Strategy

- Agent profiles: Cache for 1 hour
- Requirements list: Cache for 5 minutes
- Quotations: Cache for 30 minutes
- Search results: Cache for 15 minutes

## Security Considerations

1. Input validation for all endpoints
2. SQL injection prevention
3. XSS protection
4. File upload security (type checking, size limits)
5. Rate limiting implementation
6. Audit logging for sensitive operations
7. Role-based access control enforcement