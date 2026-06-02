---
title: 'Sourcerer Examples — Remote Data with Courier'
description: 'Use Courier as the HTTP transport layer inside a createRemoteSource fetch callback.'
---

## Remote Data with Courier

### Problem

You want to use Sourcerer to manage pagination, search, and loading state for a remote list, while also using Courier for typed API clients, authorization headers, retry logic, and request interceptors. Using both independently would require manually coordinating request lifecycles.

### Solution

Pass the Courier API client call directly inside `createRemoteSource()`'s `fetch` callback. The `AbortSignal` provided by Sourcerer should be forwarded to Courier to enable automatic request cancellation.

```ts
import { createApi } from '@vielzeug/courier';
import { createRemoteSource } from '@vielzeug/sourcerer';

type Issue = { id: number; title: string; status: 'open' | 'closed' };
type IssueFilter = { status?: 'open' | 'closed' };
type IssueSort = { by: 'title' | 'id'; dir: 'asc' | 'desc' };

// Configure your Courier API client once
const api = createApi({
  baseUrl: '/api',
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
});

// Use it inside the fetch callback
const source = createRemoteSource<Issue, IssueFilter, IssueSort>({
  fetch: async ({ filter, limit, page, search, sort }, signal) =>
    api.get('/issues', {
      query: { filter: JSON.stringify(filter), limit, page, q: search, sort: JSON.stringify(sort) },
      signal,
    }),
  filter: { status: 'open' },
  sort: { by: 'title', dir: 'asc' },
  limit: 25,
});

await source.ready();
```

### Why pass `signal`?

Sourcerer manages request concurrency automatically. When a new request supersedes an in-flight one, Sourcerer aborts it via the provided `AbortSignal`. Forwarding it to Courier ensures the underlying HTTP request is actually cancelled at the network level — saving bandwidth and preventing stale responses from settling after the state has moved on.

### Optimistic updates with Courier

```ts
// Optimistically close an issue in the UI before the server confirms
const rollback = source.optimisticUpdate(
  (issues) => issues.map((i) => (i.id === targetId ? { ...i, status: 'closed' } : i)),
);

try {
  await api.patch(`/issues/${targetId}`, { body: { status: 'closed' } });
  await source.refresh(); // server confirmed — optimistic state cleared
} catch {
  rollback(); // server rejected — restore previous state
}
```

### Pitfalls

- The `signal` parameter is positional — it is the **second argument** of the `fetch` callback, after the query object. Do not forget to include it in the function signature.
- Courier requests that are aborted via `signal` throw a `DOMException` with name `'AbortError'`. Sourcerer swallows aborted-request errors automatically — you do not need to catch them inside `fetch`.
- Keep the Courier client instance outside the `fetch` callback so it is created once, not on every request.

### Related

- [Remote Search with URL State](./remote-search-with-url-state.md)
- [URL-Synced List with Wayfinder](./sourcerer-with-wayfinder.md)
- [Courier API client](/courier/usage)
