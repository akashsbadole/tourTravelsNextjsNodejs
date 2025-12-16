"use client";

import { Component } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export class TravelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    console.error("Travel Error Boundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
          <Card className="border-destructive">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                We encountered an unexpected error while loading this page.
              </p>
              
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="text-left bg-muted p-4 rounded-lg text-sm">
                  <p className="font-semibold mb-2">Error Details (Development Only):</p>
                  <pre className="whitespace-pre-wrap text-xs">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="whitespace-pre-wrap text-xs mt-2">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/" className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Go Home
                  </Link>
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                If this problem persists, please contact our support team.
              </div>
            </CardContent>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}

export function TravelErrorFallback({ error, resetError, title = "Error Loading Content" }) {
  return (
    <Card className="border-destructive">
      <CardContent className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-destructive mb-2">{title}</h2>
        <p className="text-muted-foreground mb-4">
          {error?.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={resetError}>
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/travel-requirements">
              Back to Requirements
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function NetworkError({ onRetry, message = "Network error occurred" }) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-6 text-center">
        <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="text-lg font-semibold text-orange-800 mb-2">Connection Error</h2>
        <p className="text-orange-700 mb-4">
          {message}. Please check your internet connection and try again.
        </p>
        <Button onClick={onRetry} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

export function NotFoundError({ entityType = "page" }) {
  return (
    <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
      <Card>
        <CardContent className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">{entityType.charAt(0).toUpperCase() + entityType.slice(1)} Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The {entityType} you're looking for doesn't exist or you don't have access to it.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Button asChild>
              <Link href="/travel-requirements">
                Browse Requirements
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}