# AGENTS.md: Vielzeug

Canonical entrypoint for every AI client. `.github/copilot-instructions.md` and `.junie/AGENTS.md` point here. The Project profile supplies repository-specific commands and gates; task procedure comes from the installed Klugzeug skills. The only skill stored in this repository is the Codex consumer skill, `packages/codex/skills/vielzeug/` (`.agents/skills/vielzeug` is a symlink to it).

Vielzeug is a monorepo of independent TypeScript packages published as `@vielzeug/*`. Package targets, entry points, and build formats vary; each package manifest is authoritative. Most library packages use Vite and ship ESM/CJS output.

## Find it fast

| Question                                                           | Fastest source                                                                                                                                      |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| What packages exist; a package's subpaths, docs, local rules       | [`.agents/reference/packages.md`](./.agents/reference/packages.md) (generated); `packages/<name>/package.json` for one package                      |
| Public API of a package                                            | `packages/<name>/src/index.ts` and its sub-path entries; MCP `get-type-signature` when codex is available                                           |
| How to use a package                                               | `docs/<name>/`; MCP `get-docs` / `search`                                                                                                           |
| Refine component, token, or markup                                 | MCP `refine-get-component`, `refine-get-tokens`, `refine-validate-usage`; token source in `packages/refine/src/styles/`                             |
| MCP tool map, setup, or fallback                                   | [Codex skill tool map](./packages/codex/skills/vielzeug/SKILL.md); [server setup](./docs/codex/usage.md); without MCP, read package source and docs |
| What command to run                                                | **Commands** table below; `bun run` lists all root scripts                                                                                          |
| Which files a cross-cutting task touches (new package, docs page…) | [`.agents/reference/recipes.md`](./.agents/reference/recipes.md)                                                                                    |
| What lives in `.agents/`                                           | [`.agents/README.md`](./.agents/README.md)                                                                                                          |
| Package source conventions                                         | [`.agents/conventions.md`](./.agents/conventions.md)                                                                                                |
| Rules for a subtree (packages, demos, docs, scripts)               | **Subtree AGENTS.md index** at the end of this file                                                                                                 |
| CI, publishing, or release automation                              | `.github/AGENTS.md` (protected: approval required before any change)                                                                                |

## Project profile

Consumed by the Klugzeug skills as repository-specific context. `none` means the repository has no such facility; rules elsewhere in this file still apply.

- **Stack**: strict ES2022 TypeScript monorepo; Bun workspaces (`packages/*`, `demos/*`); most library packages use Vite; Vitest with jsdom; Biome; VitePress; Lefthook.

### Commands

| Key                             | Value                                                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Install                         | `bun install`                                                                                                                                                                                                                  |
| Dev command                     | `bun run docs:dev` (docs); `bun run docs:dev:refine` (docs + Refine bundle watch); demos: `bun run --filter vielzeug-crm-demo dev` (also `vielzeug-motors-demo`, `vielzeug-studio-demo`, `vielzeug-voyage-demo`)               |
| Browser-test command            | `bun run --filter @vielzeug/refine test:e2e` (reuse fresh final-build output; `build:e2e` only for an earlier artifact-backed check); demos: `test:e2e` in `vielzeug-crm-demo`, `vielzeug-motors-demo`, `vielzeug-studio-demo` |
| Test (all)                      | `bun run test --run`                                                                                                                                                                                                           |
| Test (one file)                 | `bun x vitest run <file>`; one package: `bun x vitest run packages/<name>/src/` (Refine tests are co-located)                                                                                                                  |
| Lint                            | `bun run --filter @vielzeug/<name> lint` (all: `bun run lint`)                                                                                                                                                                 |
| Lint fix                        | `bun run fix`                                                                                                                                                                                                                  |
| Typecheck                       | none at root; `bun x tsc -p packages/<name>/tsconfig.json --noEmit`; also `bun run --filter @vielzeug/<name> <script>` for `test:types`/`typecheck` listed in `.agents/reference/packages.md` → Navigation                     |
| Build                           | `bun run --filter @vielzeug/<name> build` (all: `bun run build`)                                                                                                                                                               |
| E2E                             | `bun run --filter @vielzeug/<name> test:e2e` where declared (`.agents/reference/packages.md` → Navigation: gesture, necromancer, refine, sentinel; demos crm, eshop, studio)                                                   |
| Docs                            | `bun run --filter @vielzeug/codex build && bun run docs:build`; validators `validate:docs`, `validate:readme`, `validate:repl`, `validate:sidebar`, each with `-- --package=<name>`                                            |
| Analyse command                 | none                                                                                                                                                                                                                           |
| Audit command                   | none                                                                                                                                                                                                                           |
| Performance measurement command | none                                                                                                                                                                                                                           |
| Packed-package check            | `bun run verify:packed -- --package=@vielzeug/<name>` (only when asked)                                                                                                                                                        |
| Change-file command             | `bun scripts/change.mjs <name> <patch\|minor\|major> "<message>"`                                                                                                                                                              |

