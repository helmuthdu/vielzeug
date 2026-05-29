---
title: 'Sourcerer Examples — URL-Synced List with Route'
description: 'Keep Sourcerer query state (search, filters, pagination) in sync with Route URL navigation.'
---

## URL-Synced List with Route

### Problem

When a user filters or paginates a list and navigates away, pressing the browser Back button resets the list to its initial state. List state should live in the URL so forward/backward navigation preserves exact pagination, search, and filter state.

### Solution

Subscribe to source state changes and call the router's `navigate` with `replace: true` to keep the URL in sync. On load, hydrate the source from the current route's query params.

```ts
import { createRouter } from '@vielzeug/route';
import { createRemoteSource, encodeRemoteQueryParams } from '@vielzeug/sourcerer';

const router = createRouter({
  routes: {
    issues: { path: '/issues' },
  },
});

const source = createRemoteSource({
  fetch: ({ limit, page, search, sort }) =>
    fetch(`/api/issues?${new URLSearchParams({ limit: String(limit), page: String(page), search: search ?? '' })}`)
      .then((r) => r.json()),
  sort: { by: 'updatedAt', dir: 'desc' },
  limit: 20,
});

// Hydrate source from current URL on page load
const route = router.state;
await source.fromQueryParams(route.location.query);
await source.ready();

// Keep URL in sync after every user interaction
const syncUrl = () => {
  void router.navigate(
    { name: 'issues', query: encodeRemoteQueryParams(source.toQuery()) },
    { replace: true },
  );
};

const stop = source.subscribe(syncUrl);

// Example interaction
source.search('regression');
await source.commit();
await source.ready();
// URL is now /issues?search=regression&page=1&...
```

### Pitfalls

- `source.subscribe(syncUrl)` fires on every state change including internal transitions like `isLoading` toggling. Only call `navigate` when the serialized query string has actually changed to avoid redundant history entries.
- Calling `router.navigate()` inside the subscription can create a feedback loop if the router emits a new route event that the subscription reacts to. Use a `syncing` flag to break the cycle.
- `fromQueryParams()` uses `decodeRemoteQueryParams()` under the hood and expects a flat string-keyed query object.

### Related

- [Remote Search with URL State](./remote-search-with-url-state.md)
- [Route Table Basics (Route)](@vielzeug/route/examples/route-table-basics)
- [Auth and Guards (Route)](@vielzeug/route/examples/auth-and-guards)
