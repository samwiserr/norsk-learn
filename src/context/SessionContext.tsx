"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Session } from "@/lib/sessions";
import { CEFRLevel, isValidCEFRLevel } from "@/lib/cefr";
import { initializeProgress } from "@/lib/cefr-progress";
import { useAuthCheck } from "@/src/hooks/useAuthCheck";
import { useLanguage } from "@/src/hooks/useLanguage";
import { useSync } from "@/src/hooks/useSync";
import { SessionService } from "@/src/services/sessionService";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { UserRepository } from "@/src/repositories/userRepository";
import { StorageService } from "@/src/services/storageService";
import { createLogger } from "@/lib/logger";
import {
  AUTH_REQUIRED_MESSAGE_COUNT,
  WELCOME_MESSAGE_DELAY,
  SESSION_STORAGE_KEYS,
} from "@/lib/constants";
import {
  sessionReducer,
  initialSessionState,
  sessionActions,
  selectActiveSession,
} from "@/src/context/session";
import { sendTutorMessage, startExercise } from "@/src/application/tutoring";
import { ApiService } from "@/src/services/apiService";

const log = createLogger("SessionContext");

export interface SessionContextValue {
  sessions: Session[];
  activeSessionId: string | null;
  activeSession: Session | null;
  sessionsLoaded: boolean;
  createSession: () => void;
  deleteSession: (id: string) => void;
  switchSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  updateSession: (id: string, data: Partial<Session>) => void;
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  showResults: boolean;
  onSent: (overrideInput?: string) => Promise<void>;
  newChat: () => void;
  userMessageCount: number;
  isAuthRequired: boolean;
  cefrLevel: CEFRLevel | null;
  setCefrLevel: (level: CEFRLevel) => void;
  levelLoaded: boolean;
  exerciseMode: string | null;
  topicId: string | null;
  setExerciseMode: (mode: string, topicId?: string) => void;
  lastTutorHint: string | null;
  retryLastMessage: () => void;
  exerciseScore: number;
  exerciseTurns: number;
}

const SessionContext = createContext<SessionContextValue>({} as SessionContextValue);

