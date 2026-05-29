---
title: Route — Client-side router for TypeScript
description: Framework-agnostic client-side router with typed params, async data loading, middleware, leave guards, and View Transitions support.
package: route
category: routing
keywords: [router, client-side, middleware, guards, navigation, history, spa, typed-routes]
related: [ripple, permit, relay]
exports: [createRouter, createBrowserHistory, createMemoryHistory, redirectTo]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="route" />

<img src="/logo-route.svg" alt="Route logo" width="156" class="logo-highlight"/>

# Route

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/route` &nbsp;·&nbsp; **Category:** Routing

**Key exports:** `createRouter`, `createBrowserHistory`, `createMemoryHistory`, `redirectTo`

**When to use:** Framework-agnostic client-side router with typed params, async data loading, middleware, leave guards, and View Transitions support.

**Related:** [Ripple](/ripple/) · [Permit](/permit/) · [Relay](/relay/)

</details>

**Route** is a lightweight, framework-agnostic client-side router built around a declarative route table. Define routes once, then navigate, resolve, load route data, and build links by route name.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/route
```

```sh [npm]
npm install @vielzeug/route
```

```sh [yarn]
yarn add @vielzeug/route
```

:::

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

## Why Route?

Managing navigation by hand means scattered `popstate` listeners, duplicated path checks, and no shared abstraction for loading data or blocking navigation. Route moves all of that into one declarative table.

```ts
// Before — manual navigation with popstate
window.addEventListener('popstate', () => {
  const path = window.location.pathname;
  if (path === '/') renderHome();
  else if (path.startsWith('/dashboard')) renderDashboard();
  else renderNotFound();
});
document.querySelectorAll('a[data-route]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState({}, '', (e.currentTarget as HTMLAnchorElement).href);
    dispatchEvent(new PopStateEvent('popstate'));
  });
});

// After — with Route
import { createRouter } from '@vielzeug/route';

const router = createRouter({
  routes: {
    home: { path: '/', handler: () => renderHome() },
    dashboard: { path: '/dashboard', handler: () => renderDashboard() },
    notFound: { path: '*', handler: () => renderNotFound() },
  },
});
```

**Use Route when** you need named navigation, route-level data loading with cancellation, middleware, or leave guards in a framework-agnostic setup.

**Consider a framework's built-in router when** you are deep in a single framework ecosystem (React Router, Vue Router) and want first-class component binding with no adapter layer.

| Feature                       | Route                                       | page.js | Navigo  |
| ----------------------------- | --------------------------------------------- | ------- | ------- |
| Bundle size                   | <PackageInfo package="route" type="size" /> | ~1 kB   | ~5 kB   |
| History mode                  | ✅                                            | ✅      | ✅      |
| Memory history (tests / non-browser) | ✅                                            | ❌      | ❌      |
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

- One declarative route table with nested names (`dashboard.settings`)
- Named and raw-path navigation through one `navigate()` API
- Lazy-load route modules on first navigation
- Middleware for guards, analytics, and error boundaries
- Per-route `data()` loaders with `AbortSignal` cancellation
- Per-route `onLeave` guards and global `beforeLeave` leave guards
- Typed and coercible search params via `coerceSearch`
- Hover-prefetch via `router.preload()`
- Branch resolve without navigation via `router.resolve()`
- SSR data prefetch via `router.match(url, signal?)`
- Scroll restoration via the `scroll` option
- History entry state readable as `ctx.historyState`
- Errors from data loaders exposed on `router.getSnapshot().error`
- Memory history for tests and non-browser environments
- Wildcard routes for not-found and catch-all cases
- Base-path support for app subdirectories
- View Transition API with per-navigation override

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅ (via `createMemoryHistory` + `match()`) |
| SSR data prefetch | ✅ (via `match(url, signal?)`) |
| Deno        | ✅ (via `createMemoryHistory` + `match()`) |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Ripple](/ripple/)
- [Permit](/permit/)
- [Relay](/relay/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
