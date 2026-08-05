---
title: Vault Examples — IndexedDB Transactions
description: Atomically change one or more tables with IndexedDbVaultStore.batch().
---

## Atomic batch

### Problem

Change several records as one durable operation.

### Solution

```ts
import { createIndexedDB, table } from '@vielzeug/vault';

const db = createIndexedDB({
  name: 'blog',
  schema: { users: table<{ id: number; name: string }>('id') },
});

await db.batch(['users'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Ada' });
});
```

### Pitfalls

A callback error aborts the transaction. Only await `tx.*` calls inside the callback; awaiting fetches, timers, or other external work can let IndexedDB commit before the next operation. Memory and Web Storage stores intentionally have no `batch()` method; choose IndexedDB for atomicity.

### Related

- [Usage](../usage.md)
- [API](../api.md)
