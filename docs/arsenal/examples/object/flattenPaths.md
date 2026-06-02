# flattenPaths / unflattenPaths / isSafePath

Flatten a nested object to dot-notation paths and reconstruct it back. Includes prototype-pollution protection.

## Signatures

```ts
function flattenPaths(obj: Record<string, unknown>, prefix?: string, depth?: number): Record<string, unknown>

function unflattenPaths(flat: Record<string, unknown>): Record<string, unknown>

function isSafePath(key: string): boolean
```

## Examples

### flattenPaths

```ts
import { flattenPaths } from '@vielzeug/arsenal';

flattenPaths({ a: { b: 1, c: 2 }, d: 3 });
// { 'a.b': 1, 'a.c': 2, 'd': 3 }

flattenPaths({ user: { name: 'Alice', address: { city: 'Berlin' } } });
// { 'user.name': 'Alice', 'user.address.city': 'Berlin' }
```

### unflattenPaths

```ts
import { unflattenPaths } from '@vielzeug/arsenal';

unflattenPaths({ 'a.b': 1, 'a.c': 2, 'd': 3 });
// { a: { b: 1, c: 2 }, d: 3 }
```

### Round-trip

```ts
import { flattenPaths, unflattenPaths } from '@vielzeug/arsenal';

const original = { config: { db: { host: 'localhost', port: 5432 } } };
const flat = flattenPaths(original);
// { 'config.db.host': 'localhost', 'config.db.port': 5432 }

const restored = unflattenPaths(flat);
// { config: { db: { host: 'localhost', port: 5432 } } }
```

### isSafePath — prototype pollution guard

```ts
import { isSafePath } from '@vielzeug/arsenal';

isSafePath('user.name');           // true
isSafePath('__proto__.polluted');  // false
isSafePath('constructor.prototype'); // false
```

## Notes

- `flattenPaths` silently skips keys containing `__proto__`, `constructor`, or `prototype`.
- `unflattenPaths` silently skips any path segment that is one of the unsafe keys.
- Depth is limited to 10 levels.

## Related

- [getPath](./path.md) — Dot-notation access into nested objects
- [defaults](./defaults.md) — Apply default values to an object
