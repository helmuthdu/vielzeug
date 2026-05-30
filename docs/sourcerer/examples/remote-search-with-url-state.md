---
title: 'Sourcerer Examples — Remote Search with URL State'
description: 'Sync remote source state (search, filters, pagination) to URL query params so the list is bookmarkable and restorable.'
---

## Remote Search with URL State

### Problem

A list page should be bookmarkable and shareable. Search query, active filters, sort order, and current page should all be preserved in the URL so that navigating back or pasting the URL restores the exact previous state.

### Solution

Use `encodeQuery()` to serialize source state into URL-safe params after each interaction, and `decodeQuery()` + `restore()` to hydrate state from params on page load.

```ts
import { createRemoteSource, decodeQuery, encodeQuery } from '@vielzeug/sourcerer';

type Item = { id: number; name: string };
type Filter = { status?: 'open' | 'closed' };
type Sort = { by: 'name' | 'id'; dir: 'asc' | 'desc' };

const source = createRemoteSource<Item, Filter, Sort>({
  fetch: async ({ filter, limit, page, search, sort }, signal) => {
    const res = await fetch(`/api/items`, {
      method: 'POST',
      signal,
      body: JSON.stringify({ filter, limit, page, search, sort }),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json(); // { items: Item[], total: number }
  },
  limit: 20,
  // autoFetch: true (default) — initial data loads immediately
});

// On load: restore state from current URL
const urlParams = Object.fromEntries(new URLSearchParams(location.search));
await source.restore(decodeQuery<Filter, Sort>(urlParams, { defaultLimit: 20 }));
await source.ready();

// User interaction: apply a search
await source.searchNow('error');

// After each interaction: push updated state back to the URL
const nextParams = new URLSearchParams(encodeQuery(source.toQuery()));
history.replaceState(null, '', `?${nextParams.toString()}`);
```

### Roundtrip guarantee

`encodeQuery()` and `decodeQuery()` are inverses — any query round-trips without loss:

```ts
const original = source.toQuery();
const params = encodeQuery(original);
const restored = decodeQuery(params, { defaultLimit: 20 });
// restored deeply equals original
```

### Handling untrusted URLs

`decodeQuery()` is fault-tolerant by default: malformed `filter`/`sort` JSON params are silently dropped. To throw on invalid input instead:

```ts
const query = decodeQuery(urlParams, { strict: true });
```

### Pitfalls

- `decodeQuery` returns a `Partial<RemoteSourceQuery>`. Pass it directly to `source.restore()` — no manual field mapping needed.
- Calling `history.pushState` (instead of `replaceState`) on every interaction floods the browser history. Always use `replaceState` when syncing list state to the URL.
- Subscribe to source changes and compare the serialized params before writing to the URL to avoid redundant history pushes when only `isLoading` changed.

### Related

- [URL-Synced List with Wayfinder](./sourcerer-with-wayfinder.md)
- [Remote Data with Courier](./sourcerer-with-courier.md)
- [Local Pagination and Filtering](./local-pagination-and-filtering.md)
