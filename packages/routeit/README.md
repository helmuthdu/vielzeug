# @vielzeug/routeit

> Fast, type-safe client-side router with history and hash modes, middleware, named routes, and a URL builder

[![npm version](https://img.shields.io/npm/v/@vielzeug/routeit)](https://www.npmjs.com/package/@vielzeug/routeit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Routeit** is a lightweight, framework-agnostic client-side router: register routes with `on()`, apply middleware, navigate programmatically, and build type-safe URLs — all with a minimal, chainable API.

## Installation

```sh
pnpm add @vielzeug/routeit
# npm install @vielzeug/routeit
# yarn add @vielzeug/routeit
```

## Quick Start

```typescript
import { createRouter } from '@vielzeug/routeit';

const router = createRouter();

router
  .on('/', () => render('<Home />'))
  .on('/users', () => render('<Users />'))
  .on('/users/:id', ({ params }) => render(`<User id="${params.id}" />`))
  .start();
```

## Features

- ✅ **History and hash modes** — `history` (default) or `hash`
- ✅ **Typed path params** — `PathParams<'/users/:id'>` inferred from the path literal at compile time
- ✅ **Named wildcard params** — `/docs/:rest*` captures multi-segment paths as a single param
- ✅ **Middleware** — global, per-group, and per-route; `ctx.locals` for passing data down the chain
- ✅ **Route groups** — `group(prefix, definer, { middleware? })` with typed prefix params propagated to handlers
- ✅ **Named routes** — navigate and build URLs by name, never hard-code paths
- ✅ **URL builder** — `url(nameOrPattern, params?, query?)` with base-path awareness
- ✅ **Async navigation** — `navigate()` returns a `Promise`; errors become rejections
- ✅ **Same-URL deduplication** — skips redundant history pushes; `force: true` bypasses it
- ✅ **Subscriptions** — `subscribe((state) => ...)` returns an unsubscribe function
- ✅ **Resolve without navigating** — `resolve(pathname)` for prefetching and SSR
- ✅ **Not-found & error hooks** — `onNotFound` and `onError` in router options
- ✅ **View Transition API** — opt-in globally or per-navigation
- ✅ **Disposable** — `[Symbol.dispose]()` for `using` declarations
- ✅ **Framework-agnostic** — works with any UI library

## Usage

### Defining Routes

```typescript
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({ base: '/app' });

// Handler route
router.on('/', () => renderHome());

// Middleware-only route (no handler)
router.on('/hook', { middleware: trackPageView });

// With name and meta
router.on('/users/:id', ({ params }) => renderUser(params.id), {
  name: 'userDetail',
  meta: { title: 'User' },
});

router.start();
```

### Route Groups

Share a path prefix and optional middleware across multiple routes. Path params in the prefix are **typed through** to every `on()` handler in the group:

```typescript
// Simple prefix + middleware
router.group(
  '/admin',
  (r) => {
    r.on('/dashboard', () => renderDashboard());
    r.on('/users', () => renderUsers());
    r.on('/users/:id', ({ params }) => renderUser(params.id));
  },
  { middleware: requireAuth },
);

// Prefix params are typed inside the callback
router.group('/projects/:projectId', (r) => {
  r.on('/tasks/:taskId', ({ params }) => {
    params.projectId; // ✓ string — inferred from group prefix
    params.taskId; // ✓ string — inferred from on() path
  });
});
```

### Route Context

Every handler and middleware receives a `RouteContext`:

```typescript
router.on('/users/:id', (ctx) => {
  ctx.params.id; // typed dynamic segment → e.g. '123'
  ctx.query.page; // query param → e.g. '?page=2' → '2'
  ctx.pathname; // current pathname string
  ctx.hash; // URL hash without '#'
  ctx.meta; // static metadata from the route definition
  ctx.locals; // mutable bag — pass data between middleware
  ctx.navigate; // navigate programmatically from the handler
});
```

### Middleware

```typescript
// Global middleware via options
const router = createRouter({
  middleware: async (ctx, next) => {
    if (!isLoggedIn() && ctx.pathname !== '/login') {
      await ctx.navigate('/login');
      return; // block the handler — don't call next()
    }
    await next();
  },
});

// Add global middleware after construction
router.use(loggerMiddleware, analyticsMiddleware);

// Route-level middleware
router.on('/dashboard', renderDashboard, { middleware: requireAuth });

// Middleware-only route (no handler)
router.on('/api/*', { middleware: [requireAuth, rateLimit] });
```

### Programmatic Navigation

```typescript
// Path string
await router.navigate('/users/42');
await router.navigate('/users/42', { replace: true, state: { from: '/' } });

// Named route
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'user', params: { id: '42' }, hash: 'activity' });

// Force re-run on the current URL
await router.navigate('/page', { force: true });

// Errors throw as rejected Promises
try {
  await router.navigate({ name: 'nonExistent' });
} catch (e) {
  console.error(e); // '[routeit] Route "nonExistent" not found'
}
```

### URL Builder

```typescript
router.url('/users/:id', { id: '42' }); // '/users/42'
router.url('userDetail', { id: '42' }); // '/app/users/42' (respects base)
router.url('/search', undefined, { q: 'hello', page: '2' }); // '/search?q=hello&page=2'
router.url('/docs/:rest*', { rest: 'guide/intro' }); // '/docs/guide/intro'
```

### `isActive`

```typescript
router.isActive('/users/:id'); // exact match (default)
router.isActive('userDetail'); // by route name
router.isActive('/admin', false); // prefix match — true when inside /admin/*
router.isActive('adminGroup', false); // named route prefix match
```

### Subscriptions & State

```typescript
const unsubscribe = router.subscribe((state) => {
  state.pathname; // '/users/42'
  state.params; // { id: '42' }
  state.query; // { page: '2' }
  state.name; // 'userDetail'
  state.meta; // { title: 'User' }
});

// Stop later
unsubscribe();

// Read current state directly
const { pathname, params } = router.state;
```

### Resolve Without Navigating

```typescript
const match = router.resolve('/users/42');
// → { name: 'userDetail', params: { id: '42' }, meta: { title: 'User' } }
// → null when no route matches
```

### Lifecycle

```typescript
const router = createRouter({ autoStart: true }); // starts immediately

router.start(); // idempotent — safe to call twice
router.stop(); // remove event listeners
router.dispose(); // stop + clear all subscribers

// Or with `using` (ES2022 Explicit Resource Management)
using router = createRouter();
```

### Not Found & Error Handling

```typescript
const router = createRouter({
  onNotFound: ({ pathname }) => renderNotFound(pathname),
  onError: (error, ctx) => {
    console.error('Error at', ctx.pathname, error);
    ctx.navigate('/error');
  },
});
```

## API

### `createRouter(options?)`

| Option           | Type                         | Default     | Description                                         |
| ---------------- | ---------------------------- | ----------- | --------------------------------------------------- |
| `mode`           | `'history' \| 'hash'`        | `'history'` | Routing mode                                        |
| `base`           | `string`                     | `'/'`       | Base path prefix for history mode                   |
| `onNotFound`     | `RouteHandler`               | —           | Handler for unmatched routes                        |
| `onError`        | `(error, ctx) => void`       | —           | Handler for errors thrown in handlers or middleware |
| `middleware`     | `Middleware \| Middleware[]` | `[]`        | Global middleware applied before every route        |
| `viewTransition` | `boolean`                    | `false`     | Wrap navigations in the View Transition API         |
| `autoStart`      | `boolean`                    | `false`     | Start immediately after construction                |

### Router Methods

| Method                                | Returns                 | Description                                                 |
| ------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `on(path, handler, opts?)`            | `this`                  | Register a route with a typed handler                       |
| `on(path, opts?)`                     | `this`                  | Register a middleware-only route (no handler)               |
| `group(prefix, definer, opts?)`       | `this`                  | Register routes under a shared prefix                       |
| `use(...middleware)`                  | `this`                  | Add global middleware after construction                    |
| `start()`                             | `this`                  | Start listening for navigation events                       |
| `stop()`                              | `this`                  | Stop listening and remove event listeners                   |
| `dispose()`                           | `void`                  | Stop and clear all subscribers                              |
| `navigate(target, opts?)`             | `Promise<void>`         | Navigate to a path or named route                           |
| `url(nameOrPattern, params?, query?)` | `string`                | Build a URL from a path pattern or named route              |
| `isActive(nameOrPattern, exact?)`     | `boolean`               | Check if a pattern or name matches the current path         |
| `resolve(pathname)`                   | `ResolvedRoute \| null` | Resolve a pathname without navigating                       |
| `state`                               | `RouteState`            | Current route state (shallow copy)                          |
| `subscribe(listener)`                 | `() => void`            | Subscribe to route changes; returns an unsubscribe function |

### `RouteOptions<Meta>`

Passed as the last argument to `on()`:

| Option       | Type                         | Description                                                     |
| ------------ | ---------------------------- | --------------------------------------------------------------- |
| `name`       | `string`                     | Route name for programmatic navigation and `url()`/`isActive()` |
| `meta`       | `Meta`                       | Static metadata attached to the route context                   |
| `middleware` | `Middleware \| Middleware[]` | Route-specific middleware                                       |

### `NavigateOptions`

| Option           | Type      | Default | Description                                              |
| ---------------- | --------- | ------- | -------------------------------------------------------- |
| `replace`        | `boolean` | `false` | Replace the current history entry                        |
| `state`          | `unknown` | —       | State stored with the history entry                      |
| `viewTransition` | `boolean` | —       | Override the router-level setting for this navigation    |
| `force`          | `boolean` | `false` | Navigate even if the destination URL matches the current |

## Documentation

Full docs at **[vielzeug.dev/routeit](https://vielzeug.dev/routeit)**

|                                                   |                                            |
| ------------------------------------------------- | ------------------------------------------ |
| [Usage Guide](https://vielzeug.dev/routeit/usage) | Routes, navigation, middleware, and groups |
| [API Reference](https://vielzeug.dev/routeit/api) | Complete type signatures                   |
| [Examples](https://vielzeug.dev/routeit/examples) | Real-world routing patterns                |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
