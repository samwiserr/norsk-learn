"use client";

import { useState, useRef, useEffect } from "react";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/languages";
import { cn } from "@/lib/utils";

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

const LanguageSelectorLanding = ({ selectedLanguage, onLanguageChange }: Props) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const current =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === selectedLanguage) ?? SUPPORTED_LANGUAGES[0];

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
    <div ref={dropdownRef} className={cn("relative shrink-0", open && "z-[1001]")}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        suppressHydrationWarning
        className={cn(
          "flex max-w-full min-w-fit items-center gap-2 rounded-full border border-border bg-card px-[18px] py-2.5 text-[clamp(12px,1.3vw+0.5rem,14px)] font-semibold text-card-foreground shadow-sm",
          "transition-all duration-200 hover:-translate-y-px hover:bg-muted hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open && "ring-2 ring-ring ring-offset-2"
        )}
      >
        <span className="text-xl leading-none" suppressHydrationWarning>
          {FLAG_MAP[current.code]}
        </span>
        <span suppressHydrationWarning>{current.nativeName}</span>
        <span
          className={cn(
            "inline-block text-[10px] opacity-90 transition-transform duration-300",
            open && "rotate-180"
          )}
          aria-hidden
        >
          ▼
        </span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-[1001] mt-2 max-h-[400px] w-60 overflow-y-auto rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg"
          role="listbox"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = lang.code === selectedLanguage;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onLanguageChange(lang.code);
                  setOpen(false);
                }}
                className={cn(
                  "mb-1 flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-3 text-left text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && "border-border bg-muted/80 font-semibold"
                )}
              >
                <span className="text-xl leading-none">{FLAG_MAP[lang.code]}</span>
                <span className="flex-1">{lang.nativeName}</span>
                {active && <span className="text-base font-semibold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelectorLanding;
