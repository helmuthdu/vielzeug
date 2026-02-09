# cache

The `cache` utility creates a generic key-value cache with automatic garbage collection, metadata tracking, and observer support. It's designed to efficiently store temporary data with time-based expiration.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/object/cache.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type-safe**: Generic typing for cache values.
- **Automatic GC**: Schedule automatic garbage collection for cache entries.
- **Metadata Support**: Store additional metadata alongside cache entries.
- **Flexible Keys**: Use arrays of any values as cache keys.

## API

```ts
function cache<T>(): {
  get: (key: readonly unknown[]) => T | undefined;
  set: (key: readonly unknown[], value: T) => void;
  delete: (key: readonly unknown[]) => boolean;
  clear: () => void;
  size: () => number;
  scheduleGc: (key: readonly unknown[], delayMs: number) => void;
  setMeta: (key: readonly unknown[], meta: Record<string, unknown>) => void;
  getMeta: (key: readonly unknown[]) => Record<string, unknown> | undefined;
  getMetaByHash: (keyHash: string) => Record<string, unknown> | undefined;
  listMetaHashes: () => string[];
  hash: (key: readonly unknown[]) => string;
};
```

### Parameters

None. The function returns a cache instance.

### Returns

A cache instance with the following methods:

- **get(key)**: Retrieve a value from the cache.
- **set(key, value)**: Store a value in the cache.
- **delete(key)**: Remove a value from the cache. Returns `true` if deleted, `false` if not found.
- **clear()**: Remove all values from the cache.
- **size()**: Get the current number of entries in the cache.
- **scheduleGc(key, delayMs)**: Schedule automatic deletion of a cache entry after the specified delay.
- **setMeta(key, meta)**: Store metadata for a cache entry (automatically includes `lastUsedAt` timestamp).
- **getMeta(key)**: Retrieve metadata for a cache entry.
- **getMetaByHash(keyHash)**: Retrieve metadata using the hash string directly.
- **listMetaHashes()**: Get a list of all metadata hash keys.
- **hash(key)**: Generate the hash string for a given key.

## Examples

### Basic Cache Usage

```ts
import { cache } from '@vielzeug/toolkit';

const userCache = cache<{ name: string; email: string }>();

// Store user data
userCache.set(['user', 123], { name: 'Alice', email: 'alice@example.com' });

// Retrieve user data
const user = userCache.get(['user', 123]);
console.log(user?.name); // 'Alice'

// Check cache size
console.log(userCache.size()); // 1
```

### Automatic Garbage Collection

```ts
import { cache } from '@vielzeug/toolkit';

const sessionCache = cache<string>();

// Store session with 5-minute expiration
sessionCache.set(['session', 'abc123'], 'user-data');
sessionCache.scheduleGc(['session', 'abc123'], 5 * 60 * 1000);

// Session will be automatically deleted after 5 minutes
```

### Using Metadata

```ts
import { cache } from '@vielzeug/toolkit';

const apiCache = cache<any>();

// Store API response with metadata
apiCache.set(['api', '/users'], { data: [...] });
apiCache.setMeta(['api', '/users'], {
  staleTime: 60000,
  cacheTime: 300000,
  enabled: true
});

// Retrieve metadata
const meta = apiCache.getMeta(['api', '/users']);
console.log(meta?.staleTime); // 60000
console.log(meta?.lastUsedAt); // timestamp
```

### Complex Cache Keys

```ts
import { cache } from '@vielzeug/toolkit';

const queryCache = cache<any>();

// Use complex objects as part of the key
const key = ['query', { page: 1, filter: 'active' }, ['name', 'email']];
queryCache.set(key, { results: [...] });

// Same key structure retrieves the value
const results = queryCache.get(['query', { page: 1, filter: 'active' }, ['name', 'email']]);
```

### Listing and Cleaning Up

```ts
import { cache } from '@vielzeug/toolkit';

const myCache = cache<string>();

myCache.set(['a'], 'A');
myCache.set(['b'], 'B');
myCache.setMeta(['a'], { priority: 'high' });
myCache.setMeta(['b'], { priority: 'low' });

// List all metadata keys
const hashes = myCache.listMetaHashes();

// Inspect metadata for each
hashes.forEach((hash) => {
  const meta = myCache.getMetaByHash(hash);
  console.log(meta);
});

// Clear everything
myCache.clear();
console.log(myCache.size()); // 0
```

## Implementation Notes

- Keys are hashed using `JSON.stringify`, so key order and structure must match exactly for retrieval.
- Garbage collection timers are automatically cleared when entries are deleted or the cache is cleared.
- Metadata always includes a `lastUsedAt` timestamp automatically.
- The cache is purely in-memory and will be lost on page refresh or process restart.

## See Also

- [memo](../function/memo.md): Memoize function results with automatic caching.
- [merge](./merge.md): Deep merge objects.
- [clone](./clone.md): Deep clone objects for safe storage.
