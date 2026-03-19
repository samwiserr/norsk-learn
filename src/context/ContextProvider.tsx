"use client";

import { ReactNode } from "react";
import { LanguageProvider } from "@/src/context/LanguageContext";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { SessionProvider, useSessionContext } from "@/src/context/SessionContext";
import { ProgressProvider } from "@/src/context/ProgressContext";
import { SyncProvider } from "@/src/context/SyncContext";
import { useSync } from "@/src/hooks/useSync";
import { useAuthCheck } from "@/src/hooks/useAuthCheck";

const SyncAndProgressWrapper = ({ children }: { children: ReactNode }) => {
  const { activeSession, activeSessionId, sessions, updateSession } = useSessionContext();
  const { user } = useAuthCheck();

  const { syncStatus } = useSync(
    user,
    activeSessionId,
    sessions,
    (sessionId: string, session: Parameters<typeof updateSession>[1]) => {
      updateSession(sessionId, session);
    }
  );

  return (
    <ProgressProvider activeSession={activeSession}>
      <SyncProvider syncStatus={syncStatus}>
        {children}
      </SyncProvider>
    </ProgressProvider>
  );
};

export const ContextProvider = ({ children }: { children: ReactNode }) => {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <SessionProvider>
          <SyncAndProgressWrapper>{children}</SyncAndProgressWrapper>
        </SessionProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default ContextProvider;
