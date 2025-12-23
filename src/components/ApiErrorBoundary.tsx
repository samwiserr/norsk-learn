"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import ErrorBoundary from "./ErrorBoundary";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Specialized error boundary for API-related errors
 * Provides more specific error messages and recovery options
 */
class ApiErrorBoundary extends Component<Props, State> {
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
    console.error("ApiErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message.includes("fetch") ||
                            this.state.error?.message.includes("network");

      return (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <h2>Connection Error</h2>
          <p>
            {isNetworkError
              ? "Unable to connect to the server. Please check your internet connection and try again."
              : "An error occurred while communicating with the server. Please try again."}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ApiErrorBoundary;

