---
title: Vault Examples — IndexedDB Transactions
description: Atomically change one or more tables with DocumentVaultStore.batch().
---

## Atomic batch

### Problem

Change several records as one durable operation.

### Solution

```ts
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';

const UserSchema = s.object({ id: s.number(), name: s.string() });
const db = createIndexedDB({
  name: 'blog',
  schema: { users: table<{ id: number; name: string }>('id') },
  codecs: { users: UserSchema },
});

await db.batch(['users'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Ada' });
});
```

### Pitfalls

A callback error aborts the transaction. Only await `tx.*` calls inside the callback; awaiting fetches, timers, or other external work can let IndexedDB commit before the next operation. Memory and Web Storage stores are `KeyValueVaultStore` and have no `batch()` method; choose IndexedDB or SQLite for atomicity.

### Related

- [Usage](../usage.md)
- [API](../api.md)
