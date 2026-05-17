---
title: 'Sourceit Examples — Remote Search with URL State'
description: 'Sync remote source state (search, filters, pagination) to URL query params so the list is bookmarkable and restorable.'
---

## Remote Search with URL State

### Problem

A list page should be bookmarkable and shareable. Search query, active filters, sort order, and current page should all be preserved in the URL so that navigating back or pasting the URL restores the exact previous state.

### Solution

Use `encodeRemoteQueryParams()` to serialize source state into URL-safe params after each interaction, and `fromQueryParams()` to restore state from params on page load.

```ts
import { createRemoteSource, encodeRemoteQueryParams } from '@vielzeug/sourceit';

type Item = { id: number; name: string };
type Filter = { status?: 'open' | 'closed' };
type Sort = { by: 'name' | 'id'; dir: 'asc' | 'desc' };

const source = createRemoteSource<Item, Filter, Sort>({
  fetch: async ({ filter, limit, page, search, sort }) => {
    const res = await fetch(`/api/items?${new URLSearchParams({
      filter: filter ? JSON.stringify(filter) : '',
      limit: String(limit),
      page: String(page),
      search: search ?? '',
      sort: sort ? JSON.stringify(sort) : '',
    })}`);
    return res.json(); // { items: Item[], total: number }
  },
  limit: 20,
});

// On load: restore state from current URL
const urlParams = Object.fromEntries(new URLSearchParams(location.search));
await source.fromQueryParams(urlParams);

// User interaction: apply a search
await source.searchNow('error');

// After each interaction: push updated state back to the URL
const nextParams = new URLSearchParams(encodeRemoteQueryParams(source.toQuery()));
history.replaceState(null, '', `?${nextParams.toString()}`);
```

### Pitfalls

- Restoring from an untrusted URL can set arbitrary filter/sort values. Validate or sanitize decoded params before calling `source.restore()`.
- `decodeRemoteQueryParams()` is fault-tolerant and ignores malformed JSON filter/sort params. Use `decodeRemoteQueryParamsStrict()` when malformed params should throw.
- Calling `history.pushState` (instead of `replaceState`) on every interaction floods the browser history. Always use `replaceState` when syncing list state to the URL.

### Related

- [Sourceit + Routeit](./sourceit-with-routeit.md)
- [Sourceit + Fetchit](./sourceit-with-fetchit.md)
- [Local Pagination and Filtering](./local-pagination-and-filtering.md)
