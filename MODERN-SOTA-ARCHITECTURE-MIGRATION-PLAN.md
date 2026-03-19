# Modern SOTA Architecture Migration Plan
## Complete Guide with Large-Scale Multi-Language Support

## Current Architecture Analysis

**Existing Stack:**
- Next.js 14.2.13 (App Router) ✅
- TypeScript with strict mode ✅
- React Context API for state management
- Firebase (Auth + Firestore) for data persistence
- localStorage for client-side state
- Custom CSS (no utility framework)
- REST API routes (Next.js API routes)
- Jest for testing (basic setup)
- No observability tools
- No CI/CD pipeline
- **All 12 languages bundled in single file** ⚠️ (Critical for scale)

**Target Improvements:**
1. Add observability (Sentry + PostHog) with language context
2. Migrate to TanStack Query + Zustand
3. Add Tailwind CSS
4. Add Redis caching (Upstash) with language awareness
5. Enhance CI/CD (GitHub Actions)
6. Optimize for Edge Runtime
7. Implement i18n infrastructure for scale
8. Add CDN and locale-based caching
9. Consider tRPC for type-safe APIs

---

## Phase 1: Foundation & Observability (Week 1-2)

### 1.1 Add Sentry Error Tracking with Language Context

**Files to create:**
- `sentry.client.config.ts` - Client-side Sentry config
- `sentry.server.config.ts` - Server-side Sentry config
- `sentry.edge.config.ts` - Edge runtime config
- `.env.example` - Update with Sentry DSN

**Implementation:**
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";
import { LanguageCode } from '@/lib/languages';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
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
```

**Integration points:**
- Wrap `app/layout.tsx` with Sentry error boundary
- Add error tracking to `src/components/ErrorBoundary.tsx`
- Add error tracking to API routes: `app/api/conversation/route.ts`, `app/api/initial-question/route.ts`
- Update `lib/error-handling.ts` to send errors to Sentry with language context
- Call `setLanguageContext(language)` in all error handlers
- Create language-specific error dashboards in Sentry

**Dependencies:**
```bash
npm install @sentry/nextjs
```

### 1.2 Add PostHog Analytics with Language Tracking

**Files to create:**
- `lib/analytics.ts` - Analytics wrapper with language context
- `app/providers.tsx` - PostHog provider component

**Implementation:**
```typescript
// lib/analytics.ts
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

**Integration points:**
- Add PostHog provider to `app/layout.tsx`
- Track page views in `app/page.tsx`, `app/level-selection/page.tsx`, `app/settings/page.tsx` with language context
- Track user actions: language changes, level selection, session creation (with language)
- Track errors (integrate with Sentry)
- Create language-specific funnels in PostHog
- Monitor conversion rates per language
- Track error rates per language

**Dependencies:**
```bash
npm install posthog-js
```

### 1.3 Enhance TypeScript Configuration

**File to update:**
- `tsconfig.json`

**Changes:**
```json
{
  "compilerOptions": {
    // ... existing options
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Migration steps:**
1. Enable one option at a time
2. Fix type errors incrementally
3. Update `lib/languages.ts` to handle undefined access safely
4. Update `src/context/Context.tsx` to handle strict null checks

### 1.4 Set Up GitHub Actions CI/CD

**Files to create:**
- `.github/workflows/ci.yml` - Main CI pipeline
- `.github/workflows/deploy.yml` - Deployment pipeline (optional)

**CI Pipeline:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

**Integration:**
- Add lint script to `package.json` if missing
- Ensure test coverage threshold
- Add build verification step

### 1.5 Internationalization Infrastructure (CRITICAL FOR SCALE)

**Problem Statement:**
Currently, all 12 languages (~1142 lines) are bundled in `lib/languages.ts`, causing every user to download all translations regardless of their language. This wastes ~50-100KB per user, which becomes significant at scale (1M users = 50-100GB wasted bandwidth).

#### 1.5.1 Restructure Translations for Code Splitting

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

#### 1.5.2 Add Locale-Based Routing

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

## Phase 2: State Management Migration (Week 3-5)

### 2.1 Install Dependencies

**Dependencies:**
```bash
npm install @tanstack/react-query zustand
npm install -D @tanstack/react-query-devtools
```

### 2.2 Create Zustand Stores (Parallel Implementation)

**Files to create:**
- `src/stores/useLanguageStore.ts` - Language state
- `src/stores/useThemeStore.ts` - Theme state
- `src/stores/useSessionStore.ts` - Session state (client-side)
- `src/stores/index.ts` - Store exports

**Implementation example:**
```typescript
// src/stores/useLanguageStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LanguageCode, DEFAULT_LANGUAGE, isValidLanguageCode } from '@/lib/languages';

