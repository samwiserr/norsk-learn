"use client";

import { useContext, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { AuthContext } from "@/src/context/AuthContext";
import { getTranslation, SUPPORTED_LANGUAGES, type LanguageCode, DEFAULT_LANGUAGE, isValidLanguageCode } from "@/lib/languages";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { UserRepository } from "@/src/repositories/userRepository";
import { StorageService } from "@/src/services/storageService";
import { loadAllSessionsFromFirestore, deleteSessionFromFirestore } from "@/lib/firebase/sync";
import { loadFromLocalStorage } from "@/lib/storage";
import ConfirmDialog from "@/src/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import "./settings.css";

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

export default function SettingsPage() {
  const router = useRouter();
  const { language: contextLanguage, isReady } = useLanguageContext();
  const { user } = useContext(AuthContext);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode | null>(null);
  const [showMobileLanguageModal, setShowMobileLanguageModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // Ensure we have the correct language - read directly from localStorage
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [mounted, setMounted] = useState(false);
  const isUnmountingRef = useRef(false);
  
  // Read language from localStorage on mount (client-side only)
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const stored = loadFromLocalStorage<string>("norsk_ui_language");
      if (stored && isValidLanguageCode(stored)) {
        setLanguageState(stored);
      } else if (contextLanguage) {
        setLanguageState(contextLanguage);
      }
    }
  }, [contextLanguage]);
  
  // Update language when context language changes or when ready
  useEffect(() => {
    // Skip updates if unmounting or pending language change
    if (isUnmountingRef.current || pendingLanguage) return;
    
    if (typeof window !== "undefined") {
      const stored = loadFromLocalStorage<string>("norsk_ui_language");
      if (stored && isValidLanguageCode(stored)) {
        setLanguageState(stored);
      } else if (isReady && contextLanguage) {
        setLanguageState(contextLanguage);
      }
    }
  }, [contextLanguage, isReady, pendingLanguage]);
  
  // Listen for storage changes (when language is changed in another tab/window)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleStorageChange = (e: StorageEvent) => {
      // Skip updates if unmounting
      if (isUnmountingRef.current) return;
      
      if (e.key === "norsk_ui_language" && e.newValue && isValidLanguageCode(e.newValue)) {
        setLanguageState(e.newValue as LanguageCode);
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  
  const t = (key: any) => {
    const translation = getTranslation(language, key);
    if (!translation && process.env.NODE_ENV === "development") {
      // missing translation key in dev
    }
    return translation;
  };

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    if (newLanguage === language) {
      return;
    }

    // Always show confirmation dialog when changing language
    // This warns the user that all conversations will be lost
    setPendingLanguage(newLanguage);
    setShowConfirmDialog(true);
  };

  const performLanguageChange = async (newLanguage: LanguageCode) => {
    // Mark as unmounting to prevent state updates during redirect
    isUnmountingRef.current = true;
    
    SessionRepository.clearAll();
    UserRepository.resetUserMessageCount();
    
    if (typeof window !== "undefined") {
      // Clear session storage flags
      sessionStorage.removeItem("norsk_from_level_selection");
      
      // Also clear any cached session data
      sessionStorage.clear();
    }
    
    // Clear Firestore if authenticated
    if (user) {
      try {
        const firestoreSessions = await loadAllSessionsFromFirestore(user.uid);
        for (const session of firestoreSessions) {
          try {
            await deleteSessionFromFirestore(user.uid, session.id);
          } catch {
            // individual session deletion failed, continuing
          }
        }
      } catch {
        // Firestore clear failed, local clear still succeeded
      }
    }
    
    // Save language to localStorage directly (bypasses React state to prevent warnings)
    // We skip setLanguage() call to avoid state updates during unmount
    if (typeof window !== "undefined") {
      // Store previous language in sessionStorage so it persists across redirect
      sessionStorage.setItem("norsk_previous_language", language);
      
      // Save new language
      StorageService.saveLanguage(newLanguage);
      
      // Force a storage event to notify other components
      window.dispatchEvent(new StorageEvent("storage", {
        key: "norsk_ui_language",
        newValue: newLanguage,
        oldValue: language,
      }));
    }
    
    // Close dialogs
    setShowConfirmDialog(false);
    setPendingLanguage(null);
    
    // Use window.location.replace for a hard redirect that clears cache
    // This ensures the new page loads fresh and detects the language change
    if (typeof window !== "undefined") {
      // Small delay to ensure all cleanup completes
      setTimeout(() => {
        window.location.replace("/level-selection");
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

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqs = [
    {
      question: t("faqHowItWorks") || "How does the app work?",
      answer: t("faqHowItWorksAnswer") || "The app uses AI to have conversations with you in Norwegian. You select your CEFR level (A1-C1), and the tutor adapts questions and feedback to your level. You practice by responding in Norwegian, and the tutor provides corrections and explanations.",
    },
    {
      question: t("faqProgress") || "How is my progress calculated?",
      answer: t("faqProgressAnswer") || "Your progress is calculated based on the quality of your responses. The AI evaluates your fluency, vocabulary, grammar, and coherence. Progress can increase or decrease based on your performance, and you'll see your current level on the progress bar.",
    },
    {
      question: t("faqCEFR") || "What are CEFR levels?",
      answer: t("faqCEFRAnswer") || "CEFR (Common European Framework of Reference) is an international standard for language proficiency. A1 is beginner, A2 is elementary, B1-B2 are intermediate levels, and C1 is advanced. You can change your level at any time from the level selection page.",
    },
    {
      question: t("faqChangeLevel") || "How do I change my level?",
      answer: t("faqChangeLevelAnswer") || "Click the 'Change Level' button in the header, or use the back button to return to the level selection page. Select a new level to start a fresh conversation at that level.",
    },
    {
      question: t("faqLanguage") || "Can I change the interface language?",
      answer: t("faqLanguageAnswer") || "Yes! You can change the interface language in Settings. Note that changing the language will reset all your conversations and progress, as the tutor adapts to your selected language.",
    },
    {
      question: t("faqSaveProgress") || "How do I save my progress?",
      answer: t("faqSaveProgressAnswer") || "Sign up for a free account to sync your progress across devices. Without an account, your progress is stored locally in your browser.",
    },
  ];

  // Don't render until mounted (client-side only) to avoid hydration mismatch
  // Show a placeholder to prevent layout shift
  if (!mounted) {
    return (
      <div className="settings-page-container">
        <div className="settings-page-header" style={{ minHeight: '60px' }}>
          <div style={{ width: '80px' }}></div>
          <div style={{ flex: 1 }}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="settings-page-container" key={language}>
        <div className="settings-page-header">
          <button
            type="button"
            className="settings-back-button"
            onClick={() => router.back()}
            aria-label={t("back")}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4l-6 6 6 6"/>
            </svg>
            <span>{t("back")}</span>
          </button>
          <h1 className="settings-page-title">
            {t("settings")}
          </h1>
        </div>

        <div className="settings-page-content">
          {/* Language Selection Section */}
          <section className="settings-section">
            <h2 className="settings-section-title">
              {t("language") || "Language"}
            </h2>
            <p className="settings-section-description">
              {t("languageDescription") || "Select your preferred interface language."}
            </p>
            {/* Desktop Language Selection */}
            <div className="flex min-h-9 flex-row flex-wrap items-center gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={cn(
                    "box-border flex min-w-fit items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors",
                    "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    lang.code === language && "border-2 border-primary bg-primary/10 font-semibold",
                  )}
                  onClick={() => handleLanguageChange(lang.code)}
                >
                  <span className="text-lg" aria-hidden>
                    {FLAG_MAP[lang.code]}
                  </span>
                  <span>{lang.nativeName}</span>
                  {lang.code === language ? (
                    <span className="text-sm font-semibold" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            
            {/* Mobile Language Selector Trigger */}
            <button
              type="button"
              className="language-selector-mobile-trigger"
              onClick={() => setShowMobileLanguageModal(true)}
            >
              <span style={{ fontSize: "18px" }}>{FLAG_MAP[language]}</span>
              <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName}</span>
              <span style={{ fontSize: "10px", opacity: 0.7 }}>▼</span>
            </button>
          </section>

          {/* FAQs Section */}
          <section className="settings-section">
            <h2 className="settings-section-title">
              {t("helpCenter") || "Help & FAQs"}
            </h2>
            <p className="settings-section-description">
              {t("faqDescription") || "Frequently asked questions about how the app works."}
            </p>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <div key={index} className="faq-item">
                  <button
                    type="button"
                    className="faq-question"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={expandedFaq === index}
                  >
                    <span>{faq.question}</span>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`faq-icon ${expandedFaq === index ? "expanded" : ""}`}
                    >
                      <path d="M5 8l5 5 5-5"/>
                    </svg>
                  </button>
                  {expandedFaq === index && (
                    <div className="faq-answer">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      
      {/* Mobile Language Selector Modal */}
      {showMobileLanguageModal && (
        <div 
          className="language-selector-mobile-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMobileLanguageModal(false);
            }
          }}
        >
          <div className="language-selector-mobile-content">
            <div className="language-selector-mobile-header">
              <h2 className="language-selector-mobile-title">
                {t("changeLanguage") || "Select Language"}
              </h2>
              <button
                type="button"
                className="language-selector-mobile-close"
                onClick={() => setShowMobileLanguageModal(false)}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5l-10 10M5 5l10 10"/>
                </svg>
              </button>
            </div>
            <div className="language-selector-mobile-grid">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`language-selector-mobile-item ${lang.code === language ? "active" : ""}`}
                  onClick={() => {
                    setShowMobileLanguageModal(false);
                    handleLanguageChange(lang.code);
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{FLAG_MAP[lang.code]}</span>
                  <span>{lang.nativeName}</span>
                  {lang.code === language && (
                    <span style={{ fontSize: "14px", fontWeight: 600, marginLeft: "auto" }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
}


