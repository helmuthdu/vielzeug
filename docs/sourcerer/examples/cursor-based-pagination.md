---
title: 'Sourcerer Examples — Cursor-Based Pagination'
description: 'Navigate opaque cursor pages without inventing page numbers.'
---

## Cursor-Based Pagination

### Problem

Your API returns opaque cursors. A page index cannot safely represent navigation because only server-issued cursors identify adjacent pages.

### Solution

Return cursors from the loader and navigate through `source.page`.

```ts
import { createCursorSource } from '@vielzeug/sourcerer';

type Order = { id: string };
const rows: Order[] = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];

const source = createCursorSource<Order, number>({
  autoStart: false,
  initialQuery: { pageSize: 2 },
  load: async ({ query }) => {
    const start = query.after ?? 0;
    const data = rows.slice(start, start + query.pageSize);
    const next = start + data.length;

    return {
      data,
      nextCursor: next < rows.length ? next : undefined,
      previousCursor: start > 0 ? Math.max(0, start - query.pageSize) : undefined,
    };
  },
});

await source.reload();
await source.page.next();
console.log(source.snapshot.data); // [{ id: 'C' }]
source.dispose();
```

### Pitfalls

- Do not set both `after` and `before`; source rejects conflicting directions.
- Do not model cursor navigation as `page.go(n)`.
- Search and page-size changes intentionally clear cursors.

### Related

- [Usage Guide](../usage#use-cursor-pagination)
- [Infinite scroll](./infinite-scroll)
- [Page source](./remote-search-with-url-state)