interface LanguageState {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isReady: boolean;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      isReady: false,
      setLanguage: (lang) => {
        if (isValidLanguageCode(lang)) {
          set({ language: lang, isReady: true });
        }
      },
    }),
    {
      name: 'norsk-language',
      // Sync with existing localStorage key for backward compatibility
      storage: {
        getItem: (name) => {
          const value = localStorage.getItem('norsk_ui_language');
          return value ? JSON.stringify({ state: { language: value, isReady: true } }) : null;
        },
        setItem: (name, value) => {
          const parsed = JSON.parse(value);
          localStorage.setItem('norsk_ui_language', parsed.state.language);
        },
        removeItem: (name) => localStorage.removeItem('norsk_ui_language'),
      },
    }
  )
);
```

**Migration strategy:**
1. Create stores alongside existing Context
2. Add feature flag: `NEXT_PUBLIC_USE_ZUSTAND=true`
3. Migrate one component at a time: `app/settings/page.tsx` first
4. Test thoroughly before removing Context code

### 2.3 Set Up TanStack Query

**Files to create:**
- `src/providers/QueryProvider.tsx` - TanStack Query provider
- `src/hooks/useSessionsQuery.ts` - Sessions query hook
- `src/hooks/useSessionMutations.ts` - Session mutation hooks
- `src/lib/queryClient.ts` - Query client configuration

**Implementation:**
```typescript
// src/providers/QueryProvider.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

**Query hooks:**
```typescript
// src/hooks/useSessionsQuery.ts
import { useQuery } from '@tanstack/react-query';
import { SessionRepository } from '@/src/repositories/sessionRepository';
import { useLanguageStore } from '@/src/stores/useLanguageStore';

export const useSessions = () => {
  const language = useLanguageStore(state => state.language);
  
  return useQuery({
    queryKey: ['sessions', language], // Include language in query key
    queryFn: () => SessionRepository.getAll(),
    staleTime: 1000 * 60,
  });
};
```

**Integration:**
- Add QueryProvider to `app/layout.tsx`
- Migrate session fetching from `src/context/Context.tsx` to query hooks
- Update `src/components/sidebar/Sidebar.tsx` to use `useSessions()`
- Keep Context API working in parallel during migration

### 2.4 Migration Strategy

**Order of migration:**
1. Language state (simplest) - `app/settings/page.tsx`, `app/language-selection/page.tsx`
2. Theme state - `src/context/ThemeContext.tsx` → `src/stores/useThemeStore.ts`
3. Session queries - `src/context/Context.tsx` → TanStack Query hooks
4. Session mutations - Create/Delete/Update operations
5. Progress state - `src/context/ProgressContext.tsx` → TanStack Query

**Testing checklist:**
- [ ] Language changes persist correctly
- [ ] Theme changes apply immediately
- [ ] Sessions load from localStorage
- [ ] Sessions sync with Firestore
- [ ] Multi-tab sync still works
- [ ] Offline queue processes correctly

---

## Phase 3: Styling Modernization (Week 6-7)

### 3.1 Install and Configure Tailwind CSS

**Dependencies:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Files to create/update:**
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration
- `app/globals.css` - Add Tailwind directives

