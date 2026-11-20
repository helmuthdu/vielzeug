# AGENTS.md: Vielzeug

Canonical entrypoint for every AI client. `.github/copilot-instructions.md` and `.junie/AGENTS.md` point here instead of restating it. Repo-wide rules live in this file, and the **Project profile** supplies the commands and gates the workflow skills use. Task procedure comes from the klugzeug skills (`plan`, `build`, `test`, `review`, `docs`, `deliver`, `pipeline`, `onboard`), installed per machine under `~/.agents/skills/` (shared contract in `~/.agents/klugzeug/contract.md`). The only skill stored in this repository is the Codex consumer skill, `packages/codex/skills/vielzeug/` (`.agents/skills/vielzeug` is a symlink to it).

Vielzeug is a monorepo of independent TypeScript packages published as `@vielzeug/*`. Packages target ES2022, use strict TypeScript, and ship ESM and CJS builds through Vite.

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

## Start work

1. Inspect the worktree and preserve changes you did not make.
2. Use the klugzeug skill that matches the task. Clients with skill support load them automatically; otherwise read the skill file. Load the Codex consumer skill for demo changes that consume `@vielzeug/*`:

| Situation                                              | Skill                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Change code, tests, tooling, or CI                     | `build`                                                                               |
| Improve or audit tests                                 | `test`                                                                                |
| Review, audit security, accessibility, or performance  | `review` (lens `code`, `pr`, `greenfield`, `security`, `a11y`, `perf`, `ux`, or `ui`) |
| Plan, audit, spec, or redesign before changing         | `plan`                                                                                |
| Update docs, README, recipes, or REPL examples         | `docs`                                                                                |
| Prepare commits, pull requests, or change files        | `deliver`                                                                             |
| Full pass from plan to delivery                        | `pipeline`                                                                            |
| Refresh stale **Project profile** (commands, gates)    | `onboard`                                                                             |
| Consume `@vielzeug/*` packages (demos, Refine UI work) | `.agents/skills/vielzeug/SKILL.md`                                                    |
| Write or change HTML/CSS or client-side JS (refine, ore, prism, demos, docs theme) | `modern-web-guidance` alongside `build` — search its guides before writing platform code |

3. When a task matches multiple rows, load each matching skill. In particular, code changes to demos that consume `@vielzeug/*` require both `build` and `vielzeug`.
4. Read the Project profile and its linked files. Load `.agents/conventions.md` before editing package source.
5. Before editing inside a subtree, read every applicable `AGENTS.md` on the path from the repo root to the target (use the index at the end to find them): subtree rules stack, and the nearest file wins on a conflict.

## Project profile

Read by the klugzeug skills. Each **bold** name in the tables below is a profile key defined in `~/.agents/klugzeug/contract.md` → **Profile keys**; `none` means the repository has no such thing. Rules elsewhere in this file still apply.

- **Stack**: TypeScript strict monorepo; Bun workspaces (`packages/*`, `demos/*`); Vite library builds (ESM and CJS); Vitest with jsdom; Biome; VitePress docs; Lefthook hooks.
- **Workflow skills**: `plan`, `build`, `test`, `review`, `docs`, `deliver`, `pipeline`, `onboard` — klugzeug, installed per machine under `~/.agents/skills/`. `modern-web-guidance` (same directory) is the search-first guide corpus for HTML/CSS and client-side JS work; see **Browser support** below.
- **Profile refresh**: run klugzeug `onboard` when root `package.json` scripts, validation gates, protected paths, release or CI workflow facts, or `.agents/` layout change.

### Commands

