---
title: 'Routeit Examples — Error Handling'
description: 'Error Handling examples for routeit.'
---

## Error Handling

## Problem

Implement error handling in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Global error handling with `onError` and `onNotFound`:

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({
  onError: async (error, ctx) => {
    console.error('Route error at', ctx.pathname, error);
    await ctx.navigate('/error');
  },
  onNotFound: ({ pathname }) => {
    document.getElementById('app')!.innerHTML = `
      <h1>404 – Not Found</h1>
      <p>The page "${pathname}" does not exist.</p>
    `;
  },
});

router
  .on('/flaky', async () => {
    const data = await fetchData(); // may throw — caught by onError
    render(data);
  })
  .on('/error', () => render('<h1>Something went wrong</h1>'))
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
