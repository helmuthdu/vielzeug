# AGENTS.md: Vielzeug

Canonical entrypoint for every AI client. `.github/copilot-instructions.md` and `.junie/AGENTS.md` point here instead of restating it. Repo-wide rules live in this file, and the `## Project profile` section below supplies the commands and gates the workflow skills use. Task procedure comes from the klugzeug skills (`plan`, `build`, `test`, `review`, `docs`, `deliver`, `pipeline`, `onboard`), installed per machine under `~/.agents/skills/` (shared contract in `~/.agents/klugzeug/contract.md`). The only skill stored in this repository is the Codex consumer skill, `packages/codex/skills/vielzeug/` (`.agents/skills/vielzeug` is a symlink to it). Engineering conventions live in `.agents/conventions.md`.

Vielzeug is a monorepo of independent TypeScript packages published as `@vielzeug/*`. Packages target ES2022, use strict TypeScript, and ship ESM and CJS builds through Vite.

## Project profile

Read by the klugzeug skills. Each **bold** name in the tables below is a profile key defined in `~/.agents/klugzeug/contract.md` → **Profile keys**; `none` means the repository has no such thing. Rules elsewhere in this file still apply.

- **Stack**: TypeScript strict monorepo; Bun workspaces (`packages/*`, `demos/*`); Vite library builds (ESM and CJS); Vitest with jsdom; Biome; VitePress docs; Lefthook hooks. Node 22 for tests and docs.
- **Workflow skills**: `plan`, `build`, `test`, `review`, `docs`, `deliver`, `pipeline`, `onboard` — klugzeug, installed per machine under `~/.agents/skills/`.
- **Profile refresh**: run klugzeug `onboard` when root `package.json` scripts, validation gates, protected paths, release or CI workflow facts, or `.agents/` layout change.

### Commands

| Key                             | Value                                                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install                         | `bun install`                                                                                                                                                                       |
| Dev command                     | `bun run docs:dev` (docs and Refine components); demos: `bun run --filter vielzeug-crm-demo dev`, `vielzeug-motors-demo` (eshop), `vielzeug-voyage-demo`                            |
| Browser-test command            | `bun run --filter @vielzeug/refine test:e2e` (run `build:e2e` first); demos: `test:e2e` in `vielzeug-crm-demo` and `vielzeug-motors-demo`                                           |
| Test (all)                      | `bun run test`                                                                                                                                                                      |
| Test (one file)                 | `bun x vitest run <file>`; one package: `bun x vitest run packages/<name>/src/__tests__/`                                                                                           |
| Lint                            | `bun run --filter @vielzeug/<name> lint` (all: `bun run lint`)                                                                                                                      |
| Lint fix                        | `bun run fix`                                                                                                                                                                       |
| Typecheck                       | none at root; `bun run --filter @vielzeug/<name> test:types` where declared, `build` emits declarations; `[VERIFY]` for packages without these                                      |
| Build                           | `bun run --filter @vielzeug/<name> build` (all: `bun run build`)                                                                                                                    |
| E2E                             | `bun run --filter @vielzeug/<name> test:e2e` where declared (gesture, necromancer, refine, sentinel; demos crm and eshop)                                                           |
| Docs                            | `bun run --filter @vielzeug/codex build && bun run docs:build`; validators `validate:docs`, `validate:readme`, `validate:repl`, `validate:sidebar`, each with `-- --package=<name>` |
| Analyse command                 | none                                                                                                                                                                                |
| Audit command                   | none                                                                                                                                                                                |
| Performance measurement command | none                                                                                                                                                                                |
| Packed-package check            | `bun run verify:packed -- --package=@vielzeug/<name>` (only when asked)                                                                                                             |
| Change-file command             | `bun scripts/change.mjs <name> <patch\|minor\|major> "<message>"`                                                                                                                   |

### Validation gates by changed surface

Final gates run once, per Build Scheduling above. Focused checks run while iterating.

| Changed surface                              | Gate                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package source                               | focused vitest on `packages/<name>/src/__tests__/`, `lint`, `build` for the package                                                                           |
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

