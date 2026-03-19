"use client";

import { useContext, useState, useRef, useEffect } from "react";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { AuthContext } from "@/src/context/AuthContext";
import { getTranslation, SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/languages";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { StorageService } from "@/src/services/storageService";
import { wipeAllLearningDataWithSync } from "@/lib/data-wipe";
import { SESSION_STORAGE_KEYS } from "@/lib/constants";
import ConfirmDialog from "./ConfirmDialog";
import "./Settings.css";

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

const Settings = () => {
  // Use LanguageContext as the single source of truth
  const { language, setLanguage } = useLanguageContext();
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode | null>(null);
  const [highContrast, setHighContrast] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const t = (key: any) => getTranslation(language, key);

  // Load high contrast setting on mount
  useEffect(() => {
    const saved = StorageService.loadHighContrastMode();
    setHighContrast(saved);
    // Apply to document root
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-high-contrast", saved.toString());
    }
  }, []);

  // Handle high contrast toggle
  const handleHighContrastToggle = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    StorageService.saveHighContrastMode(newValue);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-high-contrast", newValue.toString());
    }
  };

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    if (newLanguage === language) {
      setIsOpen(false);
      return;
    }

    // Check if there are any sessions to warn about
    const sessions = SessionRepository.getAll();
    if (sessions.length > 0) {
      setPendingLanguage(newLanguage);
      setShowConfirmDialog(true);
    } else {
      // No sessions, just change language
      performLanguageChange(newLanguage);
    }
  };

  const performLanguageChange = async (newLanguage: LanguageCode) => {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
    await wipeAllLearningDataWithSync(user?.uid);

    if (typeof window !== "undefined") {
      StorageService.saveLanguage(newLanguage);
      sessionStorage.setItem(SESSION_STORAGE_KEYS.RETURN_PATH, currentPath);
    }

    setLanguage(newLanguage);

    setShowConfirmDialog(false);
    setIsOpen(false);
    setPendingLanguage(null);

    if (typeof window !== "undefined") {
      window.location.href = "/level-selection";
    }
  };

  const handleConfirmLanguageChange = () => {
    if (pendingLanguage) {
      performLanguageChange(pendingLanguage);
    }
  };

  const handleCancelLanguageChange = () => {
    setShowConfirmDialog(false);
    setPendingLanguage(null);
  };

  return (
    <>
      <div className="settings-container" ref={settingsRef}>
        <button
          type="button"
          className="sidebar-bottom-item"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>⚙️</span>
          <span>{t("settings")}</span>
        </button>

        {isOpen && (
          <div className="settings-menu">
            <div className="settings-section">
              <h3 className="settings-section-title">{t("language")}</h3>
              <div className="language-selector-list">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`language-selector-item ${lang.code === language ? "active" : ""}`}
                    onClick={() => handleLanguageChange(lang.code)}
                  >
                    <span className="language-flag">{FLAG_MAP[lang.code]}</span>
                    <span className="language-name">{lang.nativeName}</span>
                    {lang.code === language && (
                      <span className="language-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-section">
              <h3 className="settings-section-title">Accessibility</h3>
              <button
                type="button"
                className={`language-selector-item ${highContrast ? "active" : ""}`}
                onClick={handleHighContrastToggle}
              >
                <span className="language-flag">♿</span>
                <span className="language-name">High Contrast Mode</span>
                {highContrast && (
                  <span className="language-check">✓</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={t("changeLanguage") || "Change Language"}
        message={
          t("changeLanguageWarning") ||
          "Changing the language will delete all your conversations and reset your progress. This action cannot be undone. Do you want to continue?"
        }
        confirmText={t("confirm") || "Continue"}
        cancelText={t("cancel") || "Cancel"}
        onConfirm={handleConfirmLanguageChange}
        onCancel={handleCancelLanguageChange}
      />
    </>
  );
};

export default Settings;
