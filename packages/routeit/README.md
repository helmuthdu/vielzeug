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
- ✅ **Middleware** — intercept every navigation
- ✅ **Programmatic navigation** — `navigate()`, `back()`, `forward()`, `go(n)`
- ✅ **URL builder** — `buildUrl(path, params?, query?)`
- ✅ **Not-found handler** — catch-all for unmatched routes
- ✅ **Framework-agnostic** — works with any UI library

## Usage

### Defining Routes

```typescript
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({ mode: 'history', base: '/app' });

// Inline handler
router.get('/', (ctx) => console.log('Home', ctx));

// Route definition object
router.route({ path: '/about', handler: () => showAbout() });

// Multiple routes at once
router.routes([
  { path: '/login',  handler: showLogin },
  { path: '/logout', handler: doLogout },
]);

router.start();
```

### Route Context

```typescript
router.get('/users/:id', (ctx) => {
  ctx.params.id;      // dynamic segment
  ctx.query.page;     // ?page=2
  ctx.path;           // full path string
  ctx.state;          // history.state value
});
```

### Programmatic Navigation

```typescript
// Navigate to path
router.navigate('/users/42');
router.navigate('/users/42', { state: { from: '/' } });

// History controls
router.back();
router.forward();
router.go(-2);

// Build a URL without navigating
const url = router.buildUrl('/users/:id', { id: '42' }, { tab: 'profile' });
// → '/users/42?tab=profile'
```

### Middleware

```typescript
const router = createRouter({
  mode: 'history',
  middleware: [
    async (ctx, next) => {
      if (!isLoggedIn() && ctx.path !== '/login') {
        router.navigate('/login');
        return;
      }
      await next();
    },
  ],
});
```

### Not Found

```typescript
const router = createRouter({
  notFound: (ctx) => renderNotFound(ctx.path),
});
```

## API

### `createRouter(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'history' \| 'hash'` | `'history'` | Routing mode |
| `base` | `string` | `''` | Base path prefix |
| `notFound` | `(ctx) => void` | — | Handler for unmatched routes |
| `middleware` | `Middleware[]` | `[]` | Array of middleware functions |

### Router Methods

| Method | Description |
|---|---|
| `get(path, handler)` | Register a route handler |
| `route(def)` | Register a route definition object |
| `routes(defs)` | Register multiple route definitions |
| `start()` | Start listening for navigation |
| `stop()` | Stop the router |
| `navigate(path, options?)` | Navigate to a path |
| `back()` | Go back in history |
| `forward()` | Go forward in history |
| `go(n)` | Move n steps in history |
| `buildUrl(path, params?, query?)` | Build a URL string |

## Documentation

Full docs at **[vielzeug.dev/routeit](https://vielzeug.dev/routeit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/routeit/usage) | Routes, navigation, middleware |
| [API Reference](https://vielzeug.dev/routeit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/routeit/examples) | Real-world routing patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
