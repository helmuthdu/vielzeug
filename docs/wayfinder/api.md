---
title: Wayfinder — API Reference
description: Complete API reference for Wayfinder.
---

[[toc]]

## API At a Glance

| Symbol | Purpose | Execution mode | Common gotcha |
| ------ | ------- | -------------- | ------------- |
| `createRouter(options)` | Create a router from a route table | Sync | Initial navigation starts asynchronously in the constructor |
| `createBrowserHistory()` | Create the default browser history driver | Sync | — |
| `createMemoryHistory(initialPath?)` | Create an in-memory history driver | Sync | — |
| `redirectTo(target, options?)` | Build redirect middleware | Sync (returns fn) | Does not call `next()` — always short-circuits the chain |
| `router.navigate(target, options?)` | Navigate to a named route or raw path | Async | No-op when destination equals current URL unless `force: true` |
| `router.getSnapshot()` | Return the current immutable route state | Sync | Does not subscribe — call `subscribe()` to react to changes |
| `router.subscribe(listener)` | Register a listener for state changes | Sync (returns unsub) | Listener is **not** called immediately with current state |
| `router.url(name, params?, query?)` | Build a URL for a named route | Sync | Throws if the route name is unknown |
| `router.isActive(name, options?)` | Check if a named route matches the current URL | Sync | Compares against the current snapshot pathname, not `history.location` directly |
| `router.resolve(pathname)` | Resolve a pathname to a branch without side effects | Sync | Returns `null` for redirect routes |
| `router.match(url, options?)` | Resolve a URL to a full state including data loaders | Async | Lazy modules are resolved as a side effect |
| `router.preload(name, params?)` | Eagerly run data loaders without navigating | Async | Results are consumed on the first matching navigation; different query params use a separate cache entry |
| `router.waitFor(name)` | Wait for the router to settle on a named route | Async | Rejects immediately if `status === 'error'` |
| `router.beforeLeave(blocker, options?)` | Register a global leave guard | Sync (returns unsub) | Scoped to specific routes via `options.routes` |
| `router.dispose()` | Remove listeners and shut down the router | Sync | Idempotent — safe to call multiple times |

## Package Entry Points

| Import                        | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `@vielzeug/wayfinder`         | Main exports and types                        |
| `@vielzeug/wayfinder/debug`   | `debugRouter` — navigation logger (dev only)  |

## `createRouter(options)`

```ts
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  base: '/app',
  routes: {
    home: { path: '/' },
    dashboard: {
      path: '/dashboard',
      children: {
        index: { index: true },
        settings: { path: 'settings', data: () => fetchSettings() },
      },
    },
  },
  notFound: { component: NotFoundPage },
});
```

| Option           | Type                           | Default                  | Description                                                                                                                                      |
| ---------------- | ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `base`           | `string`                       | `'/'`                    | Base path prefix for all routes                                                                                                                  |
| `history`        | `HistoryDriver`                | `createBrowserHistory()` | History source used for reading locations and writing navigations                                                                                |
| `middleware`     | `Middleware[]`                 | `[]`                     | Global middleware prepended to every route                                                                                                       |
| `notFound`       | `Pick<ContentRouteDefinition, 'component' \| 'data' \| 'meta' \| 'middleware'>` | — | Synthetic route used when no path matches. Global middleware runs first, then `notFound.middleware` and `notFound.data`. |
| `onError`        | `(error, context) => void`     | —                        | Optional sink for non-awaited/background router errors                                                                                          |
| `routes`         | `RouteTable`                   | required                 | Declarative route table. Object key order defines match precedence.                                                                              |
| `scroll`         | `(to, from) => ScrollDecision` | —                        | Called after each navigation. Return `'top'` to scroll to top, `'preserve'` to keep the current position, or `{ x, y }` for a specific position. |
| `viewTransition` | `boolean`                      | `false`                  | Wrap navigations in the View Transition API when available                                                                                       |

**Returns:** `Router`

