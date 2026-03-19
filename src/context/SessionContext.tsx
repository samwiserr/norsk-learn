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
import { Session, Message } from "@/lib/sessions";
import { CEFRLevel, isValidCEFRLevel } from "@/lib/cefr";
import { initializeProgress } from "@/lib/cefr-progress";
import { LanguageCode } from "@/lib/languages";
import { useAuthCheck } from "@/src/hooks/useAuthCheck";
import { useLanguage } from "@/src/hooks/useLanguage";
import { useSync } from "@/src/hooks/useSync";
import { SessionService } from "@/src/services/sessionService";
import { ApiService } from "@/src/services/apiService";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { UserRepository } from "@/src/repositories/userRepository";
import { StorageService } from "@/src/services/storageService";
import { formatTutorAssistantMessage } from "@/src/utils/tutorFormat";
import { AppError, createAppError, getErrorMessage } from "@/lib/error-handling";
import { createLogger } from "@/lib/logger";
import { recordCorrectWord } from "@/lib/vocabulary-tracker";
import {
  AUTH_REQUIRED_MESSAGE_COUNT,
  WELCOME_MESSAGE_DELAY,
  SESSION_STORAGE_KEYS,
  CUSTOM_EVENTS,
} from "@/lib/constants";

const log = createLogger("SessionContext");

// ── State machine types ────────────────────────────────────────────────

type Phase = "loading" | "needLevel" | "ready";

interface SessionState {
  phase: Phase;
  sessions: Session[];
  activeSessionId: string | null;
  cefrLevel: CEFRLevel | null;
  input: string;
  loading: boolean;
  showResults: boolean;
  userMessageCount: number;
  previousLanguage: LanguageCode | null;
  needsWelcome: string | null;
  lastTutorHint: string | null;
  lastUserInput: string | null;
  exerciseScore: number;
  exerciseTurns: number;
}

type Action =
  | { type: "INIT_LOADED"; sessions: Session[]; cefrLevel: CEFRLevel | null }
  | { type: "SET_LEVEL"; level: CEFRLevel }
  | { type: "SET_SESSIONS"; sessions: Session[]; activeId?: string | null }
  | { type: "SET_ACTIVE"; id: string | null }
  | { type: "UPDATE_SESSION"; id: string; data: Partial<Session> }
  | { type: "DELETE_SESSION"; id: string }
  | { type: "SET_INPUT"; value: string }
  | { type: "SEND_START" }
  | { type: "SEND_END" }
  | { type: "SET_SHOW_RESULTS"; value: boolean }
  | { type: "SET_MESSAGE_COUNT"; count: number }
  | { type: "SET_PREVIOUS_LANGUAGE"; lang: LanguageCode }
  | { type: "REQUEST_WELCOME"; sessionId: string }
  | { type: "CLEAR_WELCOME" }
  | { type: "SET_TUTOR_HINT"; hint: string | null }
  | { type: "SET_LAST_USER_INPUT"; input: string | null }
  | { type: "EXERCISE_CORRECT_TURN" }
  | { type: "EXERCISE_INCORRECT_TURN" }
  | { type: "RESET_EXERCISE_SCORE" };

const initialState: SessionState = {
  phase: "loading",
  sessions: [],
  activeSessionId: null,
  cefrLevel: null,
  input: "",
  loading: false,
  showResults: false,
  userMessageCount: 0,
  previousLanguage: null,
  needsWelcome: null,
  lastTutorHint: null,
  lastUserInput: null,
  exerciseScore: 0,
  exerciseTurns: 0,
};

function sessionReducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "INIT_LOADED": {
      const phase: Phase = action.cefrLevel ? "ready" : "needLevel";
      const activeId =
        action.sessions.length > 0
          ? action.sessions.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).id
          : null;
      return {
        ...state,
        phase,
        sessions: action.sessions,
        activeSessionId: activeId,
        cefrLevel: action.cefrLevel,
        showResults: action.sessions.length > 0,
      };
    }
    case "SET_LEVEL":
      return { ...state, phase: "ready", cefrLevel: action.level };
    case "SET_SESSIONS": {
      const activeId = action.activeId !== undefined ? action.activeId : state.activeSessionId;
      return { ...state, sessions: action.sessions, activeSessionId: activeId };
    }
    case "SET_ACTIVE":
      return { ...state, activeSessionId: action.id, showResults: action.id !== null };
    case "UPDATE_SESSION": {
      const exists = state.sessions.some((s) => s.id === action.id);
      if (exists) {
        return {
          ...state,
          sessions: state.sessions.map((s) =>
            s.id === action.id ? { ...s, ...action.data, updatedAt: Date.now() } : s
          ),
        };
      }
      if (action.data && "id" in action.data) {
        return {
          ...state,
          sessions: [...state.sessions, action.data as Session],
        };
      }
      return state;
    }
    case "DELETE_SESSION": {
      const filtered = state.sessions.filter((s) => s.id !== action.id);
      const newActive =
        state.activeSessionId === action.id
          ? filtered.length > 0
            ? filtered.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).id
            : null
          : state.activeSessionId;
      return {
        ...state,
        sessions: filtered,
        activeSessionId: newActive,
        showResults: newActive !== null,
      };
    }
    case "SET_INPUT":
      return { ...state, input: action.value };
    case "SEND_START":
      return { ...state, loading: true, showResults: true };
    case "SEND_END":
      return { ...state, loading: false };
    case "SET_SHOW_RESULTS":
      return { ...state, showResults: action.value };
    case "SET_MESSAGE_COUNT":
      return { ...state, userMessageCount: action.count };
    case "SET_PREVIOUS_LANGUAGE":
      return { ...state, previousLanguage: action.lang };
    case "REQUEST_WELCOME":
      return { ...state, needsWelcome: action.sessionId };
    case "CLEAR_WELCOME":
      return { ...state, needsWelcome: null };
    case "SET_TUTOR_HINT":
      return { ...state, lastTutorHint: action.hint };
    case "SET_LAST_USER_INPUT":
      return { ...state, lastUserInput: action.input };
    case "EXERCISE_CORRECT_TURN":
      return { ...state, exerciseScore: state.exerciseScore + 1, exerciseTurns: state.exerciseTurns + 1 };
    case "EXERCISE_INCORRECT_TURN":
      return { ...state, exerciseTurns: state.exerciseTurns + 1 };
    case "RESET_EXERCISE_SCORE":
      return { ...state, exerciseScore: 0, exerciseTurns: 0 };
    default:
      return state;
  }
}

// ── Context interface ──────────────────────────────────────────────────

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

