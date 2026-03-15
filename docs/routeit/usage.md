---
title: Routeit — Usage Guide
description: Routes, middleware, groups, navigation, and patterns for Routeit.
---

# Routeit Usage Guide

::: tip New to Routeit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

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

## Import

```ts
import { createRouter } from '@vielzeug/routeit';

// Types only
import type {
  Router,
  RouteContext,
  RouteHandler,
  RouteOptions,
  RouteGroup,
  GroupOptions,
  RouteState,
  RouteParams,
  QueryParams,
  RouterOptions,
  NavigationTarget,
  NavigateOptions,
  ResolvedRoute,
  RouterMode,
  Middleware,
  PathParams,
  Unsubscribe,
} from '@vielzeug/routeit';
```

## Basic Usage

### Creating a Router

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter();
// history mode, base '/', no global middleware
```

With options:

```ts
const router = createRouter({
  mode: 'history', // or 'hash'
  base: '/app', // prefix for all history-mode routes
  viewTransition: true, // use the View Transitions API when available
  autoStart: true, // start immediately, no separate start() call needed
});
```

### Registering Routes

```ts
// Handler route — params are typed from the path literal
router.on('/', () => renderHome());
router.on('/users', () => renderUsers());
router.on('/users/:id', ({ params }) => renderUser(params.id));

// Middleware-only route (no handler — useful for hooks, guards, analytics)
router.on('/checkout/*', { middleware: requireAuth });

// Named route with meta
router.on('/users/:id', ({ params }) => renderUser(params.id), {
  name: 'userDetail',
  meta: { title: 'User' },
});

// All registration methods are chainable
router
  .on('/', () => renderHome())
  .on('/about', () => renderAbout())
  .on('/contact', () => renderContact())
  .start();
```

### Route Context

Every handler and middleware receives a `RouteContext`:

```ts
router.on('/users/:id', (ctx) => {
  ctx.params.id; // typed dynamic segment — e.g. '123'
  ctx.query.page; // query param — e.g. '?page=2' → '2'
  ctx.query.tags; // repeated key — e.g. '?tags=a&tags=b' → ['a', 'b']
  ctx.pathname; // current pathname — '/users/123'
  ctx.hash; // URL hash without '#'
  ctx.meta; // static metadata from the route definition
  ctx.locals; // mutable bag — pass data between middleware
  ctx.navigate; // programmatic navigation from inside the handler
});
```

### Starting and Stopping

```ts
router.start(); // attach popstate/hashchange listener, handle current URL
router.stop(); // detach listener
router.dispose(); // stop + clear all subscribers

// autoStart skips the explicit start() call
const router = createRouter({ autoStart: true });

// Or with `using` (ES2022 Explicit Resource Management)
using router = createRouter();
router.on('/', () => renderHome()).start();
// router.dispose() is called automatically when the block exits
```

## Route Groups

Group routes that share a path prefix and optional middleware:

```ts
router.group(
  '/admin',
  (r) => {
    r.on('/dashboard', () => renderDashboard());
    r.on('/users', () => renderUsers());
    r.on('/users/:id', ({ params }) => renderUser(params.id));
  },
  { middleware: requireAuth },
);
```

Groups are nestable:

```ts
router.group(
  '/admin',
  (r) => {
    r.group(
      '/reports',
      (inner) => {
        inner.on('/monthly', () => renderMonthly());
        inner.on('/yearly', () => renderYearly());
      },
      { middleware: requireSuperAdmin },
    );
    r.on('/dashboard', () => renderDashboard());
  },
  { middleware: requireAuth },
);
```

The `on()` overloads available inside `group()` match those on the router:

```ts
router.group('/api', (r) => {
  r.on('/users', fetchUsers); // handler route
  r.on('/hook', { middleware: log }); // middleware-only route
});
```

### Typed Prefix Params

When the group prefix contains path params, they are automatically typed inside `on()` handlers via the `RouteGroup<Prefix>` generic:

```ts
router.group('/projects/:projectId', (r) => {
  // r is RouteGroup<'/projects/:projectId'>
  r.on('/tasks/:taskId', ({ params }) => {
    params.projectId; // ✓ string — from the prefix
    params.taskId; // ✓ string — from this route
    // params.missing // ✗ TypeScript error
  });
});
```

Nesting compounds the prefix, so deeply nested handlers get all ancestor params:

```ts
router.group('/orgs/:orgId', (r) => {
  r.group('/projects/:projectId', (inner) => {
    inner.on('/tasks/:taskId', ({ params }) => {
      params.orgId; // ✓ typed
      params.projectId; // ✓ typed
      params.taskId; // ✓ typed
    });
  });
});
```

## Middleware

Middleware receives the context and a `next` function. Call `next()` to continue; return without calling it to block the handler.

```ts
const logger: Middleware = async (ctx, next) => {
  console.log('→', ctx.pathname);
  await next();
  console.log('←', ctx.pathname);
};

