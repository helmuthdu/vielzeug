---
title: 'Courier Examples — CRUD Operations'
description: 'Cached reads and explicit writes with one Courier client.'
---

## CRUD Operations

### Problem

A users screen needs a cached list and predictable cache updates after creating a user.

### Solution

Fetch cache entry by stable key, then use direct mutation for write.

```ts
import { createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const key = ['users'] as const;

await courier.queries.fetch({
  key,
  fetch: ({ signal }) => courier.get<User[]>('/users', { signal }),
  staleTime: 5_000,
});
await courier.mutate({
  request: ({ signal }) => courier.post<User>('/users', { body: { name: 'Ada' }, signal }),
  onSuccess: (user, queries) => {
    queries.set(['users', user.id], user);
    queries.invalidate(key);
    queries.refetchStale();
  },
});
```

### Pitfalls

- Cache keys must be stable values rather than values generated during render.
- `invalidate()` marks cached data stale; it does not send request.
- Prefer `set()` only when new value is known complete.

### Related

- [Cached Queries](../usage.md#cached-queries)
- [Optimistic Updates](./optimistic-updates.md)
