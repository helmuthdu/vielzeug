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
- Per-route `onLeave` guards and global `beforeLeave` leave guards
- `component` + `meta` payloads on matched branch state
- Browser and memory history drivers
- Guard helpers via `redirectTo()`
- SSR-compatible `match()` for data prefetching without side effects

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
    home: {
      path: '/',
      handler: () => renderHome(),
    },
    dashboard: {
      path: '/dashboard',
      children: {
        index: {
          index: true,
          handler: () => renderDashboardHome(),
        },
        settings: {
          path: 'settings',
          data: async () => fetchSettings(),
          handler: ({ data }) => renderSettings(data),
        },
      },
    },
    notFound: {
      path: '*',
      handler: () => renderNotFound(),
    },
  },
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
