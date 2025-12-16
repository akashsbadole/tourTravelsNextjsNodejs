# Airline Partnership Integration System Documentation

## Overview

This document provides a comprehensive overview of the airline partnership integration system implemented for the travel agency application. The system provides a unified framework for managing partnerships with various types of airlines including major GDS systems, direct airline APIs, low-cost carriers, and regional airlines.

## System Architecture

### Core Components

1. **Database Schemas**
   - `AirlinePartnership` - Core partnership agreement data
   - `PartnershipTier` - Partnership tier definitions and benefits
   - `EnhancedFlightData` - Extended flight data with partnership information

2. **Provider Framework**
   - `AirlineProviderBase` - Base class for all airline providers
   - `AirlinePartnershipManager` - Unified manager for all providers
   - Provider-specific implementations for different airline types

3. **Services**
   - `AirlinePartnershipService` - Core business logic
   - `AirlinePartnershipAnalytics` - Analytics and reporting

4. **API Endpoints**
   - Partnership management endpoints
   - Analytics and reporting endpoints
   - Admin management endpoints

## Provider Types

### 1. GDS Providers

#### Amadeus Provider
- **File**: `lib/integrations/airline-providers/amadeus-provider.js`
- **Features**: Full GDS integration with partnership benefits
- **Authentication**: OAuth2
- **Special Features**: Exclusive fares, net fares, seat maps

#### Sabre Provider
- **File**: `lib/integrations/airline-providers/sabre-provider.js`
- **Features**: GDS integration with partnership-specific functionality
- **Authentication**: OAuth2
- **Special Features**: Fare class availability, ancillary services

#### Travelport Provider
- **File**: `lib/integrations/airline-providers/travelport-provider.js`
- **Features**: Multi-GDS support (Apollo, Galileo, Worldspan)
- **Authentication**: API Key
- **Special Features**: Loyalty integration, dynamic pricing

### 2. Direct Airline Providers

#### Direct Airline Provider
- **File**: `lib/integrations/airline-providers/direct-airline-provider.js`
- **Features**: Direct API integration with individual airlines
- **Authentication**: OAuth2 or API Key
- **Special Features**: Airline-specific benefits, direct inventory

### 3. Low-Cost Carrier Providers

#### Low-Cost Carrier Provider
- **File**: `lib/integrations/airline-providers/lowcost-provider.js`
- **Features**: Specialized for low-cost business models
- **Authentication**: API Key
- **Special Features**: Unbundled pricing, fare families, dynamic pricing

### 4. Regional Airline Providers

#### Regional Airline Provider
- **File**: `lib/integrations/airline-providers/regional-provider.js`
- **Features**: Specialized for regional airline operations
- **Authentication**: API Key
- **Special Features**: Community routes, government contracts, seasonal routes

## Partnership Tiers

### Bronze Tier
- **Commission**: 3-5%
- **Benefits**: Basic access, standard support
- **Features**: Standard fare classes, basic ancillary services

### Silver Tier
- **Commission**: 5-7%
- **Benefits**: Enhanced access, priority support
- **Features**: Preferred fares, enhanced ancillary services

### Gold Tier
- **Commission**: 7-10%
- **Benefits**: Premium access, dedicated support
- **Features**: Exclusive fares, priority booking, enhanced seat selection

### Platinum Tier
- **Commission**: 10-12%
- **Benefits**: Elite access, 24/7 support
- **Features**: Net fares, exclusive inventory, advanced ancillary services

### Diamond Tier
- **Commission**: 12-15%
- **Benefits**: Ultimate access, dedicated account manager
- **Features**: Custom pricing, exclusive promotions, full integration

## API Endpoints

### Partnership Management

#### GET /api/airline-partnerships
- **Description**: List all partnerships
- **Parameters**: page, limit, status, tier, partnershipType
- **Response**: Partnership list with metadata

#### POST /api/airline-partnerships
- **Description**: Create new partnership
- **Body**: Partnership data
- **Response**: Created partnership

#### GET /api/airline-partnerships/[partnershipId]
- **Description**: Get specific partnership
- **Parameters**: partnershipId
- **Response**: Partnership details

#### PUT /api/airline-partnerships/[partnershipId]
- **Description**: Update partnership
- **Parameters**: partnershipId
- **Body**: Updated partnership data
- **Response**: Updated partnership

### Analytics and Reporting

