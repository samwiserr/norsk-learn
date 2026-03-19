import * as Sentry from "@sentry/nextjs";
import { LanguageCode } from "@/lib/languages";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event, _hint) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') return null;
    return event;
  },
});

// Helper to add language context to all errors
export const setLanguageContext = (language: LanguageCode) => {
  Sentry.setContext('language', { 
    code: language,
    locale: language 
  });
};