### Validation gates by changed surface

Use the gate for each changed surface; exact commands are listed in **Commands**.

| Changed surface                              | Gate                                                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package source                               | focused vitest for affected behavior, package `tsconfig.json` check, any listed `test:types`/`typecheck` script, `lint`, and `build`                                        |
| Real-browser behaviour (`test:e2e` declared) | `test:e2e` scoped to the affected component; Refine needs fresh IIFE dependencies and copied styles, normally supplied by the final build (see `packages/refine/AGENTS.md`) |
| Public API                                   | package gate plus `bun run validate:docs`, `validate:readme`, `validate:repl`, `validate:sidebar` with `-- --package=<name>`                                                |
| Tests only                                   | focused tests; lint and build only when config or imports changed                                                                                                           |
| Cross-package call sites                     | focused tests, lint, and build for every affected package                                                                                                                   |
| Demo or integration                          | owning-package gate when the library changed; demo test and build; `bun run validate:demos` for shared impact                                                               |
| Build config or `_dev.ts` gating             | `bun run verify:prod-gate`                                                                                                                                                  |
| Tooling (`scripts/`)                         | `bun x vitest run scripts/` and a direct smoke run of the changed script                                                                                                    |
| `.agents/` or package manifests              | `bun run check:ai-data`; `bun run check:package-manifests` for manifests                                                                                                    |
| `AGENTS.md` instructions only                | `bun run check:ai-data` and `git diff --check`; no package, Codex, or VitePress build                                                                                       |
| Docs                                         | `validate:docs`, then `bun run --filter @vielzeug/codex build && bun run docs:build`                                                                                        |
| Change files                                 | `bun run check:change-files`                                                                                                                                                |
| Publish or release verification              | `bun run verify:packed -- --package=@vielzeug/<name>` (only when asked)                                                                                                     |
| `.github/workflows`                          | `bun run ci:local` (needs `act`); workflow edits need approval                                                                                                              |

### Testing

| Key                | Value                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Test layers        | unit: vitest + jsdom in `src/__tests__/`; component: refine co-located tests; integration: `codex` and `archive` (real workerd); e2e: Playwright; types: package `tsconfig.json` plus declared type-test scripts; visual: none |
| Query helper       | `@vielzeug/assay` (role-first DOM queries)                                                                                                                                                                                     |
| Interaction helper | `@vielzeug/assay` (keyboard simulation)                                                                                                                                                                                        |
| Network helper     | none                                                                                                                                                                                                                           |
| Visual baseline    | none                                                                                                                                                                                                                           |

Accessibility assertions: global `axeCheck(element)` in ore, refine, and prism Vitest (`vitest.setup.ts`); `axeCheck(page)` from `@vielzeug/refine/testing` in per-component `*.e2e.ts`.

### Conventions

| Key                     | Value                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reactivity model        | `@vielzeug/ripple` signals; ore renders from reactive state; refine builds on ore                                                                                              |
| Translation mechanism   | `@vielzeug/lingua` (`createI18n`, `@vielzeug/lingua/ripple`); catalogs in `demos/crm/src/core/i18n.ts` and `demos/eshop/src/core/i18n.ts` (studio and voyage are untranslated) |
| Error types             | `<Pkg>Error` base class in `src/errors.ts` (`.agents/conventions.md`)                                                                                                          |
| Return-shape convention | no Result type: failures throw the `<Pkg>Error` hierarchy (`.agents/conventions.md` → Errors)                                                                                  |
| Query key convention    | none                                                                                                                                                                           |
| Large-list approach     | `@vielzeug/scroll` virtual rows; no fixed threshold (see `docs/scroll/`)                                                                                                       |
| Commit convention       | conventional commits (`feat(courier): add retry logic`)                                                                                                                        |
| PR template             | `.github/pull_request_template.md`                                                                                                                                             |

### Design, accessibility, and budgets

| Key                  | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design system        | `@vielzeug/refine` tokens and theme (`packages/refine/src/styles/`); component and token lookups through `.agents/skills/vielzeug/SKILL.md`                                                                                                                                                                                                                                                                                                                                                                                            |
| Accessibility target | WCAG 2.2 Level AA for Refine and demo UI: jsdom `axeCheck` plus Playwright `test:e2e` with `color-contrast` and `target-size` (`docs/refine/accessibility.md`). prism: jsdom `axeCheck` only; colour and layout rules stay manual (`packages/prism/AGENTS.md`)                                                                                                                                                                                                                                                                         |
| Browser support      | Shipped Refine CSS uses the `html.dark` class, forced `color-scheme`, and `light-dark()` contract in `packages/refine/src/styles/theme.css`; `@media (prefers-color-scheme)` is not the dark-mode mechanism |
| Bundle budget        | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Security checklist   | `.agents/reference/security-checklist.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Doc templates        | `.agents/reference/docs-template.md`, `.agents/reference/readme-template.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Repository

