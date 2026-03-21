# Load / soak testing — public API routes

## Scope

Exercise the same paths covered by `npm run test:gate`, plus SSE and session sync, before promoting backend changes.

## Prerequisites

- Staging environment with production-like env (`GEMINI_API_KEY`, optional `UPSTASH_*`, Stripe test mode, etc.)
- Rate limits tuned for the test or dedicated IP allowlist

## Suggested tools

- **k6** or **Artillery** for HTTP sustained load
- For **SSE** (`POST /api/conversation-stream`), use a small Node script with `fetch` + streaming reader, or k6 `open`/`ws` patterns; verify TTFB and chunk cadence

## Sequences (rollout order)

1. **Contracts + shell** — `POST /api/initial-question`, `POST /api/conversation` with valid bodies from fixtures
2. **Persistence** — `POST /api/sessions/sync` + `GET /api/sessions/restore` with `x-device-id`
3. **Integrations** — `POST /api/openai-realtime`, `GET /api/azure-speech-token`, `POST /api/checkout` (test keys), `POST /api/pronunciation` (if upstream available)
4. **Client cutover** — full browser flows after API soak passes

## Abort criteria

- Error rate > 1% on non-abuse traffic
- p95 latency regression > 50% vs baseline on `/api/conversation`
- Redis / Upstash connection errors without graceful degradation logged

## Baseline

Record RPS, p50/p95 latency, and error mix per route before and after each rollout slice.