| Key                             | Value                                                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install                         | `bun install`                                                                                                                                                                       |
| Dev command                     | `bun run docs:dev` (docs and Refine components); demos: `bun run --filter vielzeug-crm-demo dev` (also `vielzeug-motors-demo`, `vielzeug-studio-demo`, `vielzeug-voyage-demo`)      |
| Browser-test command            | `bun run --filter @vielzeug/refine test:e2e` (run `build:e2e` first); demos: `test:e2e` in `vielzeug-crm-demo`, `vielzeug-motors-demo`, `vielzeug-studio-demo`                      |
| Test (all)                      | `bun run test`                                                                                                                                                                      |
| Test (one file)                 | `bun x vitest run <file>`; one package: `bun x vitest run packages/<name>/src/` (Refine tests are co-located)                                                                       |
| Lint                            | `bun run --filter @vielzeug/<name> lint` (all: `bun run lint`)                                                                                                                      |
| Lint fix                        | `bun run fix`                                                                                                                                                                       |
| Typecheck                       | none at root; `bun x tsc -p packages/<name>/tsconfig.json --noEmit`; also `bun run --filter @vielzeug/<name> <script>` for `test:types`/`typecheck` listed in Navigation            |
| Build                           | `bun run --filter @vielzeug/<name> build` (all: `bun run build`)                                                                                                                    |
| E2E                             | `bun run --filter @vielzeug/<name> test:e2e` where declared (Navigation table: gesture, necromancer, refine, sentinel; demos crm, eshop, studio)                                    |
| Docs                            | `bun run --filter @vielzeug/codex build && bun run docs:build`; validators `validate:docs`, `validate:readme`, `validate:repl`, `validate:sidebar`, each with `-- --package=<name>` |
| Analyse command                 | none                                                                                                                                                                                |
| Audit command                   | none                                                                                                                                                                                |
| Performance measurement command | none                                                                                                                                                                                |
| Packed-package check            | `bun run verify:packed -- --package=@vielzeug/<name>` (only when asked)                                                                                                             |
| Change-file command             | `bun scripts/change.mjs <name> <patch\|minor\|major> "<message>"`                                                                                                                   |

### Validation gates by changed surface

Final gates run once, per Build Scheduling below. Focused checks run while iterating.

| Changed surface                              | Gate                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package source                               | focused vitest for affected behavior, package `tsconfig.json` check, any listed `test:types`/`typecheck` script, `lint`, and `build`                          |
| Real-browser behaviour (`test:e2e` declared) | `test:e2e` scoped to the affected component; refine needs `build:e2e` first                                                                                   |
| Public API                                   | package gate plus `bun run validate:docs`, `validate:readme`, `validate:repl`, `validate:sidebar` with `-- --package=<name>`                                  |
| Tests only                                   | focused tests; lint and build only when config or imports changed                                                                                             |
| Cross-package call sites                     | focused tests, lint, and build for every affected package                                                                                                     |
| Demo or integration                          | owning-package gate when the library changed; demo test and build; `bun run validate:demos` for shared impact                                                 |
| Visible UI (demos, refine, docs theme)       | owning-package gate; Playwright `test:e2e` where declared; after aggregate gates, `~/.agents/klugzeug/browser-verification.md` when the `build` skill applies |
| Build config or `_dev.ts` gating             | `bun run verify:prod-gate`                                                                                                                                    |
| Tooling (`scripts/`)                         | `bun x vitest run scripts/` and a direct smoke run of the changed script                                                                                      |
| `.agents/` or package manifests              | `bun run check:ai-data`; `bun run check:package-manifests` for manifests                                                                                      |
| Docs                                         | `validate:docs`, then `bun run --filter @vielzeug/codex build && bun run docs:build`                                                                          |
| Change files                                 | `bun run check:change-files`                                                                                                                                  |
| Publish or release verification              | `bun run verify:packed -- --package=@vielzeug/<name>` (only when asked)                                                                                       |
| `.github/workflows`                          | `bun run ci:local` (needs `act`); workflow edits need approval                                                                                                |

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

| Key                     | Value                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Reactivity model        | `@vielzeug/ripple` signals; ore renders from reactive state; refine builds on ore                              |
| Translation mechanism   | `@vielzeug/lingua` (`createI18n`, `@vielzeug/lingua/ripple`); demo catalogs in `demos/<name>/src/core/i18n.ts` |
| Error types             | `<Pkg>Error` base class in `src/errors.ts` (`.agents/conventions.md`)                                          |
| Return-shape convention | no Result type: failures throw the `<Pkg>Error` hierarchy (`.agents/conventions.md` → Errors)                  |
| Query key convention    | none                                                                                                           |
| Large-list approach     | `@vielzeug/scroll` virtual rows; no fixed threshold (see `docs/scroll/`)                                       |
| Commit convention       | conventional commits (`feat(courier): add retry logic`)                                                        |
| PR template             | `.github/pull_request_template.md`                                                                             |

### Design, accessibility, and budgets

