# @vielzeug/vault

> Typed browser and SQLite storage with portable string/number keys, TTL, queries, and snapshot observation.

## Quick start

```ts
import { table } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';

type User = { id: number; name: string };
const store = createLocalStorage({ name: 'app', schema: { users: table<User>('id') } });

await store.put('users', { id: 1, name: 'Ada' });
const stop = store.observe('users', (users) => console.log(users));
stop();
```

The root entry provides schemas, shared types, errors, TTL, and pruning. Import one focused adapter only when needed: `/memory`, `/local-storage`, `/session-storage`, `/indexeddb`, or `/sqlite`.

`createMemory`, `createLocalStorage`, and `createSessionStorage` return the portable `VaultStore<S>` API. `createIndexedDB` and `createSQLite` add cursor or keyset `iterate()` plus atomic `batch()` transactions.

## SQLite

Use the driver-neutral `@vielzeug/vault/sqlite` subpath outside the browser. The caller opens and owns the connection unless `closeOnDispose` is enabled.

```ts
import { DatabaseSync } from 'node:sqlite';

import { table } from '@vielzeug/vault';
import { createSQLite } from '@vielzeug/vault/sqlite';

const store = createSQLite({
  database: new DatabaseSync('app.db'),
  name: 'app',
  schema: { users: table<{ id: number; name: string }>('id') },
});
```

Node's `node:sqlite` API remains experimental. Bun's `Database` is compatible directly; configure WAL in application code when needed. Deno has no native SQLite API, but `jsr:@db/sqlite`'s `Database` is compatible directly when its FFI, filesystem, and environment permissions are granted.

SQLite values must be JSON-compatible plain objects. SQLite operations execute synchronously beneath Vault's Promise API, so use a worker or isolate for large scans and writes on latency-sensitive paths. During a `batch()` callback, use only `tx.*`; calls on any store sharing that connection reject. Stores observe their own and same-connection Vault writes after commit; direct SQL and other processes are not observed.

Vault stores record values and expiry metadata using each adapter's native layout. Number and string primary keys are tagged internally, so `1` and `'1'` are distinct everywhere.

## Vault 3.0 migration

Adapter factories no longer come from the root entry. Import shared schema and types from `@vielzeug/vault`, then import a factory from its dedicated subpath:

```ts
import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';
import { createLocalStorage } from '@vielzeug/vault/local-storage';
```

Import each adapter from its focused subpath so unused storage backends stay out of the bundle.

## Vault 2.0 migration

- Replace `Adapter` with `VaultStore`; replace `IndexedDbAdapter` with `IndexedDbVaultStore`.
- `batch()` is available only on `createIndexedDB` and `createSQLite`. Use one of those adapters where atomic work is required.
- Use `observe()` for reactivity. `watch`, `observeMany`, constructor `signals`, and `toReadableStream` were removed.
- Custom codecs, `defaultCodec`, and `createVersionedCodec` were removed; migrate existing data to the fixed envelope before upgrading.

## Documentation

- [Overview](https://vielzeug.dev/vault/)
- [Usage](https://vielzeug.dev/vault/usage)
- [API](https://vielzeug.dev/vault/api)
