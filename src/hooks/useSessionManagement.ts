/**
 * useSessionManagement Hook
 * Manages session CRUD operations
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Session } from "@/lib/sessions";
import { CEFRLevel, isValidCEFRLevel } from "@/lib/cefr";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { SessionService } from "@/src/services/sessionService";
import { StorageService } from "@/src/services/storageService";
import { WELCOME_MESSAGE_DELAY } from "@/lib/constants";
import { createLogger } from "@/lib/logger";

const log = createLogger("SessionManagement");

export function useSessionManagement() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  // Track previous language to detect changes
  // Initialize from sessionStorage to persist across page reloads
  const previousLanguageRef = useRef<string | null>(
    typeof window !== "undefined"
      ? sessionStorage.getItem("norsk_previous_language")
      : null
  );

  // Load sessions on mount and when language changes
  useEffect(() => {
    const currentLanguage = typeof window !== "undefined" 
      ? StorageService.loadLanguage() 
      : null;
    
    // Get previous language from sessionStorage (persists across page reloads)
    const previousLanguage = typeof window !== "undefined"
      ? sessionStorage.getItem("norsk_previous_language")
      : previousLanguageRef.current;
    
    // Check if language changed (compare with stored previous language)
    const languageChanged = previousLanguage !== null && 
                            previousLanguage !== currentLanguage &&
                            currentLanguage !== null;
    
    if (languageChanged) {
      log.info("Language changed detected, clearing sessions", {
        previousLanguage,
        currentLanguage,
        sessionCount: SessionRepository.getAll().length,
      });
      // Language changed - clear all sessions
      SessionRepository.clearAll();
      setSessions([]);
      setActiveSessionId(null);
      setActiveSession(null);
      
      // Update stored previous language
      if (typeof window !== "undefined") {
        sessionStorage.setItem("norsk_previous_language", currentLanguage);
      }
      previousLanguageRef.current = currentLanguage;
      setSessionsLoaded(true);
      return;
    }
    
    // Normal load - update stored previous language if not set
    if (typeof window !== "undefined" && currentLanguage) {
      if (!sessionStorage.getItem("norsk_previous_language")) {
        sessionStorage.setItem("norsk_previous_language", currentLanguage);
      }
    }
    
    // Normal load
    const storedSessions = SessionRepository.getAll();
    log.debug("Loading sessions on mount", {
      count: storedSessions.length,
      sessionIds: storedSessions.map(s => s.id),
      sessionTitles: storedSessions.map(s => s.title),
      currentLanguage,
      previousLanguage,
    });
    setSessions(storedSessions);
    setSessionsLoaded(true);
    previousLanguageRef.current = currentLanguage;
    
    if (storedSessions.length > 0) {
      const latest = SessionRepository.getLatest();
      if (latest) {
        log.debug("Setting latest session as active", { sessionId: latest.id });
        setActiveSessionId(latest.id);
        setActiveSession(latest);
      }
    } else {
      log.debug("No sessions found, starting fresh");
    }
  }, []);

  // Update active session when activeSessionId or sessions change
  useEffect(() => {
    if (!sessionsLoaded) return;

    if (!activeSessionId) {
      if (sessions.length > 0) {
        const latest = SessionRepository.getLatest();
        if (latest) {
          setActiveSessionId(latest.id);
          setActiveSession(latest);
        }
      } else {
        setActiveSession(null);
      }
      return;
    }

    const session = sessions.find((s) => s.id === activeSessionId);
    if (session) {
      setActiveSession(session);
    } else {
      if (sessions.length > 0) {
        const latest = SessionRepository.getLatest();
        if (latest) {
          setActiveSessionId(latest.id);
          setActiveSession(latest);
        }
      } else {
        setActiveSessionId(null);
        setActiveSession(null);
      }
    }
  }, [activeSessionId, sessions, sessionsLoaded, setActiveSessionId]);

  const createSession = useCallback(
    (cefrLevel: CEFRLevel | null, language: string, generateWelcome?: (sessionId: string, level: CEFRLevel, lang: string) => Promise<void>) => {
      let level = cefrLevel;
      if (!level) {
        const stored = StorageService.loadCEFRLevel();
        if (stored && isValidCEFRLevel(stored)) {
          level = stored;
        }
      }
      if (!level) {
        router.push("/level-selection");
        return;
      }

      // Check if there's already an empty conversation
      const emptySession = SessionService.findEmptySession(level);
      if (emptySession) {
        setActiveSessionId(emptySession.id);
        setActiveSession(emptySession);
        if (emptySession.messages.length === 0 && generateWelcome) {
          setTimeout(() => generateWelcome(emptySession.id, level!, language), WELCOME_MESSAGE_DELAY);
        }
        return;
      }

      // Create new session
      const session = SessionService.create(level);
      setSessions((prev) => {
        const updated = [...prev, session];
        SessionRepository.saveAll(updated);
        return updated;
      });
      setActiveSessionId(session.id);
      setActiveSession(session);
      if (generateWelcome) {
        setTimeout(() => generateWelcome(session.id, level!, language), WELCOME_MESSAGE_DELAY);
      }
    },
    [router]
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((session) => session.id !== id);
      SessionRepository.saveAll(remaining);

      if (activeSessionId === id) {
        if (remaining.length > 0) {
          setActiveSessionId(null);
        } else {
          setActiveSessionId(null);
          setActiveSession(null);
        }
      }

      return remaining;
    });
  }, [activeSessionId]);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const renameSession = useCallback(
    (id: string, title: string) => {
      updateSession(id, { title });
    },
    []
  );

  const updateSession = useCallback((id: string, data: Partial<Session>) => {
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === id);
      let updated: Session[];
      
      if (existing) {
        // Update existing session
        updated = prev.map((session) =>
          session.id === id
            ? { ...session, ...data, updatedAt: Date.now() }
            : session
        );
      } else {
        // Add new session if it doesn't exist
        const newSession = { ...data, id, updatedAt: Date.now() } as Session;
        updated = [...prev, newSession];
      }
      
      SessionRepository.saveAll(updated);
      const current = updated.find((session) => session.id === id);
      if (current && activeSessionId === id) {
        setActiveSession(current);
      }
      return updated;
    });
  }, [activeSessionId, setActiveSession]);

  const replaceAllSessions = useCallback((newSessions: Session[]) => {
    log.info("Replacing all sessions", {
      oldCount: sessions.length,
      newCount: newSessions.length,
      newSessionIds: newSessions.map(s => s.id),
    });
    setSessions(newSessions);
    SessionRepository.saveAll(newSessions);
    if (newSessions.length > 0) {
      const latest = [...newSessions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (latest) {
        setActiveSessionId(latest.id);
        setActiveSession(latest);
      } else {
        setActiveSessionId(null);
        setActiveSession(null);
      }
    } else {
      setActiveSessionId(null);
      setActiveSession(null);
    }
  }, [sessions]);

  return {
    sessions,
    activeSessionId,
    activeSession,
    sessionsLoaded,
    createSession,
    deleteSession,
    switchSession,
    renameSession,
    updateSession,
    setActiveSessionId,
    replaceAllSessions,
  };
}

