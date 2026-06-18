---
title: 'Arsenal Examples — hash'
description: 'hash example for @vielzeug/arsenal.'
---

## hash

### Problem

You need a deterministic string from an object to use as a cache key, but `JSON.stringify` produces different output depending on key insertion order.

### Solution

Use `hash(value, options?)` to always produce the same string regardless of key order. Object keys are sorted alphabetically; `Date`, `RegExp`, `Set`, `Map`, and `bigint` all have deterministic representations.

```ts
import { hash } from '@vielzeug/arsenal';

const key1 = hash({ sort: 'asc', filter: { role: 'admin' } });
const key2 = hash({ filter: { role: 'admin' }, sort: 'asc' });
key1 === key2; // true

hash(new Set([3, 1, 2])); // '[Set:1,2,3]'
hash(new Date('2024-01-01T00:00:00Z')); // '[Date:2024-01-01T00:00:00.000Z]'
hash(
  new Map([
    ['b', 2],
    ['a', 1],
  ]),
); // '[Map:"a"=>1,"b"=>2]'
hash(42n); // '42n'
```

#### Circular references

```ts
import { hash } from '@vielzeug/arsenal';

const o: Record<string, unknown> = { x: 1 };
o.self = o;
hash(o); // '{"self":[Circular],"x":1}'
```

#### Throw on class instances

```ts
import { hash } from '@vielzeug/arsenal';

class Token {}
hash(new Token()); // String(instance) — default
hash(new Token(), { onClassInstance: 'throw' }); // throws TypeError
```

### Pitfalls

- Class instances coerce to `String(instance)` by default — pass `{ onClassInstance: 'throw' }` to detect them.
- `undefined` properties are omitted (same as `JSON.stringify`).
- Map keys are sorted; output is deterministic regardless of insertion order.

### Related

- [parseJSON](./parseJSON.md)
- [stash](./stash.md)
