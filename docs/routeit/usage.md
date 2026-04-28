---
title: Routeit — Usage Guide
description: Router setup, middleware, data loading, nested routes, and state patterns for Routeit.
---

::: tip New to Routeit?
Start with the [Overview](./index.md), then use this page for the day-to-day API.
:::

[[toc]]

## Create a Router

```ts
import { createRouter } from '@vielzeug/routeit';

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
    meta: { title: 'User' },
  },
  notFound: {
    path: '*',
    handler: () => renderNotFound(),
  },
};

const router = createRouter({
  base: '/app',
  middleware: [logger],
  routes,
  viewTransition: true,
});
```

`routes` is required. Route names come from the object keys, and object key order controls match precedence.

## Define Routes Once

Each route can provide these fields:

| Field | Purpose |
| --- | --- |
| `path` | Match pattern |
| `children` | Nested child routes |
| `index` | Default child route that inherits the parent path |
| `data` | Abortable route data function that runs after middleware |
| `handler` | Final route handler |
| `middleware` | Route-specific middleware |
| `meta` | Static data exposed on `router.state.matches.at(-1)?.meta` |

Use wildcard routes for fallback behavior:

```ts
const routes = {
  docs: { path: '/docs/*', handler: () => renderDocs() },
  notFound: { path: '*', handler: () => renderNotFound() },
};
```

Nested routes compose naturally and create compound route names:

```ts
const routes = {
  dashboard: {
    path: '/dashboard',
    children: {
      index: { index: true, handler: () => renderDashboardHome() },
      settings: { path: 'settings', handler: () => renderSettings() },
    },
  },
};

await router.navigate({ name: 'dashboard.settings' });
```

## Route Context

Handlers and middleware receive a `RouteContext`:

```ts
userDetail: {
  path: '/users/:id',
  handler: (ctx) => {
    ctx.data;
    ctx.params.id;
    ctx.query.tab;
    ctx.pathname;
    ctx.hash;
    ctx.locals;
    ctx.navigate;
  },
}
```

`ctx.locals` is mutable and shared through the active middleware chain.

`ctx.data` is only populated for the final handler. Middleware always runs before `data()`.

## Middleware

Middleware wraps the handler using the familiar `async (ctx, next) => { ... }` shape.

```ts
const requireAuth = async (ctx, next) => {
  if (!session.user) {
    await ctx.navigate({ name: 'login' }, { replace: true });
    return;
  }

  await next();
};

const loadCurrentUser = async (ctx, next) => {
  ctx.locals.user = await fetchCurrentUser();
  await next();
};
```

Order is fixed and simple:

```text
global middleware
  ↓
route middleware
  ↓
data
  ↓
handler
```

### Guards

Routeit does not need a separate `beforeEnter`. Use middleware for auth checks, redirects, analytics, and boundaries.

```ts
const requireAuth = async (ctx, next) => {
  if (!session.user) {
    await ctx.navigate({ name: 'login' }, { replace: true });
    return;
  }

  await next();
};
```

### Data Loading

Use `data()` for route-local data acquisition. It receives the same route context plus an `AbortSignal`.

```ts
const routes = {
  userDetail: {
    path: '/users/:id',
    data: async ({ params, signal }) => fetchUser(params.id, { signal }),
    handler: ({ data }) => renderUser(data),
  },
};
```

### Error Boundaries

Routeit no longer has a special `onError` hook. Wrap `await next()` in middleware instead.

```ts
const boundary = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    reportRouteError(ctx.pathname, error);
    await ctx.navigate({ path: '/error' }, { replace: true });
  }
};

const router = createRouter({
  middleware: [boundary],
  routes,
});
```

## Navigation

### Named Navigation

```ts
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userDetail', params: { id: '42' } }, { replace: true });
await router.navigate({ name: 'search', query: { q: 'routeit' }, hash: 'results' });
await router.navigate({ name: 'dashboard.settings' });
```

### Raw Path Targets

```ts
await router.navigate({ path: '/marketing?utm_source=campaign' });
await router.navigate({ path: '/checkout#payment' }, { replace: true });
```

Use these when a destination does not belong in the route table. The same `navigate()` method covers named routes and raw path targets.

### Same-URL Deduplication

```ts
await router.navigate({ name: 'dashboard' });
await router.navigate({ name: 'dashboard' }); // no-op
await router.navigate({ name: 'dashboard' }, { force: true }); // re-runs
```

## URLs and Active State

```ts
router.url('userDetail', { id: '42' });
router.url('userDetail', { id: '42' }, { tab: 'profile' });

router.isActive('userDetail');
router.isActive('users', false);
```

`isActive(name, false)` is useful for parent navigation items.

## Resolve Without Navigating

```ts
const match = router.resolve('/app/dashboard/settings');

if (match?.at(-1)?.name === 'dashboard.settings') {
  warmSettingsPanel();
}
```

`resolve()` strips the configured base automatically and returns the full matched branch.

## State and Subscriptions

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

The state object is immutable. A successful navigation replaces it with a new snapshot.

`router.state.matches` contains the matched branch from root to leaf. Access route metadata via the leaf match: `state.matches.at(-1)?.meta`.

## Cleanup

```ts
router.dispose();
```

Remove listeners, clear subscribers, and prevent future router usage.