#### GET /api/airline-partnerships/analytics
- **Description**: Get partnership analytics
- **Parameters**: partnershipId, type, period, includeComparisons
- **Types**: performance, conversion, revenue, roi, dashboard
- **Response**: Analytics data

#### GET /api/airline-partnerships/analytics/compare
- **Description**: Compare multiple partnerships
- **Parameters**: partnershipIds, period, metrics, benchmarkType
- **Response**: Comparative analytics

### Admin Management

#### GET /api/admin/airline-partnerships
- **Description**: Admin partnership management
- **Parameters**: page, limit, status, tier, includeAnalytics
- **Response**: Partnership list with admin data

#### POST /api/admin/airline-partnerships
- **Description**: Create partnership with admin validation
- **Body**: Partnership data
- **Response**: Created partnership

### Onboarding Workflow

#### GET /api/admin/airline-partnerships/onboarding
- **Description**: Get onboarding processes
- **Parameters**: onboardingId, partnershipId, status
- **Response**: Onboarding data

#### POST /api/admin/airline-partnerships/onboarding
- **Description**: Initiate onboarding process
- **Body**: Partnership ID and onboarding options
- **Response**: Created onboarding process

#### PUT /api/admin/airline-partnerships/onboarding
- **Description**: Update onboarding progress
- **Parameters**: onboardingId
- **Body**: Action and data
- **Response**: Updated onboarding

### Contract Management

#### GET /api/admin/airline-partnerships/contracts
- **Description**: List contracts
- **Parameters**: partnershipId, status, type, includeVersions
- **Response**: Contract list

#### POST /api/admin/airline-partnerships/contracts
- **Description**: Create contract
- **Body**: Contract data
- **Response**: Created contract

#### PUT /api/admin/airline-partnerships/contracts
- **Description**: Update contract
- **Parameters**: contractId
- **Body**: Action and data
- **Response**: Updated contract

### Communication System

#### GET /api/admin/airline-partnerships/communications
- **Description**: List communications
- **Parameters**: partnershipId, type, status, includeThreads
- **Response**: Communication list

#### POST /api/admin/airline-partnerships/communications
- **Description**: Create communication
- **Body**: Communication data
- **Response**: Created communication

#### PUT /api/admin/airline-partnerships/communications
- **Description**: Update communication
- **Parameters**: communicationId
- **Body**: Action and data
- **Response**: Updated communication

### Content Management

#### GET /api/admin/airline-partnerships/content
- **Description**: List content
- **Parameters**: partnershipId, type, status, category
- **Response**: Content list

#### POST /api/admin/airline-partnerships/content
- **Description**: Create content
- **Body**: Content data
- **Response**: Created content

#### PUT /api/admin/airline-partnerships/content
- **Description**: Update content
- **Parameters**: contentId
- **Body**: Action and data
- **Response**: Updated content

## Database Schema

### AirlinePartnership Schema

```javascript
{
  partnershipId: String,
  airlineCode: String,
  airlineName: String,
  tier: String, // bronze, silver, gold, platinum, diamond
  partnershipType: String, // gds, direct, lowcost, regional, charter
  status: String, // active, inactive, pending, suspended
  contract: {
    startDate: Date,
    endDate: Date,
    renewalTerms: Object,
    terms: Object
  },
  financial: {
    commissionRate: Number,
    revenueSharing: Object,
    paymentTerms: String
  },
  apiIntegration: {
    baseUrl: String,
    authType: String, // oauth2, apikey
    apiKey: String,
    oauthConfig: Object
  },
  benefits: {
    exclusiveFares: Boolean,
    netFares: Boolean,
    priorityBooking: Boolean,
    seatSelection: Boolean,
    ancillaryServices: Boolean,
    loyaltyIntegration: Boolean
  },
  coverage: {
    regions: [String],
    routes: [String],
    markets: [String]
  },
  performance: {
    bookingVolume: Number,
    revenue: Number,
    conversionRate: Number,
    customerSatisfaction: Number
  },
  compliance: {
    certifications: [String],
    auditResults: [Object],
    lastAudit: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### PartnershipTier Schema

```javascript
{
  tierId: String,
  name: String,
  level: Number, // 1-5
  description: String,
  requirements: {
    minRevenue: Number,
    minBookings: Number,
    certification: [String]
  },
  commission: {
    baseRate: Number,
    bonusStructure: Object,
    incentives: Object
  },
  financial: {
    paymentTerms: String,
    billingCycle: String,
    discounts: Object
  },
  booking: {
    priorityLevel: Number,
    advanceBooking: Number,
    cancellationPolicy: String
  },
  ancillary: {
    commissionRates: Object,
    exclusiveServices: [String],
    discountRates: Object
  },
  loyalty: {
    integrationLevel: String,
    benefits: [String],
    earningRates: Object
  },
  marketing: {
    coBranding: Boolean,
    promotionalSupport: Boolean,
    marketingMaterials: [String]
  },
  support: {
    responseTime: Number,
    dedicatedSupport: Boolean,
    accountManager: Boolean
  }
}
```

### EnhancedFlightData Schema

```javascript
{
  flightId: String,
  baseFlightData: Object, // Original flight data
  partnershipData: {
    partnershipId: String,
    airlineCode: String,
    tier: String,
    benefits: [String]
  },
  pricing: {
    basePrice: Number,
    partnershipPrice: Number,
    discount: Number,
    commission: Number,
    netFare: Number
  },
  availability: {
    fareClasses: [Object],
    seatMap: Object,
    ancillaryServices: [Object]
  },
  loyalty: {
    eligible: Boolean,
    earningRate: Number,
    tierBonus: Number
  },
  realTime: {
    inventoryStatus: String,
    lastUpdated: Date,
    nextUpdate: Date
  },
  metadata: {
    provider: String,
    source: String,
    confidence: Number
  }
}
```

## Integration Examples

### Initializing the Partnership Manager

```javascript
import { getAirlinePartnershipManager } from './lib/integrations/airline-providers/airline-partnership-manager';

