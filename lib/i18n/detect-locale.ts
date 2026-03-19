import { NextRequest } from 'next/server';
import { LanguageCode, DEFAULT_LANGUAGE, isValidLanguageCode, SUPPORTED_LANGUAGES } from '@/lib/languages';

/**
 * Detect locale from request
 * Priority: URL path > Accept-Language header > Default
 */
export function detectLocale(request: NextRequest): LanguageCode {
  // 1. Check URL path parameter
  const pathname = request.nextUrl.pathname;
  const pathLocale = pathname.split('/').filter(Boolean)[0];
  if (pathLocale && isValidLanguageCode(pathLocale)) {
    return pathLocale;
  }
  
  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = parseAcceptLanguage(acceptLanguage);
    if (preferred && isValidLanguageCode(preferred)) {
      return preferred;
    }
  }
  
  // 3. Fallback to default
  return DEFAULT_LANGUAGE;
}

/**
 * Parse Accept-Language header
 * Format: "en-US,en;q=0.9,de;q=0.8"
 */
function parseAcceptLanguage(header: string): LanguageCode | null {
  const languages = header.split(',').map(lang => {
    const codePart = lang.split(';')[0] ?? '';
    const primary = codePart.trim().split('-')[0] ?? '';
    return primary.toLowerCase();
  });
  
  // Check each language in order of preference
  for (const lang of languages) {
    if (isValidLanguageCode(lang)) {
      return lang;
    }
  }
  
  return null;
}

/**
 * Get supported language codes
 */
export function getSupportedLanguageCodes(): LanguageCode[] {
  return SUPPORTED_LANGUAGES.map(lang => lang.code);
}



