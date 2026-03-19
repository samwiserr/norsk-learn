import { LanguageCode, Translations } from '@/lib/languages';
import { createLogger } from "@/lib/logger";

const log = createLogger("I18nLoader");

/**
 * Load translations dynamically for code splitting
 * Only loads the language file needed by the user
 */
export async function loadTranslations(locale: LanguageCode): Promise<Translations> {
  try {
    // Dynamic import for code splitting - only loads the needed language
    const translationsModule = await import(`@/messages/${locale}.json`);
    return translationsModule.default as unknown as Translations;
  } catch (error) {
    log.error(`Failed to load translations for locale: ${locale}`, error);
    // Fallback to English if locale file doesn't exist
    if (locale !== 'en') {
      try {
        const fallback = await import(`@/messages/en.json`);
        return fallback.default as unknown as Translations;
      } catch (fallbackError) {
        log.error('Failed to load fallback translations:', fallbackError);
        throw error;
      }
    }
    throw error;
  }
}

/**
 * Preload translations for faster access
 */
const translationCache = new Map<LanguageCode, Promise<Translations>>();

export function preloadTranslations(locale: LanguageCode): void {
  if (!translationCache.has(locale)) {
    translationCache.set(locale, loadTranslations(locale));
  }
}

export function getCachedTranslations(locale: LanguageCode): Promise<Translations> | null {
  return translationCache.get(locale) || null;
}


