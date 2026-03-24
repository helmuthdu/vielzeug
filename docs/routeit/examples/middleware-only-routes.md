---
title: 'Routeit Examples — Middleware-only Routes'
description: 'Middleware-only Routes examples for routeit.'
---

## Middleware-only Routes

## Problem

Implement middleware-only routes in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Register route-wide hooks without a terminal handler — useful for analytics, auth guards on a broad path prefix:

```ts
const router = createRouter();

// Log every navigation under /dashboard without a separate handler
router.on('/dashboard/*', {
  middleware: async (ctx, next) => {
    console.log('[analytics]', ctx.pathname);
    await next();
  },
});

// Then register the actual handlers — middleware runs first
router
  .group('/dashboard', (r) => {
    r.on('/', () => renderDashboard());
    r.on('/users', () => renderUsers());
  })
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
