---
title: Routeit — Client-side router for TypeScript
description: Lightweight, type-safe client-side router with typed path params, middleware, named routes, and a URL builder. Zero dependencies.
---

<PackageBadges package="routeit" />

<img src="/logo-routeit.svg" alt="Routeit logo" width="156" class="logo-highlight"/>

# Routeit

**Routeit** is a lightweight, framework-agnostic client-side router with typed path params, middleware, named routes, route groups, and a URL builder. Works in any browser environment.

<!-- Search keywords: client router, typed routes, single-page app navigation, SPA navigation. -->

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

const router = createRouter();

router
  .on('/', () => renderHome())
  .on('/users', () => renderUsers())
  .on('/users/:id', ({ params }) => renderUser(params.id), { name: 'userDetail' })
  .start();

// Navigate programmatically
await router.navigate('/users/42');
await router.navigate({ name: 'userDetail', params: { id: '42' } });
```

## Why Routeit?

Managing client-side navigation without a router means scattered `location.pathname` checks, manual `popstate` listeners, and duplicated history manipulation:

```ts
// Before — manual history management
window.addEventListener('popstate', () => {
  if (location.pathname === '/') renderHome();
  else if (location.pathname.startsWith('/users/')) {
    const id = location.pathname.split('/')[2];
    renderUser(id);
  }
});

// After — Routeit
import { createRouter } from '@vielzeug/routeit';
const router = createRouter();
router
  .on('/', () => renderHome())
  .on('/users/:id', ({ params }) => renderUser(params.id))
  .start();
```

| Feature              | Routeit                                       | page.js | Navigo  |
| -------------------- | --------------------------------------------- | ------- | ------- |
| Bundle size          | <PackageInfo package="routeit" type="size" /> | ~1 kB   | ~5 kB   |
| History mode         | ✅                                            | ✅      | ✅      |
| Typed path params    | ✅                                            | ❌      | ❌      |
| Named routes         | ✅                                            | ❌      | Partial |
| Middleware           | ✅                                            | ✅      | ✅      |
| Route groups         | ✅                                            | ❌      | ❌      |
| View Transition API  | ✅                                            | ❌      | ❌      |
| Zero dependencies    | ✅                                            | ✅      | ✅      |

**Use Routeit when** you need typed path params, named routes, and middleware in a lightweight, framework-agnostic client-side router.

**Consider React Router or TanStack Router** if you are building a React app that needs deep framework integration, file-based routing, or data loaders.

## Features

- **History mode routing** — HTML5 History API with base-path support
- **Typed path params** — `PathParams<'/users/:id'>` inferred from the path literal at compile time
- **Named wildcard params** — `/docs/:rest*` captures multi-segment paths as a single param
- **Middleware** — global (`createRouter`/`use()`), per-group, and per-route; `ctx.locals` for passing data down the chain
- **Route groups** — `group(prefix, definer, options?)` with typed prefix params propagated to nested handlers via `RouteGroup<Prefix>`
- **Named routes** — navigate and build URLs by name, never hard-code paths
- **URL builder** — `url(nameOrPattern, params?, query?)` with base-path awareness
- **Async navigation** — `navigate()` returns a `Promise`; errors are rejections
- **Same-URL deduplication** — skips redundant history pushes; `force: true` bypasses it
- **Subscriptions** — `subscribe((state) => ...)` returns an unsubscribe function
- **Resolve without navigating** — `resolve(pathname)` for prefetching and data loading
- **Not-found & error hooks** — `onNotFound` and `onError` in router options
- **View Transition API** — opt-in globally or per-navigation
- **Disposable** — `[Symbol.dispose]()` for `using` declarations
- **Lightweight** — <PackageInfo package="routeit" type="size" /> gzipped

## Compatibility

| Environment | Support                        |
| ----------- | ------------------------------ |
| Browser     | ✅                             |
| Node.js     | ❌ (browser history/hash only) |
| SSR         | ❌                             |
| Deno        | ❌                             |

## Prerequisites

- Browser runtime with History API or hash-based navigation.
- Configure server rewrites so deep links resolve to the SPA entry point.
- Register routes before calling `router.start()`.

## See Also

- [Stateit](/stateit/)
- [Permit](/permit/)
- [Eventit](/eventit/)
