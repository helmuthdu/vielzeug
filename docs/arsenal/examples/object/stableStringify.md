---
title: 'Arsenal Examples — stableStringify'
description: 'stableStringify example for @vielzeug/arsenal.'
---

## stableStringify

### Problem

You need a deterministic string from an object to use as a cache key, but `JSON.stringify` produces different output depending on key insertion order.

### Solution

Use `stableStringify(value, options?)` to always produce the same string regardless of key order. Object keys are sorted; `Date`, `Set`, `Map`, and `bigint` all have deterministic representations.

```ts
import { stableStringify } from '@vielzeug/arsenal';

const key1 = stableStringify({ sort: 'asc', filter: { role: 'admin' } });
const key2 = stableStringify({ filter: { role: 'admin' }, sort: 'asc' });
key1 === key2; // true

stableStringify(new Set([3, 1, 2])); // '[Set:1,2,3]'
stableStringify(new Date('2024-01-01T00:00Z')); // '[Date:2024-01-01T00:00:00.000Z]'
stableStringify(42n); // '[BigInt:42]'
```

#### Strict mode — throw on class instances

```ts
import { stableStringify } from '@vielzeug/arsenal';

stableStringify(new MyClass()); // falls back to String(instance)
stableStringify(new MyClass(), { strict: true }); // throws TypeError
```

### Pitfalls

- Class instances fall back to `String(instance)` by default — use `{ strict: true }` to detect them instead.
- Map keys are sorted; the output is deterministic regardless of insertion order.

### Related

- [parseJSON](./parseJSON.md)
- [stash](./stash.md)
