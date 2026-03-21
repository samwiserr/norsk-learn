# Client / server boundary audit (Phase 2)

This document records **where code runs** in norsk-tutor (Next.js 14 App Router), **how data crosses the boundary**, and **which `lib/` modules are safe to import from the browser**. Use it when adding features, moving code, or tightening security.

## Mental model

| Runtime | Typical entry | Bundling |
|--------|----------------|----------|
| **Server** | `app/**/route.ts`, RSC without `"use client"` | Node / Edge bundles; secrets via `process.env` (non-`NEXT_PUBLIC_*`) |
| **Client** | `"use client"` components, hooks, `app/providers.tsx` | Sent to the browser; **no secret env vars** |

**Rule:** If a module reads server-only secrets or calls server-only SDKs (Gemini admin, Stripe secret, etc.), it must only be imported from server code—or marked with `import "server-only"` so a mistaken client import fails at build time.

## 1. `app/layout.tsx` (server root layout)

[`app/layout.tsx`](../../app/layout.tsx) is a **Server Component** (no `"use client"`).

- **Responsibilities:** global CSS, font, metadata, accessibility skip link, provider nesting.
- **Boundary:** Children and nested providers are either client boundaries (`Providers`, `ContextProvider`) or server-rendered shells until a client component mounts.
- **Secrets:** None in this file; the inline theme script only touches `localStorage` in the **browser** after HTML is delivered.

## 2. `app/providers.tsx`

[`app/providers.tsx`](../../app/providers.tsx) is **`"use client"`**.

- Runs **`initAnalytics`** ([`lib/analytics.ts`](../../lib/analytics.ts)) in `useEffect` — acceptable on client (PostHog public key pattern).
- Registers service worker / offline UI as needed.

## 3. `ContextProvider` (`src/context/ContextProvider.tsx`)

**`"use client"`** — composes the main app context tree:

1. `LanguageProvider` → `ThemeProvider` → `SessionProvider`
2. `SyncAndProgressWrapper` (uses `useSessionContext`, `useAuthCheck`, `useSync`) → `ProgressProvider` → `SyncProvider`

**Boundary notes:**

- All tutor **HTTP** traffic from the writing flow is intended to go through [`src/services/apiService.ts`](../../src/services/apiService.ts) (Zod-validated contracts in Phase 1).
- **`SessionContext`** remains the central façade for session state, persistence triggers, and send-message orchestration ([`SessionContext.tsx`](../../src/context/SessionContext.tsx)).

## 4. `useRealtimeTutor` (`src/hooks/useRealtimeTutor.ts`)

**Client-only** (WebRTC, `RTCPeerConnection`, microphone).

| Step | Boundary |
|------|----------|
| Prompt text | Imports [`lib/conversation-prompts.ts`](../../lib/conversation-prompts.ts) — **shared** string builders (no secrets). |
| Session credential | `POST /api/openai-realtime` — server mints **short-lived** Realtime access; browser never sees the platform API key. |
| Peer connection | Browser `fetch` to `https://api.openai.com/v1/realtime?...` with token from prior step — **by design** for WebRTC; document for security reviews. |

**Risk to track:** Any future change that puts long-lived or overly-broad tokens in client-visible responses should be rejected; keep minting minimal on the server route.

## 5. `usePronunciation` (`src/hooks/usePronunciation.ts`)

**Client-only** (microphone + Azure Speech SDK in browser).

| Step | Boundary |
|------|----------|
| Token | `GET /api/azure-speech-token` returns `{ token, region }` for **authorization token** flow — server holds subscription key. |
| SDK | `microsoft-cognitiveservices-speech-sdk` runs in the browser with that token. |

## 6. `lib/` classification

Below is a **practical** split based on current import graph (grep `@/lib/`). “Server-only” here means **must not** be imported from client components; “Shared” means both server and client import today.

### Shared (client + server)

