---
title: 'Routeit Examples — SPA with Layout Selection'
description: 'SPA with Layout Selection examples for routeit.'
---

## SPA with Layout Selection

## Problem

Implement spa with layout selection in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Use route `meta` to select layouts without repeating middleware:

```ts
import { createRouter } from '@vielzeug/routeit';

type LayoutMeta = { layout?: 'default' | 'dashboard' | 'fullscreen' };

const router = createRouter({
  middleware: async (ctx, next) => {
    await next();
    const layout = (ctx.meta as LayoutMeta | undefined)?.layout ?? 'default';
    document.body.dataset.layout = layout;
  },
});

router.routes([
  { path: '/', meta: { layout: 'default' }, handler: renderHome },
  { path: '/about', meta: { layout: 'default' }, handler: renderAbout },
  { path: '/dashboard', meta: { layout: 'dashboard' }, handler: renderDashboard },
  { path: '/dashboard/settings', meta: { layout: 'dashboard' }, handler: renderSettings },
  { path: '/preview/:id', meta: { layout: 'fullscreen' }, handler: ({ params }) => renderPreview(params.id) },
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
