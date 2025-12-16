"use client";

import { useEffect, useState, createContext, useContext } from 'react';
import swManager from '@/lib/offline/serviceWorkerRegistration';

const ServiceWorkerContext = createContext({
  isOnline: true,
  updateAvailable: false,
  registrationStatus: null,
  skipWaiting: () => {},
  clearCaches: () => {},
  triggerSync: () => {}
});

export const useServiceWorker = () => useContext(ServiceWorkerContext);

export function ServiceWorkerProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);

  useEffect(() => {
    // Register service worker
    const registerSW = async () => {
      const success = await swManager.register();
      
      if (success) {
        setRegistrationStatus(swManager.getRegistrationStatus());
        setIsOnline(swManager.isAppOnline());
        setUpdateAvailable(swManager.isUpdateAvailable());
      }
    };

    // Only register in production or when explicitly enabled
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW === 'true') {
      registerSW();
    }

    // Set up event listeners
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleUpdate = () => {
      setUpdateAvailable(true);
    };

    swManager.addCallback('online', handleOnline);
    swManager.addCallback('offline', handleOffline);
    swManager.addCallback('update', handleUpdate);

    return () => {
      swManager.removeCallback('online', handleOnline);
      swManager.removeCallback('offline', handleOffline);
      swManager.removeCallback('update', handleUpdate);
    };
  }, []);

  const skipWaiting = () => {
    swManager.skipWaiting();
  };

  const clearCaches = () => {
    swManager.clearCaches();
  };

  const triggerSync = (tag) => {
    return swManager.triggerSync(tag);
  };

  const value = {
    isOnline,
    updateAvailable,
    registrationStatus,
    skipWaiting,
    clearCaches,
    triggerSync
  };

  return (
    <ServiceWorkerContext.Provider value={value}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}