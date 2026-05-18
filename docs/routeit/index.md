---
title: Routeit — Client-side router for TypeScript
description: Lightweight, type-safe client-side router with nested routes, data loading, middleware, and named navigation.
package: routeit
category: routing
keywords: [router, client-side, middleware, guards, navigation, history, spa, typed-routes]
related: [stateit, permit, eventit]
exports: [createRouter, createBrowserHistory]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="routeit" />

<img src="/logo-routeit.svg" alt="Routeit logo" width="156" class="logo-highlight"/>

# Routeit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/routeit` &nbsp;·&nbsp; **Category:** Routing

**Key exports:** `createRouter`, `createBrowserHistory`

**When to use:** Client-side routing with typed params, async data loading, middleware, guards, and View Transitions API support.

**Related:** [Stateit](/stateit/) · [Permit](/permit/) · [Eventit](/eventit/)

</details>

**Routeit** is a lightweight, framework-agnostic client-side router built around a declarative route table. Define routes once, then navigate, resolve, load route data, and build links by route name.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/routeit
```

```sh [npm]
npm install @vielzeug/routeit
```

```sh [yarn]
yarn add @vielzeug/routeit
```

:::

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

## Why Routeit?

Managing navigation by hand usually means duplicated path checks, manual `popstate` listeners, and scattered history writes. Routeit keeps the routing model in one place and makes route names the source of truth.

```ts
const routes = {
  home: { path: '/', handler: () => renderHome() },
  dashboard: {
    path: '/dashboard',
    children: {
      index: { index: true, handler: () => renderDashboardHome() },
      settings: { path: 'settings', handler: () => renderSettings() },
    },
  },
  notFound: { path: '*', handler: () => renderNotFound() },
};

const router = createRouter({ routes });
```

| Feature                       | Routeit                                       | page.js | Navigo  |
| ----------------------------- | --------------------------------------------- | ------- | ------- |
| Bundle size                   | <PackageInfo package="routeit" type="size" /> | ~1 kB   | ~5 kB   |
| History mode                  | ✅                                            | ✅      | ✅      |
| Memory history (SSR / tests)  | ✅                                            | ❌      | ❌      |
| Typed path params             | ✅                                            | ❌      | ❌      |
| Named navigation              | ✅                                            | ❌      | Partial |
| Middleware                    | ✅                                            | ✅      | ✅      |
| Data loaders with AbortSignal | ✅                                            | ❌      | ❌      |
| Lazy route loading            | ✅                                            | ❌      | ❌      |
| Declarative redirects         | ✅                                            | ❌      | ❌      |
| Search param validation       | ✅                                            | ❌      | ❌      |
| Error in state                | ✅                                            | ❌      | ❌      |
| History state in context      | ✅                                            | ❌      | ❌      |
| Leave guards                  | ✅                                            | ❌      | ❌      |
| Route prefetching             | ✅                                            | ❌      | ❌      |
| Scroll restoration            | ✅                                            | ❌      | ❌      |
| View Transition API           | ✅                                            | ❌      | ❌      |
| Zero dependencies             | ✅                                            | ✅      | ✅      |

## Features

- One declarative route table
- Nested routes with compound names like `dashboard.settings`
- Lazy-load route modules on first navigation
- Named-route-first navigation, URL building, and active-route detection
- Middleware for guards, analytics, and error boundaries
- Per-route `data()` loaders with abort signals
- Typed and coercible search params via `coerceSearch`
- Leave guards to block navigation from dirty forms
- Hover-prefetch via `router.preload()`
- Scroll restoration via the `scroll` option
- History entry state readable as `ctx.historyState`
- Errors from data loaders exposed on `router.state.error`
- Memory history for SSR and tests — no browser globals required
- Named-route-first `navigate()`, `url()`, and `isActive()`
- Route-scoped `data()` loaders for leaf and layout data
- Wildcard routes handle not-found cases
- Middleware handles guards, analytics, and error boundaries
- `navigate()` handles both named routes and raw path targets

### Feature Highlights

- **Nested routes** with `children` and `index`
- **Typed path params** with proper inference
- **Middleware** at global and route scope
- **Abortable route data** with `data()`
- **Metadata** exposed through `router.state.matches.at(-1)?.meta`
- **Immutable state snapshots** through `router.state`
- **Matched branch state** through `router.state.matches`
- **Base-path support** for app subdirectories
- **Same-URL deduplication** with optional `{ force: true }`
- **Resolve without navigation** via `router.resolve()`
- **Pluggable history drivers** with browser-history default
- **View transitions** when the browser supports them

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ❌      |
| SSR         | ❌      |
| Deno        | ❌      |

### Prerequisites

- Browser runtime with the History API
- Server rewrites for deep-link support in SPAs
- Route table defined before router startup

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Stateit](/stateit/)
- [Permit](/permit/)
- [Eventit](/eventit/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
