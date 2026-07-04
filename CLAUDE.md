# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vielzeug** (German for "many tools") is a monorepo of **30 independent, zero-dependency, tree-shakeable TypeScript packages** published to npm. Each package targets ES2022 and ships both ESM and CJS formats.

For the full package catalogue and dependency graph see `.ai/rules/data/catalogue.md`. For toolchain details see `.ai/rules/process/workspace.md`. For engineering conventions see `.ai/rules/code/conventions.md`.

## Commands

### Root-level (monorepo-wide)

```bash
pnpm setup        # rush install — install all dependencies
pnpm build        # rush build — build all packages
pnpm test         # vitest — run all tests
pnpm lint         # eslint + stylelint
pnpm fix          # auto-fix JS (eslint --fix) and CSS (prettier + stylelint)
pnpm docs:dev     # VitePress dev server
pnpm docs:build   # build documentation
pnpm validate:repl                        # validate all REPL examples
pnpm validate:repl -- --package <name>    # validate one package's REPL examples
```

### Per-package

```bash
cd packages/<name>
pnpm build        # vite build (ESM + CJS) + tsc declarations
pnpm test         # vitest in watch mode
pnpm lint         # eslint src/
pnpm fix          # eslint --fix src/
```

### Running a single test file

```bash
cd packages/<name>
pnpm test src/__tests__/specific.test.ts
```

### Per-package test command overrides

Most packages use the standard test command. Packages with co-located tests require the filter form:

| Package  | Command                               |
| -------- | ------------------------------------- |
| `refine` | `pnpm --filter @vielzeug/refine test` |

Standard command (all other packages): `pnpm vitest run packages/<name>/src/__tests__/`

## Architecture

### Monorepo Structure

- **`packages/`** — 30 publishable npm packages, each self-contained with its own `package.json`, `vite.config.ts`, `tsconfig.json`, and `vitest.config.ts`
- **`docs/`** — VitePress documentation site with one sub-directory per package
- **`common/`** — Rush shared configs, git hooks, and scripts
- **`rush.json`** — defines all packages and the `vielzeug-packages` version policy
- **`pnpm-workspace.yaml`** — pnpm workspace glob `packages/*`

### Build System

Rush.js orchestrates parallel builds across packages. Vite runs in library mode with `preserveModules: true`, producing `dist/` with parallel ESM (`.js`) and CJS (`.cjs`) trees plus source maps. Type declarations are emitted via a separate `tsconfig.declarations.json`.

### Package Dependency Graph (notable edges)

Generated from `package.json` files — authoritative copy in `.ai/rules/data/catalogue.md`. Reproduced here for a quick reference:

```
clockwork → ripple
coins     → arsenal
courier   → arsenal
familiar  → arsenal
flux      → ripple
forge     → arsenal, ripple
ledger    → ripple
orbit     → arsenal, ripple
ore       → ripple
prism     → orbit, ripple
pulse     → ripple
refine    → arsenal, dnd, orbit, ore, ripple, tempo
scout     → ripple
scroll    → ripple
sourcerer → arsenal
spell     → arsenal
```

Fully independent (no `@vielzeug/*` deps): `arsenal`, `codex`, `conduit`, `dnd`, `herald`, `keymap`, `lingua`, `ripple`, `rune`, `sandbox`, `tempo`, `vault`, `ward`, `wayfinder`.

### Package Categories

| Category | Packages |
|---|---|
| State & Reactivity | `ripple` (signals/computed/effects), `ore` (web components + reactive state), `forge` (form state + validation), `clockwork` (finite state machines), `ledger` (undo/redo history) |
| HTTP & Storage | `courier` (HTTP client, caching, mutations), `vault` (IndexedDB + LocalStorage unified API) |
| UI Primitives | `refine` (accessible web components), `orbit` (tooltip/popover positioning), `prism` (charts), `dnd` (drag-and-drop), `scroll` (virtual list engine) |
| Routing & i18n | `wayfinder` (client-side router + middleware), `lingua` (i18n + pluralization) |
| Cross-cutting | `spell` (schema validation), `ward` (RBAC), `herald` (typed event bus), `rune` (structured logging), `conduit` (DI container), `arsenal` (utility functions), `familiar` (Web Worker pool), `tempo`, `sourcerer`, `scout` (fuzzy search), `keymap` (keyboard shortcuts), `codex` (AI/MCP server), `sandbox` (sandboxed iframe runtime) |
| Finance | `coins` (precise monetary arithmetic) |

