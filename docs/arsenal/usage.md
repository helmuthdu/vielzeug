---
title: Arsenal — Usage Guide
description: Practical usage patterns for the current Arsenal API.
---

[[toc]]

## Basic Usage

### Named Imports (Recommended)

```ts
import { chunk, groupBy, indexBy, pick, retry } from '@vielzeug/arsenal';

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
import { filterMap, groupBy, indexBy, partition, search, sort, toggle, uniq, zip } from '@vielzeug/arsenal';

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

// Fuzzy search — filter mode returns matching items
const hits = search(users, 'alice', { threshold: 0.4 }); // User[]

// Scored mode returns items with similarity score, sorted best-first
const ranked = search(users, 'alice', { mode: 'scored' });
// [{ item: User, score: 0.91 }, ...]
```

### Objects

```ts
import { defaults, diff, getPath, parseJSON, pick, omit, mapValues, prune, stableStringify } from '@vielzeug/arsenal';

const prev = { api: { host: 'localhost', port: 3000 }, secure: undefined as boolean | undefined };
const curr = structuredClone(prev);

curr.api.port = 4000;

const withDefaults = defaults(curr, { secure: true });
const changes = diff(prev, curr); // { api: { port: 4000 } }

// Dot notation only — use 'api.port' not 'api["port"]'
const port = getPath(curr, 'api.port'); // 4000
const arr = getPath({ items: [10, 20] }, 'items.1'); // 20

const clean = prune({ a: 1, b: null, c: '' }); // { a: 1 }
const parsed = parseJSON('{"ok":true}', { defaultValue: { ok: false } });

const publicUser = pick({ id: 1, name: 'Alice', password: 'secret' }, ['id', 'name']);
const internalUser = omit({ id: 1, name: 'Alice', password: 'secret' }, ['password']);
const renamed = mapValues({ a: 1, b: 2 }, (value) => value * 10);

// Deterministic cache key from any value
const key = stableStringify({ sort: 'asc', filter: { role: 'admin' } });

console.log(withDefaults, changes, port, clean, parsed, publicUser, internalUser, renamed, key);
```

### Functions

```ts
import { assert, compose, debounce, memo, once, partial, pipe, runAll, throttle, allOf, noneOf, tap } from '@vielzeug/arsenal';

const doubleAll = partial((factor: number, values: number[]) => values.map((n) => n * factor), 2);
const doubled = doubleAll([1, 2, 3]); // [2, 4, 6]

const toUpperTrimmed = pipe(
  (s: string) => s.trim(),
  (s) => s.toUpperCase(),
);

const toUpperTrimmedRtl = compose(
  (s: string) => s.toUpperCase(),
  (s: string) => s.trim(),
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

// assert accepts a custom error class
assert(n >= 1, 'n must be at least 1', { type: RangeError });

// runAll runs all teardowns, collecting errors rather than stopping on the first
const cleanups = [() => a.dispose(), () => b.dispose()];
runAll(cleanups, { reverse: true });
```

### Async

```ts
import { parallel, queue, retry, sleep, waitFor, memo, exponentialBackoff } from '@vielzeug/arsenal';

const values = await parallel([1, 2, 3, 4], async (n) => n * 2, { limit: 3 });

const q = queue({ concurrency: 2 });
const a = q.add(() => fetch('/a').then((r) => r.text()));
const b = q.add(() => fetch('/b').then((r) => r.text()));
await q.onIdle();

// retry with per-attempt timeout and exponential backoff
await retry((signal) => fetch('/health', { signal }).then((r) => r.json()), {
  times: 4,
  timeout: 5_000,
  delay: (failureIndex) => exponentialBackoff(failureIndex),
  shouldRetry: (err, failureIndex) => {
    // failureIndex is 0-based: 0 = first failure, 1 = second, …
    // Not called on the final (exhausting) attempt.
    return failureIndex < 3 && !(err instanceof TypeError);
  },
});

await sleep(100);
await waitFor(() => document.querySelector('#app') !== null, { timeout: 3_000 });

const fetchJSON = memo((url: string) => fetch(url).then((r) => r.json()), { maxSize: 50 });
const payload = await fetchJSON('/api/profile');

await Promise.all([a, b]);
```

### Typed Predicates

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

const userCache = stash<User, readonly unknown[]>({
  hash: (key) => JSON.stringify(key),
  onEvict: (key, value) => console.log('evicted', key, value),
});

userCache.set(['user', 1], { id: 1, name: 'Alice' }, { ttlMs: 30_000 });
const alice = userCache.get(['user', 1]);

