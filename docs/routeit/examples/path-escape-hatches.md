---
title: 'Routeit Examples — Path Escape Hatches'
description: Use pushPath() and replacePath() for raw destinations outside the route table.
---

## Path Escape Hatches

When a destination should not be encoded as a named route, use raw path helpers.

```ts
import { createRouter, defineRoutes } from '@vielzeug/routeit';

const router = createRouter({
  routes: defineRoutes({
    home: { path: '/', handler: () => renderHome() },
    checkout: { path: '/checkout', handler: () => renderCheckout() },
    notFound: { path: '*', handler: () => renderNotFound() },
  }),
});

router.start();

// Push a one-off marketing URL
await router.pushPath('/campaigns/spring?utm_source=newsletter');

// Replace current entry (good for redirects)
await router.replacePath('/checkout#payment');
```

Prefer `navigate({ name: ... })` for stable app routes and these helpers for exceptional flows.
