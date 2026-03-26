---
title: 'Routeit Examples — Base Path Deployment'
description: 'Base Path Deployment examples for routeit.'
---

## Base Path Deployment

## Problem

Implement base path deployment in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Deploy at a subdirectory without changing route definitions:

```ts
const router = createRouter({ base: '/my-app' });

router
  .on('/', renderHome)
  .on('/about', renderAbout)
  .on('/users/:id', ({ params }) => renderUser(params.id), { name: 'user' })
  .start();

// Navigation and URL building automatically prepend /my-app
router.navigate('/about'); // pushes /my-app/about
router.url('user', { id: '7' }); // → '/my-app/users/7'
router.isActive('/about'); // true when at /my-app/about
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
- [Error Handling](./error-handling.md)
