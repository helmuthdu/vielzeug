<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-512_B-success" alt="Size">
</div>

# memo

The `memo` utility creates a memoized version of a function that caches its results based on the provided arguments. It is highly configurable, featuring support for Time-To-Live (TTL) expiration and a maximum cache size with LRU (Least Recently Used) eviction.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/memo.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Smart Caching**: Efficiently stores and retrieves results for pure functions.
- **Cache Management**: Prevent memory leaks with `maxSize` and `ttl` options.
- **LRU Eviction**: Automatically removes the oldest entries when the cache limit is reached.
- **Type-safe**: Properly preserves the original function's signature and return type.

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/function/memo.ts#MemoizeOptions
:::

```ts
function memo<T extends (...args: any[]) => any>(fn: T, options?: MemoizeOptions<T>): T
```

### Parameters

- `fn`: The function to memoize.
- `options`: Optional configuration:
  - `ttl`: Time in milliseconds before a cached result expires.
  - `maxSize`: Maximum number of entries to keep in the cache.

### Returns

- A new function that caches results.

## Examples

### Basic Memoization

```ts
import { memo } from '@vielzeug/toolkit';

const heavyCalculation = (n: number) => {
  console.log('Calculating...');
  return n * n;
};

const cachedCalc = memo(heavyCalculation);

cachedCalc(5); // Logs 'Calculating...', returns 25
cachedCalc(5); // Returns 25 immediately (from cache)
```

### With Expiration (TTL)

```ts
import { memo } from '@vielzeug/toolkit';

// Cache results for only 1 minute
const getStats = memo(fetchStats, { ttl: 60000 });
```

### Limiting Memory Usage

```ts
import { memo } from '@vielzeug/toolkit';

// Keep only the last 100 results
const formatData = memo(formatter, { maxSize: 100 });
```

## Implementation Notes

- Performance-optimized using a standard `Map` for the cache.
- The cache key is generated based on the string representation of all arguments.
- Throws `TypeError` if `fn` is not a function.

## See Also

- [once](./once.md): Cache a result that never changes.
- [retry](./retry.md): Automatically re-run failed operations.
- [throttle](./throttle.md): Rate-limit execution based on time.
