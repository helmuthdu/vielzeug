<PackageBadges package="routeit" />

<img src="/logo-routeit.svg" alt="Routeit Logo" width="156" class="logo-highlight"/>

# Routeit

**Routeit** is a lightweight, type-safe client-side routing library for building modern single-page applications. It provides powerful features like middleware, nested routes, and permission integration with zero dependencies.

## What Problem Does Routeit Solve?

Client-side routing is essential for SPAs, but most routers are either too complex, framework-specific, or lack proper TypeScript support. Routeit provides a clean, type-safe routing solution that works with any framework.

**Traditional Approach**:

```ts
// Manual route handling
window.addEventListener('popstate', () => {
  const path = window.location.pathname;

  if (path === '/') {
    renderHome();
  } else if (path.startsWith('/users/')) {
    const id = path.split('/')[2];
    renderUser(id);
  } else if (path === '/about') {
    renderAbout();
  } else {
    render404();
  }
});

// Manual navigation
function navigate(path) {
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
```

**With Routeit**:

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter();

router
  .get('/', () => renderHome())
  .get('/users/:id', ({ params }) => renderUser(params.id))
  .get('/about', () => renderAbout())
  .start();

// Navigate with built-in method
router.navigate('/users/123');
```

### Comparison with Alternatives

| Feature            | Routeit                                               | React Router | Vue Router  |
| ------------------ | ----------------------------------------------------- | ------------ | ----------- |
| Bundle Size        | **<PackageInfo package="routeit" type="size" />**     | ~65 KB       | ~42 KB      |
| Dependencies       | <PackageInfo package="routeit" type="dependencies" /> | React        | Vue         |
| TypeScript         | ✅ First-class                                        | ✅ Good      | ✅ Good     |
| Framework          | Agnostic                                              | React only   | Vue only    |
| Middleware System  | ✅ Built-in                                           | ❌           | ✅ Built-in |

## When to Use Routeit

**✅ Use Routeit when you:**

- Need framework-agnostic routing across React, Vue, Svelte, or vanilla JS
- Want a powerful middleware system for auth, logging, and request handling
- Require minimal bundle size (<PackageInfo package="routeit" type="size" />)
- Need type-safe route parameters and query strings
- Want to integrate with @vielzeug/permit for permission-based routing
- Build SPAs with nested routes and layouts
- Need both hash and history mode support
- Prefer zero dependencies for better security and maintainability

**❌ Consider alternatives when you:**

- Only use React and need deep React integration (use React Router)
- Only use Vue and want Vue-specific optimizations (use Vue Router)
- Need server-side rendering (SSR) with file-based routing
- Build static sites without client-side navigation
- Require framework-specific DevTools integration

## 🚀 Key Features

- **Type-Safe Parameters** – Automatic extraction and type inference
- **Middleware System** – Powerful async middleware for auth, logging, and more
- **Framework Agnostic** – Works with React, Vue, Svelte, or vanilla JS
- **Nested Routes** – Support for child routes and layouts
- **Query Parameters** – Automatic parsing and array support
- **Permission Integration** – Works seamlessly with @vielzeug/permit
- **Hash & History Mode** – Choose between hash-based or HTML5 History API
- **Named Routes** – Navigate by name with parameter substitution
- **Lightweight** – Only <PackageInfo package="routeit" type="size" /> gzipped, <PackageInfo package="routeit" type="dependencies" /> dependencies

## 🏁 Quick Start

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter();

router
  .get('/', () => {
    document.getElementById('app').innerHTML = '<h1>Home</h1>';
  })
  .get('/users/:id', ({ params }) => {
    document.getElementById('app').innerHTML = `<h1>User ${params.id}</h1>`;
  })
  .start();
```

::: tip Next Steps

- See [Usage Guide](./usage.md) for middleware, nested routes, and query parameters
- Check [Examples](./examples.md) for framework integrations
  :::

## 🎓 Core Concepts

### Route Parameters

Extract dynamic segments from URLs:

```ts
router.get('/users/:userId/posts/:postId', ({ params }) => {
  console.log(params.userId); // '123'
  console.log(params.postId); // '456'
});
// Matches: /users/123/posts/456
```

### Middleware

Execute code before route handlers:

```ts
const requireAuth: Middleware = async (ctx, next) => {
  const user = await getCurrentUser();
  if (!user) {
    ctx.navigate('/login');
    return;
  }
  ctx.user = user;
  await next();
};

router.route({
  path: '/dashboard',
  middleware: requireAuth,
  handler: (ctx) => {
    console.log('User:', ctx.user);
  },
});
```

### Query Parameters

Automatic query string parsing:

```ts
router.get('/search', ({ query }) => {
  console.log(query.q); // 'test'
  console.log(query.filter); // ['new', 'sale']
});
// Matches: /search?q=test&filter=new&filter=sale
```

### Named Routes

Navigate by route name:

```ts
router.route({
  path: '/users/:id',
  name: 'userDetail',
  handler: ({ params }) => {
    console.log('User:', params.id);
  },
});

// Navigate using name
router.navigateTo('userDetail', { id: '123' });
// Or build URL
const url = router.urlFor('userDetail', { id: '123' }); // '/users/123'
```

## ❓ FAQ

### Can I use this with React/Vue/Svelte?

Yes! Routeit is framework-agnostic. See the [Examples](./examples.md) for integration examples.

### How do I handle authentication?

Use middleware! Check the [Usage Guide](./usage.md#middleware) for auth examples.

### Does it support nested routes?

Yes, through the `children` property. See [Nested Routes](./usage.md#nested-routes).

### What about lazy loading?

Use async middleware to load route modules dynamically. See [Examples](./examples.md).

### Can I integrate with @vielzeug/permit?

Absolutely! See the [Permission Integration](./usage.md#permission-integration) section.

## 🐛 Troubleshooting

### Routes not matching

::: danger Problem
Routes aren't being matched or triggered.
:::

::: tip Solution
Check your path syntax and router setup:

- Use `:param` for parameters (e.g., `/users/:id`)
- Ensure router is started with `.start()`
- Verify base path configuration

:::

### Middleware not executing

::: danger Problem
Middleware functions not being called.
:::

::: tip Solution
Make sure to call `await next()` to continue the chain:

```ts
router.use(async (ctx, next) => {
  console.log('Before');
  await next(); // ✅ Must call next()
  console.log('After');
});
```

Check execution order: global → route → handler

:::

### 404 handler not working

::: danger Problem
404 handler not being triggered for unmatched routes.
:::

::: tip Solution
Provide a `notFound` handler in router options:

```ts
const router = createRouter({
  notFound: (ctx) => {
    ctx.response = { status: 404, body: 'Not Found' };
  },
});
```

Check if another route is matching first.

:::

### Hash mode not working

::: danger Problem
Hash routing not functioning correctly.
:::

::: tip Solution
Ensure `mode: 'hash'` is set and URLs include `#`:

```ts
const router = createRouter({
  mode: 'hash', // ✅ Enable hash mode
  routes: [
    /* ... */
  ],
});

// URL format: http://example.com/#/about
```

:::

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](../../CONTRIBUTING.md).

## 📄 License

MIT © [Vielzeug](https://github.com/yourusername/vielzeug)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/yourusername/vielzeug)
- [npm Package](https://www.npmjs.com/package/@vielzeug/routeit)
- [Report Issues](https://github.com/yourusername/vielzeug/issues)
- [Changelog](https://github.com/yourusername/vielzeug/blob/main/packages/routeit/CHANGELOG.md)
