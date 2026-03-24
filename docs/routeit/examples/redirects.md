---
title: 'Routeit Examples — Redirects'
description: 'Redirects examples for routeit.'
---

## Redirects

## Problem

Implement redirects in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Permanent and temporary URL redirects:

```ts
const router = createRouter();

// Redirect old paths to new canonical ones (replaces history entry by default)
router.redirect('/old-about', '/about');
router.redirect('/legacy/users/:id', '/users/:id');

// Temporary redirect — push a new history entry
router.redirect('/beta', '/dashboard', { replace: false });

router
  .on('/about', renderAbout)
  .on('/users/:id', ({ params }) => renderUser(params.id))
  .on('/dashboard', renderDashboard)
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
