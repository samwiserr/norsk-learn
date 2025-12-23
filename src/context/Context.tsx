"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from "@/lib/storage";
import {
  CEFRLevel,
  isValidCEFRLevel,
} from "@/lib/cefr";
import {
  createNewSession,
  generateSessionTitle,
  generateSessionTitleFromMessages,
  Session,
  Message,
  validateSession,
} from "@/lib/sessions";
import {
  initializeProgress,
  clampProgress,
  getCurrentCEFRLevel,
} from "@/lib/cefr-progress";
import {
  DEFAULT_LANGUAGE,
  isValidLanguageCode,
  LanguageCode,
} from "@/lib/languages";
import {
  getUserMessageCount,
  incrementUserMessageCount,
} from "@/lib/storage";
import { User } from "firebase/auth";
import { syncSessionToFirestore } from "@/lib/firebase/sync";
import { addToOfflineQueue, processOfflineQueue, getQueueStats } from "@/lib/sync/offline-queue";
import { getMultiTabSync } from "@/lib/sync/multi-tab-sync";
import { AppError, ErrorType, createAppError, getErrorMessage } from "@/lib/error-handling";
import { withRetry, isRetryableError } from "@/lib/retry";

export interface ContextValue {
  cefrLevel: CEFRLevel | null;
  setCefrLevel: (level: CEFRLevel) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  sessions: Session[];
  activeSessionId: string | null;
  activeSession: Session | null;
  createSession: () => void;
  deleteSession: (id: string) => void;
  switchSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  updateSession: (id: string, data: Partial<Session>) => void;
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  showResults: boolean;
  onSent: (prompt?: string) => void;
  newChat: () => void;
  userProgress: number;
  completedTasks: number;
  srsReviewList: string[];
  userMessageCount: number;
  isAuthRequired: boolean;
  syncStatus: {
    syncing: boolean;
    lastSynced: number | null;
    error: string | null;
    pendingChanges: number;
  };
}

export const Context = createContext<ContextValue>({} as ContextValue);

const ContextProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  const [cefrLevel, setCefrLevel] = useState<CEFRLevel | null>(null);
  // Initialize language from localStorage immediately, fallback to DEFAULT_LANGUAGE
  const [language, setLanguage] = useState<LanguageCode>(() => {
    if (typeof window !== "undefined") {
      const stored = loadFromLocalStorage<string>("norsk_ui_language");
      if (stored && isValidLanguageCode(stored)) {
        return stored;
      }
    }
    return DEFAULT_LANGUAGE;
  });
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [levelLoaded, setLevelLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    syncing: false,
    lastSynced: null as number | null,
    error: null as string | null,
    pendingChanges: 0,
  });
  const previousLevelRef = useRef<CEFRLevel | null>(null);
  const previousLanguageRef = useRef<LanguageCode | null>(null);
  const isInitialLoadRef = useRef(true);
  const languageInitializedRef = useRef(false);
  const currentUserRef = useRef<User | null>(null);

  const applyTheme = useCallback((value: "light" | "dark" | "system") => {
    if (typeof document === "undefined") return;
    let actual: "light" | "dark" = "light";
    if (value === "system") {
      actual =
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    } else {
      actual = value;
    }
    document.documentElement.setAttribute("data-theme", actual);
  }, []);

  const loadLanguage = () => {
    const stored = loadFromLocalStorage<string>("norsk_ui_language");
    if (stored && isValidLanguageCode(stored)) {
      setLanguage(stored);
    } else {
      // Only save DEFAULT_LANGUAGE if no language was previously set
      // This prevents overwriting user's selection with default on refresh
      const existing = loadFromLocalStorage<string>("norsk_ui_language");
      if (!existing) {
        saveToLocalStorage("norsk_ui_language", DEFAULT_LANGUAGE);
        setLanguage(DEFAULT_LANGUAGE);
      }
    }
  };

  const loadTheme = () => {
    const stored = loadFromLocalStorage<"light" | "dark" | "system">(
      "norsk_theme",
    );
    if (stored) {
      setTheme(stored);
      applyTheme(stored);
    } else {
      saveToLocalStorage("norsk_theme", "system");
    }
  };

  const loadLevel = () => {
    const stored = loadFromLocalStorage<string>("norsk_cefr_level");
    if (stored && isValidCEFRLevel(stored)) {
      setCefrLevel(stored);
      setLevelLoaded(true);
    } else {
      setLevelLoaded(true);
      router.push("/level-selection");
    }
  };

  const loadSessionState = () => {
    const storedSessions = loadFromLocalStorage<Session[]>("norsk_sessions");
    const valid = (storedSessions ?? []).filter(validateSession);
    setSessions(valid);
    setSessionsLoaded(true);
    if (valid.length > 0) {
      const latest = valid.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setActiveSessionId(latest.id);
      setActiveSession(latest);
      setShowResults(true);
    }
  };

  // Load user message count on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const count = getUserMessageCount();
      setUserMessageCount(count);
    }
  }, []);

  // Check authentication state
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        const user = loadFromLocalStorage<User>("norsk_user");
        setIsAuthenticated(!!user);
        currentUserRef.current = user;
      }
    };
    checkAuth();
    
    // Listen for storage changes (when user logs in/out)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "norsk_user") {
        checkAuth();
        // Process offline queue when user logs in - will be handled by the queue processing useEffect
      }
    };
    window.addEventListener("storage", handleStorageChange);
    
    // Also check periodically (in case of same-tab changes)
    const interval = setInterval(checkAuth, 1000);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Load language on mount and reload when needed (separate from other loads to avoid dependency issues)
  useEffect(() => {
    // On first load, mark as initialized before loading to prevent save effect from overwriting
    if (!languageInitializedRef.current) {
      languageInitializedRef.current = true;
    }
    loadLanguage();
    
    // Reload language when explicitly requested (e.g., after navigation from level-selection page)
    const handleLanguageReload = () => {
      loadLanguage();
    };
    
    window.addEventListener("language-reload", handleLanguageReload);
    
    // Handle level reload event (triggered after navigation from level selection)
    const handleLevelReload = () => {
      const stored = loadFromLocalStorage<string>("norsk_cefr_level");
      if (stored && isValidCEFRLevel(stored)) {
        setCefrLevel(stored);
      }
    };
    
    window.addEventListener("level-reload", handleLevelReload);
    
    // Handle check for level selection flag (triggered when navigating back from level selection)
    const handleCheckFlag = () => {
      // This will trigger the flag-checking useEffect by updating dependencies
      // Force a language reload to trigger state update
      loadLanguage();
    };
    
    window.addEventListener("check-level-selection-flag", handleCheckFlag);
    
    // Also reload language when the page becomes visible (e.g., after navigation)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadLanguage();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Check language on route changes by listening to popstate events
    const handleRouteChange = () => {
      setTimeout(() => loadLanguage(), 100);
    };
    
    window.addEventListener("popstate", handleRouteChange);
    
    return () => {
      window.removeEventListener("language-reload", handleLanguageReload);
      window.removeEventListener("level-reload", handleLevelReload);
      window.removeEventListener("check-level-selection-flag", handleCheckFlag);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  // Initialize previous language ref after language is loaded
  useEffect(() => {
    if (language && previousLanguageRef.current === null) {
      previousLanguageRef.current = language;
    }
  }, [language]);

  // Load theme and sessions on mount
  useEffect(() => {
    loadTheme();
    loadSessionState();

    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [applyTheme, theme]);

  // Listen for storage changes to sync language across tabs/pages
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "norsk_ui_language" && e.newValue) {
        const newLang = e.newValue;
        if (isValidLanguageCode(newLang)) {
          setLanguage(newLang);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also check localStorage periodically (in case of same-tab changes)
    const checkLanguage = () => {
      const stored = loadFromLocalStorage<string>("norsk_ui_language");
      if (stored && isValidLanguageCode(stored) && stored !== language) {
        setLanguage(stored);
      }
    };
    
    // Check on focus (when user comes back to the tab)
    window.addEventListener("focus", checkLanguage);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", checkLanguage);
    };
  }, [language]);

  // Load level on mount
  useEffect(() => {
    loadLevel();
  }, []);
  

  useEffect(() => {
    // Only save to localStorage after language has been initialized
    // This prevents overwriting user's saved language with DEFAULT_LANGUAGE on refresh
    if (!languageInitializedRef.current) {
      return; // Don't save until initialization is complete
    }
    
    // Only save if it's different from what's stored to avoid unnecessary writes
    const stored = loadFromLocalStorage<string>("norsk_ui_language");
    if (stored !== language) {
      saveToLocalStorage("norsk_ui_language", language);
    }
  }, [language]);

  useEffect(() => {
    saveToLocalStorage("norsk_theme", theme);
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Multi-tab sync listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const multiTabSync = getMultiTabSync();

    const unsubscribe = multiTabSync.subscribe("SESSION_UPDATED", ({ sessionId, data }) => {
      // Update local state if this session is active or exists
      if (sessionId === activeSessionId) {
        setActiveSession(data);
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? data : s))
        );
        saveToLocalStorage("norsk_sessions", 
          sessions.map((s) => (s.id === sessionId ? data : s))
        );
      } else {
        // Update session if it exists in our list
        setSessions((prev) => {
          const exists = prev.find((s) => s.id === sessionId);
          if (exists) {
            const updated = prev.map((s) => (s.id === sessionId ? data : s));
            saveToLocalStorage("norsk_sessions", updated);
            return updated;
          }
          return prev;
        });
      }
    });

    return () => {
      // Cleanup handled by MultiTabSync
    };
  }, [activeSessionId, sessions]);

  // Sync session to Firestore (defined before useEffects that depend on it)
  const syncSession = useCallback(async (session: Session) => {
    if (!isAuthenticated || !currentUserRef.current) {
      // Queue for later sync
      addToOfflineQueue({
        type: "UPDATE_SESSION",
        sessionId: session.id,
        data: session,
      });
      setSyncStatus((prev) => ({
        ...prev,
        pendingChanges: getQueueStats().total,
      }));
      return;
    }

    setSyncStatus((prev) => ({ ...prev, syncing: true, error: null }));

    try {
      await syncSessionToFirestore(currentUserRef.current.uid, session);
      
      // Broadcast to other tabs
      if (typeof window !== "undefined") {
        const multiTabSync = getMultiTabSync();
        multiTabSync.broadcast({
          type: "SESSION_UPDATED",
          sessionId: session.id,
          data: session,
          timestamp: Date.now(),
        });
      }

      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        lastSynced: Date.now(),
        pendingChanges: getQueueStats().total,
      }));
    } catch (error) {
      console.error("Sync failed:", error);
      addToOfflineQueue({
        type: "UPDATE_SESSION",
        sessionId: session.id,
        data: session,
      });
      
      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        error: error instanceof Error ? error.message : "Sync failed",
        pendingChanges: getQueueStats().total,
      }));
    }
  }, [isAuthenticated]);

  // Process offline queue when online
  useEffect(() => {
    if (!isAuthenticated || !currentUserRef.current) return;

    const processQueue = async () => {
      if (navigator.onLine && currentUserRef.current) {
        await processOfflineQueue(currentUserRef.current.uid, (userId: string, session: Session) => syncSession(session));
        // Update sync status with queue stats
        const stats = getQueueStats();
        setSyncStatus((prev) => ({
          ...prev,
          pendingChanges: stats.total,
        }));
      }
    };

    window.addEventListener("online", processQueue);
    processQueue(); // Process on mount

    return () => {
      window.removeEventListener("online", processQueue);
    };
  }, [isAuthenticated, syncSession]);

  const updateSession = useCallback(
    (id: string, data: Partial<Session>) => {
      const updatedSessions = sessions.map((session) =>
        session.id === id ? { ...session, ...data, updatedAt: Date.now() } : session,
      );
      setSessions(updatedSessions);
      const current = updatedSessions.find((session) => session.id === id);
      if (current) {
        saveToLocalStorage("norsk_sessions", updatedSessions);
        
        // Sync to Firestore
        syncSession(current);
      }
      if (activeSessionId === id && current) {
        setActiveSession(current);
      }
    },
    [sessions, activeSessionId, syncSession],
  );

  const generateWelcomeMessage = useCallback(
    async (sessionId: string, level: CEFRLevel, overrideLanguage?: LanguageCode) => {
      try {
        // Use override language if provided, otherwise use current language state
        // This ensures we use the correct language even if state hasn't updated yet
        const languageToUse = overrideLanguage || language;
        const response = await fetch("/api/initial-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cefrLevel: level, language: languageToUse }),
        });
        if (!response.ok) return;
        const data = await response.json();
        
        // The welcome message should include the question as part of the introduction
        let welcomeContent = data.welcomeMessage || 
          `Welcome! You have selected CEFR level ${level}. Please answer the following question in Norwegian Bokmål.`;
        
        // Ensure the first question is included in the welcome message
        // If the API response has a separate firstQuestion but it's not in welcomeMessage, add it
        const firstQuestion = data.firstQuestion || "";
        if (firstQuestion && !welcomeContent.includes(firstQuestion)) {
          // Check if message mentions "following question" or similar without the actual question
          const hasQuestionReference = /(following|first|next).*question|spørsmål/i.test(welcomeContent);
          if (hasQuestionReference) {
            // Replace reference with actual question or append it
            welcomeContent = welcomeContent.replace(
              /(?:following|first|next).*question[^:]*:?/i,
              `following question in Norwegian Bokmål:\n\n${firstQuestion}`
            );
            // If replacement didn't work, append
            if (!welcomeContent.includes(firstQuestion)) {
              welcomeContent = `${welcomeContent}\n\n${firstQuestion}`;
            }
          } else {
            // Add the question directly
            welcomeContent = `${welcomeContent}\n\n${firstQuestion}`;
          }
        }
        
        const welcome: Message = {
          id: `msg_${Date.now()}_welcome`,
          role: "assistant",
          content: welcomeContent.trim(),
          timestamp: Date.now(),
        };
        setSessions((prev) => {
          const target = prev.find((s) => s.id === sessionId);
          if (!target) return prev;
          const updated: Session = {
            ...target,
            messages: [welcome],
            messageCount: 1,
            updatedAt: Date.now(),
          };
          saveToLocalStorage("norsk_sessions", [
            ...prev.filter((s) => s.id !== sessionId),
            updated,
          ]);
          if (activeSessionId === sessionId) {
            setActiveSession(updated);
            setShowResults(true);
          }
          return prev.map((s) => (s.id === sessionId ? updated : s));
        });
      } catch (error) {
        console.error("Welcome message error", error);
      }
    },
    [language, activeSessionId],
  );

  useEffect(() => {
    if (!sessionsLoaded) return;
    
    if (!activeSessionId) {
      // No active session - find the latest one or leave it empty
      if (sessions.length > 0) {
        const latest = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setActiveSessionId(latest.id);
        setActiveSession(latest);
        setShowResults(true);
      } else {
        // No sessions at all - clear active session
        setActiveSession(null);
        setShowResults(false);
      }
      return;
    }
    
    const session = sessions.find((s) => s.id === activeSessionId);
    if (session) {
      setActiveSession(session);
      setShowResults(true);
      if (session.messages.length === 0 && cefrLevel) {
        setTimeout(() => generateWelcomeMessage(session.id, cefrLevel), 300);
      }
    } else {
      // Active session not found (probably deleted) - find a new one
      if (sessions.length > 0) {
        const latest = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setActiveSessionId(latest.id);
        setActiveSession(latest);
        setShowResults(true);
      } else {
        // No sessions left - clear active session
        setActiveSessionId(null);
        setActiveSession(null);
        setShowResults(false);
      }
    }
  }, [activeSessionId, sessions, cefrLevel, generateWelcomeMessage, sessionsLoaded]);

  // Handle level changes - create new session only when level changes (not language alone)
  useEffect(() => {
    if (!levelLoaded || !sessionsLoaded) return;
    
    // Check if user just navigated from level selection page (using sessionStorage flag)
    // IMPORTANT: Check this FIRST before checking cefrLevel, to handle case where state hasn't updated yet
    const fromLevelSelection = typeof window !== "undefined" && 
      sessionStorage.getItem("norsk_from_level_selection") === "true";
    
    // When coming from level selection, read level from localStorage first (state might not be updated yet)
    const storedLevel = typeof window !== "undefined" 
      ? loadFromLocalStorage<string>("norsk_cefr_level") 
      : null;
    const effectiveLevel = (fromLevelSelection && storedLevel && isValidCEFRLevel(storedLevel))
      ? storedLevel as CEFRLevel
      : cefrLevel;
    
    if (!effectiveLevel) return;
    
    // Mark initial load as complete after first run
    if (isInitialLoadRef.current) {
      previousLevelRef.current = effectiveLevel;
      previousLanguageRef.current = language;
      isInitialLoadRef.current = false;
      // On initial load, only create a session if there are NO sessions at all
      if (sessions.length === 0) {
        const initialProgress = initializeProgress(effectiveLevel);
        const session = createNewSession(effectiveLevel, initialProgress);
        setSessions((prev) => {
          const updated = [...prev, session];
          saveToLocalStorage("norsk_sessions", updated);
          return updated;
        });
        setActiveSessionId(session.id);
        setActiveSession(session);
        setShowResults(true);
        setTimeout(() => generateWelcomeMessage(session.id, effectiveLevel), 300);
      }
      // Update state if different from localStorage
      if (effectiveLevel !== cefrLevel && effectiveLevel) {
        setCefrLevel(effectiveLevel);
      }
      return;
    }
    
    // After initial load: Create a new session if:
    // 1. Level changed, OR
    // 2. User navigated from level selection page (always create new conversation when coming from selection)
    // This ensures that when user changes language and selects a level (even same level), a new conversation is created
    
    // Check level change: compare previous with current effective level (from localStorage if from selection, else state)
    const levelChanged = previousLevelRef.current && previousLevelRef.current !== effectiveLevel;
    
    // IMPORTANT: Check language change from localStorage directly, not just state
    // This prevents race conditions where state hasn't updated yet
    const storedLanguage = typeof window !== "undefined" 
      ? loadFromLocalStorage<string>("norsk_ui_language") 
      : language;
    const currentLanguage = storedLanguage && isValidLanguageCode(storedLanguage) ? storedLanguage : language;
    const languageChanged = previousLanguageRef.current && previousLanguageRef.current !== currentLanguage;
    
    // If user came from level selection page, always create a new conversation
    // This ensures the conversation reflects the currently selected level and language
    // The user explicitly went through the selection flow, so create a new session
    const shouldCreateFromLevelSelection = fromLevelSelection && !isInitialLoadRef.current;
    
    // Also ensure language state is updated if it changed in localStorage
    if (currentLanguage !== language && isValidLanguageCode(currentLanguage)) {
      setLanguage(currentLanguage);
    }
    
    if (levelChanged || shouldCreateFromLevelSelection) {
      // Level changed OR user came from level selection page - create a new session
      // Use effectiveLevel which already prioritizes localStorage when coming from selection
      const currentLevel = effectiveLevel;
      if (!currentLevel || !isValidCEFRLevel(currentLevel)) {
        // Level not available yet, skip session creation
        return;
      }
      
      const initialProgress = initializeProgress(currentLevel);
      const session = createNewSession(currentLevel, initialProgress);
      
      setSessions((prev) => {
        const updated = [...prev, session];
        saveToLocalStorage("norsk_sessions", updated);
        return updated;
      });
      
      setActiveSessionId(session.id);
      setActiveSession(session);
      setShowResults(true);
      // Generate welcome message with current level and current language (from localStorage)
      // Pass the current language explicitly to ensure it's used even if state hasn't updated
      setTimeout(() => {
        generateWelcomeMessage(session.id, currentLevel, currentLanguage);
      }, 300);
      
      // Update both refs with the current values
      previousLevelRef.current = currentLevel;
      previousLanguageRef.current = currentLanguage; // Use currentLanguage from localStorage check
      
      // Also update state if it's different (to keep state in sync)
      if (currentLevel !== cefrLevel) {
        setCefrLevel(currentLevel);
      }
      
      // Clear the flag only AFTER successfully creating the session
      // This prevents race conditions where flag is cleared before session is created
      if (fromLevelSelection && typeof window !== "undefined") {
        sessionStorage.removeItem("norsk_from_level_selection");
      }
    } else {
      // Neither condition met - update refs silently
      if (previousLevelRef.current === null) {
        previousLevelRef.current = effectiveLevel;
      }
      if (previousLanguageRef.current === null) {
        // Initialize with current language from localStorage if available
        previousLanguageRef.current = currentLanguage || language;
      } else if (languageChanged && !fromLevelSelection) {
        // Language changed but didn't come from level selection page
        // (e.g., changed via settings or other means) - just update ref
        // Use currentLanguage from localStorage check for consistency
        previousLanguageRef.current = currentLanguage || language;
      }
      // Update state if effectiveLevel is different (e.g., from localStorage)
      if (effectiveLevel !== cefrLevel && effectiveLevel) {
        setCefrLevel(effectiveLevel);
      }
      // Clear the flag if it exists but conditions weren't met (cleanup)
      if (fromLevelSelection && typeof window !== "undefined") {
        sessionStorage.removeItem("norsk_from_level_selection");
      }
    }
  }, [cefrLevel, language, levelLoaded, sessionsLoaded, generateWelcomeMessage, sessions, activeSession]);

  // Dedicated check for level selection flag - runs separately to ensure it's always checked
  // This useEffect specifically handles navigation back from level selection page
  useEffect(() => {
    if (!levelLoaded || !sessionsLoaded || isInitialLoadRef.current) return;
    
    // Check for flag on every render (but only act if flag exists)
    const checkFlag = () => {
      if (typeof window !== "undefined") {
        const flag = sessionStorage.getItem("norsk_from_level_selection");
        if (flag === "true") {
          // Get current values from localStorage (most up-to-date)
          const storedLevel = loadFromLocalStorage<string>("norsk_cefr_level");
          const storedLanguage = loadFromLocalStorage<string>("norsk_ui_language");
          const currentLevel = (storedLevel && isValidCEFRLevel(storedLevel)) ? storedLevel : cefrLevel;
          const currentLang = (storedLanguage && isValidLanguageCode(storedLanguage)) ? storedLanguage : language;
          
          if (currentLevel && isValidCEFRLevel(currentLevel)) {
            // Create new session immediately
            const initialProgress = initializeProgress(currentLevel);
            const session = createNewSession(currentLevel, initialProgress);
            
            setSessions((prev) => {
              const updated = [...prev, session];
              saveToLocalStorage("norsk_sessions", updated);
              return updated;
            });
            
            setActiveSessionId(session.id);
            setActiveSession(session);
            setShowResults(true);
            
            // Generate welcome message with current language
            setTimeout(() => {
              generateWelcomeMessage(session.id, currentLevel, currentLang);
            }, 300);
            
            // Update refs to prevent duplicate session creation
            previousLevelRef.current = currentLevel;
            previousLanguageRef.current = currentLang;
            
            // Update state if needed
            if (currentLevel !== cefrLevel) {
              setCefrLevel(currentLevel);
            }
            if (currentLang !== language) {
              setLanguage(currentLang);
            }
            
            // Clear the flag immediately after creating session
            sessionStorage.removeItem("norsk_from_level_selection");
          }
        }
      }
    };
    
    // Check immediately
    checkFlag();
    
    // Also listen for explicit check event
    const handleCheckEvent = () => {
      setTimeout(checkFlag, 100);
    };
    
    window.addEventListener("check-level-selection-flag", handleCheckEvent);
    
    // Also check periodically as fallback
    const intervalId = setInterval(checkFlag, 1000);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("check-level-selection-flag", handleCheckEvent);
    };
  }, [levelLoaded, sessionsLoaded, cefrLevel, language, generateWelcomeMessage]);

  const createSession = useCallback(() => {
    let level = cefrLevel;
    if (!level) {
      const stored = loadFromLocalStorage<string>("norsk_cefr_level");
      if (stored && isValidCEFRLevel(stored)) {
        level = stored;
        setCefrLevel(stored);
      }
    }
    if (!level) {
      router.push("/level-selection");
      return;
    }
    
    // Check if there's already an empty conversation (no user input) with the same level
    // If so, switch to it instead of creating a new one (like ChatGPT)
    // A conversation is "empty" if it has no user messages (welcome messages don't count)
    const emptySession = sessions.find((s) => {
      if (s.cefrLevel !== level) return false;
      // Check if there are any user messages (actual user input)
      const hasUserMessages = s.messages.some((msg) => msg.role === "user");
      return !hasUserMessages; // Empty if no user messages
    });
    
    if (emptySession) {
      // Switch to existing empty conversation
      setActiveSessionId(emptySession.id);
      setActiveSession(emptySession);
      setShowResults(true);
      // Generate welcome message if it doesn't have one
      if (emptySession.messages.length === 0) {
        setTimeout(() => generateWelcomeMessage(emptySession.id, level!), 300);
      }
      return;
    }
    
    // No empty conversation exists - create a new one
    const initialProgress = initializeProgress(level);
    
    // Use functional update to avoid stale closures
    setSessions((prev) => {
      // Create session inside the callback
      const session = createNewSession(level!, initialProgress);
      
      const updated = [...prev, session];
      saveToLocalStorage("norsk_sessions", updated);
      
      // Update active session immediately
      setActiveSessionId(session.id);
      setActiveSession(session);
      setShowResults(true);
      setTimeout(() => generateWelcomeMessage(session.id, level!), 300);
      
      return updated;
    });
  }, [cefrLevel, sessions, generateWelcomeMessage, router]);

  const deleteSession = useCallback(
    (id: string) => {
      // Use functional update to avoid stale closures
      setSessions((prev) => {
        const remaining = prev.filter((session) => session.id !== id);
        saveToLocalStorage("norsk_sessions", remaining);
        
        // If deleting active session, clear activeSessionId
        // The useEffect will handle finding a new active session
        if (activeSessionId === id) {
          if (remaining.length > 0) {
            // Let useEffect handle switching to latest session
            setActiveSessionId(null);
          } else {
            // No sessions left - clear active session
            setActiveSessionId(null);
            setActiveSession(null);
            setShowResults(false);
          }
        }
        
        return remaining;
      });
    },
    [activeSessionId],
  );

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const renameSession = useCallback(
    (id: string, title: string) => {
      updateSession(id, { title });
    },
    [updateSession, isAuthenticated],
  );

  const onSent = useCallback(async () => {
    if (!input.trim() || !activeSession) return;
    
    // Check authentication requirement (5 messages)
    const currentCount = getUserMessageCount();
    const requiresAuth = currentCount >= 5 && !isAuthenticated;
    
    if (requiresAuth) {
      // Don't send message - auth modal will be shown by component
      // Dispatch event to trigger auth modal
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-required"));
      }
      return;
    }
    
    // Increment message count before sending
    const newCount = incrementUserMessageCount();
    setUserMessageCount(newCount);
    
    // Use session's level as source of truth (session stores the correct level)
    const sessionLevel = activeSession.cefrLevel || cefrLevel || loadFromLocalStorage<string>("norsk_cefr_level");
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

    // Optimistically add user message immediately
    const messagesWithUser = [...activeSession.messages, userMessage];
    const assistantPlaceholder: Message = {
      id: `msg_${Date.now()}_assistant_placeholder`,
      role: "assistant-streaming",
      content: "",
      timestamp: Date.now(),
    };

    // Add placeholder for assistant response
    const messagesWithPlaceholder = [...messagesWithUser, assistantPlaceholder];
    // Don't update title optimistically - wait for tutor's response to generate meaningful title
    const optimisticSession: Session = {
      ...activeSession,
      messages: messagesWithPlaceholder,
      messageCount: messagesWithPlaceholder.length,
      updatedAt: Date.now(),
    };

    // Update UI immediately (optimistic update)
    updateSession(activeSession.id, optimisticSession);
    setInput(""); // Clear input immediately
    setLoading(true);
    setShowResults(true);

    try {
      // sessionLevel is already validated above
      const response = await withRetry(
        async () => {
          const res = await fetch("/api/conversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userInput: userMessageContent,
              cefrLevel: sessionLevel,
              currentProgress: activeSession.progress ?? 0,
              language,
              conversationHistory: activeSession.messages,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new AppError(
              errorData.type || ErrorType.API,
              errorData.error || "Request failed",
              errorData.code,
              errorData.retryable ?? (res.status >= 500),
            );
          }

          return res.json();
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          retryable: isRetryableError,
        }
      );
      
      const data = response;

      // Build assistant response with correction (if any) and explanation/praise in selected language
      let assistantContent = "";
      
      if (data.hasError) {
        // Include correction in Norwegian if provided
        if (data.correction) {
          assistantContent += `${data.correction}\n\n`;
        }
        // Include explanation in selected language
        if (data.explanation) {
          assistantContent += `${data.explanation}\n\n`;
        }
      } else {
        // Include praise in selected language if provided
        if (data.praise) {
          assistantContent += `${data.praise}\n\n`;
        }
      }
      
      // Always include the next question in Norwegian
      assistantContent += data.nextQuestion || "";

      const assistantMessage: Message = {
        id: assistantPlaceholder.id,
        role: "assistant",
        content: assistantContent.trim(),
        timestamp: Date.now(),
      };

      // Replace placeholder with actual assistant message
      const finalMessages = [...messagesWithUser, assistantMessage];
      const delta = data.progressDelta ?? 0;
      const newProgress = clampProgress((activeSession.progress ?? 0) + delta);
      
      // Auto-generate/update title based on conversation content (similar to ChatGPT)
      // Update title if it's still a generic "New Conversation" title
      // This ensures ongoing conversations get meaningful titles based on tutor responses
      const isGenericTitle = 
        activeSession.title === "New Conversation" ||
        activeSession.title.startsWith("New Conversation ");
      
      // Use sessionLevel (already validated) for title generation
      const newTitle = isGenericTitle
        ? generateSessionTitleFromMessages(finalMessages, sessionLevel as CEFRLevel)
        : activeSession.title;
      
      const finalSession: Session = {
        ...activeSession,
        title: newTitle,
        messages: finalMessages,
        messageCount: finalMessages.length,
        completedTasks: activeSession.completedTasks + 1,
        progress: newProgress,
        updatedAt: Date.now(),
      };

      updateSession(activeSession.id, finalSession);
    } catch (error) {
      console.error("Error sending message", error);
      
      // Remove placeholder on error and show error message
      const appError = error instanceof AppError ? error : createAppError(error);
      const errorMessage: Message = {
        id: assistantPlaceholder.id,
        role: "assistant",
        content: getErrorMessage(appError, language),
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
  }, [input, activeSession, cefrLevel, language, updateSession]);

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
    setTimeout(() => generateWelcomeMessage(activeSession.id, cefrLevel), 300);
  }, [activeSession, cefrLevel, updateSession, generateWelcomeMessage]);

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
    userMessageCount,
    isAuthRequired: userMessageCount >= 5 && !isAuthenticated,
    syncStatus,
  };

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export default ContextProvider;
