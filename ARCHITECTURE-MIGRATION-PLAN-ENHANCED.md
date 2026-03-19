# Modern SOTA Architecture Migration Plan - Enhanced for Large-Scale Multi-Language Support

## Critical Enhancements for Scale

This document contains the enhanced migration plan with specific additions for supporting large user bases with multiple languages. The original plan remains valid, with these critical additions.

---

## Phase 1.5: Internationalization Infrastructure (Week 2-3) - CRITICAL FOR SCALE

### Problem Statement
Currently, all 12 languages (~1142 lines) are bundled in `lib/languages.ts`, causing every user to download all translations regardless of their language. This wastes ~50-100KB per user, which becomes significant at scale (1M users = 50-100GB wasted bandwidth).

### 1.5.1 Restructure Translations for Code Splitting

**Files to create:**
- `messages/en.json` - English translations
- `messages/de.json` - German translations
- `messages/fr.json` - French translations
- `messages/es.json` - Spanish translations
- `messages/it.json` - Italian translations
- `messages/pt.json` - Portuguese translations
- `messages/nl.json` - Dutch translations
- `messages/sv.json` - Swedish translations
- `messages/da.json` - Danish translations
- `messages/fi.json` - Finnish translations
- `messages/pl.json` - Polish translations
- `messages/uk.json` - Ukrainian translations
- `messages/no.json` - Norwegian translations
- `lib/i18n/loader.ts` - Dynamic translation loader
- `lib/i18n/detect-locale.ts` - Locale detection utility

**Implementation:**
```typescript
// lib/i18n/loader.ts
import { LanguageCode, Translations } from '@/lib/languages';

export async function loadTranslations(locale: LanguageCode): Promise<Translations> {
  // Dynamic import for code splitting - only loads the needed language
  const module = await import(`@/messages/${locale}.json`);
  return module.default;
}

// lib/i18n/detect-locale.ts
import { NextRequest } from 'next/server';
import { LanguageCode, DEFAULT_LANGUAGE, isValidLanguageCode } from '@/lib/languages';

export function detectLocale(request: NextRequest): LanguageCode {
  // 1. Check URL path parameter
  const pathLocale = request.nextUrl.pathname.split('/')[1];
  if (isValidLanguageCode(pathLocale)) {
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

function parseAcceptLanguage(header: string): LanguageCode | null {
  // Parse "en-US,en;q=0.9,de;q=0.8" format
  const languages = header.split(',').map(lang => {
    const [code] = lang.split(';');
    return code.trim().split('-')[0].toLowerCase();
  });
  
  for (const lang of languages) {
    if (isValidLanguageCode(lang)) {
      return lang;
    }
  }
  
  return null;
}
```

**Migration steps:**
1. Extract translations from `lib/languages.ts` to individual JSON files
2. Update `getTranslation` function to use dynamic loader
3. Test language switching with new structure
4. Verify bundle size reduction (should see ~80-90% reduction per user)

### 1.5.2 Add Locale-Based Routing

**Files to create:**
- `middleware.ts` - Next.js middleware for locale routing
- `app/[locale]/layout.tsx` - Locale-based layout
- `app/[locale]/page.tsx` - Main page with locale
- `app/[locale]/level-selection/page.tsx` - Level selection with locale
- `app/[locale]/settings/page.tsx` - Settings with locale
- `app/[locale]/language-selection/page.tsx` - Language selection with locale

