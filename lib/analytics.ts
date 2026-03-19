"use client";

import posthog from 'posthog-js';
import { LanguageCode } from '@/lib/languages';
import { createLogger } from "@/lib/logger";

const log = createLogger("Analytics");

let initialized = false;
let posthogInstance: typeof posthog | null = null;

export const initAnalytics = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY && !initialized) {
    try {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        loaded: (ph) => {
          posthogInstance = ph;
          if (process.env.NODE_ENV === 'development') {
            ph.opt_out_capturing();
          }
        },
      });
      initialized = true;
    } catch (error) {
      log.error('Failed to initialize PostHog:', error);
    }
  }
};

export const trackEvent = (
  event: string,
  properties?: Record<string, any>,
  language?: LanguageCode
) => {
  if (typeof window !== 'undefined' && initialized && posthogInstance) {
    try {
      posthogInstance.capture(event, {
        ...properties,
        language: language || 'unknown',
        locale: language || 'en',
      });
    } catch (error) {
      log.error('Failed to track event:', error);
    }
  }
};

export const setLanguage = (language: LanguageCode) => {
  if (typeof window !== 'undefined' && initialized && posthogInstance) {
    try {
      posthogInstance.identify(undefined, { language, locale: language });
    } catch (error) {
      log.error('Failed to set language:', error);
    }
  }
};

