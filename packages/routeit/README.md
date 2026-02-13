# @vielzeug/routeit

Lightweight, type-safe client-side routing. Build powerful SPAs with minimal code and maximum flexibility.

## Features

- ✅ **Type-Safe** - Full TypeScript support with parameter extraction
- ✅ **Framework Agnostic** - Works with React, Vue, Svelte, or vanilla JS  
- ✅ **Route Parameters** - Extract params from dynamic routes (`/users/:id`)
- ✅ **Query Parameters** - Automatic query string parsing
- ✅ **Middleware System** - Powerful middleware for auth, logging, and more
- ✅ **Nested Routes** - Support for child routes and layouts
- ✅ **Hash & History Mode** - Choose between hash-based or HTML5 History API
- ✅ **Permission Integration** - Works seamlessly with @vielzeug/permit
- ✅ **Lightweight** - ~3.1 KB gzipped, zero dependencies
- ✅ **Developer Experience** - Intuitive API with comprehensive utilities

## Installation

```bash
# pnpm
pnpm add @vielzeug/routeit

# npm
npm install @vielzeug/routeit

# yarn
yarn add @vielzeug/routeit
```

## Quick Start

```typescript
import { createRouter } from '@vielzeug/routeit';

// Create a router
const router = createRouter({
  mode: 'history', // or 'hash'
  base: '/',
});

// Register routes
router
  .get('/', ({ navigate }) => {
    console.log('Home page');
    document.getElementById('app').innerHTML = '<h1>Home</h1>';
  })
  .get('/about', () => {
    console.log('About page');
    document.getElementById('app').innerHTML = '<h1>About</h1>';
  })
  .get('/users/:id', ({ params }) => {
    console.log('User ID:', params.id);
    document.getElementById('app').innerHTML = `<h1>User ${params.id}</h1>`;
  })
  .start(); // Start listening for route changes

// Navigate programmatically
router.navigate('/users/123');
```

## Core Concepts

### Router Creation

```typescript
import { createRouter } from '@vielzeug/routeit';

// Basic router with defaults
const router = createRouter();

// Router with options
const router = createRouter({
  mode: 'history', // 'history' or 'hash'
  base: '/app', // Base path for all routes
  notFound: ({ pathname }) => {
    console.log('404:', pathname);
    document.getElementById('app').innerHTML = '<h1>404 Not Found</h1>';
  },
  middleware: async (ctx, next) => {
    // Global middleware - runs for every route
    console.log('Navigating to:', ctx.pathname);
    await next();
  },
});
```

### Route Registration

```typescript
// Single route
router.route({
  path: '/products/:id',
  handler: ({ params, query }) => {
    console.log('Product:', params.id);
    console.log('Search:', query.q);
  },
});

// Multiple routes at once
router.routes([
  { path: '/', handler: homeHandler },
  { path: '/about', handler: aboutHandler },
  { path: '/contact', handler: contactHandler },
]);

// Convenience method for GET-like routes
router.get('/blog', ({ pathname }) => {
  console.log('Blog page:', pathname);
});

// Method chaining
router
  .get('/', homeHandler)
  .get('/about', aboutHandler)
  .get('/users/:id', userHandler)
  .start();
```

### Route Parameters

```typescript
// Dynamic segments
router.get('/users/:userId', ({ params }) => {
  console.log('User ID:', params.userId);
  // GET /users/123 → params.userId = '123'
});

// Multiple parameters
router.get('/users/:userId/posts/:postId', ({ params }) => {
  console.log('User:', params.userId);
  console.log('Post:', params.postId);
  // GET /users/123/posts/456
  // → params.userId = '123', params.postId = '456'
});

// Wildcard routes
router.get('/docs/*', ({ pathname }) => {
  console.log('Docs path:', pathname);
  // GET /docs/guide/intro → matches
  // GET /docs/api/reference → matches
});
```

### Query Parameters

```typescript
router.get('/search', ({ query }) => {
  console.log('Query:', query.q);
  console.log('Page:', query.page);
  // GET /search?q=test&page=2
  // → query.q = 'test', query.page = '2'
});

// Array query parameters
router.get('/filter', ({ query }) => {
  console.log('Tags:', query.tags);
  // GET /filter?tags=a&tags=b&tags=c
  // → query.tags = ['a', 'b', 'c']
});

// Mixed parameters
router.get('/products/:category', ({ params, query }) => {
  console.log('Category:', params.category);
  console.log('Sort:', query.sort);
  console.log('Filters:', query.filter);
  // GET /products/electronics?sort=price&filter=new&filter=sale
  // → params.category = 'electronics'
  // → query.sort = 'price'
  // → query.filter = ['new', 'sale']
});
```

