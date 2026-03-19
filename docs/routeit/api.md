---
title: Routeit — API Reference
description: Complete API reference for Routeit with type signatures and parameter documentation.
---

# Routeit API Reference

[[toc]]

## API At a Glance

| Symbol              | Purpose                                 | Execution mode | Common gotcha                                        |
| ------------------- | --------------------------------------- | -------------- | ---------------------------------------------------- |
| `createRouter()`    | Create typed router with route handlers | Sync           | Call start() once after route registration           |
| `router.navigate()` | Navigate programmatically               | Async          | Await navigation when middleware performs async work |
| `router.buildUrl()` | Build links from named routes/params    | Sync           | Provide all required params for typed route patterns |

## `createRouter(options?)`

Factory function that creates a new `Router` instance.

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter();
const router = createRouter({ mode: 'hash', base: '/app' });
```

| Parameter                | Type                         | Default     | Description                                                                   |
| ------------------------ | ---------------------------- | ----------- | ----------------------------------------------------------------------------- |
| `options.mode`           | `RouterMode`                 | `'history'` | Routing mode — `'history'` uses the HTML5 History API, `'hash'` uses URL hash |
| `options.base`           | `string`                     | `'/'`       | Base path prefix for all routes in history mode                               |
| `options.onNotFound`     | `RouteHandler`               | —           | Called when no route matches the current URL                                  |
| `options.onError`        | `(error, ctx) => void`       | —           | Called when a handler or middleware throws                                    |
| `options.middleware`     | `Middleware \| Middleware[]` | `[]`        | Global middleware applied before every route                                  |
| `options.viewTransition` | `boolean`                    | `false`     | Wrap navigations in the View Transition API when available                    |
| `options.autoStart`      | `boolean`                    | `false`     | Start listening and handle the current URL immediately after construction     |

**Returns:** `Router`

## `Router`

### Route Registration

#### `router.on(path, handler, options?)`

Register a route with a handler. Path params are typed from the path literal.

```ts
router.on('/users/:id', ({ params }) => renderUser(params.id));
router.on('/users/:id', ({ params }) => renderUser(params.id), {
  name: 'userDetail',
  meta: { title: 'User' },
  middleware: requireAuth,
});
```

#### `router.on(path, options?)`

Register a middleware-only route. The handler is omitted; middleware still runs when the path matches.

```ts
router.on('/checkout/*', { middleware: requireAuth });
router.on('/api/*', { middleware: [rateLimit, logger] });
```

| Parameter            | Type                                   | Description                                                    |
| -------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `path`               | `Path extends string`                  | Path pattern — supports `:param`, `:param*`, and `*` wildcards |
| `handler`            | `RouteHandler<PathParams<Path>, Meta>` | Function called when the route matches                         |
| `options.name`       | `string`                               | Route name for `navigate({ name })`, `url()`, and `isActive()` |
| `options.meta`       | `Meta`                                 | Static metadata passed to `ctx.meta`                           |
| `options.middleware` | `Middleware \| Middleware[]`           | Route-specific middleware                                      |

**Returns:** `this` (chainable)

#### `router.group(prefix, definer, options?)`

Register a group of routes sharing a path prefix and optional middleware. The definer callback receives a `RouteGroup<Prefix>` whose `on()` overloads type-check path params against the combined `prefix + path` pattern.

```ts
router.group(
  '/admin',
  (r) => {
    r.on('/dashboard', () => renderDashboard());
    r.on('/users/:id', ({ params }) => renderUser(params.id));
  },
  { middleware: requireAuth },
);
```

Groups are nestable:

```ts
router.group('/admin', (r) => {
  r.group('/reports', (inner) => {
    inner.on('/monthly', () => renderMonthly());
  });
});
```

Path params from the group prefix are typed inside the callback:

```ts
router.group('/projects/:projectId', (r) => {
  r.on('/tasks/:taskId', ({ params }) => {
    params.projectId; // ✓ typed — from the group prefix
    params.taskId; // ✓ typed — from this on() path
  });
});
```

| Parameter | Type                              | Description                                        |
| --------- | --------------------------------- | -------------------------------------------------- |
| `prefix`  | `Prefix extends string`           | Shared path prefix                                 |
| `definer` | `(r: RouteGroup<Prefix>) => void` | Callback that receives a prefix-aware `RouteGroup` |
| `options` | `GroupOptions`                    | Optional group-level middleware                    |

**Returns:** `this` (chainable)

#### `router.use(...middleware)`

Add one or more global middleware after construction. Appended after any middleware registered via options.

```ts
router.use(logger);
router.use(analytics, errorTracker);
```

**Returns:** `this` (chainable)

### Lifecycle

#### `router.start()`

Attach the `popstate` (history mode) or `hashchange` (hash mode) event listener and handle the current URL. Idempotent — safe to call more than once.

**Returns:** `this` (chainable)

#### `router.stop()`

Detach the event listener. Does not clear subscribers.

**Returns:** `this` (chainable)

#### `router.dispose()`

Stop the router and clear all `subscribe()` listeners. Also called by `[Symbol.dispose]()` for `using` declarations.

**Returns:** `void`

### Navigation

#### `router.navigate(target, options?)`

Navigate to a path string or a named route. Returns a `Promise` that resolves after the handler finishes.

```ts
await router.navigate('/users/42');
await router.navigate('/users/42', { replace: true });
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'user', query: { tab: 'posts' }, hash: 'activity' });
```

| Parameter                | Type               | Default | Description                                                            |
| ------------------------ | ------------------ | ------- | ---------------------------------------------------------------------- |
| `target`                 | `NavigationTarget` | —       | Path string or named-route descriptor                                  |
| `options.replace`        | `boolean`          | `false` | Use `replaceState` instead of `pushState`                              |
| `options.state`          | `unknown`          | —       | State stored with the history entry                                    |
| `options.viewTransition` | `boolean`          | —       | Override the router-level `viewTransition` setting for this navigation |
| `options.force`          | `boolean`          | `false` | Navigate even if the destination URL matches the current URL           |

**Returns:** `Promise<void>`

**Throws** (as a rejected Promise) when a named route isn't found.

### Utilities

#### `router.url(nameOrPattern, params?, query?)`

Generate a URL from a path pattern or named route. Prepends the base path in history mode.

```ts
router.url('/users/:id', { id: '42' }); // '/users/42'
router.url('userDetail', { id: '42' }); // '/app/users/42' (with base)
router.url('/search', undefined, { q: 'ts' }); // '/search?q=ts'
router.url('/docs/:rest*', { rest: 'guide/intro' }); // '/docs/guide/intro'
router.url('/p', undefined, { tags: ['a', 'b'] }); // '/p?tags=a&tags=b'
```

| Parameter       | Type          | Description                                      |
| --------------- | ------------- | ------------------------------------------------ |
| `nameOrPattern` | `string`      | Path pattern (e.g. `'/users/:id'`) or route name |
| `params`        | `RouteParams` | Params to substitute into the pattern            |
| `query`         | `QueryParams` | Query params to append                           |

**Returns:** `string`

**Throws** when a route name is passed that isn't registered, or when a required param is missing.

#### `router.isActive(nameOrPattern, exact?)`

Check whether the current URL matches a path pattern or named route.

```ts
router.isActive('/users/:id'); // exact match (default)
router.isActive('userDetail'); // by route name, exact
router.isActive('/admin', false); // prefix match
router.isActive('adminGroup', false); // named route prefix match
```

| Parameter       | Type      | Default | Description                                 |
| --------------- | --------- | ------- | ------------------------------------------- |
| `nameOrPattern` | `string`  | —       | Path pattern or route name                  |
| `exact`         | `boolean` | `true`  | `true` = full match; `false` = prefix match |

**Returns:** `boolean`

#### `router.resolve(pathname)`

Synchronously resolve a pathname to its matching route without navigating, running handlers, or notifying subscribers. Strips the base path automatically.

```ts
router.resolve('/users/42');
// → { name: 'userDetail', params: { id: '42' }, meta: { title: 'User' } }

