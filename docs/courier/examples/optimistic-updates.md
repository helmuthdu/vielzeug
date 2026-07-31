---
title: 'Courier Examples — Optimistic Updates'
description: 'Update a Courier query cache before a write completes.'
---

## Optimistic Updates

### Problem

A profile name should update immediately, then reconcile with the server whether the write succeeds or fails.

### Solution

Save the previous cached value, seed the optimistic value, and restore it on failure.

```ts
import { createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const key = ['users', 1] as const;
const previous = courier.queries.get<User>(key);
const optimistic: User = { id: 1, name: 'Updated name' };

courier.queries.set(key, optimistic);
try {
  await courier.mutate({
    request: ({ signal }) => courier.patch('/users/{id}', { body: optimistic, params: { id: 1 }, signal }),
  });
} catch (error) {
  if (previous) courier.queries.set(key, previous);
  throw error;
} finally {
  courier.queries.invalidate(key);
}
```

### Pitfalls

- Define a conflict policy when concurrent writes update the same resource.
- Only roll back a value that was actually present in the cache.
- Invalidate after settlement so later reads reconcile server state.

### Related

- [Direct Mutations](../usage.md#direct-mutations)
- [CRUD Operations](./crud-operations.md)
