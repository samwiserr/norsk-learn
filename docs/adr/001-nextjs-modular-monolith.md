# ADR-001: Next.js modular monolith

## Status

Proposed

## Context

The product is a Next.js 14 App Router application with multiple integrations (Gemini, OpenAI Realtime, Azure Speech, Stripe, Firebase). The team needs a clear default deployment and decomposition strategy before adding more features.

## Decision

Remain on **Next.js as a single deployable (modular monolith)**. Do not split into microservices in the current roadmap. Keep optional process boundaries only where they already exist (e.g. external pronunciation service via URL).

## Consequences

- Simpler operations, shared types, and a single CI/build pipeline.
- Scale vertically and by route-level optimization before considering service extraction.
- Revisit this ADR if latency, cost, or team boundaries force a dedicated backend service.

## Related

- [`docs/architecture/target.md`](../architecture/target.md)
