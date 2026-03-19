---
title: 'Routeit Examples — Same-URL Deduplication'
description: 'Same-URL Deduplication examples for routeit.'
---

## Same-URL Deduplication

## Problem

Implement same-url deduplication in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

By default, navigating to the current URL is a no-op. Use `force: true` to bypass this:

```ts
const router = createRouter();
router.on('/feed', () => refreshFeed()).start();

// No-op if already at /feed
router.navigate('/feed');

// Force re-run even if already at /feed
document.getElementById('refreshBtn')!.onclick = () => {
  router.navigate('/feed', { force: true });
};
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
