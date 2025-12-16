/**
 * Test file for Travel Agency API endpoints
 * This file contains comprehensive tests for all implemented endpoints
 */

// Test configurations
const API_BASE = 'http://localhost:3000/api';

// Test data
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User'
};

const testAgent = {
  id: 'test-agent-id',
  email: 'agent@example.com',
  name: 'Test Agent'
};

const testRequirement = {
  title: 'Test Travel Requirement',
  description: 'This is a test travel requirement for a family vacation',
  category: 'package',
  priority: 'medium',
  destinationInfo: {
    origin: 'New York',
    destination: 'Paris'
  },
  travelDates: {
    departureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    returnDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(), // 37 days from now
    flexibleDates: true,
    dateFlexibility: 3
  },
  travelerInfo: {
    adults: 2,
    children: 1,
    infants: 0,
    childrenAges: [8]
  },
  budget: {
    min: 3000,
    max: 5000,
    currency: 'USD'
  },
  preferences: {
    accommodationType: ['hotel', 'resort'],
    flightClass: ['economy', 'premium_economy'],
    mealPreference: 'none',
    transportation: 'flight',
    activities: ['sightseeing', 'museums'],
    specialRequirements: ['wheelchair accessible']
  },
  tags: ['family', 'vacation', 'europe'],
  isPublic: false
};

const testQuotation = {
  title: 'Paris Family Vacation Package',
  description: 'Complete family vacation package to Paris with flights and hotel',
  items: [
    {
      category: 'flight',
      description: 'Round-trip flights from New York to Paris',
      quantity: 3,
      unitPrice: 800,
      totalPrice: 2400,
      currency: 'USD'
    },
    {
      category: 'hotel',
      description: '7 nights at 4-star hotel in city center',
      quantity: 7,
      unitPrice: 200,
      totalPrice: 1400,
      currency: 'USD'
    },
    {
      category: 'activity',
      description: 'City tour and museum passes',
      quantity: 3,
      unitPrice: 150,
      totalPrice: 450,
      currency: 'USD'
    }
  ],
  pricing: {
    subtotal: 4250,
    tax: 425,
    serviceFee: 100,
    commission: 212.50,
    discount: 0,
    total: 4987.50,
    currency: 'USD'
  },
  termsAndConditions: {
    paymentTerms: '50% deposit required, balance 30 days before travel',
    cancellationPolicy: 'Full refund if cancelled 60 days before travel',
    refundPolicy: 'Partial refund based on cancellation timing',
    amendmentPolicy: 'Changes allowed up to 30 days before travel',
    validityPeriod: '7 days from issue date'
  },
  validityPeriod: {
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
  },
  itinerary: 'Day 1: Arrival and check-in\nDay 2: City tour\nDay 3: Louvre Museum\n...',
  inclusions: ['Flights', 'Hotel accommodation', 'Daily breakfast', 'City tour', 'Museum passes'],
  exclusions: ['Lunch and dinner', 'Travel insurance', 'Personal expenses'],
  notes: 'Special dietary requirements can be accommodated'
};

const testCommunication = {
  title: 'Discussion about Paris Family Vacation',
  participants: [
    { user: testUser.id, userType: 'user' },
    { user: testAgent.id, userType: 'agent' }
  ],
  priority: 'medium',
  tags: ['paris', 'family', 'vacation']
};

const testMessage = {
  content: 'Hello, I have some questions about the itinerary',
  messageType: 'text',
  priority: 'normal'
};

/**
 * Test helper functions
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    console.error(`Request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Test functions for each endpoint
 */

