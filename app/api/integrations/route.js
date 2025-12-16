import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getIntegrationHooks } from "@/lib/services/integrationHooks";

/**
 * GET /api/integrations
 * Get list of available and configured integrations
 */
export async function GET(request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const active = searchParams.get("active");
    const limit = parseInt(searchParams.get("limit")) || 50;
    const offset = parseInt(searchParams.get("offset")) || 0;

    // Get integrations from database
    const { getManyDocs } = await import("@/lib/db/operations");
    
    let query = {};
    if (type) query.type = type;
    if (active !== null) query.isActive = active === "true";

    const integrations = await getManyDocs("Integration", query, [], {
      sort: { createdAt: -1 },
      limit,
      offset
    });

    // Get integration hooks instance for supported integrations
    const hooks = getIntegrationHooks();
    const supportedIntegrations = hooks.options.supportedIntegrations;

    // Add status and last execution data
    const enrichedIntegrations = await Promise.all(
      integrations.map(async (integration) => {
        const lastExecution = await getLastExecution(integration._id);
        return {
          ...integration,
          isSupported: supportedIntegrations[integration.type] || false,
          lastExecution,
          status: integration.isActive ? "active" : "inactive"
        };
      })
    );

    return NextResponse.json({
      success: true,
      integrations: enrichedIntegrations,
      supportedTypes: Object.keys(supportedIntegrations).filter(key => supportedIntegrations[key]),
      pagination: {
        limit,
        offset,
        total: integrations.length
      }
    });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch integrations",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations
 * Create a new integration
 */
export async function POST(request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      type,
      description,
      config,
      events,
      isActive = true,
      metadata = {}
    } = body;

    // Validate required fields
    if (!name || !type || !config) {
      return NextResponse.json(
        { error: "Name, type, and config are required" },
        { status: 400 }
      );
    }

    // Check if integration type is supported
    const hooks = getIntegrationHooks();
    if (!hooks.options.supportedIntegrations[type]) {
      return NextResponse.json(
        { error: `Integration type '${type}' is not supported` },
        { status: 400 }
      );
    }

    // Validate configuration based on type
    const validationError = validateIntegrationConfig(type, config);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Create integration
    const { createDoc } = await import("@/lib/db/operations");
    const integration = await createDoc("Integration", {
      name,
      type,
      description,
      config,
      events: events || [],
      isActive,
      metadata,
      userId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Test integration if requested
    let testResult = null;
    if (body.testIntegration) {
      testResult = await testIntegration(type, config);
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.insertedId,
        name,
        type,
        description,
        events,
        isActive,
        metadata,
        testResult
      },
      message: "Integration created successfully"
    });
  } catch (error) {
    console.error("Error creating integration:", error);
    return NextResponse.json(
      { 
        error: "Failed to create integration",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Get last execution for integration
 * @param {string} integrationId - Integration ID
 * @returns {Object|null} Last execution
 */
async function getLastExecution(integrationId) {
  try {
    const { getManyDocs } = await import("@/lib/db/operations");
    const executions = await getManyDocs("IntegrationExecution", {
      integrationId
    }, [], {
      sort: { executedAt: -1 },
      limit: 1
    });

    return executions.length > 0 ? executions[0] : null;
  } catch (error) {
    console.error("Error getting last execution:", error);
    return null;
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