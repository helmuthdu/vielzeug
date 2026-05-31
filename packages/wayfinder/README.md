---
description: Framework-agnostic client-side router with typed params, async data loading, middleware, leave guards, and View Transitions support.
package: wayfinder
category: routing
keywords: [router, client-side, middleware, guards, navigation, history, spa, typed-routes]
related: [ripple, ward, herald]
exports: [createRouter, createBrowserHistory, createMemoryHistory, redirectTo]
---

# @vielzeug/wayfinder

> Lightweight, type-safe client-side router with nested routes, data loading, middleware, and named navigation.

[![npm version](https://img.shields.io/npm/v/@vielzeug/wayfinder)](https://www.npmjs.com/package/@vielzeug/wayfinder) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/wayfinder` &nbsp;&nbsp; **Category:** Routing

**Key exports:** `createRouter`, `createBrowserHistory`, `createMemoryHistory`, `redirectTo`

**When to use:** Framework-agnostic client-side router with typed params, async data loading, middleware, leave guards, and View Transitions support.

**Related:** [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/ward](https://vielzeug.dev/ward/) · [@vielzeug/herald](https://vielzeug.dev/herald/)

</details>

`@vielzeug/wayfinder` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## What You Get

- Declarative route tables with nested names (`dashboard.settings`)
- Named and raw-path navigation through one `navigate()` API
- Route middleware, data loaders, and lazy route modules
- Global `beforeLeave` leave guards with optional route scoping
- `component` + `meta` + `data` payloads on matched branch state
- Per-match `status` for granular loading/streaming feedback in nested layouts
- Streaming data loaders via async generators
- Declarative `notFound` fallback route
- Browser and memory history drivers
- `redirectTo()` middleware helper
- SSR-compatible `match()` for data prefetching without side effects
- `waitFor(name)` for testing and lifecycle coordination

## Installation

```sh
pnpm add @vielzeug/wayfinder
npm install @vielzeug/wayfinder
yarn add @vielzeug/wayfinder
```

## Quick Start

```ts
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  routes: {
    home: { path: '/' },
    dashboard: {
      path: '/dashboard',
      children: {
        index: { index: true },
        settings: {
          path: 'settings',
          data: async () => fetchSettings(),
        },
      },
    },
  },
  notFound: {
    component: NotFoundPage,
  },
});

// React to state changes:
router.subscribe((state) => {
  const leaf = state.matches.at(-1);
  render(leaf?.component, leaf?.data);
});

await router.navigate({ name: 'dashboard.settings' });
```

## Documentation

- [Overview](https://vielzeug.dev/wayfinder/)
- [Usage Guide](https://vielzeug.dev/wayfinder/usage)
- [API Reference](https://vielzeug.dev/wayfinder/api)
- [Examples](https://vielzeug.dev/wayfinder/examples)
- [React Integration Example](https://vielzeug.dev/wayfinder/examples/react-integration)
- [Vue Integration Example](https://vielzeug.dev/wayfinder/examples/vue-integration)
- [Svelte Integration Example](https://vielzeug.dev/wayfinder/examples/svelte-integration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
