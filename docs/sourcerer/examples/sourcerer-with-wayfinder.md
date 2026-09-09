---
title: 'Sourcerer Examples — URL-Synced List with Wayfinder'
description: 'Synchronize validated source params and pagination with a Wayfinder route.'
---

## URL-Synced List with Wayfinder

### Problem

You need a bookmarkable list URL without letting raw route values corrupt source state.

### Solution

Validate route state, set source params, and navigate with `goTo()`.

```ts
import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder';
import { createPageSource } from '@vielzeug/sourcerer';

const history = createMemoryHistory('/users?page=1&search=ada');
const router = createRouter({ history, routes: { users: { path: '/users' } } });
await router.ready;
const source = createPageSource({
  load: async ({ page, params: search }) => ({ items: [`${search}:${page}`], totalItems: 1 }),
  params: '',
});

const route = router.getSnapshot();
const parsedPage = Number.parseInt(String(route.query['page'] ?? '1'), 10);
await source.setParams(String(route.query['search'] ?? ''));
await source.goTo(Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1);

const stop = source.subscribe((state) => {
  if (!state.loading) {
    void router.navigate({
      name: 'users',
      query: { page: String(state.pagination.page), search: state.params },
    });
  }
});

stop();
source.dispose();
router.dispose();
```

### Pitfalls

- Validate route values before calling `goTo()` or `setParams()`.
- Serialize committed `state.params`, not `state.pendingParams`.
- Avoid route writes while `state.loading` is true.

### Related

- [Wayfinder](/wayfinder/)
- [Page params with URL state](./remote-search-with-url-state)
- [Usage Guide](../usage#pass-loader-parameters)