router.resolve('/unknown');
// → null
```

**Returns:** `ResolvedRoute | null`

#### `router.state` (getter)

Current route state as a shallow copy.

```ts
const { pathname, params, query, hash, name, meta } = router.state;
```

**Returns:** `RouteState`

#### `router.subscribe(listener)`

Subscribe to route changes. The listener is called immediately with the current state, then after every navigation. Errors thrown by listeners are caught and logged.

```ts
const unsubscribe = router.subscribe((state) => {
  document.title = (state.meta as any)?.title ?? 'App';
});

unsubscribe(); // stop listening
```

**Returns:** `Unsubscribe` (`() => void`)

## Types

### `RouteContext<Params, Meta>`

```ts
type RouteContext<Params extends RouteParams = RouteParams, Meta = unknown> = {
  /** Route parameters extracted from the path pattern */
  readonly params: Params;
  /** Query parameters parsed from the URL search string */
  readonly query: QueryParams;
  /** Current pathname */
  readonly pathname: string;
  /** URL hash without '#' */
  readonly hash: string;
  /** Static metadata from the route definition */
  readonly meta?: Meta;
  /** Mutable bag for passing data between middleware */
  locals: Record<string, unknown>;
  /** Navigate programmatically from a handler or middleware */
  navigate: (target: NavigationTarget, options?: NavigateOptions) => Promise<void>;
};
```

### `RouteHandler<Params, Meta>`

```ts
type RouteHandler<Params extends RouteParams = RouteParams, Meta = unknown> = (
  context: RouteContext<Params, Meta>,
) => void;
```

Handlers may return a `Promise` — TypeScript's `void` return allows async functions and functions that return any value.

### `Middleware<Meta>`

```ts
type Middleware<Meta = unknown> = (
  context: RouteContext<RouteParams, Meta>,
  next: () => Promise<void>,
) => void | Promise<void>;
```

Middleware only receives `RouteParams` for `ctx.params`. Path-param typing is applied to `RouteHandler` and `on()` callbacks inside typed `RouteGroup<Prefix>` groups.

### `RouteOptions<Meta>`

Passed as the last argument to `on()`.

```ts
type RouteOptions<Meta = unknown> = {
  name?: string;
  meta?: Meta;
  middleware?: Middleware<Meta> | Middleware<Meta>[];
};
```

### `RouteGroup<Prefix>`

The prefix-aware registration API provided to `group()` callbacks. `Prefix` propagates group path params into each nested `on()` handler's `ctx.params`.

```ts
type RouteGroup<Prefix extends string = ''> = {
  on<Path extends string, Meta = unknown>(
    path: Path,
    handler: RouteHandler<PathParams<`${Prefix}/${Path}`>, Meta>,
    options?: RouteOptions<Meta>,
  ): RouteGroup<Prefix>;
  on<Path extends string, Meta = unknown>(path: Path, options?: RouteOptions<Meta>): RouteGroup<Prefix>;
  group<P extends string>(
    prefix: P,
    definer: (r: RouteGroup<`${Prefix}/${P}`>) => void,
    options?: GroupOptions,
  ): RouteGroup<Prefix>;
};
```

### `GroupOptions`

```ts
type GroupOptions = {
  middleware?: Middleware | Middleware[];
};
```

### `RouterOptions`

```ts
type RouterOptions = {
  mode?: RouterMode;
  base?: string;
  onNotFound?: RouteHandler;
  onError?: (error: unknown, context: RouteContext) => void;
  middleware?: Middleware | Middleware[];
  viewTransition?: boolean;
  autoStart?: boolean;
};
```

### `NavigationTarget`

```ts
type NavigationTarget = string | { name: string; params?: RouteParams; query?: QueryParams; hash?: string };
```

### `NavigateOptions`

```ts
type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
  viewTransition?: boolean;
  force?: boolean;
};
```

### `RouteState`

```ts
type RouteState = {
  readonly pathname: string;
  readonly params: RouteParams;
  readonly query: QueryParams;
  readonly hash: string;
  readonly name?: string;
  readonly meta?: unknown;
};
```

### `ResolvedRoute`

```ts
type ResolvedRoute = {
  readonly name?: string;
  readonly params: RouteParams;
  readonly meta?: unknown;
};
```

### `RouteParams`

```ts
type RouteParams = Record<string, string>;
```

### `QueryParams`

```ts
type QueryParams = Record<string, string | string[]>;
```

### `RouterMode`

```ts
type RouterMode = 'history' | 'hash';
```

### `PathParams<T>`

Extracts typed path params from a path pattern literal at the type level.

```ts
type UserParams = PathParams<'/users/:id'>;
// → { readonly id: string }

