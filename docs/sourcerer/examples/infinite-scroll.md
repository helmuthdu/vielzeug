---
title: 'Sourcerer Examples — Infinite Scroll'
description: 'Append remote pages from an intersection observer.'
---

## Infinite Scroll

### Problem

A feed should append later pages without replacing loaded rows. It must avoid duplicate loads while a request is active.

### Solution

Use `createInfiniteSource()` and call `loadMore()` from an observer. Source ignores calls while fetching or exhausted.

```ts
import { createInfiniteSource } from '@vielzeug/sourcerer';

const posts = Array.from({ length: 5 }, (_, index) => `Post ${index + 1}`);
const source = createInfiniteSource<string>({
  autoStart: false,
  initialQuery: { pageSize: 2 },
  load: async ({ query }) => {
    const start = (query.page - 1) * query.pageSize;

    return { data: posts.slice(start, start + query.pageSize), total: posts.length };
  },
});

await source.loadMore();
await source.loadMore();
console.log(source.snapshot.data); // ['Post 1', 'Post 2', 'Post 3', 'Post 4']
source.dispose();
```

### Pitfalls

- Call `setQuery()` to replace the feed for a new search; it starts again at page 1.
- `pendingQuery` is set only on `setQuery()`/`reload()` (query replace), not on `loadMore()` (append). Use `snapshot.isFetching` to detect an append in progress.
- Keep rendering loaded `snapshot.data` while `pendingQuery` exists.
- Use `snapshot.pagination.hasMore` only with an infinite source.

### Related

- [Usage Guide](../usage#build-an-infinite-feed)
- [Cursor-based pagination](./cursor-based-pagination)
- [Framework integration](./framework-integration)
