---
title: Vault — API Reference
description: Typed browser storage with portable keys and capability-specific stores.
---

[[toc]]

## API Overview

Vault has a portable `VaultStore<S>` and an IndexedDB-only `IndexedDbVaultStore<S>`.

## Package Entry Point

```ts
import { createIndexedDB, createLocalStorage, createMemory, createSessionStorage, table, ttl } from '@vielzeug/vault';
```

## Factories

```ts
createMemory({ schema, name? }): VaultStore<S>
createLocalStorage({ name, schema }): VaultStore<S>
createSessionStorage({ name, schema }): VaultStore<S>
createIndexedDB({ name, schema, version?, migrate? }): IndexedDbVaultStore<S>
```

All factories use the same fixed storage envelope: `{ value, expiresAt? }`. Primary-key fields must be `string` or finite `number`; Vault's tagged encoding preserves the distinction between `1` and `'1'` in every adapter.

## VaultStore

The portable store supports CRUD (`get`, `put`, `getAll`, `putAll`, `delete`, `deleteMany`, `clear`), key and entry reads, `update`, `upsert`, `getOrDefault`, `query`, TTL pruning, `debug`, and lifecycle disposal.

```ts
const stop = store.observe('users', (users) => render(users), { immediate: true });
stop();
```

`observe()` is the only reactivity API. It emits the current table snapshot by default, then emits after mutations. Pass `{ immediate: false }` to wait for the first mutation or `{ signal }` for AbortSignal-owned cleanup.

## IndexedDbVaultStore

`createIndexedDB` adds cursor iteration and atomic transactions:

```ts
await db.batch(['users'], async (tx) => {
  await tx.put('users', { id: 1, name: 'Ada' });
  await tx.delete('users', 2);
});

for await (const user of db.iterate('users')) console.log(user);
```

`batch()` is unavailable on memory and Web Storage stores because only IndexedDB can guarantee atomic commits.

## Schema and TTL

```ts
import { table, ttl } from '@vielzeug/vault';

type Session = { id: string; userId: string };
const schema = { sessions: table<Session>('id').ttl(ttl.hours(1)).index('userId') };
```

`ttl.ms`, `seconds`, `minutes`, `hours`, and `days` return branded positive durations. IndexedDB indexes always target `value.<field>` because the storage envelope is fixed.
