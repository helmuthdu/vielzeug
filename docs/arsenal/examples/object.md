---
title: 'Arsenal — Object Examples'
description: 'Object utility examples for Arsenal.'
---

## Object Utilities

Object utilities provide robust tools to manipulate, compare, and traverse objects in a type-safe, ergonomic way. Use these helpers for deep merging, nested path access, diffing, caching, and more.

## Quick Reference

- [`stash`](./object/stash.md): TTL-aware key-value cache with stampede prevention and eviction callback.
- [`defaults`](./object/defaults.md): Apply fallback values for undefined keys.
- [`diff`](./object/diff.md): Compare two objects and return the structural differences.
- [`entries`](./object/entries.md): Typed wrapper for `Object.entries`.
- [`filterValues`](./object/filterValues.md): Filter object keys by value predicate.
- [`flattenPaths`](./object/flattenPaths.md): Flatten nested object to a `{ 'a.b': value }` map.
- [`fromEntries`](./object/fromEntries.md): Typed wrapper for `Object.fromEntries`.
- [`getOrCreate`](./object/getOrCreate.md): Lazily initialise a `Map` entry.
- [`getPath`](./object/path.md): Safely access nested properties using dot-notation strings.
- [`has`](./object/has.md): Type-safe key existence check.
- [`invert`](./object/invert.md): Invert key-value pairs.
- [`keys`](./object/keys.md): Typed wrapper for `Object.keys`.
- [`mapKeys`](./object/mapKeys.md): Transform object keys.
- [`mapValues`](./object/mapValues.md): Transform object values.
- [`deepMerge` and `deepMergeWith`](./object/merge.md): Merge multiple objects deeply.
- [`pick`](./object/pick.md): Create a new object with only selected keys.
- [`omit`](./object/omit.md): Create a new object excluding selected keys.
- [`parseJSON`](./object/parseJSON.md): Safely parse JSON strings with optional fallback value.
- [`prune`](./object/prune.md): Recursively remove null/undefined/empty values.
- [`stableStringify`](./object/stableStringify.md): Deterministic JSON-like string for cache keys.
- [`values`](./object/values.md): Typed wrapper for `Object.values`.

## Practical Examples

### Diffing

```ts
import { diff } from '@vielzeug/arsenal';

const config = { api: { host: 'localhost', port: 8080 }, flags: { beta: false } };
const updated = structuredClone(config);

updated.api.port = 3000;
updated.flags.beta = true;

// Find what changed
const changes = diff(config, updated);
// { api: { port: 3000 }, flags: { beta: true } }
```

### Deep Merge

```ts
import { deepMerge, deepMergeWith } from '@vielzeug/arsenal';

const base = { api: { host: 'localhost', port: 8080 }, tags: ['core'] };
const override = { api: { port: 3000 }, tags: ['docs'] };

// Arrays are replaced by default
const merged = deepMerge(base, override);
// { api: { host: 'localhost', port: 3000 }, tags: ['docs'] }

// Concatenate arrays instead
const concat = deepMergeWith({ arrayStrategy: 'concat' })(base, override);
// { api: { host: 'localhost', port: 3000 }, tags: ['core', 'docs'] }

console.log(merged, concat);
```

### Accessing Nested Data

```ts
import { getPath, omit, pick } from '@vielzeug/arsenal';

const data = {
  user: {
    profile: {
      settings: { theme: 'dark' },
    },
  },
};

// Dot notation only — 'a.1.b' for array indices; bracket notation ('a[1].b') throws TypeError
const theme = getPath(data, 'user.profile.settings.theme'); // 'dark'
const missing = getPath(data, 'user.profile.missing', 'fallback'); // 'fallback'

const user = { id: 1, name: 'Alice', role: 'admin', password: 'secret' };
const safe = pick(user, ['id', 'name', 'role']);
const noSecret = omit(user, ['password']);

console.log(theme, missing, safe, noSecret);
```

### Pruning & Cleaning

```ts
import { prune } from '@vielzeug/arsenal';

// Remove all nulls, undefined, empty strings, and empty objects/arrays
prune({ a: 1, b: null, c: '', d: { e: undefined } }); // { a: 1 }
prune([1, null, '', 2, undefined]); // [1, 2]
prune('  hello  '); // 'hello'
prune('   '); // undefined
```

### Caching with stash

```ts
import { stash } from '@vielzeug/arsenal';

const myCache = stash<User, readonly unknown[]>({
  hash: (key) => JSON.stringify(key),
  onEvict: (key, user) => console.log('evicted', key, user.id),
});

myCache.set(['user', 1], { id: 1, name: 'Alice' }, { ttlMs: 30_000 });
myCache.get(['user', 1]); // { id: 1, name: 'Alice' }

// getOrSet caches the result including undefined — factory called only once per key
const user = await myCache.getOrSet(['user', 2], () => fetchUser(2));

// Concurrent calls to getOrSet share one in-flight Promise (stampede prevention)
const [a, b] = await Promise.all([
  myCache.getOrSet(['user', 3], () => fetchUser(3)),
  myCache.getOrSet(['user', 3], () => fetchUser(3)), // deduplicated
]);

myCache.size(); // 3
```

### Stable Cache Keys

```ts
import { stableStringify } from '@vielzeug/arsenal';

// Key is the same regardless of property insertion order
const key1 = stableStringify({ sort: 'asc', filter: { role: 'admin' } });
const key2 = stableStringify({ filter: { role: 'admin' }, sort: 'asc' });
key1 === key2; // true

// Handles Dates, Sets, Maps, bigints
stableStringify(new Set([3, 1, 2])); // '[Set:1,2,3]'
stableStringify(
  new Map([
    ['b', 2],
    ['a', 1],
  ]),
); // '[Map:"a"=>1,"b"=>2]'
stableStringify(new Date('2024-01-01T00:00:00Z')); // '[Date:2024-01-01T00:00:00.000Z]'

// Class instances fall back to String() by default
// Pass { strict: true } to throw a TypeError instead
stableStringify(new MyClass(), { strict: true }); // TypeError
```

## All Object Utilities

- [stash](./object/stash.md)
- [defaults](./object/defaults.md)
- [diff](./object/diff.md)
- [entries](./object/entries.md)
- [filterValues](./object/filterValues.md)
- [flattenPaths](./object/flattenPaths.md)
- [fromEntries](./object/fromEntries.md)
- [getOrCreate](./object/getOrCreate.md)
- [getPath](./object/path.md)
- [has](./object/has.md)
- [invert](./object/invert.md)
- [keys](./object/keys.md)
- [mapKeys](./object/mapKeys.md)
- [mapValues](./object/mapValues.md)
- [deepMerge and deepMergeWith](./object/merge.md)
- [pick](./object/pick.md)
- [omit](./object/omit.md)
- [parseJSON](./object/parseJSON.md)
- [prune](./object/prune.md)
- [stableStringify](./object/stableStringify.md)
- [values](./object/values.md)

## Related Examples

- [Array Examples](./array.md)
- [Async Examples](./async.md)
- [Typed Examples](./typed.md)
