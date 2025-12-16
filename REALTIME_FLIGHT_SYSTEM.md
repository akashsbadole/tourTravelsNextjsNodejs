# Real-time Flight Availability System

This document describes the comprehensive real-time flight availability system implemented for the travel agency application.

## Overview

The real-time flight availability system provides:
- Integration with external flight APIs (Amadeus, Sabre, etc.)
- Fallback to existing static/mock data when external APIs are unavailable
- Intelligent caching layer with Redis
- Real-time availability checking with seat counts
- Dynamic pricing from multiple sources
- Fare class availability and pricing
- Performance optimizations and error handling
- Background data synchronization

## Architecture

### 1. Flight Data Integration Layer

#### Provider Abstraction (`lib/integrations/flight-providers/`)

**Base Provider** (`base-provider.js`)
- Abstract base class defining interface for all flight providers
- Standardized methods: `searchFlights()`, `checkAvailability()`, `getPricing()`, `getFareClassAvailability()`
- Error handling and rate limiting
- Data transformation utilities

**Amadeus Provider** (`amadeus-provider.js`)
- Full integration with Amadeus Self-Service API
- OAuth2 authentication with token management
- Flight search, availability, and pricing
- Seat map and fare class support
- Automatic rate limiting and timeout handling

**Static Provider** (`static-provider.js`)
- Fallback provider using existing database
- Maintains backward compatibility
- Uses existing flight service and models
- Availability and pricing calculations

**Provider Manager** (`provider-manager.js`)
- Manages multiple providers with fallback logic
- Health checking and load balancing
- Automatic failover between providers
- Performance monitoring and metrics

### 2. Caching Layer (`lib/cache/`)

**Redis Client** (`redis-client.js`)
- Connection management with retry logic
- Health monitoring and statistics
- Automatic reconnection handling
- Configuration flexibility

**Flight Cache Manager** (`flight-cache.js`)
- Multi-level caching with different TTLs
- Stale-while-revalidate pattern
- Cache invalidation strategies
- Performance metrics and statistics

### 3. Database Schema Updates

**Real-time Flight Data** (`lib/db/schema/realtimeFlightData.js`)
- Stores real-time flight information from external providers
- Availability tracking by cabin class
- Pricing history and timestamps
- Provider-specific data storage
- Automatic TTL-based cleanup

### 4. API Endpoints (`app/api/flights/realtime/`)

**Search Endpoint** (`search/route.js`)
- Real-time flight search with caching
- Support for complex search parameters
- Fallback to static data when providers fail
- Performance metrics and error handling

**Availability Endpoint** (`availability/route.js`)
- Real-time seat availability checking
- Batch availability requests
- Integration with pricing data
- Cache-first approach with API fallback

**Pricing Endpoint** (`pricing/route.js`)
- Dynamic pricing from multiple sources
- Passenger count and cabin class support
- Currency conversion and fee calculation
- Historical pricing data

**Health Endpoint** (`health/route.js`)
- System health monitoring
- Provider status checking
- Cache performance metrics
- Database connectivity testing

### 5. Frontend Components (`components/pages/flights.search/ui/`)

**Real-time Flight Card** (`RealtimeFlightResultCard.js`)
- Live availability indicators
- Real-time pricing display
- Manual refresh functionality
- Loading states and error handling
- Time-since-update indicators

### 6. Error Handling (`lib/integrations/error-handling/`)

**Flight Error Handler** (`flight-error-handler.js`)
- Centralized error handling with retry logic
- User-friendly error messages
- Error categorization and logging
- Fallback strategies for different error types

### 7. Performance Optimization (`lib/performance/`)

**Flight Performance Optimizer** (`flight-performance.js`)
- Request batching and concurrency control
- Data deduplication and compression
- Intelligent caching strategies
- Result sorting and filtering

### 8. Background Jobs (`lib/jobs/`)

**Flight Data Sync Job** (`flight-data-sync.js`)
- Automated data synchronization
- Cache invalidation and cleanup
- Performance monitoring
- Configurable sync intervals

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_ENABLED=true

# Flight Provider Configuration
FLIGHT_PROVIDER_PRIMARY=amadeus
FLIGHT_PROVIDER_FALLBACK=static
FLIGHT_CACHE_ENABLED=true
FLIGHT_CACHE_TTL_SEARCH=600
FLIGHT_CACHE_TTL_AVAILABILITY=60
FLIGHT_CACHE_TTL_PRICING=180

# Amadeus Configuration
AMADEUS_ENABLED=false
AMADEUS_API_KEY=
AMADEUS_API_SECRET=
AMADEUS_BASE_URL=https://test.api.amadeus.com/v1
AMADEUS_RATE_LIMIT=100
```

## Usage

### Basic Flight Search

```javascript
import { useRealtimeFlightSearch } from '@/hooks/useRealtimeFlightSearch';

