# Cursor Skill Playbook

This project uses nine engineering lenses to keep Cursor responses focused and consistent:

- `Senior Architect`
- `Senior Frontend`
- `Senior Backend`
- `Senior Fullstack`
- `Senior QA`
- `Senior DevOps`
- `Senior SecOps`
- `Code Reviewer`
- `Senior Security`

The persistent project guidance for those lenses lives in `.cursor/rules/` inside this app repo.

## How to route work

- Start with `Senior Architect` when a task changes feature boundaries, session flow, page gating, or API design.
- Use `Senior Frontend` for React, Next.js, Tailwind, accessibility, and rendering work in `app/`, `src/components/`, and `src/context/`.
- Use `Senior Backend` for route handlers, shared server helpers, validation, config, integrations, and repository code in `app/api/`, `lib/`, `src/services/`, and `src/repositories/`.
- Use `Senior Fullstack` when a feature crosses UI, session state, and API behavior in one slice.
- After implementation, add the supporting passes that fit the change: `Senior Security`, `Senior SecOps`, `Senior QA`, `Code Reviewer`, and `Senior DevOps`.

## Repo-specific boundaries

- `src/context/SessionContext.tsx` owns session lifecycle, storage sync, active session state, exercise mode, and send orchestration.
- `src/components/main/Main.tsx` is the writing chat shell and should stay responsible for chat presentation, picker visibility, and input gating.
- `app/*/page.tsx` files should stay thin and focus on routing, page composition, and access checks.
- `app/api/*/route.ts` handlers should validate input, rate limit public traffic, delegate to helpers, and return stable response shapes.
- `lib/config.ts` is the source of truth for environment access and config validation.
- AI, speech, auth, and payment code are boundary modules and should keep provider-specific behavior isolated.

## Required safety and release passes

- Run `Senior Security` on any auth, AI, Stripe, speech, config, or public API change.
- Run `Senior SecOps` on public endpoints such as `conversation`, `conversation-stream`, `openai-realtime`, `azure-speech-token`, `pronunciation`, and `checkout`.
- Run `Senior QA` before merge and cover onboarding, level selection, writing start, chat flows, speaking access, and API error handling.
- Run `Code Reviewer` as the final review pass on completed changes.
- Run `Senior DevOps` whenever build, deploy, Docker, test config, or env contracts change.

## Prompt templates

- `Use Senior Architect: propose the smallest safe design for this feature and list the boundary decisions first.`
- `Use Senior Frontend: review this UI change for React patterns, a11y, and rendering regressions.`
- `Use Senior Backend: review this API route for validation, rate limiting, error handling, and secret safety.`
- `Use Senior Fullstack: trace this feature from page -> context -> API and identify failure modes.`
- `Use Senior Security: threat model this auth, AI, payment, or speech change.`
- `Use Senior SecOps: check this endpoint for abuse controls, logging, and operational readiness.`
- `Use Senior QA: propose the minimum Jest and Playwright coverage for this change.`
- `Use Code Reviewer: review this diff for correctness, edge cases, and missing tests.`
- `Use Senior DevOps: review the release impact of this config, Docker, or build pipeline change.`
