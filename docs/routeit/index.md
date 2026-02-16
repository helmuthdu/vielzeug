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

| Feature            | Routeit                                               | React Router | Vue Router |
| ------------------ | ----------------------------------------------------- | ------------ | ---------- |
| Bundle Size        | **<PackageInfo package="routeit" type="size" />**     | ~11KB        | ~22KB      |
| Dependencies       | <PackageInfo package="routeit" type="dependencies" /> | React        | Vue        |
| TypeScript         | Native                                                | Good         | Good       |
| Framework Agnostic | ✅                                                    | ❌           | ❌         |
| Middleware System  | ✅                                                    | ❌           | ✅         |

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

Install the package:

```bash
pnpm add @vielzeug/routeit
```

Create a basic router:

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter();

router
  .get('/', () => {
    document.getElementById('app').innerHTML = '<h1>Home</h1>';
  })
  .get('/about', () => {
    document.getElementById('app').innerHTML = '<h1>About</h1>';
  })
  .get('/users/:id', ({ params }) => {
    document.getElementById('app').innerHTML = `<h1>User ${params.id}</h1>`;
  })
  .start();
```

## 📚 Documentation

- [Usage Guide](./usage.md) – Comprehensive usage guide
- [API Reference](./api.md) – Complete API documentation
- [Examples](./examples.md) – Real-world examples

## 💡 Core Concepts

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

**Q: Can I use this with React/Vue/Svelte?**  
A: Yes! Routeit is framework-agnostic. See the [Examples](./examples.md) for integration examples.

**Q: How do I handle authentication?**  
A: Use middleware! Check the [Usage Guide](./usage.md#middleware) for auth examples.

**Q: Does it support nested routes?**  
A: Yes, through the `children` property. See [Nested Routes](./usage.md#nested-routes).

**Q: What about lazy loading?**  
A: Use async middleware to load route modules dynamically. See [Examples](./examples.md).

**Q: Can I integrate with @vielzeug/permit?**  
A: Absolutely! See the [Permission Integration](./usage.md#permission-integration) section.

## 🐛 Troubleshooting

**Routes not matching:**

- Check path syntax – use `:param` for parameters
- Ensure router is started with `.start()`
- Verify base path configuration

**Middleware not executing:**

- Make sure to call `await next()` to continue the chain
- Check execution order (global → route → handler)

**404 not working:**

- Provide a `notFound` handler in router options
- Check if another route is matching first

**Hash mode not working:**

- Ensure `mode: 'hash'` is set in router options
- Check URL format includes `#` (e.g., `#/about`)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](../../CONTRIBUTING.md).

## 📄 License

MIT © [Vielzeug](https://github.com/yourusername/vielzeug)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/yourusername/vielzeug)
- [npm Package](https://www.npmjs.com/package/@vielzeug/routeit)
- [Report Issues](https://github.com/yourusername/vielzeug/issues)
- [Changelog](https://github.com/yourusername/vielzeug/blob/main/packages/routeit/CHANGELOG.md)
