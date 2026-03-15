---
title: Routeit — Client-side router for TypeScript
description: Lightweight, type-safe client-side router with history and hash modes, typed path params, middleware, named routes, and a URL builder. Zero dependencies.
---

<PackageBadges package="routeit" />

<img src="/logo-routeit.svg" alt="Routeit Logo" width="156" class="logo-highlight"/>

# Routeit

**Routeit** is a lightweight, framework-agnostic client-side router with typed path params, middleware, named routes, route groups, and a URL builder. Works in any browser environment.

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

## Features

- **History and hash modes** — `history` (default) or `hash`
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

## Next Steps

|                           |                                                       |
| ------------------------- | ----------------------------------------------------- |
| [Usage Guide](./usage.md) | Routes, middleware, groups, navigation, and patterns  |
| [API Reference](./api.md) | Complete type signatures and method documentation     |
| [Examples](./examples.md) | Real-world routing patterns and framework integration |
