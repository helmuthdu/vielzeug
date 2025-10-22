# memo

Creates a function that memoizes the result of the provided function. Supports cache expiration (TTL) and limited cache size (LRU eviction).

## API

```ts
memo<T extends Fn>(fn: T, options?: { ttl?: number; maxSize?: number }): (...args: Parameters<T>) => ReturnType<T>
```

- `fn`: Function to memoize.
- `options.ttl`: Time-to-live for cache entries in milliseconds (optional).
- `options.maxSize`: Maximum number of items in cache (optional, LRU eviction).
- Returns: Memoized function.

## Example

```ts
import { memo } from '@vielzeug/toolkit';

const add = (x, y) => x + y;
const memoizedAdd = memo(add, { ttl: 5000, maxSize: 10 });
memoizedAdd(1, 2); // 3 (caches the result)
memoizedAdd(1, 2); // 3 (from cache)
```

## Notes

- Cache entries expire after `ttl` ms if provided.
- When `maxSize` is reached, least recently used entries are evicted.
- Useful for expensive or pure functions.

## Related

- [once](./once.md)
- [throttle](./throttle.md)
