---
title: Routeit — Client-side router for TypeScript
description: Lightweight, type-safe client-side router with a declarative route table, middleware, and named navigation.
---

<PackageBadges package="routeit" />

<img src="/logo-routeit.svg" alt="Routeit logo" width="156" class="logo-highlight"/>

# Routeit

**Routeit** is a lightweight, framework-agnostic client-side router built around a single declarative route table. Define routes once, then navigate, resolve, and build links by route name.

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
import { createRouter, defineRoutes } from '@vielzeug/routeit';

const router = createRouter({
  routes: defineRoutes({
    home: {
      path: '/',
      handler: () => renderHome(),
    },
    users: {
      path: '/users',
      handler: () => renderUsers(),
    },
    userDetail: {
      path: '/users/:id',
      handler: ({ params }) => renderUser(params.id),
      meta: { title: 'User' },
    },
    notFound: {
      path: '*',
      handler: () => renderNotFound(),
    },
  }),
});

router.start();
await router.navigate({ name: 'userDetail', params: { id: '42' } });
```

## Why Routeit?

Managing navigation by hand usually means duplicated path checks, manual `popstate` listeners, and scattered history writes. Routeit keeps the routing model in one place and makes route names the source of truth.

```ts
const routes = defineRoutes({
  home: { path: '/', handler: () => renderHome() },
  userDetail: { path: '/users/:id', handler: ({ params }) => renderUser(params.id) },
  notFound: { path: '*', handler: () => renderNotFound() },
});

const router = createRouter({ routes });
```

| Feature | Routeit | page.js | Navigo |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="routeit" type="size" /> | ~1 kB | ~5 kB |
| History mode | ✅ | ✅ | ✅ |
| Typed path params | ✅ | ❌ | ❌ |
| Named navigation | ✅ | ❌ | Partial |
| Middleware | ✅ | ✅ | ✅ |
| View Transition API | ✅ | ❌ | ❌ |
| Zero dependencies | ✅ | ✅ | ✅ |

## Core Ideas

- One declarative route table
- Route names come from object keys
- Named-route-first `navigate()`, `url()`, and `isActive()`
- Wildcard routes handle not-found cases
- Middleware handles guards, analytics, and error boundaries
- Raw path escape hatches exist when needed with `pushPath()` and `replacePath()`

## Feature Highlights

- **Typed path params** with `defineRoutes()`
- **Middleware** at global and route scope
- **Metadata** exposed through `ctx.meta` and route state
- **Immutable state snapshots** through `router.state`
- **Base-path support** for app subdirectories
- **Same-URL deduplication** with optional `{ force: true }`
- **Resolve without navigation** via `router.resolve()`
- **View transitions** when the browser supports them

## Documentation Map

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## Compatibility

| Environment | Support |
| --- | --- |
| Browser | ✅ |
| Node.js | ❌ |
| SSR | ❌ |
| Deno | ❌ |

## Prerequisites

- Browser runtime with the History API
- Server rewrites for deep-link support in SPAs
- Route table defined before router startup

## See Also

- [Stateit](/stateit/)
- [Permit](/permit/)
- [Eventit](/eventit/)