| Key                | Value                                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test layers        | unit: vitest + jsdom in `src/__tests__/`; component: refine co-located tests; integration: `codex` and `archive` (real workerd); e2e: Playwright; types: `test:types`; visual: none |
| Query helper       | `@vielzeug/assay` (role-first DOM queries)                                                                                                                                          |
| Interaction helper | `@vielzeug/assay` (keyboard simulation)                                                                                                                                             |
| Network helper     | none                                                                                                                                                                                |
| Visual baseline    | none                                                                                                                                                                                |

Accessibility assertions: global `axeCheck(element)` in ore, refine, and prism Vitest (`vitest.setup.ts`); `axeCheck(page)` from `@vielzeug/refine/testing` in per-component `*.e2e.ts`.

### Conventions

| Key                     | Value                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Reactivity model        | `@vielzeug/ripple` signals; ore renders from reactive state; refine builds on ore                              |
| Translation mechanism   | `@vielzeug/lingua` (`createI18n`, `@vielzeug/lingua/ripple`); demo catalogs in `demos/<name>/src/core/i18n.ts` |
| Error types             | `<Pkg>Error` base class in `src/errors.ts` (`.agents/conventions.md`)                                          |
| Return-shape convention | no Result type: failures throw the `<Pkg>Error` hierarchy (`.agents/conventions.md` → Errors)                  |
| Query key convention    | none                                                                                                           |
| Large-list approach     | `@vielzeug/scroll` virtual rows; size threshold `[VERIFY]`                                                     |
| Commit convention       | conventional commits (`feat(courier): add retry logic`)                                                        |
| PR template             | `.github/pull_request_template.md`                                                                             |

Conventions for package source: `.agents/conventions.md`, loaded before editing `packages/**`. Package facts come from `packages/<name>/package.json`; `.agents/reference/packages.md` is a generated view.

### Design, accessibility, and budgets

| Key                  | Value                                                                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design system        | `@vielzeug/refine` tokens and theme (`packages/refine/src/styles/`); component and token lookups through `.agents/skills/vielzeug/SKILL.md`                                                                                                                    |
| Accessibility target | WCAG 2.2 Level AA for Refine and demo UI: jsdom `axeCheck` plus Playwright `test:e2e` with `color-contrast` and `target-size` (`docs/refine/accessibility.md`). prism: jsdom `axeCheck` only; colour and layout rules stay manual (`packages/prism/AGENTS.md`) |
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

Repo-layout index: `.agents/README.md`. Demo UI and `@vielzeug/*` usage: load `.agents/skills/vielzeug/SKILL.md` alongside `build` (see Start work).

### Project rules that always apply

- **Versioning** is CalVer lockstep trains, `YY.MM.N`, see `RELEASE.md`. Never pick a patch, minor, or major bump for versioning. A change file's type only selects the changelog section.
- **Change files**: `bun scripts/change.mjs <name> <patch|minor|major> "<message>"`, one package per call, written under `changes/@vielzeug/<name>/`. Never scan the working tree for pending change files. Docs changes add a codex change file through the pre-commit hook.
- **Breaking changes** ride the next train: describe them in the changelog entry and the package's `docs/<name>/migration.md`.
- **Commits**: conventional commits, for example `feat(courier): add retry logic`.
- **New packages**: `bun run new:package <name> "<description>"`. Do not hand-create the scaffold.
- **Worktrees**: `bun run worktree:add <pkg>` only for packages with no `@vielzeug/*` dependency edge in either direction.
- **Generated files**: `.agents/reference/packages.md`, generated blocks in `packages/codex/skills/vielzeug/SKILL.md`, and docs alias maps. Change their sources and regenerate.

### Protected paths

- `packages/codex/skills/vielzeug/`: the consumer skill. Edit it there; `.agents/skills/vielzeug` is a symlink to it.
- `.github/workflows/`, `.github/AGENTS.md`: approval required before any change.
- `changes/@vielzeug/codex/`: written by the pre-commit hook for docs changes.

### Delivery

- PR template: `.github/pull_request_template.md`. Keep its headings; the Validation section lists the exact commands and results.
- Pre-commit hooks (Lefthook): Biome, related Vitest files, `check:ai-data` for `.agents/**`, and the codex change file for `docs/**`. Never bypass them with `--no-verify`.
- Publishing and releasing are outside the workflow skills; they need explicit approval for each action.

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

