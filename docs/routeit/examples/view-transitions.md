---
title: 'Routeit Examples — View Transitions'
description: 'View Transitions examples for routeit.'
---

## View Transitions

## Problem

Implement view transitions in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Animate page changes with the View Transition API:

```ts
import { createRouter } from '@vielzeug/routeit';

// Enable globally
const router = createRouter({ viewTransition: true });

router
  .on('/', () => renderHome())
  .on('/about', () => renderAbout())
  .start();

// Or per navigation
await router.navigate('/about', { viewTransition: true });
```

CSS to animate the transition:

```css
::view-transition-old(root) {
  animation: fade-out 150ms ease;
}
::view-transition-new(root) {
  animation: fade-in 150ms ease;
}

@keyframes fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
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
