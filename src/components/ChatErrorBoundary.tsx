"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Specialized error boundary for chat interface
 * Provides chat-specific error recovery
 */
class ChatErrorBoundary extends Component<Props, State> {
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

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error caught by boundary, rendered in fallback UI
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <h2>Chat Error</h2>
          <p>
            The chat interface encountered an error. Your conversation data is safe.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
            }}
          >
            Reload Chat
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChatErrorBoundary;




