---
title: 'Courier Examples — Optimistic Updates'
description: 'Update a Courier query cache before a write completes.'
---

## Optimistic Updates

### Problem

A todo should disappear immediately, then reconcile with the server whether the delete succeeds or fails.

### Solution

Capture the full snapshot, apply an operation-specific optimistic transform, and restore exactly what existed before on failure.

```ts
import { createCourier } from '@vielzeug/courier';

type Todo = { id: number; title: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const key = ['todos'] as const;
const id = 7;
const previous = courier.queries.getSnapshot<Todo[]>(key);

courier.queries.set(
  key,
  (previous?.status === 'success' ? previous.data : []).filter((todo) => todo.id !== id),
);
try {
  await courier.mutate({
    invalidateKeys: [key],
    request: ({ signal }) => courier.delete('/todos/{id}', { params: { id }, signal }),
  });
} catch (error) {
  if (previous?.status === 'success') {
    courier.queries.set(key, previous.data, { updatedAt: previous.updatedAt });
  } else {
    courier.queries.delete(key);
  }

  throw error;
}
```

### Pitfalls

- Roll back from `getSnapshot()` instead of `get()` so status and timestamp metadata are preserved.
- Use operation-specific rollback (patch/remove one record), not whole-list replacement for concurrent writes.
- For concurrent writes on one key, serialize mutations or use conflict-aware merge/rebase rules.
- Keep `invalidateKeys` on the mutation so settled state always reconciles with the server.

### Related

- [Direct Mutations](../usage.md#direct-mutations)
- [CRUD Operations](./crud-operations.md)
