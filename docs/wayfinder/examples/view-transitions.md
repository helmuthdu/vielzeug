---
title: 'Wayfinder Examples — View Transitions'
description: 'View transitions example for @vielzeug/wayfinder.'
---

## View Transitions

### Problem

The View Transition API requires wrapping every history push in `document.startViewTransition()`. Integrating this manually with a client-side router creates race conditions between animation callbacks and navigation state updates.

### Solution

Set `viewTransition: true` at router creation. Route automatically wraps each navigation commit in `document.startViewTransition()`. Override per navigation with `{ viewTransition: false }`.

```ts
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  viewTransition: true,
  routes: {
    home: { path: '/' },
    settings: { path: '/settings' },
  },
  notFound: { component: NotFoundPage },
});

await router.navigate({ name: 'settings' }); // uses transition
await router.navigate({ name: 'home' }, { viewTransition: false }); // skips transition
```

Optional CSS:

```css
::view-transition-old(root) {
  animation: fade-out 160ms ease;
}

::view-transition-new(root) {
  animation: fade-in 160ms ease;
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

### Pitfalls

- `document.startViewTransition` is not available in all browsers and is absent in Node.js test environments. Wayfinder falls back to a plain navigation silently, so tests always pass.
- Transitions run synchronously during the commit phase of navigation. Heavy CSS animations block the next interaction until the transition resolves.
- Per-navigation `{ viewTransition: false }` still runs `document.startViewTransition` if the router default is `true`; it means the transition is skipped for the DOM swap, not the API call.

### Related

- [Route Table Basics](./route-table-basics.md)
