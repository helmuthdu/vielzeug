<div align="center">
  <img src="docs/public/logo-main.svg" alt="Vielzeug Logo" width="200"/>

# Vielzeug

**22 independent, zero-dependency TypeScript packages for modern JavaScript**

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/org/vielzeug)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/helmuthdu/vielzeug/pulls)

[Documentation](https://vielzeug.dev/) • [Examples](https://vielzeug.dev/examples/) • [Contributing](#contributing)

</div>

## What is Vielzeug?

**Vielzeug** (German for "many tools") is a curated ecosystem of zero-dependency, tree-shakeable TypeScript packages. Each one solves a focused problem and ships as ESM + CJS with full type declarations.

- ✅ **Type-Safe** — built with TypeScript from the ground up, strict mode throughout
- ✅ **Zero Dependencies** — no external runtime deps; inter-package deps only
- ✅ **Framework Agnostic** — works with React, Vue, Svelte, Angular, or vanilla JS
- ✅ **Tree-Shakeable** — import only what you need, pay only for what you use
- ✅ **Well-Tested** — comprehensive vitest coverage on every package
- ✅ **Production Ready** — battle-tested in real-world applications

---

## 📦 Packages

### [@vielzeug/ripple](packages/ripple) – Reactive Signals

Fine-grained reactive state with signals, computed values, effects, and batch updates.

```bash
pnpm add @vielzeug/ripple
```

**Key Features:**
- Fine-grained signals with `computed()`, `effect()`, `batch()`, `watch()`, and `scope()`
- `store()` for reactive objects with deep update tracking
- Zero dependencies (7.0 KB min / 2.4 KB gz)

[📖 Documentation](https://vielzeug.dev/ripple/) • [Examples](https://vielzeug.dev/ripple/examples)

---

### [@vielzeug/craft](packages/craft) – Web Component Primitives

Lightweight, type-safe web component authoring with reactive state, typed props, and automatic rendering.

```bash
pnpm add @vielzeug/craft
```

**Key Features:**
- Reactive state management with automatic re-rendering
- Type-safe component definitions and prop helpers
- Shadow DOM with automatic styling and form-associated elements
- Event handling, lifecycle hooks, and helpers like `live`, `when`, `styleMap`, `until` (18 KB min / 5.0 KB gz)

[📖 Documentation](https://vielzeug.dev/craft/) • [Examples](https://vielzeug.dev/craft/examples)

---

### [@vielzeug/sigil](packages/sigil) – Accessible Web Components

Accessible, themeable web components built on top of `@vielzeug/craft`. Works with any framework or vanilla HTML.

```bash
pnpm add @vielzeug/sigil
```

**Key Features:**
- Drop-in accessible components — button, input, select, checkbox, accordion, tooltip, and more
- Framework agnostic — plain custom elements, no framework required
- Full theming via CSS custom properties
- Tree-shakeable per-component imports (`@vielzeug/sigil/button`, `@vielzeug/sigil/input`, …)

[📖 Documentation](https://vielzeug.dev/sigil/) • [Examples](https://vielzeug.dev/sigil/examples)

---

### [@vielzeug/clockwork](packages/clockwork) – Finite State Machines

Typed finite state machine interpreter with guards, async invokes, context signals, and persistence.

```bash
pnpm add @vielzeug/clockwork
```

**Key Features:**
- Fully typed states, events, and transitions
- Guard conditions, entry/exit actions, and action arrays
- Async `invoke` with `onDone`/`onError` callbacks
- Reactive `state` and `context` signals via `@vielzeug/ripple`
- Persistence adapters and transition tracing

[📖 Documentation](https://vielzeug.dev/clockwork/) • [Examples](https://vielzeug.dev/clockwork/examples)

---

### [@vielzeug/forge](packages/forge) – Form State Management

Effortless, type-safe form state and validation for modern web applications.

```bash
pnpm add @vielzeug/forge
```

**Key Features:**
- Type-safe form state with inferred types
- Field-level and form-level validation
- Reactive subscriptions
- Works with `@vielzeug/spell`, Zod, Valibot, or any Standard Schema library (7.2 KB min / 3.0 KB gz)

[📖 Documentation](https://vielzeug.dev/forge/) • [Examples](https://vielzeug.dev/forge/examples)

---

### [@vielzeug/spell](packages/spell) – Schema Validation

Lightweight, type-safe schema validation with async support and zero dependencies.

```bash
pnpm add @vielzeug/spell
```

**Key Features:**
- Fluent schema API — `s.object()`, `s.string()`, `s.number()`, `s.array()`, and more
- Precise input/output typing with `InferInput<T>` and `Infer<T>`
- Async validation, custom refinements, and transforms
- Comprehensive error handling with `errorsAt()` (14 KB min / 2.8 KB gz)

[📖 Documentation](https://vielzeug.dev/spell/) • [Examples](https://vielzeug.dev/spell/examples)

---

### [@vielzeug/courier](packages/courier) – HTTP Client

Modern, type-safe HTTP client with query caching, subscriptions, and standalone mutations.

```bash
pnpm add @vielzeug/courier
```

**Key Features:**
- Separate HTTP and Query clients for flexibility
- Smart caching with stale-while-revalidate and request deduplication
- Standalone mutations with cancellation, retry, and lifecycle callbacks
- Automatic retry with exponential backoff (10 KB min / 3.4 KB gz)

[📖 Documentation](https://vielzeug.dev/courier/) • [Examples](https://vielzeug.dev/courier/examples)

---

### [@vielzeug/vault](packages/vault) – Browser Storage

Powerful, type-safe browser storage with a unified API for IndexedDB and LocalStorage.

```bash
pnpm add @vielzeug/vault
```

**Key Features:**
- Unified API for IndexedDB, LocalStorage, SessionStorage, and in-memory stores
- Advanced querying and filtering with `table()`
- TTL (Time-To-Live) expiration and schema migrations (16 KB min / 4.5 KB gz)

[📖 Documentation](https://vielzeug.dev/vault/) • [Examples](https://vielzeug.dev/vault/examples)

---

### [@vielzeug/wayfinder](packages/wayfinder) – Client-Side Routing

Lightweight, type-safe client-side router with middleware and guards.

```bash
pnpm add @vielzeug/wayfinder
```

**Key Features:**
- Route parameters and query string parsing
- Middleware system for auth, logging, and redirects
- Hash and History mode with memory history for testing
- Nested routes and layouts (9.0 KB min / 3.1 KB gz)

[📖 Documentation](https://vielzeug.dev/wayfinder/) • [Examples](https://vielzeug.dev/wayfinder/examples)

---

### [@vielzeug/ward](packages/ward) – RBAC & Permissions

Flexible, type-safe role-based access control with wildcards and predicate rules.

```bash
pnpm add @vielzeug/ward
```

**Key Features:**
- Role-based access control (RBAC) with wildcard support
- Dynamic attribute-based rules (ABAC) with `owns()` helper
- Multi-action checks (`canAll`, `canAny`) and `allowedActions()` listing
- Explainable deny diagnostics, user-bound permits, and decision caching (5.9 KB min / 2.0 KB gz)

[📖 Documentation](https://vielzeug.dev/ward/) • [Examples](https://vielzeug.dev/ward/examples)

---

### [@vielzeug/conduit](packages/conduit) – Dependency Injection

Compact, type-safe DI container built around typed tokens and explicit scopes.

```bash
pnpm add @vielzeug/conduit
```

**Key Features:**
- Token-based typed dependency registration
- Async factory support and child containers
- Singleton, transient, and scoped lifetimes
- `using` disposal (8.0 KB min / 2.1 KB gz)

[📖 Documentation](https://vielzeug.dev/conduit/) • [Examples](https://vielzeug.dev/conduit/examples)

---

### [@vielzeug/rune](packages/rune) – Structured Logging

Structured, zero-dependency logging with scoped namespaces and non-blocking remote transport.

```bash
pnpm add @vielzeug/rune
```

**Key Features:**
- Log levels (`debug` → `error`) with priority-based filtering
- `scope(name)` and `child()` for isolated namespaced loggers
- Browser CSS badge styling — `symbol`, `icon`, or `text` variants
- Non-blocking remote handler (Sentry, Datadog, custom endpoint)
- `time/timeEnd`, `table`, `group`, `assert` backed by native console APIs (6.8 KB min / 2.7 KB gz)

[📖 Documentation](https://vielzeug.dev/rune/) • [Examples](https://vielzeug.dev/rune/examples)

---

### [@vielzeug/lingua](packages/lingua) – Internationalization

Lightweight, type-safe i18n with pluralization, interpolation, and async loading.

```bash
pnpm add @vielzeug/lingua
```

**Key Features:**
- Type-safe translation keys with autocomplete
- Pluralization rules and interpolation
- Async translation loading and lazy namespaces
- Framework agnostic (7.4 KB min / 1.6 KB gz)

[📖 Documentation](https://vielzeug.dev/lingua/) • [Examples](https://vielzeug.dev/lingua/examples)

---

### [@vielzeug/herald](packages/herald) – Typed Event Bus

Lightweight typed event bus with `on`, `once`, `emit`, `wait`, `waitAny`, and async streams.

```bash
pnpm add @vielzeug/herald
```

**Key Features:**
- Fully typed event maps — payload types inferred from the event key
- `once()` for single-fire subscriptions
- `onError` and `onDispatch` hooks for logging and error handling
- `dispose()` for clean teardown; `createTestBus()` helper for testing
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/herald/) • [Examples](https://vielzeug.dev/herald/examples)

---

### [@vielzeug/familiar](packages/familiar) – Web Worker Pool

Run CPU-intensive tasks off the main thread with a typed Web Worker pool and automatic fallback.

```bash
pnpm add @vielzeug/familiar
```

**Key Features:**
- `createWorker(fn)` — serialize a function and run it in a dedicated Web Worker
- `createWorker(fn, { size })` — concurrent worker pool with configurable size
- Timeout support and task cancellation via `AbortSignal`
- Graceful fallback to main-thread execution when Workers are unavailable
- `createTestWorker()` helper for unit testing without Worker infrastructure
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/familiar/) • [Examples](https://vielzeug.dev/familiar/examples)

---

### [@vielzeug/grip](packages/grip) – Drag and Drop

Framework-agnostic drag-and-drop helpers for file drop zones and sortable lists.

```bash
pnpm add @vielzeug/grip
```

**Key Features:**
- `createDropZone()` with MIME type, wildcard, and file extension filtering
- `onDropRejected` callback and counter-based hover state
- `createSortable()` for native sortable lists with `data-sort-id`
- Drag handles, dynamic list refresh, and `destroy()` / `using` cleanup
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/grip/) • [Examples](https://vielzeug.dev/grip/examples)

---

### [@vielzeug/orbit](packages/orbit) – Floating Positioning

Lightweight floating-element positioning for tooltips, dropdowns, popovers, and menus.

```bash
pnpm add @vielzeug/orbit
```

**Key Features:**
- `positionFloat()` to compute and apply `left` / `top` in one call
- `computePosition()` for low-level `{ x, y, placement }` control
- Middleware pipeline: `offset`, `flip`, `shift`, and `size`
- `autoUpdate()` for scroll, resize, and element-size updates
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/orbit/) • [Examples](https://vielzeug.dev/orbit/examples)

---

### [@vielzeug/sourcerer](packages/sourcerer) – Reactive Data Sources

Reactive local and remote data sources with pagination, filtering, sorting, and search.

```bash
pnpm add @vielzeug/sourcerer
```

**Key Features:**
- `createLocalSource()` and `createRemoteSource()` with a unified query API
- Reactive `items`, `total`, `loading`, and `error` signals
- Built-in fuzzy search, multi-field sorting, and pagination
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/sourcerer/) • [Examples](https://vielzeug.dev/sourcerer/examples)

---

### [@vielzeug/scroll](packages/scroll) – Virtual Lists

Framework-agnostic virtual list engine that renders only visible rows.

```bash
pnpm add @vielzeug/scroll
```

**Key Features:**
- Virtualized rendering with configurable overscan
- Fixed and measured variable-height rows
- Programmatic scrolling (`scrollToIndex`, `scrollToOffset`)
- Framework-agnostic callback API
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/scroll/) • [Examples](https://vielzeug.dev/scroll/examples)

---

### [@vielzeug/tempo](packages/tempo) – Date & Time

Temporal-powered date and time utilities for modern TypeScript apps.

```bash
pnpm add @vielzeug/tempo
```

**Key Features:**
- Built on the TC39 Temporal proposal
- Timezone-aware date arithmetic, formatting, and parsing
- Calendar system support and duration helpers
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/tempo/) • [Examples](https://vielzeug.dev/tempo/examples)

---

### [@vielzeug/arsenal](packages/arsenal) – Utility Library

75+ tree-shakeable helpers for arrays, objects, strings, async, math, and more.

```bash
pnpm add @vielzeug/arsenal
```

**Key Features:**
- 75+ utilities fully typed with TypeScript inference
- Selector-based and multi-field sorting with `sort()`
- Fuzzy search with `search()`, deep diff with `diff()`, deep merge, pruning, and more
- Tree-shakeable by design — 0.1–0.5 KB per utility, zero dependencies

[📖 Documentation](https://vielzeug.dev/arsenal/) • [Examples](https://vielzeug.dev/arsenal/examples)

---

### [@vielzeug/codex](packages/codex) – AI / MCP Server

MCP server exposing all Vielzeug documentation, package APIs, and component metadata to AI clients.

```bash
# Run without installing:
npx -y @vielzeug/codex

# Or add to your project:
pnpm add @vielzeug/codex
```

**Key Features:**
- Stdio and HTTP transport modes
- Tools: `list-packages`, `search-packages`, `get-docs`, `get-package-api`, `list-components`, `get-component`, and more
- Works with Claude Desktop, Copilot Chat, and any MCP-compatible client

[📖 Documentation](https://vielzeug.dev/codex/) • [Examples](https://vielzeug.dev/codex/examples)

---

## 🏁 Quick Start

Install individual packages as needed:

```bash
# Using pnpm (recommended)
pnpm add @vielzeug/forge @vielzeug/courier

# Using npm
npm install @vielzeug/forge @vielzeug/courier

# Using yarn
yarn add @vielzeug/forge @vielzeug/courier
```

### Example: Typed Form with API Integration

```typescript
import { createForm } from '@vielzeug/forge';
import { s, type Infer } from '@vielzeug/spell';
import { createApi, createMutation } from '@vielzeug/courier';
import { createLogger } from '@vielzeug/rune';

const log = createLogger('auth');

// Define and validate the shape
const LoginSchema = s.object({
  email: s.string().email(),
  password: s.string().min(8),
});
type LoginInput = Infer<typeof LoginSchema>;

// HTTP client
const api = createApi({ baseUrl: 'https://api.example.com' });

const loginMutation = createMutation(
  ({ input, signal }: { input: LoginInput; signal: AbortSignal }) =>
    api.post('/auth/login', { body: input, signal }).then((r) => r.json()),
);

// Form wired to the schema
const form = createForm<LoginInput>({
  defaultValues: { email: '', password: '' },
  schema: LoginSchema,
});

form.submit(async (values) => {
  try {
    const user = await loginMutation.mutate(values);
    log.info('Login successful', { user });
  } catch (error) {
    log.error('Login failed', error);
  }
});
```

---

## 🏗️ Development

### Prerequisites

- Node.js >= 22.0.0 (see `.nvmrc`)
- pnpm >= 10.0.0
- Rush (`npm install -g @microsoft/rush`)

### Setup

```bash
# Clone the repository
git clone https://github.com/helmuthdu/vielzeug.git
cd vielzeug

# Install all dependencies (via Rush)
pnpm setup

# Build all packages
pnpm build

# Run all tests
pnpm test

# Start documentation site
pnpm docs:dev
```

### Project Structure

```
vielzeug/
├── packages/
│   ├── ripple/        # Reactive signals and state
│   ├── craft/         # Web component primitives
│   ├── sigil/         # Accessible web components (built on craft)
│   ├── clockwork/     # Finite state machines
│   ├── forge/         # Form state management
│   ├── spell/         # Schema validation
│   ├── courier/       # HTTP client & query management
│   ├── vault/         # Browser storage (IndexedDB + LocalStorage)
│   ├── wayfinder/     # Client-side routing
│   ├── ward/          # RBAC & permission management
│   ├── conduit/       # Dependency injection
│   ├── rune/          # Structured logging
│   ├── lingua/        # Internationalization
│   ├── herald/        # Typed event bus
│   ├── familiar/      # Web Worker pool
│   ├── grip/          # Drag-and-drop utilities
│   ├── orbit/         # Floating element positioning
│   ├── sourcerer/     # Reactive data sources
│   ├── scroll/        # Virtual list engine
│   ├── tempo/         # Date & time utilities
│   ├── arsenal/       # 75+ utility functions
│   └── codex/         # AI / MCP server
├── docs/              # VitePress documentation
└── common/            # Shared Rush configuration
```

### Scripts

```bash
pnpm setup          # Rush install — install all dependencies
pnpm build          # Rush build — build all packages
pnpm test           # Run all tests (vitest)
pnpm lint           # Lint code (ESLint + Stylelint)
pnpm fix            # Auto-fix lint issues
pnpm docs:dev       # Start docs dev server (VitePress)
pnpm docs:build     # Build documentation
```

---

## 📊 Bundle Sizes

All sizes are **minified + gzipped** production builds:

| Package                  | Minified                   | Gzipped        | Dependencies |
| ------------------------ | -------------------------- | -------------- | ------------ |
| `@vielzeug/ripple`       | **7.0 KB**                 | **2.4 KB**     | 0            |
| `@vielzeug/craft`        | **18 KB**                  | **5.0 KB**     | 1\*          |
| `@vielzeug/sigil`        | —                          | —              | 3\*          |
| `@vielzeug/clockwork`    | —                          | —              | 1\*          |
| `@vielzeug/forge`        | **7.2 KB**                 | **3.0 KB**     | 0            |
| `@vielzeug/spell`        | **14 KB**                  | **2.8 KB**     | 0            |
| `@vielzeug/courier`      | **10 KB**                  | **3.4 KB**     | 1\*          |
| `@vielzeug/vault`        | **16 KB**                  | **4.5 KB**     | 0            |
| `@vielzeug/wayfinder`    | **9.0 KB**                 | **3.1 KB**     | 0            |
| `@vielzeug/ward`         | **5.9 KB**                 | **2.0 KB**     | 0            |
| `@vielzeug/conduit`      | **8.0 KB**                 | **2.1 KB**     | 0            |
| `@vielzeug/rune`         | **6.8 KB**                 | **2.7 KB**     | 0            |
| `@vielzeug/lingua`       | **7.4 KB**                 | **1.6 KB**     | 0            |
| `@vielzeug/herald`       | —                          | —              | 0            |
| `@vielzeug/familiar`     | —                          | —              | 0            |
| `@vielzeug/grip`         | —                          | —              | 0            |
| `@vielzeug/orbit`        | —                          | —              | 0            |
| `@vielzeug/sourcerer`    | —                          | —              | 1\*          |
| `@vielzeug/scroll`       | —                          | —              | 0            |
| `@vielzeug/tempo`        | —                          | —              | 0            |
| `@vielzeug/arsenal`      | **0.1–1.0 KB** per utility | **0.1–0.5 KB** | 0            |
| `@vielzeug/codex`        | —                          | —              | 0            |

\* Only depends on other `@vielzeug` packages. Packages marked — haven't published a final build size yet.

---

## 🌐 Browser & Runtime Support

- **Browsers**: All modern browsers (Chrome, Firefox, Safari, Edge — Baseline 2023+)
- **Node.js**: v22.0.0 or higher
- **TypeScript**: v6.0.0 or higher
- **Module formats**: ESM + CJS, with full `.d.ts` declarations

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: [Open an issue](https://github.com/helmuthdu/vielzeug/issues)
2. **Suggest Features**: [Start a discussion](https://github.com/helmuthdu/vielzeug/discussions)
3. **Submit PRs**: Fork, create a branch, and submit a pull request

### Contribution Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/my-feature`)
3. Commit using conventional commits (`git commit -m 'feat(arsenal): add lerp helper'`)
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a Pull Request

Please ensure:

- All tests pass (`pnpm test`)
- Code follows the style guide (`pnpm lint`)
- Documentation is updated if needed

---

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

Each package is individually licensed under the MIT License. See the `LICENSE` file in each package directory for details.

---

## 🔗 Links

- [Documentation](https://vielzeug.dev/)
- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [Discussions](https://github.com/helmuthdu/vielzeug/discussions)
- [NPM Organization](https://www.npmjs.com/org/vielzeug)

---

## 📝 FAQ

### Why Vielzeug instead of [other library]?

Vielzeug packages are designed to work together as a coherent system while remaining individually useful. The fantasy naming (`ripple`, `forge`, `spell`, `herald`…) reflects the same philosophy: each package is a distinct spell that, combined, gives you a complete grimoire.

### Can I use individual packages?

Yes — every package is independent. Install only what you need; there are no required peer dependencies outside the `@vielzeug` family.

### Is it production-ready?

Yes. All packages ship strict TypeScript, zero external dependencies, and comprehensive test suites.

### Where can I get help?

- 📖 [Documentation](https://vielzeug.dev/)
- 💬 [GitHub Discussions](https://github.com/helmuthdu/vielzeug/discussions)
- 🐛 [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

<div align="center">

**Made with ❤️ by [Helmuth Saatkamp](https://github.com/helmuthdu)**

[⬆ Back to Top](#vielzeug)

</div>
