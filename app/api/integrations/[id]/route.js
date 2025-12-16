import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getIntegrationHooks } from "@/lib/services/integrationHooks";

/**
 * GET /api/integrations/[id]
 * Get a specific integration
 */
export async function GET(request, { params }) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get integration from database
    const { getManyDocs } = await import("@/lib/db/operations");
    const integrations = await getManyDocs("Integration", { _id: id });

    if (integrations.length === 0) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const integration = integrations[0];

    // Get execution history
    const executions = await getManyDocs("IntegrationExecution", {
      integrationId: id
    }, [], {
      sort: { executedAt: -1 },
      limit: 50
    });

    // Get statistics
    const stats = await getIntegrationStats(id);

    return NextResponse.json({
      success: true,
      integration,
      executions,
      stats
    });
  } catch (error) {
    console.error("Error fetching integration:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch integration",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations/[id]
 * Update a specific integration
 */
export async function PUT(request, { params }) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const {
      name,
      description,
      config,
      events,
      isActive,
      metadata
    } = body;

    // Get existing integration
    const { getManyDocs, updateOneDoc } = await import("@/lib/db/operations");
    const integrations = await getManyDocs("Integration", { _id: id });

    if (integrations.length === 0) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const existingIntegration = integrations[0];

    // Validate configuration if provided
    if (config) {
      const hooks = getIntegrationHooks();
      if (!hooks.options.supportedIntegrations[existingIntegration.type]) {
        return NextResponse.json(
          { error: `Integration type '${existingIntegration.type}' is not supported` },
          { status: 400 }
        );
      }

      const validationError = validateIntegrationConfig(existingIntegration.type, config);
      if (validationError) {
        return NextResponse.json(
          { error: validationError },
          { status: 400 }
        );
      }
    }

    // Update integration
    const updateData = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (config !== undefined) updateData.config = config;
    if (events !== undefined) updateData.events = events;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (metadata !== undefined) updateData.metadata = metadata;

    await updateOneDoc("Integration", { _id: id }, { $set: updateData });

    // Test integration if requested
    let testResult = null;
    if (body.testIntegration && config) {
      testResult = await testIntegration(existingIntegration.type, config);
    }

    return NextResponse.json({
      success: true,
      integration: {
        id,
        ...existingIntegration,
        ...updateData,
        testResult
      },
      message: "Integration updated successfully"
    });
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json(
      { 
        error: "Failed to update integration",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/[id]
 * Delete a specific integration
 */
export async function DELETE(request, { params }) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if integration exists
    const { getManyDocs, deleteOneDoc } = await import("@/lib/db/operations");
    const integrations = await getManyDocs("Integration", { _id: id });

    if (integrations.length === 0) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Delete integration
    await deleteOneDoc("Integration", { _id: id });

    // Optionally, clean up execution history
    if (request.url.includes("cleanup=true")) {
      const { deleteManyDocs } = await import("@/lib/db/operations");
      await deleteManyDocs("IntegrationExecution", { integrationId: id });
    }

    return NextResponse.json({
      success: true,
      message: "Integration deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete integration",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/[id]/test
 * Test a specific integration
 */
export async function POST(request, { params }) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    { params } = await import("next/headers");
    const { id } = params;

    const body = await request.json();
    const { eventType = "test_event", testData = {} } = body;

    // Get integration
    const { getManyDocs } = await import("@/lib/db/operations");
    const integrations = await getManyDocs("Integration", { _id: id });

    if (integrations.length === 0) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const integration = integrations[0];

    // Test integration
    const testResult = await testIntegrationWithEvent(integration.type, integration.config, eventType, testData);

    // Log test execution
    const { createDoc } = await import("@/lib/db/operations");
    await createDoc("IntegrationExecution", {
      integrationId: id,
      type: integration.type,
      success: testResult.success,
      error: testResult.error || null,
      response: testResult.response || null,
      executedAt: new Date(),
      isTest: true
    });

    return NextResponse.json({
      success: true,
      testResult,
      message: testResult.success ? "Integration test successful" : "Integration test failed"
    });
  } catch (error) {
    console.error("Error testing integration:", error);
    return NextResponse.json(
      { 
        error: "Failed to test integration",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Get integration statistics
 * @param {string} integrationId - Integration ID
 * @returns {Object} Statistics
 */
async function getIntegrationStats(integrationId) {
  try {
    const { getManyDocs } = await import("@/lib/db/operations");
    
    // Get all executions
    const executions = await getManyDocs("IntegrationExecution", {
      integrationId
    });

    if (executions.length === 0) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        lastExecution: null,
        averageExecutionTime: 0
      };
    }

    // Calculate statistics
    const successful = executions.filter(e => e.success).length;
    const failed = executions.length - successful;
    const successRate = (successful / executions.length) * 100;

    // Get last execution
    const lastExecution = executions.sort((a, b) => 
      new Date(b.executedAt) - new Date(a.executedAt)
    )[0];

    // Calculate average execution time (if available)
    const executionTimes = executions
      .filter(e => e.executionTime)
      .map(e => e.executionTime);
    
    const averageExecutionTime = executionTimes.length > 0 ?
      executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length : 0;

    // Get executions by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentExecutions = executions.filter(e => 
      new Date(e.executedAt) > thirtyDaysAgo
    );

    const executionsByDay = {};
    for (const execution of recentExecutions) {
      const day = new Date(execution.executedAt).toISOString().split('T')[0];
      if (!executionsByDay[day]) {
        executionsByDay[day] = { total: 0, successful: 0, failed: 0 };
      }
      executionsByDay[day].total++;
      if (execution.success) {
        executionsByDay[day].successful++;
      } else {
        executionsByDay[day].failed++;
      }
    }

    return {
      totalExecutions: executions.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      successRate: Math.round(successRate * 100) / 100,
      lastExecution: lastExecution ? {
        executedAt: lastExecution.executedAt,
        success: lastExecution.success,
        error: lastExecution.error
      } : null,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      executionsByDay,
      recentExecutions: recentExecutions.length
    };
  } catch (error) {
    console.error("Error getting integration stats:", error);
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      lastExecution: null,
      averageExecutionTime: 0
    };
  }
}

/**
 * Validate integration configuration
 * @param {string} type - Integration type
 * @param {Object} config - Configuration
 * @returns {string|null} Error message or null
 */
function validateIntegrationConfig(type, config) {
  switch (type) {
    case 'googleAnalytics':
      if (!config.measurementId || !config.apiSecret) {
        return "Measurement ID and API secret are required for Google Analytics";
      }
      break;
    case 'mixpanel':
      if (!config.token) {
        return "Token is required for Mixpanel";
      }
      break;
    case 'segment':
      if (!config.writeKey) {
        return "Write key is required for Segment";
      }
      break;
    case 'amplitude':
      if (!config.apiKey) {
        return "API key is required for Amplitude";
      }
      break;
    case 'mailchimp':
      if (!config.apiKey || !config.dc || !config.listId) {
        return "API key, DC, and list ID are required for Mailchimp";
      }
      break;
    case 'hubspot':
      if (!config.accessToken) {
        return "Access token is required for HubSpot";
      }
      break;
    case 'salesforce':
      if (!config.accessToken || !config.instanceUrl) {
        return "Access token and instance URL are required for Salesforce";
      }
      break;
    case 'slack':
      if (!config.webhookUrl) {
        return "Webhook URL is required for Slack";
      }
      break;
    case 'discord':
      if (!config.webhookUrl) {
        return "Webhook URL is required for Discord";
      }
      break;
    case 'teams':
      if (!config.webhookUrl) {
        return "Webhook URL is required for Teams";
      }
      break;
    case 'shopify':
      if (!config.accessToken || !config.shopName) {
        return "Access token and shop name are required for Shopify";
      }
      break;
    case 'custom':
      if (!config.url) {
        return "URL is required for custom webhook";
      }
      break;
    default:
      return null;
  }
  
  return null;
}

/**
 * Test integration
 * @param {string} type - Integration type
 * @param {Object} config - Configuration
 * @returns {Object} Test result
 */
async function testIntegration(type, config) {
  try {
    const hooks = getIntegrationHooks();
    
    // Create test event
    const testEvent = {
      eventType: 'test_event',
      data: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };

    // Create test integration object
    const testIntegration = {
      _id: 'test',
      type,
      config
    };

    // Execute test
    const result = await hooks.executeIntegration(testEvent, testIntegration);
    
    return {
      success: result.success,
      message: result.success ? "Integration test successful" : "Integration test failed",
      details: result.error || result.response || "Test completed",
      timestamp: new Date()
    };
  } catch (error) {
    return {
      success: false,
      message: "Integration test failed",
      details: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Test integration with custom event
 * @param {string} type - Integration type
 * @param {Object} config - Configuration
 * @param {string} eventType - Event type
 * @param {Object} testData - Test data
 * @returns {Object} Test result
 */
async function testIntegrationWithEvent(type, config, eventType, testData) {
  try {
    const hooks = getIntegrationHooks();
    
    // Create test event
    const testEvent = {
      eventType,
      data: {
        test: true,
        ...testData,
        timestamp: new Date().toISOString()
      }
    };

    // Create test integration object
    const testIntegration = {
      _id: 'test',
      type,
      config
    };

    // Execute test
    const result = await hooks.executeIntegration(testEvent, testIntegration);
    
    return {
      success: result.success,
      message: result.success ? "Integration test successful" : "Integration test failed",
      details: result.error || result.response || "Test completed",
      timestamp: new Date()
    };
  } catch (error) {
    return {
      success: false,
      message: "Integration test failed",
      details: error.message,
      timestamp: new Date()
    };
  }
}