# Routeit Usage Guide

Complete guide to installing and using Routeit in your projects.

::: tip 💡 API Reference
This guide covers API usage and basic patterns. For complete application examples, see [Examples](./examples.md).
:::

## Table of Contents

[[toc]]

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/routeit
```

```sh [npm]
npm install @vielzeug/routeit
```

```sh [yarn]
yarn add @vielzeug/routeit
```

:::

## Import

```ts
import { createRouter } from '@vielzeug/routeit';

// Optional: Import types
import type {
  Router,
  RouteContext,
  Middleware,
  RouteDefinition,
} from '@vielzeug/routeit';
```

## Basic Usage

### Creating a Router

```ts
import { createRouter } from '@vielzeug/routeit';

// Basic router with defaults
const router = createRouter();

// Router with options
const router = createRouter({
  mode: 'history',  // 'history' or 'hash'
  base: '/',        // Base path for all routes
});
```

### Registering Routes

```ts
// Single route
router.route({
  path: '/about',
  handler: () => {
    console.log('About page');
  }
});

// Multiple routes
router.routes([
  { path: '/', handler: homeHandler },
  { path: '/about', handler: aboutHandler },
  { path: '/contact', handler: contactHandler },
]);

// Convenience method
router.get('/blog', () => {
  console.log('Blog page');
});

// Method chaining
router
  .get('/', homeHandler)
  .get('/about', aboutHandler)
  .get('/users/:id', userHandler)
  .start();
```

### Route Parameters

Extract dynamic segments from URLs:

```ts
// Single parameter
router.get('/users/:id', ({ params }) => {
  console.log('User ID:', params.id);
});
// Matches: /users/123 → params.id = '123'

// Multiple parameters
router.get('/users/:userId/posts/:postId', ({ params }) => {
  console.log('User:', params.userId);
  console.log('Post:', params.postId);
});
// Matches: /users/123/posts/456
// → params.userId = '123', params.postId = '456'

// Wildcard routes
router.get('/docs/*', ({ pathname }) => {
  console.log('Docs path:', pathname);
});
// Matches: /docs/guide/intro, /docs/api/reference, etc.
```

### Query Parameters

Automatic query string parsing:

```ts
router.get('/search', ({ query }) => {
  console.log('Query:', query.q);
  console.log('Page:', query.page);
});
// GET /search?q=test&page=2
// → query.q = 'test', query.page = '2'

// Array query parameters
router.get('/filter', ({ query }) => {
  console.log('Tags:', query.tags);
});
// GET /filter?tags=a&tags=b&tags=c
// → query.tags = ['a', 'b', 'c']

// Mixed parameters and query
router.get('/products/:category', ({ params, query }) => {
  console.log('Category:', params.category);
  console.log('Sort:', query.sort);
  console.log('Filters:', query.filter);
});
// GET /products/electronics?sort=price&filter=new&filter=sale
```

## Navigation

### Programmatic Navigation

```ts
// Navigate to a path
router.navigate('/about');

// Navigate with query parameters
router.navigate('/search?q=test');

// Replace current entry (no history)
router.navigate('/login', { replace: true });

// Navigate with state
router.navigate('/profile', {
  state: { from: '/settings' }
});

// Navigate from within handler
router.get('/old-page', ({ navigate }) => {
  navigate('/new-page');
});
```

### History Navigation

```ts
// Go back one page
router.back();

// Go forward one page
router.forward();

// Go to specific position
router.go(-2);  // Back 2 pages
router.go(1);   // Forward 1 page
```

### Building URLs

```ts
// Build URL with parameters
const url = router.buildUrl('/users/:id', { id: '123' });
console.log(url); // '/users/123'

// Build URL with query parameters
const searchUrl = router.buildUrl('/search', undefined, {
  q: 'test',
  page: '2'
});
console.log(searchUrl); // '/search?q=test&page=2'

// Build URL with both
const fullUrl = router.buildUrl(
  '/users/:id',
  { id: '123' },
  { tab: 'posts', page: '2' }
);
console.log(fullUrl); // '/users/123?tab=posts&page=2'

// Array query parameters
const filterUrl = router.buildUrl('/products', undefined, {
  tags: ['new', 'sale']
});
console.log(filterUrl); // '/products?tags=new&tags=sale'
```

## Named Routes

Navigate by route name instead of path:

```ts
// Register named route
router.route({
  path: '/users/:id',
  name: 'userDetail',
  handler: ({ params }) => {
    console.log('User:', params.id);
  }
});

// Navigate by name
router.navigateTo('userDetail', { id: '123' });

// Build URL by name
const url = router.urlFor('userDetail', { id: '123' });
console.log(url); // '/users/123'

// With query parameters
router.navigateTo('userDetail', { id: '123' }, { tab: 'profile' });
// Navigates to: /users/123?tab=profile
```

## Middleware

Execute code before route handlers, modify context, or block navigation.

### Basic Middleware

```ts
import type { Middleware } from '@vielzeug/routeit';

