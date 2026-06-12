# Vielzeug — Workspace Rules

## Project

**Vielzeug** is monorepo of **23 independent, zero-dependency TypeScript packages** published under the `@vielzeug/` npm scope. Each package ships ESM + CJS (Vite library mode), targets ES2022, and has strict TypeScript throughout.

## Key conventions

- **Zero external dependencies** per package. Inter-package `workspace:*` deps are fine.
- **TypeScript strict mode** everywhere. No `any`, no JS files in `src/`.
- **`pnpm`** for package management, **Rush** for monorepo orchestration (`pnpm setup` = `rush install`).
- **ESLint Perfectionist** enforces sorted imports and object keys — run `pnpm fix` to auto-sort.
- **Prettier** at 120-char line width, 2-space indent, trailing commas.
- **Conventional commits**: `feat(courier): add retry logic`.
- Tests live at `packages/<name>/src/__tests__/`. Run with `pnpm test` (vitest).

## Package layout

```
packages/<name>/
├── src/
│   ├── __tests__/     # vitest test files
│   └── index.ts       # public API — all exports defined here
├── dist/              # build output (gitignored)
├── package.json
└── vite.config.ts
```

## Package dependency graph

```
@vielzeug/sigil  → @vielzeug/craft → @vielzeug/ripple, @vielzeug/orbit
@vielzeug/sigil  → @vielzeug/arsenal, @vielzeug/grip, @vielzeug/scroll
@vielzeug/courier  → @vielzeug/arsenal
@vielzeug/sourcerer  → @vielzeug/arsenal
@vielzeug/clockwork  → @vielzeug/ripple
```

All other packages are fully independent.

## Package catalogue

| Package               | Category   | What it does                                                       |
|-----------------------| ---------- |--------------------------------------------------------------------|
| `@vielzeug/ripple`    | State      | Reactive signals, computed, effects, stores                        |
| `@vielzeug/craft`     | UI         | Functional web-component authoring on top of ripple                |
| `@vielzeug/sigil`     | UI         | Accessible, themeable web components built on craft                |
| `@vielzeug/forge`     | Forms      | Typed form state, validation, submission                           |
| `@vielzeug/spell`     | Validation | Zero-dep schema validation (Zod-like)                              |
| `@vielzeug/courier`   | HTTP       | Typed HTTP client with caching and mutations                       |
| `@vielzeug/vault`     | Storage    | IndexedDB + LocalStorage unified typed API                         |
| `@vielzeug/wayfinder` | Routing    | Client-side router with middleware and guards                      |
| `@vielzeug/ward`      | Auth       | RBAC engine with wildcards and predicates                          |
| `@vielzeug/conduit`   | DI         | Typed dependency injection container                               |
| `@vielzeug/rune`      | Logging    | Structured scoped logger with remote transport                     |
| `@vielzeug/lingua`    | i18n       | Typed i18n with pluralization and async loading                    |
| `@vielzeug/herald`    | Events     | Typed event bus, pub/sub, async streams                            |
| `@vielzeug/familiar`  | Workers    | Web Worker pool with tasks, timeouts, cancellation                 |
| `@vielzeug/grip`      | UI         | Drag-and-drop — drop zones and sortable lists                      |
| `@vielzeug/orbit`     | UI         | Floating element positioning (tooltip, popover)                    |
| `@vielzeug/prism`     | UI         | SVG Chart library                                                  |
| `@vielzeug/sourcerer` | Data       | Reactive data sources with pagination and search                   |
| `@vielzeug/tempo`     | Date/Time  | Temporal-powered date utilities                                    |
| `@vielzeug/arsenal`   | Utilities  | 75+ tree-shakeable array/object/string/async helpers               |
| `@vielzeug/scroll`    | UI         | Virtual list engine for large datasets                             |
| `@vielzeug/codex`     | AI         | MCP server exposing all Vielzeug docs to AI clients                |
| `@vielzeug/clockwork` | State      | Finite state machine interpreter with typed events                 |
| `@vielzeug/coins`     | Finance    | Currency formatting and exchange utilities for monetary arithmetic |

## AI integration

The `codex` package is an MCP server you can connect to AI clients:

```sh
# build once
cd packages/codex && pnpm build

# stdio (Claude Desktop, Copilot Chat)
node packages/codex/dist/index.js

# HTTP (remote agents)
node packages/codex/dist/index.js --port 3100
```

Available MCP tools: `list-packages`, `search-packages`, `list-docs-pages`, `get-docs`, `get-package-api`, `get-ai-context`, `list-components`, `get-component`.

## Dev logging standard

Every package follows a two-layer logging model. **Never mix the layers.**

### Layer 1 — Internal validation warnings (`src/_warn.ts`)

For API-misuse warnings that fire automatically in dev builds (bad config, mismatched types, missing attributes, etc.).

- Lives in a **private** `src/_warn.ts` — never exported from `index.ts` or `/devtools`.
- Gated by `isDev` (`import.meta.env.DEV` for Vite packages, `__<PKG>_PROD__` global for non-Vite).
- Prefix format: `[@vielzeug/<pkg>] <function>: <description>` — emits via `console.warn`.
- Add `@security` JSDoc if message text may include user-supplied data (PII risk).

```typescript
// packages/<name>/src/_warn.ts
const isDev = import.meta.env.DEV || !(globalThis as { __NAME_PROD__?: boolean }).__NAME_PROD__;

/** @internal @security Messages may include user data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/<name>] ${msg}`);
}
```

### Layer 2 — Consumer debug observability (`src/devtools.ts` or `src/devtools/index.ts`)

For opt-in structured debug logging consumers import explicitly. Tree-shaken in production.

- Exported **only** from the `/devtools` sub-path (e.g. `import { debugBus } from '@vielzeug/herald/devtools'`).
- Uses `console.debug` (not `console.warn`).
- Wraps the public API — does not duplicate internal logic.
- No environment gate needed (consumers choose to import it).

```typescript
// packages/<name>/src/devtools.ts
export function debugFoo(options?: FooOptions): Foo {
  return createFoo({ ...options, logger: console.debug });
}
```

### Rules

- **No bare `console.warn` in source** — always go through `warn()` from `_warn.ts`.
- **No `devWarn` / `devError` exported from `/devtools`** — internal helpers stay internal.
- **`_warn.ts` is never re-exported** from `index.ts`.
- Tests that assert warning output: spy on `console.warn`, do NOT import `_warn` directly.

## Common patterns

```typescript
// Reactive state
import { signal, computed, effect } from '@vielzeug/ripple';

// Form with validation
import { createForm } from '@vielzeug/forge';
import { s } from '@vielzeug/spell';

// HTTP with caching
import { createApi, createQuery } from '@vielzeug/courier';

// Storage
import { createLocalStorage, table } from '@vielzeug/vault';

// DI container
import { createContainer, createToken } from '@vielzeug/conduit';
```
