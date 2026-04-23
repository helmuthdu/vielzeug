# @vielzeug/routeit

> Fast, type-safe client-side routing with a declarative route table

[![npm version](https://img.shields.io/npm/v/@vielzeug/routeit)](https://www.npmjs.com/package/@vielzeug/routeit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Routeit** is a lightweight, framework-agnostic router built around one model: define a route table once, then navigate, resolve, and build URLs by route name.

## Installation

```sh
pnpm add @vielzeug/routeit
# npm install @vielzeug/routeit
# yarn add @vielzeug/routeit
```

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

## Features

- Declarative route table only
- Named-route-first `navigate()`, `url()`, and `isActive()`
- Typed path params via `defineRoutes()`
- Global and per-route middleware
- Middleware-only routes and wildcard fallbacks
- Raw path escape hatches with `pushPath()` and `replacePath()`
- Base-path support
- Same-URL deduplication with `{ force: true }`
- Immutable route state snapshots
- `resolve()` for match lookup without navigation
- Optional View Transition API integration
- Zero dependencies

## Route Definition

```ts
const routes = defineRoutes({
  home: {
    path: '/',
    handler: () => renderHome(),
  },
  login: {
    path: '/login',
    handler: () => renderLogin(),
  },
  dashboard: {
    path: '/dashboard',
    handler: () => renderDashboard(),
    middleware: requireAuth,
  },
  userDetail: {
    path: '/users/:id',
    handler: ({ params, meta }) => renderUser(params.id, meta),
    meta: { section: 'users' },
  },
  notFound: {
    path: '*',
    handler: () => renderNotFound(),
  },
});

const router = createRouter({
  base: '/app',
  middleware: logger,
  routes,
  viewTransition: true,
});
```

## Middleware

```ts
const requireAuth = async (ctx, next) => {
  if (!session.user) {
    await ctx.navigate({ name: 'login' }, { replace: true });
    return;
  }

  await next();
};
```

`ctx.locals` is shared across the middleware chain and the final handler. If you want not-found handling or error boundaries, model them as routes and middleware instead of special router hooks.

## Route Context

Handlers and middleware receive a context with routing and navigation helpers:

```ts
handler: (ctx) => {
  ctx.pathname;
  ctx.params;
  ctx.query;
  ctx.hash;
  ctx.meta;
  ctx.locals;

  // Named navigation
  ctx.navigate({ name: 'home' });

  // Raw path escape hatches
  ctx.pushPath('/campaign?utm_source=email');
  ctx.replacePath('/checkout#payment');
}
```

## Navigation

```ts
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userDetail', params: { id: '42' } }, { replace: true });
await router.pushPath('/marketing?source=campaign');
await router.replacePath('/checkout#payment');

router.url('userDetail', { id: '42' }, { tab: 'profile' });
router.isActive('userDetail');
router.isActive('users', false);
router.resolve('/app/users/42');
```

## State

```ts
router.subscribe((state) => {
  document.title = (state.meta as { title?: string } | undefined)?.title ?? 'App';
});

router.state.pathname;
router.state.params;
router.state.query;
router.state.name;
```

`router.state` is an immutable snapshot. Each successful navigation replaces it with a new frozen object.

## API Summary

| Symbol | Purpose |
| --- | --- |
| `createRouter({ routes, ...options })` | Create a router from a declarative route table |
| `defineRoutes(routes)` | Preserve literal route definitions for better inference |
| `router.start()` | Handle the current URL and start listening for `popstate` |
| `router.navigate({ name, ... })` | Navigate by route name |
| `router.pushPath(path)` | Raw path escape hatch that pushes history |
| `router.replacePath(path)` | Raw path escape hatch that replaces history |
| `router.url(name, params?, query?)` | Build a URL for a named route |
| `router.isActive(name, exact?)` | Check whether the current route matches a named route |
| `router.resolve(pathname)` | Resolve a pathname without running middleware or handlers |
| `router.subscribe(listener)` | Observe immutable route state snapshots |

## Documentation

Full docs at **[vielzeug.dev/routeit](https://vielzeug.dev/routeit)**

| | |
| --- | --- |
| [Usage Guide](https://vielzeug.dev/routeit/usage) | Router setup, middleware, and navigation patterns |
| [API Reference](https://vielzeug.dev/routeit/api) | Public types and method signatures |
| [Examples](https://vielzeug.dev/routeit/examples) | Practical recipes for guards, base paths, and transitions |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
