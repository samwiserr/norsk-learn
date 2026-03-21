# ADR-005: Unified tutor-response normalization and safety

## Status

Accepted (baseline: [`lib/tutor-runtime/`](../../lib/tutor-runtime/) + [`tests/evals/tutor-runtime.test.ts`](../../tests/evals/tutor-runtime.test.ts))

## Context

Tutor AI output is normalized in more than one place: e.g. [`app/api/conversation/route.ts`](../../app/api/conversation/route.ts) and [`lib/conversation-helpers.ts`](../../lib/conversation-helpers.ts) (streaming path). Divergence risks inconsistent UX and safety behavior between streaming and non-streaming flows.

## Decision

Provide a **single shared module** for:

- Parsing and normalizing model JSON into the internal tutor response model
- Legacy schema compatibility where still required
- **Safety filters** and hallucination fallbacks

Both conversation routes call this module so behavior is identical except for transport (JSON vs SSE).

## Consequences

- Easier testing and fewer regressions when prompts or models change.
- One migration effort to consolidate duplicated logic.
- Must preserve backward compatibility until clients are fully migrated.

## Related

- ADR-006 (eval fixtures lock this behavior)
