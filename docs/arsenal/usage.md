---
title: Arsenal — Usage Guide
description: Practical usage patterns for the current Arsenal API.
---

[[toc]]

## Basic Usage

### Named Imports (Recommended)

```ts
import { chunk, groupBy, indexBy, pick, retry } from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
];
const pages = chunk([1, 2, 3, 4, 5], 2);
const byRole = groupBy(users, (u) => u.role);
const byId = indexBy(users, (u) => u.id);
const user = pick({ id: 1, name: 'Alice', role: 'admin' }, ['id', 'name']);
const result = await retry(() => fetch('/api').then((r) => r.json()), { times: 2 });
```

### Namespace Import (Avoid)

```ts
// Avoid: imports everything and weakens tree-shaking
import * as arsenal from '@vielzeug/arsenal';
```

## Common Patterns

### Arrays

```ts
import {
  filterMap,
  fuzzy,
  fuzzyFilter,
  fuzzyScore,
  groupBy,
  indexBy,
  partition,
  sort,
  toggle,
  uniq,
  zip,
} from '@vielzeug/arsenal';

const values = [null, 1, 2, 3];

// filterMap maps values and skips undefined results
const mapped = filterMap(values, (n) => (n == null ? 0 : n * 2)); // [0, 2, 4, 6]

// return undefined to filter an item out
const filtered = filterMap(values, (n) => (n == null ? undefined : n)); // [1, 2, 3]

const sorted = sort(
  [
    { age: 30, name: 'Bob' },
    { age: 30, name: 'Alice' },
    { age: 25, name: 'Chris' },
  ],
  { age: 'desc', name: 'asc' },
);

const tags = toggle(['ts', 'node'], 'ts'); // ['node']
const deduped = uniq([1, 1, 2, 3]); // [1, 2, 3]

const parts = partition([1, 2, 3, 4], (n) => n % 2 === 0); // [[2, 4], [1, 3]]
const zipped = zip(['a', 'b'], [1, 2]); // [['a', 1], ['b', 2]]
const byRole = groupBy([{ role: 'admin' }, { role: 'user' }], (item) => item.role);
const byId = indexBy([{ id: 1 }, { id: 2 }], (item) => item.id);

// fuzzy() is the unified entry point — filter mode or scored mode
const roster = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];
const hits = fuzzy(roster, 'alice', { threshold: 0.4 }); // typeof roster[number][]
const ranked = fuzzy(roster, 'alice', { scored: true });
// [{ item: { id: 1, name: 'Alice' }, score: 0.91 }, ...]

// Lower-level variants are also exported
const filtered = fuzzyFilter(roster, 'alice', { threshold: 0.4 });
const scored = fuzzyScore(roster, 'alice');
```

### Objects

```ts
import { defaults, diff, getPath, hash, parseJSON, pick, omit, mapValues, prune } from '@vielzeug/arsenal';

const prev = { api: { host: 'localhost', port: 3000 }, secure: undefined as boolean | undefined };
const curr = structuredClone(prev);

curr.api.port = 4000;

const withDefaults = defaults(curr, { secure: true });
const changes = diff(prev, curr);
// { added: [], removed: [], changed: { api: { before: { ... }, after: { ... } } } }

// Bracket notation is auto-converted by default
const port = getPath(curr, 'api.port'); // 4000
const arr = getPath({ items: [10, 20] }, 'items[1]'); // 20
const safe = getPath(curr, 'api.missing', { fallback: 0 }); // 0

const clean = prune({ a: 1, b: null, c: '' }); // { a: 1 }
const parsed = parseJSON('{"ok":true}', { fallback: { ok: false } });

const publicUser = pick({ id: 1, name: 'Alice', password: 'secret' }, ['id', 'name']);
const internalUser = omit({ id: 1, name: 'Alice', password: 'secret' }, ['password']);
const renamed = mapValues({ a: 1, b: 2 }, (value) => value * 10);

// Deterministic cache key from any value
const key = hash({ sort: 'asc', filter: { role: 'admin' } });

console.log(withDefaults, changes, port, arr, safe, clean, parsed, publicUser, internalUser, renamed, key);
```

### Functions

```ts
import { assert, debounce, memo, once, pipe, runAll, throttle, allOf, noneOf, tap } from '@vielzeug/arsenal';

const toUpperTrimmed = pipe(
  (s: string) => s.trim(),
  (s) => s.toUpperCase(),
);

const loadOnce = once(() => initApp());
const expensive = memo((a: number, b: number) => a * b);
const onInput = debounce((q: string) => console.log(q), 300);
const onScroll = throttle(() => console.log(window.scrollY), 100);
const isWorkingAge = allOf<number>(
  (age) => age >= 18,
  (age) => age < 65,
);
const odds = [1, 2, 3, 4, 5].filter(noneOf((n: number) => n % 2 === 0));
const value = tap(42, (n) => console.log('debug', n));

// assert narrows the type and accepts a custom error class
assert(n >= 1, 'n must be at least 1', { type: RangeError });

// runAll runs all teardowns, collecting errors rather than stopping on the first
const cleanups = [() => a.dispose(), () => b.dispose()];
runAll(cleanups, { reverse: true });
```

