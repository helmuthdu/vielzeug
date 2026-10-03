---
title: 'Vault Examples: Validators and Error Handling'
description: 'Codecs, migration, and error handling patterns for @vielzeug/vault.'
---

## Validators and Error Handling

### Problem

You need to validate records before they reach storage and handle quota, disposal, scope, and migration errors predictably.

### Solution

Durable Vault factories require one codec or parser schema per table. Memory may omit them. Spell schemas work directly; `validatorCodec()` remains available for explicit identity encoding.

#### Codecs

Pass any object with a `parse(value): T` method directly in `codecs`. Custom codecs validate writes through `decode(encode(value))` and validate persisted values on reads.

```ts
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };

const db = createMemory({
  schema,
  codecs: {
    users: s.object({
      id: s.number(),
      name: s.string(),
      age: s.number().min(0).max(150),
    }),
  },
});

// rejects with a VaultError whose cause is the Spell validation error
await db.put('users', { id: 1, name: 'Alice', age: -5 });
```

#### IndexedDB migration hook

```ts
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createIndexedDB, type MigrationFn } from '@vielzeug/vault/indexeddb';

type User = { id: number; name: string };
const schema = { users: table<User>('id', { indexes: ['name'] }) };
const UserSchema = s.object({ id: s.number(), name: s.string() });

// Object stores and schema-declared indexes are created automatically.
// The hook only handles work the schema cannot express.
const migrate: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('legacy_users')) {
    tx.deleteObjectStore('legacy_users');
  }
};

const db = createIndexedDB({
  name: 'app',
  migrate,
  schema,
  version: 2,
  codecs: { users: UserSchema },
});
void db;
```

#### Error handling

```ts
import {
  table,
  VaultDisposedError,
  VaultError,
  VaultMigrationError,
  VaultQuotaError,
  VaultScopeError,
} from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };
const db = createMemory({ schema });

try {
  await db.put('users', { id: 1, name: 'Alice' });
} catch (err) {
  if (err instanceof VaultDisposedError) {
    // adapter was disposed before this call
  } else if (err instanceof VaultScopeError) {
    // an IndexedDB transaction accessed a table outside its declared scope
  } else if (err instanceof VaultQuotaError) {
    // LocalStorage / SessionStorage write exceeded quota
  } else if (err instanceof VaultMigrationError) {
    // IndexedDB onupgradeneeded threw
  } else if (err instanceof VaultError) {
    // any other vault error
  } else {
    throw err;
  }
}
```

### Pitfalls

- Parser schemas validate writes and persisted reads. Transforming codecs validate writes with `decode(encode(value))` and decode persisted values before they enter typed code.
- IndexedDB codecs must preserve declared index field names and values in encoded objects.
- The `migrate` callback on IndexedDB runs synchronously inside `onupgradeneeded`. Do not call `await` or open a second transaction inside it: IDB will throw. Errors thrown from `migrate` surface as `VaultMigrationError` on the first operation.
- A Web Storage write that exceeds the browser quota always rejects with `VaultQuotaError`; the failed write is simply not persisted.

### Related

- [Reactive Tables](./reactive.md)
- [Spell](/spell/)
- [API Reference: Types](/vault/api.md#types)
