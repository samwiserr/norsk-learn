import { detectLocale, getSupportedLanguageCodes } from '../i18n/detect-locale';
import { LanguageCode } from '../languages';

// Mock NextRequest for testing
const createMockRequest = (url: string, headers?: Record<string, string>) => {
  const urlObj = new URL(url);
  return {
    nextUrl: {
      pathname: urlObj.pathname,
    },
    headers: {
      get: (key: string) => headers?.[key.toLowerCase()] || null,
    },
  } as any;
};

describe('detect-locale', () => {
  it('should detect locale from URL path', () => {
    const request = createMockRequest('https://example.com/de/settings');
    const locale = detectLocale(request);
    expect(locale).toBe('de');
  });

  it('should detect locale from Accept-Language header', () => {
    const request = createMockRequest('https://example.com/settings', {
      'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
    });
    const locale = detectLocale(request);
    expect(locale).toBe('fr');
  });

  it('should fallback to default language', () => {
    const request = createMockRequest('https://example.com/settings');
    const locale = detectLocale(request);
    expect(locale).toBe('en');
  });

  it('should return supported language codes', () => {
    const codes = getSupportedLanguageCodes();
    expect(codes).toContain('en');
    expect(codes).toContain('de');
    expect(codes).toContain('fr');
    expect(codes.length).toBeGreaterThan(0);
  });
});

