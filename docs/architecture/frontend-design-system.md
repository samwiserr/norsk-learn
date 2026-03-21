# Frontend design system (Norsk Tutor)

This document anchors the **Phase 1** frontend foundation: tokens, primitives, and how new UI should be built.

## Tokens

- **Source of truth:** [`app/globals.css`](../../app/globals.css) — HSL components for Tailwind (`--background`, `--foreground`, `--primary`, …).
- **Semantic aliases** (for legacy and arbitrary values):
  - `--bg-primary` → page background
  - `--text-primary` / `--text-secondary` → body and muted text
  - `--app-primary` → full `hsl(var(--primary))` for rare `var()` usage

Prefer Tailwind semantic classes: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary`.

## Primitives

Located under [`src/components/ui/`](../../src/components/ui/):

| Export        | Role                                      |
|---------------|-------------------------------------------|
| `Button`      | Actions; variants: default, outline, ghost, … |
| `Card` + slots | Grouped content                          |
| `Input`       | Single-line fields                        |
| `Badge`       | Status / labels                           |
| `PageShell`   | Full-page layout + max-width              |
| `PageHeader`  | Title + description + actions             |
| `EmptyState`  | Empty / zero-data blocks                  |

Compose with [`cn()`](../../lib/utils.ts) from `clsx` + `tailwind-merge`.

## Conventions

- **Pages** (`app/*/page.tsx`): routing, guards, composition — not large bespoke CSS.
- **Feature UI**: colocate under `src/components/<feature>/` or future `src/features/<name>/`.
- **Session**: do not add presentation-only state to [`SessionContext.tsx`](../../src/context/SessionContext.tsx); keep `SessionContextValue` stable.

## Migration

Replace ad hoc inline styles and undefined CSS variables incrementally with `ui/*` + Tailwind. Legacy `.css` files remain until their screens are migrated.

## Quality gates (frontend)

Run before merging larger UI changes:

1. **`npm run lint`** — Next.js ESLint (`next/core-web-vitals`), including baseline a11y and performance hints.
2. **`npm run build`** — Typecheck and production bundle.
3. **`npm run test:frontend-gate`** — Lint plus Playwright smoke/regression specs (`e2e/shell-routes.spec.ts`, `e2e/onboarding.spec.ts`, `e2e/writing-flow.spec.ts`, `e2e/api-failure-path.spec.ts`). Requires browsers: `npx playwright install` (once per machine/CI image).
4. **`npm run test:gate`** — Existing backend/API contract Jest gate (unchanged).

### Focus areas

- **Accessibility:** landmarks (`main`, `header`), `aria-live` for dynamic status (e.g. speaking), visible focus rings on interactive controls, labels on icon-only buttons.
- **Performance:** avoid unnecessary client-only trees; prefer tokenized Tailwind over runtime style injection.
- **Regression:** extend `e2e/*.spec.ts` when adding flows; keep selectors role/text based where possible.
