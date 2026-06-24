# Vielzeug — Workspace Rules

## Project

**Vielzeug** is monorepo of **28 independent, zero-dependency TypeScript packages** published under the `@vielzeug/` npm scope. Each package ships ESM + CJS (Vite library mode), targets ES2022, and has strict TypeScript throughout.

## Key conventions

- **Zero external dependencies** per package. Inter-package `workspace:*` deps are fine. Documented exceptions:
  - `sigil` — bundles `lucide` as a runtime dependency (icons).
  - `sigil`, `prism` — use `axe-core` as a devDependency for accessibility testing. It is not bundled and does not appear in production output.
- **TypeScript strict mode** everywhere. No `any`, no JS files in `src/`.
- **`pnpm`** for package management, **Rush** for monorepo orchestration (`pnpm setup` = `rush install`).
- **ESLint Perfectionist** enforces sorted imports and object keys — run `pnpm fix` to auto-sort.
- **Prettier** at 120-char line width, 2-space indent, trailing commas.
- **Conventional commits**: `feat(courier): add retry logic`.
- **Dead-dep hygiene**: periodically audit each `package.json` `dependencies` and `devDependencies` against actual import usage. Dead `workspace:*` entries inflate the dependency graph and mislead the package catalogue — remove them and keep the dep graph above accurate.
- Tests live at `packages/<name>/src/__tests__/`. Run with `pnpm test` (vitest). Some packages co-locate tests next to source (e.g. `sigil`) — see their `AGENTS.md`.

## Versioning & releases

- Rush manages versioning via **change files**. After changing a publishable package, run `rush change` (non-interactive: `rush change --bulk --message "<summary>" --bump-type <patch|minor|major>`).
- Use `minor` for new features, `major` for breaking changes, `patch` for fixes.
- **Agents:** do not commit, push, or publish without explicit user approval — generating the change file is fine, committing it is not.

## Teardown / disposal convention

Every resource object that requires explicit teardown exposes **both**:

```typescript
dispose(): void;           // named method — always call this directly
[Symbol.dispose](): void;  // delegates to dispose() — enables `using` declarations
```

- **`dispose()`** is the canonical name. Never use `destroy()`, `disconnect()`, `close()`, or `cleanup()` for owned resource teardown.
- **`[Symbol.dispose]`** is always last in the object/interface (ESLint Perfectionist sorts symbol keys after named keys).
- Native platform APIs that return teardown functions (e.g. `autoUpdate() => () => void`) are **not** wrapped — leave them as plain functions.

## Dev logging standard

Every package follows a two-layer logging model. **Never mix the layers.**

### Layer 1 — Internal validation warnings (`src/_warn.ts`)

For API-misuse warnings that fire automatically in dev builds (bad config, mismatched types, missing attributes, etc.).

- Lives in a **private** `src/_warn.ts` — never exported from `index.ts` or `/devtools`.
- Gated by `isDev` via `__<PKG>_PROD__` global (set by bundler `define`). **Never use `import.meta.env.DEV`** — library packages are consumed outside Vite contexts.
- Prefix format: `[@vielzeug/<pkg>] <description>` — emits via `console.warn` (warnings) or `console.error` (errors).
- Add `@security` JSDoc if message text may include user-supplied data (PII risk).
- **No bare `console.warn` / `console.error` in source** — always go through `warn()` / `issue()` from `_warn.ts`.

