# ADR-003: Schema-first contracts for all public API routes

## Status

Proposed

## Context

Public `app/api/*/route.ts` handlers accept JSON bodies and return JSON or streams. TypeScript types alone do not validate runtime payloads; the client ([`apiService.ts`](../../src/services/apiService.ts)) currently infers shapes per endpoint.

## Decision

Adopt **schema-first contracts** (Zod) for every public route’s request and response (where applicable). Centralize schemas under `lib/contracts/` and derive types from schemas. Align client parsing with the same shapes.

## Consequences

- Stronger security against malformed or malicious payloads.
- Easier versioning and documentation of API contracts.
- Upfront cost to define schemas and migrate existing callers without breaking clients.

## Related

- ADR-004 (API shell implements validation consistently)
