---
title: 'Routeit Examples — Named Routes & URL Builder'
description: 'Named Routes & URL Builder examples for routeit.'
---

## Named Routes & URL Builder

## Problem

Implement named routes & url builder in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Keep navigation refactor-proof with named routes:

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({ base: '/app' });

router.routes([
  { path: '/', name: 'home', handler: renderHome },
  { path: '/users', name: 'userList', handler: renderUsers },
  { path: '/users/:id', name: 'userDetail', handler: ({ params }) => renderUser(params.id) },
  { path: '/users/:id/posts/:postId', name: 'userPost', handler: ({ params }) => renderPost(params) },
]);
router.start();

// Navigate by name — never hard-code paths
router.navigate({ name: 'userDetail', params: { id: '42' } });
router.navigate({ name: 'userDetail', params: { id: '42' }, hash: 'activity' });

// Build URLs for links
router.url('userDetail', { id: '42' }); // '/app/users/42'
router.url('userPost', { id: '1', postId: '99' }); // '/app/users/1/posts/99'
router.url('userList', undefined, { page: '2' }); // '/app/users?page=2'
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
