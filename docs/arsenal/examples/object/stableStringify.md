# stableStringify

Produces a deterministic, stable JSON-like string for any value. Object keys are sorted alphabetically; `Date`, `Set`, `Map`, `bigint`, `RegExp`, and circular references all have deterministic representations.

## Signature

```ts
function stableStringify(value: unknown, options?: { strict?: boolean }): string
```

## Parameters

- `value` — Any value to serialise.
- `options.strict` — When `true`, throws a `TypeError` for class instances instead of falling back to `String(instance)`.

## Returns

A deterministic string representation.

## Examples

### Deterministic object keys

```ts
import { stableStringify } from '@vielzeug/arsenal';

stableStringify({ b: 2, a: 1 }); // '{"a":1,"b":2}'
stableStringify({ z: 'last', a: 'first' }); // '{"a":"first","z":"last"}'
```

### Built-in types

```ts
import { stableStringify } from '@vielzeug/arsenal';

stableStringify(new Set([3, 1, 2]));  // '[Set:1,2,3]'
stableStringify(new Map([['b', 2], ['a', 1]]));  // '[Map:{"a":1,"b":2}]'
stableStringify(new Date('2024-01-01T00:00:00Z')); // '[Date:2024-01-01T00:00:00.000Z]'
stableStringify(42n); // '[BigInt:42]'
stableStringify(/foo/gi); // '[RegExp:/foo/gi]'
```

### Cache keys

```ts
import { stableStringify } from '@vielzeug/arsenal';

const key = stableStringify({ filter: { role: 'admin' }, sort: 'asc' });
// '{"filter":{"role":"admin"},"sort":"asc"}'
// Same result regardless of property insertion order
```

### Strict mode

```ts
import { stableStringify } from '@vielzeug/arsenal';

class Foo {}

stableStringify(new Foo());               // '[object Object]' (default)
stableStringify(new Foo(), { strict: true }); // throws TypeError
```

## Related

- [parseJSON](./parseJSON.md) — Safe JSON parse with fallback
- [memo](../function/memo.md) — Use stableStringify as a cache key function
