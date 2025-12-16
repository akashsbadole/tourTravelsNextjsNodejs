# Offline Functionality Documentation

This document provides comprehensive information about the offline functionality implemented for the Golob Travel Agency application.

## Overview

The offline functionality provides a seamless experience for users when they have poor or no internet connectivity. It includes intelligent caching, background synchronization, storage management, and comprehensive error handling.

## Architecture

### Core Components

1. **Service Worker** (`public/sw.js`)
   - Handles offline caching strategies
   - Manages background sync
   - Implements cache-first, network-first, and stale-while-revalidate patterns

2. **IndexedDB Manager** (`lib/offline/indexedDB.js`)
   - Client-side storage for offline data
   - Manages search results, user preferences, analytics, and sync queue
   - Provides automatic cleanup and maintenance

3. **Cache Manager** (`lib/offline/cacheManager.js`)
   - Intelligent caching strategies for different data types
   - Handles cache invalidation and prefetching
   - Optimizes storage usage

4. **Offline Manager** (`lib/offline/offlineManager.js`)
   - Network connectivity detection
   - Request retry logic with exponential backoff
   - Adaptive timeouts based on network quality

5. **Background Sync Manager** (`lib/offline/backgroundSync.js`)
   - Queues actions for synchronization when online
   - Handles conflict resolution
   - Prioritizes critical data synchronization

6. **Storage Quota Manager** (`lib/offline/storageQuota.js`)
   - Monitors storage usage
   - Automatic cleanup when thresholds are reached
   - Provides optimization recommendations

7. **Error Handler** (`lib/offline/errorHandler.js`)
   - Comprehensive error analysis and categorization
   - Automatic recovery strategies
   - User-friendly error messages

8. **Performance Monitor** (`lib/offline/performanceMonitor.js`)
   - Tracks cache hit rates and response times
   - Monitors storage efficiency
   - Provides performance insights

## UI Components

### Offline Indicator
- **Location**: `components/offline/OfflineIndicator.js`
- **Purpose**: Shows current connection status and pending actions
- **Features**:
  - Real-time connection status
  - Network quality indicator
  - Sync queue status
  - Quick sync actions

### Offline Banner
- **Location**: `components/offline/OfflineBanner.js`
- **Purpose**: Prominent notification for connection issues
- **Features**:
  - Contextual messages based on connection type
  - Actionable suggestions for users
  - Dismissible with smart re-appearance logic

### Offline Provider
- **Location**: `components/offline/OfflineProvider.js`
- **Purpose**: Integrates all offline functionality into the app
- **Features**:
  - Storage warnings and cleanup dialogs
  - Offline-aware fetch wrapper
  - Context for offline status throughout the app

## React Hooks

### useOfflineManager
```javascript
import { useOfflineManager } from '@/lib/offline/offlineManager';

const {
  isOnline,
  connectionType,
  networkQuality,
  executeRequest,
  forceSync,
  retryQueueLength
} = useOfflineManager();
```

### useOfflineSearch
```javascript
import { useOfflineSearch } from '@/hooks/useOfflineSearch';

const {
  search,
  searchState,
  searchHistory,
  suggestions,
  getCachedResults,
  prefetchSearch
} = useOfflineSearch('flight'); // or 'hotel'
```

### useOffline
```javascript
import { useOffline } from '@/components/offline/OfflineProvider';

const {
  isOnline,
  connectionType,
  storageWarning,
  offlineFetch,
  handleStorageCleanup
} = useOffline();
```

### useErrorHandler
```javascript
import { useErrorHandler } from '@/lib/offline/errorHandler';

const {
  errors,
  errorStats,
  handleError,
  getStats
} = useErrorHandler();
```

### usePerformanceMonitor
```javascript
import { usePerformanceMonitor } from '@/lib/offline/performanceMonitor';

const {
  recordCacheHit,
  recordUserBehavior,
  getReport,
  metrics
} = usePerformanceMonitor();
```

### useOfflineTesting
```javascript
import { useOfflineTesting } from '@/lib/offline/offlineTesting';

const {
  testResults,
  isRunning,
  runFullTestSuite,
  runTestCategory
} = useOfflineTesting();
```

## Caching Strategies

