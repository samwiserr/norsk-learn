# ADR-002: SessionContext as stable façade during migration

## Status

Proposed

## Context

[`SessionContext.tsx`](../../src/context/SessionContext.tsx) centralizes sessions, persistence, sync, exercise mode, and message sending. Splitting into many contexts immediately would ripple through pages and components.

## Decision

Keep **`SessionProvider` / `useSessionContext` as the public façade** while refactoring. Extract **internals** first (reducer modules, application use-cases) under `src/context/session/` and `src/application/`. Defer splitting into multiple React contexts until internals are tested and boundaries are clear.

## Consequences

- Lower risk for UI-heavy areas such as [`Main.tsx`](../../src/components/main/Main.tsx).
- May temporarily retain a large provider file until extraction phases complete.
- Revisit after Phase 3 of the target roadmap if a dedicated “tutoring” vs “session list” split is justified.

## Related

- [`docs/architecture/current.md`](../architecture/current.md)