---

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
  home: { path: '/' },
  dashboard: {
    path: '/dashboard',
    middleware: [requireAuth],
    children: {
      index: { index: true },
      settings: {
        path: 'settings',
        data: async () => fetchSettings(),
      },
    },
  },
  userDetail: {
    path: '/users/:id',
    meta: { section: 'users' },
    data: async ({ params }) => fetchUser(params.id),
    onError: (error) => ({ error, user: null }),
  },
};
```

Each route definition supports these fields:

| Field          | Type                                        | Description                                                                                                               |
| -------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `path`         | `string`                                    | Wayfinder pattern. Supports static paths, `:param`, `:param*`, and `*`. Child paths are relative unless they start with `/`.  |
| `children`     | `Record<string, RouteDefinition>`           | Nested child routes. Child names are appended to the parent route name.                                                   |
| `index`        | `boolean`                                   | Default child route that inherits the parent path.                                                                        |
| `component`    | `unknown`                                   | Optional framework view payload exposed on the leaf `RouteMatch`.                                                         |
| `data`         | `DataFn`                                    | Data loader. Runs after middleware; result available as `match.data`. Supports streaming via `AsyncGenerator`.             |
| `lazy`         | `() => Promise<{ data?, component?, meta? }>` | Lazy-load the route module. Called once on first navigation; result overrides static fields in the hydration cache.     |
| `meta`         | `unknown`                                   | Static metadata exposed on each `RouteMatch` in the branch.                                                               |
| `middleware`   | `Middleware[]`                              | Optional route-specific middleware                                                                                        |
| `onError`      | `(error, context: DataContext) => MaybePromise<unknown>` | Per-route error boundary for data loader failures. Return value becomes `match.data` for degraded rendering. |
| `redirect`     | `NavigationTarget`                          | Declarative redirect. Resolved before middleware runs; uses `replaceState` so the original URL is never added to history. |
| `coerceSearch` | `(raw: QueryParams) => ResolvedQueryParams` | Coerce raw URL string values into typed values. Return value replaces `ctx.query`. Throwing leaves the parsed query unchanged. |

## `createBrowserHistory()`

```ts
import { createBrowserHistory } from '@vielzeug/wayfinder';

const history = createBrowserHistory();
```

Create the default `HistoryDriver` backed by the browser History API.

## `createMemoryHistory(initialPath?)`

```ts
import { createMemoryHistory } from '@vielzeug/wayfinder';

// Tests
const router = createRouter({
  history: createMemoryHistory('/dashboard'),
  routes,
});

// Controlled non-browser runtime
const router = createRouter({
  history: createMemoryHistory('/request-path'),
  routes,
});
```

Create an in-memory `HistoryDriver`. No browser history globals required — suitable for unit tests and controlled non-browser runtimes. The optional `initialPath` defaults to `'/'`.

## `Router`

### Lifecycle

#### `router.dispose()`

Remove listeners, clear subscribers, and reject future router interaction.

**Returns:** `void`

---

### Navigation

#### `router.navigate(target, options?)`

```ts
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userDetail', params: { id: '42' } }, { replace: true });
await router.navigate({ name: 'search', query: { q: 'wayfinder' }, hash: 'results' });
```

| Option           | Type      | Default | Description                                             |
| ---------------- | --------- | ------- | ------------------------------------------------------- |
| `replace`        | `boolean` | `false` | Use `replaceState` instead of `pushState`               |
| `state`          | `unknown` | —       | History state payload                                   |
| `viewTransition` | `boolean` | —       | Override the router-level setting for this navigation   |
| `force`          | `boolean` | `false` | Re-run even when the destination URL is already current |

**Returns:** `Promise<void>`

Named routes stay the primary API, but `navigate()` also accepts raw path targets.

```ts
await router.navigate({ path: '/marketing?utm_source=campaign' });
await router.navigate({ path: '/checkout#payment' }, { replace: true });
```

---

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

Resolve a pathname without running middleware, handlers, data loaders, or subscribers. Strips the configured `base` automatically. Returns the matched branch from root to leaf, or `null` for redirect routes and no-match.

**Returns:** `RouteMatchBranch | null`

---

#### `router.match(url, options?)`

```ts
// SSR data prefetch
const state = await router.match('/users/42');

// With cancellation
const controller = new AbortController();
const state = await router.match('/dashboard', { signal: controller.signal });
```

Resolve a full URL to a `RouteState` including data loader results, without modifying router state or history. Follows declarative redirects (up to five hops) and resolves lazy modules as a side effect. Returns `null` for unmatched URLs.

When a `data()` function throws, the returned state has `status: 'error'` and `error` set to the thrown value.

**Returns:** `Promise<RouteState | null>`

---

#### `router.waitFor(name)`

```ts
// Navigate and wait for data to settle
await router.navigate({ name: 'userDetail', params: { id: '42' } });
const state = await router.waitFor('userDetail');
const user = state.matches.at(-1)?.data;