### Standard Package Layout

```
packages/<name>/
├── src/
│   ├── __tests__/        # All test files
│   ├── [feature dirs]/
│   └── index.ts          # Public API surface
├── dist/                 # Build output (gitignored)
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.declarations.json
```

## Key Conventions

- **TypeScript strict mode** throughout; no `any`, no JS files in `src/`
- **Zero external dependencies** per package (inter-package deps are allowed). Documented exceptions: `refine` bundles `lucide` as a runtime dep; `refine` and `prism` use `axe-core` as a devDependency for accessibility testing (not bundled).
- **ESLint Perfectionist plugin** enforces sorted imports and object keys — run `pnpm fix` if linting fails on ordering
- **Prettier**: 120-char line width, 2-space indent, trailing commas
- **Commit style**: conventional commits, e.g. `feat(courier): add retry logic`
- **Pre-commit hook** (lefthook) runs lint + related tests on staged files automatically
- Node 22 required (see `.nvmrc`)
- **Dead-dep hygiene**: periodically audit each `package.json` against actual import usage. Dead `workspace:*` entries inflate the dependency graph — remove them.

## Versioning & Releases

Rush manages versioning via change files. After touching a publishable package:

```bash
rush change --bulk --message "<summary>" --bump-type <patch|minor|major>
```

Use `patch` for fixes, `minor` for new features, `major` for breaking changes. **Do not commit, push, or publish without explicit user approval.**

## Multi-Agent Worktrees

For packages with no `@vielzeug/*` dependency edge in either direction, git worktrees prevent race conditions when multiple agents work in parallel:

```bash
pnpm worktree:add <pkg>              # refuses if <pkg> has any @vielzeug dependency edge
pnpm worktree:add <pkg> -- --force   # override the refusal
pnpm worktree:list
pnpm worktree:remove <pkg>
```

Creates `.worktrees/<pkg>/` on a new `agent/<pkg>-<timestamp>` branch. Full details in `.ai/rules/process/workspace.md § Multi-agent worktrees`.

## Teardown / Disposal Convention

Every resource object requiring explicit teardown follows one of two protocols.

### Sync disposable (default)

```typescript
interface SomeHandle {
  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal; // on long-lived stateful objects only
  [Symbol.dispose](): void;
}
```

### Async disposable (only when teardown genuinely requires await — currently vault/IDB)

```typescript
interface AsyncHandle {
  dispose(): Promise<void>;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.asyncDispose](): Promise<void>;
}
```

**Rules:**
- `dispose()` is the canonical name — never `destroy()`, `disconnect()`, `close()`, or `cleanup()`.
- `readonly disposed: boolean` — always present on disposable objects.
- `readonly disposalSignal: AbortSignal` — include on long-lived stateful objects that consumers may tie their own cleanup to. Omit on short-lived per-operation objects.
- `[Symbol.dispose]` / `[Symbol.asyncDispose]` ordering is enforced automatically by ESLint. Run `pnpm fix` to auto-sort — do not manually reason about Symbol key ordering.
- Native platform APIs that return teardown functions (e.g. `autoUpdate() => () => void`) are **not** wrapped.

## Dev Logging Standard (`_dev.ts`)

Every package uses a two-layer logging model.

### Layer 1 — Internal validation (`src/_dev.ts`)

```typescript
// packages/<name>/src/_dev.ts
const isDev = !(globalThis as { __<NAME>_PROD__?: boolean }).__<NAME>_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/<name>] ${msg}`);
}

/** @internal */
export function error(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/<name>] ${msg}`, ...args);
}

/** @internal */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
```

