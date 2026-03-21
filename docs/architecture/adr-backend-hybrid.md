# ADR: Hybrid Next.js Backend (Extractable Core)

## Status

Accepted — March 2026

## Context

The app ships as a Next.js 14 application with `app/api` route handlers calling Gemini, Stripe, Azure Speech, OpenAI Realtime, and optional pronunciation upstreams. Session and conversation state historically lived in the browser (local storage / client Firestore sync). We want a path to a dedicated backend service without a big-bang rewrite.

## Decision

1. **HTTP shell** — All public JSON routes use `lib/api/publicRoute.ts` for: request id (`x-request-id`), rate limiting, JSON parse, Zod validation via `parseBodyWithSchema`, and stable error envelopes. Helpers `runPublicPostJson` and `runPublicGet` keep handlers to “preflight → validate → use case → respond”.

2. **Application core** — Business orchestration lives under `src/server/application/` as plain functions (“use cases”) that depend on **ports** (interfaces), not on Next.js types.

3. **Contracts** — `lib/contracts/*` is the canonical request/response schema layer for HTTP and for OpenAPI documentation (`public/openapi.yaml`). Handlers must not manually destructure untyped bodies.

4. **Persistence** — Server-owned session snapshots are stored via `src/server/persistence/sessionSnapshotStore.ts` (Upstash Redis when configured). The client may keep local cache but **canonical** recovery is `GET /api/sessions/restore` after `POST /api/sessions/sync`. Migration: dual-write from client (sync after mutations); restore on cold start when device id matches; destructive reset is acceptable if env disables sync.

5. **Provider adapters** — SDK and vendor HTTP stay in `lib/integrations/*`. Use cases depend on `src/server/integrations/ports/*` with default implementations that delegate to those adapters (retries/timeouts stay in use cases or adapter as documented).

6. **Configuration** — No `process.env` reads in route files or use cases for secrets; use `lib/config.ts` (and adapter internals where unavoidable until fully centralized).

7. **Observability & abuse** — Sentry + structured logging in the HTTP shell; rate limit uses Redis in production when `UPSTASH_*` is set; in-memory fallback logs a **one-time warning** in production.

## Module layout

| Area | Location |
|------|----------|
| HTTP helpers / error mapping | `lib/api/publicRoute.ts` |
| Zod contracts | `lib/contracts/` |
| Use cases | `src/server/application/` |
| Provider ports | `src/server/integrations/ports/` |
| Default adapter wiring | `src/server/integrations/adapters/` |
| Persistence ports / Redis | `src/server/persistence/` |
| OpenAPI (hand-maintained from contracts) | `public/openapi.yaml` |

## Consequences

- **Positive:** Clear seams to extract `src/server/**` into a standalone Node service later; tests can mock ports.
- **Negative:** Two places to update when adding fields (Zod contract + OpenAPI YAML) until automated generation is added.
