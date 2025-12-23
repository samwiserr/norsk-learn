/**
 * Context Provider - Compatibility Wrapper
 * Provides the old Context interface using the new focused contexts
 * This ensures backward compatibility while we have the improved architecture
 */

"use client";

import { ReactNode } from "react";
import { LanguageProvider, useLanguageContext } from "@/src/context/LanguageContext";
import { ThemeProvider, useThemeContext } from "@/src/context/ThemeContext";
import { SessionProvider, useSessionContext } from "@/src/context/SessionContext";
import { ProgressProvider } from "@/src/context/ProgressContext";
import { SyncProvider, useSyncContext } from "@/src/context/SyncContext";
import { Context, ContextValue } from "@/src/context/Context";
import { useSync } from "@/src/hooks/useSync";
import { useAuthCheck } from "@/src/hooks/useAuthCheck";
import { UserRepository } from "@/src/repositories/userRepository";

/**
 * Inner provider that combines all contexts into the old Context interface
 */
const ContextProviderInner = ({ children }: { children: ReactNode }) => {
  const { language, setLanguage } = useLanguageContext();
  const { theme, setTheme } = useThemeContext();
  const {
    sessions,
    activeSessionId,
    activeSession,
    createSession,
    deleteSession,
    switchSession,
    renameSession,
    updateSession,
    input,
    setInput,
    loading,
    showResults,
    onSent,
    newChat,
    userMessageCount,
    isAuthRequired,
    cefrLevel,
    setCefrLevel,
  } = useSessionContext();
  const { user } = useAuthCheck();
  
  // Get sync status
  const { syncStatus } = useSync(
    user,
    activeSessionId,
    sessions,
    (sessionId: string, session: any) => {
      updateSession(sessionId, session);
    }
  );

  // Get user message count (for compatibility)
  const currentUserMessageCount = userMessageCount || UserRepository.getUserMessageCount();

  const contextValue: ContextValue = {
    cefrLevel,
    setCefrLevel,
    language,
    setLanguage,
    theme,
    setTheme,
    sessions,
    activeSessionId,
    activeSession,
    createSession,
    deleteSession,
    switchSession,
    renameSession,
    updateSession,
    input,
    setInput,
    loading,
    showResults,
    onSent,
    newChat,
    userProgress: activeSession?.progress ?? 0,
    completedTasks: activeSession?.completedTasks ?? 0,
    srsReviewList: activeSession?.srsReviewList ?? [],
    userMessageCount: currentUserMessageCount,
    isAuthRequired,
    syncStatus,
  };

  return (
    <Context.Provider value={contextValue}>
      <ProgressProvider activeSession={activeSession}>
        <SyncProvider syncStatus={syncStatus}>
          {children}
        </SyncProvider>
      </ProgressProvider>
    </Context.Provider>
  );
};

/**
 * Main context provider that wraps all new contexts
 */
export const ContextProvider = ({ children }: { children: ReactNode }) => {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <SessionProvider>
          <ContextProviderInner>{children}</ContextProviderInner>
        </SessionProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default ContextProvider;

