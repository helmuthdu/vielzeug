---
title: 'Sourcerer Examples — Cursor-Based Pagination'
description: 'Navigate a keyset-paginated API (relay-style GraphQL, DynamoDB, Stripe) with createCursorSource.'
---

## Cursor-Based Pagination

### Problem

Your backend returns opaque cursor tokens instead of page numbers — common with relay-style GraphQL
connections, DynamoDB's `LastEvaluatedKey`, and Stripe's list APIs. Page-number navigation (`goTo(3)`)
doesn't apply; you can only move forward or backward one "page" at a time using the token the server
gave you.

### Solution

Use `createCursorSource()`. Its `fetch` callback receives `after`/`before` cursor tokens instead of a
page number, and returns `nextCursor`/`prevCursor` alongside the items.

```ts
import { createCursorSource } from '@vielzeug/sourcerer';

type Order = { id: string; total: number };

const source = createCursorSource<Order>({
  fetch: async ({ after, before, limit, search }, signal) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (after) params.set('after', after);
    if (before) params.set('before', before);
    if (search) params.set('q', search);

    const res = await fetch(`/api/orders?${params}`, { signal });
    const data = await res.json();

    return {
      items: data.items,
      nextCursor: data.nextCursor, // string | undefined — absent means no next page
      prevCursor: data.prevCursor, // string | undefined — absent means no prev page
      total: data.total, // optional — omit if your API doesn't return a total count
    };
  },
  limit: 25,
});

await source.ready();
console.log(source.current, source.meta.hasNextPage, source.meta.hasPrevPage);
```

### Navigating

```ts
if (source.meta.hasNextPage) await source.next(); // advance using nextCursor
if (source.meta.hasPrevPage) await source.prev(); // go back using prevCursor
```

`next()`/`prev()` are no-ops (resolve immediately, no fetch) when there is no cursor in that direction —
safe to wire directly to a button's `disabled` state via `!source.meta.hasNextPage`.

### Searching resets cursor position

```ts
await source.search('overdue', { immediate: true });
// afterCursor/beforeCursor are cleared — the next fetch starts from the beginning of the filtered set
```

A new search term has no meaningful relationship to the old cursor position, so `search()` and
`patch({ search })` both reset `after`/`before` before fetching.

### Pitfalls

- `patch()` on a cursor source only accepts `limit`/`search` — there is no `page` field to patch, unlike
  `RemoteSource`. Passing `page` through `applyQuery()` is silently ignored (see the
  [API Reference](../api.md#applyquery) for details).
- Don't assume `total` is always present — many cursor-paginated APIs (DynamoDB in particular) can't
  cheaply compute a total count. Treat `meta.totalItems` as optional-in-spirit even though the type
  requires a number; return `0` from `fetch` if your API has no count.
- Unlike `RemoteSource`, there is no `goTo(page)` — cursor pagination is inherently sequential.

### Related

- [Remote Search with URL State](./remote-search-with-url-state.md)
- [Local Pagination and Filtering](./local-pagination-and-filtering.md)