3. When a task matches multiple rows, load each matching skill. In particular, code changes to demos that consume `@vielzeug/*` require both `build` and `vielzeug`.
4. Read the `## Project profile` above and the files it links, and reuse instruction files already in the task context. Load `.agents/conventions.md` before editing package source.
5. Read the nearest subtree `AGENTS.md` before editing inside it (see the index at the end).

## Source of truth

1. Source code and package manifests win over docs, comments, and generated text.
2. Prefer the `codex` package's MCP data when available, but verify against source before changing code.
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

## Klugzeug overlap

Delegation, escalation, build scheduling, findings format, plan structure, and end-of-task report format live in `~/.agents/klugzeug/contract.md`. Sections below repeat what agents need when skills are not loaded or this file is the only contract. **Project-only** rules (versioning, change files, protected paths, demo Refine policy) stay here and win over generic skill defaults.

## Decision ownership and delegation

- Keep one decision owner per task. Delegated work gathers bounded evidence or implements an independently owned surface; it does not make conflicting product or architecture decisions.
- Delegate only when the subtask is self-contained enough to name its scope, required evidence, expected output, and write authority.
- Run delegated work concurrently only when scopes do not depend on or modify the same files.
- Treat delegated reports as evidence, not authority. Verify implementation-sensitive claims against source before editing or reporting completion.

## Escalate before proceeding when

- the baseline is already red and the task is not clearly about fixing it
- requirements are ambiguous enough to produce materially different designs
- the change would break multiple dependent packages
- the change needs a new dependency, data migration, or irreversible deletion

Surface the escalation with a `[BLOCKED]` marker instead of proceeding silently or burying it in prose.

## Structured markers

Same markers as `~/.agents/klugzeug/contract.md`; repeated here for clients that load only this file.

- `[BLOCKED] <decision>`: needs explicit user confirmation before proceeding.
- `[VERIFY] <claim>: <reason>`: a claim not directly confirmed from source (e.g. browser-only runtime behavior). Flag it instead of asserting it.
- `[DEFERRED] <work>: <reason>`: valuable but out of scope for this pass.

User-requested output formats take precedence, except that a safety gate always uses `[BLOCKED]`.

## Validation

This section is the single owner of validation commands and workflow facts; each skill's Validation table only maps changed surfaces to these commands and never restates versioning or policy facts. Every code change finishes with the narrowest useful validation for the changed surface; each skill's Validation section says which. Report commands that could not run and their exact failure; never infer success from inspection alone.

### Build Scheduling

- Treat package and docs builds as final validation gates, not checks to repeat after each edit, component, or plan step. During implementation, use focused source-backed tests, lint/type checks, and source-backed browser previews.
- Plan one build per affected package after its implementation changes are complete, in dependency order. Batch checks that consume built output after that build. A successful build also satisfies the final build gate while its inputs remain unchanged; do not repeat it just because another plan step or skill lists it.
- Build earlier only when the next check actually consumes built artifacts and they are missing or stale, or when investigating build/output behavior. Before each build, state the artifact consumer and why an existing result cannot be reused. Never test changed source against stale dist and claim it validates the change.
- After a successful build, rebuild only if a relevant input changed (source, styles, generated inputs, exports, dependency artifacts, or build configuration). Test-only or docs-only edits do not invalidate a library build unless that build consumes them. Reuse unchanged dependency artifacts; do not rebuild the monorepo to validate one package.
- VitePress local development aliases workspace packages to source, so package edits do not require a rebuild for `docs:dev` preview. Keep required production builds (including Codex before the docs build) for the final gate; preview is not a substitute for production-output verification.