function FlightSearchComponent() {
  const { searchFlights, searchState, refreshAllFlights } = useRealtimeFlightSearch();

  const handleSearch = async (searchParams) => {
    await searchFlights(searchParams, {
      useCache: true,
      timeout: 30000
    });
  };

  return (
    // Your JSX with real-time data
  );
}
```

### Real-time Availability Check

```javascript
const { checkAvailability } = useRealtimeFlightSearch();

const handleAvailabilityCheck = async (flightIds) => {
  const result = await checkAvailability(flightIds, {
    includePricing: true,
    passengerCounts: { adults: 2, children: 1, infants: 0 },
    cabinClass: 'economy'
  });
  
  // Handle result
};
```

### Background Sync Job

```javascript
import { getFlightDataSyncJob } from '@/lib/jobs/flight-data-sync';

const syncJob = getFlightDataSyncJob({
  syncInterval: 5 * 60 * 1000, // 5 minutes
  batchSize: 100,
  enableBackgroundSync: true
});

// Start the sync job
await syncJob.start();
```

## Features

### 1. Real-time Data
- Live flight availability from multiple providers
- Dynamic pricing with fare class support
- Seat availability by cabin class
- Flight status updates (delayed, cancelled, etc.)

### 2. Caching Strategy
- Multi-level caching with different TTLs
- Stale-while-revalidate for fresh data
- Intelligent cache invalidation
- Background cache warming

### 3. Error Handling
- Automatic retry with exponential backoff
- Graceful fallback to static data
- User-friendly error messages
- Comprehensive error logging

### 4. Performance Optimization
- Request batching and concurrency control
- Data deduplication and compression
- Result sorting and filtering
- Memory-efficient caching

### 5. Monitoring
- Health check endpoints
- Performance metrics collection
- Error rate monitoring
- Cache hit/miss statistics

## Integration Points

### 1. Existing Flight System
- Seamless integration with current flight booking flow
- Backward compatibility maintained
- Gradual migration path available

### 2. Database Integration
- New real-time data schema
- Existing models enhanced
- Migration scripts provided

### 3. Frontend Integration
- Drop-in replacement for existing components
- Progressive enhancement possible
- Loading states and error boundaries

## Deployment

### 1. Environment Setup
1. Configure Redis server
2. Set up Amadeus API credentials
3. Update environment variables
4. Run database migrations

### 2. Service Configuration
1. Enable Redis caching
2. Configure primary flight provider
3. Set appropriate TTL values
4. Configure sync intervals

### 3. Monitoring Setup
1. Set up health check monitoring
2. Configure error alerting
3. Monitor cache performance
4. Track API usage metrics

## Testing

### 1. Unit Tests
- Provider implementations
- Cache functionality
- Error handling logic
- Performance optimizations

### 2. Integration Tests
- API endpoint responses
- Provider fallback scenarios
- Cache invalidation
- Background job execution

### 3. Load Testing
- Concurrent request handling
- Cache performance under load
- Provider rate limiting
- Error handling under stress

## Maintenance

### 1. Cache Management
- Monitor cache hit rates
- Clean up expired entries
- Optimize cache sizes
- Monitor Redis memory usage

### 2. Provider Health
- Regular health checks
- Monitor API response times
- Track error rates
- Update provider configurations

### 3. Performance Monitoring
- Monitor search response times
- Track cache performance
- Monitor database query performance
- Analyze user experience metrics

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis server status
   - Verify connection parameters
   - Check network connectivity

2. **Amadeus API Errors**
   - Verify API credentials
   - Check rate limits
   - Monitor API status

3. **Cache Not Updating**
   - Check cache TTL settings
   - Verify cache invalidation
   - Monitor sync job status

4. **Performance Issues**
   - Check batch sizes
   - Monitor concurrent requests
   - Analyze query performance

### Debug Tools

1. **Health Check Endpoint**: `/api/flights/realtime/health`
2. **Cache Statistics**: Available through health endpoint
3. **Error Logs**: Comprehensive error tracking
4. **Performance Metrics**: Built-in performance monitoring

## Future Enhancements

### 1. Additional Providers
- Sabre integration
- Travelport integration
- Custom provider support

### 2. Advanced Features
- Price prediction
- Demand-based pricing
- Route optimization

### 3. Analytics
- Search pattern analysis
- Provider performance comparison
- User behavior insights

## Security Considerations

### 1. API Security
- Credential management
- Rate limiting
- Request validation
- Error information sanitization

### 2. Data Security
- Sensitive data encryption
- Cache data protection
- Access logging
- Data retention policies

## Support

For issues and questions:
1. Check the health endpoint for system status
2. Review error logs for specific issues
3. Monitor performance metrics for optimization opportunities
4. Consult this documentation for configuration options

---

This real-time flight availability system provides a robust, scalable solution for integrating live flight data while maintaining backward compatibility and providing excellent performance through intelligent caching and error handling strategies.