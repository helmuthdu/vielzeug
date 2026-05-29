---
title: 'Courier Examples — Optimistic Updates'
description: 'Optimistic Updates examples for courier.'
---

## Optimistic Updates

### Problem

To feel instant, the UI should reflect a mutation's expected result immediately — before the server confirms it. If the server rejects the change, the UI must roll back to the previous state.

### Solution

```ts
const userId = 1;
const key = ['users', userId];
const patch = { name: 'Updated Name' };

const updateUser = createMutation((input: Partial<User>, signal: AbortSignal) =>
  api.put<User>('/users/{id}', { params: { id: userId }, body: input, signal }),
);

// Apply optimistic update immediately
qc.set<User>(key, (old) => ({ ...old!, ...patch }));

try {
  await updateUser.mutate(patch);
  // Server confirmed — force sync
  qc.invalidate(key);
} catch {
  // Server rejected — roll back
  qc.invalidate(key);
}

// Optional: cancel an in-flight mutation directly
// updateUser.cancel();
```


### Pitfalls

- After applying an optimistic update, the UI shows stale data until the server confirms. Always set a pending/loading indicator so the user knows a mutation is in flight.
- If the rollback function closes over stale state captured before the optimistic write, nested updates can produce an incorrect rollback target. Capture the previous value immediately before mutating.
- Concurrent mutations on the same resource each apply and roll back independently. The rollback order may not match the mutation order. Use a sequential mutation queue for the same resource key.

### Related
- [Batch Mutations (Ripple)](@vielzeug/ripple/examples/pattern-batch-for-complex-mutations)

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