### Cache-First
- **Use Case**: Static assets, user preferences
- **Behavior**: Serve from cache, update in background
- **TTL**: 7 days for static assets, 7 days for preferences

### Network-First
- **Use Case**: Critical data, real-time information
- **Behavior**: Try network first, fallback to cache
- **TTL**: 5 minutes for API responses

### Stale-While-Revalidate
- **Use Case**: Search results, dynamic content
- **Behavior**: Serve stale cache, update in background
- **TTL**: 10 minutes for search results

## Data Types and Configuration

### Flight Search Results
- **Cache Type**: `FLIGHT_SEARCH`
- **Strategy**: Stale-While-Revalidate
- **TTL**: 10 minutes
- **Max Entries**: 50

### Hotel Search Results
- **Cache Type**: `HOTEL_SEARCH`
- **Strategy**: Stale-While-Revalidate
- **TTL**: 10 minutes
- **Max Entries**: 50

### Flight Details
- **Cache Type**: `FLIGHT_DETAILS`
- **Strategy**: Cache-First
- **TTL**: 30 minutes
- **Max Entries**: 100

### Hotel Details
- **Cache Type**: `HOTEL_DETAILS`
- **Strategy**: Cache-First
- **TTL**: 30 minutes
- **Max Entries**: 100

### User Preferences
- **Cache Type**: `USER_PREFERENCES`
- **Strategy**: Cache-First
- **TTL**: 7 days
- **Max Entries**: 10

## Storage Management

### IndexedDB Structure
```
GolobTravelOffline (Version 1)
├── searchResults (Flight/Hotel search cache)
├── pendingSearches (Offline search queue)
├── flightData (Flight details cache)
├── hotelData (Hotel details cache)
├── userPreferences (User settings)
├── analyticsEvents (Analytics to sync)
├── syncQueue (Actions to sync)
└── cacheMetadata (Cache management info)
```

### Storage Thresholds
- **Warning**: 80% usage
- **Critical**: 95% usage
- **Emergency**: 98% usage

### Cleanup Strategies
- **Conservative**: Remove analytics, 30-day-old searches
- **Moderate**: Remove analytics, 7-day-old searches, expired cache
- **Aggressive**: Remove analytics, 24-hour-old searches, metadata, compress data

## Synchronization

### Sync Types
- **Search Results**: Priority HIGH
- **User Preferences**: Priority MEDIUM
- **Analytics**: Priority LOW
- **Bookings**: Priority CRITICAL
- **Reviews**: Priority MEDIUM

### Conflict Resolution
1. **Prefer Fresh Data**: Server data takes precedence
2. **Merge When Possible**: Combine cached and fresh data
3. **Keep Cache on Failure**: Use cached data if network fails
4. **Queue for Later**: Store conflicts for manual resolution

### Retry Logic
- **Exponential Backoff**: 2^n seconds delay
- **Max Retries**: 3 attempts by default
- **Jitter**: Random variation to prevent thundering herd

## Error Handling

### Error Types
- **Network**: Connection failures, timeouts
- **Offline**: No internet connectivity
- **Server**: 5xx errors
- **Validation**: 4xx errors
- **Quota**: Storage space exceeded
- **Permission**: Browser permission denied
- **Cache**: Cache operation failures
- **Sync**: Synchronization failures

### Recovery Strategies
- **Retry**: Automatic retry with backoff
- **Fallback**: Use cached or alternative data
- **Offline Mode**: Continue with limited functionality
- **User Action**: Require user intervention
- **Escalate**: Report to support team

## Performance Monitoring

### Metrics Tracked
- **Cache Hit Rate**: Percentage of requests served from cache
- **Response Time**: Network and cache response times
- **Offline Usage**: Time spent offline and actions taken
- **Storage Efficiency**: Usage vs. data freshness ratio
- **Sync Performance**: Success rate and processing speed
- **Network Quality**: Connection type and speed assessment
- **User Behavior**: Common actions and patterns

### Performance Thresholds
- **Cache Hit Rate**: Excellent >80%, Good >60%, Poor <40%
- **Response Time**: Excellent <500ms, Good <1s, Poor >2s
- **Storage Usage**: Optimal <50%, Warning >70%, Critical >85%

