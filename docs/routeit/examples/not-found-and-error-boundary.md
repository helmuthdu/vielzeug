---
title: 'Routeit Examples — Not Found and Error Boundary'
description: Model not-found pages and route errors using normal routes and middleware.
---

## Not Found and Error Boundary

Use `path: '*'` for not-found behavior and middleware for error boundaries.

```ts
import { createRouter, defineRoutes } from '@vielzeug/routeit';

const errorBoundary = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    reportError(error, { path: ctx.pathname });
    await ctx.replacePath('/error');
  }
};

const router = createRouter({
  middleware: errorBoundary,
  routes: defineRoutes({
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
  }),
});

router.start();
```

No special `onNotFound` or `onError` hooks are required.
