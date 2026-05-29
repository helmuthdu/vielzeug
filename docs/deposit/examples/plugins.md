---
title: 'Deposit Examples — Plugins and Error Handling'
description: 'Logger, validators, metrics, migration, and error handling patterns for @vielzeug/deposit.'
---

## Plugins and Error Handling

### Problem

You need to integrate storage with your app's existing logging, validation, and observability infrastructure. You also need predictable error handling for quota errors, disposed adapters, and IndexedDB migration failures.

### Solution

All four adapter factories accept the same optional plugin options at construction time. Each plugin uses a structural interface — pass the real library object directly.

#### Logger

Pass any object with an `error(...)` method. Observer notification errors are routed to `logger.error`. A `@vielzeug/rune` Logger satisfies the interface directly.

```ts
import { createLogger } from '@vielzeug/rune';
import { createIndexedDB, table } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db = createIndexedDB({
  name: 'app',
  schema,
  version: 1,
  logger: createLogger('deposit'),
});
```

#### Validators

Pass any object with a `parse(value): T` method. Validators run before every `put`, `putAll`, `update`, and `upsert`. A `@vielzeug/sieve` schema satisfies the interface directly.

```ts
import { s } from '@vielzeug/sieve';
import { createMemory, table } from '@vielzeug/deposit';

type User = { id: number; name: string; age: number };
const schema = { users: table<User>('id') };

const db = createMemory({
  schema,
  validators: {
    users: s.object({
      id:   s.number(),
      name: s.string(),
      age:  s.number().min(0).max(150),
    }),
  },
});

// throws a sieve validation error — nothing is written to storage
await db.put('users', { id: 1, name: 'Alice', age: -5 });
```

#### Metrics

`onMetrics` is called after every completed operation with table name, operation name, and duration.

```ts
import { createMemory, table } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const db = createMemory({
  schema,
  onMetrics: (event) => {
    console.log(`[${event.table}] ${event.operation} — ${event.duration}ms`);
  },
});
```

#### Quota exceeded hook (LocalStorage / SessionStorage)

```ts
import { createLocalStorage, table, type DepositQuotaError } from '@vielzeug/deposit';

type CacheEntry = { id: string; payload: string };
const schema = { cache: table<CacheEntry>('id') };

const db = createLocalStorage({
  name: 'app',
  schema,
  onQuotaExceeded: (tableName, error: DepositQuotaError) => {
    console.warn(`[${String(tableName)}] quota exceeded — dropping write`, error.message);
    return 'ignore'; // silently drop the write; use 'throw' to rethrow (default)
  },
});
```

#### IndexedDB migration hook

```ts
import { createIndexedDB, table, type MigrationFn } from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };

const migrate: MigrationFn = ({ db, oldVersion, tx }) => {
  if (oldVersion < 2 && db.objectStoreNames.contains('users')) {
    tx.objectStore('users').createIndex('name', 'name', { unique: false });
  }
};

const db = createIndexedDB({ name: 'app', migrate, schema, version: 2 });
void db;
```

#### Error handling

```ts
import {
  createMemory,
  table,
  DepositDisposedError,
  DepositError,
  DepositMigrationError,
  DepositQuotaError,
  DepositScopeError,
} from '@vielzeug/deposit';

type User = { id: number; name: string };
const schema = { users: table<User>('id') };
const db = createMemory({ schema });

try {
  await db.put('users', { id: 1, name: 'Alice' });
} catch (err) {
  if (err instanceof DepositDisposedError) {
    // adapter was disposed before this call
  } else if (err instanceof DepositScopeError) {
    // batch() accessed an out-of-scope table, or observeMany() received an empty array
  } else if (err instanceof DepositQuotaError) {
    // LocalStorage / SessionStorage write exceeded quota
  } else if (err instanceof DepositMigrationError) {
    // IndexedDB onupgradeneeded threw
  } else if (err instanceof DepositError) {
    // any other deposit error
  } else {
    throw err;
  }
}
```

### Pitfalls

- `onMetrics` is called **after** the operation completes. A validator error thrown before the write never reaches `onMetrics`.
- Validators receive the raw value passed to `put` — they run before TTL wrapping and before any storage write. A thrown parse error leaves storage unchanged.
- The `migrate` callback on IndexedDB runs synchronously inside `onupgradeneeded`. Do not call `await` or open a second transaction inside it — IDB will throw. Errors thrown from `migrate` surface as `DepositMigrationError` on the first operation.
- `onQuotaExceeded` returning `'ignore'` silently drops the write without throwing. The adapter continues operating normally. Returning `'throw'` (or not providing the hook) rethrows the original `DepositQuotaError`.

### Related

- [Reactive Tables](./reactive.md)
- [Rune](/rune/)
- [Sieve](/sieve/)
- [API Reference — Plugin Types](/deposit/api.md#types)
