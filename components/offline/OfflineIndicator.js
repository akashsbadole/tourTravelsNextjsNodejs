"use client";

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useOfflineManager } from '@/lib/offline/offlineManager';

export default function OfflineIndicator() {
  const { isOnline, connectionType, networkQuality, retryQueueLength, forceSync } = useOfflineManager();
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if online and no issues
  if (isOnline && connectionType === 'online' && retryQueueLength === 0) {
    return null;
  }

  // Don't show if dismissed and online
  if (dismissed && isOnline) {
    return null;
  }

  const getIndicatorColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (connectionType === 'slow') return 'bg-yellow-500';
    if (connectionType === 'unstable') return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getIndicatorText = () => {
    if (!isOnline) return 'Offline';
    if (connectionType === 'slow') return 'Slow Connection';
    if (connectionType === 'unstable') return 'Unstable Connection';
    return 'Online';
  };

  const getNetworkQualityText = () => {
    switch (networkQuality) {
      case 'fast': return 'Fast';
      case 'slow': return 'Slow';
      case 'very-slow': return 'Very Slow';
      case 'poor': return 'Poor';
      default: return 'Unknown';
    }
  };

  const handleDismiss = () => {
    if (isOnline) {
      setDismissed(true);
    }
  };

  const handleForceSync = async () => {
    await forceSync();
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${dismissed ? 'pointer-events-none opacity-50' : ''}`}>
      {/* Main indicator */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getIndicatorColor()} ${!isOnline ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium text-gray-900">
              {getIndicatorText()}
            </span>
            {retryQueueLength > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                {retryQueueLength} pending
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Show details"
            >
              <AlertTriangle className="w-4 h-4 text-gray-500" />
            </button>
            
            {isOnline && (
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Quick actions */}
        {!isOnline && (
          <div className="mt-2 text-xs text-gray-600">
            Check your internet connection
          </div>
        )}

        {retryQueueLength > 0 && isOnline && (
          <button
            onClick={handleForceSync}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-2 rounded flex items-center justify-center transition-colors"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Sync Now
          </button>
        )}
      </div>

      {/* Details panel */}
      {showDetails && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Connection Details</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Connection Type:</span>
              <span className="font-medium capitalize">{connectionType}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Network Quality:</span>
              <span className="font-medium">{getNetworkQualityText()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Actions:</span>
              <span className="font-medium">{retryQueueLength}</span>
            </div>
          </div>

          {/* Network quality indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Network Quality</span>
              <span>{getNetworkQualityText()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  networkQuality === 'fast' ? 'bg-green-500 w-full' :
                  networkQuality === 'slow' ? 'bg-yellow-500 w-3/4' :
                  networkQuality === 'very-slow' ? 'bg-orange-500 w-1/2' :
                  'bg-red-500 w-1/4'
                }`}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 space-y-2">
            {retryQueueLength > 0 && (
              <button
                onClick={handleForceSync}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded flex items-center justify-center transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Pending Actions
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 px-3 rounded flex items-center justify-center transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}