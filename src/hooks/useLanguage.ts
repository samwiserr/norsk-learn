/**
 * useLanguage Hook
 * Manages language state and persistence
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { LanguageCode, DEFAULT_LANGUAGE, isValidLanguageCode } from "@/lib/languages";
import { StorageService } from "@/src/services/storageService";
import { CUSTOM_EVENTS } from "@/lib/constants";

export function useLanguage() {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window !== "undefined") {
      const stored = StorageService.loadLanguage();
      if (stored && isValidLanguageCode(stored)) {
        return stored;
      }
    }
    return DEFAULT_LANGUAGE;
  });

  const languageInitializedRef = useRef(false);

  // Load language on mount
  useEffect(() => {
    if (!languageInitializedRef.current) {
      languageInitializedRef.current = true;
    }
    loadLanguage();

    const handleLanguageReload = () => {
      loadLanguage();
    };

    window.addEventListener(CUSTOM_EVENTS.LANGUAGE_RELOAD, handleLanguageReload);

    return () => {
      window.removeEventListener(CUSTOM_EVENTS.LANGUAGE_RELOAD, handleLanguageReload);
    };
  }, []);

  const loadLanguage = useCallback(() => {
    const stored = StorageService.loadLanguage();
    if (stored && isValidLanguageCode(stored)) {
      setLanguageState(stored);
    } else {
      const existing = StorageService.loadLanguage();
      if (!existing) {
        StorageService.saveLanguage(DEFAULT_LANGUAGE);
        setLanguageState(DEFAULT_LANGUAGE);
      }
    }
  }, []);

  // Save language when it changes
  useEffect(() => {
    if (!languageInitializedRef.current) {
      return;
    }

    const stored = StorageService.loadLanguage();
    if (stored !== language) {
      StorageService.saveLanguage(language);
    }
  }, [language]);

  // Listen for storage changes to sync language across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "norsk_ui_language" && e.newValue) {
        const newLang = e.newValue;
        if (isValidLanguageCode(newLang)) {
          setLanguageState(newLang);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    const checkLanguage = () => {
      const stored = StorageService.loadLanguage();
      if (stored && isValidLanguageCode(stored) && stored !== language) {
        setLanguageState(stored);
      }
    };

    window.addEventListener("focus", checkLanguage);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", checkLanguage);
    };
  }, [language]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
  }, []);

  return { language, setLanguage };
}

