---
title: 'Sourcerer Examples — Infinite Scroll'
description: 'Build a load-more / infinite-scroll feed with createInfiniteSource and an IntersectionObserver.'
---

## Infinite Scroll

### Problem

A social feed or activity log should append new items as the user scrolls, rather than replacing the
current page like traditional pagination. You need to track how many pages have been loaded, expose a
"load more" affordance, and reset the accumulated list when the user searches or filters.

### Solution

Use `createInfiniteSource()`. It accumulates every fetched page into `source.current`; call `loadMore()`
to append the next page.

```ts
import { createInfiniteSource } from '@vielzeug/sourcerer';

type Post = { id: number; title: string };

const source = createInfiniteSource<Post>({
  fetch: async ({ limit, page, search }, signal) => {
    const params = new URLSearchParams({ limit: String(limit), page: String(page) });
    if (search) params.set('q', search);

    const res = await fetch(`/api/posts?${params}`, { signal });
    return res.json(); // { items: Post[], total: number }
  },
  limit: 10,
});

await source.ready();
console.log(source.current.length, source.meta.hasMore, source.meta.loadedPages);
```

### Wiring to a scroll sentinel

```ts
const sentinel = document.querySelector('#load-more-sentinel')!;

const observer = new IntersectionObserver((entries) => {
  if (entries[0]?.isIntersecting && source.meta.hasMore && !source.meta.isLoadingMore) {
    void source.loadMore();
  }
});

observer.observe(sentinel);

// Re-render whenever more items arrive
source.subscribe(() => renderFeed(source.current, source.meta));
```

`loadMore()` is already a no-op when `meta.hasMore` is `false` or a fetch is already in flight, but
guarding in the observer callback avoids scheduling redundant microtasks on every intersection event.

### Searching restarts the feed

```ts
await source.search('release notes', { immediate: true });
// current is cleared immediately, loadedPages resets to 0, then page 1 of the filtered results loads
```

Both `search()` and `reset()` clear the accumulated `current` array right away (not just after the fetch
settles) — the feed visibly empties before repopulating, rather than showing a stale, soon-to-be-replaced
list during the fetch.

### Pitfalls

- `meta.isLoadingMore` is `true` only during `loadMore()` fetches. `meta.isLoading` covers the initial
  fetch and `reset()`/`search()` refetches — check the one that matches the UI state you're rendering
  (e.g. a full-page spinner vs. a small spinner at the bottom of the list).
- There is no `refresh()` on `InfiniteSource` (unlike `RemoteSource`/`CursorSource`) — to re-fetch from
  scratch, call `reset()`, which also clears `loadedPages` and accumulated items.
- `patch()` only accepts `limit`/`search`, and always resets to page 1 with an empty accumulator — it
  is not a way to "load more with a different limit" for already-loaded pages.

### Related

- [Cursor-Based Pagination](./cursor-based-pagination.md)
- [Remote Search with URL State](./remote-search-with-url-state.md)
