---
title: 'Sourcerer Examples — URL-Synced List with Wayfinder'
description: 'Synchronize validated page query fields with a Wayfinder route.'
---

## URL-Synced List with Wayfinder

### Problem

You need a bookmarkable list URL without letting raw route values corrupt page query state.

### Solution

Read route state, validate it, and apply it through `setQuery()`. Serialize only loaded queries after a request settles.

```ts
import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder';
import { createPageSource } from '@vielzeug/sourcerer';

const history = createMemoryHistory('/users?page=1&search=ada');
const router = createRouter({ history, routes: { users: { path: '/users' } } });
const source = createPageSource({
  autoStart: false,
  load: async ({ query }) => ({ data: [`${query.search}:${query.page}`], total: 1 }),
});

const route = router.getSnapshot();
const page = Number.parseInt(String(route.query['page'] ?? '1'), 10);
await source.setQuery({ page: Number.isInteger(page) && page > 0 ? page : 1, search: String(route.query['search'] ?? '') });

const stop = source.subscribe(({ isFetching, query }) => {
  if (!isFetching) void router.navigate({ name: 'users', query: { page: String(query.page), search: query.search } });
});

console.log(source.snapshot.data); // ['ada:1']
stop();
source.dispose();
router.dispose();
```

### Pitfalls

- Validate route values before `setQuery()`.
- Serialize `snapshot.query`, not `snapshot.pendingQuery`.
- Avoid writing route state while `snapshot.isFetching` is true.

### Related

- [Wayfinder](/wayfinder/)
- [Page query with URL state](./remote-search-with-url-state)
- [Usage Guide](../usage#handle-pending-remote-queries)
