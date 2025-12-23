"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useContext } from "react";
import "./level-selection.css";
import {
  CEFR_LEVELS,
  type CEFRLevel,
} from "@/lib/cefr";
import {
  DEFAULT_LANGUAGE,
  getTranslation,
  isValidLanguageCode,
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
import { Context } from "@/src/context/Context";

const LevelSelectionPage = () => {
  const router = useRouter();
  const { language, setLanguage: setContextLanguage } = useContext(Context);
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<CEFRLevel | null>(null);
  const [hasActiveSessions, setHasActiveSessions] = useState(false);

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
    // Mark that user is navigating from level selection page
    // This helps Context detect when to create a new conversation after language/level selection
    if (typeof window !== "undefined") {
      sessionStorage.setItem("norsk_from_level_selection", "true");
    }
    // Don't clear sessions - previous conversations should remain visible
    router.push("/");
  };

  const handleBack = () => {
    // Navigate back without setting the flag, so no new conversation is created
    // This allows user to return to conversation if they clicked "Change level" by mistake
    router.push("/");
  };

  const t = (key: any, params?: Record<string, string>) =>
    getTranslation(language, key, params);

  return (
    <div className="level-selection-container">
      <div className="background-animation">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      <div className="level-selection-header">
        {hasActiveSessions && (
          <button
            type="button"
            className="back-button"
            onClick={handleBack}
            aria-label={t("back")}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4l-6 6 6 6"/>
            </svg>
            <span suppressHydrationWarning>{t("back")}</span>
          </button>
        )}
        <div className="header-actions">
          <LanguageSelectorLanding
            selectedLanguage={language}
            onLanguageChange={(code) => {
              // Update both local storage and Context so AuthButtons updates immediately
              saveToLocalStorage("norsk_ui_language", code);
              setContextLanguage(code);
              // Trigger language reload event for other components
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("language-reload"));
              }
              // Language change alone should NOT trigger new conversation
              // User must also select a level to create a new conversation
            }}
          />
          <AuthButtons />
        </div>
      </div>

      <div className="level-selection-content">
        <div className="title-section">
          <h1 className="level-selection-title" suppressHydrationWarning>{t("welcomeTitle")}</h1>
          <div className="title-underline"></div>
          <p className="level-selection-subtitle" suppressHydrationWarning>
            {selectedLevel
              ? t("currentLevelSubtitle", { level: selectedLevel })
              : t("selectLevelSubtitle")}
          </p>
        </div>

        <div className="levels-grid">
          {CEFR_LEVELS.map((level, index) => {
            const levelInfo = getTranslatedCEFRLevelInfo(level, language);
            return (
              <div
                key={`${level}-${language}`}
                className={`level-card ${selectedLevel === level ? "selected" : ""} ${hoveredLevel === level ? "hovered" : ""}`}
                onClick={() => handleSelect(level)}
                onMouseEnter={() => setHoveredLevel(level)}
                onMouseLeave={() => setHoveredLevel(null)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="level-card-glow"></div>
                <div className="level-badge">{level}</div>
                <h3 className="level-name" suppressHydrationWarning>{levelInfo.name}</h3>
                <p className="level-description" suppressHydrationWarning>
                  {levelInfo.description}
                </p>
                <div className="level-card-accent"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LevelSelectionPage;
