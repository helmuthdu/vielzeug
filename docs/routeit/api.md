---
title: Routeit — API Reference
description: Complete API reference for the declarative Routeit v3 router.
---

# Routeit API Reference

[[toc]]

## At a Glance

| Symbol | Purpose |
| --- | --- |
| `createRouter({ routes, ...options })` | Create a router from a route table |
| `defineRoutes(routes)` | Preserve literal route definitions for better inference |
| `router.navigate({ name, ... })` | Navigate by route name |
| `router.url(name, params?, query?)` | Build a URL for a named route |
| `router.pushPath(path)` | Push a raw path when it does not belong in the route table |
| `router.replacePath(path)` | Replace the current history entry with a raw path |

## `createRouter(options)`

```ts
import { createRouter, defineRoutes } from '@vielzeug/routeit';

const router = createRouter({
  base: '/app',
  routes: defineRoutes({
    home: { path: '/', handler: () => renderHome() },
    userDetail: { path: '/users/:id', handler: ({ params }) => renderUser(params.id) },
    notFound: { path: '*', handler: () => renderNotFound() },
  }),
});
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `base` | `string` | `'/'` | Base path prefix for all routes |
| `middleware` | `Middleware \| Middleware[]` | `[]` | Global middleware prepended to every route |
| `routes` | `RouteTable` | required | Declarative route table. Object key order defines match precedence. |
| `viewTransition` | `boolean` | `false` | Wrap navigations in the View Transition API when available |
| `autoStart` | `boolean` | `false` | Start listening and handle the current URL immediately |

**Returns:** `Router`

## `defineRoutes(routes)`

```ts
const routes = defineRoutes({
  home: { path: '/' },
  userDetail: { path: '/users/:id' },
  files: { path: '/files/:rest*' },
});
```

Use this helper when you want TypeScript to preserve each route's literal `path` string so `params` inference flows into handlers, `navigate()`, and `url()`.

## Route Table Shape

```ts
const routes = defineRoutes({
  home: {
    path: '/',
    handler: () => renderHome(),
  },
  dashboard: {
    path: '/dashboard',
    middleware: requireAuth,
    handler: () => renderDashboard(),
  },
  userDetail: {
    path: '/users/:id',
    meta: { section: 'users' },
    handler: ({ params, meta }) => renderUser(params.id, meta),
  },
  notFound: {
    path: '*',
    handler: () => renderNotFound(),
  },
});
```

Each route definition supports these fields:

| Field | Type | Description |
| --- | --- | --- |
| `path` | `string` | Route pattern. Supports static paths, `:param`, `:param*`, and `*`. |
| `handler` | `RouteHandler` | Optional terminal handler |
| `middleware` | `Middleware \| Middleware[]` | Optional route-specific middleware |
| `meta` | `unknown` | Static metadata exposed on `ctx.meta` and `router.state.meta` |

## `Router`

### Lifecycle

#### `router.start()`

Start listening for `popstate` and handle the current URL once.

**Returns:** `this`

#### `router.stop()`

Stop reacting to `popstate`. The router instance remains usable.

**Returns:** `void`

#### `router.dispose()`

Remove listeners, clear subscribers, and reject future router interaction.

**Returns:** `void`

### Navigation

#### `router.navigate(target, options?)`

```ts
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userDetail', params: { id: '42' } }, { replace: true });
await router.navigate({ name: 'search', query: { q: 'routeit' }, hash: 'results' });
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `replace` | `boolean` | `false` | Use `replaceState` instead of `pushState` |
| `state` | `unknown` | — | History state payload |
| `viewTransition` | `boolean` | — | Override the router-level setting for this navigation |
| `force` | `boolean` | `false` | Re-run even when the destination URL is already current |

**Returns:** `Promise<void>`

Named navigation is the primary API. If you need a one-off destination outside the route table, use `pushPath()` or `replacePath()`.

#### `router.pushPath(path, options?)`

```ts
await router.pushPath('/marketing?utm_source=campaign');
```

Push a raw path to history and run the matching route.

#### `router.replacePath(path, options?)`

```ts
await router.replacePath('/checkout#payment');
```

Replace the current history entry with a raw path and run the matching route.

