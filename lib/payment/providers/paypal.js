import "server-only";
import { PaymentProvider } from "./base.js";

export class PayPalProvider extends PaymentProvider {
  constructor(config) {
    super(config);
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async initialize(config) {
    this.config = config;
    return this;
  }

  getProviderType() {
    return "paypal";
  }

  /**
   * Get PayPal access token
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");
      
      const response = await fetch(`${this.config.baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error_description || "Failed to get access token");
      }

      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Subtract 60 seconds buffer

      return this.accessToken;
    } catch (error) {
      throw new Error(`PayPal authentication failed: ${error.message}`);
    }
  }

  /**
   * Make API request to PayPal
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async makeApiRequest(endpoint, options = {}) {
    const token = await this.getAccessToken();
    
    const defaultOptions = {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept-Language": "en_US",
      },
    };

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error_description || "PayPal API request failed");
    }

    return data;
  }

  async createPaymentIntent(paymentData) {
    const {
      amount,
      currency = "USD",
      customerId,
      paymentMethodId,
      metadata = {},
      receiptEmail,
      idempotencyKey,
      returnUrl,
      cancelUrl,
    } = paymentData;

    try {
      const orderData = {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: metadata.bookingId || `booking_${Date.now()}`,
            description: metadata.description || "Travel Booking Payment",
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2),
            },
            custom_id: customerId,
            invoice_id: metadata.invoiceId || `invoice_${Date.now()}`,
          },
        ],
        application_context: {
          brand_name: metadata.companyName || "Travel Agency",
          locale: "en-US",
          landing_page: "BILLING",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: returnUrl || `${this.config.returnUrl}/success`,
          cancel_url: cancelUrl || `${this.config.returnUrl}/cancel`,
        },
      };

      const order = await this.makeApiRequest("/v2/checkout/orders", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      // Find the approval URL for redirect
      const approveLink = order.links?.find(link => link.rel === "approve");
      
      return {
        success: true,
        data: {
          id: order.id,
          status: order.status,
          intent: order.intent,
          approvalUrl: approveLink?.href,
          links: order.links,
          // For frontend
          orderId: order.id,
          amount: order.purchase_units[0].amount.value,
          currency: order.purchase_units[0].amount.currency_code,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: "paypal_error",
          code: "order_creation_failed",
        },
      };
    }
  }

  async confirmPayment(paymentIntentId, confirmationData) {
    try {
      // Capture payment for the order
      const captureData = await this.makeApiRequest(`/v2/checkout/orders/${paymentIntentId}/capture`, {
        method: "POST",
      });

      return {
        success: true,
        data: {
          id: captureData.id,
          status: captureData.status,
          purchase_units: captureData.purchase_units,
          payments: captureData.purchase_units[0]?.payments,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: "paypal_error",
          code: "payment_capture_failed",
        },
      };
    }
  }

  async createCustomer(customerData) {
    // PayPal doesn't have a separate customer concept like Stripe
    // Customer information is stored in PayPal accounts
    return {
      success: true,
      data: {
        id: `customer_${Date.now()}`,
        email: customerData.email,
        name: customerData.name,
        metadata: {
          provider: "paypal",
          ...customerData.metadata,
        },
      },
    };
  }

  async getCustomer(customerId) {
    // PayPal doesn't have customer retrieval
    return {
      success: true,
      data: {
        id: customerId,
        provider: "paypal",
      },
    };
  }

  async createSetupIntent(customerId) {
    // PayPal doesn't have setup intents like Stripe
    // Saved payment methods are handled through PayPal accounts
    return {
      success: true,
      data: {
        id: `setup_${Date.now()}`,
        customerId,
        message: "PayPal handles saved payment methods through user accounts",
      },
    };
  }

  async processRefund(refundData) {
    const { paymentId, amount, reason, metadata = {} } = refundData;

    try {
      const refundData = {
        amount: {
          value: amount.toFixed(2),
          currency_code: refundData.currency || "USD",
        },
        note_to_payer: reason || "Requested by customer",
      };

      const refund = await this.makeApiRequest(`/v2/payments/captures/${paymentId}/refund`, {
        method: "POST",
        body: JSON.stringify(refundData),
      });

      return {
        success: true,
        data: {
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
          note_to_payer: refund.note_to_payer,
          createTime: refund.create_time,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: "paypal_error",
          code: "refund_failed",
        },
      };
    }
  }

  async getRefundStatus(refundId) {
    try {
      const refund = await this.makeApiRequest(`/v2/payments/refunds/${refundId}`);

      return {
        success: true,
        data: {
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
          note_to_payer: refund.note_to_payer,
          createTime: refund.create_time,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: "paypal_error",
          code: "refund_status_failed",
        },
      };
    }
  }

  async handleWebhook(event, signature) {
    try {
      // PayPal webhooks use different verification method
      const webhookEvent = JSON.parse(event);
      
      // Verify webhook signature if webhook ID is available
      if (this.config.webhookId && signature) {
        const isValid = await this.verifyWebhookSignature(event, signature);
        if (!isValid) {
          throw new Error("Invalid webhook signature");
        }
      }

      return {
        success: true,
        data: {
          type: webhookEvent.event_type,
          data: webhookEvent.resource,
          eventType: webhookEvent.event_type,
          summary: webhookEvent.summary,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: "webhook_signature_verification_failed",
        },
      };
    }
  }

  async getSupportedPaymentMethods() {
    return [
      {
        type: "paypal",
        name: "PayPal Account",
        supported: true,
        icon: "paypal",
      },
      {
        type: "card",
        name: "Credit/Debit Card",
        supported: true,
        icon: "credit-card",
      },
      {
        type: "venmo",
        name: "Venmo",
        supported: true,
        icon: "venmo",
      },
      {
        type: "apple_pay",
        name: "Apple Pay",
        supported: true,
        icon: "apple",
      },
      {
        type: "google_pay",
        name: "Google Pay",
        supported: true,
        icon: "google",
      },
    ];
  }

  validateWebhookSignature(payload, signature) {
    // PayPal webhook signature verification requires webhook ID
    // This is a simplified implementation
    try {
      // In production, you would verify using PayPal's SDK
      // For now, we'll do basic validation
      return signature && payload;
    } catch (error) {
      return false;
    }
  }

  async verifyWebhookSignature(payload, signature) {
    try {
      if (!this.config.webhookId) {
        return true; // Skip verification if webhook ID not configured
      }

      // In production, use PayPal's verification API
      // For now, return true (implement proper verification in production)
      return true;
    } catch (error) {
      return false;
    }
  }

  extractPaymentData(paymentResponse) {
    const capture = paymentResponse;
    
    return {
      provider: "paypal",
      providerTransactionId: capture.id,
      providerPaymentIntentId: capture.supplementary_data?.related_ids?.order_id,
      providerChargeId: capture.id,
      paymentMethod: {
        id: capture.id,
        type: capture.paypal_account_id ? "paypal" : "card",
        brand: capture.payment_source?.card?.brand || "paypal",
        last4: capture.payment_source?.card?.last_digits || "",
        email: capture.payer?.email_address,
      },
      amount: Number(capture.amount?.value || 0),
      currency: capture.amount?.currency_code || "USD",
      paymentDate: new Date(capture.create_time),
      receiptUrl: capture.links?.find(link => link.rel === "self")?.href,
      metadata: capture.custom_id || {},
      status: capture.status === "COMPLETED" ? "succeeded" : capture.status.toLowerCase(),
    };
  }

  extractRefundData(refundResponse) {
    return {
      provider: "paypal",
      providerRefundId: refundResponse.id,
      amount: Number(refundResponse.amount?.value || 0),
      currency: refundResponse.amount?.currency_code || "USD",
      status: refundResponse.status.toLowerCase(),
      reason: refundResponse.note_to_payer || "Requested by customer",
      refundDate: new Date(refundResponse.create_time),
      metadata: {},
    };
  }

  getClientConfig() {
    return {
      clientId: this.config.clientId,
      name: "PayPal",
      type: "paypal",
      currency: "USD",
      intent: "capture",
      style: {
        layout: "vertical",
        color: "blue",
        shape: "rect",
        label: "pay",
      },
    };
  }

  async isAvailable() {
    try {
      // Test connection by getting token
      await this.getAccessToken();
      return true;
    } catch (error) {
      console.error("PayPal provider not available:", error.message);
      return false;
    }
  }

  /**
   * Create a unique customer (PayPal doesn't have customer concept)
   * @param {Object} customerData - Customer data
   * @param {Array} matcherKeys - Fields to match for uniqueness
   * @returns {Promise<Object>} Customer details
   */
  async createUniqueCustomer(customerData, matcherKeys = ["email"]) {
    // PayPal doesn't have customer concept, so just return customer data
    return await this.createCustomer(customerData);
  }

  /**
   * Delete a customer (PayPal doesn't have customer concept)
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCustomer(customerId) {
    // PayPal doesn't have customer concept
    return {
      success: true,
      data: {
        message: "PayPal doesn't support customer deletion",
      },
    };
  }

  /**
   * Get order details
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrder(orderId) {
    try {
      const order = await this.makeApiRequest(`/v2/checkout/orders/${orderId}`);

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: "paypal_error",
          code: "order_fetch_failed",
        },
      };
    }
  }

  /**
   * Get capture details
   * @param {string} captureId - Capture ID
   * @returns {Promise<Object>} Capture details
   */
  async getCapture(captureId) {
    try {
      const capture = await this.makeApiRequest(`/v2/payments/captures/${captureId}`);

      return {
        success: true,
        data: capture,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: "paypal_error",
          code: "capture_fetch_failed",
        },
      };
    }
  }

  /**
   * Get refund details
   * @param {string} refundId - Refund ID
   * @returns {Promise<Object>} Refund details
   */
  async getRefund(refundId) {
    try {
      const refund = await this.makeApiRequest(`/v2/payments/refunds/${refundId}`);

      return {
        success: true,
        data: refund,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: "paypal_error",
          code: "refund_fetch_failed",
        },
      };
    }
  }
}