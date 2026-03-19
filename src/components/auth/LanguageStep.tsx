"use client";

import { useState } from "react";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/languages";
import { saveToLocalStorage, loadFromLocalStorage } from "@/lib/storage";
import "./auth-forms.css";

const FLAG_MAP: Record<LanguageCode, string> = {
  en: "🇬🇧", no: "🇳🇴", de: "🇩🇪", fr: "🇫🇷", es: "🇪🇸", it: "🇮🇹",
  pt: "🇵🇹", nl: "🇳🇱", sv: "🇸🇪", da: "🇩🇰", fi: "🇫🇮", pl: "🇵🇱", uk: "🇺🇦",
};

interface LanguageStepProps {
  onContinue: (language: LanguageCode) => void;
}

export default function LanguageStep({ onContinue }: LanguageStepProps) {
  const stored = loadFromLocalStorage<string>("norsk_ui_language") as LanguageCode | null;
  const [selected, setSelected] = useState<LanguageCode>(stored ?? "en");

  const handleContinue = () => {
    saveToLocalStorage("norsk_ui_language", selected);
    onContinue(selected);
  };

  return (
    <div className="language-step">
      <p className="language-step-subtitle">
        Choose the language you want the app to display in.
        This can be changed later, but it will reset your learning progress.
      </p>
      <div className="language-step-grid">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            className={`language-step-item ${lang.code === selected ? "selected" : ""}`}
            onClick={() => setSelected(lang.code)}
          >
            <span className="language-step-flag">{FLAG_MAP[lang.code]}</span>
            <span className="language-step-name">{lang.nativeName}</span>
            {lang.code === selected && <span className="language-step-check">✓</span>}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="auth-submit-button"
        onClick={handleContinue}
      >
        Continue
      </button>
    </div>
  );
}