const requireAuth: Middleware = async (ctx, next) => {
  if (!isLoggedIn()) {
    await ctx.navigate('/login', { replace: true });
    return; // block — handler never runs
  }
  await next();
};
```

### Middleware Chain Order

```
Global middleware (RouterOptions.middleware or router.use())
  ↓
Group middleware (group() options.middleware)
  ↓
Route middleware (on() options.middleware)
  ↓
Route handler
```

### Passing Data with `locals`

Use `ctx.locals` to pass data from middleware to downstream middleware or the handler:

```ts
const loadUser: Middleware = async (ctx, next) => {
  ctx.locals.user = await fetchUser(ctx.params.id);
  await next();
};

router.on(
  '/users/:id',
  (ctx) => {
    const user = ctx.locals.user as User; // already loaded by middleware
    renderUser(user);
  },
  { middleware: loadUser },
);
```

### Global Middleware

```ts
// Via options
const router = createRouter({ middleware: logger });

// After construction — appended after any middleware already registered
router.use(analytics, errorTracker);
```

## Navigation

### `navigate(target, options?)`

```ts
// Path string
await router.navigate('/users/42');
await router.navigate('/users/42', { replace: true });
await router.navigate('/users/42', { state: { from: '/' } });

// Named route
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'user', params: { id: '42' }, hash: 'activity' });
await router.navigate({ name: 'search', query: { q: 'hello' } });

// Force navigation even if the URL hasn't changed
await router.navigate('/page', { force: true });
```

`navigate()` is async. Errors (e.g. unknown named route) become rejected Promises:

```ts
try {
  await router.navigate({ name: 'nonExistent' });
} catch (e) {
  console.error(e); // '[routeit] Route "nonExistent" not found'
}
```

### Same-URL Deduplication

By default, navigating to the current URL in history mode is a no-op — no new history entry is pushed and no handler re-runs. Override with `{ force: true }`:

```ts
await router.navigate('/current-page'); // no-op
await router.navigate('/current-page', { force: true }); // re-runs handler
```

### In-Handler Navigation

Navigate from inside a handler or middleware using `ctx.navigate`:

```ts
router.on(
  '/profile',
  async (ctx) => {
    if (!ctx.locals.user) {
      await ctx.navigate('/login', { replace: true });
      return;
    }
    renderProfile(ctx.locals.user);
  },
  { middleware: requireAuth },
);
```

## Named Routes

Attach a `name` to a route to navigate and build URLs without hard-coding paths:

```ts
router
  .on('/', () => renderHome(), { name: 'home' })
  .on('/users', () => renderUsers(), { name: 'userList' })
  .on('/users/:id', ({ params }) => renderUser(params.id), { name: 'userDetail' })
  .on('/users/:id/posts/:postId', ({ params }) => renderPost(params), { name: 'userPost' })
  .start();

// Navigate by name
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userPost', params: { id: '1', postId: '99' } });

// Build URLs
router.url('userDetail', { id: '42' }); // '/users/42'
router.url('userList', undefined, { page: '2' }); // '/users?page=2'
router.isActive('userDetail'); // exact match by name
router.isActive('userList', false); // prefix match by name
```

## URL Builder

`url(nameOrPattern, params?, query?)` generates a URL and prepends the base path in history mode:

```ts
const router = createRouter({ base: '/app' });
router.on('/users/:id', () => {}, { name: 'userDetail' }).start();

