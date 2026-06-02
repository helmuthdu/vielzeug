# allOf / anyOf / noneOf

Predicate combinators that compose multiple predicates into a single function using AND, OR, and NOR logic.

## Signatures

```ts
function allOf<T>(...predicates: Array<(value: T) => boolean>): (value: T) => boolean
function anyOf<T>(...predicates: Array<(value: T) => boolean>): (value: T) => boolean
function noneOf<T>(...predicates: Array<(value: T) => boolean>): (value: T) => boolean
```

## Examples

### allOf — all predicates must pass

```ts
import { allOf } from '@vielzeug/arsenal';

const isAdultAdmin = allOf(
  (u: { age: number; role: string }) => u.age >= 18,
  (u) => u.role === 'admin',
);

isAdultAdmin({ age: 25, role: 'admin' }); // true
isAdultAdmin({ age: 25, role: 'user' });  // false
isAdultAdmin({ age: 16, role: 'admin' }); // false
```

### anyOf — at least one predicate must pass

```ts
import { anyOf } from '@vielzeug/arsenal';

const isPrivileged = anyOf(
  (u: { role: string }) => u.role === 'admin',
  (u) => u.role === 'moderator',
);

isPrivileged({ role: 'admin' });     // true
isPrivileged({ role: 'moderator' }); // true
isPrivileged({ role: 'user' });      // false
```

### noneOf — no predicate may pass

```ts
import { noneOf } from '@vielzeug/arsenal';

const isNotBanned = noneOf(
  (u: { banned: boolean; suspended: boolean }) => u.banned,
  (u) => u.suspended,
);

isNotBanned({ banned: false, suspended: false }); // true
isNotBanned({ banned: true, suspended: false });  // false
```

### Filter arrays

```ts
import { allOf, isString, isDefined } from '@vielzeug/arsenal';

const values = ['hello', null, 'world', undefined, ''];
const validStrings = values.filter(allOf(isDefined, isString));
// ['hello', 'world', '']
```

## Edge cases

- `allOf()` with zero predicates → always returns `true` (vacuous truth)
- `anyOf()` with zero predicates → always returns `false` (vacuous falsity)
- `noneOf()` with zero predicates → always returns `true`

## Related

- [assert](./assert.md) — Throw if a condition is falsy
- [identity](./identity.md) — Returns its argument unchanged