## Testing

### Test Categories
- **Cache Tests**: Storage, retrieval, expiration, stale-while-revalidate
- **Storage Tests**: IndexedDB operations, quota management, cleanup
- **Offline Detection**: Status monitoring, network quality, connectivity checks
- **Sync Tests**: Queue management, conflict resolution, priority handling
- **Error Handling**: Error analysis, retry logic, recovery strategies
- **Performance Tests**: Hit rate tracking, response time monitoring, efficiency metrics

### Running Tests
```javascript
import { useOfflineTesting } from '@/lib/offline/offlineTesting';

const { runFullTestSuite, runTestCategory, testResults } = useOfflineTesting();

// Run all tests
const summary = await runFullTestSuite();

// Run specific category
const cacheTests = await runTestCategory('cache');
```

## Best Practices

### For Developers
1. **Use Offline-Aware Fetch**: Always use `offlineFetch` from the context
2. **Handle Offline States**: Check `isOnline` before making requests
3. **Cache Appropriately**: Use correct cache types and TTLs
4. **Handle Conflicts**: Implement proper conflict resolution
5. **Monitor Performance**: Track cache hit rates and response times

### For Users
1. **Check Connection**: Monitor offline indicator for status
2. **Clear Storage**: Use cleanup options when warned about storage
3. **Sync Manually**: Force sync when connection is restored
4. **Report Issues**: Use error reporting for persistent problems

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_ENABLE_SW=true          # Enable service worker
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   # Push notification key
```

### Service Worker Configuration
- **Cache Names**: Versioned for easy invalidation
- **Strategies**: Configurable per resource type
- **Cleanup**: Automatic old cache removal

### Cache Configuration
- **TTLs**: Configurable per data type
- **Max Entries**: Prevents storage bloat
- **Priorities**: Critical data gets priority

## Troubleshooting

### Common Issues
1. **Service Worker Not Registering**
   - Check HTTPS requirement
   - Verify service worker scope
   - Clear browser cache

2. **IndexedDB Quota Exceeded**
   - Run storage cleanup
   - Check for data leaks
   - Implement data compression

3. **Sync Not Working**
   - Verify network connectivity
   - Check sync queue status
   - Review error logs

4. **Poor Cache Performance**
   - Review cache strategies
   - Check TTL configurations
   - Monitor hit rates

### Debug Tools
```javascript
// Enable debug logging
localStorage.setItem('offline-debug', 'true');

// Get cache statistics
const stats = await cacheManager.getCacheStats();

// Get sync status
const syncStatus = backgroundSyncManager.getSyncStatus();

// Run performance report
const report = await performanceMonitor.getPerformanceReport();
```

## Future Enhancements

### Planned Features
1. **Predictive Caching**: AI-powered prefetching based on user behavior
2. **Delta Sync**: Only sync changed data to reduce bandwidth
3. **Compression**: Advanced data compression for storage efficiency
4. **Offline Analytics**: Enhanced offline usage tracking
5. **Collaborative Caching**: Share cache data across devices

### Performance Optimizations
1. **Web Workers**: Move heavy processing to background threads
2. **Streaming**: Implement streaming for large datasets
3. **Lazy Loading**: Load data on-demand when offline
4. **Index Optimization**: Improve IndexedDB query performance

## Security Considerations

### Data Protection
1. **Encryption**: Sensitive data encrypted in storage
2. **Sanitization**: Input validation and XSS prevention
3. **Access Control**: Proper permissions for storage access
4. **Data Retention**: Automatic cleanup of old data

### Privacy
1. **User Consent**: Clear opt-in for data collection
2. **Data Minimization**: Store only necessary data
3. **Transparency**: Clear documentation of data usage
4. **Right to Delete**: Easy data removal options

## Support

### Getting Help
- **Documentation**: This file and inline code comments
- **Error Logs**: Browser console and error tracking
- **Performance Reports**: Built-in performance monitoring
- **Test Suite**: Comprehensive testing tools

### Contributing
1. **Code Style**: Follow existing patterns
2. **Testing**: Add tests for new features
3. **Documentation**: Update this file
4. **Performance**: Monitor impact of changes