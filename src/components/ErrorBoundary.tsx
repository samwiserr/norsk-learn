"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { LanguageCode } from "@/lib/languages";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors
 * Prevents the entire app from crashing when a component throws an error
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Error caught by boundary, Sentry reporting attempted below
    
    // Report to Sentry with React error info
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // Try to get language from localStorage
        const storedLanguage = localStorage.getItem('norsk_ui_language');
        const language = storedLanguage as LanguageCode | null;
        
        if (language) {
          Sentry.setContext('language', { code: language, locale: language });
        }
        
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      } catch (sentryError) {
        // Sentry reporting failed silently
      }
    }
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <h2>Something went wrong</h2>
          <p>
            {this.state.error?.message ||
              "An unexpected error occurred. Please try refreshing the page."}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem",
              marginLeft: "0.5rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
            }}
          >
            Refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