// Useful in tests with memory history:
const history = createMemoryHistory('/dashboard');
const router = createRouter({ history, routes });
const state = await router.waitFor('dashboard');
```

Waits for the router to reach `status: 'idle'` with the named route active in the matched branch. Rejects immediately if `status === 'error'`. Resolves immediately if the router is already idle on the target route. Also rejects if `router.dispose()` is called while the promise is pending.

**Returns:** `Promise<RouteState>`

---

#### `router.preload(name, params?)`

```ts
// Hover-prefetch
anchor.addEventListener('mouseenter', () => {
  router.preload('userDetail', { id: '42' });
});
```

Eagerly runs the data loaders for a named route without navigating. Useful for hover-prefetch. Concurrent calls for the same route+params are deduplicated. Results are consumed on the next navigation to the same route; a second navigation (or a navigation with different query params) runs the loaders fresh with a new `AbortSignal`.

**Returns:** `Promise<void>`

---

#### `router.beforeLeave(blocker)`

```ts
// Guard unsaved-changes forms
const remove = router.beforeLeave(async (destination) => {
  if (!form.isDirty) return true;
  return confirm(`Leave without saving? (going to ${destination.pathname})`);
});

// Remove the guard when the form unmounts
remove();
```

Register a global leave guard called before user-triggered navigation attempts. Return `true` to allow, `false` to cancel. Multiple guards can be registered; navigation is blocked if any guard returns `false`.

Scope a guard to fire only when navigating away from a specific route:

```ts
router.beforeLeave(
  async () => confirm('Discard changes?'),
  { routes: ['editor'] },
);
```

Declarative `redirect` routes bypass all leave guards.

**Returns:** `() => void`

---

## `redirectTo(target, options?)`

```ts
import { redirectTo } from '@vielzeug/wayfinder';

const requireAuth = redirectTo({ name: 'login' }, { replace: true });
```

Creates middleware that navigates to `target` and short-circuits the middleware chain (does not call `next()`). Useful for auth guards and route aliases in middleware.

For permanent declarative redirects (URL aliases), use the `redirect` field on the route definition instead.

**Returns:** `Middleware`

---

### State

#### `router.getSnapshot()`

Returns the current immutable route state snapshot. Use this to read state synchronously. Compatible with React's `useSyncExternalStore`:

```ts
const state = useSyncExternalStore(
  (cb) => router.subscribe(cb),
  () => router.getSnapshot(),
);
```

```ts
const { location, matches, status, error } = router.getSnapshot();

location.pathname;
location.query;        // raw parsed query (QueryParams) — always string values
location.hash;
location.historyState; // value passed to navigate({ ... }, { state: ... })

// When status === 'error':
console.error(error);
```

`error` is only set when `status === 'error'`. It holds the exact value thrown by the failing `data()` function.

**Returns:** `RouteState`

#### `router.subscribe(listener)`

```ts
const unsubscribe = router.subscribe((state) => {
  const leaf = state.matches.at(-1);
  document.title = (leaf?.meta as { title?: string } | undefined)?.title ?? 'App';
});
```

Register a listener that is called after each subsequent state change. The listener is **not** called immediately — use `router.getSnapshot()` to read the current state synchronously.

**Returns:** `() => void`

---

## Types

### `RouteContext<Params, TRoutes>`

Context passed to middleware and data loader functions.

```ts
type RouteContext<Params extends RouteParams = RouteParams, TRoutes extends RouteTable = RouteTable> = {
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
  readonly query: ResolvedQueryParams;
};
```

Read route metadata from the leaf match: `ctx.matches.at(-1)?.meta`.

`ctx.locals` is mutable and shared across the entire middleware chain for one navigation. Use it to pass values from middleware to data loaders.

`ctx.query` is the coerced query (after `coerceSearch`). `router.getSnapshot().location.query` always contains raw string values from URL parsing.

### `DataFn<Params, TRoutes>`

```ts
type DataFn<Params extends RouteParams = RouteParams, TRoutes extends RouteTable = RouteTable> = (
  context: DataContext<Params, TRoutes>,
) => DataStream | MaybePromise<unknown>;
```

Return an `AsyncGenerator` to stream partial results (see `DataStream`).

### `DataContext<Params, TRoutes>`

```ts
type DataContext<Params extends RouteParams = RouteParams, TRoutes extends RouteTable = RouteTable> = RouteContext<
  Params,
  TRoutes
