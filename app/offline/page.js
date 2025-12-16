import { WifiOff, RefreshCw, Search, Hotel, Plane } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <WifiOff className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Offline
          </h1>
          <p className="text-gray-600">
            Please check your internet connection and try again.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">
              What you can do offline:
            </h2>
            <ul className="text-sm text-blue-800 space-y-2 text-left">
              <li className="flex items-center">
                <Search className="w-4 h-4 mr-2" />
                View cached search results
              </li>
              <li className="flex items-center">
                <Plane className="w-4 h-4 mr-2" />
                Browse saved flights
              </li>
              <li className="flex items-center">
                <Hotel className="w-4 h-4 mr-2" />
                View saved hotels
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
          
          <Link
            href="/"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors block"
          >
            Go to Homepage
          </Link>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>Your cached data will be available when you're back online.</p>
        </div>
      </div>
    </div>
  );
}