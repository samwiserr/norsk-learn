"use client";

import { useState, useRef, useEffect } from "react";
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from "@/lib/languages";
import "./LanguageSelectorLanding.css";

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

interface Props {
  selectedLanguage: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
}

const LanguageSelectorLanding = ({
  selectedLanguage,
  onLanguageChange,
}: Props) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const current =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === selectedLanguage) ??
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div 
      className="language-selector-landing" 
      ref={dropdownRef} 
      style={{ 
        position: "relative", 
        flexShrink: 0,
        zIndex: open ? 1001 : "auto",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`language-selector-trigger ${open ? "open" : ""}`}
        suppressHydrationWarning
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          borderRadius: "24px",
          border: "1px solid rgba(0, 0, 0, 0.1)",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 600,
          color: "#1a1a1a",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          fontSize: "clamp(12px, 1.3vw + 0.5rem, 14px)",
          minWidth: "fit-content",
          maxWidth: "100%",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f8f8f8";
          e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.15)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.1)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <span style={{ fontSize: "20px" }} suppressHydrationWarning>{FLAG_MAP[current.code]}</span>
        <span suppressHydrationWarning>{current.nativeName}</span>
        <span 
          style={{ 
            fontSize: "10px", 
            transition: "transform 0.3s ease", 
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-block",
            opacity: 0.9,
          }}
        >
          ▼
        </span>
      </button>
      {open && (
        <div
          className="language-selector-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "8px",
            width: "240px",
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            zIndex: 1001,
            padding: "8px",
            maxHeight: "400px",
            overflowY: "auto",
            animation: "slideDown 0.3s ease-out",
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              onClick={() => {
                onLanguageChange(lang.code);
                setOpen(false);
              }}
              className={`language-selector-option ${lang.code === selectedLanguage ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "12px",
                cursor: "pointer",
                backgroundColor: lang.code === selectedLanguage 
                  ? "rgba(0, 0, 0, 0.05)" 
                  : "transparent",
                border: lang.code === selectedLanguage 
                  ? "1px solid rgba(0, 0, 0, 0.1)" 
                  : "1px solid transparent",
                color: "#1a1a1a",
                transition: "all 0.2s ease",
                marginBottom: "4px",
              }}
              onMouseEnter={(e) => {
                if (lang.code !== selectedLanguage) {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (lang.code !== selectedLanguage) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              <span style={{ fontSize: "20px", lineHeight: 1 }}>{FLAG_MAP[lang.code]}</span>
              <span style={{ flex: 1, fontWeight: lang.code === selectedLanguage ? 600 : 400, color: "#1a1a1a" }}>
                {lang.nativeName}
              </span>
              {lang.code === selectedLanguage && (
                <span style={{ color: "#1a1a1a", fontSize: "16px", fontWeight: 600 }}>✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelectorLanding;

