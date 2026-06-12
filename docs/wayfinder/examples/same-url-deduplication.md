---
title: 'Wayfinder Examples — Same-URL Deduplication'
description: 'Same-URL deduplication example for @vielzeug/wayfinder.'
---

## Same-URL Deduplication

### Problem

Calling `navigate()` on a reactive signal or click handler multiple times triggers redundant data loads and scroll-to-top on every call.

### Solution

Wayfinder skips navigation when the resolved URL is identical to the current URL. Use `force: true` to override this for explicit refresh interactions.

```ts
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  routes: {
    feed: {
      path: '/feed',
      data: async () => refreshFeed(),
    },
  },
  notFound: { component: NotFoundPage },
});

await router.navigate({ name: 'feed' });
await router.navigate({ name: 'feed' }); // no-op — same URL
await router.navigate({ name: 'feed' }, { force: true }); // re-runs feed data loader
```

### Pitfalls

- Hash changes count as a different URL: `/feed` and `/feed#top` are distinct, so navigating between them is not deduplicated.
- `force: true` bypasses the dedup check but still runs leave guards and data loaders from scratch.
- Query-string changes also break deduplication: `/feed?page=1` and `/feed?page=2` are different URLs.

### Related

- [Route Table Basics](./route-table-basics.md)
- [Raw Path Targets](./raw-path-targets.md)