const loggerMiddleware: Middleware = async (ctx, next) => {
  console.log('Navigating to:', ctx.pathname);
  await next(); // Continue to next middleware or handler
  console.log('Navigation complete');
};

// Route-specific middleware
router.route({
  path: '/dashboard',
  middleware: loggerMiddleware,
  handler: () => {
    console.log('Dashboard');
  }
});
```

### Authentication Middleware

```ts
const requireAuth: Middleware = async (ctx, next) => {
  // Get user from your auth system
  const user = await getCurrentUser();
  
  if (!user) {
    // Redirect to login if not authenticated
    ctx.navigate('/login');
    return; // Don't call next() - stops execution
  }
  
  // Add user to context
  ctx.user = user;
  
  // Continue to next middleware or handler
  await next();
};

// Protected route
router.route({
  path: '/dashboard',
  middleware: requireAuth,
  handler: (ctx) => {
    console.log('User:', ctx.user);
  }
});
```

### Multiple Middleware

Middleware executes in order:

```ts
router.route({
  path: '/admin',
  middleware: [requireAuth, requireAdmin, loadData],
  handler: (ctx) => {
    console.log('Admin page');
    console.log('User:', ctx.user);
    console.log('Data:', ctx.meta.data);
  }
});
```

### Global Middleware

Apply middleware to all routes:

```ts
const router = createRouter({
  middleware: [
    loggerMiddleware,
    errorHandler,
    performanceMonitor
  ]
});

// Execution order:
// Global Middleware 1 → Global Middleware 2 → Route Middleware → Handler
```

### Context Enhancement

Middleware can modify the context:

```ts
const dataLoader: Middleware = async (ctx, next) => {
  // Add metadata
  ctx.meta = { 
    loadedAt: Date.now(),
    environment: 'production' 
  };
  
  // Load user data
  ctx.user = await fetchUser();
  
  // Load additional data
  ctx.meta.settings = await fetchSettings();
  
  await next();
};

router.route({
  path: '/profile',
  middleware: dataLoader,
  handler: (ctx) => {
    console.log('User:', ctx.user);
    console.log('Meta:', ctx.meta);
    console.log('Settings:', ctx.meta.settings);
  }
});
```

## Permission Integration

Integrate with @vielzeug/permit for role-based access control:

```ts
import { Permit } from '@vielzeug/permit';
import type { BaseUser, PermissionAction } from '@vielzeug/permit';

// Define permissions
Permit.register('admin', 'posts', {
  read: true,
  create: true,
  update: true,
  delete: true
});

Permit.register('user', 'posts', {
  read: true,
  create: true,
  update: (user, data) => user.id === data.authorId,
  delete: false
});

// Permission middleware factory
function requirePermission(
  resource: string, 
  action: PermissionAction
): Middleware {
  return async (ctx, next) => {
    const user = ctx.user as BaseUser;
    
    if (!user || !Permit.check(user, resource, action)) {
      ctx.navigate('/forbidden');
      return;
    }
    
    await next();
  };
}

// Usage
router.route({
  path: '/posts',
  middleware: [requireAuth, requirePermission('posts', 'read')],
  handler: () => console.log('Posts page')
});

router.route({
  path: '/posts/:id/edit',
  middleware: [requireAuth, requirePermission('posts', 'update')],
  handler: ({ params }) => console.log('Edit post:', params.id)
});
```

## Nested Routes

Support for child routes:

```ts
router.route({
  path: '/users',
  handler: () => {
    console.log('Users section');
  },
  children: [
    {
      path: '/list',
      handler: () => console.log('User list')
      // Matches: /users/list
    },
    {
      path: '/:id',
      handler: ({ params }) => console.log('User:', params.id)
      // Matches: /users/123
    },
    {
      path: '/:id/edit',
      handler: ({ params }) => console.log('Edit user:', params.id)
      // Matches: /users/123/edit
    }
  ]
});

// Nested routes with parameters
router.route({
  path: '/organizations/:orgId',
  handler: ({ params }) => {
    console.log('Organization:', params.orgId);
  },
  children: [
    {
      path: '/projects/:projectId',
      handler: ({ params }) => {
        // Both orgId and projectId are available
        console.log('Org:', params.orgId);
        console.log('Project:', params.projectId);
      }
      // Matches: /organizations/abc/projects/xyz
    }
  ]
});
```

## Route Context

Every route handler receives a context object:

```ts
router.get('/users/:id', (context) => {
  // Route parameters
  console.log(context.params.id);

  // Query parameters
  console.log(context.query);

  // Full pathname
  console.log(context.pathname);

  // Hash (without #)
  console.log(context.hash);

  // Custom route data
  console.log(context.data);

  // User (set by middleware)
  console.log(context.user);

  // Metadata (set by middleware)
  console.log(context.meta);

  // Navigate function
  context.navigate('/another-page');
});
```

### Typed Context

```ts
type RouteData = { 
  title: string;
  requiresAuth: boolean;
};

