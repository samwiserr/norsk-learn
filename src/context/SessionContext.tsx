/**
 * Session Context
 * Manages all session-related state and operations
 * This is the most complex context, handling sessions, messages, and chat interactions
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Session, Message, generateSessionTitleFromMessages } from "@/lib/sessions";
import { CEFRLevel, isValidCEFRLevel } from "@/lib/cefr";
import { initializeProgress, clampProgress } from "@/lib/cefr-progress";
import { LanguageCode, isValidLanguageCode } from "@/lib/languages";
import { useSessionManagement } from "@/src/hooks/useSessionManagement";
import { useAuthCheck } from "@/src/hooks/useAuthCheck";
import { useLanguage } from "@/src/hooks/useLanguage";
import { useSync } from "@/src/hooks/useSync";
import { SessionService } from "@/src/services/sessionService";
import { ApiService } from "@/src/services/apiService";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { UserRepository } from "@/src/repositories/userRepository";
import { StorageService } from "@/src/services/storageService";
import { AppError, ErrorType, createAppError, getErrorMessage } from "@/lib/error-handling";
import {
  AUTH_REQUIRED_MESSAGE_COUNT,
  WELCOME_MESSAGE_DELAY,
  SESSION_STORAGE_KEYS,
  CUSTOM_EVENTS,
} from "@/lib/constants";

interface SessionContextValue {
  // Session state
  sessions: Session[];
  activeSessionId: string | null;
  activeSession: Session | null;
  sessionsLoaded: boolean;
  
  // Session operations
  createSession: () => void;
  deleteSession: (id: string) => void;
  switchSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  updateSession: (id: string, data: Partial<Session>) => void;
  
  // Chat state
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  showResults: boolean;
  
  // Chat operations
  onSent: () => Promise<void>;
  newChat: () => void;
  
  // User state
  userMessageCount: number;
  isAuthRequired: boolean;
  
  // CEFR Level
  cefrLevel: CEFRLevel | null;
  setCefrLevel: (level: CEFRLevel) => void;
  levelLoaded: boolean;
}

const SessionContext = createContext<SessionContextValue>({} as SessionContextValue);

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within SessionProvider");
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider = ({ children }: SessionProviderProps) => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthCheck();
  const { language: currentLanguage } = useLanguage();
  
  const [cefrLevel, setCefrLevelState] = useState<CEFRLevel | null>(null);
  const [levelLoaded, setLevelLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  
  const previousLevelRef = useRef<CEFRLevel | null>(null);
  const previousLanguageRef = useRef<LanguageCode | null>(null);
  const isInitialLoadRef = useRef(true);
  
  const {
    sessions,
    activeSessionId,
    activeSession,
    sessionsLoaded,
    createSession: createSessionBase,
    deleteSession: deleteSessionBase,
    switchSession: switchSessionBase,
    renameSession: renameSessionBase,
    updateSession: updateSessionBase,
    setActiveSessionId,
  } = useSessionManagement();

  // Sync functionality
  const { syncStatus, syncSession } = useSync(
    user,
    activeSessionId,
    sessions,
    (sessionId: string, session: Session) => {
      updateSessionBase(sessionId, session);
    }
  );

  // Load CEFR level on mount
  useEffect(() => {
    const stored = StorageService.loadCEFRLevel();
    if (stored && isValidCEFRLevel(stored)) {
      setCefrLevelState(stored);
      setLevelLoaded(true);
    } else {
      setLevelLoaded(true);
      router.push("/level-selection");
    }
  }, [router]);

  // Load user message count on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const count = UserRepository.getUserMessageCount();
      setUserMessageCount(count);
    }
  }, []);

  // Set CEFR level with persistence
  const setCefrLevel = useCallback((level: CEFRLevel) => {
    setCefrLevelState(level);
    StorageService.saveCEFRLevel(level);
  }, []);

  // Generate welcome message
  const generateWelcomeMessage = useCallback(
    async (sessionId: string, level: CEFRLevel, overrideLanguage?: LanguageCode) => {
      const languageToUse = overrideLanguage || currentLanguage;
      const welcomeMessage = await SessionService.generateWelcomeMessage(
        sessionId,
        level,
        languageToUse
      );

      if (welcomeMessage) {
        const session = SessionRepository.getById(sessionId);
        if (session) {
          const updated: Session = {
            ...session,
            messages: [welcomeMessage],
            messageCount: 1,
            updatedAt: Date.now(),
          };
          updateSessionBase(sessionId, updated);
          if (activeSessionId === sessionId) {
            setShowResults(true);
          }
        }
      }
    },
    [currentLanguage, activeSessionId, updateSessionBase]
  );

  // Handle active session changes
  useEffect(() => {
    if (!sessionsLoaded) return;

    if (!activeSessionId) {
      if (sessions.length > 0) {
        const latest = SessionRepository.getLatest();
        if (latest) {
          setActiveSessionId(latest.id);
          setShowResults(true);
        }
      } else {
        setShowResults(false);
      }
      return;
    }

    const session = sessions.find((s) => s.id === activeSessionId);
    if (session) {
      setShowResults(true);
      if (session.messages.length === 0 && cefrLevel) {
        setTimeout(() => generateWelcomeMessage(session.id, cefrLevel), WELCOME_MESSAGE_DELAY);
      }
    } else {
      if (sessions.length > 0) {
        const latest = SessionRepository.getLatest();
        if (latest) {
          setActiveSessionId(latest.id);
          setShowResults(true);
        }
      } else {
        setActiveSessionId(null);
        setShowResults(false);
      }
    }
  }, [activeSessionId, sessions, cefrLevel, generateWelcomeMessage, sessionsLoaded, setActiveSessionId]);

  // Handle level changes and create sessions
  useEffect(() => {
    if (!levelLoaded || !sessionsLoaded) return;

    const fromLevelSelection =
      typeof window !== "undefined" &&
      sessionStorage.getItem(SESSION_STORAGE_KEYS.FROM_LEVEL_SELECTION) === "true";

    const storedLevel = typeof window !== "undefined"
      ? StorageService.loadCEFRLevel()
      : null;
    const effectiveLevel =
      fromLevelSelection && storedLevel && isValidCEFRLevel(storedLevel)
        ? (storedLevel as CEFRLevel)
        : cefrLevel;

    if (!effectiveLevel) return;

    if (isInitialLoadRef.current) {
      previousLevelRef.current = effectiveLevel;
      previousLanguageRef.current = currentLanguage;
      isInitialLoadRef.current = false;

      if (sessions.length === 0) {
        const session = SessionService.create(effectiveLevel);
        updateSessionBase(session.id, session);
        setActiveSessionId(session.id);
        setShowResults(true);
        setTimeout(() => generateWelcomeMessage(session.id, effectiveLevel), WELCOME_MESSAGE_DELAY);
      }

      if (effectiveLevel !== cefrLevel && effectiveLevel) {
        setCefrLevelState(effectiveLevel);
      }
      return;
    }

    const levelChanged = previousLevelRef.current && previousLevelRef.current !== effectiveLevel;
    const storedLanguage =
      typeof window !== "undefined" ? StorageService.loadLanguage() : currentLanguage;
    const currentLang =
      storedLanguage && isValidLanguageCode(storedLanguage) ? storedLanguage : currentLanguage;
    const languageChanged =
      previousLanguageRef.current && previousLanguageRef.current !== currentLang;
    const shouldCreateFromLevelSelection = fromLevelSelection && !isInitialLoadRef.current;

    if (currentLang !== currentLanguage && isValidLanguageCode(currentLang)) {
      // Language will be updated by LanguageContext
    }

    if (levelChanged || shouldCreateFromLevelSelection) {
      const currentLevel = effectiveLevel;
      if (!currentLevel || !isValidCEFRLevel(currentLevel)) {
        return;
      }

      const session = SessionService.create(currentLevel);
      updateSessionBase(session.id, session);
      setActiveSessionId(session.id);
      setShowResults(true);
      setTimeout(() => {
        generateWelcomeMessage(session.id, currentLevel, currentLang);
      }, WELCOME_MESSAGE_DELAY);

      previousLevelRef.current = currentLevel;
      previousLanguageRef.current = currentLang;

      if (currentLevel !== cefrLevel) {
        setCefrLevelState(currentLevel);
      }

      if (fromLevelSelection && typeof window !== "undefined") {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.FROM_LEVEL_SELECTION);
      }
    } else {
      if (previousLevelRef.current === null) {
        previousLevelRef.current = effectiveLevel;
      }
      if (previousLanguageRef.current === null) {
        previousLanguageRef.current = currentLang || currentLanguage;
      } else if (languageChanged && !fromLevelSelection) {
        previousLanguageRef.current = currentLang || currentLanguage;
      }
      if (effectiveLevel !== cefrLevel && effectiveLevel) {
        setCefrLevelState(effectiveLevel);
      }
      if (fromLevelSelection && typeof window !== "undefined") {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.FROM_LEVEL_SELECTION);
      }
    }
  }, [
    cefrLevel,
    currentLanguage,
    levelLoaded,
    sessionsLoaded,
    generateWelcomeMessage,
    sessions,
    activeSession,
    updateSessionBase,
    setActiveSessionId,
  ]);

  // Dedicated check for level selection flag
  useEffect(() => {
    if (!levelLoaded || !sessionsLoaded || isInitialLoadRef.current) return;

    const checkFlag = () => {
      if (typeof window !== "undefined") {
        const flag = sessionStorage.getItem(SESSION_STORAGE_KEYS.FROM_LEVEL_SELECTION);
        if (flag === "true") {
          const storedLevel = StorageService.loadCEFRLevel();
          const storedLanguage = StorageService.loadLanguage();
          const currentLevel =
            storedLevel && isValidCEFRLevel(storedLevel) ? storedLevel : cefrLevel;
          const currentLang =
            storedLanguage && isValidLanguageCode(storedLanguage)
              ? storedLanguage
              : currentLanguage;

          if (currentLevel && isValidCEFRLevel(currentLevel)) {
            const session = SessionService.create(currentLevel);
            updateSessionBase(session.id, session);
            setActiveSessionId(session.id);
            setShowResults(true);
            setTimeout(() => {
              generateWelcomeMessage(session.id, currentLevel, currentLang);
            }, WELCOME_MESSAGE_DELAY);

            previousLevelRef.current = currentLevel;
            previousLanguageRef.current = currentLang;

            if (currentLevel !== cefrLevel) {
              setCefrLevelState(currentLevel);
            }

            sessionStorage.removeItem(SESSION_STORAGE_KEYS.FROM_LEVEL_SELECTION);
          }
        }
      }
    };

    checkFlag();

    const handleCheckEvent = () => {
      setTimeout(checkFlag, 100);
    };

    window.addEventListener(CUSTOM_EVENTS.CHECK_LEVEL_SELECTION_FLAG, handleCheckEvent);
    const intervalId = setInterval(checkFlag, 1000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener(CUSTOM_EVENTS.CHECK_LEVEL_SELECTION_FLAG, handleCheckEvent);
    };
  }, [levelLoaded, sessionsLoaded, cefrLevel, currentLanguage, generateWelcomeMessage, sessions, updateSessionBase, setActiveSessionId]);

  // Create session with welcome message
  const createSession = useCallback(() => {
    let level = cefrLevel;
    if (!level) {
      const stored = StorageService.loadCEFRLevel();
      if (stored && isValidCEFRLevel(stored)) {
        level = stored;
        setCefrLevelState(stored);
      }
    }
    if (!level) {
      router.push("/level-selection");
      return;
    }

    const emptySession = SessionService.findEmptySession(level);
    if (emptySession) {
      setActiveSessionId(emptySession.id);
      setShowResults(true);
      if (emptySession.messages.length === 0) {
        setTimeout(() => generateWelcomeMessage(emptySession.id, level!), WELCOME_MESSAGE_DELAY);
      }
      return;
    }

    const session = SessionService.create(level);
    updateSessionBase(session.id, session);
    setActiveSessionId(session.id);
    setShowResults(true);
    setTimeout(() => generateWelcomeMessage(session.id, level!), WELCOME_MESSAGE_DELAY);
  }, [cefrLevel, sessions, generateWelcomeMessage, router, setActiveSessionId, updateSessionBase]);

  // Delete session
  const deleteSession = useCallback(
    (id: string) => {
      deleteSessionBase(id);
      if (activeSessionId === id) {
        if (sessions.length > 1) {
          setActiveSessionId(null);
        } else {
          setActiveSessionId(null);
          setShowResults(false);
        }
      }
    },
    [activeSessionId, sessions.length, deleteSessionBase, setActiveSessionId]
  );

  // Switch session
  const switchSession = useCallback(
    (id: string) => {
      switchSessionBase(id);
    },
    [switchSessionBase]
  );

  // Rename session
  const renameSession = useCallback(
    (id: string, title: string) => {
      renameSessionBase(id, title);
    },
    [renameSessionBase]
  );

  // Update session with sync
  const updateSession = useCallback(
    (id: string, data: Partial<Session>) => {
      updateSessionBase(id, data);
      const session = SessionRepository.getById(id);
      if (session && user) {
        syncSession({ ...session, ...data, updatedAt: Date.now() } as Session);
      }
    },
    [updateSessionBase, user, syncSession]
  );

  // Send message
  const onSent = useCallback(async () => {
    if (!input.trim() || !activeSession) return;

    const currentCount = UserRepository.getUserMessageCount();
    const requiresAuth = currentCount >= AUTH_REQUIRED_MESSAGE_COUNT && !isAuthenticated;

    if (requiresAuth) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(CUSTOM_EVENTS.AUTH_REQUIRED));
      }
      return;
    }

    const newCount = UserRepository.incrementUserMessageCount();
    setUserMessageCount(newCount);

    const sessionLevel =
      activeSession.cefrLevel || cefrLevel || StorageService.loadCEFRLevel();
    if (!sessionLevel || !isValidCEFRLevel(sessionLevel)) {
      console.error("Cannot send message: invalid level");
      return;
    }

    const userMessageContent = input.trim();
    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: userMessageContent,
      timestamp: Date.now(),
    };

    const messagesWithUser = [...activeSession.messages, userMessage];
    const assistantPlaceholder: Message = {
      id: `msg_${Date.now()}_assistant_placeholder`,
      role: "assistant-streaming",
      content: "",
      timestamp: Date.now(),
    };

    const messagesWithPlaceholder = [...messagesWithUser, assistantPlaceholder];
    const optimisticSession: Session = {
      ...activeSession,
      messages: messagesWithPlaceholder,
      messageCount: messagesWithPlaceholder.length,
      updatedAt: Date.now(),
    };

    updateSession(activeSession.id, optimisticSession);
    setInput("");
    setLoading(true);
    setShowResults(true);

    try {
      const data = await ApiService.sendMessage(
        userMessageContent,
        sessionLevel,
        activeSession.progress ?? 0,
        currentLanguage,
        activeSession.messages
      );

      let assistantContent = "";

      if (data.hasError) {
        if (data.correction) {
          assistantContent += `${data.correction}\n\n`;
        }
        if (data.explanation) {
          assistantContent += `${data.explanation}\n\n`;
        }
      } else {
        if (data.praise) {
          assistantContent += `${data.praise}\n\n`;
        }
      }

      assistantContent += data.nextQuestion || "";

      const assistantMessage: Message = {
        id: assistantPlaceholder.id,
        role: "assistant",
        content: assistantContent.trim(),
        timestamp: Date.now(),
      };

      const finalMessages = [...messagesWithUser, assistantMessage];
      const delta = data.progressDelta ?? 0;
      const updatedSession = SessionService.updateProgress(activeSession, delta);
      const titledSession = SessionService.updateTitle(updatedSession, sessionLevel);

      const finalSession: Session = {
        ...titledSession,
        messages: finalMessages,
        messageCount: finalMessages.length,
        completedTasks: activeSession.completedTasks + 1,
        updatedAt: Date.now(),
      };

      updateSession(activeSession.id, finalSession);
    } catch (error) {
      console.error("Error sending message", error);

      const appError = error instanceof AppError ? error : createAppError(error);
      const errorMessage: Message = {
        id: assistantPlaceholder.id,
        role: "assistant",
        content: getErrorMessage(appError, currentLanguage),
        timestamp: Date.now(),
      };
      const errorSession: Session = {
        ...activeSession,
        messages: [...messagesWithUser, errorMessage],
        messageCount: messagesWithUser.length + 1,
        updatedAt: Date.now(),
      };
      updateSession(activeSession.id, errorSession);
    } finally {
      setLoading(false);
    }
  }, [
    input,
    activeSession,
    cefrLevel,
    currentLanguage,
    updateSession,
    isAuthenticated,
  ]);

  // New chat
  const newChat = useCallback(() => {
    if (!activeSession || !cefrLevel) return;
    const initial = initializeProgress(cefrLevel);
    const resetSession: Session = {
      ...activeSession,
      messages: [],
      messageCount: 0,
      completedTasks: 0,
      progress: initial,
      updatedAt: Date.now(),
    };
    updateSession(activeSession.id, resetSession);
    setShowResults(false);
    setInput("");
    setTimeout(() => generateWelcomeMessage(activeSession.id, cefrLevel), WELCOME_MESSAGE_DELAY);
  }, [activeSession, cefrLevel, updateSession, generateWelcomeMessage]);

  const contextValue: SessionContextValue = {
    sessions,
    activeSessionId,
    activeSession,
    sessionsLoaded,
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
    isAuthRequired: userMessageCount >= AUTH_REQUIRED_MESSAGE_COUNT && !isAuthenticated,
    cefrLevel,
    setCefrLevel,
    levelLoaded,
  };

  return (
    <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>
  );
};