> & {
  readonly signal: AbortSignal;
};
```

### `DataStream<T>`

```ts
type DataStream<T = unknown> = AsyncGenerator<T, T>;
```

Return a `DataStream` from a `data()` function to stream partial results. Each `yield` updates `match.data` immediately with `match.status: 'streaming'`. The `return` value is the final settled data with `match.status: 'idle'`.

```ts
data: async function* ({ signal }) {
  const items: Item[] = [];
  for await (const batch of streamBatches({ signal })) {
    items.push(...batch);
    yield items;   // partial — status: 'streaming'
  }
  return items;    // final  — status: 'idle'
},
```

### `Middleware<TRoutes>`

```ts
type Middleware<TRoutes extends RouteTable = RouteTable> = (
  context: RouteContext<RouteParams, TRoutes>,
  next: () => Promise<void>,
) => void | Promise<void>;
```

Middleware ordering is simple: global middleware first, then route middleware, then `data()`.

### `UntypedNamedNavigationTarget`

```ts
type UntypedNamedNavigationTarget = {
  hash?: string;
  name: string;
  params?: RouteParams;
  query?: ResolvedQueryParams;
};
```

### `NavigationTarget`

```ts
type NavigationTarget =
  | {
      path: string;
    }
  | {
      hash?: string;
      name: string;
      params?: RouteParams;
      query?: ResolvedQueryParams;
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
  readonly status: NavigationStatus;
};

