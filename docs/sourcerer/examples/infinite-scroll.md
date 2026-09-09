---
title: 'Sourcerer Examples — Infinite Scroll'
description: 'Append remote pages from an intersection observer.'
---

## Infinite Scroll

### Problem

A feed should append later pages without replacing loaded items or starting duplicate requests.

### Solution

Call `loadMore()` when the observer reaches the end marker.

```ts
import { createInfiniteSource } from '@vielzeug/sourcerer';

const posts = Array.from({ length: 5 }, (_, index) => `Post ${index + 1}`);
const source = createInfiniteSource({
  load: async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize;
    return { items: posts.slice(start, start + pageSize), totalItems: posts.length };
  },
  pageSize: 2,
});

await source.reload();
await source.loadMore();
console.log(source.state.items); // ['Post 1', 'Post 2', 'Post 3', 'Post 4']
source.dispose();
```

### Pitfalls

- Call `setParams()` to replace the feed from page one.
- Check `state.loading` for active work; `pendingParams` is absent during append requests.
- Stop observing when `state.pagination.hasMore` is false.

### Related

- [Usage Guide](../usage#build-an-infinite-feed)
- [Cursor-based pagination](./cursor-based-pagination)
- [Framework integration](./framework-integration)
