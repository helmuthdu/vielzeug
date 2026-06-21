---
title: 'Sourcerer Examples — URL-Synced List with Wayfinder'
description: 'Keep source state (search, filters, pagination) in sync with URL query params via the Wayfinder router.'
---

## URL-Synced List with Wayfinder

### Problem

The Wayfinder router manages navigation state as a reactive signal. You want your list's search, filter, and page to be reflected in the URL so users can share and bookmark the current view — and have the router respond to browser back/forward navigation without manually re-reading `location.search`.

### Solution

Restore source state from the active route's query params on mount, and push the current source state back into the URL after each user interaction using Wayfinder's `navigate()`.

```ts
import { createRouter, navigate, useRoute } from '@vielzeug/wayfinder';
import { applyQuery, createRemoteSource, decodeQuery, encodeQuery } from '@vielzeug/sourcerer';

type Item = { id: number; name: string };
type Filter = { category?: string };
type Sort = { by: 'name'; dir: 'asc' | 'desc' };

const source = createRemoteSource<Item, Filter, Sort>({
  fetch: async ({ filter, limit, page, search, sort }, signal) => {
    const res = await fetch('/api/items', {
      method: 'POST',
      signal,
      body: JSON.stringify({ filter, limit, page, search, sort }),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },
  limit: 20,
  autoFetch: false, // we'll restore from URL first
});

// Restore from the current URL once on mount
const route = useRoute();
await applyQuery(source, decodeQuery<Filter, Sort>(route.query, { defaultLimit: 20 }));

// Subscribe and push state back to the URL whenever source changes
const stopSync = source.subscribe(() => {
  if (source.meta.isLoading) return; // only sync when settled
  const params = encodeQuery(source.query);
  navigate({ query: params, replace: true });
});
```

### Reacting to browser back/forward

Wayfinder emits a navigation event when the URL changes via the browser's back/forward buttons. Listen for that to restore source state from the new URL:

```ts
import { onRouteChange } from '@vielzeug/wayfinder';
import { applyQuery, decodeQuery } from '@vielzeug/sourcerer';

const stopRouteSync = onRouteChange((route) => {
  void applyQuery(source, decodeQuery(route.query, { defaultLimit: 20 }));
});

// Clean up both subscriptions when leaving the page
function teardown() {
  stopSync();
  stopRouteSync();
}
```

### Pitfalls

- Set `autoFetch: false` when you intend to restore from URL params on mount — otherwise Sourcerer fires an initial fetch before `applyQuery()` runs, causing a wasted network request.
- Use `replace: true` (not `push`) in `navigate()` for list state changes. Pushing every filter change floods the browser history and breaks the expected back-button behaviour.
- Guard the `subscribe` callback with `if (source.meta.isLoading) return` to avoid URL churn while requests are in-flight.
- `decodeQuery` is fault-tolerant by default. Pass `{ strict: true }` if you want malformed params to throw instead of being silently dropped.

### Related

- [Remote Search with URL State](./remote-search-with-url-state.md)
- [Wayfinder — Middleware and Guards](/wayfinder/usage)
- [Remote Data with Courier](./sourcerer-with-courier.md)
