import { createDoc, updateOneDoc, getManyDocs } from "@/lib/db/operations";
import { getAlertAnalyticsService } from "./alertAnalytics";
import { getNotificationDeliveryTracking } from "./notificationDeliveryTracking";

/**
 * Integration Hooks Service
 * Provides hooks for integrating with external services and platforms
 */
export class IntegrationHooks {
  constructor(options = {}) {
    this.options = {
      // Webhook settings
      enableWebhooks: true,              // Enable webhook integrations
      webhookTimeout: 30000,             // 30 seconds timeout
      webhookRetryAttempts: 3,          // Maximum retry attempts
      webhookRetryDelay: 1000,          // 1 second between retries
      
      // API integration settings
      enableAPIIntegrations: true,       // Enable API integrations
      apiTimeout: 15000,                 // 15 seconds timeout
      apiRetryAttempts: 2,               // Maximum retry attempts
      
      // Event settings
      enableEventStreaming: true,        // Enable event streaming
      eventBatchSize: 100,               // Events per batch
      eventFlushInterval: 5000,           // 5 seconds flush interval
      
      // Security settings
      enableWebhookSigning: true,        // Sign webhook payloads
      webhookSigningSecret: process.env.WEBHOOK_SIGNING_SECRET || 'default-secret',
      
      // Rate limiting
      enableRateLimiting: true,          // Enable rate limiting
      rateLimitWindow: 60000,            // 1 minute window
      rateLimitMax: 1000,                // Max requests per window
      
      // Supported integrations
      supportedIntegrations: {
        // Analytics platforms
        googleAnalytics: true,
        mixpanel: true,
        segment: true,
        amplitude: true,
        
        // Marketing automation
        mailchimp: true,
        hubspot: true,
        salesforce: true,
        marketo: true,
        
        // Communication platforms
        slack: true,
        discord: true,
        teams: true,
        
        // E-commerce platforms
        shopify: true,
        woocommerce: true,
        magento: true,
        
        // Custom webhooks
        custom: true
      },
      
      ...options
    };
    
    this.analyticsService = getAlertAnalyticsService();
    this.deliveryTracking = getNotificationDeliveryTracking();
    
    // Event queue
    this.eventQueue = [];
    this.lastEventFlush = Date.now();
    
    // Rate limiting
    this.rateLimitMap = new Map();
    
    // Start background processes
    this.startBackgroundProcesses();
  }

