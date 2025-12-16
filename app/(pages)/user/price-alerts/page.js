import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PriceAlertManager from "@/components/priceAlerts/PriceAlertManager";
import PriceAlertDashboard from "@/components/priceAlerts/PriceAlertDashboard";
import NotificationPreferences from "@/components/priceAlerts/NotificationPreferences";
import SocialSharing from "@/components/priceAlerts/SocialSharing";
import { 
  Bell, 
  BarChart3, 
  Settings, 
  Share2, 
  Plus 
} from "lucide-react";

/**
 * User Price Alerts Page
 * Main page for managing price alerts with tabs for different functions
 */
export default async function PriceAlertsPage() {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/user/price-alerts");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Bell className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Price Alerts</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                <Plus className="h-4 w-4" />
                <span>New Alert</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { 
                id: 'alerts', 
                label: 'My Alerts', 
                icon: Bell, 
                description: 'Manage your price alerts' 
              },
              { 
                id: 'dashboard', 
                label: 'Dashboard', 
                icon: BarChart3, 
                description: 'View analytics and performance' 
              },
              { 
                id: 'preferences', 
                label: 'Preferences', 
                icon: Settings, 
                description: 'Manage notification settings' 
              },
              { 
                id: 'sharing', 
                label: 'Sharing', 
                icon: Share2, 
                description: 'Share deals with others' 
              },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className="group relative py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors whitespace-nowrap"
                  data-tab={tab.id}
                  onClick={() => {
                    // Handle tab switching with JavaScript
                    document.querySelectorAll('[data-tab-content]').forEach(content => {
                      content.classList.add('hidden');
                    });
                    
                    document.querySelectorAll('[data-tab]').forEach(tabBtn => {
                      tabBtn.classList.remove('text-blue-600', 'border-blue-600');
                      tabBtn.classList.add('text-gray-500', 'border-transparent');
                    });
                    
                    const targetContent = document.querySelector(`[data-tab-content="${tab.id}"]`);
                    const targetTab = document.querySelector(`[data-tab="${tab.id}"]`);
                    
                    if (targetContent) {
                      targetContent.classList.remove('hidden');
                    }
                    
                    if (targetTab) {
                      targetTab.classList.remove('text-gray-500', 'border-transparent');
                      targetTab.classList.add('text-blue-600', 'border-blue-600');
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform"></div>
                </button>
              ))}
            </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* My Alerts Tab */}
        <div 
          data-tab-content="alerts" 
          className="space-y-6"
        >
          <PriceAlertManager userId={session.user.id} />
        </div>

        {/* Dashboard Tab */}
        <div 
          data-tab-content="dashboard" 
          className="space-y-6 hidden"
        >
          <PriceAlertDashboard userId={session.user.id} />
        </div>

        {/* Preferences Tab */}
        <div 
          data-tab-content="preferences" 
          className="space-y-6 hidden"
        >
          <NotificationPreferences 
            userId={session.user.id}
            onSave={async (preferences) => {
              'use server'; // Save preferences to server
            }}
          />
        </div>

        {/* Sharing Tab */}
        <div 
          data-tab-content="sharing" 
          className="space-y-6 hidden"
        >
          <SocialSharing 
            userId={session.user.id}
            onShare={async (platform, shareData) => {
              'use server'; // Track sharing analytics
            }}
          />
        </div>
      </div>

      {/* Tab Switching Script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          // Set initial active tab
          document.addEventListener('DOMContentLoaded', function() {
            const firstTab = document.querySelector('[data-tab="alerts"]');
            const firstContent = document.querySelector('[data-tab-content="alerts"]');
            
            if (firstTab && firstContent) {
              firstTab.classList.add('text-blue-600', 'border-blue-600');
              firstTab.classList.remove('text-gray-500', 'border-transparent');
            }
          });
        `
      }} />

      {/* Page Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="text-sm text-gray-600">
              <p>
                Stay updated with price alerts and never miss a deal again.
              </p>
              <p className="mt-1">
                Questions? <a href="/support" className="text-blue-600 hover:text-blue-800 font-medium">Contact Support</a>
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              <a 
                href="/user/price-alerts/help" 
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Help Center
              </a>
              <a 
                href="/user/price-alerts/api" 
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                API Access
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar (visible on all tabs) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-sm">
                <span className="text-gray-600">Active Alerts:</span>
                <span className="font-semibold text-gray-900 ml-1">3</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Total Savings:</span>
                <span className="font-semibold text-green-600 ml-1">$285</span>
              </div>
            </div>
            
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View Full Dashboard →
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-20 right-8 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50 md:hidden">
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

// Metadata for the page
export const metadata = {
  title: "Price Alerts - Travel Agency",
  description: "Manage your flight price alerts, view analytics, and customize notification preferences.",
  keywords: ["price alerts", "flight deals", "price tracking", "travel savings"],
};