type PostParams = PathParams<'/users/:userId/posts/:postId'>;
// → { readonly userId: string; readonly postId: string }

type DocsParams = PathParams<'/docs/:rest*'>;
// → { readonly rest: string }

type StaticParams = PathParams<'/about'>;
// → Record<string, string>  (no named params — falls back to the base type)
```

## Pattern Matching

### Path Patterns

| Pattern                        | Example match       | Notes                                    |
| ------------------------------ | ------------------- | ---------------------------------------- |
| `/about`                       | `/about`            | Exact static path                        |
| `/users/:id`                   | `/users/123`        | Single named param                       |
| `/users/:userId/posts/:postId` | `/users/1/posts/42` | Multiple named params                    |
| `/docs/*`                      | `/docs/guide/intro` | Unnamed wildcard — no captured param     |
| `/files/:rest*`                | `/files/a/b/c`      | Named wildcard — `params.rest = 'a/b/c'` |
| `*`                            | anything            | Global catch-all                         |

### Middleware Execution Order

```
Global middleware 1  (RouterOptions.middleware / router.use())
  ↓
Global middleware 2
  ↓
Group middleware  (group() options.middleware)
  ↓
Route middleware  (on() options.middleware)
  ↓
Route handler
```

## Error Handling

### `onError`

Receives the thrown value and the current `RouteContext`. `ctx.meta` reflects the matched route's metadata even if the error occurred before the handler ran.

```ts
const router = createRouter({
  onError: (error, ctx) => {
    console.error('Error at', ctx.pathname, ctx.meta, error);
    ctx.navigate('/error');
  },
});
```

If no `onError` is provided, errors are logged to `console.error` and swallowed.

### Listener errors

Errors thrown inside `subscribe()` listeners are caught, logged to `console.error`, and do not prevent other listeners from running.
