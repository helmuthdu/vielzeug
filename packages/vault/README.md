# @vielzeug/vault

> Typed browser storage with portable string/number keys, TTL, queries, and snapshot observation.

## Quick start

```ts
import { createLocalStorage, table } from '@vielzeug/vault';

type User = { id: number; name: string };
const store = createLocalStorage({ name: 'app', schema: { users: table<User>('id') } });

await store.put('users', { id: 1, name: 'Ada' });
const stop = store.observe('users', (users) => console.log(users));
stop();
```

`createMemory`, `createLocalStorage`, and `createSessionStorage` return the portable `VaultStore<S>` API. `createIndexedDB` returns `IndexedDbVaultStore<S>`, adding cursor `iterate()` and atomic `batch()` transactions.

All adapters store a fixed `{ value, expiresAt? }` envelope. Number and string primary keys are tagged internally, so `1` and `'1'` are distinct everywhere.

## Major migration

- Replace `Adapter` with `VaultStore`; replace `IndexedDbAdapter` with `IndexedDbVaultStore`.
- `batch()` is now IndexedDB-only. Use `createIndexedDB` where atomic work is required.
- Use `observe()` for reactivity. `watch`, `observeMany`, constructor `signals`, and `toReadableStream` were removed.
- Custom codecs, `defaultCodec`, and `createVersionedCodec` were removed; migrate existing data to the fixed envelope before upgrading.

## Documentation

- [Overview](https://vielzeug.dev/vault/)
- [Usage](https://vielzeug.dev/vault/usage)
- [API](https://vielzeug.dev/vault/api)
