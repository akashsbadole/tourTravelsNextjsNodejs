import "server-only";
import Razorpay from "razorpay";
import crypto from "crypto";
import { PaymentProvider } from "./base.js";

export class RazorpayProvider extends PaymentProvider {
  constructor(config) {
    super(config);
    this.razorpay = null;
  }

  async initialize(config) {
    this.config = config;
    this.razorpay = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
    return this;
  }

  getProviderType() {
    return "razorpay";
  }

  async createPaymentIntent(paymentData) {
    const {
      amount,
      currency = "INR",
      customerId,
      paymentMethodId,
      metadata = {},
      receiptEmail,
      idempotencyKey,
      bookingId,
    } = paymentData;

    try {
      // Razorpay uses Orders instead of Payment Intents
      const orderData = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency.toUpperCase(),
        receipt: bookingId || `receipt_${Date.now()}`,
        notes: {
          provider: "razorpay",
          customerId,
          receiptEmail,
          ...metadata,
        },
      };

      // Add payment method capture if specified
      if (paymentMethodId) {
        orderData.payment = {
          capture: "automatic",
          capture_options: {
            maximum_amount: Math.round(amount * 100),
            refund_amount: 0,
          },
        };
      }

      const order = await this.razorpay.orders.create(orderData);

      return {
        success: true,
        data: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          receipt: order.receipt,
          notes: order.notes,
          // For frontend
          keyId: this.config.keyId,
          orderId: order.id,
          amountInPaise: order.amount,
          currency: order.currency,
          name: metadata.companyName || "Travel Agency",
          description: metadata.description || "Booking Payment",
          image: metadata.companyLogo || "",
          prefill: {
            name: metadata.customerName || "",
            email: receiptEmail || "",
            contact: metadata.customerPhone || "",
          },
          theme: {
            color: metadata.themeColor || "#3399cc",
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.error?.description || error.message,
          type: error.error?.code || "razorpay_error",
          code: error.error?.code || "razorpay_error",
        },
      };
    }
  }

  async confirmPayment(paymentIntentId, confirmationData) {
    // Razorpay handles payment confirmation on frontend via webhook
    // This method is used to verify payment after webhook
    try {
      const payment = await this.razorpay.payments.fetch(paymentIntentId);
      
      return {
        success: true,
        data: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          email: payment.email,
          contact: payment.contact,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.error?.description || error.message,
          type: error.error?.code || "razorpay_error",
          code: error.error?.code || "razorpay_error",
        },
      };
    }
  }

  async createCustomer(customerData) {
    // Razorpay doesn't have a separate customer concept like Stripe
    // Customer information is stored in payment/order notes
    return {
      success: true,
      data: {
        id: `customer_${Date.now()}`,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        metadata: {
          provider: "razorpay",
          ...customerData.metadata,
        },
      },
    };
  }

  async getCustomer(customerId) {
    // Razorpay doesn't have customer retrieval
    return {
      success: true,
      data: {
        id: customerId,
        provider: "razorpay",
      },
    };
  }

  async createSetupIntent(customerId) {
    // Razorpay doesn't have setup intents like Stripe
    // Saved cards are handled differently
    return {
      success: true,
      data: {
        id: `setup_${Date.now()}`,
        customerId,
        message: "Razorpay handles saved cards through customer authentication",
      },
    };
  }

  async processRefund(refundData) {
    const { paymentId, amount, reason, metadata = {} } = refundData;

    try {
      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to paise
        notes: {
          provider: "razorpay",
          reason: reason || "Requested by customer",
          ...metadata,
        },
      });

      return {
        success: true,
        data: {
          id: refund.id,
          paymentId: refund.payment_id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          createdAt: refund.created_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.error?.description || error.message,
          type: error.error?.code || "razorpay_error",
          code: error.error?.code || "razorpay_error",
        },
      };
    }
  }

  async getRefundStatus(refundId) {
    try {
      const refund = await this.razorpay.refunds.fetch(refundId);

      return {
        success: true,
        data: {
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
          currency: refund.currency,
          createdAt: refund.created_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.error?.description || error.message,
          type: error.error?.code || "razorpay_error",
          code: error.error?.code || "razorpay_error",
        },
      };
    }
  }

  async handleWebhook(event, signature) {
    try {
      const webhookSecret = this.config.webhookSecret;
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(event)
        .digest("hex");

      if (expectedSignature !== signature) {
        throw new Error("Invalid webhook signature");
      }

      const webhookEvent = JSON.parse(event);

      return {
        success: true,
        data: {
          type: webhookEvent.event,
          data: webhookEvent.payload,
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
        type: "upi",
        name: "UPI",
        supported: true,
        icon: "smartphone",
      },
      {
        type: "netbanking",
        name: "Net Banking",
        supported: true,
        icon: "bank",
      },
      {
        type: "wallet",
        name: "Wallet",
        supported: true,
        icon: "wallet",
      },
      {
        type: "emi",
        name: "EMI",
        supported: true,
        icon: "calendar",
      },
    ];
  }

  validateWebhookSignature(payload, signature) {
    try {
      const webhookSecret = this.config.webhookSecret;
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

      return expectedSignature === signature;
    } catch (error) {
      return false;
    }
  }

  extractPaymentData(paymentResponse) {
    const payment = paymentResponse;
    
    return {
      provider: "razorpay",
      providerTransactionId: payment.acquirer_data?.bank_transaction_id || payment.id,
      providerPaymentIntentId: payment.order_id,
      providerChargeId: payment.id,
      paymentMethod: {
        id: payment.id,
        type: payment.method,
        brand: payment.card?.network || payment.method,
        last4: payment.card?.last4 || "",
        wallet: payment.wallet,
        vpa: payment.vpa,
        bank: payment.bank,
      },
      amount: Number(payment.amount) / 100, // Convert from paise
      currency: payment.currency.toUpperCase(),
      paymentDate: new Date(payment.created_at * 1000),
      receiptUrl: null, // Razorpay doesn't provide receipt URLs
      metadata: payment.notes || {},
      status: payment.status === "captured" ? "succeeded" : payment.status,
    };
  }

  extractRefundData(refundResponse) {
    return {
      provider: "razorpay",
      providerRefundId: refundResponse.id,
      amount: Number(refundResponse.amount) / 100, // Convert from paise
      currency: refundResponse.currency.toUpperCase(),
      status: refundResponse.status,
      reason: refundResponse.notes?.reason || "Requested by customer",
      refundDate: new Date(refundResponse.created_at * 1000),
      metadata: refundResponse.notes || {},
    };
  }

  getClientConfig() {
    return {
      keyId: this.config.keyId,
      name: "Razorpay",
      type: "razorpay",
      currency: "INR",
      image: this.config.companyLogo || "",
      prefill: {
        name: "",
        email: "",
        contact: "",
      },
      theme: {
        color: "#3399cc",
      },
      modal: {
        backdropclose: false,
        escape: false,
        handleback: true,
        confirmclose: false,
        animation: "slideFromBottom",
      },
    };
  }

  async isAvailable() {
    try {
      // Test connection by fetching payment methods
      await this.razorpay.payments.all({ count: 1 });
      return true;
    } catch (error) {
      console.error("Razorpay provider not available:", error.message);
      return false;
    }
  }

  /**
   * Create a unique customer (Razorpay doesn't have customer concept)
   * @param {Object} customerData - Customer data
   * @param {Array} matcherKeys - Fields to match for uniqueness
   * @returns {Promise<Object>} Customer details
   */
  async createUniqueCustomer(customerData, matcherKeys = ["email"]) {
    // Razorpay doesn't have customer concept, so just return customer data
    return await this.createCustomer(customerData);
  }

  /**
   * Delete a customer (Razorpay doesn't have customer concept)
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCustomer(customerId) {
    // Razorpay doesn't have customer concept
    return {
      success: true,
      data: {
        message: "Razorpay doesn't support customer deletion",
      },
    };
  }

  /**
   * Get list of refunds for a payment
   * @param {string} paymentId - Payment ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Refunds list
   */
  async getRefundList(paymentId, options = {}) {
    try {
      const refunds = await this.razorpay.payments.refundAll(paymentId, {
        count: 10,
        ...options,
      });

      return {
        success: true,
        data: refunds.items || [],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.error?.description || error.message,
          type: error.error?.code || "razorpay_error",
          code: error.error?.code || "razorpay_error",
        },
      };
    }
  }

  /**
   * Fetch payment details
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getPayment(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);

      return {
        success: true,
        data: payment,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.error?.description || error.message,
          type: error.error?.code || "razorpay_error",
          code: error.error?.code || "razorpay_error",
        },
      };
    }
  }

  /**
   * Fetch order details
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrder(orderId) {
    try {
      const order = await this.razorpay.orders.fetch(orderId);

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.error?.description || error.message,
          type: error.error?.code || "razorpay_error",
          code: error.error?.code || "razorpay_error",
        },
      };
    }
  }

  /**
   * Get all payments for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Payments list
   */
  async getOrderPayments(orderId) {
    try {
      const payments = await this.razorpay.orders.fetchPayments(orderId);

      return {
        success: true,
        data: payments.items || [],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.error?.description || error.message,
          type: error.error?.code || "razorpay_error",
          code: error.error?.code || "razorpay_error",
        },
      };
    }
  }
}