```typescript
// packages/<name>/src/_warn.ts
const isDev = !(globalThis as { __<NAME>_PROD__?: boolean }).__<NAME>_PROD__;

/** @internal @security Messages may include user data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/<name>] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/<name>] ${msg}`, ...args);
}
```

### Layer 2 — Consumer debug observability (`src/devtools.ts` or `src/devtools/index.ts`)

For opt-in structured debug logging consumer import explicitly. Tree-shaken in production.

- Exported **only** from the `/devtools` sub-path (e.g. `import { debugBus } from '@vielzeug/herald/devtools'`).
- Uses `console.debug` (not `console.warn`).
- Wraps the public API — does not duplicate internal logic.
- No environment gate needed (consumers choose to import it).

### Rules

- **`_warn.ts` is never re-exported** from `index.ts`.
- Tests that assert warning output: spy on `console.warn` / `console.error`, do NOT import `_warn` directly.
- Expected message format in tests: `'[@vielzeug/<pkg>] <description>'`.

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

## Reference packages

When in doubt about structure, style, or test layout, imitate an existing exemplar rather than inventing a new pattern:

- **`spell`** — canonical "standard shape": a focused public API in `index.ts`, centralised `src/__tests__/`, dedicated `errors.ts` and `types.ts`. Good model for most packages.
- **`arsenal`** — canonical tree-shakeable multi-helper package: one function per file grouped by category folder (`array/`, `object/`, `string/`, …), all re-exported from `index.ts`.

## Package catalogue

| Package               | Category   | What it does                                                       |
| --------------------- | ---------- | ------------------------------------------------------------------ |
| `@vielzeug/arsenal`   | Utilities  | 75+ tree-shakeable array/object/string/async helpers               |
| `@vielzeug/clockwork` | State      | Finite state machine interpreter with typed events                 |
| `@vielzeug/codex`     | AI         | MCP server exposing all Vielzeug docs to AI clients                |
| `@vielzeug/coins`     | Finance    | Currency formatting and exchange utilities for monetary arithmetic |
| `@vielzeug/conduit`   | DI         | Typed dependency injection container                               |
| `@vielzeug/courier`   | HTTP       | Typed HTTP client with caching and mutations                       |
| `@vielzeug/craft`     | UI         | Functional web-component authoring on top of ripple                |
| `@vielzeug/dnd`       | UI         | Drag-and-drop — drop zones and sortable lists                      |
| `@vielzeug/familiar`  | Workers    | Web Worker pool with tasks, timeouts, cancellation                 |
| `@vielzeug/flux`      | Streams    | Composable stream primitives with hot/cold semantics and operators |
| `@vielzeug/forge`     | Forms      | Typed form state, validation, submission                           |
| `@vielzeug/herald`    | Events     | Typed event bus, pub/sub, async streams                            |
| `@vielzeug/keymap`    | Input      | Headless keyboard shortcut manager with chord sequences            |
| `@vielzeug/ledger`    | State      | Async undo/redo command history with Ripple reactive state         |
| `@vielzeug/lingua`    | i18n       | Typed i18n with pluralization and async loading                    |
| `@vielzeug/orbit`     | UI         | Floating element positioning (tooltip, popover)                    |
| `@vielzeug/prism`     | Charts     | Reactive SVG charting library — line, bar, area, pie, sparkline    |
| `@vielzeug/pulse`     | WebSockets | Typed WebSocket client with channels, rooms, presence, reconnect   |
| `@vielzeug/ripple`    | State      | Reactive signals, computed, effects, stores                        |
| `@vielzeug/rune`      | Logging    | Structured scoped logger with remote transport                     |
| `@vielzeug/scout`     | Utilities  | Trigram fuzzy-search index with highlighting and reactive layer    |
| `@vielzeug/scroll`    | UI         | Virtual list engine for large datasets                             |
| `@vielzeug/sandbox`   | AI         | Sandboxed iframe runtime with typed postMessage state bridge       |
| `@vielzeug/sigil`     | UI         | Accessible, themeable web components built on craft                |
| `@vielzeug/sourcerer` | Data       | Reactive data sources with pagination and search                   |
| `@vielzeug/spell`     | Validation | Zero-dep schema validation (Zod-like)                              |
| `@vielzeug/tempo`     | Date/Time  | Temporal-powered date utilities                                    |
| `@vielzeug/vault`     | Storage    | IndexedDB + LocalStorage unified typed API                         |
| `@vielzeug/ward`      | Auth       | RBAC engine with wildcards and predicates                          |
| `@vielzeug/wayfinder` | Routing    | Client-side router with middleware and guards                      |

## Package dependency graph

Inter-package `@vielzeug/*` runtime dependencies (verified against each `package.json`):

```
clockwork  → ripple
coins      → arsenal
courier    → arsenal
craft      → arsenal, orbit, ripple
familiar   → arsenal
flux       → ripple
forge      → arsenal, ripple
orbit      → arsenal, ripple
prism      → orbit, ripple
pulse      → ripple
ledger     → ripple
scout      → ripple
scroll     → ripple
sigil      → arsenal, craft, dnd, orbit, ripple, scroll, tempo
sourcerer  → arsenal, ripple
spell      → arsenal
```

Fully independent (no `@vielzeug/*` deps): `arsenal`, `codex`, `conduit`, `dnd`, `herald`, `keymap`, `lingua`, `ripple`, `rune`, `sandbox`, `tempo`, `vault`, `ward`, `wayfinder`.

> **Note:** `flux` also declares optional peer dependencies on `courier`, `herald`, and `pulse` for its ecosystem adapters.

## AI integration

The `codex` package is an MCP server you can connect to AI clients:

```sh
# build once
pnpm --filter @vielzeug/codex build

# stdio (Claude Desktop, Copilot Chat)
node packages/codex/dist/index.js

# HTTP (remote agents)
node packages/codex/dist/cli.js --port 3100
```

Available MCP tools: `list-packages`, `search-packages`, `get-docs`, `get-source`, `get-package`, `list-components`, `get-component`, `generate-template`, `get-tokens`, `validate-component-usage`, `get-sandbox-context`, `get-state-bridge-spec`, `generate-sandbox-document`, `list-directives`, `list-validators`, `get-type-signature`.

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