// Travel Requirement Tests
async function testTravelRequirements() {
  console.log('\n=== Testing Travel Requirement APIs ===');
  
  try {
    // Test POST /api/requirements - Create requirement
    console.log('Testing POST /api/requirements...');
    const createResult = await makeRequest('/requirements', {
      method: 'POST',
      body: JSON.stringify(testRequirement)
    });
    console.log('Create requirement status:', createResult.response.status);
    
    if (createResult.response.status === 201) {
      const requirementId = createResult.data.data._id;
      
      // Test GET /api/requirements - List requirements
      console.log('Testing GET /api/requirements...');
      const listResult = await makeRequest('/requirements');
      console.log('List requirements status:', listResult.response.status);
      
      // Test GET /api/requirements/[id] - Get specific requirement
      console.log('Testing GET /api/requirements/[id]...');
      const getResult = await makeRequest(`/requirements/${requirementId}`);
      console.log('Get requirement status:', getResult.response.status);
      
      // Test PUT /api/requirements/[id] - Update requirement
      console.log('Testing PUT /api/requirements/[id]...');
      const updateResult = await makeRequest(`/requirements/${requirementId}`, {
        method: 'PUT',
        body: JSON.stringify({ priority: 'high' })
      });
      console.log('Update requirement status:', updateResult.response.status);
      
      // Test POST /api/requirements/[id]/assign - Assign agent
      console.log('Testing POST /api/requirements/[id]/assign...');
      const assignResult = await makeRequest(`/requirements/${requirementId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ agentId: testAgent.id })
      });
      console.log('Assign agent status:', assignResult.response.status);
      
      // Test DELETE /api/requirements/[id] - Delete requirement
      console.log('Testing DELETE /api/requirements/[id]...');
      const deleteResult = await makeRequest(`/requirements/${requirementId}`, {
        method: 'DELETE'
      });
      console.log('Delete requirement status:', deleteResult.response.status);
    }
  } catch (error) {
    console.error('Travel Requirements test failed:', error);
  }
}

// Quotation Tests
async function testQuotations() {
  console.log('\n=== Testing Quotation APIs ===');
  
  try {
    // Test POST /api/quotations - Create quotation
    console.log('Testing POST /api/quotations...');
    const createResult = await makeRequest('/quotations', {
      method: 'POST',
      body: JSON.stringify({
        ...testQuotation,
        requirementId: 'test-requirement-id'
      })
    });
    console.log('Create quotation status:', createResult.response.status);
    
    if (createResult.response.status === 201) {
      const quotationId = createResult.data.data._id;
      
      // Test GET /api/quotations - List quotations
      console.log('Testing GET /api/quotations...');
      const listResult = await makeRequest('/quotations');
      console.log('List quotations status:', listResult.response.status);
      
      // Test GET /api/quotations/[id] - Get specific quotation
      console.log('Testing GET /api/quotations/[id]...');
      const getResult = await makeRequest(`/quotations/${quotationId}`);
      console.log('Get quotation status:', getResult.response.status);
      
      // Test PUT /api/quotations/[id] - Update quotation
      console.log('Testing PUT /api/quotations/[id]...');
      const updateResult = await makeRequest(`/quotations/${quotationId}`, {
        method: 'PUT',
        body: JSON.stringify({ notes: 'Updated notes for quotation' })
      });
      console.log('Update quotation status:', updateResult.response.status);
      
      // Test POST /api/quotations/[id]/send - Send quotation
      console.log('Testing POST /api/quotations/[id]/send...');
      const sendResult = await makeRequest(`/quotations/${quotationId}/send`, {
        method: 'POST',
        body: JSON.stringify({ message: 'Please review this quotation' })
      });
      console.log('Send quotation status:', sendResult.response.status);
      
      // Test POST /api/quotations/[id]/respond - Respond to quotation
      console.log('Testing POST /api/quotations/[id]/respond...');
      const respondResult = await makeRequest(`/quotations/${quotationId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ 
          response: 'accepted',
          notes: 'This looks great, lets proceed'
        })
      });
      console.log('Respond to quotation status:', respondResult.response.status);
      
      // Test DELETE /api/quotations/[id] - Delete quotation
      console.log('Testing DELETE /api/quotations/[id]...');
      const deleteResult = await makeRequest(`/quotations/${quotationId}`, {
        method: 'DELETE'
      });
      console.log('Delete quotation status:', deleteResult.response.status);
    }
  } catch (error) {
    console.error('Quotations test failed:', error);
  }
}

// Communication Tests
async function testCommunications() {
  console.log('\n=== Testing Communication APIs ===');
  
  try {
    // Test POST /api/communications - Create communication
    console.log('Testing POST /api/communications...');
    const createResult = await makeRequest('/communications', {
      method: 'POST',
      body: JSON.stringify({
        ...testCommunication,
        requirementId: 'test-requirement-id'
      })
    });
    console.log('Create communication status:', createResult.response.status);
    
    if (createResult.response.status === 201) {
      const communicationId = createResult.data.data._id;
      
      // Test GET /api/communications - List communications
      console.log('Testing GET /api/communications...');
      const listResult = await makeRequest('/communications');
      console.log('List communications status:', listResult.response.status);
      
      // Test GET /api/communications/[id] - Get specific communication
      console.log('Testing GET /api/communications/[id]...');
      const getResult = await makeRequest(`/communications/${communicationId}`);
      console.log('Get communication status:', getResult.response.status);
      
      // Test PUT /api/communications/[id] - Update communication
      console.log('Testing PUT /api/communications/[id]...');
      const updateResult = await makeRequest(`/communications/${communicationId}`, {
        method: 'PUT',
        body: JSON.stringify({ priority: 'high' })
      });
      console.log('Update communication status:', updateResult.response.status);
      
      // Test POST /api/communications/[id]/messages - Send message
      console.log('Testing POST /api/communications/[id]/messages...');
      const messageResult = await makeRequest(`/communications/${communicationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(testMessage)
      });
      console.log('Send message status:', messageResult.response.status);
      
      // Test PUT /api/communications/[id]/read - Mark as read
      console.log('Testing PUT /api/communications/[id]/read...');
      const readResult = await makeRequest(`/communications/${communicationId}/read`, {
        method: 'PUT',
        body: JSON.stringify({ markAll: true })
      });
      console.log('Mark as read status:', readResult.response.status);
      
      // Test DELETE /api/communications/[id] - Delete communication
      console.log('Testing DELETE /api/communications/[id]...');
      const deleteResult = await makeRequest(`/communications/${communicationId}`, {
        method: 'DELETE'
      });
      console.log('Delete communication status:', deleteResult.response.status);
    }
  } catch (error) {
    console.error('Communications test failed:', error);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('Starting Travel Agency API Tests...');
  console.log('Note: These tests require authentication and valid user/agent sessions');
  console.log('Make sure the development server is running on localhost:3000');
  
  try {
    await testTravelRequirements();
    await testQuotations();
    await testCommunications();
    
    console.log('\n=== Test Summary ===');
    console.log('All API endpoint tests completed.');
    console.log('Check the status codes above to verify each endpoint works correctly.');
    console.log('Expected status codes: 200 (GET), 201 (POST), 204 (DELETE)');
    
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testTravelRequirements,
    testQuotations,
    testCommunications
  };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runAllTests();
}