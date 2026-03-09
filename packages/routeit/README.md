# @vielzeug/routeit

> Fast, type-safe client-side router with history and hash modes, middleware, and URL builder

[![npm version](https://img.shields.io/npm/v/@vielzeug/routeit)](https://www.npmjs.com/package/@vielzeug/routeit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Routeit** is a lightweight, framework-agnostic client-side router: define routes with handlers, support history or hash routing, apply middleware, and build type-safe URLs — all with a minimal API.

## Installation

```sh
pnpm add @vielzeug/routeit
# npm install @vielzeug/routeit
# yarn add @vielzeug/routeit
```

## Quick Start

```typescript
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({ mode: 'history' });

router.get('/', () => render('<Home />'));
router.get('/users', () => render('<Users />'));
router.get('/users/:id', ({ params }) => render(`<User id="${params.id}" />`));

router.start();
```

## Features

- ✅ **History and hash modes** — `history` (default) or `hash`
- ✅ **Dynamic params** — `/users/:id`, `/posts/:slug`
- ✅ **Query string access** — `context.query`
- ✅ **Middleware** — intercept every navigation, pass data via `ctx.meta`
- ✅ **Programmatic navigation** — `navigate()`, `navigateTo()`
- ✅ **URL builder** — `url(nameOrPattern, params?, query?)`
- ✅ **Named routes** — register with `name`, navigate by name via `navigateTo()` or `url()`
- ✅ **Route groups** — `group(prefix, middleware?, definer)`
- ✅ **Not-found handler** — catch-all for unmatched routes
- ✅ **Error handler** — catch errors from handlers and middleware
- ✅ **View Transitions API** — smooth transitions with optional per-navigation override
- ✅ **Reactive subscriptions** — `subscribe((state) => ...)` returns an unsubscribe function
- ✅ **Framework-agnostic** — works with any UI library

## Usage

### Defining Routes

```typescript
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({ mode: 'history', base: '/app' });

// Convenience shorthand
router.get('/', (ctx) => console.log('Home', ctx));

// Full route definition object
router.route({ path: '/about', handler: () => showAbout() });

// Multiple routes at once
router.routes([
  { path: '/login',  handler: showLogin },
  { path: '/logout', handler: doLogout },
]);

router.start();
```

### Route Groups

Group routes that share a prefix and/or common middleware:

```typescript
router.group('/admin', requireAuth, (r) => {
  r.on('/dashboard', () => renderDashboard());
  r.on('/users',     () => renderUsers());
  r.on('/users/:id', ({ params }) => renderUser(params.id));
});
```

### Route Context

```typescript
router.get('/users/:id', (ctx) => {
  ctx.params.id;    // dynamic segment value
  ctx.query.page;   // ?page=2
  ctx.pathname;     // full path string
  ctx.hash;         // URL hash (without #)
  ctx.data;         // custom route data
  ctx.meta;         // mutable metadata shared between middlewares
});
```

### Programmatic Navigation

```typescript
// Navigate to path
router.navigate('/users/42');
router.navigate('/users/42', { replace: true, state: { from: '/' } });

// Navigate to a named route
router.navigateTo('user', { id: '42' });
router.navigateTo('user', { id: '42' }, { replace: true });

// Build a URL without navigating
const url = router.url('/users/:id', { id: '42' }, { tab: 'profile' });
// → '/users/42?tab=profile'

// Build URL for a named route
const url2 = router.url('user', { id: '42' });
```

### Middleware

```typescript
const router = createRouter({
  middleware: [
    async (ctx, next) => {
      if (!isLoggedIn() && ctx.pathname !== '/login') {
        router.navigate('/login');
        return; // don't call next() — blocks the handler
      }
      await next();
    },
  ],
});
```

### Not Found & Error Handling

```typescript
const router = createRouter({
  onNotFound: ({ pathname }) => renderNotFound(pathname),
  onError: (error, ctx) => {
    console.error('Route error:', error);
    router.navigate('/error');
  },
});
```

### Subscriptions

```typescript
const unsubscribe = router.subscribe((state) => {
  console.log('Path:', state.pathname);
  console.log('Params:', state.params);
});

// Stop listening later
unsubscribe();
```

## API

### `createRouter(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'history' \| 'hash'` | `'history'` | Routing mode |
| `base` | `string` | `'/'` | Base path prefix |
| `onNotFound` | `RouteHandler` | — | Handler for unmatched routes |
| `onError` | `(error, ctx) => void` | — | Handler for errors thrown in handlers/middleware |
| `middleware` | `Middleware \| Middleware[]` | `[]` | Global middleware applied to every route |
| `viewTransitions` | `boolean` | `false` | Wrap renders in the View Transition API |

### Router Methods

| Method | Returns | Description |
|---|---|---|
| `route(def)` | `Router` | Register a route definition object |
| `routes(defs)` | `Router` | Register multiple route definitions |
| `get(path, handler)` | `Router` | Register a route with inline handler |
| `on(path, handler, extras?)` | `Router` | Like `get()`, but accepts `name`, `data`, `middleware` |
| `group(prefix, mw?, definer)` | `Router` | Register a group of routes under a shared prefix |
| `start()` | `Router` | Start listening for navigation events |
| `stop()` | `Router` | Stop listening for navigation events |
| `navigate(path, options?)` | `Promise<void>` | Navigate to a path |
| `navigateTo(name, params?, options?)` | `Promise<void>` | Navigate to a named route |
| `url(nameOrPattern, params?, query?)` | `string` | Build a URL from a path pattern or named route |
| `isActive(nameOrPattern)` | `boolean` | Check if a pattern or named route matches the current path |
| `getState()` | `RouteState` | Get the current route state |
| `subscribe(listener)` | `() => void` | Subscribe to route changes; returns an unsubscribe function |
| `debug()` | `object` | Inspect registered routes |

## Documentation

Full docs at **[vielzeug.dev/routeit](https://vielzeug.dev/routeit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/routeit/usage) | Routes, navigation, middleware, groups |
| [API Reference](https://vielzeug.dev/routeit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/routeit/examples) | Real-world routing patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