export const useSessionContext = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessionContext must be used within SessionProvider");
  return ctx;
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthCheck();
  const { language: currentLanguage } = useLanguage();
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);

  const activeSession = selectActiveSession(state);

  useEffect(() => {
    if (state.phase !== "loading") {
      SessionRepository.saveAll(state.sessions);
    }
  }, [state.sessions, state.phase]);

  const { syncSession } = useSync(
    user,
    state.activeSessionId,
    state.sessions,
    (sessionId: string, session: Session) => {
      dispatch(sessionActions.updateSession(sessionId, session));
    }
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const storedLevel = StorageService.loadCEFRLevel();
      const level =
        storedLevel && isValidCEFRLevel(storedLevel) ? (storedLevel as CEFRLevel) : null;
      let sessions = SessionRepository.getAll();

      // Prefer server snapshot when bundle updatedAt is newer than local (deterministic merge).
      let preferredActiveSessionId: string | null | undefined = undefined;
      if (typeof window !== "undefined") {
        const localBundleAt =
          StorageService.loadSessionBundleUpdatedAt() ||
          sessions.reduce((max, s) => Math.max(max, s.updatedAt), 0);
        const restored = await ApiService.tryRestoreServerSessionSnapshot();
        if (!cancelled && restored && restored.sessions.length > 0) {
          const remoteBundleAt = restored.snapshotUpdatedAt;

          if (remoteBundleAt > localBundleAt) {
            sessions = restored.sessions;
            preferredActiveSessionId = restored.activeSessionId;
            SessionRepository.saveAll(restored.sessions);
            StorageService.saveSessionBundleUpdatedAt(remoteBundleAt);
          }
        } else if (!cancelled && sessions.length > 0 && localBundleAt === 0) {
          StorageService.saveSessionBundleUpdatedAt(
            sessions.reduce((max, s) => Math.max(max, s.updatedAt), 0) || Date.now()
          );
        }
      }

      dispatch(sessionActions.initLoaded(sessions, level, preferredActiveSessionId));

      if (typeof window !== "undefined") {
        const count = UserRepository.getUserMessageCount();
        dispatch(sessionActions.setMessageCount(count));
      }

      if (!level) {
        router.push("/level-selection");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (state.phase !== "ready") return;
    if (typeof window === "undefined") return;
    const handle = window.setTimeout(() => {
      void ApiService.syncSessionSnapshotToServer(state.sessions, state.activeSessionId);
    }, 2500);
    return () => clearTimeout(handle);
  }, [state.sessions, state.activeSessionId, state.phase]);

  useEffect(() => {
    if (state.phase !== "ready" || !state.cefrLevel) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/level-selection") return;

    const flag = sessionStorage.getItem(SESSION_STORAGE_KEYS.FROM_LEVEL_SELECTION);
    if (flag !== "true") return;

    sessionStorage.removeItem(SESSION_STORAGE_KEYS.FROM_LEVEL_SELECTION);
    log.info("Arrived from level selection, creating fresh session");

    SessionRepository.clearAll();
    const session = SessionService.create(state.cefrLevel);
    dispatch(sessionActions.setSessions([session], session.id));
    dispatch(sessionActions.setShowResults(false));
  }, [state.phase, state.cefrLevel]);

  useEffect(() => {
    if (state.phase !== "ready" || !currentLanguage) return;

    if (state.previousLanguage === null) {
      dispatch(sessionActions.setPreviousLanguage(currentLanguage));
      return;
    }

    if (state.previousLanguage === currentLanguage) return;

    log.info("Language changed", {
      from: state.previousLanguage,
      to: currentLanguage,
    });
    dispatch(sessionActions.setPreviousLanguage(currentLanguage));

    SessionRepository.clearAll();
    if (state.cefrLevel) {
      const session = SessionService.create(state.cefrLevel);
      dispatch(sessionActions.setSessions([session], session.id));
      dispatch(sessionActions.setShowResults(false));
    } else {
      dispatch(sessionActions.setSessions([], null));
    }
  }, [state.phase, currentLanguage, state.previousLanguage, state.cefrLevel]);

  useEffect(() => {
    if (state.phase !== "ready") return;
    if (state.sessions.length > 0) return;
    if (!state.cefrLevel) return;
    if (typeof window !== "undefined" && window.location.pathname === "/level-selection") return;

    log.info("No sessions exist, creating initial session");
    const session = SessionService.create(state.cefrLevel);
    dispatch(sessionActions.updateSession(session.id, session));
    dispatch(sessionActions.setActive(session.id));
  }, [state.phase, state.sessions.length, state.cefrLevel]);

  useEffect(() => {
    if (!state.needsWelcome || !state.cefrLevel) return;
    const sessionId = state.needsWelcome;
    dispatch(sessionActions.clearWelcome());

    const timer = setTimeout(async () => {
      const welcomeMessage = await SessionService.generateWelcomeMessage(
        sessionId,
        state.cefrLevel!,
        currentLanguage
      );
      if (welcomeMessage) {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          dispatch(
            sessionActions.updateSession(sessionId, {
              messages: [welcomeMessage],
              messageCount: 1,
            })
          );
          dispatch(sessionActions.setShowResults(true));
        }
      }
    }, WELCOME_MESSAGE_DELAY);

    return () => clearTimeout(timer);
  }, [state.needsWelcome, state.cefrLevel, currentLanguage, state.sessions]);

  const setCefrLevel = useCallback((level: CEFRLevel) => {
    StorageService.saveCEFRLevel(level);
    dispatch(sessionActions.setLevel(level));
  }, []);

  const createSession = useCallback(() => {
    let level = state.cefrLevel;
    if (!level) {
      const stored = StorageService.loadCEFRLevel();
      if (stored && isValidCEFRLevel(stored)) {
        level = stored as CEFRLevel;
        dispatch(sessionActions.setLevel(level));
      }
    }
    if (!level) {
      router.push("/level-selection");
      return;
    }

    const emptySession = SessionService.findEmptySession(level);
    if (emptySession) {
      dispatch(sessionActions.setActive(emptySession.id));
      return;
    }

    const session = SessionService.create(level);
    dispatch(sessionActions.updateSession(session.id, session));
    dispatch(sessionActions.setActive(session.id));
  }, [state.cefrLevel, router]);

  const deleteSession = useCallback((id: string) => {
    SessionRepository.delete(id);
    dispatch(sessionActions.deleteSession(id));
  }, []);

  const switchSession = useCallback((id: string) => {
    dispatch(sessionActions.setActive(id));
  }, []);

  const renameSession = useCallback((id: string, title: string) => {
    dispatch(sessionActions.updateSession(id, { title }));
  }, []);

  const updateSession = useCallback(
    (id: string, data: Partial<Session>) => {
      dispatch(sessionActions.updateSession(id, data));
      if (user) {
        const session = SessionRepository.getById(id);
        if (session) {
          syncSession({ ...session, ...data, updatedAt: Date.now() } as Session);
        }
      }
    },
    [user, syncSession]
  );

  const setInput = useCallback((value: string) => {
    dispatch(sessionActions.setInput(value));
  }, []);

  const onSent = useCallback(
    async (overrideInput?: string) => {
      const effectiveInput = (overrideInput ?? state.input).trim();
      if (!effectiveInput || !activeSession) return;

      await sendTutorMessage(
        { dispatch, updateSession },
        {
          effectiveInput,
          activeSession,
          cefrLevel: state.cefrLevel,
          currentLanguage,
          isAuthenticated,
        }
      );
    },
    [state.input, activeSession, state.cefrLevel, currentLanguage, updateSession, isAuthenticated]
  );

  const setExerciseMode = useCallback(
    async (mode: string, topicId?: string) => {
      if (!activeSession || !state.cefrLevel) return;

      await startExercise(
        { dispatch, updateSession },
        {
          mode,
          topicId,
          activeSession,
          cefrLevel: state.cefrLevel,
          currentLanguage,
        }
      );
    },
    [activeSession, state.cefrLevel, currentLanguage, updateSession]
  );

  const retryLastMessage = useCallback(() => {
    if (state.lastUserInput) {
      onSent(state.lastUserInput);
    }
  }, [state.lastUserInput, onSent]);

  const newChat = useCallback(() => {
    if (!activeSession || !state.cefrLevel) return;
    const initial = initializeProgress(state.cefrLevel);
    updateSession(activeSession.id, {
      messages: [],
      messageCount: 0,
      completedTasks: 0,
      progress: initial,
      exerciseMode: undefined,
      topicId: undefined,
      title: "New Conversation",
    });
    dispatch(sessionActions.setShowResults(false));
    dispatch(sessionActions.setInput(""));
    dispatch(sessionActions.resetExerciseScore());
    dispatch(sessionActions.setTutorHint(null));
  }, [activeSession, state.cefrLevel, updateSession]);

  const contextValue: SessionContextValue = {
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    activeSession,
    sessionsLoaded: state.phase !== "loading",
    createSession,
    deleteSession,
    switchSession,
    renameSession,
    updateSession,
    input: state.input,
    setInput,
    loading: state.loading,
    showResults: state.showResults,
    onSent,
    newChat,
    userMessageCount: state.userMessageCount,
    isAuthRequired: state.userMessageCount >= AUTH_REQUIRED_MESSAGE_COUNT && !isAuthenticated,
    cefrLevel: state.cefrLevel,
    setCefrLevel,
    levelLoaded: state.phase !== "loading",
    exerciseMode: activeSession?.exerciseMode ?? null,
    topicId: activeSession?.topicId ?? null,
    setExerciseMode,
    lastTutorHint: state.lastTutorHint,
    retryLastMessage,
    exerciseScore: state.exerciseScore,
    exerciseTurns: state.exerciseTurns,
  };

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
};
