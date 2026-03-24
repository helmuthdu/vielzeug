---
title: 'Routeit Examples — Hash Fragment Navigation'
description: 'Hash Fragment Navigation examples for routeit.'
---

## Hash Fragment Navigation

## Problem

Implement hash fragment navigation in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Navigate to in-page anchors via named routes:

```ts
const router = createRouter();

router.on(
  '/docs/:page',
  ({ params, hash }) => {
    renderPage(params.page);
    if (hash) {
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  },
  { name: 'docs' },
);

router.start();

// Navigate to a section
router.navigate({ name: 'docs', params: { page: 'api' }, hash: 'createrouter' });
// → /docs/api#createrouter
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
