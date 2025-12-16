import "server-only";
import Stripe from "stripe";
import { PaymentProvider } from "./base.js";

export class StripeProvider extends PaymentProvider {
  constructor(config) {
    super(config);
    this.stripe = null;
  }

  async initialize(config) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey);
    return this;
  }

  getProviderType() {
    return "stripe";
  }

  async createPaymentIntent(paymentData) {
    const {
      amount,
      currency = "usd",
      customerId,
      paymentMethodId,
      metadata = {},
      receiptEmail,
      idempotencyKey,
    } = paymentData;

    try {
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          payment_method: paymentMethodId || undefined,
          customer: customerId,
          automatic_payment_methods: {
            enabled: true,
          },
          receipt_email: receiptEmail,
          metadata: {
            provider: "stripe",
            ...metadata,
          },
        },
        idempotencyKey ? { idempotencyKey } : {},
      );

      return {
        success: true,
        data: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          metadata: paymentIntent.metadata,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      };
    }
  }

  async confirmPayment(paymentIntentId, confirmationData) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmationData
      );

      return {
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      };
    }
  }

  async createCustomer(customerData) {
    const { name, email, phone, metadata = {} } = customerData;

    try {
      const customer = await this.stripe.customers.create({
        name,
        email,
        phone,
        metadata: {
          provider: "stripe",
          ...metadata,
        },
      });

      return {
        success: true,
        data: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          metadata: customer.metadata,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      };
    }
  }

  async getCustomer(customerId) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      
      return {
        success: true,
        data: customer,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      };
    }
  }

  async createSetupIntent(customerId) {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "on_session",
        metadata: {
          provider: "stripe",
        },
      });

      return {
        success: true,
        data: {
          id: setupIntent.id,
          clientSecret: setupIntent.client_secret,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      };
    }
  }

  async processRefund(refundData) {
    const { paymentIntentId, amount, reason, metadata = {} } = refundData;

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
        reason: reason || "requested_by_customer",
        metadata: {
          provider: "stripe",
          ...metadata,
        },
      });

      return {
        success: true,
        data: {
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      };
    }
  }

  async getRefundStatus(refundId) {
    try {
      const refund = await this.stripe.refunds.retrieve(refundId);

      return {
        success: true,
        data: {
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
          currency: refund.currency,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      };
    }
  }

  async handleWebhook(event, signature) {
    try {
      const webhookEvent = this.stripe.webhooks.constructEvent(
        event,
        signature,
        this.config.webhookSecret
      );

      return {
        success: true,
        data: {
          type: webhookEvent.type,
          data: webhookEvent.data.object,
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
        type: "card",
        name: "Credit/Debit Card",
        supported: true,
        icon: "credit-card",
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
    try {
      this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  extractPaymentData(paymentResponse) {
    const charge = paymentResponse;
    
    return {
      provider: "stripe",
      providerTransactionId: charge.balance_transaction,
      providerPaymentIntentId: charge.payment_intent,
      providerChargeId: charge.id,
      paymentMethod: {
        id: charge.payment_method,
        type: charge.payment_method_details?.type,
        brand: charge.payment_method_details?.[charge.payment_method_details?.type]?.brand,
        last4: charge.payment_method_details?.[charge.payment_method_details?.type]?.last4,
      },
      amount: Number(charge.amount) / 100, // Convert from cents
      currency: charge.currency.toUpperCase(),
      paymentDate: new Date(charge.created * 1000),
      receiptUrl: charge.receipt_url,
      metadata: charge.metadata,
      status: charge.status,
    };
  }

  extractRefundData(refundResponse) {
    return {
      provider: "stripe",
      providerRefundId: refundResponse.id,
      amount: Number(refundResponse.amount) / 100, // Convert from cents
      currency: refundResponse.currency.toUpperCase(),
      status: refundResponse.status,
      reason: refundResponse.reason,
      refundDate: new Date(refundResponse.created * 1000),
      metadata: refundResponse.metadata,
    };
  }

  getClientConfig() {
    return {
      publishableKey: this.config.publishableKey,
      name: "Stripe",
      type: "stripe",
    };
  }

  async isAvailable() {
    try {
      // Test the connection by retrieving account info
      await this.stripe.accounts.retrieve();
      return true;
    } catch (error) {
      console.error("Stripe provider not available:", error.message);
      return false;
    }
  }

  /**
   * Create a unique customer or return existing one
   * @param {Object} customerData - Customer data
   * @param {Array} matcherKeys - Fields to match for uniqueness
   * @returns {Promise<Object>} Customer details
   */
  async createUniqueCustomer(customerData, matcherKeys = ["email"]) {
    try {
      const query = matcherKeys
        .map((key) => `${key}:"${customerData[key]}"`)
        .join(" AND ");
      
      const existingCustomers = await this.stripe.customers.search({ query });
      
      if (existingCustomers?.data?.length > 0) {
        return {
          success: true,
          data: existingCustomers.data[0],
          existing: true,
        };
      }

      return await this.createCustomer(customerData);
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      };
    }
  }

  /**
   * Delete a customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCustomer(customerId) {
    try {
      const result = await this.stripe.customers.del(customerId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      };
    }
  }

  /**
   * Get list of refunds for a charge
   * @param {string} chargeId - Charge ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Refunds list
   */
  async getRefundList(chargeId, options = {}) {
    try {
      const refunds = await this.stripe.refunds.list({
        charge: chargeId,
        limit: 10,
        ...options,
      });

      return {
        success: true,
        data: refunds.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      };
    }
  }
}