/**
 * Progress Context
 * Manages progress tracking
 */

"use client";

import { createContext, useContext, ReactNode } from "react";
import { Session } from "@/lib/sessions";
import { useProgress } from "@/src/hooks/useProgress";

interface ProgressContextValue {
  userProgress: number;
  completedTasks: number;
  percentage: number;
  currentLevel: string;
}

const ProgressContext = createContext<ProgressContextValue>(
  {} as ProgressContextValue
);

export const useProgressContext = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgressContext must be used within ProgressProvider");
  }
  return context;
};

interface ProgressProviderProps {
  children: ReactNode;
  activeSession: Session | null;
}

export const ProgressProvider = ({
  children,
  activeSession,
}: ProgressProviderProps) => {
  const { progress, completedTasks, percentage, currentLevel } = useProgress(
    activeSession
  );

  return (
    <ProgressContext.Provider
      value={{
        userProgress: progress,
        completedTasks,
        percentage,
        currentLevel,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};




