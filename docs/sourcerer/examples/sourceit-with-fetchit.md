---
title: 'Sourcerer Examples — Remote Data with Courier'
description: 'Use Courier as the HTTP transport layer inside a createRemoteSource fetch function.'
---

## Remote Data with Courier

### Problem

The `fetch` callback inside `createRemoteSource()` is a plain function — it has no retry logic, no shared auth headers, and no base URL configuration. Duplicating HTTP settings in both a Courier API client and the source's fetch callback creates two places to update when the API changes.

### Solution

Pass a Courier `api.get()` call as the `fetch` function. Courier handles auth, retries, and base URL; Sourcerer handles pagination and query state.

```ts
import { createApi } from '@vielzeug/courier';
import { createRemoteSource } from '@vielzeug/sourcerer';

type Issue = { id: number; name: string; status: 'open' | 'closed' };
type Filter = { status?: 'open' | 'closed' };
type Sort = { by: 'name' | 'updatedAt'; dir: 'asc' | 'desc' };

const api = createApi({
  baseUrl: '/api',
  headers: { Accept: 'application/json' },
});

const source = createRemoteSource<Issue, Filter, Sort>({
  fetch: async ({ filter, limit, page, search, sort }) => {
    const response = await api.get<{ items: Issue[]; total: number }>('/issues', {
      query: {
        filter: filter ? JSON.stringify(filter) : undefined,
        limit,
        page,
        search,
        sort: sort ? JSON.stringify(sort) : undefined,
      },
    });
    return { items: response.items, total: response.total };
  },
  filter: { status: 'open' },
  sort: { by: 'updatedAt', dir: 'desc' },
  limit: 25,
});

source.refresh();
await source.ready();
console.log(source.current, source.meta.totalItems);
```

### Pitfalls

- Courier's `api.get()` throws on HTTP errors (4xx/5xx). Wrap the call in try/catch inside the `fetch` callback and return `{ items: [], total: 0 }` so Sourcerer can surface its error state rather than crashing.
- Filter and sort objects are passed as JSON-stringified query params in this example — verify the server expects this format before adapting.
- `source.refresh()` is non-blocking. Always await `source.ready()` before reading `source.current` if you need the initial data synchronously.

### Related

- [Remote Search with URL State](./remote-search-with-url-state.md)
- [CRUD Operations (Courier)](@vielzeug/courier/examples/crud-operations)
- [Error Handling Patterns (Courier)](@vielzeug/courier/examples/error-handling-patterns)
