---
title: Remote Search with URL State
description: Sync remote source state to query params and restore it on load.
---

```ts
import { createRemoteSource } from '@vielzeug/sourceit';

type Item = { id: number; name: string };

type Filter = { status?: 'open' | 'closed' };

type Sort = { by: 'name' | 'id'; dir: 'asc' | 'desc' };

const source = createRemoteSource<Item, Filter, Sort>({
  fetch: async ({ filter, limit, page, search, sort }) => {
    const response = await api.items.list({ filter, limit, page, search, sort });

    return { items: response.items, total: response.total };
  },
  limit: 20,
});

// Restore from URL
const urlParams = Object.fromEntries(new URLSearchParams(location.search));
source.fromQueryParams(urlParams);
await source.ready();

// Apply interactions
source.search('error');
source.flush();
await source.ready();

// Persist to URL
const nextParams = new URLSearchParams(source.toQueryParams());
history.replaceState(null, '', `?${nextParams.toString()}`);
```
