---
title: 'Routeit Examples — autoStart'
description: 'autoStart examples for routeit.'
---

## autoStart

## Problem

Implement autostart in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Skip the `.start()` call using the `autoStart` option:

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({ autoStart: true });

// Routes registered before the first tick are matched automatically on load
router.on('/', renderHome).on('/about', renderAbout);
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
- [Base Path Deployment](./base-path-deployment.md)
- [Error Handling](./error-handling.md)
