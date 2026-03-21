# ADR-006: AI eval fixtures as a release gate

## Status

Proposed

## Context

LLM outputs are non-deterministic in detail but **structure and safety invariants** must remain stable. Relying only on manual QA is insufficient for tutor corrections, evidence spans, and filter behavior.

## Decision

Add **fixture-based tests** (golden JSON inputs/outputs and edge cases) under `tests/fixtures/tutor/` and `tests/evals/` that assert:

- Valid structured output parsing
- Legacy schema handling where applicable
- Hallucination / low-confidence fallbacks
- Safety-filter invariants

Treat failing evals as **merge blockers** once the suite is in place (wire into CI in a later phase).

## Consequences

- Higher confidence in prompt and normalization changes.
- Maintenance cost: fixtures must be updated when intentional contract changes occur.
- May require mocking or stripping non-deterministic fields in assertions.

## Related

- ADR-005
