---
title: 'Courier Examples — CRUD Operations'
description: 'Cached reads and explicit writes with one Courier client.'
---

## CRUD Operations

### Problem

A users screen needs a cached list and predictable cache updates after creating a user.

### Solution

Use a query handle for the read and a direct mutation for the write.

```ts
import { createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const users = courier.queries.create<User[]>({
  key: ['users'],
  fetch: ({ signal }) => courier.get('/users', { signal }),
  staleTime: 5_000,
});

await users.fetch();
await courier.mutate({
  request: ({ signal }) => courier.post<User>('/users', { body: { name: 'Ada' }, signal }),
  onSuccess: (user, queries) => {
    queries.set(['users', user.id], user);
    queries.invalidate(['users']);
    queries.refetchStale();
  },
});
```

### Pitfalls

- Query keys must be stable values rather than values generated during a render.
- `invalidate()` marks cached data stale; it does not send a request.
- Prefer `set()` only when the new value is known to be complete.

### Related

- [Query Handles](../usage.md#query-handles)
- [Optimistic Updates](./optimistic-updates.md)
