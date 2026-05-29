---
description: Framework-agnostic client-side router with typed params, async data loading, middleware, leave guards, and View Transitions support.
package: route
category: routing
keywords: [router, client-side, middleware, guards, navigation, history, spa, typed-routes]
related: [ripple, permit, relay]
exports: [createRouter, createBrowserHistory, createMemoryHistory, redirectTo]
---

# /route

> Lightweight, type-safe client-side router with nested routes, data loading, middleware, and named navigation.

[![npm version](https://img.shields.io/npm/v/@vielzeug/route)](https://www.npmjs.com/package/@vielzeug/route) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/route` &nbsp;·&nbsp; **Category:** Routing

**Key exports:** `createRouter`, `createBrowserHistory`, `createMemoryHistory`, `redirectTo`

**When to use:** Framework-agnostic client-side router with typed params, async data loading, middleware, leave guards, and View Transitions support.

**Related:** [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/permit](https://vielzeug.dev/permit/) · [@vielzeug/relay](https://vielzeug.dev/relay/)

</details>

`/route` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

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
pnpm add @vielzeug/route
npm install @vielzeug/route
yarn add @vielzeug/route
```

## Quick Start

```ts
import { createRouter } from '@vielzeug/route';

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

- [Overview](https://vielzeug.dev/route/)
- [Usage Guide](https://vielzeug.dev/route/usage)
- [API Reference](https://vielzeug.dev/route/api)
- [Examples](https://vielzeug.dev/route/examples)
- [React Integration Example](https://vielzeug.dev/route/examples/react-integration)
- [Vue Integration Example](https://vielzeug.dev/route/examples/vue-integration)
- [Svelte Integration Example](https://vielzeug.dev/route/examples/svelte-integration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