// getOrSet: caches the result including undefined — factory called only once per key
const data = await userCache.getOrSet(['user', 2], () => fetchUser(2));
// Concurrent calls share one in-flight Promise (stampede prevention)
```

### Stable cache keys

```ts
import { stableStringify } from '@vielzeug/arsenal';

// Consistent key regardless of object key insertion order
const key1 = stableStringify({ sort: 'asc', filter: { role: 'admin' } });
const key2 = stableStringify({ filter: { role: 'admin' }, sort: 'asc' });
key1 === key2; // true

// Handles Dates, Sets, Maps, bigints, null, undefined
stableStringify(new Set([3, 1, 2])); // '[Set:1,2,3]'
stableStringify(new Map([['b', 2], ['a', 1]])); // '[Map:"a"=>1,"b"=>2]'

// Class instances: String(instance) by default; throw with strict: true
stableStringify(new MyClass(), { strict: true }); // TypeError
```

### Fuzzy search with scoring

```ts
import { search } from '@vielzeug/arsenal';

const users = [
  { id: 1, name: 'Alice Smith', role: 'admin' },
  { id: 2, name: 'Alan Jones', role: 'user' },
  { id: 3, name: 'Bob Brown', role: 'user' },
];

// Filter mode: returns T[] above threshold
const filtered = search(users, 'alice', { threshold: 0.4 });

// Scored mode: returns ScoredResult<T>[] sorted by score descending
const ranked = search(users, 'ali', { mode: 'scored', threshold: 0.3 });
// [{ item: { id: 1, name: 'Alice Smith', ... }, score: 0.91 },
//  { item: { id: 2, name: 'Alan Jones',  ... }, score: 0.52 }]

// Restrict search to specific fields
const byName = search(users, 'ali', { fields: ['name'], mode: 'scored' });
```

### Memoization with LRU eviction

```ts
import { memo } from '@vielzeug/arsenal';

// LRU cache with max 100 entries and 60s TTL
const fetchUser = memo((id: number) => fetch(`/api/users/${id}`).then((r) => r.json()), {
  maxSize: 100,
  ttl: 60_000,
});