router.url('/users/:id', { id: '42' }); // '/app/users/42'
router.url('userDetail', { id: '42' }); // '/app/users/42'
router.url('/search', undefined, { q: 'ts' }); // '/app/search?q=ts'
router.url('/docs/:rest*', { rest: 'guide/intro' }); // '/app/docs/guide/intro'
router.url('/products', undefined, { tags: ['a', 'b'] }); // '/app/products?tags=a&tags=b'
```

## `isActive`

Check whether a path pattern or named route matches the current URL:

```ts
// Exact match (default)
router.isActive('/users/:id'); // true when pathname is exactly '/users/42'
router.isActive('userDetail'); // same, but by route name

// Prefix match — useful for nav highlighting on parent items
router.isActive('/admin', false); // true for '/admin', '/admin/users', etc.
router.isActive('adminGroup', false); // same, by route name
```

## Route Metadata

Attach static data to a route via `meta`. Use it for page titles, permission requirements, breadcrumbs, etc.:

```ts
router.on('/admin', renderAdmin, {
  name: 'admin',
  meta: { title: 'Admin', requiresAuth: true, roles: ['admin'] },
  middleware: async (ctx, next) => {
    if (!(ctx.meta as any)?.requiresAuth || isLoggedIn()) {
      await next();
    } else {
      await ctx.navigate('/login', { replace: true });
    }
  },
});
```

`ctx.meta` is also available on the `RouteState` emitted to `subscribe()` listeners, so you can update page titles reactively:

```ts
router.subscribe(({ meta }) => {
  const m = meta as { title?: string } | undefined;
  document.title = m?.title ?? 'My App';
});
```

## Resolve Without Navigating

`resolve(pathname)` synchronously finds the matching route — no navigation, no handler execution, no subscribers notified:

```ts
const match = router.resolve('/users/42');
// → { name: 'userDetail', params: { id: '42' }, meta: { title: 'User' } }

const miss = router.resolve('/unknown');
// → null

// Useful for prefetching data before navigation
const match = router.resolve(window.location.pathname);
if (match?.name === 'userDetail') {
  prefetch(`/api/users/${match.params.id}`);
}
```

## State & Subscriptions

### `state` getter

```ts
const { pathname, params, query, hash, name, meta } = router.state;
// Returns a shallow copy — safe to store directly
```

### `subscribe(listener)`

Called immediately with the current state, then after every navigation:

```ts
const unsubscribe = router.subscribe((state) => {
  state.pathname; // '/users/42'
  state.params; // { id: '42' }
  state.query; // { page: '2' }
  state.name; // 'userDetail'
  state.meta; // { title: 'User' }
});

unsubscribe(); // stop listening
```

Subscriber errors are caught, logged to `console.error`, and do not affect other subscribers.

## Error Handling

### `onError`

Catches errors thrown by handlers or middleware. Receives the thrown value and the current `RouteContext`:

```ts
const router = createRouter({
  onError: (error, ctx) => {
    console.error('Route error at', ctx.pathname, error);
    ctx.navigate('/error');
  },
});
```

If no `onError` is provided, errors are logged to `console.error` and swallowed.

### `onNotFound`

Called when no registered route matches the current URL:

```ts
const router = createRouter({
  onNotFound: ({ pathname }) => {
    document.getElementById('app')!.innerHTML = `
      <h1>404 — Not Found</h1>
      <p>"${pathname}" does not exist.</p>
    `;
  },
});
```

## Hash Mode

Switch to hash-based routing for environments without server-side URL handling:

```ts
const router = createRouter({ mode: 'hash' });

router
  .on('/', () => renderHome())
  .on('/users/:id', ({ params }) => renderUser(params.id))
  .start();

// URLs become: https://example.com/#/users/42
await router.navigate('/users/42'); // sets location.hash = '/users/42'
```

The `base` option is ignored in hash mode.

## View Transitions

Wrap navigations in the [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) for animated page transitions:

```ts
// Enable globally
const router = createRouter({ viewTransition: true });

// Enable per navigation only
await router.navigate('/about', { viewTransition: true });
```

Falls back to plain execution in environments that don't support `document.startViewTransition`.