const config = {
  amadeus: {
    enabled: true,
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
    environment: 'production'
  },
  sabre: {
    enabled: true,
    partnerships: [
      {
        partnershipId: 'sabre_aa',
        airlineCode: 'AA',
        tier: 'gold',
        clientId: process.env.SABRE_AA_CLIENT_ID,
        clientSecret: process.env.SABRE_AA_CLIENT_SECRET
      }
    ]
  },
  directAirlines: {
    enabled: true,
    airlines: [
      {
        airlineCode: 'DL',
        partnershipId: 'direct_dl',
        tier: 'platinum',
        baseUrl: 'https://api.delta.com',
        authType: 'oauth2',
        oauthConfig: {
          clientId: process.env.DELTA_CLIENT_ID,
          clientSecret: process.env.DELTA_CLIENT_SECRET
        }
      }
    ]
  },
  lowCostCarriers: {
    enabled: true,
    carriers: [
      {
        airlineCode: 'RY',
        partnershipId: 'lowcost_ryanair',
        tier: 'silver',
        baseUrl: 'https://api.ryanair.com',
        authType: 'apikey',
        apiKey: process.env.RYANAIR_API_KEY
      }
    ]
  },
  regionalAirlines: {
    enabled: true,
    airlines: [
      {
        airlineCode: 'RZ',
        partnershipId: 'regional_republic',
        tier: 'gold',
        baseUrl: 'https://api.republicairlines.com',
        authType: 'apikey',
        apiKey: process.env.REPUBLIC_API_KEY,
        regionalHub: 'ORD',
        serviceArea: ['midwest', 'central'],
        communityRoutes: [
          { route: 'ORD-DTW', subsidy: 50 },
          { route: 'ORD-MSP', subsidy: 45 }
        ]
      }
    ]
  }
};

const partnershipManager = getAirlinePartnershipManager(config);
```

### Searching Flights with Partnership Benefits

```javascript
const searchParams = {
  origin: 'JFK',
  destination: 'LAX',
  departureDate: '2024-06-15',
  returnDate: '2024-06-22',
  passengers: {
    adults: 2,
    children: 1
  },
  cabinClass: 'economy'
};

const options = {
  usePartnershipBenefits: true,
  includeGDS: true,
  includeDirect: true,
  includeLowCost: true,
  includeRegional: true,
  prioritizePartnership: true,
  partnershipIds: ['sabre_aa', 'direct_dl', 'lowcost_ryanair'],
  timeout: 30000
};

const results = await partnershipManager.searchFlights(searchParams, options);

if (results.success) {
  console.log(`Found ${results.data.length} flights`);
  results.data.forEach(flight => {
    console.log(`Flight ${flight.flightNumber} - $${flight.pricing.total}`);
    console.log(`Partnership: ${flight.partnershipId} (${flight.partnershipTier})`);
  });
}
```

### Getting Partnership Analytics

```javascript
import { getAirlinePartnershipAnalytics } from './lib/services/airlinePartnershipAnalytics';

