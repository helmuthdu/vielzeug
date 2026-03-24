---
title: 'Routeit Examples — Lazy Loading'
description: 'Lazy Loading examples for routeit.'
---

## Lazy Loading

## Problem

Implement lazy loading in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Load route modules on demand:

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware, RouteContext } from '@vielzeug/routeit';

const router = createRouter();

type RouteModule = { default: (ctx: RouteContext) => void | Promise<void> };

const lazyLoad =
  (importFn: () => Promise<RouteModule>): Middleware =>
  async (ctx, next) => {
    const module = await importFn();
    ctx.locals.component = module.default;
    await next();
  };

router
  .on(
    '/dashboard',
    (ctx) => {
      (ctx.locals.component as RouteModule['default'])(ctx);
    },
    { middleware: lazyLoad(() => import('./routes/dashboard')) },
  )

  .on(
    '/analytics',
    (ctx) => {
      (ctx.locals.component as RouteModule['default'])(ctx);
    },
    { middleware: lazyLoad(() => import('./routes/analytics')) },
  )

  .start();
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
