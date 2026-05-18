# GitHub Copilot — Workspace Instructions

## Project

**Vielzeug** is monorepo of **20 independent, zero-dependency TypeScript packages** published under the `@vielzeug/` npm scope. Each package ships ESM + CJS (Vite library mode), targets ES2022, and has strict TypeScript throughout.

## Key conventions

- **Zero external dependencies** per package. Inter-package `workspace:*` deps are fine.
- **TypeScript strict mode** everywhere. No `any`, no JS files in `src/`.
- **`pnpm`** for package management, **Rush** for monorepo orchestration (`pnpm setup` = `rush install`).
- **ESLint Perfectionist** enforces sorted imports and object keys — run `pnpm fix` to auto-sort.
- **Prettier** at 120-char line width, 2-space indent, trailing commas.
- **Conventional commits**: `feat(fetchit): add retry logic`.
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
buildit  → craftit → stateit, floatit
deposit  → logit, toolkit
fetchit  → toolkit
permit   → logit
```

All other packages are fully independent.

## Package catalogue

| Package | Category | What it does |
|---|---|---|
| `@vielzeug/stateit` | State | Reactive signals, computed, effects, stores |
| `@vielzeug/craftit` | UI | Functional web-component authoring on top of stateit |
| `@vielzeug/buildit` | UI | Accessible, themeable web components built on craftit |
| `@vielzeug/formit` | Forms | Typed form state, validation, submission |
| `@vielzeug/validit` | Validation | Zero-dep schema validation (Zod-like) |
| `@vielzeug/fetchit` | HTTP | Typed HTTP client with caching and mutations |
| `@vielzeug/deposit` | Storage | IndexedDB + LocalStorage unified typed API |
| `@vielzeug/routeit` | Routing | Client-side router with middleware and guards |
| `@vielzeug/permit` | Auth | RBAC engine with wildcards and predicates |
| `@vielzeug/wireit` | DI | Typed dependency injection container |
| `@vielzeug/logit` | Logging | Structured scoped logger with remote transport |
| `@vielzeug/i18nit` | i18n | Typed i18n with pluralization and async loading |
| `@vielzeug/eventit` | Events | Typed event bus, pub/sub, async streams |
| `@vielzeug/workit` | Workers | Web Worker pool with tasks, timeouts, cancellation |
| `@vielzeug/dragit` | UI | Drag-and-drop — drop zones and sortable lists |
| `@vielzeug/floatit` | UI | Floating element positioning (tooltip, popover) |
| `@vielzeug/sourceit` | Data | Reactive data sources with pagination and search |
| `@vielzeug/timit` | Date/Time | Temporal-powered date utilities |
| `@vielzeug/toolkit` | Utilities | 75+ tree-shakeable array/object/string/async helpers |
| `@vielzeug/virtualit` | UI | Virtual list engine for large datasets |
| `@vielzeug/mcpit` | AI | MCP server exposing all Vielzeug docs to AI clients |

## AI integration

The `@vielzeug/mcpit` package is an MCP server you can connect to AI clients:

```sh
# build once
cd packages/mcpit && pnpm build

# stdio (Claude Desktop, Copilot Chat)
node packages/mcpit/dist/index.js

# HTTP (remote agents)
node packages/mcpit/dist/index.js --port 3100
```

Available MCP tools: `list-packages`, `search-packages`, `list-docs-pages`, `get-docs`, `get-package-api`, `get-ai-context`, `list-components`, `get-component`.

## Common patterns

```typescript
// Reactive state
import { signal, computed, effect } from '@vielzeug/stateit';

// Form with validation
import { createForm } from '@vielzeug/formit';
import { v } from '@vielzeug/validit';

// HTTP with caching
import { createApi, createQuery } from '@vielzeug/fetchit';

// Storage
import { createLocalStorage, table } from '@vielzeug/deposit';

// DI container
import { createContainer, createToken } from '@vielzeug/wireit';
```

