---
title: Routeit — API Reference
description: Complete API reference for Routeit client-side router.
---

# Routeit API Reference

[[toc]]

## Factory Functions

### `createRouter(options?)`

Creates a new router instance.

**Parameters:**

- `options?` – Router configuration options

**Returns:** `Router`

**Example:**

```ts
const router = createRouter({
  mode: 'history',
  base: '/app',
  onNotFound: ({ pathname }) => {
    console.log('404:', pathname);
  },
  onError: (error, ctx) => {
    console.error('Route error at', ctx.pathname, error);
  },
  middleware: [loggerMiddleware],
});
```

## Router Methods

### `route(definition)`

Register a single route.

**Parameters:**

- `definition: RouteDefinition` – Route configuration

**Returns:** `Router` (chainable)

**Example:**

```ts
router.route({
  path: '/users/:id',
  name: 'user',
  middleware: requireAuth,
  handler: ({ params }) => {
    console.log('User:', params.id);
  },
  data: { title: 'User Profile' },
  children: [...]
});
```

### `routes(definitions)`

Register multiple routes at once.

**Parameters:**

- `definitions: RouteDefinition[]` – Array of route configurations

**Returns:** `Router` (chainable)

**Example:**

```ts
router.routes([
  { path: '/', handler: homeHandler },
  { path: '/about', handler: aboutHandler },
  { path: '/contact', handler: contactHandler },
]);
```

### `get(path, handler)`

Convenience method for registering a route.

**Parameters:**

- `path: string` – Route path
- `handler: RouteHandler` – Route handler function

**Returns:** `Router` (chainable)

**Example:**

```ts
router.get('/users/:id', ({ params }) => {
  console.log('User:', params.id);
});
```

### `on(path, handler, extras?)`

Like `get()`, but also accepts a `name`, `data`, and `middleware` via an extras object.

**Parameters:**

- `path: string` – Route path
- `handler: RouteHandler` – Route handler function
- `extras?: { name?, data?, middleware? }` – Optional extras

**Returns:** `Router` (chainable)

**Example:**

```ts
router.on('/users/:id', ({ params }) => renderUser(params.id), {
  name: 'user',
  middleware: requireAuth,
});
```

### `group(prefix, middlewareOrDefiner, definer?)`

Registers a set of routes that share a common path prefix and optional middleware.

**Parameters:**

- `prefix: string` – Path prefix applied to all routes in the group
- `middlewareOrDefiner: Middleware | Middleware[] | ((r: GroupRouter) => void)` – Middleware to apply to every route in the group, or a definer function if no middleware is needed
- `definer?: (r: GroupRouter) => void` – Callback that registers routes via `r.on()`, `r.route()`, or `r.routes()`

**Returns:** `Router` (chainable)

**Example:**

```ts
// With middleware
router.group('/admin', requireAuth, (r) => {
  r.on('/dashboard', () => renderDashboard());
  r.on('/users',     () => renderUsers());
  r.route({ path: '/settings', name: 'adminSettings', handler: renderSettings });
});

// Without middleware
router.group('/public', (r) => {
  r.on('/',       () => renderHome());
  r.on('/about',  () => renderAbout());
});
```

### `start()`

Start listening for route changes.

**Returns:** `Router` (chainable)

**Example:**

```ts
router.get('/', homeHandler).get('/about', aboutHandler).start();
```

### `stop()`

Stop listening for route changes.

**Returns:** `Router` (chainable)

**Example:**

```ts
router.stop();
```

## Navigation Methods

### `navigate(path, options?)`

Navigate to a path programmatically.

**Parameters:**

- `path: string` – Target path
- `options?: NavigateOptions` – Navigation options
  - `replace?: boolean` – Replace current history entry
  - `state?: unknown` – State to store with navigation
  - `viewTransition?: boolean` – Override the router-level `viewTransitions` setting for this navigation

**Returns:** `Promise<void>`

**Example:**

```ts
router.navigate('/about');
router.navigate('/login', { replace: true });
router.navigate('/profile', { state: { from: '/settings' } });
router.navigate('/gallery', { viewTransition: true });
```

### `navigateTo(name, params?, options?)`

Navigate to a named route.

**Parameters:**

- `name: string` – Route name
- `params?: RouteParams` – Route parameters to substitute into the path
- `options?: NavigateOptions` – Navigation options (same as `navigate()`)

**Returns:** `Promise<void>`

::: tip Building a URL with query params
To navigate to a named route **and** include query parameters, build the URL first with `url()` and pass it to `navigate()`:
```ts
router.navigate(router.url('search', undefined, { q: 'test' }));
```
:::

**Example:**

```ts
router.navigateTo('userDetail', { id: '123' });
router.navigateTo('userDetail', { id: '123' }, { replace: true });
```

## URL Building Methods

### `url(nameOrPattern, params?, query?)`

Build a URL from a path pattern or named route, with optional parameter substitution and query string.

**Parameters:**

- `nameOrPattern: string` – A path pattern (e.g. `'/users/:id'`) or a route name (e.g. `'userDetail'`)
- `params?: RouteParams` – Parameters to substitute into the pattern
- `query?: QueryParams` – Query parameters to append

