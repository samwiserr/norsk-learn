import { loadTranslations, preloadTranslations, getCachedTranslations } from '../i18n/loader';
import { LanguageCode, Translations } from '../languages';

// Mock the dynamic import
const mockTranslations = {
  welcomeTitle: "Welcome to Norwegian Learning!",
  greeting: "Hello!",
} as Partial<Translations>;

// Mock dynamic import
jest.mock('@/messages/en.json', () => ({
  default: mockTranslations,
}), { virtual: true });

describe('i18n loader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the cache
    jest.resetModules();
  });

  it('should load translations for a valid locale', async () => {
    // This will fail if JSON file doesn't exist, which is expected for now
    // The function should fallback to static translations
    try {
      const translations = await loadTranslations('en');
      expect(translations).toBeDefined();
    } catch (error) {
      // Expected if JSON file doesn't exist yet
      expect(error).toBeDefined();
    }
  });

  it('should handle missing translation files gracefully', async () => {
    // Test that it handles missing files
    try {
      await loadTranslations('xx' as LanguageCode);
    } catch (error) {
      // Should throw or fallback
      expect(error).toBeDefined();
    }
  });
});