| Key                         | Value                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Runtime and package manager | Bun 1.4.4 (`packageManager`); Node 22 for tests and docs                                                             |
| Plan file                   | `<scope>/.plan.md` (typical: `packages/<name>/`, also `docs/`, `demos/`, `scripts/`); gitignored: yes; committed: no |
| Protected branches          | `main` (CI and docs deploy trigger on `main`)                                                                        |
| Protected paths             | see **Protected paths** below                                                                                        |
| Public API entry points     | `packages/<name>/src/index.ts`; errors in `src/errors.ts`; `_dev.ts` is internal                                     |

### Project rules

- **Versioning**: CalVer lockstep trains, `YY.MM.N`; see `RELEASE.md`. Change-file type selects the changelog section only.
- **Change files**: written under `changes/@vielzeug/<name>/`. Docs changes add a codex change file through the pre-commit hook.
- **Breaking changes** ride the next train: describe them in the changelog entry and the package's `docs/<name>/migration.md`.
- **New packages**: use `bun run new:package <name> "<description>"`.
- **Worktrees**: `bun run worktree:add <pkg>` only for packages with no `@vielzeug/*` dependency edge in either direction; the script checks live manifests.
- **Generated files**: `.agents/reference/packages.md`, the subtree index in this file, generated blocks in `packages/codex/skills/vielzeug/SKILL.md`, and docs alias maps. Change their sources and regenerate: edit `.agents/` sources directly, run `bun run gen:ai-data`, then `bun run check:ai-data`. Generated blocks are outputs, not editing surfaces; the checker also rejects dangling `.agents/...` links.
- **Workspace registry**: the root glob over `packages/*` and `demos/*` is the only workspace registry. Keep `.nvmrc` and `.tool-versions` on the same Node major.
- **Published APIs**: workspace searches do not cover external consumers. Before removing a public symbol based on local search alone, check relevant downstream consumers or mark external usage unverified.

### Protected paths

- `packages/codex/skills/vielzeug/`: the consumer skill. Edit it there; `.agents/skills/vielzeug` is a symlink to it.
- `.github/workflows/`, `.github/AGENTS.md`: approval required before any change.
- `changes/@vielzeug/codex/`: written by the pre-commit hook for docs changes.

## Subtree AGENTS.md index

Subtrees carry their own `AGENTS.md` only when they have rules not covered here or in `.agents/conventions.md`; most packages intentionally have none. The index below is generated from each file's `> Read when:` line by `bun run gen:ai-data` (`bun run check:ai-data` guards it): read a subtree file when its condition matches your task.

<!-- GENERATED:agents-index:BEGIN -->

- [`demos/AGENTS.md`](./demos/AGENTS.md): editing anything under `demos/`, or validating a package change through a demo app.
- [`docs/AGENTS.md`](./docs/AGENTS.md): editing `docs/` pages, the VitePress theme, or the REPL.
- [`packages/AGENTS.md`](./packages/AGENTS.md): editing source under any `packages/<name>/` directory.
- [`packages/archive/AGENTS.md`](./packages/archive/AGENTS.md): working on `@vielzeug/archive` (Cloudflare Workers + D1 content publishing).
- [`packages/arsenal/AGENTS.md`](./packages/arsenal/AGENTS.md): working on `@vielzeug/arsenal` utilities, or adding a helper that belongs in a category sub-path.
- [`packages/codex/AGENTS.md`](./packages/codex/AGENTS.md): working on the codex MCP server, its tools, or its bundled docs data.
- [`packages/illusionist/AGENTS.md`](./packages/illusionist/AGENTS.md): working on `@vielzeug/illusionist` fake-data generation, locales, or seeds.
- [`packages/ore/AGENTS.md`](./packages/ore/AGENTS.md): working on `@vielzeug/ore` primitives; breaking changes here cascade to `refine`.
- [`packages/prism/AGENTS.md`](./packages/prism/AGENTS.md): working on `@vielzeug/prism` charts.
- [`packages/refine/AGENTS.md`](./packages/refine/AGENTS.md): working on `@vielzeug/refine` components, tokens, styles, or theme.
- [`packages/spell/AGENTS.md`](./packages/spell/AGENTS.md): working on `@vielzeug/spell` schemas, validation, or its JSON Schema / predicate sub-paths.
- [`scripts/AGENTS.md`](./scripts/AGENTS.md): editing `scripts/` tooling or the shared `scripts/lib/` primitives.

<!-- GENERATED:agents-index:END -->