```bash
bun install                                          # fresh checkout: one workspace install (packages/*, demos/*, tooling)
bun x vitest run packages/<name>/src/__tests__/      # standard test path
bun run --filter @vielzeug/<name> lint
bun run --filter @vielzeug/<name> build
bun run validate:docs -- --package=<name>
bun run validate:readme -- --package=<name>
bun run validate:repl -- --package=<name>
bun run validate:sidebar -- --package=<name>   # sidebar links vs. pages on disk
bun run --filter @vielzeug/codex build && bun run docs:build   # docs changes (Codex bundles docs first)
bun run check:ai-data                                  # packages table and .agents/ cross-references
bun run check:change-files                             # pending change files under changes/ (CI PR gate)
```

Repository-wide: `bun run build`, `bun run test`, `bun run lint`, `bun run fix`. Run `bun run fix` for Biome formatting and import organization instead of hand-formatting. Run `bun run` with no arguments for the full script list; package-specific test behavior belongs in each package's `test` script.

## Toolchain and workflow facts

- Bun (`package.json#packageManager`, `bunfig.toml`, `bun.lock`): the package manager and script runner; the root `workspaces` glob over `packages/*` and `demos/*` is the only project registry. Node 22 (`.nvmrc` for CI, `.tool-versions` for asdf: keep both on the same major) stays the runtime for Vitest/jsdom, Vite/VitePress, and npm Trusted Publishing. Version application is CalVer lockstep trains via `scripts/release/`, see `RELEASE.md`. Vitest, Biome, VitePress.
- Versioning: CalVer lockstep trains: `YY.MM.N`, the same number for every package. See `RELEASE.md`.
- Worktrees: `bun run worktree:add <pkg>` only for packages with no `@vielzeug/*` dependency edge in either direction; the script checks live manifests.
- Change files: `bun scripts/change.mjs <name> <patch|minor|major> "<message>"` writes one file under `changes/@vielzeug/<name>/`; `bun run check:change-files` validates the tree. One package per call: never scan the working tree for pending change files. The type picks the changelog section only: it never affects the version.
- Conventional commits: `feat(courier): add retry logic`. A breaking change rides the next train like any other: describe it in the changelog entry and the package's `docs/<name>/migration.md`.
- AI metadata: edit `.agents/` sources directly, run `bun run gen:ai-data` when the package table must change, then `bun run check:ai-data`. Generated blocks are outputs, not editing surfaces.

## Repository layout

| Path                 | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `RELEASE.md`         | CalVer train versioning and release policy                  |
| `packages/<name>/`   | Independent published packages                              |
| `docs/<name>/`       | Package documentation and recipes (VitePress)               |
| `demos/`             | Integration demos                                           |
| `scripts/`           | Workspace, generation, validation, and release tooling      |
| `.agents/`           | Agent contract: conventions, task skills, shared references |
| `changes/`           | Pending change files (consumed by the release train)        |
| `.github/workflows/` | CI and publishing workflows                                 |

### `.agents/` contents

- `README.md`: index of what lives in-repo vs under `~/.agents/skills/`.
- `conventions.md`: engineering conventions: public API design, disposal, errors, tests, diagnostics, file layout.
- `skills/vielzeug`: a symlink to `packages/codex/skills/vielzeug`, the consumer skill codex ships (`codex skills install`): edit it there. For demo code changes that consume `@vielzeug/*`, load it alongside `build` as described in Start work. The workflow skills (`plan`, `build`, `test`, `review`, `docs`, `deliver`, `pipeline`, `onboard`) are klugzeug skills installed per machine, not stored here.
- `reference/packages.md`: generated package table; `docs-template.md`, `readme-template.md`, `security-checklist.md`: hand-curated, shared by skills.

Every `.agents/...` path mentioned anywhere in the repo must resolve; `bun run check:ai-data` fails on a dangling reference.

## Subtree AGENTS.md index

Subtrees carry their own `AGENTS.md` only when they have rules not covered here or in `.agents/conventions.md`; most packages intentionally have none.

- `packages/AGENTS.md`: source work for all `@vielzeug/*` libraries; indexes packages with extra local rules.
- `demos/AGENTS.md`: integration demos: private and never published, local source loop, and the demo-gap-is-a-package-gap rule.
- `docs/AGENTS.md`: VitePress documentation site and REPL.
- `scripts/AGENTS.md`: repo tooling and the shared `scripts/lib/` primitives.
- `.github/AGENTS.md`: CI/CD workflows and the release automation they call.
