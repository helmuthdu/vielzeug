---
title: 'Wayfinder Examples — Not Found and Error Boundary'
description: 'Not found and error boundary example for @vielzeug/wayfinder.'
---

## Not Found and Error Boundary

### Problem

Not-found pages and data errors need different treatment: one is expected (wrong URL), one is unexpected (thrown exception). Both need centralized handling without special router hooks.

### Solution

Use the `notFound` option in `createRouter` for unmatched URLs. Wrap `await next()` in a try/catch middleware for error boundaries.

```ts
import { createRouter } from '@vielzeug/wayfinder';

const errorBoundary = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    // Report and redirect on any unhandled error from data().
    reportError(error, { path: ctx.pathname });
    await ctx.navigate({ path: '/error' }, { replace: true });
  }
};

const router = createRouter({
  middleware: [errorBoundary],
  routes: {
    home: {
      path: '/',
      component: HomePage,
    },
    error: {
      path: '/error',
      component: ErrorPage,
    },
  },
  notFound: {
    component: NotFoundPage,
  },
});
```

For per-route data errors that should render a degraded state instead of redirecting, use `onError` on the route definition:

```ts
const router = createRouter({
  routes: {
    userDetail: {
      path: '/users/:id',
      data: async ({ params }) => fetchUser(params.id),
      onError: (error) => ({ error, user: null }),
    },
  },
});
```

When `onError` returns a value, it becomes `match.data` and the route renders normally (`status: 'idle'`). The global error boundary is not triggered.

### Pitfalls

- An error thrown inside a middleware function _before_ calling `next()` is not caught by the boundary wrapping that same middleware. It propagates to `onError` instead.
- Navigating to `/error` inside the error boundary must not itself throw, or you risk an infinite loop.
- If `onError` itself throws, the router falls through to `status: 'error'` as usual and the global boundary fires.

### Related

- [Route Table Basics](./route-table-basics.md)
- [Auth and Guards](./auth-and-guards.md)
