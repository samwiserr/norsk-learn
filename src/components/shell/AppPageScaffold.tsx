"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AppPageScaffoldProps {
  children: ReactNode;
  className?: string;
  /** Max width token: `narrow` (forms), `content` (default), `wide` (dashboard grids) */
  maxWidth?: "narrow" | "content" | "wide" | "full";
}

const maxWidthClass: Record<NonNullable<AppPageScaffoldProps["maxWidth"]>, string> = {
  narrow: "max-w-lg",
  content: "max-w-4xl",
  wide: "max-w-6xl",
  full: "max-w-none",
};

/**
 * Standard page padding and centered content column for marketing / settings style routes.
 */
export function AppPageScaffold({ children, className, maxWidth = "content" }: AppPageScaffoldProps) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <div className={cn("mx-auto w-full px-4 py-8 sm:px-6 lg:px-8", maxWidthClass[maxWidth])}>
        {children}
      </div>
    </div>
  );
}