### Route Helpers

#### `router.url(name, params?, query?)`

```ts
router.url('userDetail', { id: '42' });
router.url('userDetail', { id: '42' }, { tab: 'profile' });
```

Build a base-aware URL for a named route.

**Returns:** `string`

#### `router.isActive(name, exact?)`

```ts
router.isActive('userDetail');
router.isActive('users', false);
```

Check whether the current pathname matches a named route exactly or by prefix.

**Returns:** `boolean`

#### `router.resolve(pathname)`

```ts
router.resolve('/app/users/42');
// => { name: 'userDetail', params: { id: '42' }, meta: { section: 'users' } }
```

Resolve a pathname without running middleware, handlers, or subscribers.

**Returns:** `ResolvedRoute | null`

### State

#### `router.state`

Current immutable route snapshot.

```ts
const { pathname, params, query, hash, name, meta } = router.state;
```

#### `router.subscribe(listener)`

```ts
const unsubscribe = router.subscribe((state) => {
  document.title = (state.meta as { title?: string } | undefined)?.title ?? 'App';
});
```

The listener runs immediately with the current state, then after each successful navigation.

**Returns:** `() => void`

## Core Types

### `RouteContext<Params, Meta>`

```ts
type RouteContext<Params extends RouteParams = RouteParams, Meta = unknown> = {
  readonly hash: string;
  locals: Record<string, unknown>;
  readonly meta?: Meta;
  readonly navigate: (target: NavigationTarget, options?: NavigateOptions) => Promise<void>;
  readonly params: Params;
  readonly pathname: string;
  readonly pushPath: (path: string, options?: PathNavigateOptions) => Promise<void>;
  readonly query: QueryParams;
  readonly replacePath: (path: string, options?: PathNavigateOptions) => Promise<void>;
};
```

### `RouteHandler<Params, Meta>`

```ts
type RouteHandler<Params extends RouteParams = RouteParams, Meta = unknown> = (
  context: RouteContext<Params, Meta>,
) => void | Promise<void>;
```

### `Middleware<Meta>`

```ts
type Middleware<Meta = unknown> = (
  context: RouteContext<RouteParams, Meta>,
  next: () => Promise<void>,
) => void | Promise<void>;
```

Middleware ordering is simple: global middleware first, then route middleware, then the handler.

### `NavigationTarget`

```ts
type NavigationTarget = {
  hash?: string;
  name: string;
  params?: RouteParams;
  query?: QueryParams;
};
```

### `NavigateOptions`

```ts
type NavigateOptions = {
  force?: boolean;
  replace?: boolean;
  state?: unknown;
  viewTransition?: boolean;
};
```

### `PathNavigateOptions`

```ts
type PathNavigateOptions = Omit<NavigateOptions, 'replace'>;
```

### `RouteState`

```ts
type RouteState = {
  readonly hash: string;
  readonly meta?: unknown;
  readonly name?: string;
  readonly params: RouteParams;
  readonly pathname: string;
  readonly query: QueryParams;
};
```

### `ResolvedRoute`

```ts
type ResolvedRoute = {
  readonly meta?: unknown;
  readonly name?: string;
  readonly params: RouteParams;
};
```

### `PathParams<T>`

```ts
type UserParams = PathParams<'/users/:id'>;
// => { readonly id: string }

type FileParams = PathParams<'/files/:rest*'>;
// => { readonly rest: string }
```

## Pattern Rules

| Pattern | Example | Meaning |
| --- | --- | --- |
| `/about` | `/about` | Exact static path |
| `/users/:id` | `/users/42` | Single named param |
| `/users/:userId/posts/:postId` | `/users/1/posts/2` | Multiple named params |
| `/docs/*` | `/docs/guide/intro` | Wildcard suffix without a named capture |
| `/files/:rest*` | `/files/a/b/c` | Wildcard suffix captured as one named param |
| `*` | anything | Global catch-all |

## Design Notes

- Routeit no longer exposes imperative registration methods like `on()`, `group()`, or `use()`.
- Route names come from the route-table object keys.
- Not-found handling is just another route, typically `path: '*'`.
- Error handling is best implemented as middleware that wraps `await next()`.
