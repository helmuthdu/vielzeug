# isPlainObject

Returns `true` if the value is a plain object — one with `Object.prototype` or a `null` prototype. Excludes class instances, arrays, `Date`, `Map`, `Set`, and other built-ins.

## Signature

```ts
function isPlainObject(value: unknown): value is Record<string, unknown>
```

## Examples

### Basic usage

```ts
import { isPlainObject } from '@vielzeug/arsenal';

isPlainObject({});                   // true
isPlainObject({ a: 1 });             // true
isPlainObject(Object.create(null));  // true

isPlainObject([]);           // false
isPlainObject(new Date());   // false
isPlainObject(new Map());    // false
isPlainObject(null);         // false
isPlainObject('string');     // false
```

### Distinguish from class instances

```ts
import { isPlainObject } from '@vielzeug/arsenal';

class Foo {}
isPlainObject(new Foo()); // false — has Foo.prototype
isPlainObject({});        // true — has Object.prototype
```

### Runtime data validation

```ts
import { isPlainObject } from '@vielzeug/arsenal';

function processConfig(config: unknown) {
  if (!isPlainObject(config)) {
    throw new TypeError('config must be a plain object');
  }
  // config is Record<string, unknown> here
  return config;
}
```

## Related

- [isMatch](./isMatch.md) — Partial deep structural comparison
- [isEqual](./isEqual.md) — Deep or shallow equality
- [isEmpty](./isEmpty.md) — Check if a value is empty
