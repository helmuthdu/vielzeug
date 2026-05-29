---
title: 'Route Examples — Raw Path Targets'
description: Use navigate({ path }) for raw destinations outside the route table.
---

## Raw Path Targets

When a destination should not be encoded as a named route, use a raw path target.

```ts
import { createRouter } from '@vielzeug/route';

const router = createRouter({
  routes: {
    home: { path: '/', handler: () => renderHome() },
    checkout: { path: '/checkout', handler: () => renderCheckout() },
    notFound: { path: '*', handler: () => renderNotFound() },
  },
});

// Push a one-off marketing URL
await router.navigate({ path: '/campaigns/spring?utm_source=newsletter' });

// Replace current entry (good for redirects)
await router.navigate({ path: '/checkout#payment' }, { replace: true });
```

Prefer `navigate({ name: ... })` for stable app routes and raw path targets for exceptional flows.