| Key                  | Value                                                                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design system        | `@vielzeug/refine` tokens and theme (`packages/refine/src/styles/`); component and token lookups through `.agents/skills/vielzeug/SKILL.md`                                                                                                                    |
| Accessibility target | WCAG 2.2 Level AA for Refine and demo UI: jsdom `axeCheck` plus Playwright `test:e2e` with `color-contrast` and `target-size` (`docs/refine/accessibility.md`). prism: jsdom `axeCheck` only; colour and layout rules stay manual (`packages/prism/AGENTS.md`) |
| Browser support      | Baseline **Widely available** features are safe without fallbacks. For newer features, adopt a guide fallback only when it adds ≤ 20 lines and no external dependency; otherwise feature-detect with graceful degradation or redesign. Guide lookups via the `modern-web-guidance` skill (`~/.agents/skills/`). Library rule: `@media (prefers-color-scheme)` is never the dark-mode mechanism in shipped CSS — the `html.dark` class + forced `color-scheme` + `light-dark()` contract in `packages/refine/src/styles/theme.css` wins |
| Bundle budget        | none                                                                                                                                                                                                                                                           |
| Security checklist   | `.agents/reference/security-checklist.md`                                                                                                                                                                                                                      |
| Doc templates        | `.agents/reference/docs-template.md`, `.agents/reference/readme-template.md`                                                                                                                                                                                   |

### Repository

| Key                         | Value                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Runtime and package manager | Bun 1.4.4 (`packageManager`); Node 22 for tests and docs                                                             |
| Plan file                   | `<scope>/.plan.md` (typical: `packages/<name>/`, also `docs/`, `demos/`, `scripts/`); gitignored: yes; committed: no |
| Protected branches          | `main` (CI and docs deploy trigger on `main`)                                                                        |
| Protected paths             | see **Protected paths** below                                                                                        |
| Public API entry points     | `packages/<name>/src/index.ts`; errors in `src/errors.ts`; `_dev.ts` is internal                                     |

### Project rules that always apply

- **Versioning** is CalVer lockstep trains, `YY.MM.N`, see `RELEASE.md`. Never pick a patch, minor, or major bump for versioning. A change file's type only selects the changelog section.
- **Change files**: one package per call, written under `changes/@vielzeug/<name>/`. Never scan the working tree for pending change files. Docs changes add a codex change file through the pre-commit hook.
- **Breaking changes** ride the next train: describe them in the changelog entry and the package's `docs/<name>/migration.md`.
- **New packages**: `bun run new:package <name> "<description>"`. Do not hand-create the scaffold.
- **Worktrees**: `bun run worktree:add <pkg>` only for packages with no `@vielzeug/*` dependency edge in either direction; the script checks live manifests.
- **Generated files**: `.agents/reference/packages.md`, the subtree index in this file, generated blocks in `packages/codex/skills/vielzeug/SKILL.md`, and docs alias maps. Change their sources and regenerate: edit `.agents/` sources directly, run `bun run gen:ai-data`, then `bun run check:ai-data`. Generated blocks are outputs, not editing surfaces; the checker also rejects dangling `.agents/...` links.
- **Workspace registry**: the root glob over `packages/*` and `demos/*` is the only package registry. Keep `.nvmrc` and `.tool-versions` on the same Node major.

### Protected paths

- `packages/codex/skills/vielzeug/`: the consumer skill. Edit it there; `.agents/skills/vielzeug` is a symlink to it.
- `.github/workflows/`, `.github/AGENTS.md`: approval required before any change.
- `changes/@vielzeug/codex/`: written by the pre-commit hook for docs changes.

### Delivery

- Use the PR template from the Project profile and preserve its headings; its Validation section lists exact commands and results.
- Pre-commit hooks (Lefthook): Biome, related Vitest files, `check:ai-data` for `.agents/**` and `AGENTS.md` files, and the codex change file for `docs/**`. Never bypass them with `--no-verify`.
- Publishing and releasing are outside the workflow skills; they need explicit approval for each action.

## Source of truth

1. Source code and package manifests win over docs, comments, and generated text.
2. Prefer the codex MCP lookups listed in **Find it fast** when available, but verify against source before changing code.
3. Do not use `git log`, `git diff`, or `git blame` as a default source of design truth.
4. Package facts (name, description, dependency graph) come from `packages/<name>/package.json`. `.agents/reference/packages.md` is a generated one-page view of the same data.

## Safety

- Do not commit, push, tag, release, publish, rewrite history, or delete branches without explicit approval for that action.
- Do not add dependencies without explicit approval.
- Do not weaken, skip, or delete tests to force a green run.
- If a change intentionally breaks public API, surface it clearly instead of hiding it behind compatibility code.

