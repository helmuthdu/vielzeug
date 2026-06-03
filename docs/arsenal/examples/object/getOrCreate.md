# getOrCreate

Lazily initialise a `Map` entry: returns the existing value if found, otherwise calls the factory, stores the result, and returns it.

## Signature

```ts
function getOrCreate<K, V>(map: Map<K, V>, key: K, build: () => V): V;
```

## Parameters

- `map` — The `Map` to read from / write to.
- `key` — The key to look up.
- `build` — Factory called once when the key is absent.

## Returns

The existing or newly created value.

## Examples

### Cache expensive objects

```ts
import { getOrCreate } from '@vielzeug/arsenal';

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string): Intl.NumberFormat {
  return getOrCreate(formatters, locale, () => new Intl.NumberFormat(locale));
}

getFormatter('en-US').format(1234.5); // '1,234.5'
getFormatter('en-US'); // returns cached instance
```

### Group items lazily

```ts
import { getOrCreate } from '@vielzeug/arsenal';

const groups = new Map<string, number[]>();

for (const item of [
  { tag: 'a', n: 1 },
  { tag: 'b', n: 2 },
  { tag: 'a', n: 3 },
]) {
  getOrCreate(groups, item.tag, () => []).push(item.n);
}

console.log(groups.get('a')); // [1, 3]
console.log(groups.get('b')); // [2]
```

### Handles undefined values

```ts
import { getOrCreate } from '@vielzeug/arsenal';

const map = new Map<string, undefined>();
const build = vi.fn(() => undefined);

getOrCreate(map, 'key', build);
getOrCreate(map, 'key', build); // build not called again

console.log(build.mock.calls.length); // 1
```

## Related

- [cache](./cache.md) — Bounded FIFO cache
- [stash](./stash.md) — TTL-aware cache with stampede prevention
- [memo](../function/memo.md) — Memoize function results