// ── Provider ───────────────────────────────────────────────────────────

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthCheck();
  const { language: currentLanguage } = useLanguage();
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  const activeSession = state.sessions.find((s) => s.id === state.activeSessionId) ?? null;

  // Persist sessions to storage whenever they change
  useEffect(() => {
    if (state.phase !== "loading") {
      SessionRepository.saveAll(state.sessions);
    }
  }, [state.sessions, state.phase]);

  // Sync
  const { syncSession } = useSync(
    user,
    state.activeSessionId,
    state.sessions,
    (sessionId: string, session: Session) => {
      dispatch({ type: "UPDATE_SESSION", id: sessionId, data: session });
    }
  );

  // ── Effect 1: Initialize from storage ──
  useEffect(() => {
    const storedLevel = StorageService.loadCEFRLevel();
    const level = storedLevel && isValidCEFRLevel(storedLevel) ? (storedLevel as CEFRLevel) : null;
    const sessions = SessionRepository.getAll();

    dispatch({ type: "INIT_LOADED", sessions, cefrLevel: level });

    if (typeof window !== "undefined") {
      const count = UserRepository.getUserMessageCount();
      dispatch({ type: "SET_MESSAGE_COUNT", count });
    }

    if (!level) {
      router.push("/level-selection");
    }
  }, [router]);

  // ── Effect 2: Handle "from level selection" flag ──
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
    dispatch({ type: "SET_SESSIONS", sessions: [session], activeId: session.id });
    dispatch({ type: "SET_SHOW_RESULTS", value: false });
  }, [state.phase, state.cefrLevel]);

  // ── Effect 3: Language change detection ──
  useEffect(() => {
    if (state.phase !== "ready" || !currentLanguage) return;

    if (state.previousLanguage === null) {
      dispatch({ type: "SET_PREVIOUS_LANGUAGE", lang: currentLanguage });
      return;
    }

    if (state.previousLanguage === currentLanguage) return;

    log.info("Language changed", {
      from: state.previousLanguage,
      to: currentLanguage,
    });
    dispatch({ type: "SET_PREVIOUS_LANGUAGE", lang: currentLanguage });

    SessionRepository.clearAll();
    if (state.cefrLevel) {
      const session = SessionService.create(state.cefrLevel);
      dispatch({ type: "SET_SESSIONS", sessions: [session], activeId: session.id });
      dispatch({ type: "SET_SHOW_RESULTS", value: false });
    } else {
      dispatch({ type: "SET_SESSIONS", sessions: [], activeId: null });
    }
  }, [state.phase, currentLanguage, state.previousLanguage, state.cefrLevel]);

  // ── Effect 4: Create initial session if none exist ──
  useEffect(() => {
    if (state.phase !== "ready") return;
    if (state.sessions.length > 0) return;
    if (!state.cefrLevel) return;
    if (typeof window !== "undefined" && window.location.pathname === "/level-selection") return;

    log.info("No sessions exist, creating initial session");
    const session = SessionService.create(state.cefrLevel);
    dispatch({ type: "UPDATE_SESSION", id: session.id, data: session });
    dispatch({ type: "SET_ACTIVE", id: session.id });
  }, [state.phase, state.sessions.length, state.cefrLevel]);

  // ── Effect 5: Generate welcome message when requested ──
  useEffect(() => {
    if (!state.needsWelcome || !state.cefrLevel) return;
    const sessionId = state.needsWelcome;
    dispatch({ type: "CLEAR_WELCOME" });

    const timer = setTimeout(async () => {
      const welcomeMessage = await SessionService.generateWelcomeMessage(
        sessionId,
        state.cefrLevel!,
        currentLanguage
      );
      if (welcomeMessage) {
        const session = state.sessions.find((s) => s.id === sessionId);
        if (session) {
          dispatch({
            type: "UPDATE_SESSION",
            id: sessionId,
            data: { messages: [welcomeMessage], messageCount: 1 },
          });
          dispatch({ type: "SET_SHOW_RESULTS", value: true });
        }
      }
    }, WELCOME_MESSAGE_DELAY);

    return () => clearTimeout(timer);
  }, [state.needsWelcome, state.cefrLevel, currentLanguage, state.sessions]);

  // ── Actions ──────────────────────────────────────────────────────────

  const setCefrLevel = useCallback((level: CEFRLevel) => {
    StorageService.saveCEFRLevel(level);
    dispatch({ type: "SET_LEVEL", level });
  }, []);

  const createSession = useCallback(() => {
    let level = state.cefrLevel;
    if (!level) {
      const stored = StorageService.loadCEFRLevel();
      if (stored && isValidCEFRLevel(stored)) {
        level = stored as CEFRLevel;
        dispatch({ type: "SET_LEVEL", level });
      }
    }
    if (!level) {
      router.push("/level-selection");
      return;
    }

    const emptySession = SessionService.findEmptySession(level);
    if (emptySession) {
      dispatch({ type: "SET_ACTIVE", id: emptySession.id });
      return;
    }

    const session = SessionService.create(level);
    dispatch({ type: "UPDATE_SESSION", id: session.id, data: session });
    dispatch({ type: "SET_ACTIVE", id: session.id });
  }, [state.cefrLevel, router]);

  const deleteSession = useCallback((id: string) => {
    SessionRepository.delete(id);
    dispatch({ type: "DELETE_SESSION", id });
  }, []);

  const switchSession = useCallback((id: string) => {
    dispatch({ type: "SET_ACTIVE", id });
  }, []);

  const renameSession = useCallback((id: string, title: string) => {
    dispatch({ type: "UPDATE_SESSION", id, data: { title } });
  }, []);

  const updateSession = useCallback(
    (id: string, data: Partial<Session>) => {
      dispatch({ type: "UPDATE_SESSION", id, data });
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
    dispatch({ type: "SET_INPUT", value });
  }, []);

  const onSent = useCallback(
    async (overrideInput?: string) => {
      const effectiveInput = (overrideInput ?? state.input).trim();
      if (!effectiveInput || !activeSession) return;

      const currentCount = UserRepository.getUserMessageCount();
      if (currentCount >= AUTH_REQUIRED_MESSAGE_COUNT && !isAuthenticated) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(CUSTOM_EVENTS.AUTH_REQUIRED));
        }
        return;
      }

      const newCount = UserRepository.incrementUserMessageCount();
      dispatch({ type: "SET_MESSAGE_COUNT", count: newCount });

      const sessionLevel = activeSession.cefrLevel || state.cefrLevel || StorageService.loadCEFRLevel();
      if (!sessionLevel || !isValidCEFRLevel(sessionLevel)) {
        log.error("Cannot send message: invalid level");
        return;
      }

      const userMessage: Message = {
        id: `msg_${Date.now()}_user`,
        role: "user",
        content: effectiveInput,
        timestamp: Date.now(),
      };

      const originalMessages = activeSession.messages;
      const messagesWithUser = [...originalMessages, userMessage];
      const placeholder: Message = {
        id: `msg_${Date.now()}_assistant_placeholder`,
        role: "assistant-streaming",
        content: "",
        timestamp: Date.now(),
      };

      updateSession(activeSession.id, {
        messages: [...messagesWithUser, placeholder],
        messageCount: messagesWithUser.length + 1,
      });
      dispatch({ type: "SET_INPUT", value: "" });
      dispatch({ type: "SEND_START" });
      dispatch({ type: "SET_LAST_USER_INPUT", input: effectiveInput });

      try {
        const sessionMode = activeSession.exerciseMode ?? undefined;
        const sessionTopic = activeSession.topicId ?? undefined;

        const data = await ApiService.sendMessage(
          effectiveInput,
          sessionLevel,
          activeSession.progress ?? 0,
          currentLanguage,
          originalMessages,
          sessionMode,
          sessionTopic,
        );

        if (data.hint) {
          dispatch({ type: "SET_TUTOR_HINT", hint: data.hint });
        }

        // Record vocabulary from topic practice to the tracker
        if (Array.isArray(data.vocabIntroduced)) {
          for (const v of data.vocabIntroduced) {
            if (typeof v?.word === "string") {
              recordCorrectWord(v.word, v.translation);
            }
          }
        }

        const hasMustFix = Array.isArray(data.fixes) && data.fixes.some((f: any) => f?.severity === "must_fix");
        dispatch({ type: hasMustFix ? "EXERCISE_INCORRECT_TURN" : "EXERCISE_CORRECT_TURN" });

        const assistantContent = formatTutorAssistantMessage(data, currentLanguage);
        const assistantMessage: Message = {
          id: placeholder.id,
          role: "assistant",
          content: assistantContent.trim(),
          timestamp: Date.now(),
        };

        const finalMessages = [...messagesWithUser, assistantMessage];
        const delta = data.progressDelta ?? 0;
        const updated = SessionService.updateProgress(activeSession, delta);
        const titled = SessionService.updateTitle(updated, sessionLevel);

        updateSession(activeSession.id, {
          ...titled,
          messages: finalMessages,
          messageCount: finalMessages.length,
          completedTasks: activeSession.completedTasks + 1,
        });
      } catch (error) {
        log.error("Error sending message", error);
        const appError = error instanceof AppError ? error : createAppError(error);
        const errorMsg: Message = {
          id: placeholder.id,
          role: "assistant",
          content: getErrorMessage(appError, currentLanguage),
          timestamp: Date.now(),
        };
        updateSession(activeSession.id, {
          messages: [...messagesWithUser, errorMsg],
          messageCount: messagesWithUser.length + 1,
        });
      } finally {
        dispatch({ type: "SEND_END" });
      }
    },
    [state.input, activeSession, state.cefrLevel, currentLanguage, updateSession, isAuthenticated]
  );

  const setExerciseMode = useCallback(async (mode: string, topicId?: string) => {
    if (!activeSession || !state.cefrLevel) return;

    const MODE_TITLES: Record<string, string> = {
      free_conversation: "Free Conversation",
      translation: "Translation Practice",
      grammar_drill: "Grammar Drill",
      topic_practice: "Topic Practice",
    };
    const title = topicId
      ? `${MODE_TITLES[mode] ?? mode}: ${topicId.replace(/_/g, " ")}`
      : MODE_TITLES[mode] ?? mode;

    updateSession(activeSession.id, {
      exerciseMode: mode,
      topicId: topicId ?? undefined,
      title,
    });

    dispatch({ type: "RESET_EXERCISE_SCORE" });
    dispatch({ type: "SET_TUTOR_HINT", hint: null });

    const placeholder: Message = {
      id: `msg_${Date.now()}_mode_opener`,
      role: "assistant-streaming",
      content: "",
      timestamp: Date.now(),
    };
    updateSession(activeSession.id, {
      exerciseMode: mode,
      topicId: topicId ?? undefined,
      title,
      messages: [placeholder],
      messageCount: 1,
    });
    dispatch({ type: "SET_SHOW_RESULTS", value: true });
    dispatch({ type: "SEND_START" });

    try {
      const data = await ApiService.sendMessage(
        "[EXERCISE_START]",
        state.cefrLevel,
        activeSession.progress ?? 0,
        currentLanguage,
        [],
        mode,
        topicId,
      );

      if (data.hint) {
        dispatch({ type: "SET_TUTOR_HINT", hint: data.hint });
      }
      if (Array.isArray(data.vocabIntroduced)) {
        for (const v of data.vocabIntroduced) {
          if (typeof v?.word === "string") {
            recordCorrectWord(v.word, v.translation);
          }
        }
      }

      const content = formatTutorAssistantMessage(data, currentLanguage);
      const openerMsg: Message = {
        id: placeholder.id,
        role: "assistant",
        content: content.trim(),
        timestamp: Date.now(),
      };
      updateSession(activeSession.id, {
        messages: [openerMsg],
        messageCount: 1,
      });
    } catch (error) {
      log.error("Error generating exercise opener", error);
      const appError = error instanceof AppError ? error : createAppError(error);
      const fallback: Message = {
        id: placeholder.id,
        role: "assistant",
        content: getErrorMessage(appError, currentLanguage),
        timestamp: Date.now(),
      };
      updateSession(activeSession.id, {
        messages: [fallback],
        messageCount: 1,
      });
    } finally {
      dispatch({ type: "SEND_END" });
    }
  }, [activeSession, state.cefrLevel, currentLanguage, updateSession]);

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
    dispatch({ type: "SET_SHOW_RESULTS", value: false });
    dispatch({ type: "SET_INPUT", value: "" });
    dispatch({ type: "RESET_EXERCISE_SCORE" });
    dispatch({ type: "SET_TUTOR_HINT", hint: null });
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
