/**
 * Sync Context
 * Manages sync state
 */

"use client";

import { createContext, useContext, ReactNode } from "react";
import { SyncStatus } from "@/src/services/syncService";

interface SyncContextValue {
  syncStatus: SyncStatus;
}

const SyncContext = createContext<SyncContextValue>({} as SyncContextValue);

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within SyncProvider");
  }
  return context;
};

interface SyncProviderProps {
  children: ReactNode;
  syncStatus: SyncStatus;
}

export const SyncProvider = ({ children, syncStatus }: SyncProviderProps) => {
  return (
    <SyncContext.Provider value={{ syncStatus }}>{children}</SyncContext.Provider>
  );
};