**Returns:** `string`

**Throws:** `Error` if a route name is passed and no route with that name is registered

**Example:**

```ts
// Path pattern
router.url('/users/:id', { id: '123' });
// → '/users/123'

router.url('/search', undefined, { q: 'test', page: '2' });
// → '/search?q=test&page=2'

router.url('/users/:id', { id: '123' }, { tab: 'posts' });
// → '/users/123?tab=posts'

// Named route
router.url('userDetail', { id: '123' });
// → '/users/123'

router.url('search', undefined, { q: 'test' });
// → '/search?q=test'

// Array query parameters
router.url('/products', undefined, { tags: ['new', 'sale'] });
// → '/products?tags=new&tags=sale'
```

## State & Query Methods

### `isActive(nameOrPattern)`

Check if the current path matches a route pattern or a named route.

**Parameters:**

- `nameOrPattern: string` – A path pattern (e.g. `'/users/:id'`) or route name (e.g. `'user'`)

**Returns:** `boolean`

**Example:**

```ts
if (router.isActive('/users/:id')) {
  console.log('On user page');
}

if (router.isActive('/admin/*')) {
  console.log('In admin section');
}

// Using a route name
if (router.isActive('user')) {
  console.log('On the named user route');
}
```

### `getState()`

Get the current route state.

**Returns:** `RouteState` — `{ pathname, params, query, hash, name? }`

**Example:**

```ts
const state = router.getState();
console.log(state.pathname); // '/users/123'
console.log(state.params);   // { id: '123' }
console.log(state.query);    // { tab: 'profile' }
console.log(state.hash);     // 'section-1'
console.log(state.name);     // 'userDetail' (only set when matched route has a name)
```

## Subscription Methods

### `subscribe(listener)`

Subscribe to route changes. The listener is called immediately with the current state, then again after every navigation.

**Parameters:**

- `listener: (state: RouteState) => void` – Callback that receives the new route state

**Returns:** `() => void` – Unsubscribe function

**Example:**

```ts
const unsubscribe = router.subscribe((state) => {
  console.log('Route changed!');
  console.log('Current:', state.pathname);
  console.log('Params:', state.params);
});

// Later...
unsubscribe();
```

## Debug Methods

### `debug()`

Get debug information about the router.

**Returns:** `{ mode: RouterMode, base: string, routes: DebugRoute[] }`

**Example:**

```ts
const info = router.debug();
console.log('Mode:', info.mode);
console.log('Base:', info.base);
console.log('Routes:', info.routes);
```

## Types

### `Router`

The main router instance type.

```ts
interface Router {
  route(definition: RouteDefinition): Router;
  routes(definitions: RouteDefinition[]): Router;
  get(path: string, handler: RouteHandler): Router;
  on(path: string, handler: RouteHandler, extras?: Pick<RouteDefinition, 'name' | 'data' | 'middleware'>): Router;
  group(prefix: string, middlewareOrDefiner: Middleware | Middleware[] | ((r: GroupRouter) => void), definer?: (r: GroupRouter) => void): Router;
  start(): Router;
  stop(): Router;
  navigate(path: string, options?: NavigateOptions): Promise<void>;
  navigateTo(name: string, params?: RouteParams, options?: NavigateOptions): Promise<void>;
  url(nameOrPattern: string, params?: RouteParams, query?: QueryParams): string;
  isActive(nameOrPattern: string): boolean;
  getState(): RouteState;
  subscribe(listener: (state: RouteState) => void): () => void;
  debug(): { mode: RouterMode; base: string; routes: Array<{ name?: string; path: string; params: string[] }> };
}
```

### `RouteContext<T>`

The context object passed to handlers and middleware.

```ts
type RouteContext<T = unknown> = {
  readonly params: RouteParams;          // Route parameters
  readonly query: QueryParams;           // Query parameters
  readonly pathname: string;             // Current pathname
  readonly hash: string;                 // URL hash (without #)
  readonly data?: T;                     // Custom route data
  meta: Record<string, unknown>;         // Mutable metadata — use this to pass data between middlewares
};
```

::: warning No `navigate` on context
`RouteContext` does not expose a `navigate` method. To redirect inside a handler or middleware, call `router.navigate()` directly:
```ts
const authGuard: Middleware = async (ctx, next) => {
  if (!isAuthenticated()) {
    router.navigate('/login'); // call navigate on the router, not ctx
    return;
  }
  await next();
};
```
:::

### `RouteDefinition<T>`

Route configuration object.

```ts
type RouteDefinition<T = unknown> = {
  path: string;                           // Route path pattern
  handler?: RouteHandler<T>;              // Route handler function (optional — middleware-only routes allowed)
  name?: string;                          // Optional route name
  data?: T;                               // Optional custom data
  middleware?: Middleware | Middleware[];  // Optional route-level middleware
};
```

::: tip Nested routes
Child route nesting is supported via `group()`, not via a `children` property on `RouteDefinition`.
:::

### `RouteHandler<T>`

