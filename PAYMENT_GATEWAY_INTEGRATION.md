# Payment Gateway Integration Documentation

## Overview

This document describes the integration of Razorpay and PayPal payment gateways into the travel agency application, creating a multi-provider payment system that maintains backward compatibility with the existing Stripe implementation.

## Architecture

### Payment Provider Abstraction Layer

The system uses a provider-based architecture with the following components:

- **Base Payment Provider** (`lib/payment/providers/base.js`): Abstract interface defining standard payment operations
- **Provider Implementations**: 
  - Stripe Provider (`lib/payment/providers/stripe.js`)
  - Razorpay Provider (`lib/payment/providers/razorpay.js`)
  - PayPal Provider (`lib/payment/providers/paypal.js`)
- **Payment Factory** (`lib/payment/factory.js`): Manages provider instances and selection
- **Configuration Manager** (`lib/payment/config.js`): Handles environment-based configuration

### Key Features

1. **Multi-Provider Support**: Seamlessly switch between Stripe, Razorpay, and PayPal
2. **Currency-Based Selection**: Automatically selects optimal provider based on currency
3. **Payment Method Support**: Supports various payment methods (cards, UPI, NetBanking, wallets, etc.)
4. **Backward Compatibility**: Existing Stripe functionality remains unchanged
5. **Unified Webhooks**: Single endpoint handles all provider webhooks
6. **Comprehensive Logging**: Structured logging with sensitive data masking

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Payment Configuration
DEFAULT_PAYMENT_PROVIDER=stripe
DEFAULT_CURRENCY=USD
SUPPORTED_CURRENCIES=USD,INR,EUR,GBP
ENABLE_SAVED_PAYMENT_METHODS=true
ENABLE_REFUNDS=true
ENABLE_WEBHOOKS=true
ENABLE_MULTI_CURRENCY=true
PAYMENT_LOGGING_ENABLED=true
PAYMENT_LOG_LEVEL=info
SENSITIVE_DATA_MASKING=true
WEBHOOK_TIMEOUT=30000
MAX_PAYMENT_RETRIES=3
IDEMPOTENCY_WINDOW=3600
NEXT_PUBLIC_COMPANY_LOGO=https://your-domain.com/logo.png