type RouteLocation = {
  readonly hash: string;
  /** State stored on the history entry that triggered this navigation. */
  readonly historyState: unknown;
  readonly pathname: string;
  /** Raw parsed query params — always string values from URL parsing.
   * For coerced values (numbers, booleans), read `ctx.query` inside middleware or data loaders.
   */
  readonly query: QueryParams;
};
```

### `RouteMatch`

```ts
type RouteMatch = {
  readonly component: unknown;
  readonly data: unknown;
  readonly meta: unknown;
  readonly name: string;
  readonly params: RouteParams;
  readonly pathname: string;
  /** Per-node loading status. Reflects individual loader state in nested layouts. */
  readonly status: MatchStatus;
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

### `QueryParams`

```ts
type QueryParams = Record<string, string | string[]>;
```

Represents parsed URL query values before route-level coercion.

### `ResolvedQueryParams`

```ts
type ResolvedQueryValue = string | number | boolean;
type ResolvedQueryParams = Record<string, ResolvedQueryValue | ResolvedQueryValue[]>;
```

Represents the query object after optional `coerceSearch` normalization.

### `NavigationStatus`

```ts
type NavigationStatus = 'idle' | 'loading' | 'streaming' | 'error';
```

Top-level status of the router. `'streaming'` means at least one active data loader is an async generator and has yielded at least one value but has not yet returned.

### `MatchStatus`

```ts
type MatchStatus = NavigationStatus;
```

Per-node status on each `RouteMatch`. Alias of `NavigationStatus`; useful for nested layouts that want to show per-slot loading indicators.

### `RouteMiddleware<Path, TRoutes>`

```ts
type RouteMiddleware<Path extends string = string, TRoutes extends RouteTable = RouteTable> = (
  context: RouteContext<PathParams<Path>, TRoutes>,
  next: () => Promise<void>,
) => void | Promise<void>;
```

Typed variant of `Middleware` scoped to a route path. Provides typed `ctx.params` matching the path pattern.

```ts
const guard: RouteMiddleware<'/users/:id'> = (ctx, next) => {
  console.log(ctx.params.id); // string
  return next();
};
```

### `BeforeLeaveBlocker`

```ts
// Return true to allow navigation, false to cancel.
type BeforeLeaveBlocker = (destination: NavigationDestination) => MaybePromise<boolean>;
```

### `NavigationDestination`

```ts
type NavigationDestination = {
  readonly name?: string;    // route name if navigating to a named route
  readonly params: RouteParams;
  readonly pathname: string;
  readonly query: QueryParams;
};
```

Passed to every `beforeLeave` blocker. Use `destination.pathname` and `destination.query` to make context-aware allow/block decisions.

### `IsActiveOptions`

```ts
type IsActiveOptions = {
  /** Require an exact pathname match. Defaults to prefix matching. */
  exact?: boolean;
};
```

### `ScrollDecision`

```ts
type ScrollPosition = { x: number; y: number };
type ScrollDecision = ScrollPosition | 'preserve' | 'top';
```

### `RouterErrorContext`

```ts
type RouterErrorContext =
  | { routeName: string; source: 'data-loader' }   // data() threw
  | { routeName: string; source: 'middleware' }     // middleware threw
  | { source: 'coerce-search' | 'history-listener' | 'initial-navigation' | 'preload' };

type RouterErrorSource = RouterErrorContext['source'];
```

Passed to the `onError` callback in `createRouter` options. The `routeName` is present when the error originates from a named route's `data()` or `middleware`.

### `HistoryDriver`

```ts
interface HistoryDriver {
  readonly location: {
    readonly hash: string;
    readonly pathname: string;
    readonly search: string;
    readonly state: unknown;
  };
  push(url: string, state?: unknown): void;
  replace(url: string, state?: unknown): void;
  /** Subscribe to location changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}
```

### `Unsubscribe`

```ts
type Unsubscribe = () => void;
```

## Errors

Wayfinder does not export custom `Error` subclasses. All errors are thrown as native `Error` instances. The following error messages are thrown at runtime:

| Message | When |
| ------- | ---- |
| `[wayfinder] Router is disposed` | Calling `navigate()`, `subscribe()`, or `beforeLeave()` after `dispose()` |
| `[wayfinder] Unknown route name: X. Available routes: Y` | Navigating to or resolving an unregistered route name |
| `[wayfinder] Duplicate route name: X` | Two routes resolve to the same compound name during `createRouter()` |
| `[wayfinder] Redirect loop detected` | A declarative `redirect` chain exceeds 5 hops |
| `[wayfinder] Invalid param name ":X" in path "Y"` | A param name contains non-word characters (e.g., `:user-id`) |
| `[wayfinder] Wildcard "*" must be the final segment in path: X` | A `*` segment appears before the last segment |
| `[wayfinder] Wildcard param must be final segment in path: X` | A `:param*` greedy param appears before the last segment |

---

## Pattern Rules

| Pattern                        | Example             | Meaning                                     |
| ------------------------------ | ------------------- | ------------------------------------------- |
| `/about`                       | `/about`            | Exact static path                           |
| `/users/:id`                   | `/users/42`         | Single named param                          |
| `/users/:userId/posts/:postId` | `/users/1/posts/2`  | Multiple named params                       |
| `/docs/*`                      | `/docs/guide/intro` | Wildcard suffix without a named capture     |
| `/files/:rest*`                | `/files/a/b/c`      | Wildcard suffix captured as one named param |
| `*`                            | anything            | Global catch-all                            |

## `debugRouter(options)` <Badge type="tip" text="@vielzeug/wayfinder/debug" />

```ts
import { debugRouter } from '@vielzeug/wayfinder/debug';

const router = debugRouter({ routes });
// [wayfinder:nav] idle      /         [home]
// [wayfinder:nav] loading   /dashboard
// [wayfinder:nav] idle      /dashboard [dashboard.index]
```

Wraps `createRouter()` and attaches a `subscribe` listener that logs every navigation state change to `console.debug`. Returns the same `Router` instance — all methods are identical to `createRouter()`.

Import from the dedicated sub-path so the `console.debug` reference is tree-shaken from production bundles when not imported.

| Log format | When |
| --- | --- |
| `[wayfinder:nav] idle      /path  [routeName]` | Navigation settled |
| `[wayfinder:nav] loading   /path` | Data loaders in flight |
| `[wayfinder:nav] streaming /path  [routeName]` | Streaming loader emitting partial data |
| `[wayfinder:nav] error     /path  [routeName]  <Error>` | Navigation error |

## Design Notes

- Wayfinder no longer exposes imperative registration methods like `on()`, `group()`, or `use()`.
- Wayfinder names come from the route-table object keys.
- `data()` is the terminal action. Its return value becomes `match.data`. There is no separate `handler` step.
- For unmatched URLs, use the `notFound` router option rather than `path: '*'` in the route table.
- Error handling is middleware that wraps `await next()`. The thrown error is also stored on `router.getSnapshot().error`.
- Declarative `redirect` on a route definition is for permanent alias redirects. The `redirectTo()` middleware helper is for conditional guards.
- `lazy` factories are called at most once per `RouteRecord`. The loaded `data`/`component`/`meta` are stored in the router's internal hydration cache. `handler` is not accepted in the lazy-resolved module.
- `onError` in a route definition is a per-route data-loader boundary. If `onError` itself throws, the router falls through to `status: 'error'` as usual.
