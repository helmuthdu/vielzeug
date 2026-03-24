---
title: 'Routeit Examples — Hash Mode (SPA without server config)'
description: 'Hash Mode (SPA without server config) examples for routeit.'
---

## Hash Mode (SPA without server config)

## Problem

Implement hash mode (spa without server config) in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

```ts
const router = createRouter({ mode: 'hash' });

router
  .on('/', () => renderHome())
  .on('/users/:id', ({ params }) => renderUser(params.id))
  .start();

// URLs: https://example.com/#/users/42
await router.navigate('/users/42'); // sets location.hash = '/users/42'
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
