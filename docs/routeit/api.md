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
| `createMemoryHistory(initialPath?)` | Create an in-memory history driver (SSR / tests) |
| `redirectTo(target, options?)` | Build redirect middleware for guard flows |
| `router.navigate({ name, ... })` | Navigate by route name |
| `router.navigate({ path })` | Navigate by raw path target |
| `router.url(name, params?, query?)` | Build a URL for a named route |
| `router.preload(name, params?)` | Eagerly run data loaders without navigating |
| `router.beforeLeave(blocker)` | Register a leave guard |

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
| `onError` | `(error, context) => void` | — | Optional sink for non-awaited/background router errors (`initial-navigation`, `history-listener`, `preload`) |
| `routes` | `RouteTable` | required | Declarative route table. Object key order defines match precedence. |
| `scroll` | `(to, from) => ScrollDecision` | — | Called after each navigation. Return `'top'` to scroll to top, `'preserve'` to keep the current position, or `{ x, y }` for a specific position. |
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
| `lazy` | `() => Promise<{ handler?, data?, meta? }>` | Lazy-load the route module. Called once; result replaces `handler`, `data`, and `meta` in place. |
| `middleware` | `Middleware[]` | Optional route-specific middleware |
| `meta` | `unknown` | Static metadata exposed on `router.state.matches.at(-1)?.meta` |
| `redirect` | `NavigationTarget` | Declarative redirect. Resolved before middleware runs; uses `replaceState` so the original URL is never added to history. |
| `coerceSearch` | `(raw: QueryParams) => QueryParams` | Coerce search params. Return value replaces `ctx.query`. Throwing leaves the raw query unchanged. |

## `createBrowserHistory()`

```ts
import { createBrowserHistory } from '@vielzeug/routeit';

const history = createBrowserHistory();
```

Create the default `HistoryDriver` backed by the browser History API.

## `createMemoryHistory(initialPath?)`

```ts
import { createMemoryHistory } from '@vielzeug/routeit';

// Tests
const router = createRouter({
  history: createMemoryHistory('/dashboard'),
  routes,
});

// SSR
const router = createRouter({
  history: createMemoryHistory(request.url),
  routes,
});
```

Create an in-memory `HistoryDriver`. No browser globals required — suitable for SSR, unit tests, and non-browser runtimes (Electron, Capacitor). The optional `initialPath` defaults to `'/'`.

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

#### `router.isActive(name, options?)`

```ts
router.isActive('userDetail');
router.isActive('users');
router.isActive('users', { exact: true });
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

**Returns:** `RouteMatchBranch | null`

#### `router.preload(name, params?)`

```ts
// Hover-prefetch
anchor.addEventListener('mouseenter', () => {
  router.preload('userDetail', { id: '42' });
});
```

Eagerly runs the data loaders for a named route without navigating. Useful for hover-prefetch. Concurrent calls for the same route+params are deduplicated. Results are discarded; a subsequent `navigate()` will run the loaders again with a fresh `AbortSignal`.

**Returns:** `Promise<void>`

#### `router.beforeLeave(blocker)`

```ts
// Guard unsaved-changes forms
const remove = router.beforeLeave(async () => {
  if (!form.isDirty) return true;
  return confirm('Leave without saving?');
});

// Remove the guard when the form unmounts
remove();
```

Register a leave guard called before user-triggered navigation attempts. Return `true` to allow, `false` to cancel. Multiple guards can be registered; navigation is blocked if any guard returns `false`. Internal declarative redirects bypass leave guards.

**Returns:** `() => void`

## `redirectTo(target, options?)`

```ts
import { redirectTo } from '@vielzeug/routeit';

const requireAuth = redirectTo({ name: 'login' }, { replace: true });
```

Creates middleware that performs a redirect and short-circuits the chain.

**Returns:** `Middleware`

### State

#### `router.state`

Current immutable route snapshot.

```ts
const { location, matches, status, error } = router.state;

location.pathname;
location.query;
location.hash;
location.historyState; // value passed to navigate({ ... }, { state: ... })

// When status === 'error':
console.error(error);
```

`error` is only set when `status === 'error'`. It holds the exact value thrown by the failing `data()` function.

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

### `RouteContext<Params, TRoutes>`

```ts
type RouteContext<
  Params extends RouteParams = RouteParams,
  TRoutes extends RouteTable = RouteTable,
> = {
  readonly data?: unknown;
  readonly hash: string;
  /** State stored on the history entry that triggered this navigation. */
  readonly historyState: unknown;
  locals: Record<string, unknown>;
  readonly matches: RouteMatchBranch;
  readonly navigate: (
    target: NamedNavigationTarget<TRoutes> | RawNavigationTarget,
    options?: NavigateOptions,
  ) => Promise<void>;
  readonly params: Params;
  readonly pathname: string;
  readonly query: QueryParams;
};
```

`ctx.data` is only populated for the final route handler.

Read route metadata from the leaf match: `ctx.matches.at(-1)?.meta`.

### `DataFn<Params, TRoutes>`

```ts
type DataFn<
  Params extends RouteParams = RouteParams,
  TRoutes extends RouteTable = RouteTable,
> = (
  context: DataContext<Params, TRoutes>,
) => unknown | Promise<unknown>;
```

### `DataContext<Params, TRoutes>`

```ts
type DataContext<
  Params extends RouteParams = RouteParams,
  TRoutes extends RouteTable = RouteTable,
> = RouteContext<Params, TRoutes> & {
  readonly signal: AbortSignal;
};
```

### `RouteHandler<Params, TRoutes>`

```ts
type RouteHandler<
  Params extends RouteParams = RouteParams,
  TRoutes extends RouteTable = RouteTable,
> = (
  context: RouteContext<Params, TRoutes>,
) => void | Promise<void>;
```

### `Middleware<TRoutes>`

```ts
type Middleware<TRoutes extends RouteTable = RouteTable> = (
  context: RouteContext<RouteParams, TRoutes>,
  next: () => Promise<void>,
) => void | Promise<void>;
```

Middleware ordering is simple: global middleware first, then route middleware, then the handler.

If a route defines `data`, middleware still runs first. The effective order is global middleware, route middleware, data, then handler.

### `UntypedNamedNavigationTarget`

```ts
type UntypedNamedNavigationTarget = {
  hash?: string;
  name: string;
  params?: RouteParams;
  query?: QueryParams;
};
```

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
  /** The value thrown by a `data()` function. Only set when `status === 'error'`. */
  readonly error?: unknown;
  readonly location: RouteLocation;
  readonly matches: readonly RouteMatch[];
  readonly status: 'idle' | 'loading' | 'error';
};

type RouteLocation = {
  readonly hash: string;
  /** State stored on the history entry that triggered this navigation. */
  readonly historyState: unknown;
  readonly pathname: string;
  readonly query: QueryParams;
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

### `RouteMatchBranch`

```ts
type RouteMatchBranch = readonly RouteMatch[];
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
- Error handling is middleware that wraps `await next()`. The thrown error is also stored on `router.state.error`.
- Declarative `redirect` on a route definition is distinct from the `redirectTo()` middleware helper. The former is for permanent alias redirects; the latter for conditional guards.
- `lazy` factories are called at most once per `RouteRecord`. The loaded handler/data/meta are stored directly on the branch def.