**Implementation:**
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { detectLocale } from '@/lib/i18n/detect-locale';
import { isValidLanguageCode } from '@/lib/languages';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  const locale = detectLocale(request);
  const pathLocale = pathname.split('/')[1];
  
  // If path already has valid locale, continue
  if (isValidLanguageCode(pathLocale)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-locale', pathLocale);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // Redirect to locale-prefixed path
  const newUrl = new URL(`/${locale}${pathname}`, request.url);
  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**Benefits:**
- Enables CDN caching per locale
- Better SEO for different languages
- Faster page loads (only loads needed language)
- Reduces bundle size by ~80-90%

---

## Phase 1.1 Enhanced: Sentry with Language Context

**Update existing Phase 1.1:**

```typescript
// sentry.client.config.ts - Enhanced version
import * as Sentry from "@sentry/nextjs";
import { LanguageCode } from '@/lib/languages';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
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
```

**Integration:**
- Call `setLanguageContext(language)` in all error handlers
- Add language to error tags in API routes
- Create language-specific error dashboards in Sentry

---

## Phase 1.2 Enhanced: PostHog with Language Tracking

**Update existing Phase 1.2:**

```typescript
// lib/analytics.ts - Enhanced version
import posthog from 'posthog-js';
import { LanguageCode } from '@/lib/languages';

export const initAnalytics = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.opt_out_capturing();
      },
    });
  }
};

export const trackEvent = (
  event: string,
  properties?: Record<string, any>,
  language?: LanguageCode
) => {
  posthog.capture(event, {
    ...properties,
    language: language || 'unknown',
    locale: language || 'en',
  });
};

export const setLanguage = (language: LanguageCode) => {
  posthog.identify(undefined, { language, locale: language });
};
```

**Integration:**
- Track all events with language context
- Create language-specific funnels in PostHog
- Monitor conversion rates per language
- Track error rates per language

---

## Phase 4.2 Enhanced: Language-Aware Caching

**Update existing Phase 4.2:**

**Files to update:**
- `lib/cache/redis.ts` - Add language parameter to cache methods
- `app/api/conversation/route.ts` - Include language in cache keys
- `app/api/initial-question/route.ts` - Include language in cache keys

**Implementation:**
```typescript
// lib/cache/redis.ts - Enhanced version
import { Redis } from '@upstash/redis';
import { LanguageCode } from '@/lib/languages';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const cache = {
  get: async <T>(key: string, language?: LanguageCode): Promise<T | null> => {
    const cacheKey = language ? `${key}:lang:${language}` : key;
    try {
      const data = await redis.get(cacheKey);
      return data as T | null;
    } catch (error) {
      console.error('[Cache] Get error:', error);
      return null;
    }
  },
  set: async <T>(key: string, value: T, ttl?: number, language?: LanguageCode) => {
    const cacheKey = language ? `${key}:lang:${language}` : key;
    try {
      await redis.set(cacheKey, value, ttl ? { ex: ttl } : undefined);
    } catch (error) {
      console.error('[Cache] Set error:', error);
    }
  },
  delete: async (key: string, language?: LanguageCode) => {
    const cacheKey = language ? `${key}:lang:${language}` : key;
    try {
      await redis.del(cacheKey);
    } catch (error) {
      console.error('[Cache] Delete error:', error);
    }
  },
  // Invalidate all languages for a user
  invalidateUser: async (userId: string) => {
    // Pattern match to delete all language variants
    const pattern = `*:${userId}:*`;
    // Note: Upstash Redis REST API may need different approach
    // May need to track keys separately or use SCAN
  },
};

// app/api/conversation/route.ts - Enhanced version
import { cache } from '@/lib/cache/redis';

export async function POST(req: NextRequest) {
  // ... existing validation ...
  
  // Get language from header (set by middleware) or body
  const language = req.headers.get('x-locale') || body.language || 'en';
  
  // Generate cache key with language
  const cacheKey = `conversation:${userId}:${sessionId}:${hashInput}`;
  
  // Check cache with language
  const cached = await cache.get<NextResponse>(cacheKey, language);
  if (cached) {
    return cached;
  }
  
  // ... existing Gemini API call ...
  
  // Cache response with language (5 minute TTL)
  await cache.set(cacheKey, response, 300, language);
  
  return response;
}
```

**Cache invalidation strategy:**
- Invalidate on session deletion (with language)
- Invalidate on language change (all languages for user)
- Invalidate on level change (with language)
- Implement cache warming for popular languages

---

## Phase 4.3: CDN and Edge Caching Configuration

**New section to add:**

**Files to create/update:**
- `next.config.js` - Add CDN and locale-based caching headers
- `.env.example` - Add CDN URL

**Implementation:**
```javascript
// next.config.js - Enhanced version
module.exports = {
  reactStrictMode: true,
  // CDN configuration
  assetPrefix: process.env.CDN_URL || '',
  // Locale-based headers for edge caching
  async headers() {
    return [
      {
        source: '/:locale/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
          {
            key: 'Vary',
            value: 'Accept-Language, x-locale',
          },
        ],
      },
      {
        source: '/:locale/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
          {
            key: 'Vary',
            value: 'Accept-Language, x-locale',
          },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      'zustand',
      '@google/generative-ai',
    ],
  },
};
```

**CDN Setup:**
- Configure Vercel Edge Network or Cloudflare
- Set up geographic distribution
- Configure cache rules per locale
- Monitor cache hit rates per language

---

## Phase 4.4 Enhanced: TanStack Query with Language Support

**Update existing Phase 4.3:**

```typescript
// src/hooks/useSessionsQuery.ts - Enhanced version
import { useQuery } from '@tanstack/react-query';
import { cache } from '@/lib/cache/redis';
import { SessionRepository } from '@/src/repositories/sessionRepository';
import { useLanguageStore } from '@/src/stores/useLanguageStore';

export const useSessions = () => {
  const language = useLanguageStore(state => state.language);
  
  return useQuery({
    queryKey: ['sessions', language], // Include language in query key
    queryFn: async () => {
      // Try cache first with language
      const cached = await cache.get<Session[]>('sessions', language);
      if (cached) return cached;
      
      // Fallback to repository
      const sessions = SessionRepository.getAll();
      await cache.set('sessions', sessions, 60, language); // 1 min TTL
      return sessions;
    },
  });
};
```

**Key changes:**
- All queries include language in query key
- Enables proper cache invalidation per language
- Prevents serving wrong language data

---

## Phase 6: Database Optimization for Scale (Week 12+)

### 6.1 Language-Based Database Partitioning

**Problem:** All users' data is in the same Firestore collections, which doesn't scale well for large user bases with different languages.

**Files to update:**
- `lib/firebase/sync.ts` - Add language-based collection paths
- `lib/firebase/config.ts` - Add composite indexes for language queries

**Implementation:**
```typescript
// lib/firebase/sync.ts - Enhanced version
export const syncSessionToFirestore = async (
  session: Session,
  userId: string,
  language: LanguageCode
) => {
  // Partition by language for better query performance
  const collectionPath = `users/${userId}/languages/${language}/sessions`;
  const sessionRef = doc(db, collectionPath, session.id);
  
  await setDoc(sessionRef, sessionToFirestore(session), { merge: true });
};

// Query sessions for a specific language
export const loadSessionsFromFirestore = async (
  userId: string,
  language: LanguageCode
) => {
  const collectionPath = `users/${userId}/languages/${language}/sessions`;
  const q = query(
    collection(db, collectionPath),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => firestoreToSession(doc.id, doc.data()));
};
```

**Benefits:**
- Better query performance (smaller collections per language)
- Easier to scale (can shard by language if needed)
- Better cache locality
- Easier to implement language-specific features

### 6.2 Language-Aware Rate Limiting

**Files to update:**
- `lib/rate-limiting.ts` - Add language parameter

**Implementation:**
```typescript
// lib/rate-limiting.ts - Enhanced version
export const rateLimit = async (
  identifier: string,
  language?: LanguageCode
) => {
  // Different rate limits per language if needed
  // Or same limits but tracked separately
  const key = language 
    ? `ratelimit:${identifier}:${language}`
    : `ratelimit:${identifier}`;
  
  // ... existing rate limiting logic
  // This allows:
  // - Per-language rate limiting
  // - Language-specific abuse detection
  // - Better monitoring per language
};
```

**Integration:**
- Update `app/api/conversation/route.ts` to pass language
- Update `app/api/initial-question/route.ts` to pass language
- Monitor rate limit hits per language

### 6.3 Database Connection Pooling and Optimization

**If moving to PostgreSQL:**
- Implement connection pooling (PgBouncer)
- Add language-based indexes
- Consider read replicas for different regions
- Monitor query performance per language

---

## Updated Timeline Summary

- **Week 1-2:** Observability & CI/CD + i18n Infrastructure (Phase 1.5)
- **Week 3-5:** State Management Migration
- **Week 6-7:** Styling Modernization
- **Week 8-9:** API & Caching + Language-Aware Caching
- **Week 10-11:** Performance Optimization + CDN Setup
- **Week 12+:** Database Optimization + Language Partitioning

**Total estimated time:** 12-13 weeks for core migration with scale enhancements

---

## Scale-Specific Success Metrics

### Performance (per language):
- API response time < 500ms (with caching)
- Page load time < 2s
- Bundle size reduction > 80% per user (only loads their language)
- Cache hit rate > 70% per language

### Reliability:
- Error rate < 0.1% per language
- Uptime > 99.9%
- Zero data loss during migration
- Language-specific error tracking

### Scalability:
- Support 1M+ users across 12 languages
- CDN cache hit rate > 80%
- Database query time < 100ms per language partition
- Rate limiting prevents abuse per language

---

## Critical Checklist for Multi-Language Scale

- [ ] Translations split into separate files (code splitting)
- [ ] Locale-based routing implemented
- [ ] Language context added to all errors (Sentry)
- [ ] Language tracking in all analytics (PostHog)
- [ ] Cache keys include language
- [ ] CDN configured with locale-based caching
- [ ] Database partitioned by language
- [ ] Rate limiting per language
- [ ] Monitoring dashboards per language
- [ ] Bundle size verified (should be ~80-90% smaller per user)

---

## Migration Priority for Scale

**Immediate (before large user base):**
1. ✅ Phase 1.5: i18n Infrastructure (code splitting)
2. ✅ Phase 1.1 Enhanced: Language context in Sentry
3. ✅ Phase 1.2 Enhanced: Language tracking in PostHog
4. ✅ Phase 4.2 Enhanced: Language-aware caching

**Short term (first 100K users):**
5. ✅ Phase 4.3: CDN configuration
6. ✅ Phase 6.1: Database partitioning
7. ✅ Phase 6.2: Language-aware rate limiting

**Long term (1M+ users):**
8. ✅ Phase 6.3: Database optimization
9. ✅ Regional database replicas (if needed)
10. ✅ Advanced caching strategies per language



