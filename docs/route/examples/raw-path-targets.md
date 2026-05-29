---
title: 'Route Examples — Raw Path Targets'
description: 'Raw path targets example for @vielzeug/route.'
---

## Raw Path Targets

### Problem

Some navigation targets (marketing UTM links, one-off redirects) should not be registered as named routes but still need to participate in the navigation lifecycle including leave guards.

### Solution

Pass `{ path: '...' }` with a raw string to `navigate()`. The path is resolved against the route table but skips named-route validation.

```ts
import { createRouter } from '@vielzeug/route';

const router = createRouter({
  routes: {
    home: { path: '/', handler: () => renderHome() },
    checkout: { path: '/checkout', handler: () => renderCheckout() },
    notFound: { path: '*', handler: () => renderNotFound() },
  },
});

// One-off marketing URL that doesn't belong in the route table.
await router.navigate({ path: '/campaigns/spring?utm_source=newsletter' });

// Replace current history entry on redirect.
await router.navigate({ path: '/checkout#payment' }, { replace: true });
```

### Pitfalls

- Raw paths are not validated against the route table. A typo will silently match `notFound` instead of throwing.
- Leave guards still fire when navigating via raw path targets. Do not assume they are bypassed.
- Prefer `navigate({ name })` for stable application routes. Raw path targets are for exceptional flows only.

### Related

- [Route Table Basics](./route-table-basics.md)
- [Same-URL Deduplication](./same-url-deduplication.md)
