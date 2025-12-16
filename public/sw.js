/**
 * Service Worker for Golob Travel Agency
 * Handles offline functionality, caching, and background sync
 */

const CACHE_NAME = 'golob-travel-v1';
const STATIC_CACHE_NAME = 'golob-travel-static-v1';
const DYNAMIC_CACHE_NAME = 'golob-travel-dynamic-v1';
const SEARCH_CACHE_NAME = 'golob-travel-search-v1';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Cache configuration
const CACHE_CONFIG = {
  static: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 100
  },
  api: {
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50
  },
  search: {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    maxAge: 10 * 60 * 1000, // 10 minutes
    maxEntries: 30
  },
  images: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 200
  }
};

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/icon-192x192.png',
  '/icon-256x256.png',
  '/icon-384x384.png',
  '/icon-512x512.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/flights/search',
  '/api/hotels/search',
  '/api/flights/available_airports',
  '/api/hotels/available_places'
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== SEARCH_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - handle requests with appropriate caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Determine cache strategy based on request type
  const cacheStrategy = getCacheStrategy(request);
  
  event.respondWith(
    handleRequest(request, cacheStrategy)
  );
});

/**
 * Background sync event
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'search-sync') {
    event.waitUntil(syncSearchResults());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalyticsData());
  }
});

/**
 * Push event
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        data: data.data,
        actions: data.actions || []
      })
    );
  }
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action) {
    // Handle action clicks
    handleNotificationAction(event.action, event.notification.data);
  } else {
    // Handle notification click
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

/**
 * Determine cache strategy for a request
 */
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // Static assets
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      url.pathname.includes('_next/static/')) {
    return CACHE_CONFIG.static;
  }
  
  // API endpoints
  if (url.pathname.startsWith('/api/')) {
    // Search endpoints
    if (url.pathname.includes('/search')) {
      return CACHE_CONFIG.search;
    }
    return CACHE_CONFIG.api;
  }
  
  // Images
  if (request.destination === 'image') {
    return CACHE_CONFIG.images;
  }
  
  // Default to network first for navigation requests
  return CACHE_CONFIG.network;
}

/**
 * Handle request with appropriate cache strategy
 */
async function handleRequest(request, config) {
  const strategy = config.strategy || CACHE_STRATEGIES.NETWORK_FIRST;
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, config);
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, config);
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, config);
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return networkOnly(request);
    case CACHE_STRATEGIES.CACHE_ONLY:
      return cacheOnly(request);
    default:
      return networkFirst(request, config);
  }
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request, config) {
  const cache = await caches.open(getCacheName(request));
  
  try {
    const cached = await cache.match(request);
    
    if (cached) {
      // Check if cached response is still valid
      if (isResponseValid(cached, config.maxAge)) {
        return cached;
      }
      
      // Cache is stale, try to update it
      updateCacheInBackground(request, cache);
    }
    
    // Not in cache or stale, fetch from network
    const response = await fetch(request);
    
    if (response.ok) {
      await cacheResponse(request, response, cache, config);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache-first strategy failed:', error);
    
    // Try to return stale cache if network fails
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

/**
 * Network-first strategy
 */
async function networkFirst(request, config) {
  const cache = await caches.open(getCacheName(request));
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      await cacheResponse(request, response.clone(), cache, config);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Network-first strategy failed:', error);
    
    // Try to get from cache
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request, config) {
  const cache = await caches.open(getCacheName(request));
  
  try {
    const cached = await cache.match(request);
    
    // Always try to update in background
    const fetchPromise = fetch(request).then((response) => {
      if (response.ok) {
        cacheResponse(request, response.clone(), cache, config);
      }
      return response;
    });
    
    // Return cached version immediately if available
    if (cached) {
      // Update cache in background
      fetchPromise.catch((error) => {
        console.error('[SW] Background update failed:', error);
      });
      
      return cached;
    }
    
    // No cached version, wait for network
    return await fetchPromise;
  } catch (error) {
    console.error('[SW] Stale-while-revalidate strategy failed:', error);
    
    // Try to return stale cache if network fails
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

/**
 * Network-only strategy
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('[SW] Network-only strategy failed:', error);
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

/**
 * Cache-only strategy
 */
async function cacheOnly(request) {
  const cache = await caches.open(getCacheName(request));
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  // Return offline page for navigation requests
  if (request.destination === 'document') {
    return caches.match('/offline');
  }
  
  throw new Error('No cached response available');
}

/**
 * Get appropriate cache name for request
 */
function getCacheName(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname.includes('/search')) {
      return SEARCH_CACHE_NAME;
    }
    return DYNAMIC_CACHE_NAME;
  }
  
  return STATIC_CACHE_NAME;
}

/**
 * Check if cached response is still valid
 */
function isResponseValid(response, maxAge) {
  if (!maxAge) return true;
  
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const cachedTime = new Date(dateHeader).getTime();
  const now = Date.now();
  
  return (now - cachedTime) < maxAge;
}

/**
 * Cache response with size management
 */
async function cacheResponse(request, response, cache, config) {
  // Check cache size limits
  if (config.maxEntries) {
    await manageCacheSize(cache, config.maxEntries);
  }
  
  await cache.put(request, response);
}

/**
 * Update cache in background
 */
async function updateCacheInBackground(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response);
    }
  } catch (error) {
    console.error('[SW] Background cache update failed:', error);
  }
}

/**
 * Manage cache size by removing old entries
 */
async function manageCacheSize(cache, maxEntries) {
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    const keysToDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

/**
 * Sync search results
 */
async function syncSearchResults() {
  try {
    const db = await openIndexedDB();
    const pendingSearches = await db.getAll('pendingSearches');
    
    for (const search of pendingSearches) {
      try {
        const response = await fetch(search.url, search.options);
        
        if (response.ok) {
          const data = await response.json();
          await db.put('searchResults', {
            id: search.id,
            data,
            timestamp: Date.now()
          });
          await db.delete('pendingSearches', search.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync search:', search.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Search sync failed:', error);
  }
}

/**
 * Sync analytics data
 */
async function syncAnalyticsData() {
  try {
    const db = await openIndexedDB();
    const pendingEvents = await db.getAll('pendingAnalytics');
    
    for (const event of pendingEvents) {
      try {
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event.data)
        });
        
        await db.delete('pendingAnalytics', event.id);
      } catch (error) {
        console.error('[SW] Failed to sync analytics event:', event.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Analytics sync failed:', error);
  }
}

/**
 * Handle notification actions
 */
function handleNotificationAction(action, data) {
  switch (action) {
    case 'view':
      clients.openWindow(data.url || '/');
      break;
    case 'dismiss':
      // Just close the notification
      break;
    default:
      console.log('[SW] Unknown notification action:', action);
  }
}

/**
 * Open IndexedDB for offline storage
 */
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GolobTravelOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores for offline data
      if (!db.objectStoreNames.contains('pendingSearches')) {
        db.createObjectStore('pendingSearches', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('searchResults')) {
        db.createObjectStore('searchResults', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pendingAnalytics')) {
        db.createObjectStore('pendingAnalytics', { keyPath: 'id' });
      }
    };
  });
}

// Message handling for communication with main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}