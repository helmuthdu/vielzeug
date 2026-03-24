# stash

`stash` creates a typed in-memory cache with explicit key hashing, optional metadata, and TTL-based garbage collection.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/object/stash.ts
:::

## Features

- **Type-safe**: Generic typing for values, keys, and metadata.
- **Explicit hashing**: You provide `hash(key)` to control key stability.
- **TTL support**: Set TTL inline (`set(..., { ttlMs })`) or later with `scheduleGc`.
- **Metadata support**: Optional metadata per key.
- **Ergonomic helpers**: `has`, `getOrSet`, `touch`, `entries`, `keys`, `values`.

## API

```ts
type CacheOptions<K extends readonly unknown[]> = {
  hash: (key: K) => string;
  onError?: (error: unknown) => void;
};

type CacheSetOptions<M> = {
  ttlMs?: number; // finite number or Infinity
  meta?: M;
};

declare function stash<T, K extends readonly unknown[] = readonly unknown[], M = never>(
  options: CacheOptions<K>,
): {
  get: (key: K) => T | undefined;
  set: (key: K, value: T, options?: CacheSetOptions<M>) => void;
  getOrSet: (key: K, factory: () => T, options?: CacheSetOptions<M>) => T;
  touch: (key: K, ttlMs: number) => boolean;
  delete: (key: K) => boolean;
  clear: () => void;
  size: () => number;
  scheduleGc: (key: K, delayMs: number) => void;
  cancelGc: (key: K) => void;
  getEntry: (key: K) => { value: T; meta: M | undefined } | undefined;
  entries: () => IterableIterator<[K, T]>;
};
```

### Parameters

- `options.hash` (required): deterministic hash function for your key type.
- `options.onError` (optional): called when scheduler task submission fails for non-abort reasons.

## Examples

### Basic Cache Usage

```ts
import { stash } from '@vielzeug/toolkit';

const userCache = stash<{ name: string; email: string }>({
  hash: (key) => JSON.stringify(key),
});

userCache.set(['user', 123], { name: 'Alice', email: 'alice@example.com' });

const user = userCache.get(['user', 123]);
console.log(user?.name); // 'Alice'
console.log(userCache.size()); // 1
```

### TTL + GC

```ts
import { stash } from '@vielzeug/toolkit';

const sessionCache = stash<string>({
  hash: (key) => JSON.stringify(key),
});

sessionCache.set(['session', 'abc123'], 'user-data', { ttlMs: 5 * 60 * 1000 });

// Extend the TTL if still active
sessionCache.touch(['session', 'abc123'], 10 * 60 * 1000);
```

### Metadata

```ts
import { stash } from '@vielzeug/toolkit';

type QueryMeta = { staleTime: number; gcTime: number; enabled: boolean };

const apiCache = stash<unknown, readonly unknown[], QueryMeta>({
  hash: (key) => JSON.stringify(key),
});

apiCache.set(['api', '/users'], { data: [] }, { meta: { staleTime: 60000, gcTime: 300000, enabled: true } });

const meta = apiCache.getEntry(['api', '/users'])?.meta;
console.log(meta?.staleTime); // 60000
```

### Lazy Creation

```ts
import { stash } from '@vielzeug/toolkit';

const c = stash<number>({ hash: (key) => JSON.stringify(key) });

const value = c.getOrSet(['answer'], () => 42);
console.log(value); // 42
```

### Iteration

```ts
import { stash } from '@vielzeug/toolkit';

const c = stash<number>({ hash: (key) => JSON.stringify(key) });
c.set(['a'], 1);
c.set(['b'], 2);

for (const [key, value] of c.entries()) {
  console.log(key, value);
}
```

## Implementation Notes

- Hashing strategy is caller-defined via `hash(key)`.
- GC tasks are revision-guarded to avoid stale timer races.
- `ttlMs` supports `Infinity` to disable eviction for a key.
- The cache is in-memory only.

## See Also

- [memo](../function/memo.md): Memoize function results.
- [merge](./merge.md): Deep merge objects.