// Custom key for object arguments
const fetchPage = memo(
  (params: { page: number; size: number }) => fetch(`/api/items?page=${params.page}&size=${params.size}`),
  { key: ({ page, size }) => `${page}:${size}` },
);
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
  defaultValue: null,
});
```

### With Sourcerer

Use `search` and `sort` from arsenal as transform functions inside a `createLocalSource`.

```ts
import { search, sort } from '@vielzeug/arsenal';
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(users, {
  search: (items, query) => search(items, query),
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
- Use `getPath(obj, 'a.b.c')` for nested access — dot notation only; bracket notation (`a[0]`) throws a `TypeError`.
- Use `partial` when adapting multi-arg APIs to unary composition flows.
- For cancellation-aware async work, pass `AbortSignal` through your callback stack; use `isAbortError(err)` to distinguish cancellation from other errors.
- Use `queue` for explicit concurrency and `parallel` for bounded fan-out processing.
- Prefer `memo` over ad-hoc caching; supply a `key` function when arguments are objects. Use `maxSize` to bound memory usage.
- Use `stash` when you need TTL-based expiry, stampede prevention, or an eviction callback. It correctly caches `undefined` values.
- Use `stableStringify` to generate deterministic cache keys from complex option objects.
- `isMatch` supports plain objects and arrays only — do not pass `Map` or `Set` as the source argument.
- Use `isPlainObject` over the removed `isObject` for plain-object checks.
- Reuse debounced/throttled functions instead of recreating them per render.


### Named Imports (Recommended)

```ts
import { chunk, groupBy, indexBy, pick, retry } from '@vielzeug/arsenal';

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
import { filterMap, groupBy, indexBy, partition, sort, toggle, uniq, zip } from '@vielzeug/arsenal';

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

// newer helpers
const parts = partition([1, 2, 3, 4], (n) => n % 2 === 0); // [[2, 4], [1, 3]]
const zipped = zip(['a', 'b'], [1, 2]); // [['a', 1], ['b', 2]]
const byRole = groupBy([{ role: 'admin' }, { role: 'user' }], (item) => item.role);
const byId = indexBy([{ id: 1 }, { id: 2 }], (item) => item.id);
```

### Objects

```ts
import { deepClone, defaults, diff, get, prune, parseJSON, pick, omit, mapValues } from '@vielzeug/arsenal';

const prev = { api: { host: 'localhost', port: 3000 }, secure: undefined as boolean | undefined };
const curr = deepClone(prev);

curr.api.port = 4000;

const withDefaults = defaults(curr, { secure: true });
const changes = diff(prev, curr); // { api: { port: 4000 } }
const port = get(curr, 'api.port'); // 4000
const clean = prune({ a: 1, b: null, c: '' }); // { a: 1 }
const parsed = parseJSON('{\'ok\':\true}', { defaultValue: { ok: false } });

const publicUser = pick({ id: 1, name: 'Alice', password: 'secret' }, ['id', 'name']);
const internalUser = omit({ id: 1, name: 'Alice', password: 'secret' }, ['password']);
const renamed = mapValues({ a: 1, b: 2 }, (value) => value * 10);

console.log(withDefaults, changes, port, clean, parsed, publicUser, internalUser, renamed);
```

### Functions

```ts
import { compose, debounce, memo, once, partial, pipe, throttle, allOf, noneOf, tap } from '@vielzeug/arsenal';

const doubleAll = partial((factor: number, values: number[]) => values.map((n) => n * factor), 2);
const doubled = doubleAll([1, 2, 3]); // [2, 4, 6]

const toUpperTrimmed = pipe(
  (s: string) => s.trim(),
  (s) => s.toUpperCase(),
);

const toUpperTrimmedRtl = compose(
  (s: string) => s.toUpperCase(),
  (s: string) => s.trim(),
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
```

### Async

```ts
import { attempt, parallel, queue, retry, sleep, waitFor, timeout, memo } from '@vielzeug/arsenal';

const attempted = await attempt(
  async (signal) => {
    const res = await fetch('/api/user', { signal });
    return res.json();
  },
  { times: 2, timeout: 5_000 },
);

const values = await parallel([1, 2, 3, 4], async (n) => n * 2, { limit: 3 });

const q = queue({ concurrency: 2 });
const a = q.add(() => fetch('/a').then((r) => r.text()));
const b = q.add(() => fetch('/b').then((r) => r.text()));
await q.onIdle();

await retry(() => fetch('/health').then((r) => r.json()), { times: 3, delay: 200 });
await sleep(100);
await waitFor(() => document.querySelector('#app') !== null, { timeout: 3_000 });

const fetchJSON = memo((url: string) => fetch(url).then((r) => r.json()));
const payload = await timeout(fetchJSON('/api/profile'), 3_000);

await Promise.all([a, b]);
```

### Typed Namespace

```ts
import { is } from '@vielzeug/arsenal';

function normalize(input: unknown) {
  if (is.string(input)) return input.trim();
  if (is.number(input)) return String(input);
  if (is.array(input)) return input.length;
  if (is.nil(input)) return null;
  return input;
}

is.equal({ a: 1 }, { a: 1 }); // true
is.match({ a: 1, b: 2 }, { a: 1 }); // true
is.typeOf(new Date()); // 'date'
```

## Advanced Usage

### Scheduler + Queue

```ts
import { Scheduler, queue } from '@vielzeug/arsenal';

const scheduler = new Scheduler();
const q = queue({ concurrency: 1 });

void scheduler.postTask(() => q.add(() => fetch('/refresh')), {
  delay: 10_000,
  priority: 'background',
});
```

### Cache via stash

```ts
import { stash } from '@vielzeug/arsenal';

const cache = stash<string>({
  hash: (key) => JSON.stringify(key),
});

cache.set(['user', 1], 'Alice', { ttlMs: 5_000 });
const value = cache.get(['user', 1]);
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
  import { onDestroy } from 'svelte';

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
  defaultValue: null,
});
```

### With Sourcerer

Use `search` and `sort` from arsenal as the transform functions inside a `createLocalSource`.

```ts
import { search, sort } from '@vielzeug/arsenal';
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(users, {
  search: (items, query) => search(items, query),
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

## Best Practices

- Prefer named imports from `@vielzeug/arsenal`.
- `pick` selects object properties only (`pick(obj, keys)`).
- Use `partial` when adapting multi-arg APIs to unary composition flows.
- For cancellation-aware async work, pass `AbortSignal` through your callback stack.
- Use `createLocalSource` and `createRemoteSource` from `@vielzeug/sourcerer` for reactive paginated sources.
- Reuse debounced/throttled functions instead of recreating them per render.
- Use `queue` for explicit concurrency and `parallel` for bounded fan-out processing.
- Prefer `memo` over ad-hoc caching; supply a `key` function when arguments are objects.
- Prefer `is.match` for partial checks over repeated ad-hoc deep traversals.
