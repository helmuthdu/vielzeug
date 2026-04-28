---
title: 'Routeit Examples — Not Found and Error Boundary'
description: Model not-found pages and route errors using normal routes and middleware.
---

## Not Found and Error Boundary

Use `path: '*'` for not-found behavior and middleware for error boundaries.

```ts
import { createRouter } from '@vielzeug/routeit';

const errorBoundary = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
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

No special `onNotFound` or `onError` hooks are required.
