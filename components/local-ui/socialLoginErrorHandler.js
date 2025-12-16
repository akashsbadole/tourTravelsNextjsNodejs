"use client";
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { ChevronDown, ChevronUp, RefreshCw, ExternalLink, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const socialLoginErrors = {
  // Google OAuth errors
  google: {
    "access_denied": {
      title: "Access Denied",
      description: "You denied access to your Google account. Please try again and grant the necessary permissions.",
      solutions: [
        "Try logging in again and accept the permissions",
        "Check if you're logged into the correct Google account",
        "Clear your browser cache and try again"
      ]
    },
    "invalid_request": {
      title: "Invalid Request",
      description: "The authentication request was invalid. This could be due to a configuration issue.",
      solutions: [
        "Try refreshing the page and logging in again",
        "Contact support if the issue persists"
      ]
    },
    "unauthorized_client": {
      title: "Unauthorized Client",
      description: "The application is not authorized to use Google OAuth.",
      solutions: [
        "Contact support about this issue",
        "Try using a different login method"
      ]
    }
  },
  
  // Facebook OAuth errors
  facebook: {
    "access_denied": {
      title: "Access Denied",
      description: "You denied access to your Facebook account. Please try again and grant the necessary permissions.",
      solutions: [
        "Try logging in again and accept the permissions",
        "Check if you're logged into the correct Facebook account",
        "Make sure you haven't blocked the app in your Facebook settings"
      ]
    },
    "invalid_request": {
      title: "Invalid Request",
      description: "The authentication request was invalid or missing required parameters.",
      solutions: [
        "Try refreshing the page and logging in again",
        "Check your internet connection",
        "Clear your browser cache"
      ]
    }
  },
  
  // Apple Sign In errors
  apple: {
    "access_denied": {
      title: "Access Denied",
      description: "You denied access to your Apple ID. Please try again and grant the necessary permissions.",
      solutions: [
        "Try logging in again and accept the permissions",
        "Ensure you're using a supported browser",
        "Check your Apple ID settings"
      ]
    },
    "invalid_client": {
      title: "Invalid Client",
      description: "The application is not properly configured for Apple Sign In.",
      solutions: [
        "Contact support about this issue",
        "Try using a different login method"
      ]
    }
  },
  
  // Twitter/X OAuth errors
  twitter: {
    "access_denied": {
      title: "Access Denied",
      description: "You denied access to your Twitter/X account. Please try again and grant the necessary permissions.",
      solutions: [
        "Try logging in again and accept the permissions",
        "Check if you're logged into the correct Twitter/X account",
        "Verify your account is in good standing"
      ]
    },
    "invalid_request": {
      title: "Invalid Request",
      description: "The authentication request was invalid or malformed.",
      solutions: [
        "Try refreshing the page and logging in again",
        "Check your internet connection",
        "Clear your browser cache and cookies"
      ]
    }
  },
  
  // LinkedIn OAuth errors
  linkedin: {
    "access_denied": {
      title: "Access Denied",
      description: "You denied access to your LinkedIn account. Please try again and grant the necessary permissions.",
      solutions: [
        "Try logging in again and accept the permissions",
        "Check if you're logged into the correct LinkedIn account",
        "Verify your account is in good standing"
      ]
    },
    "invalid_request": {
      title: "Invalid Request",
      description: "The authentication request was invalid or missing required parameters.",
      solutions: [
        "Try refreshing the page and logging in again",
        "Check your internet connection",
        "Contact support if the issue persists"
      ]
    }
  },
  
  // Instagram OAuth errors
  instagram: {
    "access_denied": {
      title: "Access Denied",
      description: "You denied access to your Instagram account. Please try again and grant the necessary permissions.",
      solutions: [
        "Try logging in again and accept the permissions",
        "Check if you're logged into the correct Instagram account",
        "Verify your account is in good standing"
      ]
    },
    "invalid_request": {
      title: "Invalid Request",
      description: "The authentication request was invalid or missing required parameters.",
      solutions: [
        "Try refreshing the page and logging in again",
        "Check your internet connection",
        "Clear your browser cache and cookies"
      ]
    }
  },
  
  // Generic errors
  generic: {
    "network_error": {
      title: "Network Error",
      description: "A network error occurred while trying to authenticate. Please check your internet connection.",
      solutions: [
        "Check your internet connection",
        "Try refreshing the page",
        "Try using a different network"
      ]
    },
    "timeout": {
      title: "Request Timeout",
      description: "The authentication request timed out. Please try again.",
      solutions: [
        "Check your internet connection speed",
        "Try refreshing the page",
        "Try using a different browser"
      ]
    },
    "unknown_error": {
      title: "Unknown Error",
      description: "An unexpected error occurred during authentication.",
      solutions: [
        "Try refreshing the page and logging in again",
        "Try using a different login method",
        "Contact support if the issue persists"
      ]
    }
  }
};

export function SocialLoginErrorHandler({ 
  error, 
  provider, 
  onRetry, 
  onUseDifferentMethod,
  showDetails = false 
}) {
  const [expanded, setExpanded] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    if (error && provider) {
      const errorInfo = getErrorInfo(error, provider);
      setErrorDetails(errorInfo);
    }
  }, [error, provider]);

  const getErrorInfo = (error, providerName) => {
    const errorCode = error?.code || error?.error || 'unknown_error';
    const providerErrors = socialLoginErrors[providerName] || socialLoginErrors.generic;
    
    return providerErrors[errorCode] || providerErrors['unknown_error'] || socialLoginErrors.generic['unknown_error'];
  };

  const handleRetry = () => {
    toast.info(`Retrying ${provider} login...`);
    onRetry?.();
  };

  const handleUseDifferentMethod = () => {
    toast.info("Switching to different login method...");
    onUseDifferentMethod?.();
  };

  if (!errorDetails) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <HelpCircle className="h-5 w-5" />
          {errorDetails.title}
        </CardTitle>
        <CardDescription>
          {errorDetails.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <Button 
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry {provider}
            </Button>
          )}
          
          {onUseDifferentMethod && (
            <Button 
              onClick={handleUseDifferentMethod}
              variant="outline"
              size="sm"
            >
              Try Different Method
            </Button>
          )}
        </div>

        {/* Error Details */}
        {showDetails && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>Troubleshooting Steps</span>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Solutions to try:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {errorDetails.solutions.map((solution, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{solution}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Technical Details */}
              {error && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Technical Details:</h4>
                  <div className="space-y-1 text-xs font-mono">
                    {error.code && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Error Code:</span>
                        <Badge variant="outline">{error.code}</Badge>
                      </div>
                    )}
                    {error.error && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Error:</span>
                        <Badge variant="outline">{error.error}</Badge>
                      </div>
                    )}
                    {error.error_description && (
                      <div>
                        <span className="text-gray-600">Description:</span>
                        <p className="mt-1 text-gray-800">{error.error_description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Help Links */}
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-sm">Need more help?</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/support" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Contact Support
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/help/social-login" target="_blank" rel="noopener noreferrer">
                      <HelpCircle className="h-4 w-4 mr-1" />
                      Help Center
                    </a>
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for handling social login errors
export function useSocialLoginErrorHandler() {
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(null);

  const handleError = (err, providerName) => {
    setError(err);
    setProvider(providerName);
  };

  const clearError = () => {
    setError(null);
    setProvider(null);
  };

  return {
    error,
    provider,
    handleError,
    clearError
  };
}

export default SocialLoginErrorHandler;