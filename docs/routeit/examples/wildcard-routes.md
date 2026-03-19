---
title: 'Routeit Examples — Wildcard Routes'
description: 'Wildcard Routes examples for routeit.'
---

## Wildcard Routes

## Problem

Implement wildcard routes in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Capture the rest of a path as a named param:

```ts
const router = createRouter();

// Named wildcard — ctx.params.rest = 'guide/getting-started'
router.on(
  '/docs/:rest*',
  ({ params }) => {
    renderDoc(params.rest);
  },
  { name: 'doc' },
);

// Catch-all 404
router.on('*', () => render404());

router.start();

// URL builder works with named wildcard params
router.url('doc', { rest: 'api/createrouter' }); // → '/docs/api/createrouter'
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
