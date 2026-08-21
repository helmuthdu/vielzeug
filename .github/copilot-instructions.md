# GitHub Copilot Repository Instructions

These instructions apply repository-wide. Keep changes focused, preserve unrelated work, and
complete implementation, tests, and affected documentation together.

## Repository

Vielzeug is a monorepo of independent TypeScript packages published as `@vielzeug/*`.
Packages target ES2022, use strict TypeScript, and ship ESM and CJS builds through Vite.

- Runtime: Node 22 (`.tool-versions`; Rush accepts the range declared in `rush.json`)
- Package manager: pnpm 10.33.4
- Monorepo orchestration: Rush
- Tests: Vitest
- Formatting and linting: Biome
- Documentation: VitePress

## Start work

When repository tools are available:

1. Inspect the current worktree and preserve changes you did not make.
2. Read the nearest `AGENTS.md` for the files being changed.
3. Read the smallest matching playbook in `.ai/tasks/`:
   - `build.md` for source, tests, tooling, CI, or behavior
   - `review.md` for investigation, design, or review
   - `document.md` for docs, README, recipes, or REPL examples
   - `release.md` for change files, commits, pull requests, or release diagnostics
4. Follow references listed in that task's `Load` section.

Source code and package manifests override generated references or copied prose.

## Repository layout

| Path | Purpose |
| --- | --- |
| `packages/<name>/` | Independent published packages |
| `docs/<name>/` | Package documentation and recipes |
| `scripts/` | Workspace, generation, validation, and release tooling |
| `.ai/` | Canonical AI policy, task playbooks, metadata, and references |
| `common/` and `rush.json` | Rush workspace configuration |
| `.github/workflows/` | CI and publishing workflows |

Subtrees with additional rules contain their own `AGENTS.md`. Most packages intentionally rely
only on `packages/AGENTS.md` and `.ai/core/conventions.md`.

## Required engineering rules

- Do not add dependencies, commit, push, publish, release, or perform irreversible operations
  without explicit approval.
- Keep package source strict TypeScript. Do not use `any` or add JavaScript files under `src/`.
- Do not add external runtime dependencies unless explicitly approved. Workspace dependencies
  use `workspace:*`.
- Route public root exports through `packages/<name>/src/index.ts`.
- Update source, tests, exports, types, docs, and examples together when public behavior changes.
- Treat removed or renamed public APIs as breaking; do not add compatibility aliases or silent
  fallbacks unless requested.
- Follow the disposal, typed-error, diagnostics, and file-layout contracts in
  `.ai/core/conventions.md`.
- Use existing package scripts and shared tooling instead of introducing parallel commands or
  hand-maintained generated data.
- Never weaken or delete tests merely to make validation pass.

## Setup and commands

From a fresh checkout, install dependencies before building:

```bash
pnpm setup
```

Use the narrowest command that covers the change:

```bash
pnpm vitest run packages/<name>/src/__tests__/
pnpm --filter @vielzeug/<name> lint
pnpm --filter @vielzeug/<name> build
pnpm validate:docs -- --package=<name>
pnpm validate:repl -- --package=<name>
pnpm check:ai-data
```

Repository-wide commands are `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm fix`. Use
`pnpm fix` for Biome formatting and import organization rather than hand-formatting.

For AI metadata changes, edit canonical `.ai/` sources, run `pnpm gen:ai-data`, then run
`pnpm check:ai-data`. Do not hand-edit generated table blocks or local client adapters.

## Validation

- Package source: focused tests, package lint, package build.
- Public API: package validation plus affected docs and REPL validation.
- Documentation: package docs validation, Codex build, docs build.
- Tooling: focused script tests and a direct smoke command.
- Cross-package changes: validate every affected dependent package.

If the environment cannot run a required command, report the exact command and reason instead
of claiming success.
