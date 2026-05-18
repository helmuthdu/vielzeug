---
description: Lightweight, type-safe client-side router with nested routes, data loading, middleware, and named navigation.
package: routeit
category: routing
keywords: [router, client-side, middleware, guards, navigation, history, spa, typed-routes]
related: [stateit, permit, eventit]
exports: [createRouter, createBrowserHistory]
---

# @vielzeug/routeit

> Lightweight, type-safe client-side router with nested routes, data loading, middleware, and named navigation.

[![npm version](https://img.shields.io/npm/v/@vielzeug/routeit)](https://www.npmjs.com/package/@vielzeug/routeit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/routeit` &nbsp;·&nbsp; **Category:** Routing

**Key exports:** `createRouter`, `createBrowserHistory`

**When to use:** Lightweight, type-safe client-side router with nested routes, data loading, middleware, and named navigation.

**Related:** [@vielzeug/stateit](https://vielzeug.dev/stateit/) · [@vielzeug/permit](https://vielzeug.dev/permit/) · [@vielzeug/eventit](https://vielzeug.dev/eventit/)

</details>

`@vielzeug/routeit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/routeit
npm install @vielzeug/routeit
yarn add @vielzeug/routeit
```

## Quick Start

```ts
import { createRouter } from '@vielzeug/routeit';

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

- [Overview](https://vielzeug.dev/routeit/)
- [Usage Guide](https://vielzeug.dev/routeit/usage)
- [API Reference](https://vielzeug.dev/routeit/api)
- [Examples](https://vielzeug.dev/routeit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
