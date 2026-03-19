"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
  DEFAULT_LANGUAGE,
  isValidLanguageCode,
  getTranslation,
} from "@/lib/languages";
import { saveToLocalStorage, loadFromLocalStorage } from "@/lib/storage";
import { detectBrowserLanguage } from "@/lib/browser-language";
import "./language-selection.css";

const FLAG_MAP: Record<LanguageCode, string> = {
  en: "🇬🇧",
  no: "🇳🇴",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  it: "🇮🇹",
  pt: "🇵🇹",
  nl: "🇳🇱",
  sv: "🇸🇪",
  da: "🇩🇰",
  fi: "🇫🇮",
  pl: "🇵🇱",
  uk: "🇺🇦",
};

export default function LanguageSelectionPage() {
  const router = useRouter();
  // Detect browser language
  const detectedLanguage = typeof window !== "undefined" ? detectBrowserLanguage() : DEFAULT_LANGUAGE;
  
  // Detect browser language for display
  const [displayLanguage, setDisplayLanguage] = useState<LanguageCode>(detectedLanguage);
  // Pre-select detected language
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(detectedLanguage);

  // Check if language is already set - redirect if it is
  useEffect(() => {
    const stored = loadFromLocalStorage<string>("norsk_ui_language");
    if (stored && isValidLanguageCode(stored)) {
      // Language already set, redirect to level selection
      router.push("/level-selection");
      return;
    }
    
    // No language set - pre-select detected language visually but don't auto-save
    // Let user explicitly choose before saving and redirecting
    if (detectedLanguage && isValidLanguageCode(detectedLanguage)) {
      setSelectedLanguage(detectedLanguage);
      setDisplayLanguage(detectedLanguage);
    }
  }, [router, detectedLanguage]);

  const handleLanguageSelect = (code: LanguageCode) => {
    setSelectedLanguage(code);
    setDisplayLanguage(code);
    // Save language as default
    saveToLocalStorage("norsk_ui_language", code);
    // Redirect to level selection
    router.push("/level-selection");
  };

  // Use detected language for translations
  const t = (key: "languageSelectionTitle" | "languageSelectionSubtitle") =>
    getTranslation(displayLanguage, key);

  return (
    <div className="language-selection-page">
      <div className="language-selection-container">
        <div className="language-selection-content">
          <h1 className="language-selection-title" suppressHydrationWarning>
            {t("languageSelectionTitle")}
          </h1>
          <p className="language-selection-subtitle" suppressHydrationWarning>
            {t("languageSelectionSubtitle")}
          </p>
          
          <div className="languages-grid">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`language-card ${lang.code === selectedLanguage ? "selected" : ""}`}
                onClick={() => handleLanguageSelect(lang.code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLanguageSelect(lang.code);
                  }
                }}
              >
                <div className="language-flag">{FLAG_MAP[lang.code]}</div>
                <div className="language-info">
                  <div className="language-name">{lang.nativeName}</div>
                  <div className="language-name-english">{lang.name}</div>
                </div>
                {lang.code === selectedLanguage && (
                  <div className="language-check">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

