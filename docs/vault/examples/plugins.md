---
title: 'Vault Examples: Validators and Error Handling'
description: 'Parsers, migration, and error handling patterns for @vielzeug/vault.'
---

## Validators and Error Handling

### Problem

You need to validate records before they reach storage and handle quota, disposal, scope, and migration errors predictably.

### Solution

Durable Vault factories require one parser per table; Memory may omit them. Spell schemas work directly.

#### Parsers

Pass any object with a `parse(value): T` method directly in `parsers`. Writes store the parser's canonical output, so a record that parses can always be read back.

```ts
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createMemory } from '@vielzeug/vault/memory';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };

const db = createMemory({
  schema,
  parsers: {
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
  parsers: { users: UserSchema },
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

- Parsers validate writes and decode persisted reads through the same function. Records must be JSON-safe: use ISO strings for dates so every adapter's serialization round-trips.
- IndexedDB indexes read the stored record directly, so canonical parser output is what secondary indexes match.
- The `migrate` callback on IndexedDB runs synchronously inside `onupgradeneeded`. Do not call `await` or open a second transaction inside it: IDB will throw. Errors thrown from `migrate` surface as `VaultMigrationError` on the first operation.
- A Web Storage write that exceeds the browser quota always rejects with `VaultQuotaError`; the failed write is simply not persisted.

### Related

- [Reactive Tables](./reactive.md)
- [Spell](/spell/)
- [API Reference: Types](/vault/api.md#types)
