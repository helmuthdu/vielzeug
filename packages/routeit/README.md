# @vielzeug/routeit

> Fast, type-safe client-side routing with a declarative route table

[![npm version](https://img.shields.io/npm/v/@vielzeug/routeit)](https://www.npmjs.com/package/@vielzeug/routeit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Routeit** is a lightweight, framework-agnostic router built around one model: define a route table once, then navigate, resolve, load route data, and build URLs by route name.

## Installation

```sh
pnpm add @vielzeug/routeit
# npm install @vielzeug/routeit
# yarn add @vielzeug/routeit
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

## Features

- Declarative route table only
- Nested routes with `children` and `index`
- Named-route-first `navigate()`, `url()`, and `isActive()`
- Route-scoped `data()` loaders with `AbortSignal`
- Global and per-route middleware
- Raw path targets via `navigate({ path })`
- Typed path params via literal route paths
- Resolvable matches via `router.resolve(pathname)`
- Base-path support for subdirectory deployments
- Optional View Transition API integration
- Immutable route state snapshots via `router.state`
- Zero dependencies

## Route Definition

```ts
const routes = {
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
    middleware: [requireAuth],
    children: {
      index: {
        index: true,
        handler: () => renderDashboard(),
      },
      settings: {
        path: 'settings',
        data: async () => fetchSettings(),
        handler: ({ data }) => renderSettings(data),
      },
    },
  },
  userDetail: {
    path: '/users/:id',
    data: async ({ params }) => fetchUser(params.id),
    handler: ({ data }) => renderUser(data),
    meta: { section: 'users' },
  },
  notFound: {
    path: '*',
    handler: () => renderNotFound(),
  },
});

const router = createRouter({
  base: '/app',
  middleware: [logger],
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

## Data

```ts
const routes = {
  userDetail: {
    path: '/users/:id',
    data: async ({ params, signal }) => fetchUser(params.id, { signal }),
    handler: ({ data }) => renderUser(data),
  },
};
```

`data()` runs after middleware and before the final handler. Use middleware for redirects and access control, and keep `data()` focused on route-local fetching.

## Route Context

Handlers and middleware receive a context with routing and navigation helpers:

```ts
handler: (ctx) => {
  ctx.data;
  ctx.pathname;
  ctx.params;
  ctx.query;
  ctx.hash;
  ctx.matches;
  ctx.locals;

  // Named navigation
  ctx.navigate({ name: 'home' });

  // Raw path targets
  ctx.navigate({ path: '/campaign?utm_source=email' });
  ctx.navigate({ path: '/checkout#payment' }, { replace: true });
}
```

Read active metadata from the leaf match: `ctx.matches.at(-1)?.meta`.

## Navigation

```ts
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userDetail', params: { id: '42' } }, { replace: true });
await router.navigate({ path: '/marketing?source=campaign' });
await router.navigate({ path: '/checkout#payment' }, { replace: true });

router.url('userDetail', { id: '42' }, { tab: 'profile' });
router.isActive('userDetail');
router.isActive('users', false);
router.resolve('/app/dashboard/settings');
```

## State

```ts
router.subscribe((state) => {
  const leaf = state.matches.at(-1);
  document.title = (leaf?.meta as { title?: string } | undefined)?.title ?? 'App';
});

router.state.location.pathname;
router.state.location.query;
router.state.location.hash;
router.state.matches;
router.state.status;
```

`router.state` is an immutable snapshot. Each successful navigation replaces it with a new snapshot.

Read active-route metadata from the leaf match (`router.state.matches.at(-1)?.meta`).

## API Summary

| Symbol | Purpose |
| --- | --- |
| `createRouter({ routes, ...options })` | Create a router from a declarative route table |
| `createBrowserHistory()` | Create the default browser history driver |
| `router.navigate({ name, ... })` | Navigate by route name |
| `router.navigate({ path })` | Navigate by raw path target |
| `router.url(name, params?, query?)` | Build a URL for a named route |
| `router.isActive(name, exact?)` | Check whether the current route matches a named route |
| `router.resolve(pathname)` | Resolve a pathname without running middleware or handlers |
| `router.subscribe(listener)` | Observe immutable route state snapshots |
| `router.dispose()` | Remove listeners and prevent future router interaction |

## Documentation

Full docs at **[vielzeug.dev/routeit](https://vielzeug.dev/routeit)**

| | |
| --- | --- |
| [Usage Guide](https://vielzeug.dev/routeit/usage) | Router setup, middleware, and navigation patterns |
| [API Reference](https://vielzeug.dev/routeit/api) | Public types and method signatures |
| [Examples](https://vielzeug.dev/routeit/examples) | Practical recipes for guards, base paths, and transitions |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
