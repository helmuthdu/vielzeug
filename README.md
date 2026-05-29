<div align="center">
  <img src="docs/public/logo-main.svg" alt="Vielzeug Logo" width="200"/>

# Vielzeug

**A collection of modern, type-safe utilities for JavaScript and TypeScript**

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/org/vielzeug)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/helmuthdu/vielzeug/pulls)

[Documentation](https://vielzeug.dev/) • [Examples](https://vielzeug.dev/examples/) • [Contributing](#contributing)

</div>

## What is Vielzeug?

**Vielzeug** (German for "many tools") is a comprehensive ecosystem of modern, type-safe utilities designed to simplify common development tasks. Each package is:

- ✅ **Type-Safe**: Built with TypeScript from the ground up
- ✅ **Zero Dependencies**: No external dependencies for maximum security and minimal bundle size
- ✅ **Framework Agnostic**: Works with React, Vue, Svelte, or vanilla JS
- ✅ **Tree-Shakeable**: Import only what you need
- ✅ **Well-Tested**: Comprehensive test coverage
- ✅ **Production Ready**: Battle-tested in real-world applications

## 📦 Packages

### [@vielzeug/block](packages/block) – Web Component Library

Accessible, customizable web components built on top of `/craft`. Works with React, Vue, Svelte, Angular, or vanilla HTML.

```bash
npm install /block
```

**Key Features:**

- Drop-in accessible components (button, input, select, checkbox, accordion, tooltip, and more)
- Framework agnostic — plain custom elements, no framework required
- Full theming via CSS custom properties
- Tree-shakeable per-component imports
- Built on `/craft`

[📖 Documentation](https://vielzeug.dev/block/) • [Examples](https://vielzeug.dev/block/examples)

---

### [@vielzeug/craft](packages/craft) – Web Components

Lightweight, type-safe web component creation library with reactive state, typed props, directives, and automatic rendering.

```bash
npm install /craft
```

**Key Features:**

- Reactive state management with automatic re-rendering
- Type-safe component definitions and prop helpers
- Shadow DOM with automatic styling
- Form-associated custom elements
- Event handling, lifecycle hooks, and helpers like `live`, `when`, `styleMap`, and `until` (5 KB gzipped)

[📖 Documentation](https://vielzeug.dev/craft/) • [Examples](https://vielzeug.dev/craft/examples)

---

### [@vielzeug/relay](packages/relay) – Typed Event Bus

Lightweight, zero-dependency typed event bus with `on`, `once`, `emit`, `wait`, and `waitAny`.

```bash
npm install /relay
```

**Key Features:**

- Fully type-safe event maps — payload types inferred from the event key
- `once()` for single-fire subscriptions
- unsubscribe handles from `on()`/`once()`, plus `removeAllListeners()` and `eventNames()` for listener management
- `onError` and `onDispatch` hooks for logging and error handling
- `dispose()` for clean teardown; `createTestBus()` helper for testing
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/relay/) • [Examples](https://vielzeug.dev/relay/examples)

### [@vielzeug/deposit](packages/deposit) – Browser Storage

Powerful, type-safe browser storage utility with unified API for IndexedDB and LocalStorage.

```bash
npm install @vielzeug/deposit
```

**Key Features:**

- Unified API for IndexedDB and LocalStorage
- Advanced querying and filtering
- Schema migrations with versioning
- TTL (Time-To-Live) support (4.5 KB gzipped)

[📖 Documentation](https://vielzeug.dev/deposit/) • [Examples](https://vielzeug.dev/deposit/examples)

---

### [@vielzeug/grip](packages/grip) – Drag-and-Drop Primitives

Framework-agnostic drag-and-drop helpers for file drop zones and sortable lists.

```bash
npm install /grip
```

**Key Features:**

- `createDropZone()` with accept filtering for MIME types, wildcards, and file extensions
- `onDropRejected` callback for invalid files and counter-based hover state
- `createSortable()` for native sortable lists with `data-sort-id`
- Drag handles, dynamic list refresh, and cleanup via `destroy()` / `using`
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/grip/) • [Examples](https://vielzeug.dev/grip/examples)

---

### [@vielzeug/courier](packages/courier) – HTTP Client & Query Management

Modern, type-safe HTTP client with query caching, subscriptions, and standalone mutations.

```bash
npm install /courier
```

**Key Features:**

- Separate HTTP and Query clients for flexibility
- Smart caching with stale-while-revalidate
- Request deduplication
- Conditional fetching, subscription selectors, and background revalidation
- Standalone mutations with cancellation, retry, and lifecycle callbacks
- Automatic retry with exponential backoff (3.4 KB gzipped)

[📖 Documentation](https://vielzeug.dev/courier/) • [Examples](https://vielzeug.dev/courier/examples)

---

### [@vielzeug/orbit](packages/orbit) – Floating Positioning

Lightweight floating-element positioning for tooltips, dropdowns, popovers, and menus.

```bash
npm install /orbit
```

**Key Features:**

- `positionFloat()` to compute and apply `left` / `top` in one call
- `computePosition()` for low-level `{ x, y, placement }` control
- Middleware pipeline: `offset`, `flip`, `shift`, and `size`
- `autoUpdate()` for scroll, resize, and element-size updates
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/orbit/) • [Examples](https://vielzeug.dev/orbit/examples)

---

### [@vielzeug/forge](packages/forge) – Form State Management

Effortless, type-safe form state and validation for modern web applications.

```bash
npm install /forge
```

**Key Features:**

- Type-safe form state with inferred types
- Field-level and form-level validation
- Reactive subscriptions
- Framework agnostic (3 KB gzipped)

[📖 Documentation](https://vielzeug.dev/forge/) • [Examples](https://vielzeug.dev/forge/examples)

---

### [@vielzeug/lingua](packages/lingua) – Internationalization

Lightweight, type-safe internationalization with pluralization and async loading.

```bash
npm install /lingua
```

**Key Features:**

- Type-safe translations with autocomplete
- Pluralization and interpolation support
- Async translation loading
- Framework agnostic with React hooks (1.6 KB gzipped)

[📖 Documentation](https://vielzeug.dev/lingua/) • [Examples](https://vielzeug.dev/lingua/examples)

---

### [@vielzeug/rune](packages/rune) – Logging Utility

Structured, zero-dependency logging with log levels, scoped namespaces, styled output, and non-blocking remote transport. Works in browser and Node.js.

```bash
npm install /rune
```

**Key Features:**

- Log levels (`debug` → `error`) with priority-based filtering
- `scope(name)` and `child(overrides?)` for isolated namespaced loggers
- `enabled(type)` to guard expensive argument construction
- Browser CSS badge styling — `symbol`, `icon`, or `text` variants
- Non-blocking remote handler (Sentry, Datadog, custom endpoint)
- `time/timeEnd`, `table`, `group/groupCollapsed`, `assert` backed by native console APIs
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/rune/) • [Examples](https://vielzeug.dev/rune/examples)

---

### [@vielzeug/permit](packages/permit) – Permission Management

Flexible, type-safe permission and role management utility.

```bash
npm install @vielzeug/permit
```

**Key Features:**

- Role-based access control (RBAC)
- Dynamic rules with context and user attributes (ABAC)
- Multi-action checks (`canAll`, `canAny`) and action filtering (`allowedActions`)
- Explainable deny diagnostics (`no-matching-rule`, `explicit-deny`)
- User-bound permit API with optional decision caching
- Wildcard support and ownership helper (`owns`)
- Type-safe permission checks (2.0 KB gzipped)

[📖 Documentation](https://vielzeug.dev/permit/) • [Examples](https://vielzeug.dev/permit/examples)

---

### [@vielzeug/route](packages/route) – Client-Side Routing

Lightweight, type-safe client-side routing for SPAs.

```bash
npm install /route
```

**Key Features:**

- Route parameters and query string parsing
- Middleware system for auth and logging
- Hash and History mode support
- Nested routes and layouts (3.1 KB gzipped)

[📖 Documentation](https://vielzeug.dev/route/) • [Examples](https://vielzeug.dev/route/examples)

---

### [@vielzeug/ripple](packages/ripple) – Reactive State

Fine-grained reactive state with signals, computed values, effects, and batch updates.

```bash
npm install /ripple
```

**Key Features:**

- Fine-grained signals with `computed()`, `effect()`, `batch()`, `watch()`, and `scope()`
- `store()` for reactive objects with deep update tracking; stores are branded signals and work anywhere `ReadonlySignal<T>` is accepted
- Zero dependencies

- [📖 Documentation](https://vielzeug.dev/ripple/) • [Examples](https://vielzeug.dev/ripple/examples)

---

### [@vielzeug/toolkit](packages/toolkit) – Utility Library


Comprehensive, type-safe utility library with 75+ helpers for modern JavaScript.

```bash
npm install @vielzeug/toolkit
```

**Key Features:**

- 75+ utilities for arrays, objects, strings, dates, and more
- Full TypeScript support with inference
- Selector-based and multi-field sorting support (`sort`)
- Tree-shakeable by design (0.1-0.5 KB per utility)
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/toolkit/) • [Examples](https://vielzeug.dev/toolkit/examples)

---

### [@vielzeug/sieve](packages/sieve) – Schema Validation

Lightweight, type-safe schema validation with async support and zero dependencies.

```bash
npm install /sieve
```

**Key Features:**

- Type-safe schema definitions with inference
- Async validation support
- Custom refinements and transforms
- Comprehensive error handling (2.8 KB gzipped)

[📖 Documentation](https://vielzeug.dev/sieve/) • [Examples](https://vielzeug.dev/sieve/examples)

---

### [@vielzeug/scroll](packages/scroll) – Virtual Lists

Framework-agnostic virtual list engine that renders only visible rows with efficient scrolling and measurement.

```bash
npm install /scroll
```

**Key Features:**

- Virtualized rendering with configurable overscan
- Fixed and measured variable-height rows
- Programmatic scrolling (`scrollToIndex`, `scrollToOffset`)
- Framework-agnostic callback API
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/scroll/) • [Examples](https://vielzeug.dev/scroll/examples)

---

### [@vielzeug/wired](packages/wired) – Dependency Injection

Type-safe dependency injection container with async support and scoped lifetimes.

```bash
npm install /wired
```

**Key Features:**

- Type-safe container with token-based dependencies
- Async factory support
- Scoped lifetimes (singleton, transient, scoped)
- Testing helpers (2.1 KB gzipped)

[📖 Documentation](https://vielzeug.dev/wired/) • [Examples](https://vielzeug.dev/wired/examples)

### [@vielzeug/worker](packages/worker) – Web Worker Pool

Run CPU-intensive tasks off the main thread with a typed Web Worker pool and automatic fallback.

```bash
npm install /worker
```

**Key Features:**

- `createWorker(fn)` — serialize a function and run it in a dedicated Web Worker
- `createWorker(fn, { size })` — concurrent worker pool with configurable size
- Timeout support and queued-task cancellation via `AbortSignal`
- Graceful fallback to main-thread execution when Workers are unavailable
- `createTestWorker()` helper for unit testing without Worker infrastructure
- Zero dependencies

[📖 Documentation](https://vielzeug.dev/worker/) • [Examples](https://vielzeug.dev/worker/examples)

## 🏁 Quick Start

### Installation

Install individual packages as needed:

```bash
# Using pnpm (recommended)
pnpm add /forge /courier

# Using npm
npm install /forge /courier

# Using yarn
yarn add /forge /courier
```

### Example: Complete Form with API Integration

```tsx
import { createForm } from '/forge';
import { createApi, createMutation } from '/courier';
import { Rune } from '/rune';

// Setup API client
const api = createApi({
  baseUrl: 'https://api.example.com',
});

// Create mutation for login
const loginMutation = createMutation(
  ({ input, signal }: { input: { email: string; password: string }; signal: AbortSignal }) =>
    api.post('/auth/login', { body: input, signal }).then((r) => r.json()),
);

// Create form with validation
const form = createForm({
  defaultValues: { email: '', password: '' },
  validators: {
    email: (value) => {
      if (!value.includes('@')) return 'Invalid email';
    },
    password: (value) => {
      if (value.length < 8) return 'Password too short';
    },
  },
});

// Submit
form.submit(async (values) => {
  try {
    const user = await loginMutation.mutate(values);
    Rune.success('Login successful!', user);
  } catch (error) {
    Rune.error('Login failed:', error);
  }
});
```

## 🏗️ Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Setup

```bash
# Clone the repository
git clone https://github.com/helmuthdu/vielzeug.git
cd vielzeug

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start documentation site
pnpm docs:dev
```

### Project Structure

```
vielzeug/
├── packages/
│   ├── block/       # Web component library (built on craft)
│   ├── craft/       # Web component primitives
│   ├── deposit/       # Browser storage (IndexedDB + LocalStorage)
│   ├── grip/        # Drag-and-drop utilities
│   ├── relay/       # Typed event bus
│   ├── courier/       # HTTP client & query management
│   ├── orbit/       # Floating UI positioning utilities
│   ├── forge/        # Form state management
│   ├── lingua/        # Internationalization
│   ├── rune/         # Structured logging
│   ├── permit/        # Permission & RBAC management
│   ├── route/       # Client-side routing
│   ├── ripple/       # Reactive state (signals)
│   ├── toolkit/       # Utility functions
│   ├── sieve/       # Schema validation
│   ├── scroll/     # Virtual list engine
│   ├── wired/        # Dependency injection
│   └── worker/        # Web Worker pool
├── docs/              # VitePress documentation
└── common/            # Shared configuration
```

### Scripts

```bash
pnpm build          # Build all packages
pnpm test           # Run tests
pnpm lint           # Lint code
pnpm fix            # Fix linting issues
pnpm docs:dev       # Start docs dev server
pnpm docs:build     # Build documentation
```

## 📊 Bundle Sizes

All sizes are measured as **minified + gzipped** production builds:

| Package           | Minified Size              | Gzipped Size  | Dependencies |
| ----------------- | -------------------------- | ------------- | ------------ |
| /block | —                          | —             | 1\*          |
| /craft | **18 KB**                  | **5.0 KB**    | 0            |
| @vielzeug/deposit | **16 KB**                  | **4.5 KB**    | 2\*          |
| /relay | —                          | —             | 0            |
| /courier | **10 KB**                  | **3.4 KB**    | 1\*          |
| /forge  | **7.2 KB**                 | **3.0 KB**    | 0            |
| /lingua  | **7.4 KB**                 | **1.6 KB**    | 0            |
| /rune   | **6.8 KB**                 | **2.7 KB**    | 0            |
| @vielzeug/permit  | **5.9 KB**                 | **2.0 KB**    | 1\*          |
| /route | **9.0 KB**                 | **3.1 KB**    | 0            |
| /ripple | **7.0 KB**                 | **2.4 KB**    | 0            |
| @vielzeug/toolkit | **0.1-1.0 KB** per utility | **0.1-0.5 KB**| 0-1\*        |
| /sieve | **14 KB**                  | **2.8 KB**    | 0            |
| /wired  | **8.0 KB**                 | **2.1 KB**    | 0            |
| /worker  | —                          | —             | 0            |

\* Only depends on other @vielzeug packages (deposit depends on /rune and @vielzeug/toolkit; courier depends on @vielzeug/toolkit; permit depends on /rune; block depends on /craft; toolkit utilities may depend on other toolkit utilities). Packages marked — haven't published a final build size yet.

## 🌐 Browser & Node.js Support

- **Browsers**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Node.js**: v18.0.0 or higher
- **TypeScript**: v5.0.0 or higher

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: [Open an issue](https://github.com/helmuthdu/vielzeug/issues)
2. **Suggest Features**: [Start a discussion](https://github.com/helmuthdu/vielzeug/discussions)
3. **Submit PRs**: Fork, create a branch, and submit a pull request

### Contribution Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:

- All tests pass (`pnpm test`)
- Code follows the style guide (`pnpm lint`)
- Documentation is updated if needed

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

Each package is individually licensed under the MIT License. See the LICENSE file in each package directory for details.

## 🔗 Links

- [Documentation](https://vielzeug.dev/)
- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [Discussions](https://github.com/helmuthdu/vielzeug/discussions)
- [NPM Organization](https://www.npmjs.com/org/vielzeug)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/CHANGELOG.md)

## ⭐ Show Your Support

If you find Vielzeug useful, please consider:

- Giving the project a ⭐ on [GitHub](https://github.com/helmuthdu/vielzeug)
- Sharing it with your colleagues and friends
- Contributing to the project
- Reporting bugs or suggesting features

## 📝 Frequently Asked Questions

### Why Vielzeug instead of [other library]?

Vielzeug focuses on:

- **Type Safety**: First-class TypeScript support, not an afterthought
- **Zero Dependencies**: Maximum security and minimal bundle size
- **Framework Agnostic**: Works everywhere JavaScript runs
- **Modern APIs**: Built for modern development workflows

### Can I use individual packages?

Absolutely! Each package is independent and can be used standalone. Install only what you need.

### Is it production-ready?

Yes! All packages are battle-tested in production applications with comprehensive test coverage.

### Where can I get help?

- 📖 [Documentation](https://vielzeug.dev/)
- 💬 [GitHub Discussions](https://github.com/helmuthdu/vielzeug/discussions)
- 🐛 [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

<div align="center">

**Made with ❤️ by [Helmuth Saatkamp](https://github.com/helmuthdu)**

[⬆ Back to Top](#vielzeug)

</div>
