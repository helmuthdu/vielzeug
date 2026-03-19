---
title: 'Routeit Examples — Page Titles from Meta'
description: 'Page Titles from Meta examples for routeit.'
---

## Page Titles from Meta

## Problem

Implement page titles from meta in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Update `document.title` reactively from route metadata:

```ts
type RouteMeta = { title?: string };

const router = createRouter();

router
  .on('/', () => renderHome(), { name: 'home', meta: { title: 'Home' } })
  .on('/about', () => renderAbout(), { name: 'about', meta: { title: 'About' } })
  .on('/users', () => renderUsers(), { name: 'users', meta: { title: 'Users' } })
  .start();

router.subscribe(({ meta }) => {
  const m = meta as RouteMeta | undefined;
  document.title = m?.title ? `${m.title} — My App` : 'My App';
});
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
