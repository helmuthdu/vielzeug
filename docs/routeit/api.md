---
title: Routeit — API Reference
description: Complete API reference for the declarative Routeit router.
---

[[toc]]

## At a Glance

| Symbol | Purpose |
| --- | --- |
| `createRouter({ routes, ...options })` | Create a router from a route table |
| `createBrowserHistory()` | Create the default browser history driver |
| `router.navigate({ name, ... })` | Navigate by route name |
| `router.navigate({ path })` | Navigate by raw path target |
| `router.url(name, params?, query?)` | Build a URL for a named route |

## `createRouter(options)`

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({
  base: '/app',
  routes: {
    home: { path: '/', handler: () => renderHome() },
    dashboard: {
      path: '/dashboard',
      children: {
        index: { index: true, handler: () => renderDashboardHome() },
        settings: { path: 'settings', data: () => fetchSettings(), handler: ({ data }) => renderSettings(data) },
      },
    },
    notFound: { path: '*', handler: () => renderNotFound() },
  },
});
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `base` | `string` | `'/'` | Base path prefix for all routes |
| `history` | `HistoryDriver` | `createBrowserHistory()` | History source used for reading locations and writing navigations |
| `middleware` | `Middleware[]` | `[]` | Global middleware prepended to every route |
| `routes` | `RouteTable` | required | Declarative route table. Object key order defines match precedence. |
| `viewTransition` | `boolean` | `false` | Wrap navigations in the View Transition API when available |

**Returns:** `Router`

## Route Table

Define routes as a plain object where keys become route names. TypeScript will infer route params from literal `path` strings.

```ts
const routes = {
  home: { path: '/' },
  userDetail: { path: '/users/:id' },
  files: { path: '/files/:rest*' },
};
```

Nested routes are declared with `children`, and child names become compound names with dot notation.

## Route Definition

```ts
const routes = {
  home: {
    path: '/',
    handler: () => renderHome(),
  },
  dashboard: {
    path: '/dashboard',
    middleware: requireAuth,
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
    meta: { section: 'users' },
    data: async ({ params }) => fetchUser(params.id),
    handler: ({ data }) => renderUser(data),
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
| `path` | `string` | Route pattern. Supports static paths, `:param`, `:param*`, and `*`. Child paths are relative unless they start with `/`. |
| `children` | `Record<string, RouteDefinition>` | Nested child routes. Child names are appended to the parent route name. |
| `index` | `boolean` | Default child route that inherits the parent path. |
| `data` | `DataFn` | Optional route data function. Runs after middleware and before the handler. |
| `handler` | `RouteHandler` | Optional terminal handler |
| `middleware` | `Middleware[]` | Optional route-specific middleware |
| `meta` | `unknown` | Static metadata exposed on `router.state.matches.at(-1)?.meta` |

## `createBrowserHistory()`

```ts
import { createBrowserHistory } from '@vielzeug/routeit';

const history = createBrowserHistory();
```

Create the default `HistoryDriver` used by Routeit. Pass a custom driver to `createRouter({ history })` when you need memory-backed navigation for tests or a framework adapter.

## `Router`

### Lifecycle

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

Named routes stay the primary API, but `navigate()` also accepts raw path targets.

```ts
await router.navigate({ path: '/marketing?utm_source=campaign' });
await router.navigate({ path: '/checkout#payment' }, { replace: true });
```

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
router.resolve('/app/dashboard/settings');
// => [
//      { name: 'dashboard', ... },
//      { name: 'dashboard.settings', ... },
//    ]
```

Resolve a pathname without running middleware, handlers, or subscribers. Returns the matched branch from root to leaf.

**Returns:** `ResolvedRoute | null`

### State

#### `router.state`

Current immutable route snapshot.

```ts
const { location, matches, status } = router.state;

location.pathname;
location.query;
location.hash;
```

#### `router.subscribe(listener)`

```ts
const unsubscribe = router.subscribe((state) => {
  const leaf = state.matches.at(-1);
  document.title = (leaf?.meta as { title?: string } | undefined)?.title ?? 'App';
});
```

The listener runs immediately with the current state, then after each successful navigation.

**Returns:** `() => void`

## Core Types

### `RouteContext<Params, Meta>`

```ts
type RouteContext<Params extends RouteParams = RouteParams> = {
  readonly data?: unknown;
  readonly hash: string;
  locals: Record<string, unknown>;
  readonly navigate: (target: NavigationTarget, options?: NavigateOptions) => Promise<void>;
  readonly params: Params;
  readonly pathname: string;
  readonly query: QueryParams;
};
```

`ctx.data` is only populated for the final route handler.

### `DataFn<Params, Meta>`

```ts
type DataFn<Params extends RouteParams = RouteParams, Meta = unknown> = (
  context: DataContext<Params, Meta>,
) => unknown | Promise<unknown>;
```

### `DataContext<Params, Meta>`

```ts
type DataContext<Params extends RouteParams = RouteParams, Meta = unknown> = RouteContext<Params, Meta> & {
  readonly signal: AbortSignal;
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

If a route defines `data`, middleware still runs first. The effective order is global middleware, route middleware, data, then handler.

### `NavigationTarget`

```ts
type NavigationTarget = {
  path: string;
} | {
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

### `RouteState`

```ts
type RouteState = {
  readonly location: {
    readonly hash: string;
    readonly pathname: string;
    readonly query: QueryParams;
  };
  readonly matches: readonly RouteMatch[];
  readonly status: 'idle' | 'loading' | 'error';
};
```

### `RouteMatch`

```ts
type RouteMatch = {
  readonly data: unknown;
  readonly meta: unknown;
  readonly name: string;
  readonly params: RouteParams;
  readonly pathname: string;
};
```

### `ResolvedRoute`

```ts
type ResolvedRoute = readonly RouteMatch[];
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
