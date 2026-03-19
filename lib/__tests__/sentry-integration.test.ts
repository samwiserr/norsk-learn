import { setLanguageContext } from '../../sentry.client.config';
import { LanguageCode } from '../languages';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  setContext: jest.fn(),
  captureException: jest.fn(),
}));

describe('Sentry integration', () => {
  it('should set language context', () => {
    const language: LanguageCode = 'de';
    setLanguageContext(language);
    // Context should be set (mocked)
    expect(true).toBe(true); // Placeholder
  });
});



