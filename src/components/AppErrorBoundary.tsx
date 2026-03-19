"use client";

import React from "react";
import ErrorBoundary from "./ErrorBoundary";
import ApiErrorBoundary from "./ApiErrorBoundary";
import ChatErrorBoundary from "./ChatErrorBoundary";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Main error boundary wrapper for the entire application
 * Provides layered error handling with specialized boundaries
 */
export default function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary>
      <ApiErrorBoundary>
        <ChatErrorBoundary>
          {children}
        </ChatErrorBoundary>
      </ApiErrorBoundary>
    </ErrorBoundary>
  );
}




