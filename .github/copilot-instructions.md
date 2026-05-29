# GitHub Copilot — Workspace Instructions

## Project

**Vielzeug** is monorepo of **20 independent, zero-dependency TypeScript packages** published under the `@vielzeug/` npm scope. Each package ships ESM + CJS (Vite library mode), targets ES2022, and has strict TypeScript throughout.

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
@vielzeug/block  → @vielzeug/craft → @vielzeug/ripple, @vielzeug/orbit
@vielzeug/courier  → @vielzeug/toolkit
@vielzeug/permit   → @vielzeug/rune
```

All other packages are fully independent.

## Package catalogue

| Package | Category | What it does |
|---|---|---|
| `@vielzeug/ripple` | State | Reactive signals, computed, effects, stores |
| `@vielzeug/craft` | UI | Functional web-component authoring on top of ripple |
| `@vielzeug/block` | UI | Accessible, themeable web components built on craft |
| `@vielzeug/forge` | Forms | Typed form state, validation, submission |
| `@vielzeug/sieve` | Validation | Zero-dep schema validation (Zod-like) |
| `@vielzeug/courier` | HTTP | Typed HTTP client with caching and mutations |
| `@vielzeug/deposit` | Storage | IndexedDB + LocalStorage unified typed API |
| `@vielzeug/route` | Routing | Client-side router with middleware and guards |
| `@vielzeug/permit` | Auth | RBAC engine with wildcards and predicates |
| `@vielzeug/wired` | DI | Typed dependency injection container |
| `@vielzeug/rune` | Logging | Structured scoped logger with remote transport |
| `@vielzeug/lingua` | i18n | Typed i18n with pluralization and async loading |
| `@vielzeug/relay` | Events | Typed event bus, pub/sub, async streams |
| `@vielzeug/worker` | Workers | Web Worker pool with tasks, timeouts, cancellation |
| `@vielzeug/grip` | UI | Drag-and-drop — drop zones and sortable lists |
| `@vielzeug/orbit` | UI | Floating element positioning (tooltip, popover) |
| `@vielzeug/sourcerer` | Data | Reactive data sources with pagination and search |
| `@vielzeug/tempo` | Date/Time | Temporal-powered date utilities |
| `@vielzeug/toolkit` | Utilities | 75+ tree-shakeable array/object/string/async helpers |
| `@vielzeug/scroll` | UI | Virtual list engine for large datasets |
| `@vielzeug/mcp` | AI | MCP server exposing all Vielzeug docs to AI clients |

## AI integration

The `/mcp` package is an MCP server you can connect to AI clients:

```sh
# build once
cd packages/mcp && pnpm build

# stdio (Claude Desktop, Copilot Chat)
node packages/mcp/dist/index.js

# HTTP (remote agents)
node packages/mcp/dist/index.js --port 3100
```

Available MCP tools: `list-packages`, `search-packages`, `list-docs-pages`, `get-docs`, `get-package-api`, `get-ai-context`, `list-components`, `get-component`.

## Common patterns

```typescript
// Reactive state
import { signal, computed, effect } from '@vielzeug/ripple';

// Form with validation
import { createForm } from '@vielzeug/forge';
import { s } from '@vielzeug/sieve';

// HTTP with caching
import { createApi, createQuery } from '@vielzeug/courier';

// Storage
import { createLocalStorage, table } from '@vielzeug/deposit';

// DI container
import { createContainer, createToken } from '@vielzeug/wired';
```
