"use client";

import { useState } from "react";
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from "@/lib/languages";
import "./LanguageSelector.css";

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
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
}

const LanguageSelector = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const current =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === value) ??
    SUPPORTED_LANGUAGES[0];

  return (
    <div className="language-selector">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="language-trigger"
      >
        <span>{FLAG_MAP[current.code]}</span>
        <span>{current.nativeName}</span>
        <span className="chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="language-menu">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              className={`language-item ${
                lang.code === value ? "active" : ""
              }`}
              onClick={() => {
                onChange(lang.code);
                setOpen(false);
              }}
            >
              <span>{FLAG_MAP[lang.code]}</span>
              <span>{lang.nativeName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;

