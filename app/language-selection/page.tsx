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
import { cn } from "@/lib/utils";
import { AppPageScaffold } from "@/src/components/shell/AppPageScaffold";
import { Card, CardContent } from "@/src/components/ui/card";

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
  const detectedLanguage = typeof window !== "undefined" ? detectBrowserLanguage() : DEFAULT_LANGUAGE;

  const [displayLanguage, setDisplayLanguage] = useState<LanguageCode>(detectedLanguage);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(detectedLanguage);

  useEffect(() => {
    const stored = loadFromLocalStorage<string>("norsk_ui_language");
    if (stored && isValidLanguageCode(stored)) {
      router.push("/level-selection");
      return;
    }

    if (detectedLanguage && isValidLanguageCode(detectedLanguage)) {
      setSelectedLanguage(detectedLanguage);
      setDisplayLanguage(detectedLanguage);
    }
  }, [router, detectedLanguage]);

  const handleLanguageSelect = (code: LanguageCode) => {
    setSelectedLanguage(code);
    setDisplayLanguage(code);
    saveToLocalStorage("norsk_ui_language", code);
    router.push("/level-selection");
  };

  const t = (key: "languageSelectionTitle" | "languageSelectionSubtitle") => getTranslation(displayLanguage, key);

  return (
    <AppPageScaffold maxWidth="wide" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background: "radial-gradient(circle at 30% 20%, hsl(var(--muted)) 0%, transparent 55%)",
        }}
      />
      <div className="relative z-[1]">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl" suppressHydrationWarning>
            {t("languageSelectionTitle")}
          </h1>
          <p className="mt-3 text-muted-foreground" suppressHydrationWarning>
            {t("languageSelectionSubtitle")}
          </p>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const selected = lang.code === selectedLanguage;
            return (
              <button
                key={lang.code}
                type="button"
                className={cn("text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
                onClick={() => handleLanguageSelect(lang.code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLanguageSelect(lang.code);
                  }
                }}
              >
                <Card
                  className={cn(
                    "h-full border-2 shadow-sm hover:border-primary/50 hover:shadow-md",
                    selected ? "border-primary bg-primary/5" : "border-border bg-card",
                  )}
                >
                  <CardContent className="relative flex items-center gap-4 p-5">
                    <span className="text-3xl leading-none" aria-hidden>
                      {FLAG_MAP[lang.code]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground">{lang.nativeName}</div>
                      <div className="text-sm text-muted-foreground">{lang.name}</div>
                    </div>
                    {selected ? (
                      <span className="absolute right-3 top-3 text-lg font-semibold text-primary" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </AppPageScaffold>
  );
}