## Working style

- Prefer the smallest task that fits the work, direct code reading over speculation, and simple architecture over configurable architecture.
- Prefer deleting obsolete patterns to wrapping them.
- Treat demos as first-party integration harnesses. When a demo exposes a library gap, fix the owning package instead of adding a demo-only workaround, then cover both.
- External consumers of published packages are invisible to a workspace grep: before removing or breaking a public symbol on "no consumers" grounds, verify with a code search across the consuming repositories, not only this checkout.
- Demo UI MUST favor existing `@vielzeug/refine` components over custom composite controls. When Refine lacks the required primitive or behavior, improve or add it in `packages/refine` with tests and documentation before consuming it from a demo; use native elements only for document semantics that do not duplicate a Refine component.
- Every UI change that consumes Refine MUST use Refine design tokens and component variables for spacing, dimensions, typography, radii, colors, borders, shadows, and motion instead of hardcoded or magic values. Use a hardcoded value only when no suitable token exists and the value is an intrinsic technical constraint; make that reason evident in the implementation.
- Treat the monorepo as one owned system: propagate changes across packages, demos, tests, and docs when required for correctness and coherence.
- When valid approaches conflict, choose one definitive design favoring lower coupling, fewer moving parts, explicit behavior, and idiomatic TypeScript. Do not ship parallel alternatives unless explicitly required.
- Scale effort to the change. A one-function fix does not need every review pass, but scaling down never skips an approval gate, a required validation, or a fix for a confirmed security finding.

## Workflow contract

Delegation, escalation, build scheduling, findings format, plan structure, and report format live in `~/.agents/klugzeug/contract.md` (installed with the skills). Repo-specific rules in this file win over generic skill defaults. Escalate with a `[BLOCKED]` marker before proceeding when the baseline is already red and the task is not about fixing it, requirements are ambiguous enough to produce materially different designs, the change would break multiple dependent packages, or it needs a new dependency, data migration, or irreversible deletion.

Markers (same as the contract, repeated for clients that load only this file): `[BLOCKED] <decision>` needs explicit user confirmation; `[VERIFY] <claim>: <reason>` flags a claim not confirmed from source; `[DEFERRED] <work>: <reason>` is valuable but out of scope. User-requested output formats take precedence, except a safety gate always uses `[BLOCKED]`.

## Validation

This section is the single owner of validation commands and workflow facts; each skill's Validation table only maps changed surfaces to these commands and never restates versioning or policy facts. Every code change finishes with the narrowest useful validation for the changed surface; each skill's Validation section says which. Report commands that could not run and their exact failure; never infer success from inspection alone.

### Build Scheduling

- Treat package and docs builds as final validation gates, not checks to repeat after each edit, component, or plan step. During implementation, use focused source-backed tests, lint/type checks, and source-backed browser previews.
- Plan one build per affected package after its implementation changes are complete, in dependency order. Batch checks that consume built output after that build. A successful build also satisfies the final build gate while its inputs remain unchanged; do not repeat it just because another plan step or skill lists it.
- Build earlier only when the next check actually consumes built artifacts and they are missing or stale, or when investigating build/output behavior. Before each build, state the artifact consumer and why an existing result cannot be reused. Never test changed source against stale dist and claim it validates the change.
- After a successful build, rebuild only if a relevant input changed (source, styles, generated inputs, exports, dependency artifacts, or build configuration). Test-only or docs-only edits do not invalidate a library build unless that build consumes them. Reuse unchanged dependency artifacts; do not rebuild the monorepo to validate one package.
- VitePress local development aliases workspace packages to source, so package edits do not require a rebuild for `docs:dev` preview. Keep required production builds (including Codex before the docs build) for the final gate; preview is not a substitute for production-output verification.

Commands live in the **Commands** table under **Project profile**; the **Validation gates by changed surface** table maps each surface to its gate. Use **Lint fix** for Biome formatting and import organization; `bun run` with no arguments lists all root scripts.

### Common pitfalls

- Bun filtered commands run one script per invocation; `bun run --filter @vielzeug/<name> lint build` passes `build` to `lint`.
- Vitest does not type-check TypeScript files; run the package `tsconfig.json` check, plus declared `test:types`/`typecheck` scripts for typed API contracts.
- Re-read `AGENTS.md` from disk before relying on it; a client may have loaded a stale copy at session start.

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
