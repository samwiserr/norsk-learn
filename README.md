# Norsk Tutor

`Norsk Tutor` is a Next.js 14 application for guided Norwegian language practice across writing, speaking, review, and tutor booking flows. It combines a modern App Router frontend with typed API contracts, server-side integrations, Playwright smoke coverage, and a progressively hardened backend surface.

## Stack

- `Next.js 14` with App Router
- `TypeScript` + `React 18`
- `Tailwind CSS`
- `Jest` for unit/route/contract coverage
- `Playwright` for end-to-end smoke tests
- `Zod` contracts for request/response validation
- `Gemini`, `OpenAI Realtime`, `Azure Speech`, `Stripe`, and optional pronunciation upstream integrations
- `Upstash Redis` for rate limiting and server-side session snapshot persistence

## Product Surface

- Writing conversation practice with tutor feedback
- Speaking mode with realtime and speech-token flows
- CEFR level onboarding and language selection
- Session history and review state
- Tutor discovery and Stripe checkout
- Backend request correlation, rate limiting, and standardized error envelopes

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create local env:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Important Environment Variables

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`
- `STRIPE_SECRET_KEY`
- `PRONUNCIATION_SERVICE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- Firebase public keys from `.env.example`

Some integrations are optional in local development, but routes that depend on them will return config errors until set.

## Common Scripts

```bash
npm run dev
npm run lint
npm run build
npm run test
npm run test:gate
npm run test:e2e
npm run test:frontend-gate
npm run test:coverage
npm run review:ci
```

### Playwright (E2E)

Playwright starts its **own** Next dev server on **`localhost:3001`** by default so tests never attach to a random process on `:3000` (which causes missing `_next/static` chunks, no hydration, and stuck “Loading…”).

- Port busy (e.g. leftover dev server): `PLAYWRIGHT_PORT=3010 npm run test:e2e`
- Reuse a server you already started on that port: `PLAYWRIGHT_REUSE_SERVER=1 npm run test:e2e`

## Quality Gates

- `npm run lint`: ESLint / Next lint
- `npm run test:gate`: route, contract, and backend logic release gate
- `npm run test:frontend-gate`: lint + Playwright smoke suite
- `npm run build`: production build validation

CI runs lint, type-check, backend gate tests, frontend gate tests, and production build validation.

## Architecture Notes

- Public route handlers live in `app/api/**/route.ts` and use the shared shell in `lib/api/publicRoute.ts`.
- Canonical API contracts live in `lib/contracts/`.
- Backend use cases and ports live under `src/server/`.
- Provider-specific adapters live in `lib/integrations/`.
- Server-owned session snapshot persistence is exposed through `/api/sessions/sync` and `/api/sessions/restore`.
- OpenAPI documentation is maintained in `public/openapi.yaml`.

## Additional Docs

- `docs/architecture/adr-backend-hybrid.md`
- `docs/runbooks/load-test-public-routes.md`
- `docs/adr/`
- `docs/quality/code-review-automation.md`
- `docs/security/incident-response.md`
- `docs/security/vulnerability-management.md`
- `docs/security/compliance-mapping.md`

## Deployment

The repo includes:

- `Dockerfile` for containerized deployment
- `.github/workflows/ci.yml` for CI validation
- `.github/workflows/security.yml` for security operations gates (audit, secret scan, SAST)
- `.github/workflows/code-review.yml` for advisory code review automation reports

For production, set real environment values, enable Redis-backed rate limiting, and validate all provider integrations in a staging environment before release.