  /**
   * Trigger integration hook
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @param {Object} options - Hook options
   * @returns {Object} Hook result
   */
  async triggerHook(eventType, data, options = {}) {
    try {
      const {
        integrations = [],           // Specific integrations to trigger
        async = true,                // Execute asynchronously
        priority = 'normal',          // Priority level
        metadata = {}                 // Additional metadata
      } = options;

      // Get active integrations for this event type
      const activeIntegrations = await this.getActiveIntegrations(eventType, integrations);
      
      if (activeIntegrations.length === 0) {
        return {
          success: true,
          message: 'No active integrations found for this event type',
          triggeredIntegrations: 0
        };
      }

      // Prepare event payload
      const eventPayload = {
        eventType,
        timestamp: new Date().toISOString(),
        data,
        metadata,
        priority,
        eventId: this.generateEventId()
      };

      // Execute integrations
      if (async) {
        // Queue for async processing
        this.queueEvent(eventPayload, activeIntegrations);
        
        return {
          success: true,
          message: 'Event queued for processing',
          eventId: eventPayload.eventId,
          queuedIntegrations: activeIntegrations.length
        };
      } else {
        // Execute synchronously
        const results = await this.executeIntegrations(eventPayload, activeIntegrations);
        
        return {
          success: true,
          message: 'Integrations executed',
          eventId: eventPayload.eventId,
          results
        };
      }
    } catch (error) {
      console.error('Error triggering integration hook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get active integrations for event type
   * @param {string} eventType - Event type
   * @param {Array} specificIntegrations - Specific integrations to include
   * @returns {Array} Active integrations
   */
  async getActiveIntegrations(eventType, specificIntegrations = []) {
    try {
      // Get integrations from database
      const query = {
        isActive: true,
        events: eventType
      };
      
      if (specificIntegrations.length > 0) {
        query.type = { $in: specificIntegrations };
      }
      
      const integrations = await getManyDocs("Integration", query);
      
      // Filter by supported integrations
      return integrations.filter(integration => 
        this.options.supportedIntegrations[integration.type]
      );
    } catch (error) {
      console.error('Error getting active integrations:', error);
      return [];
    }
  }

  /**
   * Queue event for processing
   * @param {Object} eventPayload - Event payload
   * @param {Array} integrations - Integrations to execute
   */
  queueEvent(eventPayload, integrations) {
    for (const integration of integrations) {
      this.eventQueue.push({
        event: eventPayload,
        integration,
        queuedAt: Date.now(),
        attempts: 0
      });
    }
    
    // Flush queue if it's getting full
    if (this.eventQueue.length >= this.options.eventBatchSize) {
      this.flushEventQueue();
    }
  }

  /**
   * Execute integrations
   * @param {Object} eventPayload - Event payload
   * @param {Array} integrations - Integrations to execute
   * @returns {Array} Execution results
   */
  async executeIntegrations(eventPayload, integrations) {
    const results = [];
    
    for (const integration of integrations) {
      try {
        // Check rate limiting
        if (this.options.enableRateLimiting && !this.checkRateLimit(integration._id)) {
          results.push({
            integrationId: integration._id,
            type: integration.type,
            success: false,
            error: 'Rate limit exceeded'
          });
          continue;
        }
        
        // Execute based on integration type
        const result = await this.executeIntegration(eventPayload, integration);
        results.push(result);
        
        // Log execution
        await this.logIntegrationExecution(eventPayload.eventId, integration._id, result);
      } catch (error) {
        console.error(`Error executing integration ${integration.type}:`, error);
        results.push({
          integrationId: integration._id,
          type: integration.type,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Execute specific integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} integration - Integration configuration
   * @returns {Object} Execution result
   */
  async executeIntegration(eventPayload, integration) {
    const { type, config } = integration;
    
    switch (type) {
      case 'googleAnalytics':
        return await this.executeGoogleAnalytics(eventPayload, config);
      case 'mixpanel':
        return await this.executeMixpanel(eventPayload, config);
      case 'segment':
        return await this.executeSegment(eventPayload, config);
      case 'amplitude':
        return await this.executeAmplitude(eventPayload, config);
      case 'mailchimp':
        return await this.executeMailchimp(eventPayload, config);
      case 'hubspot':
        return await this.executeHubspot(eventPayload, config);
      case 'salesforce':
        return await this.executeSalesforce(eventPayload, config);
      case 'slack':
        return await this.executeSlack(eventPayload, config);
      case 'discord':
        return await this.executeDiscord(eventPayload, config);
      case 'teams':
        return await this.executeTeams(eventPayload, config);
      case 'shopify':
        return await this.executeShopify(eventPayload, config);
      case 'custom':
        return await this.executeCustomWebhook(eventPayload, config);
      default:
        throw new Error(`Unsupported integration type: ${type}`);
    }
  }

  /**
   * Execute Google Analytics integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeGoogleAnalytics(eventPayload, config) {
    try {
      // Map event to GA4 event
      const gaEvent = this.mapToGoogleAnalyticsEvent(eventPayload);
      
      // Send to Google Analytics
      const response = await this.makeHTTPRequest(
        `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: eventPayload.data.userId || 'anonymous',
            events: [gaEvent]
          })
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'googleAnalytics',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'googleAnalytics',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute Mixpanel integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeMixpanel(eventPayload, config) {
    try {
      // Map event to Mixpanel format
      const mpEvent = this.mapToMixpanelEvent(eventPayload);
      
      // Send to Mixpanel
      const response = await this.makeHTTPRequest(
        `https://api.mixpanel.com/track?ip=1&verbose=1`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${config.token}:`).toString('base64')}`
          },
          body: JSON.stringify([mpEvent])
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'mixpanel',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'mixpanel',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute Segment integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeSegment(eventPayload, config) {
    try {
      // Map event to Segment format
      const segmentEvent = this.mapToSegmentEvent(eventPayload);
      
      // Send to Segment
      const response = await this.makeHTTPRequest(
        `https://api.segment.io/v1/track`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${config.writeKey}:`).toString('base64')}`
          },
          body: JSON.stringify(segmentEvent)
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'segment',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'segment',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute Slack integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeSlack(eventPayload, config) {
    try {
      // Format message for Slack
      const slackMessage = this.formatSlackMessage(eventPayload);
      
      // Send to Slack
      const response = await this.makeHTTPRequest(
        config.webhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(slackMessage)
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'slack',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'slack',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute Discord integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeDiscord(eventPayload, config) {
    try {
      // Format message for Discord
      const discordMessage = this.formatDiscordMessage(eventPayload);
      
      // Send to Discord
      const response = await this.makeHTTPRequest(
        config.webhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(discordMessage)
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'discord',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'discord',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute custom webhook integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeCustomWebhook(eventPayload, config) {
    try {
      // Prepare webhook payload
      const webhookPayload = {
        ...eventPayload,
        integrationId: config.integrationId,
        timestamp: new Date().toISOString()
      };
      
      // Sign payload if enabled
      if (this.options.enableWebhookSigning) {
        webhookPayload.signature = this.signPayload(webhookPayload);
      }
      
      // Send webhook
      const response = await this.makeHTTPRequest(
        config.url,
        {
          method: config.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TravelAgency-Webhooks/1.0',
            ...(config.headers || {})
          },
          body: JSON.stringify(webhookPayload),
          timeout: this.options.webhookTimeout
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'custom',
        success: response.ok,
        status: response.status,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'custom',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute Mailchimp integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeMailchimp(eventPayload, config) {
    try {
      // Map event to Mailchimp format
      const mailchimpEvent = this.mapToMailchimpEvent(eventPayload);
      
      // Send to Mailchimp
      const response = await this.makeHTTPRequest(
        `https://${config.dc}.api.mailchimp.com/3.0/lists/${config.listId}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`anystring:${config.apiKey}`).toString('base64')}`
          },
          body: JSON.stringify(mailchimpEvent)
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'mailchimp',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'mailchimp',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute HubSpot integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeHubspot(eventPayload, config) {
    try {
      // Map event to HubSpot format
      const hubspotEvent = this.mapToHubspotEvent(eventPayload);
      
      // Send to HubSpot
      const response = await this.makeHTTPRequest(
        `https://api.hubapi.com/crm/v3/objects/contacts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.accessToken}`
          },
          body: JSON.stringify(hubspotEvent)
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'hubspot',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'hubspot',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute Salesforce integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeSalesforce(eventPayload, config) {
    try {
      // Map event to Salesforce format
      const salesforceEvent = this.mapToSalesforceEvent(eventPayload);
      
      // Send to Salesforce
      const response = await this.makeHTTPRequest(
        `${config.instanceUrl}/services/data/v52.0/sobjects/Lead`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.accessToken}`
          },
          body: JSON.stringify(salesforceEvent)
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'salesforce',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'salesforce',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute Amplitude integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeAmplitude(eventPayload, config) {
    try {
      // Map event to Amplitude format
      const amplitudeEvent = this.mapToAmplitudeEvent(eventPayload);
      
      // Send to Amplitude
      const response = await this.makeHTTPRequest(
        `https://api2.amplitude.com/2/httpapi`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*'
          },
          body: JSON.stringify({
            api_key: config.apiKey,
            events: [amplitudeEvent]
          })
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'amplitude',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'amplitude',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute Teams integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeTeams(eventPayload, config) {
    try {
      // Format message for Teams
      const teamsMessage = this.formatTeamsMessage(eventPayload);
      
      // Send to Teams
      const response = await this.makeHTTPRequest(
        config.webhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(teamsMessage)
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'teams',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'teams',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Execute Shopify integration
   * @param {Object} eventPayload - Event payload
   * @param {Object} config - Integration config
   * @returns {Object} Execution result
   */
  async executeShopify(eventPayload, config) {
    try {
      // Map event to Shopify format
      const shopifyEvent = this.mapToShopifyEvent(eventPayload);
      
      // Send to Shopify
      const response = await this.makeHTTPRequest(
        `https://${config.shopName}.myshopify.com/admin/api/2023-01/customers.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': config.accessToken
          },
          body: JSON.stringify({ customer: shopifyEvent })
        }
      );
      
      return {
        integrationId: config.integrationId,
        type: 'shopify',
        success: response.ok,
        response: await response.text(),
        eventId: eventPayload.eventId
      };
    } catch (error) {
      return {
        integrationId: config.integrationId,
        type: 'shopify',
        success: false,
        error: error.message,
        eventId: eventPayload.eventId
      };
    }
  }

  /**
   * Map event to Google Analytics format
   * @param {Object} eventPayload - Event payload
   * @returns {Object} GA4 event
   */
  mapToGoogleAnalyticsEvent(eventPayload) {
    const { eventType, data } = eventPayload;
    
    return {
      name: eventType,
      parameters: {
        custom_parameter_1: data.alertId || '',
        custom_parameter_2: data.userId || '',
        custom_parameter_3: data.type || '',
        custom_parameter_4: data.status || '',
        engagement_time_msec: 100
      }
    };
  }

  /**
   * Map event to Mixpanel format
   * @param {Object} eventPayload - Event payload
   * @returns {Object} Mixpanel event
   */
  mapToMixpanelEvent(eventPayload) {
    const { eventType, data } = eventPayload;
    
    return {
      event: eventType,
      properties: {
        distinct_id: data.userId || 'anonymous',
        token: '', // Will be set in headers
        alert_id: data.alertId || '',
        alert_type: data.type || '',
        status: data.status || '',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Map event to Segment format
   * @param {Object} eventPayload - Event payload
   * @returns {Object} Segment event
   */
  mapToSegmentEvent(eventPayload) {
    const { eventType, data } = eventPayload;
    
    return {
      userId: data.userId || 'anonymous',
      event: eventType,
      properties: {
        alert_id: data.alertId || '',
        alert_type: data.type || '',
        status: data.status || '',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Map event to Amplitude format
   * @param {Object} eventPayload - Event payload
   * @returns {Object} Amplitude event
   */
  mapToAmplitudeEvent(eventPayload) {
    const { eventType, data } = eventPayload;
    
    return {
      user_id: data.userId || 'anonymous',
      event_type: eventType,
      event_properties: {
        alert_id: data.alertId || '',
        alert_type: data.type || '',
        status: data.status || ''
      },
      time: Date.now()
    };
  }

  /**
   * Map event to Mailchimp format
   * @param {Object} eventPayload - Event payload
   * @returns {Object} Mailchimp event
   */
  mapToMailchimpEvent(eventPayload) {
    const { data } = eventPayload;
    
    return {
      email_address: data.email || '',
      status: 'subscribed',
      merge_fields: {
        FNAME: data.firstName || '',
        LNAME: data.lastName || '',
        ALERT_TYPE: data.type || '',
        ALERT_ID: data.alertId || ''
      },
      tags: [data.type || 'price_alert']
    };
  }

  /**
   * Map event to HubSpot format
   * @param {Object} eventPayload - Event payload
   * @returns {Object} HubSpot event
   */
  mapToHubspotEvent(eventPayload) {
    const { data } = eventPayload;
    
    return {
      properties: {
        email: data.email || '',
        firstname: data.firstName || '',
        lastname: data.lastName || '',
        alert_type: data.type || '',
        alert_id: data.alertId || '',
        lifecyclestage: 'lead'
      }
    };
  }

  /**
   * Map event to Salesforce format
   * @param {Object} eventPayload - Event payload
   * @returns {Object} Salesforce event
   */
  mapToSalesforceEvent(eventPayload) {
    const { data } = eventPayload;
    
    return {
      Email: data.email || '',
      FirstName: data.firstName || '',
      LastName: data.lastName || '',
      LeadSource: 'Price Alert System',
      Alert_Type__c: data.type || '',
      Alert_ID__c: data.alertId || ''
    };
  }

  /**
   * Map event to Shopify format
   * @param {Object} eventPayload - Event payload
   * @returns {Object} Shopify event
   */
  mapToShopifyEvent(eventPayload) {
    const { data } = eventPayload;
    
    return {
      first_name: data.firstName || '',
      last_name: data.lastName || '',
      email: data.email || '',
      tags: [data.type || 'price_alert'],
      metafields: [
        {
          namespace: 'price_alert',
          key: 'alert_id',
          value: data.alertId || '',
          type: 'single_line_text_field'
        }
      ]
    };
  }

  /**
   * Format message for Slack
   * @param {Object} eventPayload - Event payload
   * @returns {Object} Slack message
   */
  formatSlackMessage(eventPayload) {
    const { eventType, data } = eventPayload;
    
    return {
      text: `Price Alert Event: ${eventType}`,
      attachments: [
        {
          color: this.getEventColor(eventType),
          fields: [
            {
              title: 'Alert ID',
              value: data.alertId || 'N/A',
              short: true
            },
            {
              title: 'Alert Type',
              value: data.type || 'N/A',
              short: true
            },
            {
              title: 'Status',
              value: data.status || 'N/A',
              short: true
            },
            {
              title: 'User ID',
              value: data.userId || 'N/A',
              short: true
            }
          ],
          timestamp: Date.now() / 1000
        }
      ]
    };
  }

  /**
   * Format message for Discord
   * @param {Object} eventPayload - Event payload
   * @returns {Object} Discord message
   */
  formatDiscordMessage(eventPayload) {
    const { eventType, data } = eventPayload;
    
    return {
      embeds: [
        {
          title: `Price Alert Event: ${eventType}`,
          color: this.getDiscordEventColor(eventType),
          fields: [
            {
              name: 'Alert ID',
              value: data.alertId || 'N/A',
              inline: true
            },
            {
              name: 'Alert Type',
              value: data.type || 'N/A',
              inline: true
            },
            {
              name: 'Status',
              value: data.status || 'N/A',
              inline: true
            },
            {
              name: 'User ID',
              value: data.userId || 'N/A',
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    };
  }

  /**
   * Format message for Teams
   * @param {Object} eventPayload - Event payload
   * @returns {Object} Teams message
   */
  formatTeamsMessage(eventPayload) {
    const { eventType, data } = eventPayload;
    
    return {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": this.getTeamsEventColor(eventType),
      "summary": `Price Alert Event: ${eventType}`,
      "sections": [
        {
          "activityTitle": `Price Alert Event: ${eventType}`,
          "facts": [
            {
              "name": "Alert ID",
              "value": data.alertId || 'N/A'
            },
            {
              "name": "Alert Type",
              "value": data.type || 'N/A'
            },
            {
              "name": "Status",
              "value": data.status || 'N/A'
            },
            {
              "name": "User ID",
              "value": data.userId || 'N/A'
            }
          ],
          "markdown": true
        }
      ]
    };
  }

  /**
   * Get event color for Slack
   * @param {string} eventType - Event type
   * @returns {string} Color code
   */
  getEventColor(eventType) {
    const colors = {
      'alert_created': '#36a64f',
      'alert_triggered': '#ff9500',
      'alert_delivered': '#36a64f',
      'alert_engaged': '#007bff',
      'alert_converted': '#28a745',
      'alert_expired': '#dc3545',
      'alert_failed': '#dc3545'
    };
    
    return colors[eventType] || '#cccccc';
  }

  /**
   * Get event color for Discord
   * @param {string} eventType - Event type
   * @returns {number} Color code
   */
  getDiscordEventColor(eventType) {
    const colors = {
      'alert_created': 3581519,
      'alert_triggered': 16755968,
      'alert_delivered': 3581519,
      'alert_engaged': 2634384,
      'alert_converted': 41215,
      'alert_expired': 14177041,
      'alert_failed': 14177041
    };
    
    return colors[eventType] || 8421504;
  }

  /**
   * Get event color for Teams
   * @param {string} eventType - Event type
   * @returns {string} Color code
   */
  getTeamsEventColor(eventType) {
    const colors = {
      'alert_created': '00FF00',
      'alert_triggered': 'FF9500',
      'alert_delivered': '00FF00',
      'alert_engaged': '007bff',
      'alert_converted': '28a745',
      'alert_expired': 'dc3545',
      'alert_failed': 'dc3545'
    };
    
    return colors[eventType] || 'cccccc';
  }

  /**
   * Make HTTP request with retry logic
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @param {number} attempt - Current attempt
   * @returns {Promise} Response
   */
  async makeHTTPRequest(url, options = {}, attempt = 1) {
    try {
      const response = await fetch(url, {
        ...options,
        timeout: options.timeout || this.options.apiTimeout
      });
      
      return response;
    } catch (error) {
      if (attempt < this.options.apiRetryAttempts) {
        await new Promise(resolve => 
          setTimeout(resolve, this.options.apiRetryDelay * attempt)
        );
        return this.makeHTTPRequest(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Sign payload for webhooks
   * @param {Object} payload - Payload to sign
   * @returns {string} Signature
   */
  signPayload(payload) {
    const crypto = require('crypto');
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.options.webhookSigningSecret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Check rate limit
   * @param {string} integrationId - Integration ID
   * @returns {boolean} True if within rate limit
   */
  checkRateLimit(integrationId) {
    if (!this.options.enableRateLimiting) {
      return true;
    }
    
    const now = Date.now();
    const windowStart = now - this.options.rateLimitWindow;
    
    // Get or create rate limit entry
    if (!this.rateLimitMap.has(integrationId)) {
      this.rateLimitMap.set(integrationId, []);
    }
    
    const requests = this.rateLimitMap.get(integrationId);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.rateLimitMap.set(integrationId, validRequests);
    
    // Check if under limit
    if (validRequests.length < this.options.rateLimitMax) {
      validRequests.push(now);
      return true;
    }
    
    return false;
  }

  /**
   * Log integration execution
   * @param {string} eventId - Event ID
   * @param {string} integrationId - Integration ID
   * @param {Object} result - Execution result
   */
  async logIntegrationExecution(eventId, integrationId, result) {
    try {
      await createDoc("IntegrationExecution", {
        eventId,
        integrationId,
        type: result.type,
        success: result.success,
        error: result.error || null,
        response: result.response || null,
        executedAt: new Date()
      });
    } catch (error) {
      console.error('Error logging integration execution:', error);
    }
  }

  /**
   * Generate event ID
   * @returns {string} Event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Flush event queue
   */
  async flushEventQueue() {
    if (this.eventQueue.length === 0) {
      return;
    }
    
    const eventsToProcess = this.eventQueue.splice(0, this.options.eventBatchSize);
    
    for (const { event, integration, queuedAt, attempts } of eventsToProcess) {
      try {
        // Check if event is too old
        if (Date.now() - queuedAt > 300000) { // 5 minutes
          console.log(`Skipping old event ${event.eventId}`);
          continue;
        }
        
        // Execute integration
        await this.executeIntegration(event, integration);
      } catch (error) {
        console.error(`Error processing event ${event.eventId}:`, error);
        
        // Retry if under limit
        if (attempts < this.options.webhookRetryAttempts) {
          this.eventQueue.push({
            event,
            integration,
            queuedAt,
            attempts: attempts + 1
          });
        }
      }
    }
  }

  /**
   * Start background processes
   */
  startBackgroundProcesses() {
    // Flush event queue periodically
    if (this.options.enableEventStreaming) {
      setInterval(() => {
        this.flushEventQueue();
      }, this.options.eventFlushInterval);
    }
    
    // Clean up rate limit map periodically
    setInterval(() => {
      const now = Date.now();
      const windowStart = now - this.options.rateLimitWindow;
      
      for (const [integrationId, requests] of this.rateLimitMap.entries()) {
        const validRequests = requests.filter(timestamp => timestamp > windowStart);
        if (validRequests.length === 0) {
          this.rateLimitMap.delete(integrationId);
        } else {
          this.rateLimitMap.set(integrationId, validRequests);
        }
      }
    }, this.options.rateLimitWindow);
  }
}

// Singleton instance
let integrationHooksInstance = null;

/**
 * Get or create integration hooks instance
 * @param {Object} options - Configuration options
 * @returns {IntegrationHooks} Hooks instance
 */
export function getIntegrationHooks(options) {
  if (!integrationHooksInstance) {
    integrationHooksInstance = new IntegrationHooks(options);
  }
  return integrationHooksInstance;
}

/**
 * Trigger integration hook (convenience function)
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @param {Object} options - Hook options
 */
export async function triggerIntegrationHook(eventType, data, options) {
  const hooks = getIntegrationHooks();
  return await hooks.triggerHook(eventType, data, options);
}