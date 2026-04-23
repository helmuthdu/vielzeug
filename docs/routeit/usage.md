---
title: Routeit — Usage Guide
description: Router setup, middleware, navigation, and state patterns for Routeit v3.
---

# Routeit Usage Guide

::: tip New to Routeit?
Start with the [Overview](./index.md), then use this page for the day-to-day API.
:::

[[toc]]

## Create a Router

```ts
import { createRouter, defineRoutes } from '@vielzeug/routeit';

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
    handler: ({ params }) => renderUser(params.id),
    meta: { title: 'User' },
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

`routes` is required. Route names come from the object keys, and object key order controls match precedence.

## Define Routes Once

Each route can provide four things:

| Field | Purpose |
| --- | --- |
| `path` | Match pattern |
| `handler` | Final route handler |
| `middleware` | Route-specific middleware |
| `meta` | Static data exposed on `ctx.meta` and route state |

Use wildcard routes for fallback behavior:

```ts
const routes = defineRoutes({
  docs: { path: '/docs/*', handler: () => renderDocs() },
  notFound: { path: '*', handler: () => renderNotFound() },
});
```

## Route Context

Handlers and middleware receive a `RouteContext`:

```ts
userDetail: {
  path: '/users/:id',
  handler: (ctx) => {
    ctx.params.id;
    ctx.query.tab;
    ctx.pathname;
    ctx.hash;
    ctx.meta;
    ctx.locals;
    ctx.navigate;
    ctx.pushPath;
    ctx.replacePath;
  },
}
```

`ctx.locals` is mutable and shared through the active middleware chain.

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
handler
```

### Error Boundaries

Routeit no longer has a special `onError` hook. Wrap `await next()` in middleware instead.

```ts
const boundary = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    reportRouteError(ctx.pathname, error);
    await ctx.replacePath('/error');
  }
};

const router = createRouter({
  middleware: boundary,
  routes,
});
```

## Navigation

### Named Navigation

```ts
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userDetail', params: { id: '42' } }, { replace: true });
await router.navigate({ name: 'search', query: { q: 'routeit' }, hash: 'results' });
```

### Raw Path Escape Hatches

```ts
await router.pushPath('/marketing?utm_source=campaign');
await router.replacePath('/checkout#payment');
```

Use these when a destination does not belong in the route table. The primary API remains named navigation.

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
const match = router.resolve('/app/users/42');

if (match?.name === 'userDetail') {
  prefetchUser(match.params.id);
}
```

`resolve()` strips the configured base automatically.

## State and Subscriptions

```ts
router.subscribe((state) => {
  document.title = (state.meta as { title?: string } | undefined)?.title ?? 'App';
});

router.state.pathname;
router.state.params;
router.state.query;
router.state.name;
```

The state object is frozen. A successful navigation replaces it with a new immutable snapshot.

## Lifecycle

```ts
router.start();
router.stop();
router.dispose();

const autoRouter = createRouter({ autoStart: true, routes });
```

`start()` is idempotent. `dispose()` prevents future router usage.

## Design Changes From Older Routeit Versions

- `on()`, `group()`, and `use()` are gone.
- Route names are mandatory for `navigate()`, `url()`, and `isActive()` because the route table always gives you one.
- Not-found handling is a normal route, usually `path: '*'`.
- Error handling lives in middleware instead of special router hooks.
