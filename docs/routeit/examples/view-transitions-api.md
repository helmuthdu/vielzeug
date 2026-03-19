---
title: 'Routeit Examples — View Transitions API'
description: 'View Transitions API examples for routeit.'
---

## View Transitions API

## Problem

Implement view transitions api in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Enable browser-native page transitions:

```ts
const router = createRouter({ viewTransition: true });

router.on('/', renderHome).on('/gallery', renderGallery).start();

// Override per-navigation
router.navigate('/gallery', { viewTransition: false });
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
