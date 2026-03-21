# ADR-007: Server-only integration adapters

## Status

Accepted

## Context

The app integrates with Gemini, OpenAI Realtime, Azure Speech, and Stripe. Provider SDKs and secrets must not run in the browser; logic scattered across route files is hard to test and reuse.

## Decision

Place provider-specific code in **`lib/integrations/<provider>/`** (or equivalent) as **server-only** modules. Route handlers in `app/api/` become thin: validate input, call adapter, return mapped response.

Unit-test adapters with mocked `fetch` or SDK boundaries.

## Consequences

- Clear security boundary: no secret-bearing imports in client components.
- Easier swapping of models or providers behind stable internal interfaces.
- Slight indirection; must avoid circular imports between adapters and contracts.

## Related

- ADR-003, ADR-004
- [`docs/architecture/target.md`](../architecture/target.md)