### Async

```ts
import { parallel, queue, retry, sleep, stash, waitFor, backoff } from '@vielzeug/arsenal';

const values = await parallel([1, 2, 3, 4], async (n) => n * 2, { limit: 3 });

const q = queue({ concurrency: 2 });
const a = q.add(() => fetch('/a').then((r) => r.text()));
const b = q.add(() => fetch('/b').then((r) => r.text()));
await q.onIdle();

// retry with per-attempt timeout and exponential backoff
await retry((signal) => fetch('/health', { signal }).then((r) => r.json()), {
  times: 4,
  timeout: 5_000,
  delay: (failureIndex) => backoff(failureIndex),
  shouldRetry: (err, failureIndex) => {
    // failureIndex is 0-based: 0 = first failure, 1 = second, …
    // Not called on the final (exhausting) attempt.
    return failureIndex < 3 && !(err instanceof TypeError);
  },
});

await sleep(100);
await waitFor(() => document.querySelector('#app') !== null, { timeout: 3_000 });

// memo only accepts sync functions — use stash.getOrSet for async caching
const apiCache = stash<unknown>({ ttlMs: 60_000 });
const payload = await apiCache.getOrSet('/api/profile', () => fetch('/api/profile').then((r) => r.json()));

await Promise.all([a, b]);
```

### Math

```ts
import { backoff, clamp, lerp, normalize, percent, range, round } from '@vielzeug/arsenal';

// Clamp keeps a value within bounds
clamp(150, 0, 100); // 100
clamp(-10, 0, 100); // 0

// Linear interpolation: t=0 → a, t=1 → b, t=0.5 → midpoint
lerp(0, 100, 0.25); // 25

// Normalize maps a value into 0–1 relative to a range
normalize(75, 0, 100); // 0.75

// range generates index arrays without mutation
range(5); // [0, 1, 2, 3, 4]
range(1, 6); // [1, 2, 3, 4, 5]
range(0, 10, 2); // [0, 2, 4, 6, 8]

// round to N decimal places
round(3.14159, 2); // 3.14

// percent: what % is value of total?
percent(1, 4); // 25

// backoff computes exponential delay for retry loops
// min(1000 × 2ⁿ, maxMs) — multiply by Math.random() for full jitter
backoff(0); // 1000
backoff(1); // 2000
backoff(2); // 4000
backoff(3, 5_000); // 5000 (capped — custom ceiling overrides the 30 000 default)
```

## Typed Predicates

All typed predicates are standalone named exports — there is no `is` namespace.

```ts
import {
  isAbortError,
  isDefined,
  isEmpty,
  isEqual,
  isMatch,
  isNil,
  isNumber,
  isPlainObject,
  isString,
} from '@vielzeug/arsenal';

function normalize(input: unknown) {
  if (isString(input)) return input.trim();
  if (isNumber(input)) return String(input);
  if (Array.isArray(input)) return input.length;
  if (isNil(input)) return null;
  return input;
}

isEqual({ a: 1 }, { a: 1 }); // true — deep equality
isEqual({ a: 1 }, { a: 1 }, { depth: 'shallow' }); // false — different references

// isMatch: partial structural check — plain objects and arrays only
isMatch({ a: 1, b: 2 }, { a: 1 }); // true
isMatch({ a: 1 }, new Map([['a', 1]])); // false — Map sources are never matched

// isPlainObject: true for {} and Object.create(null); false for class instances, Map, Set, Array
isPlainObject({}); // true
isPlainObject(new Map()); // false

try {
  await fetch(url, { signal });
} catch (err) {
  if (isAbortError(err)) return; // request was cancelled — ignore
  throw err;
}
```

## Advanced Usage

### Cache via stash

```ts
import { stash } from '@vielzeug/arsenal';

// Simple string cache — no options needed for string keys
const sessionCache = stash<User>();
sessionCache.set('user:1', { id: 1, name: 'Alice' }, { ttlMs: 30_000 });
const alice = sessionCache.get('user:1');

// Custom key type — provide a hash function for non-string keys
const userCache = stash<User, readonly unknown[]>({
  hash: (key) => JSON.stringify(key),
  maxSize: 500, // FIFO eviction when exceeded
  onEvict: (key, value) => console.log('evicted', key, value),
  ttlMs: 60_000, // global default TTL
});

// getOrSet: caches the result including undefined — factory called only once per key
const data = await userCache.getOrSet(['user', 2], () => fetchUser(2));
// Concurrent calls share one in-flight Promise (stampede prevention)
```

### Stable cache keys

```ts
import { hash } from '@vielzeug/arsenal';

// Consistent key regardless of object key insertion order
const key1 = hash({ sort: 'asc', filter: { role: 'admin' } });
const key2 = hash({ filter: { role: 'admin' }, sort: 'asc' });
key1 === key2; // true

// Handles Dates, Sets, Maps, bigints, null, undefined
hash(new Set([3, 1, 2])); // '[Set:1,2,3]'
hash(
  new Map([
    ['b', 2],
    ['a', 1],
  ]),
); // '[Map:"a"=>1,"b"=>2]'

// Class instances: String(instance) by default; throw with onClassInstance: 'throw'
hash(new MyClass(), { onClassInstance: 'throw' }); // ArsenalSerializationError
```

