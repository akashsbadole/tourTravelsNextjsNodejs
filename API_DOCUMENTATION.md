# Travel Agency API Documentation

This document provides comprehensive documentation for all implemented API endpoints in the travel agent requirement system.

## Table of Contents

1. [Authentication](#authentication)
2. [Travel Requirements APIs](#travel-requirements-apis)
3. [Quotations APIs](#quotations-apis)
4. [Communications APIs](#communications-apis)
5. [Error Responses](#error-responses)
6. [Data Models](#data-models)

## Authentication

All API endpoints require authentication using NextAuth.js session management. The following authentication levels are used:

- `requireAuth()`: Standard user authentication
- `requireAgentAuth()`: Agent authentication (user must have a verified agent profile)

Authentication is automatically handled by the middleware and endpoints will return appropriate error responses if authentication fails.

## Travel Requirements APIs

### POST /api/requirements
Create a new travel requirement.

**Authentication**: `requireAuth()`

**Request Body**:
```json
{
  "title": "string (required, max 200 chars)",
  "description": "string (required, max 2000 chars)",
  "category": "flight|hotel|package|custom (required)",
  "priority": "low|medium|high|urgent (default: medium)",
  "destinationInfo": {
    "origin": "string (required)",
    "destination": "string (required)",
    "multiCity": [
      {
        "city": "string",
        "order": "number"
      }
    ]
  },
  "travelDates": {
    "departureDate": "ISO date (required, future date)",
    "returnDate": "ISO date (optional)",
    "flexibleDates": "boolean (default: false)",
    "dateFlexibility": "number (1-30, optional)"
  },
  "travelerInfo": {
    "adults": "number (required, min 1)",
    "children": "number (default: 0)",
    "infants": "number (default: 0)",
    "childrenAges": "number[] (0-17)"
  },
  "budget": {
    "min": "number (required, min 0)",
    "max": "number (required, min 0)",
    "currency": "string (default: USD)"
  },
  "preferences": {
    "accommodationType": ["hotel|apartment|villa|resort|hostel"],
    "flightClass": ["economy|premium_economy|business|first"],
    "mealPreference": "vegetarian|vegan|halal|kosher|none",
    "transportation": "flight|train|bus|car_rental|mixed",
    "activities": "string[]",
    "specialRequirements": "string[]"
  },
  "deadline": "ISO date (optional)",
  "tags": "string[]",
  "attachments": [
    {
      "type": "string",
      "description": "string"
    }
  ],
  "isPublic": "boolean (default: false)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Travel requirement created successfully",
  "data": "TravelRequirement object"
}
```

### GET /api/requirements
List user's travel requirements with filtering and pagination.

**Authentication**: `requireAuth()`

**Query Parameters**:
- `category`: Filter by category
- `status`: Filter by status
- `priority`: Filter by priority
- `destination`: Filter by destination (partial match)
- `minBudget`: Filter by minimum budget
- `maxBudget`: Filter by maximum budget
- `departureDateFrom`: Filter by departure date from
- `departureDateTo`: Filter by departure date to
- `assignedAgent`: Filter by assigned agent ID
- `isPublic`: Filter by public status
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort order (default: desc)

**Response**:
```json
{
  "success": true,
  "data": "TravelRequirement array",
  "pagination": {
    "currentPage": "number",
    "totalPages": "number",
    "totalCount": "number",
    "limit": "number",
    "hasNextPage": "boolean",
    "hasPrevPage": "boolean"
  }
}
```

### GET /api/requirements/[id]
Get a specific travel requirement.

**Authentication**: `requireAuth()`

**Response**:
```json
{
  "success": true,
  "data": "TravelRequirement object"
}
```

### PUT /api/requirements/[id]
Update a travel requirement.

**Authentication**: `requireAuth()`

**Request Body**: Partial update of the create schema

**Response**:
```json
{
  "success": true,
  "message": "Travel requirement updated successfully",
  "data": "Updated TravelRequirement object"
}
```

### DELETE /api/requirements/[id]
Delete a travel requirement.

**Authentication**: `requireAuth()`

**Response**:
```json
{
  "success": true,
  "message": "Travel requirement deleted successfully"
}
```

### POST /api/requirements/[id]/assign
Assign an agent to a travel requirement.

**Authentication**: `requireAuth()`

**Request Body**:
```json
{
  "agentId": "string (required)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Agent assigned successfully",
  "data": "Updated TravelRequirement object"
}
```

## Quotations APIs

### POST /api/quotations
Create a new quotation.

**Authentication**: `requireAgentAuth()`

**Request Body**:
```json
{
  "requirementId": "string (required)",
  "title": "string (required, max 200 chars)",
  "description": "string (required, max 2000 chars)",
  "items": [
    {
      "category": "flight|hotel|transport|activity|insurance|visa|other (required)",
      "description": "string (required, max 500 chars)",
      "quantity": "number (required, min 1)",
      "unitPrice": "number (required, min 0)",
      "totalPrice": "number (required, min 0)",
      "currency": "string (default: USD)",
      "details": "any"
    }
  ],
  "pricing": {
    "subtotal": "number (required, min 0)",
    "tax": "number (default: 0, min 0)",
    "serviceFee": "number (default: 0, min 0)",
    "commission": "number (default: 0, min 0)",
    "discount": "number (default: 0, min 0)",
    "total": "number (required, min 0)",
    "currency": "string (default: USD)"
  },
  "termsAndConditions": {
    "paymentTerms": "string (required)",
    "cancellationPolicy": "string (required)",
    "refundPolicy": "string (required)",
    "amendmentPolicy": "string (optional)",
    "validityPeriod": "string (required)",
    "additionalTerms": "string[]"
  },
  "validityPeriod": {
    "startsAt": "ISO date (required, current or future)",
    "endsAt": "ISO date (required, future)"
  },
  "itinerary": "string (max 5000 chars)",
  "inclusions": "string[]",
  "exclusions": "string[]",
  "attachments": [
    {
      "type": "string",
      "description": "string"
    }
  ],
  "notes": "string (max 1000 chars)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Quotation created successfully",
  "data": "Quotation object"
}
```

### GET /api/quotations
List quotations with filtering and pagination.

**Authentication**: `requireAuth()`

**Query Parameters**:
- `requirementId`: Filter by requirement ID
- `agentId`: Filter by agent ID
- `status`: Filter by status
- `minTotal`: Filter by minimum total price
- `maxTotal`: Filter by maximum total price
- `validityFrom`: Filter by validity start date
- `validityTo`: Filter by validity end date
- `isRecommended`: Filter by recommended status
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort order (default: desc)

**Response**:
```json
{
  "success": true,
  "data": "Quotation array",
  "pagination": {
    "currentPage": "number",
    "totalPages": "number",
    "totalCount": "number",
    "limit": "number",
    "hasNextPage": "boolean",
    "hasPrevPage": "boolean"
  }
}
```

### GET /api/quotations/[id]
Get a specific quotation.

**Authentication**: `requireAuth()`

**Response**:
```json
{
  "success": true,
  "data": "Quotation object"
}
```

### PUT /api/quotations/[id]
Update a quotation.

**Authentication**: `requireAgentAuth()`

**Request Body**: Partial update of the create schema

**Response**:
```json
{
  "success": true,
  "message": "Quotation updated successfully",
  "data": "Updated Quotation object"
}
```

### DELETE /api/quotations/[id]
Delete a quotation.

**Authentication**: `requireAgentAuth()`

**Response**:
```json
{
  "success": true,
  "message": "Quotation deleted successfully"
}
```

### POST /api/quotations/[id]/send
Send a quotation to the user.

**Authentication**: `requireAgentAuth()`

**Request Body**:
```json
{
  "message": "string (max 1000 chars, optional)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Quotation sent successfully",
  "data": "Updated Quotation object"
}
```

### POST /api/quotations/[id]/respond
Respond to a quotation (accept/reject).

**Authentication**: `requireAuth()`

**Request Body**:
```json
{
  "response": "accepted|rejected (required)",
  "notes": "string (max 1000 chars, optional)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Quotation accepted/rejected successfully",
  "data": "Updated Quotation object"
}
```

## Communications APIs

### POST /api/communications
Create a new communication thread.

**Authentication**: `requireAuth()`

**Request Body**:
```json
{
  "requirementId": "string (required)",
  "title": "string (required, max 200 chars)",
  "participants": [
    {
      "user": "string (required)",
      "userType": "user|agent (required)"
    }
  ],
  "priority": "low|medium|high|urgent (default: medium)",
  "tags": "string[]",
  "metadata": "any"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Communication created successfully",
  "data": "Communication object"
}
```

### GET /api/communications
List user's communications with filtering and pagination.

**Authentication**: `requireAuth()`

**Query Parameters**:
- `requirementId`: Filter by requirement ID
- `status`: Filter by status
- `priority`: Filter by priority
- `participantType`: Filter by participant type
- `participantId`: Filter by participant ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `sortBy`: Sort field (default: lastMessageAt)
- `sortOrder`: Sort order (default: desc)

**Response**:
```json
{
  "success": true,
  "data": "Communication array",
  "pagination": {
    "currentPage": "number",
    "totalPages": "number",
    "totalCount": "number",
    "limit": "number",
    "hasNextPage": "boolean",
    "hasPrevPage": "boolean"
  }
}
```

### GET /api/communications/[id]
Get a specific communication thread.

**Authentication**: `requireAuth()`

**Response**:
```json
{
  "success": true,
  "data": "Communication object"
}
```

### PUT /api/communications/[id]
Update a communication thread.

**Authentication**: `requireAuth()`

**Request Body**:
```json
{
  "title": "string",
  "status": "active|archived|closed",
  "priority": "low|medium|high|urgent",
  "tags": "string[]",
  "metadata": "any",
  "closeReason": "string (required when status=closed)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Communication updated successfully",
  "data": "Updated Communication object"
}
```

### DELETE /api/communications/[id]
Delete a communication thread.

**Authentication**: `requireAuth()` (only requirement owners can delete)

**Response**:
```json
{
  "success": true,
  "message": "Communication deleted successfully"
}
```

### POST /api/communications/[id]/messages
Send a message in a communication thread.

**Authentication**: `requireAuth()`

**Request Body**:
```json
{
  "content": "string (required, max 2000 chars)",
  "messageType": "text|image|document|link|quote_reference (default: text)",
  "attachments": [
    {
      "type": "string",
      "filename": "string",
      "mimetype": "string",
      "size": "number"
    }
  ],
  "metadata": "any",
  "replyTo": "string",
  "mentions": [
    {
      "user": "string",
      "type": "user|agent"
    }
  ],
  "priority": "normal|high|urgent (default: normal)",
  "tags": "string[]"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message": "Message object",
    "communication": "Updated Communication object"
  }
}
```

### PUT /api/communications/[id]/read
Mark messages as read.

**Authentication**: `requireAuth()`

**Request Body**:
```json
{
  "messageIds": "string[] (optional)",
  "markAll": "boolean (default: false)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Messages marked as read successfully",
  "data": "Updated Communication object"
}
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP Status Codes:
- `200`: Success
- `201`: Created successfully
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (access denied)
- `404`: Not Found
- `500`: Internal Server Error

## Data Models

### TravelRequirement
- `userId`: ObjectId (reference to User)
- `title`: String
- `description`: String
- `category`: String (flight|hotel|package|custom)
- `status`: String (draft|published|assigned|in_progress|completed|cancelled)
- `priority`: String (low|medium|high|urgent)
- `destinationInfo`: Object
- `travelDates`: Object
- `travelerInfo`: Object
- `budget`: Object
- `preferences`: Object
- `assignedAgent`: ObjectId (reference to AgentProfile)
- `assignedAt`: Date
- `deadline`: Date
- `tags`: String[]
- `attachments`: Object[]
- `isPublic`: Boolean
- `views`: Number
- `quotesRequested`: Number
- `quotesReceived`: Number
- `completedAt`: Date
- `completionNotes`: String

### Quotation
- `requirementId`: ObjectId (reference to TravelRequirement)
- `agentId`: ObjectId (reference to AgentProfile)
- `userId`: ObjectId (reference to User)
- `title`: String
- `description`: String
- `status`: String (draft|sent|viewed|accepted|rejected|expired|withdrawn)
- `items`: Object[]
- `pricing`: Object
- `termsAndConditions`: Object
- `validityPeriod`: Object
- `itinerary`: String
- `inclusions`: String[]
- `exclusions`: String[]
- `attachments`: Object[]
- `notes`: String
- `sentAt`: Date
- `viewedAt`: Date
- `respondedAt`: Date
- `responseNotes`: String
- `revisionCount`: Number
- `parentQuotation`: ObjectId
- `childQuotations`: ObjectId[]
- `comparisonScore`: Number
- `isRecommended`: Boolean

### Communication
- `requirementId`: ObjectId (reference to TravelRequirement)
- `participants`: Object[]
- `title`: String
- `status`: String (active|archived|closed)
- `messages`: Object[]
- `lastMessageAt`: Date
- `lastMessagePreview`: String
- `metadata`: Object
- `tags`: String[]
- `priority`: String (low|medium|high|urgent)
- `escalationLevel`: Number
- `escalatedTo`: Object[]
- `satisfactionRating`: Number
- `satisfactionFeedback`: String
- `resolutionTime`: Number
- `firstResponseTime`: Number
- `averageResponseTime`: Number
- `totalMessages`: Number
- `archivedAt`: Date
- `archivedBy`: ObjectId
- `closedAt`: Date
- `closedBy`: ObjectId
- `closeReason`: String
- `isPublic`: Boolean
- `autoReplyEnabled`: Boolean
- `autoReplyMessage`: String
- `scheduledMessages`: Object[]

### Message
- `sender`: ObjectId (reference to User)
- `senderType`: String (user|agent)
- `content`: String
- `messageType`: String (text|image|document|link|quote_reference)
- `attachments`: Object[]
- `metadata`: Object
- `readAt`: Date
- `readBy`: Object[]
- `editedAt`: Date
- `editHistory`: Object[]
- `deletedAt`: Date
- `isDeleted`: Boolean
- `reactions`: Object[]
- `replyTo`: ObjectId
- `mentions`: Object[]
- `priority`: String (normal|high|urgent)
- `tags`: String[]
- `isSystemMessage`: Boolean
- `systemMessageType`: String