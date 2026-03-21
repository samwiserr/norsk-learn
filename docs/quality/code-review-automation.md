# Code Review Automation

This project includes advisory code review automation aligned to `.cursor/rules/code-reviewer.mdc`.

## Commands

- `npm run review:analyze`  
  Generates machine-readable findings at `review-report.json`.
- `npm run review:report`  
  Converts `review-report.json` into `review-report.md`.
- `npm run review:ci`  
  Runs both steps in sequence.

## What is checked

PR/changed-file heuristics:

- hardcoded secret-like patterns
- debug statements (`console.log`, `debugger`)
- `eslint-disable` directives
- TypeScript `any` usage
- TODO/FIXME comments
- structural heuristics (deep nesting, large file, long function, too many params, branch-complexity keywords)

## CI workflow

Workflow: `.github/workflows/code-review.yml`

- Trigger: pull requests to `main`/`master`
- Output artifacts:
  - `review-report.json`
  - `review-report.md`
- PR integration:
  - posts/updates a sticky PR comment with markdown report summary

## Enforcement policy

Current mode is **advisory**:

- findings do not fail the workflow
- reports are intended for reviewer prioritization and risk visibility

After tuning signal quality, this can be upgraded to hard gating on selected severities.

