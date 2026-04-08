# CI/CD Pipeline
**Skills applied:** `ci-cd-pipeline-builder` + `senior-devops`  
**Platform:** GitHub Actions  
**Targets:** Vercel (web) + Google Play Store (Android via Flutter)  
**Date:** 2026-04-08

---

## Detected Stack

```json
{
  "runtime": "node-20",
  "framework": "nextjs-14",
  "package_manager": "npm",
  "test_runner": "jest",
  "e2e_runner": "playwright",
  "containerized": true,
  "deployment_targets": ["vercel", "google-play"],
  "services": ["firebase", "stripe", "sentry"]
}
```

---

## GitHub Actions Pipeline (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"

jobs:
  # ─── Lint & Type Check ─────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  # ─── Unit & Integration Tests ──────────────────────────
  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage --ci
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  # ─── Build ─────────────────────────────────────────────
  build:
    name: Next.js Build
    runs-on: ubuntu-latest
    needs: test
    env:
      NEXT_PUBLIC_APP_URL: https://app.example.com
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY_TEST }}
      NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: next-build
          path: .next/

  # ─── E2E Tests ─────────────────────────────────────────
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          BASE_URL: http://localhost:3000
          TEST_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  # ─── Deploy to Vercel (main only) ──────────────────────
  deploy-web:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    needs: e2e
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

---

## Secrets Required

| Secret | Source | Used In |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard | API routes |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard | Webhook handler |
| `STRIPE_PUBLISHABLE_KEY_TEST` | Stripe Dashboard | Build env |
| `FIREBASE_API_KEY` | Firebase Console | Build env |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console (JSON) | Server-side auth |
| `VERCEL_TOKEN` | Vercel Dashboard | Deploy action |
| `VERCEL_ORG_ID` | Vercel Dashboard | Deploy action |
| `VERCEL_PROJECT_ID` | Vercel Dashboard | Deploy action |
| `E2E_USER_EMAIL` | Manual | Playwright tests |
| `E2E_USER_PASSWORD` | Manual | Playwright tests |
| `SENTRY_AUTH_TOKEN` | Sentry Dashboard | Source map upload |
| `UPSTASH_REDIS_REST_URL` | Upstash Dashboard | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Dashboard | Rate limiting |

---

## Docker (`Dockerfile` — existing file)

Verify these stages are present:
1. `deps` — install only production deps
2. `builder` — run `next build`
3. `runner` — copy `.next/standalone`, expose port 3000

---

## Database Migrations in CI

```yaml
# Add before deploy-web job
- name: Run DB migrations
  run: npx drizzle-kit migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Monitoring

| Tool | Purpose | Setup |
|---|---|---|
| Sentry | Error tracking | `sentry.client.config.ts` (exists) |
| Vercel Analytics | Web vitals | Add `<Analytics />` to `layout.tsx` |
| Upstash | Rate limit + caching | `lib/ratelimit.ts` |

---

## Branch Strategy

| Branch | Deploys to | Tests |
|---|---|---|
| `main` | Vercel Production | Full CI + E2E |
| `develop` | Vercel Preview | Lint + Unit |
| `feature/*` | No deploy | Lint only |
| PR → main | Vercel Preview | Full CI + E2E |
