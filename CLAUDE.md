# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vielzeug** (German for "many tools") is a monorepo of 23 independent, zero-dependency, tree-shakeable TypeScript utility packages published to npm. Each package targets ES2022 and ships both ESM and CJS formats.

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

## Architecture

### Monorepo Structure

- **`packages/`** — 22 publishable npm packages, each self-contained with its own `package.json`, `vite.config.ts`, `tsconfig.json`, and `vitest.config.ts`
- **`docs/`** — VitePress documentation site with one sub-directory per package
- **`common/`** — Rush shared configs, git hooks, and scripts
- **`rush.json`** — defines all packages and the `vielzeug-packages` version policy
- **`pnpm-workspace.yaml`** — pnpm workspace glob `packages/*`

### Build System

Rush.js orchestrates parallel builds across packages. Vite runs in library mode with `preserveModules: true`, producing `dist/` with parallel ESM (`.js`) and CJS (`.cjs`) trees plus source maps. Type declarations are emitted via a separate `tsconfig.declarations.json`.

### Package Dependency Graph (notable edges)

```
sigil    → craft → ripple, orbit
sigil    → arsenal, grip, scroll
courier  → arsenal
sourcerer → arsenal
clockwork → ripple
```

All other packages are fully independent.

### Package Categories

| Category | Packages                                                                                                                                                                                                                                  |
|---|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| State & Reactivity | `ripple` (signals/computed/effects), `craft` (web components + reactive state), `forge` (form state + validation), `clockwork` (finite state machines)                                                                                    |
| HTTP & Storage | `courier` (HTTP client, caching, mutations), `vault` (IndexedDB + LocalStorage unified API)                                                                                                                                               |
| UI Primitives | `sigil` (accessible web components), `orbit` (tooltip/popover positioning), `grip` (drag-and-drop), `scroll` (virtual list engine)                                                                                         |
| Routing & i18n | `wayfinder` (client-side router + middleware), `lingua` (i18n + pluralization)                                                                                                                                                            |
| Cross-cutting | `spell` (schema validation), `ward` (RBAC), `herald` (typed event bus), `rune` (structured logging), `conduit` (DI container), `arsenal` (utility functions), `familiar` (Web Worker pool), `tempo`, `sourcerer`, `codex` (AI/MCP server) |
| Finance | `coins` (precise monetary arithmetic)                                                                                                                                                                                                     |

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

- **TypeScript strict mode** throughout; no JS files in `src/`
- **Zero external dependencies** per package (inter-package deps are allowed)
- **ESLint Perfectionist plugin** enforces sorted imports and object keys — run `pnpm fix` if linting fails on ordering
- **Prettier**: 120-char line width, 2-space indent, trailing commas
- **Commit style**: conventional commits, e.g. `feat(courier): add retry logic`
- **Pre-commit hook** (lefthook) runs lint + related tests on staged files automatically
- Node 22 required (see `.nvmrc`)