const analyticsService = getAirlinePartnershipAnalytics();

const performanceData = await analyticsService.getPartnershipPerformance('sabre_aa', {
  period: 'monthly',
  includeComparisons: true,
  metrics: ['all']
});

console.log('Performance Data:', performanceData);

const conversionData = await analyticsService.getBookingConversionAnalytics('sabre_aa', {
  period: 'monthly',
  segmentBy: ['route', 'cabin_class']
});

console.log('Conversion Data:', conversionData);
```

### Managing Partnerships

```javascript
import { getAirlinePartnershipService } from './lib/services/airlinePartnershipService';

const partnershipService = getAirlinePartnershipService();

// Create new partnership
const newPartnership = await partnershipService.createPartnership({
  airlineCode: 'UA',
  airlineName: 'United Airlines',
  tier: 'platinum',
  partnershipType: 'direct',
  contract: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31')
  },
  financial: {
    commissionRate: 0.12,
    paymentTerms: 'net30'
  },
  apiIntegration: {
    baseUrl: 'https://api.united.com',
    authType: 'oauth2'
  }
});

// Update partnership
const updatedPartnership = await partnershipService.updatePartnership('ua_direct', {
  tier: 'diamond',
  'financial.commissionRate': 0.15
});

// Get partnership metrics
const metrics = await partnershipService.getPartnershipMetrics('ua_direct');
console.log('Partnership Metrics:', metrics);
```

## Configuration

### Environment Variables

```bash
# GDS Providers
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
SABRE_AA_CLIENT_ID=your_sabre_aa_client_id
SABRE_AA_CLIENT_SECRET=your_sabre_aa_client_secret
TRAVELPORT_CLIENT_ID=your_travelport_client_id
TRAVELPORT_CLIENT_SECRET=your_travelport_client_secret

# Direct Airlines
DELTA_CLIENT_ID=your_delta_client_id
DELTA_CLIENT_SECRET=your_delta_client_secret
UNITED_CLIENT_ID=your_united_client_id
UNITED_CLIENT_SECRET=your_united_client_secret

# Low-Cost Carriers
RYANAIR_API_KEY=your_ryanair_api_key
EASYJET_API_KEY=your_easyjet_api_key
SOUTHWEST_API_KEY=your_southwest_api_key

# Regional Airlines
REPUBLIC_API_KEY=your_republic_api_key
SKYWEST_API_KEY=your_skywest_api_key
ENVOY_API_KEY=your_envoy_api_key
```

## Best Practices

### 1. Error Handling
- Always check the `success` property of API responses
- Implement proper fallback mechanisms
- Log errors with sufficient context
- Use timeouts for all API calls

### 2. Performance Optimization
- Use caching for frequently accessed data
- Implement rate limiting for API calls
- Batch requests when possible
- Monitor and optimize slow queries

### 3. Security
- Store API credentials securely
- Use HTTPS for all API communications
- Implement proper authentication and authorization
- Validate and sanitize all inputs

### 4. Monitoring
- Track API response times
- Monitor error rates
- Set up alerts for critical failures
- Regular performance reviews

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check API credentials
   - Verify OAuth token expiration
   - Ensure proper scope permissions

2. **Rate Limiting**
   - Implement exponential backoff
   - Monitor usage quotas
   - Use caching to reduce API calls

3. **Data Inconsistencies**
   - Verify data mapping
   - Check for timezone issues
   - Validate currency conversions

4. **Performance Issues**
   - Optimize database queries
   - Implement proper indexing
   - Use connection pooling

### Debug Mode

Enable debug mode by setting the environment variable:

```bash
DEBUG=airline-partnerships:* npm run dev
```

This will provide detailed logging for all partnership operations.

## Future Enhancements

1. **Advanced Analytics**
   - Machine learning for demand forecasting
   - Predictive analytics for partnership optimization
   - Real-time performance dashboards

2. **Enhanced Integrations**
   - Additional GDS providers
   - More airline direct integrations
   - NDC (New Distribution Capability) support

3. **Automation**
   - Automated contract renewals
   - Dynamic commission optimization
   - Intelligent provider routing

4. **Mobile Support**
   - Native mobile SDKs
   - Offline capabilities
   - Push notifications

## Support

For technical support or questions about the airline partnership integration system:

1. Check the documentation for common solutions
2. Review the error logs for detailed information
3. Contact the development team with specific issues
4. Submit bug reports through the issue tracker

## License

This airline partnership integration system is proprietary software owned by the travel agency. All rights reserved.