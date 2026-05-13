---
title: Sourceit + Routeit
description: Keep Sourceit query state in sync with Routeit navigation.
---

`@vielzeug/sourceit` and `@vielzeug/routeit` pair well when list state should be URL-addressable.

```ts
import { createRouter } from '@vielzeug/routeit';
import { createRemoteSource } from '@vielzeug/sourceit';

const router = createRouter({
  routes: {
    issues: { path: '/issues' },
  },
});

const source = createRemoteSource({
  fetch: ({ limit, page, search, sort }) =>
    api.issues.list({ limit, page, search, sort }),
  initialSort: { by: 'updatedAt', dir: 'desc' },
  limit: 20,
});

// Hydrate source state from the current route.
const route = router.state;
source.fromQueryParams(route.location.query);
await source.ready();

// Push list state back into the URL after user interactions.
const syncUrl = () => {
  void router.navigate({
    name: 'issues',
    query: source.toQueryParams(),
  }, { replace: true });
};

source.subscribe(syncUrl);
source.search('regression');
source.flush();
await source.ready();
```

This setup gives you:

- shareable URLs for pagination, search, and sorting
- back/forward navigation that restores list state
- one place to keep route state and source state aligned
