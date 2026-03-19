import { initAnalytics, trackEvent, setLanguage } from '../analytics';
import { LanguageCode } from '../languages';

// Mock posthog-js
jest.mock('posthog-js', () => {
  const mockPostHog = {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    opt_out_capturing: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockPostHog,
  };
});

describe('analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    delete (process.env as any).NEXT_PUBLIC_POSTHOG_KEY;
    // Reset window object
    (global as any).window = { ...global.window };
  });

  it('should not initialize PostHog when key is not provided', () => {
    delete (process.env as any).NEXT_PUBLIC_POSTHOG_KEY;
    initAnalytics();
    expect(mockPostHog.init).not.toHaveBeenCalled();
  });

  it('should initialize PostHog when key is provided', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
    (global as any).window = {};
    initAnalytics();
    expect(mockPostHog.init).toHaveBeenCalled();
  });

  it('should track events with language context', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
    (global as any).window = {};
    initAnalytics();
    trackEvent('test_event', { prop: 'value' }, 'de');
    expect(mockPostHog.capture).toHaveBeenCalledWith('test_event', {
      prop: 'value',
      language: 'de',
      locale: 'de',
    });
  });

  it('should set language for user', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
    (global as any).window = {};
    initAnalytics();
    setLanguage('fr');
    expect(mockPostHog.identify).toHaveBeenCalledWith(undefined, { language: 'fr', locale: 'fr' });
  });
});

