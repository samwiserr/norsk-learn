/**
 * Language Context
 * Manages UI language state
 */

"use client";

import { createContext, useContext, ReactNode } from "react";
import { LanguageCode } from "@/lib/languages";
import { useLanguage } from "@/src/hooks/useLanguage";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextValue>(
  {} as LanguageContextValue
);

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguageContext must be used within LanguageProvider");
  }
  return context;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

