---
title: 'Route Examples — View Transitions'
description: Enable and customize View Transition API navigation animations.
---

## View Transitions

Enable transitions globally or per navigation.

```ts
import { createRouter } from '@vielzeug/route';

const router = createRouter({
  viewTransition: true,
  routes: {
    home: { path: '/', handler: () => renderHome() },
    settings: { path: '/settings', handler: () => renderSettings() },
    notFound: { path: '*', handler: () => renderNotFound() },
  },
});

// Global transitions are enabled by router option.
await router.navigate({ name: 'settings' });

// Override per call.
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

Route falls back to normal navigation when the API is unavailable.
