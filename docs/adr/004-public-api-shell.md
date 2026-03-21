# ADR-004: Standardized public API shell

## Status

Accepted (baseline implemented — see [`lib/api/publicRoute.ts`](../../lib/api/publicRoute.ts))

## Context

Several routes share patterns: client IP identification, rate limiting ([`lib/rate-limiting.ts`](../../lib/rate-limiting.ts)), JSON error bodies, and Sentry reporting. Duplication increases inconsistency and security drift.

## Decision

Introduce a shared **public API shell** (e.g. `lib/api/publicRoute.ts`) that standardizes:

- Request parsing and **Zod validation** (per ADR-003)
- Rate limiting and stable **429** behavior
- **Request / correlation IDs** for logs and Sentry
- **Auth policy hooks** per route (even if some routes remain anonymous)
- Stable **error / result envelope** (see `lib/api/result.ts` in target map)

Apply incrementally route by route.

## Consequences

- One place to harden security and observability.
- Requires careful rollout to avoid changing rate-limit semantics without measurement.
- Idempotency and retry semantics for mutating routes must be documented per handler.

## Related

- ADR-003
- [`docs/architecture/target.md`](../architecture/target.md)