### Navigation

```typescript
// Navigate to path
router.navigate('/about');

// Navigate with query parameters
router.navigate('/search?q=test');

// Replace current entry (doesn't create history entry)
router.navigate('/login', { replace: true });

// Navigate with state
router.navigate('/profile', {
  state: { from: '/settings' },
});

// Build URLs programmatically
const url = router.buildUrl('/users/:id', { id: '123' });
console.log(url); // '/users/123'

const searchUrl = router.buildUrl('/search', undefined, {
  q: 'test',
  page: '2',
});
console.log(searchUrl); // '/search?q=test&page=2'

// Navigate from within route handler
router.get('/old-page', ({ navigate }) => {
  navigate('/new-page');
});

// History navigation
router.back(); // Go back one page
router.forward(); // Go forward one page
router.go(-2); // Go back 2 pages
router.go(1); // Go forward 1 page
```

### Route Context

Every route handler receives a context object:

```typescript
router.get('/users/:id', (context) => {
  // Route parameters
  console.log(context.params.id);

  // Query parameters
  console.log(context.query);

  // Full pathname
  console.log(context.pathname);

  // Hash (without #)
  console.log(context.hash);

  // Custom data (if provided in route definition)
  console.log(context.data);

  // Navigate function
  context.navigate('/another-page');
});

// TypeScript: Type the context
type RouteData = { requiresAuth: boolean };

router.route<RouteData>({
  path: '/admin',
  handler: (context) => {
    // context.data is typed as RouteData
    if (context.data?.requiresAuth) {
      console.log('Auth required');
    }
  },
  data: { requiresAuth: true },
});
```

### Middleware

Middleware allows you to execute code before route handlers, modify context, or block navigation.

```typescript
import type { Middleware } from '@vielzeug/routeit';

// Basic middleware
const loggerMiddleware: Middleware = async (ctx, next) => {
  console.log('Navigating to:', ctx.pathname);
  await next(); // Continue to next middleware or handler
  console.log('Navigation complete');
};

// Authentication middleware
const requireAuth: Middleware = async (ctx, next) => {
  const user = await getCurrentUser();
  
  if (!user) {
    ctx.navigate('/login');
    return; // Don't call next() - blocks execution
  }
  
  ctx.user = user; // Add user to context
  await next();
};

// Route-specific middleware
router.route({
  path: '/dashboard',
  middleware: requireAuth,
  handler: (ctx) => {
    console.log('User:', ctx.user);
  }
});

// Multiple middleware (executed in order)
router.route({
  path: '/admin',
  middleware: [requireAuth, requireAdmin],
  handler: () => {
    console.log('Admin page');
  }
});

// Global middleware (runs for all routes)
const router = createRouter({
  middleware: [loggerMiddleware, errorHandler]
});
```

**Middleware Execution Order:**
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

**Context Enhancement:**
```typescript
// Middleware can modify the context
const dataLoader: Middleware = async (ctx, next) => {
  // Add metadata
  ctx.meta = { 
    loadedAt: Date.now(),
    environment: 'production' 
  };
  
  // Load user data
  ctx.user = await fetchUser();
  
  await next();
};

// Handler can access enhanced context
router.route({
  path: '/profile',
  middleware: dataLoader,
  handler: (ctx) => {
    console.log('User:', ctx.user);
    console.log('Meta:', ctx.meta);
  }
});
```

**Integration with @vielzeug/permit:**
```typescript
import { Permit } from '@vielzeug/permit';
import type { BaseUser, PermissionAction } from '@vielzeug/permit';

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

### Nested Routes

```typescript
router.route({
  path: '/users',
  handler: () => {
    console.log('Users section');
  },
  children: [
    {
      path: '/list',
      handler: () => {
        console.log('User list');
        // GET /users/list
      },
    },
    {
      path: '/:id',
      handler: ({ params }) => {
        console.log('User details:', params.id);
        // GET /users/123
      },
    },
    {
      path: '/:id/edit',
      handler: ({ params }) => {
        console.log('Edit user:', params.id);
        // GET /users/123/edit
      },
    },
  ],
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
        // GET /organizations/abc/projects/xyz
      },
    },
  ],
});
```

### Subscriptions

```typescript
// Subscribe to route changes
const unsubscribe = router.subscribe(() => {
  console.log('Route changed!');
  console.log('Current path:', router.getCurrentPath());
  console.log('Query params:', router.getCurrentQuery());
});

// Later... unsubscribe
unsubscribe();

// React integration
import { useEffect, useState } from 'react';

