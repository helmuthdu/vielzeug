---
title: 'Routeit Examples — Scroll Restoration'
description: 'Scroll Restoration examples for routeit.'
---

## Scroll Restoration

## Problem

Implement scroll restoration in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Manually restore scroll position on navigation:

```ts
import { createRouter } from '@vielzeug/routeit';

const scrollPositions = new Map<string, number>();

const router = createRouter({
  middleware: async (ctx, next) => {
    // Save current scroll before navigating away
    scrollPositions.set(router.state.pathname, window.scrollY);
    await next();
    // Restore after handler renders new content
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositions.get(ctx.pathname) ?? 0);
    });
  },
});

router
  .on('/', () => renderHome())
  .on('/about', () => renderAbout())
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
