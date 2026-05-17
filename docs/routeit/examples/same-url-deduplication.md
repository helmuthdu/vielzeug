---
title: 'Routeit Examples — Same-URL Deduplication'
description: Skip redundant history entries and rerun when needed with force.
---

## Same-URL Deduplication

Routeit skips navigation when the computed destination equals the current URL.

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({
  routes: {
    feed: {
      path: '/feed',
      handler: () => refreshFeed(),
    },
    notFound: {
      path: '*',
      handler: () => renderNotFound(),
    },
  },
});

await router.navigate({ name: 'feed' });
await router.navigate({ name: 'feed' }); // no-op
await router.navigate({ name: 'feed' }, { force: true }); // re-runs feed handler
```

Use `force` for explicit refresh interactions like a manual "Reload" button.
