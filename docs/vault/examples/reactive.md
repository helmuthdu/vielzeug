---
title: 'Vault Examples — Reactive Tables'
description: React to a table's current and future snapshots with observe().
---

## Reactive tables

### Problem

Render a table whenever its data changes without polling.

### Solution

Subscribe to the table, then stop the subscription when its owner ends.

```ts
import { table } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';

const store = createMemory({ schema: { users: table<{ id: number; name: string }>('id') } });
const stop = store.observe('users', (users) => console.log(users));
await store.put('users', { id: 1, name: 'Ada' });
stop();
```

Pass `{ immediate: false }` when only later mutations matter, or pass an `AbortSignal` to let another lifecycle own the subscription.

### Pitfalls

`observe()` replaces the removed `watch`, `observeMany`, constructor signal, and stream APIs. Observe each table explicitly when a view needs several snapshots.

### Related

- [Usage](../usage.md)
- [API](../api.md)
