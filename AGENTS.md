# AGENTS.md — Vielzeug (DOX root rail)

## Purpose

Root [DOX](https://github.com/agent0ai/dox) rail for the Vielzeug monorepo. It anchors the AGENTS.md chain.

DOX is adopted in a **tiered** fashion: a child `AGENTS.md` exists only where a subtree has local rules not already covered by the `.ai/rules/` files. Leaf packages that follow the standard conventions intentionally have **no** `AGENTS.md` — that absence is expected, not "unindexed".

## Ownership

- **Engineering conventions** (disposal, logging, errors, file layout) — `.ai/rules/conventions.md` (single source of truth; never duplicate it, reference it).
- **Package catalogue and dependency graph** — `.ai/rules/catalogue.md` (live data; update when packages change).
- **Workspace toolchain, commands, versioning** — `.ai/rules/workspace.md`.
- **Reusable package workflows** (plan / implement / review / security / tests / docs / repl / orchestrator) — `.ai/workflows/*.md` (single source of truth; generated, gitignored stubs in `.devin/workflows/` and `.claude/commands/` delegate here via `.ai/workflows/manifest.json` + `pnpm gen:workflow-docs`; `.junie/guidelines.md` links here directly with no stub file).
- **Contributor and tooling guidance** — `CLAUDE.md`.

## Workflow Index

Reach for the workflow that matches the task (full definitions in `.ai/workflows/`):

| Situation | Workflow |
| --- | --- |
| Improve one package end-to-end | `/pkg-workflow` (default `analyse` mode; also proposes a lighter scope than the full pipeline where it fits — see `.ai/workflows/pkg-workflow.md § Scope selection`) |
| Add a feature to an existing package | `/pkg-workflow mode:feature` |
| Create a new package from scratch | `/pkg-workflow mode:new-package` |
| Analyse and produce an improvement plan | `/pkg-plan` (mode `analyse`, converges — typically ~3 passes) |
| Design a feature or new-package spec | `/pkg-plan` (mode `feature` / `new-package` — same file, different pass structure) |
| Apply an existing plan | `/pkg-implement` (converges — as many rounds as needed) |
| Suspected bug / quality concern | `/pkg-review` (Lens A correctness, B design, C types — all 3 mandatory) |
| Security concern (injection, prototype pollution, leaks) | `/pkg-security` (3 fixed surfaces — all mandatory) |
| Coverage gaps or messy tests | `/pkg-tests` |
| Docs out of sync with the API | `/pkg-docs` |
| REPL examples stale or missing | `/pkg-repl` |

Cadence inside `/pkg-workflow`: plan → implement converge on their own evidence (no fixed count, ~3 passes/rounds typical); review's 3 lenses and security's 3 surfaces are a fixed enumeration, always all run; tests → docs → repl are single-pass. See `.ai/rules/agent-execution.md § Multi-pass convergence` for the exact rule.

## Local Contracts

- `.ai/workflows/runs/<pkg>/` (workflow run scratch state) is gitignored, not part of the DOX chain — see `.ai/workflows/runs/AGENTS.md` for its lifecycle contract and `.ai/rules/agent-execution.md § Run artifacts` for the canonical, versioned description.
- Do not duplicate canonical context; link to the relevant `.ai/rules/*.md` file.

## Work Guidance

Defer to `.ai/rules/conventions.md` for engineering conventions, `.ai/rules/catalogue.md` for the package catalogue, `.ai/rules/workspace.md` for toolchain and commands, and the relevant `.ai/workflows/*.md` for task procedure.

## Verification

- Tests: `pnpm vitest run packages/<name>/src/__tests__/`
- Lint: `pnpm --filter @vielzeug/<name> lint`
- Build: `pnpm --filter @vielzeug/<name> build`
- Docs: `pnpm docs:build`

## Child DOX Index

- `packages/AGENTS.md` — source work for all `@vielzeug/*` libraries; indexes packages with extra local rules.
- `docs/AGENTS.md` — VitePress documentation site and REPL.
- `.ai/workflows/runs/AGENTS.md` — lifecycle contract for gitignored per-package workflow scratch state (plans, progress, findings). Not itself committed history — describes ephemeral state, not a package.
