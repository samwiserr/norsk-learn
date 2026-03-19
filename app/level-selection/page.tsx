"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useContext } from "react";
import "./level-selection.css";
import {
  CEFR_LEVELS,
  type CEFRLevel,
} from "@/lib/cefr";
import {
  getTranslation,
  type LanguageCode,
} from "@/lib/languages";
import { getTranslatedCEFRLevelInfo } from "@/lib/cefr-translations";
import LanguageSelectorLanding from "@/src/components/LanguageSelectorLanding";
import AuthButtons from "@/src/components/auth/AuthButtons";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from "@/lib/storage";
import { Session, validateSession } from "@/lib/sessions";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { StorageService } from "@/src/services/storageService";
import { wipeAllLearningDataWithSync } from "@/lib/data-wipe";
import { AuthContext } from "@/src/context/AuthContext";
import { SESSION_STORAGE_KEYS } from "@/lib/constants";
import ConfirmDialog from "@/src/components/ConfirmDialog";
import TestimonialsBar from "@/src/components/TestimonialsBar";
import { GraduationCap, Bell, User } from "lucide-react";

const LevelSelectionPage = () => {
  const router = useRouter();
  const { language, setLanguage: setContextLanguage } = useLanguageContext();
  const { user } = useContext(AuthContext);
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | null>(null);
  const [hasActiveSessions, setHasActiveSessions] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode | null>(null);

  useEffect(() => {
    const storedLevel = loadFromLocalStorage<string>("norsk_cefr_level");
    if (storedLevel && CEFR_LEVELS.includes(storedLevel as CEFRLevel)) {
      setSelectedLevel(storedLevel as CEFRLevel);
    }
    // Check if there are any active sessions
    const storedSessions = loadFromLocalStorage<Session[]>("norsk_sessions");
    const validSessions = (storedSessions ?? []).filter(validateSession);
    setHasActiveSessions(validSessions.length > 0);
  }, []);

  const handleSelect = (level: CEFRLevel) => {
    setSelectedLevel(level);
    saveToLocalStorage("norsk_cefr_level", level);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.FROM_LEVEL_SELECTION, "true");
      const returnPath = sessionStorage.getItem(SESSION_STORAGE_KEYS.RETURN_PATH);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.RETURN_PATH);
      router.push(returnPath || "/");
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    if (newLanguage === language) {
      return;
    }
    setPendingLanguage(newLanguage);
    setShowConfirmDialog(true);
  };

  const performLanguageChange = async (newLanguage: LanguageCode) => {
    const existingReturnPath = typeof window !== "undefined"
      ? sessionStorage.getItem(SESSION_STORAGE_KEYS.RETURN_PATH)
      : null;

    await wipeAllLearningDataWithSync(user?.uid);

    if (typeof window !== "undefined") {
      StorageService.saveLanguage(newLanguage);
      if (existingReturnPath) {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.RETURN_PATH, existingReturnPath);
      }
      setContextLanguage(newLanguage);
      window.dispatchEvent(new StorageEvent("storage", {
        key: "norsk_ui_language",
        newValue: newLanguage,
        oldValue: language,
      }));
    }

    setShowConfirmDialog(false);
    setPendingLanguage(null);

    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.location.reload();
      }, 100);
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

  const t = (key: any, params?: Record<string, string>) =>
    getTranslation(language, key, params);

  return (
    <div className="level-selection-container">
      <header className="level-selection-header">
        <div className="header-left">
          <div className="logo-container">
            <GraduationCap size={32} />
            <span className="logo-title">Norsk Tutor</span>
          </div>
        </div>

        <div className="header-right">
          <div className="header-actions-group">
            <LanguageSelectorLanding
              selectedLanguage={language}
              onLanguageChange={handleLanguageChange}
            />
            <Bell size={20} className="nav-icon" />
            <div className="user-avatar">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} />
              ) : (
                <User size={20} color="#718096" />
              )}
            </div>
            {/* Keeping AuthButtons for actual login/logout logic if needed, 
                though mockup suggests a simple user icon */}
            <AuthButtons />
          </div>
        </div>
      </header>

      <main className="level-selection-content">
        <div className="title-section">
          {hasActiveSessions && (
            <button
              type="button"
              className="back-button"
              onClick={handleBack}
              aria-label={t("back")}
              style={{ marginBottom: '24px' }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4l-6 6 6 6" />
              </svg>
              <span suppressHydrationWarning>{t("back")}</span>
            </button>
          )}
          <h1 className="level-selection-title" suppressHydrationWarning>Select Your Norwegian Level</h1>
          <p className="level-selection-subtitle" suppressHydrationWarning>
            {t("selectLevelSubtitle")}
          </p>
        </div>

        <div className="levels-grid">
          {CEFR_LEVELS.map((level) => {
            const levelInfo = getTranslatedCEFRLevelInfo(level, language);
            const isSelected = selectedLevel === level;
            return (
              <div
                key={`${level}-${language}`}
                className={`level-card ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(level)}
              >
                <div className="level-card-header">
                  <div className="level-primary-info">
                    <span className="level-id">{level}</span>
                    <span className="level-name">{levelInfo.name}</span>
                  </div>
                  <div className="selection-indicator">
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="level-description" suppressHydrationWarning>
                  {levelInfo.description}
                </p>
              </div>
            );
          })}
        </div>
      </main>

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

      <TestimonialsBar />
    </div>
  );
};

export default LevelSelectionPage;
