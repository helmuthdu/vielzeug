---
title: 'Vault Examples — IndexedDB Iteration'
description: Traverse an IndexedDB table with a cursor.
---

## Lazy iteration

### Problem

Process an IndexedDB table without materializing it first.

### Solution

Create an IndexedDB store and consume its cursor-backed asynchronous iterator.

```ts
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';

const LogSchema = s.object({ id: s.number(), message: s.string() });
const db = createIndexedDB({
  name: 'diagnostics',
  schema: { logs: table<{ id: number; message: string }>('id') },
  codecs: { logs: LogSchema },
});

for await (const log of db.iterate('logs')) console.log(log.message);
```

### Pitfalls

Memory and Web Storage return `KeyValueVaultStore` instances without `iterate()`; use `getAll()` there. SQLite also supports `iterate()` through its opt-in subpath.

### Related

- [Usage](../usage.md)
- [API](../api.md)
