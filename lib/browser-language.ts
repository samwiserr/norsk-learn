/**
 * Browser Language Detection Utility
 * Detects user's browser language and maps it to supported app languages
 */

import { SUPPORTED_LANGUAGES, type LanguageCode, DEFAULT_LANGUAGE } from "./languages";

/**
 * Detects the user's browser language and maps it to a supported language code
 * @returns A supported LanguageCode, or DEFAULT_LANGUAGE if no match found
 */
export function detectBrowserLanguage(): LanguageCode {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE; // Server-side fallback
  }

  // Get browser's preferred languages (array of language codes)
  const browserLanguages = navigator.languages || [navigator.language];
  
  // Supported language codes
  const supportedCodes = SUPPORTED_LANGUAGES.map(lang => lang.code);
  
  // Try to match each browser language
  for (const browserLang of browserLanguages) {
    // Extract base language code (e.g., "en" from "en-US", "es" from "es-MX")
    const parts = browserLang.split("-");
    if (!parts[0]) continue;
    const baseCode = parts[0].toLowerCase();
    
    // Direct match (e.g., "en" matches "en", "es" matches "es")
    if (supportedCodes.includes(baseCode as LanguageCode)) {
      return baseCode as LanguageCode;
    }
    
    // Handle special cases:
    // - "nb" or "nn" (Norwegian Bokmål/Nynorsk variants) -> "no"
    if (baseCode === "nb" || baseCode === "nn") {
      return "no";
    }
    // - "pt-BR" vs "pt-PT" -> both map to "pt"
    if (baseCode === "pt") {
      return "pt";
    }
  }
  
  // Fallback to English if no match found
  return DEFAULT_LANGUAGE;
}