### Fuzzy search with scoring

```ts
import { fuzzy } from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice Smith', role: 'admin' },
  { id: 2, name: 'Alan Jones', role: 'user' },
  { id: 3, name: 'Bob Brown', role: 'user' },
];

// Filter mode — returns T[] in original order
const filtered = fuzzy(users, 'alice', { threshold: 0.4 });

// Scored mode — returns ScoredResult<T>[] sorted by score descending
const ranked = fuzzy(users, 'ali', { scored: true, threshold: 0.3 });
// [{ item: { id: 1, name: 'Alice Smith', ... }, score: 0.91 },
//  { item: { id: 2, name: 'Alan Jones',  ... }, score: 0.52 }]

// Restrict search to specific fields
const byName = fuzzy(users, 'ali', { fields: ['name'], scored: true });
```

### Memoization with LRU eviction

```ts
import { memo, stash } from '@vielzeug/arsenal';

// LRU cache with max 100 entries
const computeScore = memo((id: number, weight: number) => id * weight, { maxSize: 100 });

// Custom key for object arguments
const formatLabel = memo((params: { page: number; size: number }) => `Page ${params.page} of ${params.size}`, {
  key: ({ page, size }) => `${page}:${size}`,
});

// memo only accepts sync functions — use stash.getOrSet for async caching with TTL
const apiCache = stash<unknown>({ ttlMs: 60_000 });
const data = await apiCache.getOrSet('user:1', () => fetch('/api/users/1').then((r) => r.json()));
```

## Framework Integration

::: code-group

```tsx [React]
import { debounce, filterMap } from '@vielzeug/arsenal';
import { useMemo } from 'react';

// Stable debounced handler — recreated only once
const onSearch = useMemo(() => debounce((q: string) => console.log(q), 250), []);
const visible = useMemo(() => filterMap(data, (item) => (item.hidden ? undefined : item)), [data]);
```

```ts [Vue 3]
import { computed, ref } from 'vue';
import { groupBy } from '@vielzeug/arsenal';

const users = ref<User[]>([]);
const byRole = computed(() => groupBy(users.value, (u) => u.role));
```

```svelte [Svelte]
<script lang="ts">
  import { groupBy } from '@vielzeug/arsenal';

  export let users: User[] = [];
  $: byRole = groupBy(users, (u) => u.role);
</script>
```

:::

## Working with Other Vielzeug Libraries

### With Spell

Use `parseJSON` from arsenal together with `s` schemas from Spell to parse and validate in one step.

```ts
import { parseJSON } from '@vielzeug/arsenal';
import { s } from '@vielzeug/spell';

const UserSchema = s.object({ id: s.number(), name: s.string() });
const raw = localStorage.getItem('user');
const user = parseJSON(raw, {
  validator: (v) => UserSchema.safeParse(v).ok,
  fallback: null,
});
```

### With Sourcerer

Use `fuzzy` and `sort` from arsenal as transform functions inside a `createLocalSource`.

```ts
import { fuzzy, sort } from '@vielzeug/arsenal';
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(users, {
  search: (items, query) => fuzzy(items, query),
  sort: (items, key, dir) => sort(items, { [key]: dir }),
});
```

### With Tempo

Date utilities (`expires`, `timeDiff`, `dateRange`) are in `@vielzeug/tempo`.

```ts
import { expires, timeDiff } from '@vielzeug/tempo';

const status = expires(token.expiresAt, 3); // 'SOON' | 'EXPIRED' | 'LATER' | 'NEVER'
const { value, unit } = timeDiff(token.issuedAt); // e.g. { value: 2, unit: 'day' }
```

### With Coins

Money formatting and currency conversion have moved to `@vielzeug/coins`.

```ts
import { currency, exchange } from '@vielzeug/coins';

const price = currency({ amount: 123456n, currency: 'USD' }); // $1,234.56
```

## Best Practices

- Prefer named imports from `@vielzeug/arsenal`.
- Use `getPath(obj, 'a.b.c')` for nested access. Bracket notation (`a[0]`) is auto-converted to dot notation by default; pass `{ bracketNotation: false }` to throw on bracket syntax instead.
- For cancellation-aware async work, pass `AbortSignal` through your callback stack; use `isAbortError(err)` to distinguish cancellation from other errors.
- Use `queue` for explicit concurrency and `parallel` for bounded fan-out processing.
- Prefer `memo` over ad-hoc caching; supply a `key` function when arguments are objects. Use `maxSize` to bound memory usage.
- Use `stash` when you need TTL-based expiry, stampede prevention, or an eviction callback. It correctly caches `undefined` values.
- Use `stringify` to generate deterministic cache keys from complex option objects.
- `isMatch` supports plain objects and arrays only — do not pass `Map` or `Set` as the source argument.
- Use `isPlainObject` for plain-object checks; it returns `false` for class instances, `Map`, `Set`, and arrays.
- Reuse debounced/throttled functions instead of recreating them per render.
