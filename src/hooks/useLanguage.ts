/**
 * useLanguage Hook
 * Simple, clean language state management
 * - Reads from localStorage on mount (client-side only)
 * - Automatically saves to localStorage when language changes
 * - No polling, no events, no complexity - just React
 */

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { LanguageCode, DEFAULT_LANGUAGE, isValidLanguageCode } from "@/lib/languages";
import { StorageService } from "@/src/services/storageService";

export function useLanguage() {
  // Start with null to indicate "not loaded yet"
  const [language, setLanguageState] = useState<LanguageCode | null>(null);
  const isInitializedRef = useRef(false);

  // Read from localStorage IMMEDIATELY on client-side mount (before paint)
  useLayoutEffect(() => {
    if (typeof window !== "undefined" && !isInitializedRef.current) {
      const stored = StorageService.loadLanguage();
      if (stored && isValidLanguageCode(stored)) {
        setLanguageState(stored);
      } else {
        setLanguageState(DEFAULT_LANGUAGE);
      }
      isInitializedRef.current = true;
    }
  }, []);

  // Save to localStorage whenever language changes (but only after initialization)
  useEffect(() => {
    if (isInitializedRef.current && language !== null && typeof window !== "undefined") {
      StorageService.saveLanguage(language);
    }
  }, [language]);

  // setLanguage: update state, localStorage saves automatically via useEffect
  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
  }, []);

  // Return default language if not yet loaded (prevents errors)
  return { 
    language: language ?? DEFAULT_LANGUAGE, 
    setLanguage,
    isReady: language !== null 
  };
}