**Rules:**
- `_dev.ts` is **never exported** from `index.ts`.
- `isDev` is always `const` (never `export const`).
- Gate via `__<PKG>_PROD__` global (set by bundler `define`). **Never use `import.meta.env.DEV`** — library packages are consumed outside Vite contexts.
- `_dev.ts` exports only the helpers the package actually uses. Do not add unused helpers.
- No bare `console.warn` / `console.error` in source — always go through `_dev.ts`.
- Tests that assert warning output: spy on `console.warn` / `console.error`, do NOT import `_dev` directly.
- Add `@security` to `warn`'s JSDoc only when messages may include user-supplied data (PII risk).

### Layer 2 — Consumer debug observability (`src/devtools.ts`)

Opt-in structured debug logging exported only from the `/devtools` sub-path. Uses `console.debug`. Tree-shaken in production. No environment gate needed — consumers choose to import it.

## Error Class Convention

```typescript
// packages/<name>/src/errors.ts

export class <Pkg>Error extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is <Pkg>Error {
    return err instanceof <Pkg>Error;
  }
}

export class <Pkg>FooError extends <Pkg>Error {}
```

**Rules:**
- One base class `<Pkg>Error extends Error` — all subtypes extend the base, never `Error` directly.
- Base always has `this.name = new.target.name` and `Object.setPrototypeOf(this, new.target.prototype)`.
- `static is()` only on the base class.
- Use `opts?: ErrorOptions` for cause chaining.
- **No `[@vielzeug/<name>]` prefix in error messages** — class name identifies origin.
- Error classes live in `errors.ts` only — never in `types.ts` or mixed into `_types.ts`.
- Base class constructor requires `message: string` — no default message. Every subtype must supply a meaningful message.

## File Layout & Naming

```
packages/<name>/src/
├── _dev.ts          ← always private (_-prefix = never re-exported from index.ts)
├── _<internal>.ts    ← private impl files (never re-exported)
├── errors.ts         ← public error types (exported from index.ts)
├── types.ts          ← public type definitions (exported from index.ts)
├── devtools.ts       ← optional Layer-2 debug logging, /devtools sub-path only
└── index.ts          ← sole public surface
```

`_` prefix means the file is **never re-exported** from `index.ts`.

## Reference Packages

When in doubt about structure, style, or test layout:
- **`spell`** — canonical standard shape: focused public API, centralised `src/__tests__/`, dedicated `errors.ts` and `types.ts`. **When creating a new package: copy `spell`'s structure, rename, and remove unneeded files.**
- **`arsenal`** — canonical tree-shakeable multi-helper: one function per file grouped by category folder, all re-exported from `index.ts`.

## Slash Commands (pkg-workflow)

This project has Claude Code slash commands for package development workflows. Stubs are in `.claude/commands/` — gitignored, generated from `.ai/workflows/manifest.json` via `pnpm gen:workflow-docs`; canonical workflow definitions are in `.ai/workflows/`:

| Command | Purpose |
|---------|---------|
| `/pkg-plan` | Architecture & DX analysis, converging on a ranked `plan.md` (~3 passes typical) |
| `/pkg-implement` | Implement items from `plan.md`, converging on green (~3 rounds typical) |
| `/pkg-review` | Three-lens code review (correctness, arch, types) — all 3 lenses always run |
| `/pkg-security` | Three-surface security audit — all 3 surfaces always run |
| `/pkg-tests` | Coverage gap analysis and test expansion |
| `/pkg-docs` | API sync, template compliance, codex rebuild |
| `/pkg-repl` | REPL example audit and update |

The orchestrator workflow (`/pkg-workflow`) runs all phases in sequence for a given package. Invoke via the Workflow tool:

```
Workflow({ name: 'pkg-workflow', args: { pkg: 'sandbox', mode: 'analyse' } })
```

Run artifacts live under the gitignored `.ai/workflows/runs/<pkg>/` (`plan.md`, `progress.md`, `review.md`, `security.md`) — ephemeral scratch state, not project history. See `.ai/workflows/runs/AGENTS.md`.
