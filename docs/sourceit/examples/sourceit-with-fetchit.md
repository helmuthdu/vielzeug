---
title: Sourceit + Fetchit
description: Use Fetchit as the transport layer behind a remote Sourceit model.
---

`@vielzeug/fetchit` is a natural fit for `createRemoteSource()` when you want retries, auth, shared API config, or richer request ergonomics.

```ts
import { createApi } from '@vielzeug/fetchit';
import { createRemoteSource } from '@vielzeug/sourceit';

const api = createApi({
  baseUrl: '/api',
  headers: {
    Accept: 'application/json',
  },
});

const source = createRemoteSource<
  { id: number; name: string; status: 'open' | 'closed' },
  { status?: 'open' | 'closed' },
  { by: 'name' | 'updatedAt'; dir: 'asc' | 'desc' }
>({
  fetch: async ({ filter, limit, page, search, sort }) => {
    const response = await api.get<{
      items: { id: number; name: string; status: 'open' | 'closed' }[];
      total: number;
    }>('/issues', {
      query: {
        filter: filter ? JSON.stringify(filter) : undefined,
        limit,
        page,
        search,
        sort: sort ? JSON.stringify(sort) : undefined,
      },
    });

    return {
      items: response.items,
      total: response.total,
    };
  },
  initialFilter: { status: 'open' },
  initialSort: { by: 'updatedAt', dir: 'desc' },
  limit: 25,
});

source.refresh();
await source.ready();
console.log(source.current, source.meta.totalItems);
```

This keeps Sourceit responsible for query state and pagination, while Fetchit handles the HTTP layer.
