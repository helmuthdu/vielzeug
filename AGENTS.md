# AGENTS.md — Vielzeug (DOX root rail)

## Purpose

Root [DOX](https://github.com/agent0ai/dox) rail for the Vielzeug monorepo. It anchors the AGENTS.md chain.

DOX is adopted in a **tiered** fashion: a child `AGENTS.md` exists only where a subtree has local rules not already covered by `.devin/rules/conventions.md`. Leaf packages that follow the standard conventions intentionally have **no** `AGENTS.md` — that absence is expected, not "unindexed".

## Ownership

- **Engineering conventions, package catalogue, and dependency graph** — `.devin/rules/conventions.md` (single source of truth; never duplicate it, reference it).
- **Reusable package workflows** (plan / implement / review / security / tests / docs / repl / orchestrator) — `.devin/workflows/*.md`.
- **Contributor and tooling guidance** — `CLAUDE.md`.

## Workflow Index

Reach for the workflow that matches the task (full definitions in `.devin/workflows/`):

| Situation | Workflow |
| --- | --- |
| Improve one package end-to-end | `/pkg-workflow` (orchestrates all phases) |
| Analyse and produce an improvement plan | `/pkg-plan` (run 3×) |
| Apply an existing plan | `/pkg-implement` (run 3×) |
| Suspected bug / quality concern | `/pkg-review` (Lens A correctness, B design, C types) |
| Security concern (injection, prototype pollution, leaks) | `/pkg-security` (run 3×) |
| Coverage gaps or messy tests | `/pkg-tests` |
| Docs out of sync with the API | `/pkg-docs` |
| REPL examples stale or missing | `/pkg-repl` |

Cadence inside `/pkg-workflow`: plan ×3 → implement ×3 → review ×3 → security ×3 → tests ×1 → docs ×1 → repl ×1.

## Local Contracts

- Before editing workflow run artifacts, follow the DOX chain: read this file, then `.devin/workflows/runs/AGENTS.md`.
- Do not duplicate canonical context; link to `.devin/rules/conventions.md`.

## Work Guidance

Defer to `.devin/rules/conventions.md` for code conventions and to the relevant `.devin/workflows/*.md` for task procedure.

## Verification

- Tests: `pnpm vitest run packages/<name>/src/__tests__/`
- Lint: `pnpm --filter @vielzeug/<name> lint`
- Build: `pnpm --filter @vielzeug/<name> build`
- Docs: `pnpm docs:build`

## Child DOX Index

- `packages/AGENTS.md` — source work for all `@vielzeug/*` libraries; indexes packages with extra local rules.
- `docs/AGENTS.md` — VitePress documentation site and REPL.
- `.devin/workflows/runs/AGENTS.md` — persisted hand-off artifacts for package-improvement workflow runs (plans, progress, findings).
