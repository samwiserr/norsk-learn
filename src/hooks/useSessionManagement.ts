/**
 * useSessionManagement Hook
 * Manages session CRUD operations
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Session, Message } from "@/lib/sessions";
import { CEFRLevel, isValidCEFRLevel } from "@/lib/cefr";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { SessionService } from "@/src/services/sessionService";
import { StorageService } from "@/src/services/storageService";
import { WELCOME_MESSAGE_DELAY } from "@/lib/constants";

export function useSessionManagement() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    const storedSessions = SessionRepository.getAll();
    setSessions(storedSessions);
    setSessionsLoaded(true);
    if (storedSessions.length > 0) {
      const latest = SessionRepository.getLatest();
      if (latest) {
        setActiveSessionId(latest.id);
        setActiveSession(latest);
      }
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
      const updated = prev.map((session) =>
        session.id === id
          ? { ...session, ...data, updatedAt: Date.now() }
          : session
      );
      SessionRepository.saveAll(updated);
      const current = updated.find((session) => session.id === id);
      if (current && activeSessionId === id) {
        setActiveSession(current);
      }
      return updated;
    });
  }, [activeSessionId, setActiveSession]);

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
  };
}

