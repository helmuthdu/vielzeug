# cache

Creates a simple bounded FIFO cache. When at capacity, the oldest entry is evicted before inserting a new one.

## Signature

```ts
function cache<K, V>(maxSize: number): {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
}
```

## Parameters

- `maxSize` — Maximum number of entries before the oldest is evicted.

## Returns

An object with `get` and `set` methods.

## Examples

### Basic usage

```ts
import { cache } from '@vielzeug/arsenal';

const fmt = cache<string, Intl.NumberFormat>(64);

function getFormatter(locale: string): Intl.NumberFormat {
  return fmt.get(locale) ?? (() => {
    const f = new Intl.NumberFormat(locale);
    fmt.set(locale, f);
    return f;
  })();
}

console.log(getFormatter('en-US').format(1234.5)); // '1,234.5'
console.log(getFormatter('de-DE').format(1234.5)); // '1.234,5'
```

### Bounded eviction

```ts
import { cache } from '@vielzeug/arsenal';

const c = cache<string, number>(2);

c.set('a', 1);
c.set('b', 2);
c.set('c', 3); // evicts 'a'

console.log(c.get('a')); // undefined
console.log(c.get('b')); // 2
console.log(c.get('c')); // 3
```

## Related

- [stash](./stash.md) — TTL-aware cache with stampede prevention
- [getOrCreate](./getOrCreate.md) — Lazy-initialise a Map entry
- [memo](../function/memo.md) — Memoize function results with optional LRU cap