| Module / area | Notes |
|---------------|--------|
| [`lib/config.ts`](../../lib/config.ts) | Used by API routes **and** [`lib/firebase/config.ts`](../../lib/firebase/config.ts) (client auth init). **Do not** mark `server-only`. |
| [`lib/languages.ts`](../../lib/languages.ts), [`lib/cefr.ts`](../../lib/cefr.ts), [`lib/constants.ts`](../../lib/constants.ts) | UI + API validation. |
| [`lib/sessions.ts`](../../lib/sessions.ts), [`lib/storage.ts`](../../lib/storage.ts), [`lib/cefr-progress.ts`](../../lib/cefr-progress.ts) | Session shape + local persistence. |
| [`lib/conversation-prompts.ts`](../../lib/conversation-prompts.ts) | Prompt strings; imported from **`useRealtimeTutor`** and API routes. |
| [`lib/error-handling.ts`](../../lib/error-handling.ts), [`lib/logger.ts`](../../lib/logger.ts) | Used widely; logger should stay browser-safe. |
| [`lib/input-sanitization.ts`](../../lib/input-sanitization.ts) | Auth forms (client) and API routes (server). |
| [`lib/contracts/*`](../../lib/contracts/), [`lib/api/*`](../../lib/api/) | Schema-first contracts; safe to import from client for validation/types (no secrets). |
| [`lib/utils.ts`](../../lib/utils.ts), [`lib/exercise-modes.ts`](../../lib/exercise-modes.ts), [`lib/vocabulary-tracker.ts`](../../lib/vocabulary-tracker.ts), [`lib/data-wipe.ts`](../../lib/data-wipe.ts), [`lib/analytics.ts`](../../lib/analytics.ts), [`lib/browser-language.ts`](../../lib/browser-language.ts) | UI / client concerns or shared helpers. |
| [`lib/firebase/*`](../../lib/firebase/) (except keep config rules above) | Client auth + Firestore sync from hooks/context. |
| [`lib/srs/*`](../../lib/srs/), [`lib/gamification.ts`](../../lib/gamification.ts), [`lib/adaptive-level.ts`](../../lib/adaptive-level.ts) | Mostly client/storage-backed features. |
| [`lib/sync/*`](../../lib/sync/) | Offline queue + multi-tab sync (client-oriented). |
| [`lib/retry.ts`](../../lib/retry.ts) | Used from `apiService` and API routes. |

### Server-only (enforced or de-facto)

| Module | Enforcement |
|--------|-------------|
| [`lib/conversation-helpers.ts`](../../lib/conversation-helpers.ts) | **`import "server-only"`** — streaming tutor assembly + `@google/generative-ai`; only imported from [`app/api/conversation-stream/route.ts`](../../app/api/conversation-stream/route.ts). |
| [`lib/tutor.ts`](../../lib/tutor.ts) | **`import "server-only"`** — tutor types/normalization for API + conversation-helpers only. |
| [`lib/rate-limiting.ts`](../../lib/rate-limiting.ts) | De-facto server + **Jest** (`__tests__/lib/rate-limiting.test.ts`). **Not** marked `server-only` to avoid breaking tests without a Jest mock. |
| [`sentry.server.config.ts`](../../sentry.server.config.ts) | **`import "server-only"`** — imported only from API routes. |

### API route clusters (always server)

- [`app/api/conversation/route.ts`](../../app/api/conversation/route.ts), [`app/api/conversation-stream/route.ts`](../../app/api/conversation-stream/route.ts), [`app/api/initial-question/route.ts`](../../app/api/initial-question/route.ts)
- [`app/api/openai-realtime/route.ts`](../../app/api/openai-realtime/route.ts), [`app/api/azure-speech-token/route.ts`](../../app/api/azure-speech-token/route.ts)
- [`app/api/checkout/route.ts`](../../app/api/checkout/route.ts), [`app/api/pronunciation/route.ts`](../../app/api/pronunciation/route.ts)

## 7. Follow-ups (later phases)

- **Phase 3 (done):** Shared shell is [`lib/api/publicRoute.ts`](../../lib/api/publicRoute.ts) (`server-only`). Routes import it for preflight + errors; do not import from client code.
- **Phase 4:** Relocate Gemini / OpenAI / Azure / Stripe calls into `lib/integrations/*` per [`target.md`](./target.md).
- **Rate limiting:** Optionally add `server-only` to `lib/rate-limiting.ts` once Jest is configured to mock `server-only` (or tests only exercise a test double).

## References

- Baseline tree: [`current.md`](./current.md)
- Target map: [`target.md`](./target.md)
- ADR-004: [`docs/adr/004-public-api-shell.md`](../adr/004-public-api-shell.md)
- ADR-007: [`docs/adr/007-server-only-integration-adapters.md`](../adr/007-server-only-integration-adapters.md)

## Document history

| Date | Change |
|------|--------|
| Phase 2 | Initial boundary audit + `server-only` on `conversation-helpers`, `tutor`, `sentry.server.config` |
| Phase 3 | Document `lib/api/publicRoute.ts` shell; ADR-004 baseline accepted |
