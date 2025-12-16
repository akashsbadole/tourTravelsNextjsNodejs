import "server-only";

/**
 * Base Payment Provider Interface
 * All payment providers must implement this interface
 */
export class PaymentProvider {
  constructor(config) {
    this.config = config;
    this.name = this.constructor.name;
  }

  /**
   * Initialize the payment provider with configuration
   * @param {Object} config - Provider configuration
   */
  async initialize(config) {
    throw new Error("initialize() method must be implemented by payment provider");
  }

  /**
   * Create a payment intent for a booking
   * @param {Object} paymentData - Payment data including amount, currency, metadata
   * @returns {Promise<Object>} Payment intent details
   */
  async createPaymentIntent(paymentData) {
    throw new Error("createPaymentIntent() method must be implemented by payment provider");
  }

  /**
   * Confirm a payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {Object} confirmationData - Additional confirmation data
   * @returns {Promise<Object>} Payment confirmation result
   */
  async confirmPayment(paymentIntentId, confirmationData) {
    throw new Error("confirmPayment() method must be implemented by payment provider");
  }

  /**
   * Create a customer
   * @param {Object} customerData - Customer information
   * @returns {Promise<Object>} Customer details
   */
  async createCustomer(customerData) {
    throw new Error("createCustomer() method must be implemented by payment provider");
  }

  /**
   * Get customer by ID
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Customer details
   */
  async getCustomer(customerId) {
    throw new Error("getCustomer() method must be implemented by payment provider");
  }

  /**
   * Create a setup intent for saving payment methods
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Setup intent details
   */
  async createSetupIntent(customerId) {
    throw new Error("createSetupIntent() method must be implemented by payment provider");
  }

  /**
   * Process a refund
   * @param {Object} refundData - Refund data including payment intent ID, amount, reason
   * @returns {Promise<Object>} Refund details
   */
  async processRefund(refundData) {
    throw new Error("processRefund() method must be implemented by payment provider");
  }

  /**
   * Get refund status
   * @param {string} refundId - Refund ID
   * @returns {Promise<Object>} Refund status
   */
  async getRefundStatus(refundId) {
    throw new Error("getRefundStatus() method must be implemented by payment provider");
  }

  /**
   * Handle webhook events
   * @param {Object} event - Webhook event data
   * @param {string} signature - Webhook signature for verification
   * @returns {Promise<Object>} Processed webhook result
   */
  async handleWebhook(event, signature) {
    throw new Error("handleWebhook() method must be implemented by payment provider");
  }

  /**
   * Get supported payment methods
   * @returns {Promise<Array>} List of supported payment methods
   */
  async getSupportedPaymentMethods() {
    throw new Error("getSupportedPaymentMethods() method must be implemented by payment provider");
  }

  /**
   * Validate webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Whether signature is valid
   */
  validateWebhookSignature(payload, signature) {
    throw new Error("validateWebhookSignature() method must be implemented by payment provider");
  }

  /**
   * Get provider-specific payment data for storage
   * @param {Object} paymentResponse - Payment response from provider
   * @returns {Object} Standardized payment data for database storage
   */
  extractPaymentData(paymentResponse) {
    throw new Error("extractPaymentData() method must be implemented by payment provider");
  }

  /**
   * Get provider-specific refund data for storage
   * @param {Object} refundResponse - Refund response from provider
   * @returns {Object} Standardized refund data for database storage
   */
  extractRefundData(refundResponse) {
    throw new Error("extractRefundData() method must be implemented by payment provider");
  }

  /**
   * Get client configuration for frontend
   * @returns {Object} Client configuration
   */
  getClientConfig() {
    throw new Error("getClientConfig() method must be implemented by payment provider");
  }

  /**
   * Check if provider is available and properly configured
   * @returns {Promise<boolean>} Whether provider is available
   */
  async isAvailable() {
    throw new Error("isAvailable() method must be implemented by payment provider");
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getProviderName() {
    return this.name;
  }

  /**
   * Get provider type (stripe, razorpay, paypal)
   * @returns {string} Provider type
   */
  getProviderType() {
    throw new Error("getProviderType() method must be implemented by payment provider");
  }
}