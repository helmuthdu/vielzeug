---
title: Vault Examples — IndexedDB Iteration
description: Traverse an IndexedDB table with a cursor.
---

## Lazy iteration

### Problem

Process an IndexedDB table without materializing it first.

### Solution

```ts
import { createIndexedDB, table } from '@vielzeug/vault';

const db = createIndexedDB({
  name: 'diagnostics',
  schema: { logs: table<{ id: number; message: string }>('id') },
});

for await (const log of db.iterate('logs')) console.log(log.message);
```

### Pitfalls

Memory and Web Storage return portable `VaultStore` instances without `iterate()`; use `getAll()` or `query().toArray()` there.

### Related

- [Usage](../usage.md)
- [API](../api.md)
