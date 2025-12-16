import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Clock, 
  Volume2,
  VolumeX,
  Save,
  RotateCcw,
  Info,
  Check,
  X
} from 'lucide-react';

/**
 * Notification Preferences Component
 * Allows users to configure their notification preferences for price alerts
 */
const NotificationPreferences = ({ 
  userId, 
  initialPreferences = {}, 
  onSave, 
  className = '' 
}) => {
  const [preferences, setPreferences] = useState({
    channels: {
      email: { enabled: true, frequency: 'immediate' },
      push: { enabled: true, frequency: 'immediate' },
      sms: { enabled: false, frequency: 'immediate' },
      webhook: { enabled: false, frequency: 'immediate' }
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    frequency: {
      maxPerDay: 10,
      batchingEnabled: false,
      batchFrequency: 'daily'
    },
    types: {
      price_drop: { enabled: true, priority: 'normal' },
      price_alert_created: { enabled: true, priority: 'normal' },
      price_alert_expiring: { enabled: true, priority: 'normal' },
      price_trend_change: { enabled: false, priority: 'low' },
      competitive_price: { enabled: false, priority: 'low' },
      daily_digest: { enabled: false, priority: 'low' }
    },
    ...initialPreferences
  });
  
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [webhookUrl, setWebhookUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState({});

  // Update hasChanges when preferences change
  useEffect(() => {
    const hasUnsavedChanges = JSON.stringify(preferences) !== JSON.stringify(initialPreferences);
    setHasChanges(hasUnsavedChanges);
  }, [preferences, initialPreferences]);

  // Handle channel preference changes
  const handleChannelChange = (channel, field, value) => {
    setPreferences(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: {
          ...prev.channels[channel],
          [field]: value
        }
      }
    }));
  };

  // Handle quiet hours changes
  const handleQuietHoursChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value
      }
    }));
  };

  // Handle frequency changes
  const handleFrequencyChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      frequency: {
        ...prev.frequency,
        [field]: value
      }
    }));
  };

  // Handle notification type changes
  const handleTypeChange = (type, field, value) => {
    setPreferences(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: {
          ...prev.types[type],
          [field]: value
        }
      }
    }));
  };

  // Validate preferences
  const validatePreferences = () => {
    const newErrors = {};

    // Validate webhook URL if webhook is enabled
    if (preferences.channels.webhook.enabled && !webhookUrl) {
      newErrors.webhookUrl = 'Webhook URL is required when webhook notifications are enabled';
    } else if (webhookUrl && !isValidUrl(webhookUrl)) {
      newErrors.webhookUrl = 'Please enter a valid webhook URL';
    }

    // Validate phone number if SMS is enabled
    if (preferences.channels.sms.enabled && !phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required when SMS notifications are enabled';
    } else if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    // Validate max per day
    if (preferences.frequency.maxPerDay < 1 || preferences.frequency.maxPerDay > 100) {
      newErrors.maxPerDay = 'Maximum notifications per day must be between 1 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate URL
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Validate phone number (simple validation)
  const isValidPhoneNumber = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  // Save preferences
  const handleSave = async () => {
    if (!validatePreferences()) {
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const preferencesToSave = {
        ...preferences,
        contactInfo: {
          webhookUrl: preferences.channels.webhook.enabled ? webhookUrl : null,
          phoneNumber: preferences.channels.sms.enabled ? phoneNumber : null
        }
      };

      await onSave(preferencesToSave);
      setSaveStatus('success');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset preferences
  const handleReset = () => {
    setPreferences(initialPreferences);
    setWebhookUrl('');
    setPhoneNumber('');
    setErrors({});
    setSaveStatus(null);
  };

  // Get channel icon
  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'push':
        return <Smartphone className="w-5 h-5" />;
      case 'sms':
        return <MessageSquare className="w-5 h-5" />;
      case 'webhook':
        return <Bell className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <Info className="w-4 h-4" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {saveStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-800">
          <Check className="w-5 h-5" />
          <span>Notification preferences saved successfully!</span>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-800">
          <X className="w-5 h-5" />
          <span>Failed to save notification preferences. Please try again.</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Notification Channels */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Channels
          </h3>
          <div className="space-y-4">
            {Object.entries(preferences.channels).map(([channel, config]) => (
              <div key={channel} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {getChannelIcon(channel)}
                  <div>
                    <div className="font-medium text-gray-900 capitalize">
                      {channel === 'webhook' ? 'Webhook' : channel === 'sms' ? 'SMS' : channel}
                    </div>
                    <div className="text-sm text-gray-500">
                      {channel === 'email' && 'Receive notifications via email'}
                      {channel === 'push' && 'Receive push notifications on your device'}
                      {channel === 'sms' && 'Receive text messages on your phone'}
                      {channel === 'webhook' && 'Send notifications to your webhook endpoint'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Frequency:</label>
                    <select
                      value={config.frequency}
                      onChange={(e) => handleChannelChange(channel, 'frequency', e.target.value)}
                      disabled={!config.enabled}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleChannelChange(channel, 'enabled', !config.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Additional fields for enabled channels */}
          {preferences.channels.webhook.enabled && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-webhook-endpoint.com/alerts"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.webhookUrl ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.webhookUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.webhookUrl}</p>
              )}
            </div>
          )}

          {preferences.channels.sms.enabled && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
              )}
            </div>
          )}
        </div>

        {/* Quiet Hours */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Hours
          </h3>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-medium text-gray-900">Enable Quiet Hours</div>
                <div className="text-sm text-gray-500">
                  Limit notifications during specific hours
                </div>
              </div>
              <button
                onClick={() => handleQuietHoursChange('enabled', !preferences.quietHours.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHours.startTime}
                    onChange={(e) => handleQuietHoursChange('startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHours.endTime}
                    onChange={(e) => handleQuietHoursChange('endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={preferences.quietHours.timezone}
                    onChange={(e) => handleQuietHoursChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Frequency Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Frequency Settings
          </h3>
          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-medium text-gray-900">Maximum Notifications Per Day</div>
                  <div className="text-sm text-gray-500">
                    Limit the total number of notifications you receive each day
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={preferences.frequency.maxPerDay}
                    onChange={(e) => handleFrequencyChange('maxPerDay', parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">per day</span>
                </div>
              </div>
              {errors.maxPerDay && (
                <p className="mt-1 text-sm text-red-600">{errors.maxPerDay}</p>
              )}
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-medium text-gray-900">Batch Notifications</div>
                  <div className="text-sm text-gray-500">
                    Group multiple notifications into a single digest
                  </div>
                </div>
                <button
                  onClick={() => handleFrequencyChange('batchingEnabled', !preferences.frequency.batchingEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.frequency.batchingEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.frequency.batchingEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {preferences.frequency.batchingEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Frequency
                  </label>
                  <select
                    value={preferences.frequency.batchFrequency}
                    onChange={(e) => handleFrequencyChange('batchFrequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h3>
          <div className="space-y-3">
            {Object.entries(preferences.types).map(([type, config]) => (
              <div key={type} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 capitalize">
                    {type.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {type === 'price_drop' && 'Notifications when prices drop for your alerts'}
                    {type === 'price_alert_created' && 'Confirmation when you create a new alert'}
                    {type === 'price_alert_expiring' && 'Reminders before your alerts expire'}
                    {type === 'price_trend_change' && 'Updates on price trend changes'}
                    {type === 'competitive_price' && 'Alerts about competitive pricing'}
                    {type === 'daily_digest' && 'Daily summary of your price alerts'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(config.priority)}`}>
                    {config.priority}
                  </div>
                  <select
                    value={config.priority}
                    onChange={(e) => handleTypeChange(type, 'priority', e.target.value)}
                    disabled={!config.enabled}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <button
                    onClick={() => handleTypeChange(type, 'enabled', !config.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;