router.route<RouteData>({
  path: '/admin',
  data: {
    title: 'Admin Dashboard',
    requiresAuth: true
  },
  handler: (context) => {
    // context.data is typed as RouteData
    document.title = context.data?.title || 'App';
    console.log('Requires auth:', context.data?.requiresAuth);
  }
});
```

## Subscriptions

React to route changes:

```ts
// Subscribe to route changes
const unsubscribe = router.subscribe(() => {
  console.log('Route changed!');
  console.log('Current path:', router.getCurrentPath());
});

// Later... unsubscribe
unsubscribe();
```

## Router Modes

### History Mode

Uses HTML5 History API (default):

```ts
const router = createRouter({
  mode: 'history',
  base: '/'
});

// URLs: https://example.com/about
```

### Hash Mode

Uses hash-based routing (great for static hosting):

```ts
const router = createRouter({
  mode: 'hash',
  base: '/'
});

// URLs: https://example.com/#/about
```

## Base Path

Deploy your app at a subdirectory:

```ts
const router = createRouter({
  mode: 'history',
  base: '/my-app'
});

router.get('/about', () => {
  console.log('About');
  // Full URL: https://example.com/my-app/about
});

router.navigate('/contact');
// Navigates to: https://example.com/my-app/contact
```

## 404 Handler

Handle routes that don't match:

```ts
const router = createRouter({
  notFound: ({ pathname, navigate }) => {
    console.log('404:', pathname);
    
    // Render 404 page
    document.getElementById('app').innerHTML = `
      <h1>404 - Page Not Found</h1>
      <p>The page "${pathname}" does not exist.</p>
    `;
    
    // Or redirect
    // navigate('/', { replace: true });
  }
});
```

## Utilities

### Check Active Route

```ts
// Check if route is active
if (router.isActive('/users/:id')) {
  console.log('On user page');
}

if (router.isActive('/admin/*')) {
  console.log('In admin section');
}
```

### Get Current Route Info

```ts
const pathname = router.getCurrentPath();
const query = router.getCurrentQuery();
const hash = router.getCurrentHash();

console.log('Current:', pathname); // '/users/123'
console.log('Query:', query);      // { tab: 'profile' }
console.log('Hash:', hash);        // 'section-1'
```

### Create Links

```ts
// Create anchor element
const link = router.link('/about', 'About Page');
document.body.appendChild(link);

// With attributes
const styledLink = router.link('/about', 'About', {
  class: 'nav-link',
  'data-section': 'main'
});

// Named route link
const userLink = router.linkTo('userDetail', { id: '123' }, 'View User');
```

### Debug Info

```ts
const info = router.debug();
console.log('Mode:', info.mode);
console.log('Base:', info.base);
console.log('Routes:', info.routes);
```

## TypeScript Support

Fully typed with comprehensive type definitions:

```ts
import type {
  Router,
  RouteContext,
  RouteDefinition,
  RouteHandler,
  Middleware,
  RouteParams,
  QueryParams,
  NavigateOptions,
  RouterMode,
  RouterOptions,
} from '@vielzeug/routeit';

// Custom context type
interface MyContext extends RouteContext {
  user: {
    id: string;
    name: string;
  };
}

// Typed handler
const handler: RouteHandler<MyContext> = (ctx) => {
  console.log(ctx.user.name); // Fully typed
};
```

## Best Practices

### 1. Use Named Routes

```ts
// ✅ Good - Easy to refactor
router.route({ path: '/users/:id', name: 'user', handler });
router.navigateTo('user', { id: '123' });

// ❌ Avoid - Hard to refactor
router.navigate('/users/123');
```

### 2. Centralize Middleware

```ts
// middleware.ts
export const requireAuth: Middleware = async (ctx, next) => {
  // ... auth logic
};

export const requireAdmin: Middleware = async (ctx, next) => {
  // ... admin check
};

// routes.ts
import { requireAuth, requireAdmin } from './middleware';

router.route({
  path: '/admin',
  middleware: [requireAuth, requireAdmin],
  handler: adminHandler
});
```

### 3. Type Your Context

```ts
interface AppContext extends RouteContext {
  user?: User;
  settings?: Settings;
}

const loadUser: Middleware<AppContext> = async (ctx, next) => {
  ctx.user = await fetchUser();
  await next();
};
```

### 4. Use Route Data

```ts
// ✅ Good - Metadata in route definition
router.route({
  path: '/admin',
  data: { title: 'Admin', requiresAuth: true },
  handler: ({ data }) => {
    document.title = data?.title || 'App';
  }
});
```

## Next Steps

- Check out [Examples](./examples.md) for real-world usage
- See [API Reference](./api.md) for complete API documentation
- Integrate with [Permit](../permit/index.md) for authorization

