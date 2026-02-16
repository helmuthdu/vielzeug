# Routeit API Reference

Complete API documentation for all methods and types.

## Table of Contents

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
  notFound: ({ pathname }) => {
    console.log('404:', pathname);
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

### `start()`

Start listening for route changes.

**Returns:** `Router` (chainable)

**Example:**

```ts
router.get('/', homeHandler).get('/about', aboutHandler).start();
```

### `stop()`

Stop listening for route changes.

**Returns:** `void`

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

**Returns:** `void`

**Example:**

```ts
router.navigate('/about');
router.navigate('/login', { replace: true });
router.navigate('/profile', { state: { from: '/settings' } });
```

### `navigateTo(name, params?, query?)`

Navigate to a named route.

**Parameters:**

- `name: string` – Route name
- `params?: RouteParams` – Route parameters
- `query?: QueryParams` – Query parameters

**Returns:** `void`

**Example:**

```ts
router.navigateTo('userDetail', { id: '123' });
router.navigateTo('search', undefined, { q: 'test' });
```

### `back()`

Navigate back one page in history.

**Returns:** `void`

**Example:**

```ts
router.back();
```

### `forward()`

Navigate forward one page in history.

**Returns:** `void`

**Example:**

```ts
router.forward();
```

### `go(delta)`

Navigate to a specific position in history.

**Parameters:**

- `delta: number` – Number of pages to move (negative = back, positive = forward)

**Returns:** `void`

**Example:**

```ts
router.go(-2); // Go back 2 pages
router.go(1); // Go forward 1 page
```

## URL Building Methods

### `buildUrl(path, params?, query?)`

Build a URL with parameters and query string.

**Parameters:**

- `path: string` – Path template
- `params?: RouteParams` – Parameters to substitute
- `query?: QueryParams` – Query parameters to append

**Returns:** `string`

**Example:**

```ts
router.buildUrl('/users/:id', { id: '123' });
// → '/users/123'

router.buildUrl('/search', undefined, { q: 'test', page: '2' });
// → '/search?q=test&page=2'

router.buildUrl('/users/:id', { id: '123' }, { tab: 'posts' });
// → '/users/123?tab=posts'
```

### `urlFor(name, params?, query?)`

Build a URL for a named route.

**Parameters:**

- `name: string` – Route name
- `params?: RouteParams` – Route parameters
- `query?: QueryParams` – Query parameters

**Returns:** `string`

**Throws:** `Error` if route name not found

**Example:**

```ts
router.urlFor('userDetail', { id: '123' });
// → '/users/123'

router.urlFor('search', undefined, { q: 'test' });
// → '/search?q=test'
```

## Query Methods

### `isActive(pattern)`

Check if a route pattern matches the current route.

**Parameters:**

- `pattern: string` – Path pattern to match

**Returns:** `boolean`

**Example:**

```ts
if (router.isActive('/users/:id')) {
  console.log('On user page');
}

if (router.isActive('/admin/*')) {
  console.log('In admin section');
}
```

### `getCurrentPath()`

Get the current pathname.

**Returns:** `string`

**Example:**

```ts
const path = router.getCurrentPath();
console.log(path); // '/users/123'
```

### `getCurrentQuery()`

Get the current query parameters.

**Returns:** `QueryParams`

**Example:**

```ts
const query = router.getCurrentQuery();
console.log(query); // { tab: 'profile', page: '2' }
```

### `getCurrentHash()`

Get the current URL hash (without #).

**Returns:** `string`

**Example:**

```ts
const hash = router.getCurrentHash();
console.log(hash); // 'section-1'
```

### `getState()`

Get the current route state.

**Returns:** `{ pathname: string, params: RouteParams, query: QueryParams }`

**Example:**

```ts
const state = router.getState();
console.log(state.pathname); // '/users/123'
console.log(state.params); // { id: '123' }
console.log(state.query); // { tab: 'profile' }
```

### `getParams()`

Get the current route parameters.

**Returns:** `RouteParams`

**Example:**

```ts
const params = router.getParams();
console.log(params); // { id: '123', tab: 'posts' }
```

## Link Creation Methods

### `link(href, text, attributes?)`

Create an anchor element.

**Parameters:**

- `href: string` – Link URL
- `text: string` – Link text
- `attributes?: Record<string, string>` – Optional HTML attributes

**Returns:** `HTMLAnchorElement`

**Example:**

```ts
const link = router.link('/about', 'About Page');
document.body.appendChild(link);

const styledLink = router.link('/about', 'About', {
  class: 'nav-link',
  'data-section': 'main',
});
```

### `linkTo(name, params, text, attributes?)`

Create an anchor element for a named route.

**Parameters:**

- `name: string` – Route name
- `params: RouteParams` – Route parameters
- `text: string` – Link text
- `attributes?: Record<string, string>` – Optional HTML attributes

**Returns:** `HTMLAnchorElement`

**Throws:** `Error` if route name not found

**Example:**

```ts
const userLink = router.linkTo('userDetail', { id: '123' }, 'View User');
document.body.appendChild(userLink);

const styledLink = router.linkTo('userDetail', { id: '123' }, 'View', {
  class: 'user-link',
});
```

## Subscription Methods

### `subscribe(listener)`

Subscribe to route changes.

**Parameters:**

- `listener: () => void` – Callback function

**Returns:** `() => void` – Unsubscribe function

**Example:**

```ts
const unsubscribe = router.subscribe(() => {
  console.log('Route changed!');
  console.log('Current:', router.getCurrentPath());
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
  start(): Router;
  stop(): void;
  navigate(path: string, options?: NavigateOptions): void;
  navigateTo(name: string, params?: RouteParams, query?: QueryParams): void;
  back(): void;
  forward(): void;
  go(delta: number): void;
  buildUrl(path: string, params?: RouteParams, query?: QueryParams): string;
  urlFor(name: string, params?: RouteParams, query?: QueryParams): string;
  isActive(pattern: string): boolean;
  getCurrentPath(): string;
  getCurrentQuery(): QueryParams;
  getCurrentHash(): string;
  getState(): { pathname: string; params: RouteParams; query: QueryParams };
  getParams(): RouteParams;
  link(href: string, text: string, attributes?: Record<string, string>): HTMLAnchorElement;
  linkTo(name: string, params: RouteParams, text: string, attributes?: Record<string, string>): HTMLAnchorElement;
  subscribe(listener: () => void): () => void;
  debug(): DebugInfo;
}
```

### `RouteContext<T>`

The context object passed to handlers and middleware.

```ts
type RouteContext<T = unknown> = {
  params: RouteParams; // Route parameters
  query: QueryParams; // Query parameters
  pathname: string; // Current pathname
  hash: string; // URL hash (without #)
  data?: T; // Custom route data
  user?: unknown; // User object (set by middleware)
  meta?: Record<string, unknown>; // Metadata (set by middleware)
  navigate: (path: string, options?: NavigateOptions) => void;
};
```

### `RouteDefinition<T>`

Route configuration object.

```ts
type RouteDefinition<T = unknown> = {
  path: string; // Route path pattern
  handler: RouteHandler<T>; // Route handler function
  name?: string; // Optional route name
  data?: T; // Optional custom data
  middleware?: Middleware | Middleware[]; // Optional middleware
  children?: RouteDefinition<T>[]; // Optional child routes
};
```

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
  replace?: boolean; // Replace current history entry
  state?: unknown; // State to store with navigation
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
  mode?: RouterMode; // Router mode (default: 'history')
  base?: string; // Base path (default: '/')
  notFound?: RouteHandler; // 404 handler
  middleware?: Middleware | Middleware[]; // Global middleware
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
    ctx.navigate('/error');
  }
};
```

### Not Found Handler

```ts
const router = createRouter({
  notFound: ({ pathname }) => {
    console.log('404:', pathname);
    document.getElementById('app').innerHTML = '<h1>404</h1>';
  },
});
```

## Best Practices

### 1. Type Your Context

```ts
interface AppContext extends RouteContext {
  user?: User;
  permissions?: Permissions;
}

const middleware: Middleware<AppContext> = async (ctx, next) => {
  ctx.user = await fetchUser();
  await next();
};
```

### 2. Use Named Routes

```ts
// Define
router.route({ path: '/users/:id', name: 'user', handler });

// Navigate
router.navigateTo('user', { id: '123' });

// Build URL
const url = router.urlFor('user', { id: '123' });
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
