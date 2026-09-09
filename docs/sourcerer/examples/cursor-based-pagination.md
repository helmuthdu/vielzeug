---
title: 'Sourcerer Examples — Cursor-Based Pagination'
description: 'Navigate opaque cursor pages without inventing page numbers.'
---

## Cursor-Based Pagination

### Problem

Your API returns opaque cursors, so numeric page indexes cannot identify adjacent results.

### Solution

Return cursors from the loader and call the source’s direct navigation methods.

```ts
import { createCursorSource } from '@vielzeug/sourcerer';

type Order = { id: string };
const rows: Order[] = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
const source = createCursorSource({
  load: async ({ after, pageSize }) => {
    const start = after ?? 0;
    const items = rows.slice(start, start + pageSize);
    const next = start + items.length;
    return {
      items,
      nextCursor: next < rows.length ? next : undefined,
      previousCursor: start > 0 ? Math.max(0, start - pageSize) : undefined,
    };
  },
  pageSize: 2,
});

await source.reload();
await source.next();
console.log(source.state.items); // [{ id: 'C' }]
source.dispose();
```

### Pitfalls

- Do not configure both `after` and `before`.
- Treat cursors as server-owned opaque values in real integrations.
- Remember that `setParams()` and `setPageSize()` clear cursor direction.

### Related

- [Usage Guide](../usage#use-cursor-pagination)
- [Infinite scroll](./infinite-scroll)
- [Page params](./remote-search-with-url-state)
