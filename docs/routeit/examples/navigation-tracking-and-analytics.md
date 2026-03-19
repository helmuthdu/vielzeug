---
title: 'Routeit Examples — Navigation Tracking & Analytics'
description: 'Navigation Tracking & Analytics examples for routeit.'
---

## Navigation Tracking & Analytics

## Problem

Implement navigation tracking & analytics in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Log every navigation with route metadata:

```ts
import { createRouter } from '@vielzeug/routeit';

type PageMeta = { page?: string };

const router = createRouter({
  middleware: async (ctx, next) => {
    const start = performance.now();
    await next();
    const meta = ctx.meta as PageMeta | undefined;
    analytics.track('page_view', {
      pathname: ctx.pathname,
      page: meta?.page,
      params: ctx.params,
      duration: performance.now() - start,
    });
  },
});

router.routes([
  { path: '/', meta: { page: 'home' }, handler: renderHome },
  { path: '/pricing', meta: { page: 'pricing' }, handler: renderPricing },
  { path: '/users/:id', meta: { page: 'user_detail' }, handler: ({ params }) => renderUser(params.id) },
]);
router.start();
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Authentication](./authentication.md)
- [autoStart](./autostart.md)
- [Base Path Deployment](./base-path-deployment.md)
