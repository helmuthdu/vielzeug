---
title: 'Sourcerer Examples — Page Query with URL State'
description: 'Validate URL values and synchronize loaded page queries.'
---

## Page Query with URL State

### Problem

You need bookmarkable search and page state without coupling Sourcerer to one router or URL codec.

### Solution

Parse URL values at your boundary, apply them through `setQuery()`, then serialize only loaded queries.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

type Item = { id: number; name: string };
const items: Item[] = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];
const source = createPageSource<Item>({
  autoStart: false,
  load: async ({ query }) => {
    const matching = items.filter((item) => item.name.toLowerCase().includes(query.search.toLowerCase()));
    const start = (query.page - 1) * query.pageSize;

    return { data: matching.slice(start, start + query.pageSize), total: matching.length };
  },
});

const params = new URLSearchParams('?page=1&search=ada');
const page = Number.parseInt(params.get('page') ?? '1', 10);
await source.setQuery({ page: Number.isInteger(page) && page > 0 ? page : 1, search: params.get('search') ?? '' });

const loaded = source.snapshot.query;
history.replaceState(null, '', `?page=${loaded.page}&search=${encodeURIComponent(loaded.search)}`);
source.dispose();
```

### Pitfalls

- Validate page numbers before calling `setQuery()`.
- Serialize `snapshot.query`, not `snapshot.pendingQuery`.
- Keep filter and sort decoding in application-owned schema validation.

### Related

- [Usage Guide](../usage#handle-pending-remote-queries)
- [Wayfinder integration](./sourcerer-with-wayfinder)
- [Page source API](../api#createpagesource)