function useRouter(router) {
  const [, setTick] = useState(0);

  useEffect(() => {
    return router.subscribe(() => {
      setTick((t) => t + 1); // Force re-render
    });
  }, [router]);

  return {
    pathname: router.getCurrentPath(),
    query: router.getCurrentQuery(),
    navigate: router.navigate.bind(router),
  };
}

// Usage
function App() {
  const { pathname, query, navigate } = useRouter(router);

  return (
    <div>
      <p>Current path: {pathname}</p>
      <button onClick={() => navigate('/about')}>Go to About</button>
    </div>
  );
}
```

### Utilities

```typescript
// Check if route is active
if (router.isActive('/users/:id')) {
  console.log('On user page');
}

if (router.isActive('/admin/*')) {
  console.log('In admin section');
}

// Get current route info
const pathname = router.getCurrentPath();
const query = router.getCurrentQuery();
const hash = router.getCurrentHash();

console.log('Current:', pathname); // '/users/123'
console.log('Query:', query); // { tab: 'profile' }
console.log('Hash:', hash); // 'section-1'

// Build URLs
const userUrl = router.buildUrl('/users/:id', { id: '123' });
console.log(userUrl); // '/users/123'

const searchUrl = router.buildUrl(
  '/search',
  undefined,
  { q: 'test', filter: ['new', 'sale'] }
);
console.log(searchUrl); // '/search?q=test&filter=new&filter=sale'

const fullUrl = router.buildUrl(
  '/users/:id',
  { id: '123' },
  { tab: 'posts', page: '2' }
);
console.log(fullUrl); // '/users/123?tab=posts&page=2'
```

## Advanced Usage

### Custom 404 Handler

```typescript
const router = createRouter({
  notFound: ({ pathname, navigate }) => {
    console.log('404:', pathname);
    
    // Render 404 page
    document.getElementById('app').innerHTML = `
      <div>
        <h1>404 - Page Not Found</h1>
        <p>The page "${pathname}" does not exist.</p>
        <button onclick="router.navigate('/')">Go Home</button>
      </div>
    `;
    
    // Or redirect
    // navigate('/', { replace: true });
  },
});
```

### Route Data & Metadata

```typescript
type RouteMetadata = {
  title: string;
  requiresAuth?: boolean;
  roles?: string[];
};

router.route<RouteMetadata>({
  path: '/admin',
  handler: ({ data }) => {
    document.title = data?.title || 'App';
    console.log('Required roles:', data?.roles);
  },
  data: {
    title: 'Admin Dashboard',
    requiresAuth: true,
    roles: ['admin'],
  },
  middleware: async ({ data }, next) => {
    if (data?.requiresAuth && !isAuthenticated()) {
      router.navigate('/login');
      return;
    }
    if (data?.roles && !hasRole(data.roles)) {
      router.navigate('/forbidden');
      return;
    }
    await next();
  },
});
```

### Hash Mode

```typescript
// Use hash-based routing for GitHub Pages or static hosting
const router = createRouter({
  mode: 'hash',
  base: '/',
});

router
  .get('/', () => {
    console.log('Home');
    // URL: https://example.com/#/
  })
  .get('/about', () => {
    console.log('About');
    // URL: https://example.com/#/about
  })
  .get('/users/:id', ({ params }) => {
    console.log('User:', params.id);
    // URL: https://example.com/#/users/123
  })
  .start();
```

### Base Path

```typescript
// App deployed at /my-app/ instead of root
const router = createRouter({
  mode: 'history',
  base: '/my-app',
});

router.get('/about', () => {
  console.log('About');
  // Full URL: https://example.com/my-app/about
});

router.navigate('/contact');
// Navigates to: https://example.com/my-app/contact
```

## Bundle Size

- **Raw**: ~9.9 KB
- **Minified**: ~5.7 KB  
- **Gzipped**: ~3.1 KB (ESM) / ~2.1 KB (CJS)

## TypeScript Support

Fully typed with comprehensive type definitions:

```typescript
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
```

## Browser Support

Works in all modern browsers that support:
- ES6 (ES2015)
- URL API
- URLSearchParams
- History API (for history mode)
- hashchange event (for hash mode)

## License

MIT

## Contributing

Contributions are welcome! Please read our [contributing guidelines](../../CONTRIBUTING.md) for details.

## Links

- [Documentation](https://vielzeug.dev/routeit)
- [GitHub Repository](https://github.com/yourusername/vielzeug)
- [npm Package](https://www.npmjs.com/package/@vielzeug/routeit)
- [Report Issues](https://github.com/yourusername/vielzeug/issues)