# Stripe (existing)
NEXT_PUBLIC_STRIPE_PK=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay (new)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# PayPal (new)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_WEBHOOK_SECRET=...
```

## Database Schema Updates

### Flight Payment Schema

```javascript
// lib/db/schema/flightPayment.js
{
  provider: { type: String, enum: ["stripe", "razorpay", "paypal"] },
  providerTransactionId: String,
  providerPaymentIntentId: String,
  providerChargeId: String,
  providerOrderId: String, // For Razorpay
  // Legacy fields maintained for backward compatibility
  stripe_paymentIntentId: String,
  stripe_chargeId: String,
  paymentMethod: {
    // Enhanced to support all provider methods
    type: String,
    methodType: String,
    brand: String,
    last4: String,
    wallet: String,    // Razorpay
    vpa: String,      // Razorpay UPI
    bank: String,     // Razorpay NetBanking
    email: String,    // PayPal
  },
  currency: String,
  status: { type: String, enum: ["pending", "processing", "succeeded", "failed", "refunded"] },
  metadata: Mixed
}
```

### Hotel Payment Schema

Similar updates to `lib/db/schema/hotelPayment.js` with the same multi-provider fields.

### User Schema Updates

```javascript
// lib/db/schema/user.js
{
  // Legacy field maintained
  customerId: String,
  
  // New multi-provider customer IDs
  providerCustomerIds: {
    stripe: String,
    razorpay: String,
    paypal: String,
  }
}
```

## API Endpoints

### New Unified Endpoints

1. **Payment Intent Creation**:
   - Flight: `/api/payments/flight/create-payment-intent`
   - Hotel: `/api/payments/hotel/create-payment-intent`

2. **Setup Intent**: `/api/payments/setup-intent`

3. **Configuration**: `/api/payments/config`

4. **Unified Webhook**: `/api/payments/webhook`

### Legacy Endpoints

Existing Stripe endpoints remain functional:
- `/api/stripe/create_flight_booking_payment_intent`
- `/api/stripe/create_hotel_booking_payment_intent`
- `/api/stripe/setup_intent`
- `/api/stripe/webhook`

## Frontend Components

### Payment Components

1. **UnifiedPayment** (`components/payment/UnifiedPayment.js`):
   - Main payment component handling all providers
   - Automatic provider selection based on currency
   - Provider-specific UI rendering

2. **PaymentProviderSelector** (`components/payment/PaymentProviderSelector.js`):
   - Provider selection interface
   - Payment method display per provider
   - Currency-based recommendations

3. **Provider-Specific Components**:
   - **RazorpayPayment** (`components/payment/RazorpayPayment.js`)
   - **PayPalPayment** (`components/payment/PayPalPayment.js`)

### Updated Booking Pages

- **Flight Booking Payment**: Updated to use UnifiedPayment component
- **Hotel Booking Payment**: Updated to use UnifiedPayment component

## Provider-Specific Features

### Stripe
- Credit/Debit Cards
- Apple Pay
- Google Pay
- Saved payment methods
- Setup intents

### Razorpay
- Credit/Debit Cards
- UPI (Unified Payments Interface)
- NetBanking (50+ banks)
- Wallets (Paytm, PhonePe, etc.)
- EMI options
- Order-based flow (instead of payment intents)

### PayPal
- PayPal Account balance
- Credit/Debit Cards
- Venmo
- Apple Pay
- Google Pay
- Smart Payment Buttons

## Currency Support

| Currency | Recommended Provider | Reason |
|----------|-------------------|--------|
| INR      | Razorpay          | Best Indian payment method support |
| USD, EUR, GBP | Stripe             | Global card and wallet support |
| Any       | PayPal             | Universal acceptance |

## Webhook Handling

### Unified Webhook Endpoint

**URL**: `/api/payments/webhook?provider={provider}`

**Headers**:
- Stripe: `stripe-signature`
- Razorpay: `x-razorpay-signature`
- PayPal: `paypal-auth-algo` + `paypal-transmission-id`

### Event Processing

1. **Payment Success**:
   - Stripe: `charge.updated`
   - Razorpay: `payment.captured`
   - PayPal: `PAYMENT.CAPTURE.COMPLETED`

2. **Refund**:
   - Stripe: `charge.refund.updated`
   - Razorpay: `refund.processed`
   - PayPal: `PAYMENT.REFUND.COMPLETED`

## Error Handling and Logging

### Payment Logger (`lib/payment/logger.js`)

Features:
- Structured logging with levels (DEBUG, INFO, WARN, ERROR)
- Sensitive data masking
- Environment-based configuration
- Provider-specific operation tracking

### Error Types

1. **Configuration Errors**: Missing or invalid provider settings
2. **Connection Errors**: Provider API unavailability
3. **Validation Errors**: Invalid payment data
4. **Processing Errors**: Payment failures from providers
5. **System Errors**: Internal application errors

## Testing

### Test Mode Configuration

All providers support test mode:
- **Stripe**: Uses test keys and test cards
- **Razorpay**: Uses test keys and test environment
- **PayPal**: Uses sandbox environment

### Test Cards

**Stripe Test Cards**:
- Card Number: 4242424242424242
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Razorpay Test**:
- Use provided test credentials
- Test with small amounts (₹1)

**PayPal Sandbox**:
- Uses sandbox environment
- Test with PayPal sandbox accounts

## Security Considerations

1. **API Key Security**:
   - Never expose secret keys in frontend
   - Use environment variables
   - Rotate keys regularly

2. **Webhook Security**:
   - Verify webhook signatures
   - Use HTTPS endpoints
   - Validate event authenticity

3. **Data Protection**:
   - Mask sensitive data in logs
   - Use HTTPS for all API calls
   - Validate input data

4. **PCI Compliance**:
   - Never store raw card data
   - Use provider tokenization
   - Follow provider security guidelines

## Migration Guide

### For Existing Stripe Implementation

1. **No Breaking Changes**: Existing Stripe functionality works unchanged
2. **Gradual Migration**: Can migrate to unified endpoints gradually
3. **Backward Compatibility**: Legacy Stripe endpoints remain functional

### Database Migration

Run migration scripts to update existing records:

```javascript
// Update existing payment records with provider field
db.flightPayments.updateMany(
  { provider: { $exists: false } },
  { $set: { provider: "stripe" } }
);

db.hotelPayments.updateMany(
  { provider: { $exists: false } },
  { $set: { provider: "stripe" } }
);
```

## Monitoring and Maintenance

### Key Metrics

1. **Payment Success Rate**: By provider and currency
2. **Error Rates**: By error type and provider
3. **Response Times**: API performance monitoring
4. **Webhook Processing**: Success/failure rates

### Maintenance Tasks

1. **Monitor Provider Status**: Check API availability
2. **Review Error Logs**: Identify patterns and issues
3. **Update Configuration**: Adjust based on performance
4. **Security Audits**: Regular security reviews

## Troubleshooting

### Common Issues

1. **Provider Selection**: Wrong provider for currency
2. **Configuration**: Missing environment variables
3. **Webhook Failures**: Signature verification issues
4. **Payment Failures**: Insufficient funds, declined cards

### Debug Mode

Enable debug logging:
```bash
PAYMENT_LOG_LEVEL=debug
```

Check logs for:
- Provider initialization
- Payment intent creation
- Webhook processing
- Error details

## Support

### Provider Documentation

- **Stripe**: https://stripe.com/docs
- **Razorpay**: https://razorpay.com/docs
- **PayPal**: https://developer.paypal.com/docs

### Internal Support

For implementation-specific issues:
1. Check payment logs
2. Verify configuration
3. Test with provider's test tools
4. Review webhook processing

## Future Enhancements

1. **Additional Providers**: Easy to add new providers
2. **Advanced Routing**: More sophisticated provider selection
3. **Analytics**: Payment analytics and insights
4. **Subscriptions**: Recurring payment support
5. **Multi-Currency**: Real-time currency conversion