---
title: 'Wayfinder Examples — View Transitions'
description: 'View transitions example for @vielzeug/wayfinder.'
---

## View Transitions

### Problem

The View Transition API must wrap the state update that triggers rendering. Applying it after a router subscription fires is too late and can race with navigation.

### Solution

Set `viewTransition: true` at router creation. Wayfinder wraps the navigation commit and falls back to plain navigation when the browser API is unavailable. Override the default per navigation.

```ts
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  routes: {
    home: { path: '/' },
    settings: { path: '/settings' },
  },
  viewTransition: true,
});

await router.navigate({ name: 'settings' });
await router.navigate({ name: 'home' }, { viewTransition: false });
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

- The browser controls transition support; Wayfinder silently uses plain navigation when `document.startViewTransition` is absent.
- The transition wraps data loading as well as the final state update. Keep route loaders responsive and abortable.
- `{ viewTransition: false }` bypasses the router default for one navigation.

### Related

- [Route Table Basics](./route-table-basics.md)