**Configuration:**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Match existing color scheme from level-selection.css, settings.css
        primary: '#2563eb',
        secondary: '#64748b',
      },
    },
  },
  // Preserve existing CSS classes during migration
  safelist: [
    // Add critical existing classes here
  ],
  corePlugins: {
    // Disable preflight if it conflicts with existing styles
    preflight: false, // Set to true after full migration
  },
}
```

**CSS Integration:**
```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Keep existing styles below */
/* ... existing CSS ... */
```

### 3.2 Migration Strategy

**Incremental approach:**
1. Keep all existing CSS files
2. Use Tailwind for new components only
3. Gradually refactor old components:
   - Start with: `app/language-selection/page.tsx`
   - Then: `app/level-selection/page.tsx`
   - Then: `app/settings/page.tsx`
   - Finally: `src/components/main/Main.tsx`, `src/components/sidebar/Sidebar.tsx`

**Component refactoring example:**
```typescript
// Before (app/settings/page.tsx)
<div className="settings-page-container">
  <div className="settings-page-header">
    <h1 className="settings-page-title">Settings</h1>
  </div>
</div>

// After (with Tailwind)
<div className="min-h-screen bg-white dark:bg-gray-900">
  <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
  </div>
</div>
```

**Testing:**
- Visual regression testing
- Dark mode compatibility
- Responsive design verification

---

## Phase 4: API & Caching Layer (Week 8-9)

### 4.1 Add Upstash Redis

**Dependencies:**
```bash
npm install @upstash/redis
```

**Files to create:**
- `lib/cache/redis.ts` - Redis client wrapper with language support
- `lib/cache/types.ts` - Cache type definitions
- `.env.example` - Add Redis credentials

**Implementation:**
```typescript
// lib/cache/redis.ts
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
      return null; // Fail gracefully
    }
  },
  set: async <T>(key: string, value: T, ttl?: number, language?: LanguageCode) => {
    const cacheKey = language ? `${key}:lang:${language}` : key;
    try {
      await redis.set(cacheKey, value, ttl ? { ex: ttl } : undefined);
    } catch (error) {
      console.error('[Cache] Set error:', error);
      // Don't throw - caching is non-critical
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
};
```

### 4.2 Add Language-Aware Caching to API Routes

**Files to update:**
- `app/api/conversation/route.ts` - Cache conversation responses with language
- `app/api/initial-question/route.ts` - Cache initial questions with language

**Implementation:**
```typescript
// app/api/conversation/route.ts
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

**Cache invalidation:**
- Invalidate on session deletion (with language)
- Invalidate on language change (all languages for user)
- Invalidate on level change (with language)
- Implement cache warming for popular languages

### 4.3 Add CDN and Edge Caching Configuration

**Files to create/update:**
- `next.config.js` - Add CDN and locale-based caching headers
- `.env.example` - Add CDN URL

**Implementation:**
```javascript
// next.config.js
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

### 4.4 Add TanStack Query Cache Integration with Language Support

**Update query hooks to use Redis with language:**
```typescript
// src/hooks/useSessionsQuery.ts
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

## Phase 5: Performance Optimization (Week 10-11)

### 5.1 Move API Routes to Edge Runtime

**Files to update:**
- `app/api/conversation/route.ts`
- `app/api/initial-question/route.ts`

**Changes:**
```typescript
// Add to route files
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Note: Edge runtime has limitations:
// - No Node.js APIs
// - Smaller bundle size
// - Faster cold starts
// - May need to refactor Firebase calls (use REST API instead of SDK)
```

**Considerations:**
- Firebase SDK may not work in Edge runtime
- May need to use Firebase REST API or keep Node.js runtime for Firebase routes
- Test thoroughly before switching

### 5.2 Add ISR for Static Pages

**Files to update:**
- `app/level-selection/page.tsx` - Add revalidation
- `app/language-selection/page.tsx` - Add revalidation

**Implementation:**
```typescript
// app/level-selection/page.tsx
export const revalidate = 3600; // Revalidate every hour

// For dynamic data, use:
export async function generateStaticParams() {
  // Generate static paths if applicable
}
```

### 5.3 Optimize Bundle Size

**File to update:**
- `next.config.js`

**Configuration:**
```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      'zustand',
      '@google/generative-ai',
    ],
  },
  // Tree shake unused exports
  webpack: (config) => {
    config.optimization.usedExports = true;
    return config;
  },
};
```

### 5.4 Add Image Optimization

**Files to update:**
- Components using `<img>` tags
- Use Next.js `Image` component

**Example:**
```typescript
// Before
<img src="/assets/icon.png" alt="Icon" />

// After
import Image from 'next/image';
<Image src="/assets/icon.png" alt="Icon" width={24} height={24} />
```

---

## Phase 6: Database Optimization for Scale (Week 12+)

### 6.1 Language-Based Database Partitioning

**Problem:** All users' data is in the same Firestore collections, which doesn't scale well for large user bases with different languages.

**Files to update:**
- `lib/firebase/sync.ts` - Add language-based collection paths
- `lib/firebase/config.ts` - Add composite indexes for language queries

**Implementation:**
```typescript
// lib/firebase/sync.ts
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
// lib/rate-limiting.ts
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

### 6.4 Consider tRPC Migration (Optional)

**Benefits:**
- End-to-end type safety
- Better developer experience
- Automatic API documentation

**Considerations:**
- Significant refactoring required
- May not be necessary if REST API is working well
- Can be added incrementally alongside REST

### 6.5 Consider PostgreSQL + Prisma (Optional)

**Benefits:**
- Better query performance
- More flexible data modeling
- Better for complex relationships

**Considerations:**
- Requires database migration
- Dual-write strategy needed (Firebase + PostgreSQL)
- Significant infrastructure changes

**Migration strategy (if chosen):**
1. Set up PostgreSQL (Neon/Supabase)
2. Add Prisma schema
3. Implement dual-write (Firebase + PostgreSQL)
4. Gradually migrate reads to PostgreSQL
5. Keep Firebase as backup

---

## Testing Strategy

### For Each Phase:

1. **Unit Tests:**
   - Test new stores (`src/stores/**/*.test.ts`)
   - Test query hooks (`src/hooks/**/*.test.ts`)
   - Test cache layer (`lib/cache/**/*.test.ts`)
   - Test i18n utilities (`lib/i18n/**/*.test.ts`)

2. **Integration Tests:**
   - Test state migration (Context → Zustand/TanStack Query)
   - Test API caching with language
   - Test error tracking with language context
   - Test locale routing

3. **E2E Tests:**
   - Test full user flows
   - Test language switching
   - Test session management
   - Test offline functionality
   - Test locale-based routing

### Regression Testing:

- [ ] Language selection works
- [ ] Level selection works
- [ ] Settings page works
- [ ] Chat functionality works
- [ ] Session creation/deletion works
- [ ] Firebase sync works
- [ ] Multi-tab sync works
- [ ] Offline queue works
- [ ] Dark mode works
- [ ] All translations load correctly
- [ ] Bundle size reduced per language
- [ ] Cache works per language
- [ ] CDN caching works per locale

---

## Rollback Plan

For each phase:
1. Feature flags to disable new code
2. Keep old code until 100% migration verified
3. Database migrations are reversible
4. Environment variables for gradual rollout

---

## Success Metrics

### Performance:
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

### Developer Experience:
- Type safety coverage > 95%
- Test coverage > 80%
- CI/CD pipeline < 5 minutes

---

## Timeline Summary

- **Week 1-2:** Observability & CI/CD + i18n Infrastructure (Phase 1.5)
- **Week 3-5:** State Management Migration
- **Week 6-7:** Styling Modernization
- **Week 8-9:** API & Caching + Language-Aware Caching + CDN
- **Week 10-11:** Performance Optimization
- **Week 12+:** Database Optimization + Language Partitioning

**Total estimated time:** 12-13 weeks for core migration with scale enhancements

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



