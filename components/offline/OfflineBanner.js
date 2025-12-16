"use client";

import { useState, useEffect } from 'react';
import { WifiOff, AlertCircle, CheckCircle, X, Info } from 'lucide-react';
import { useOfflineManager } from '@/lib/offline/offlineManager';

export default function OfflineBanner() {
  const { isOnline, connectionType, networkQuality, retryQueueLength } = useOfflineManager();
  const [dismissed, setDismissed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Reset dismissed state when coming back online
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  // Don't show if online and no issues
  if (isOnline && connectionType === 'online' && retryQueueLength === 0) {
    return null;
  }

  // Don't show if dismissed
  if (dismissed) {
    return null;
  }

  const getBannerType = () => {
    if (!isOnline) return 'error';
    if (connectionType === 'slow') return 'warning';
    if (connectionType === 'unstable') return 'warning';
    if (retryQueueLength > 0) return 'info';
    return 'info';
  };

  const bannerType = getBannerType();

  const getBannerStyles = () => {
    switch (bannerType) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getBannerIcon = () => {
    switch (bannerType) {
      case 'error':
        return <WifiOff className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getBannerTitle = () => {
    if (!isOnline) return 'You\'re Offline';
    if (connectionType === 'slow') return 'Slow Connection Detected';
    if (connectionType === 'unstable') return 'Unstable Connection';
    if (retryQueueLength > 0) return 'Pending Actions';
    return 'Connection Issue';
  };

  const getBannerMessage = () => {
    if (!isOnline) {
      return 'Please check your internet connection. Some features may not be available.';
    }
    if (connectionType === 'slow') {
      return 'Your connection is slow. Pages may take longer to load.';
    }
    if (connectionType === 'unstable') {
      return 'Your connection is unstable. Some actions may fail.';
    }
    if (retryQueueLength > 0) {
      return `You have ${retryQueueLength} pending action${retryQueueLength > 1 ? 's' : ''} that will sync when you're back online.`;
    }
    return 'There may be issues with your connection.';
  };

  const getNetworkQualityDescription = () => {
    switch (networkQuality) {
      case 'fast':
        return 'Your connection is fast and stable.';
      case 'slow':
        return 'Your connection is slow but functional.';
      case 'very-slow':
        return 'Your connection is very slow. Consider switching to a better network.';
      case 'poor':
        return 'Your connection quality is poor. Some features may not work properly.';
      default:
        return 'Unable to determine connection quality.';
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div className={`border-b ${getBannerStyles()}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getBannerIcon()}
              <div>
                <h3 className="font-medium">{getBannerTitle()}</h3>
                <p className="text-sm mt-1">{getBannerMessage()}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isOnline && (
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
                  title="Show connection details"
                >
                  <Info className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Additional info section */}
          {showInfo && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Connection Status</h4>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-2 bg-current"></span>
                      Status: {isOnline ? 'Online' : 'Offline'}
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-2 bg-current"></span>
                      Type: {connectionType}
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-2 bg-current"></span>
                      Quality: {networkQuality}
                    </li>
                    {retryQueueLength > 0 && (
                      <li className="flex items-center">
                        <span className="w-2 h-2 rounded-full mr-2 bg-current"></span>
                        Pending: {retryQueueLength} action{retryQueueLength > 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">What You Can Do</h4>
                  <ul className="text-sm space-y-1">
                    {!isOnline && (
                      <>
                        <li className="flex items-start">
                          <CheckCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                          View cached search results
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                          Browse saved flights and hotels
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                          Access your preferences
                        </li>
                      </>
                    )}
                    {isOnline && connectionType !== 'online' && (
                      <>
                        <li className="flex items-start">
                          <CheckCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                          Wait for connection to stabilize
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                          Try switching networks
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                          Move closer to your router
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
              
              <div className="mt-3 text-sm">
                <p>{getNetworkQualityDescription()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}