Route handler function type.

```ts
type RouteHandler<T = unknown> = (context: RouteContext<T>) => void | Promise<void>;
```

### `Middleware`

Middleware function type.

```ts
type Middleware = (context: RouteContext, next: () => Promise<void>) => void | Promise<void>;
```

### `RouteParams`

Route parameters object.

```ts
type RouteParams = Record<string, string>;
```

### `QueryParams`

Query parameters object (values can be strings or arrays).

```ts
type QueryParams = Record<string, string | string[]>;
```

### `NavigateOptions`

Navigation options.

```ts
type NavigateOptions = {
  replace?: boolean;         // Replace current history entry instead of pushing
  state?: unknown;           // State to store with the history entry
  viewTransition?: boolean;  // true = opt in, false = opt out, even when viewTransitions is globally enabled
};
```

### `GroupRouter`

The scoped router API available inside a `group()` callback.

```ts
type GroupRouter = {
  on(path: string, handler: RouteHandler, extras?: Pick<RouteDefinition, 'name' | 'data' | 'middleware'>): GroupRouter;
  route<T = unknown>(definition: RouteDefinition<T>): GroupRouter;
  routes(definitions: RouteDefinition[]): GroupRouter;
};
```

### `RouteState`

The object returned by `getState()` and passed to `subscribe()` listeners.

```ts
type RouteState = {
  readonly pathname: string;
  readonly params: RouteParams;
  readonly query: QueryParams;
  readonly hash: string;
  readonly name?: string; // Set when the matched route was registered with a name
};
```

### `RouterMode`

Router mode type.

```ts
type RouterMode = 'history' | 'hash';
```

### `RouterOptions`

Router configuration options.

```ts
type RouterOptions = {
  mode?: RouterMode;                                          // Router mode (default: 'history')
  base?: string;                                             // Base path (default: '/')
  onNotFound?: RouteHandler;                                 // Handler for unmatched routes
  onError?: (error: unknown, context: RouteContext) => void; // Handler for errors thrown in handlers/middleware
  middleware?: Middleware | Middleware[];                     // Global middleware applied to every route
  viewTransitions?: boolean;                                 // Wrap navigations in the View Transitions API (default: false)
};
```

## Pattern Matching

### Path Patterns

- **Static paths**: `/about`, `/contact`
- **Parameters**: `/users/:id`, `/posts/:slug`
- **Multiple parameters**: `/users/:userId/posts/:postId`
- **Wildcards**: `/docs/*` (matches `/docs/guide`, `/docs/api/reference`, etc.)

### Parameter Extraction

```ts
router.get('/users/:userId/posts/:postId', ({ params }) => {
  console.log(params.userId); // '123'
  console.log(params.postId); // '456'
});
// Matches: /users/123/posts/456
```

### Query Parameter Parsing

```ts
router.get('/search', ({ query }) => {
  console.log(query.q); // 'test'
  console.log(query.filter); // ['new', 'sale']
});
// Matches: /search?q=test&filter=new&filter=sale
```

## Middleware Chain

Middleware executes in this order:

```
Global Middleware 1
  ↓
Global Middleware 2
  ↓
Route Middleware 1
  ↓
Route Middleware 2
  ↓
Route Handler
```

### Example

```ts
const router = createRouter({
  middleware: [logger, errorHandler], // Global
});

router.route({
  path: '/admin',
  middleware: [requireAuth, requireAdmin], // Route-specific
  handler: adminHandler,
});

// Execution order:
// 1. logger
// 2. errorHandler
// 3. requireAuth
// 4. requireAdmin
// 5. adminHandler
```

## Error Handling

### Middleware Error Handling

```ts
const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Route error:', error);
    router.navigate('/error');
  }
};
```

### Not Found Handler

```ts
const router = createRouter({
  onNotFound: ({ pathname }) => {
    console.log('404:', pathname);
    document.getElementById('app').innerHTML = '<h1>404</h1>';
  },
});
```

## Best Practices

### 1. Pass Data Between Middlewares via `ctx.meta`

```ts
// Store data in ctx.meta inside middleware
const loadUser: Middleware = async (ctx, next) => {
  ctx.meta.user = await fetchUser();
  await next();
};

// Read it in the handler
router.route({
  path: '/profile',
  middleware: loadUser,
  handler: (ctx) => {
    const user = ctx.meta.user as User;
    console.log(user.name);
  },
});
```

### 2. Use Named Routes

```ts
// Define
router.route({ path: '/users/:id', name: 'user', handler });

// Navigate
router.navigateTo('user', { id: '123' });

// Build URL
const url = router.url('user', { id: '123' });
```

### 3. Centralize Middleware

```ts
// middleware.ts
export const requireAuth: Middleware = ...;
export const requireAdmin: Middleware = ...;

// routes.ts
import { requireAuth, requireAdmin } from './middleware';
```

### 4. Use Route Data

```ts
router.route({
  path: '/admin',
  data: { title: 'Admin', requiresAuth: true },
  handler: ({ data }) => {
    document.title = data?.title || 'App';
  },
});
```
