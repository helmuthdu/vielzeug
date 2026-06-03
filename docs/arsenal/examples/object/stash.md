# stash

`stash` creates a typed in-memory cache with explicit key hashing, optional metadata, and TTL-based garbage collection.

## Source Code

::: details View Source Code
<<< @/../packages/arsenal/src/object/stash.ts
:::

## Features

- **Type-safe**: Generic typing for values, keys, and metadata.
- **Explicit hashing**: You provide `hash(key)` to control key stability.
- **TTL support**: Set TTL inline (`set(..., { ttlMs: 5000 })`).
- **Stampede prevention**: `getOrSet` with async factories deduplicates concurrent calls.
- **Eviction callback**: Optional `onEvict(key, value)` when entries are removed.

## API

```ts
type CacheOptions<K, T> = {
  hash: (key: K) => string;
  onEvict?: (key: K, value: T) => void;
};

type CacheSetOptions = {
  ttlMs?: number; // finite number or Infinity
};

type Stash<T, K> = {
  get(key: K): T | undefined;
  set(key: K, value: T, options?: CacheSetOptions): void;
  getOrSet(key: K, factory: () => T, options?: CacheSetOptions): T;
  getOrSet(key: K, factory: () => Promise<T>, options?: CacheSetOptions): Promise<T>;
  delete(key: K): boolean;
  clear(): void;
  readonly size: number;
  entries(): IterableIterator<[K, T]>;
};

function stash<T, K = string>(options: CacheOptions<K, T>): Stash<T, K>;
```

### Parameters

- `options.hash` (required): deterministic hash function for your key type.
- `options.onEvict` (optional): called whenever an entry is removed (delete, clear, or TTL expiry).

## Examples

### Basic Cache Usage

```ts
import { stash } from '@vielzeug/arsenal';

const userCache = stash<{ name: string; email: string }>({
  hash: (key) => JSON.stringify(key),
});

userCache.set(['user', 123], { name: 'Alice', email: 'alice@example.com' });

const user = userCache.get(['user', 123]);
console.log(user?.name); // 'Alice'
console.log(userCache.size); // 1
```

### TTL-based expiry

```ts
import { stash } from '@vielzeug/arsenal';

const sessionCache = stash<string>({
  hash: (key) => JSON.stringify(key),
  onEvict: (key, value) => console.log(`evicted: ${String(key)}`),
});

sessionCache.set(['session', 'abc123'], 'user-data', { ttlMs: 5 * 60 * 1000 });
// Entry is automatically removed after 5 minutes
```

### Lazy Creation

```ts
import { stash } from '@vielzeug/arsenal';

const c = stash<number>({ hash: (key) => JSON.stringify(key) });

const value = c.getOrSet(['answer'], () => 42);
console.log(value); // 42
```

### Iteration

```ts
import { stash } from '@vielzeug/arsenal';

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
- [getOrCreate](./getOrCreate.md): Lazy-initialise a Map entry.
