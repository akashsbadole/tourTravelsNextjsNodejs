/**
 * Service Worker Registration Utility
 * Handles registration, updates, and communication with the service worker
 */

const SW_VERSION = 'v1';
const SW_URL = '/sw.js';

class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isOnline = navigator.onLine;
    this.swVersion = null;
    this.updateAvailable = false;
    this.callbacks = {
      update: [],
      offline: [],
      online: [],
      installed: []
    };
    
    // Initialize event listeners
    this.initEventListeners();
  }

  /**
   * Initialize service worker registration
   */
  async register() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service Worker not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register(SW_URL, {
        scope: '/'
      });

      console.log('[SW] Service Worker registered successfully');
      
      // Check for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.updateAvailable = true;
            this.notifyCallbacks('update', { available: true });
          }
        });
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed');
        window.location.reload();
      });

      // Get SW version
      await this.getSWVersion();
      
      return true;
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Initialize event listeners for online/offline status
   */
  initEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[SW] App is online');
      this.notifyCallbacks('online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[SW] App is offline');
      this.notifyCallbacks('offline');
    });
  }

  /**
   * Get service worker version
   */
  async getSWVersion() {
    if (!this.registration?.active) return;

    try {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        this.swVersion = event.data.version;
        console.log('[SW] Version:', this.swVersion);
      };

      this.registration.active.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    } catch (error) {
      console.error('[SW] Failed to get version:', error);
    }
  }

  /**
   * Skip waiting for new service worker
   */
  async skipWaiting() {
    if (!this.registration?.waiting) return;

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Clear all caches
   */
  async clearCaches() {
    if (!this.registration?.active) return;

    try {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        console.log('[SW] Caches cleared:', event.data);
      };

      this.registration.active.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    } catch (error) {
      console.error('[SW] Failed to clear caches:', error);
    }
  }

  /**
   * Check if app is online
   */
  isAppOnline() {
    return this.isOnline;
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable() {
    return this.updateAvailable;
  }

  /**
   * Get service worker registration status
   */
  getRegistrationStatus() {
    return {
      registered: !!this.registration,
      controlled: !!navigator.serviceWorker.controller,
      version: this.swVersion,
      online: this.isOnline,
      updateAvailable: this.updateAvailable
    };
  }

  /**
   * Add event callback
   */
  addCallback(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  /**
   * Remove event callback
   */
  removeCallback(event, callback) {
    if (!this.callbacks[event]) return;
    
    const index = this.callbacks[event].indexOf(callback);
    if (index > -1) {
      this.callbacks[event].splice(index, 1);
    }
  }

  /**
   * Notify all callbacks for an event
   */
  notifyCallbacks(event, data = {}) {
    if (!this.callbacks[event]) return;
    
    this.callbacks[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[SW] Callback error:', error);
      }
    });
  }

  /**
   * Trigger background sync
   */
  async triggerSync(tag) {
    if (!this.registration?.sync) {
      console.warn('[SW] Background Sync not supported');
      return false;
    }

    try {
      await this.registration.sync.register(tag);
      console.log('[SW] Background sync triggered:', tag);
      return true;
    } catch (error) {
      console.error('[SW] Failed to trigger sync:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush() {
    if (!this.registration?.pushManager) {
      console.warn('[SW] Push notifications not supported');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      });

      console.log('[SW] Push subscription created');
      return subscription;
    } catch (error) {
      console.error('[SW] Failed to subscribe to push:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush() {
    if (!this.registration?.pushManager) return false;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        console.log('[SW] Unsubscribed from push notifications');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[SW] Failed to unsubscribe from push:', error);
      return false;
    }
  }

  /**
   * Convert URL base64 to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
}

// Create singleton instance
const swManager = new ServiceWorkerManager();

export default swManager;