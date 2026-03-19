import { initAnalytics, trackEvent, setLanguage } from '../analytics';
import posthog from 'posthog-js';

jest.mock('posthog-js', () => {
  const mockPh = {
    init: jest.fn((_key: string, opts?: { loaded?: (ph: unknown) => void }) => {
      opts?.loaded?.(mockPh);
    }),
    capture: jest.fn(),
    identify: jest.fn(),
    opt_out_capturing: jest.fn(),
  };
  return { __esModule: true, default: mockPh };
});

describe('analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (process.env as any).NEXT_PUBLIC_POSTHOG_KEY;
    (global as any).window = typeof window !== 'undefined' ? { ...window } : {};
  });

  it('should not initialize PostHog when key is not provided', () => {
    delete (process.env as any).NEXT_PUBLIC_POSTHOG_KEY;
    initAnalytics();
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('should initialize PostHog when key is provided', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
    (global as any).window = {};
    initAnalytics();
    expect(posthog.init).toHaveBeenCalled();
  });

  it('should track events with language context', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key';
    (global as any).window = {};
    initAnalytics();
    trackEvent('test_event', { prop: 'value' }, 'de');
    expect(posthog.capture).toHaveBeenCalledWith('test_event', {
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
    expect(posthog.identify).toHaveBeenCalledWith(undefined, { language: 'fr', locale: 'fr' });
  });
});

