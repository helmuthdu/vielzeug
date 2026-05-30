---
title: 'Wayfinder Examples — Not Found and Error Boundary'
description: 'Not found and error boundary example for @vielzeug/wayfinder.'
---

## Not Found and Error Boundary

### Problem

Not-found pages and data errors need different treatment: one is expected (wrong URL), one is unexpected (thrown exception). Both need centralized handling without special router hooks.

### Solution

Use `path: '*'` for not-found behavior. Wrap `await next()` in a try/catch middleware for error boundaries.

```ts
import { createRouter } from '@vielzeug/wayfinder';

const errorBoundary = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    // Report and redirect on any unhandled error from data() or handler().
    reportError(error, { path: ctx.pathname });
    await ctx.navigate({ path: '/error' }, { replace: true });
  }
};

const router = createRouter({
  middleware: [errorBoundary],
  routes: {
    home: {
      path: '/',
      handler: () => renderHome(),
    },
    error: {
      path: '/error',
      handler: () => renderErrorPage(),
    },
    notFound: {
      path: '*',
      handler: () => renderNotFound(),
    },
  },
});
```

### Pitfalls

- Place `notFound: { path: '*' }` last in the route table. Routes are matched in key order, and `*` matches everything.
- An error thrown inside a middleware function _before_ calling `next()` is not caught by the boundary wrapping that same middleware. It propagates to `onError` instead.
- Navigating to `/error` inside the error boundary must not itself throw, or you risk an infinite loop.

### Related

- [Route Table Basics](./route-table-basics.md)
- [Auth and Guards](./auth-and-guards.md)
