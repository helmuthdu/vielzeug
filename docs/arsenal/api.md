---
title: Arsenal — API Reference
description: Complete API reference for Arsenal.
---

[[toc]]

## API At a Glance

<!-- markdownlint-disable MD060 -->

| Symbol                                  | Purpose                                                           | Execution | Common gotcha                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `chunk(input, size?)`                   | Split array or string into pages                                  | Sync      | Returns `string[]` for string input, `T[][]` for arrays                                                  |
| `filterMap(array, fn)`                  | Map + filter in one pass, skipping `undefined`                    | Sync      | Return `undefined` to drop an item; `null` is kept                                                       |
| `groupBy(array, selector)`              | Group items into a record by key                                  | Sync      | Key must be a `PropertyKey`                                                                              |
| `fuzzyFilter(array, query, options?)`   | Filter array by fuzzy string similarity                           | Sync      | Returns `T[]`; empty query returns all items unchanged                                                   |
| `fuzzyScore(array, query, options?)`    | Score and rank array items by similarity                          | Sync      | Returns `ScoredResult<T>[]` sorted by score descending; empty query returns all at score `1`             |
| `sort(array, selectors)`                | Multi-key sort without mutation                                   | Sync      | Pass an object `{ key: 'asc' }` or a comparator                                                         |
| `uniq(array, selector?)`                | Deduplicate by value or key                                       | Sync      | Uses deep equality without a selector                                                                    |
| `parallel(array, fn, options?)`         | Bounded async fan-out                                             | Async     | `limit` defaults to unbounded                                                                            |
| `queue(options?)`                       | Serialise async jobs with concurrency cap                         | Async     | `.onIdle()` resolves when queue drains; `.onSettled(cb)` subscribes to all task completions              |
| `attempt(fn)`                           | Run a sync or async fn and return `AttemptResult` — never throws  | Both      | Use `isOk(r)` / `isFail(r)` to narrow the result type                                                   |
| `retry(fn, options?)`                   | Retry a throwing async function with timeout and signal           | Async     | Rethrows on exhaustion; `shouldRetry` receives `(error, failureIndex)` — not called on the final attempt |
| `allOf(...predicates)`                  | AND combinator — all must pass                                    | Sync      | Zero predicates → vacuous truth (always `true`)                                                          |
| `anyOf(...predicates)`                  | OR combinator — at least one must pass                            | Sync      | Zero predicates → vacuous falsity (always `false`)                                                       |
| `noneOf(...predicates)`                 | NOR combinator — none must pass                                   | Sync      | Single predicate is equivalent to logical NOT                                                            |
| `debounce(fn, delay?, options?)`        | Delay execution until input settles (trailing by default)         | Sync      | Returns `.cancel()`, `.flush()`, `.pending()`; reuse the returned function across renders                |
| `memo(fn, options?)`                    | Memoize a **sync** function with optional LRU size cap            | Sync      | Does **not** accept async functions; use `stash.getOrSet` for async caching                              |
| `assert(condition, message?, options?)` | Throw if condition is falsy; narrows type via `asserts condition` | Sync      | Accepts `{ type: ErrorConstructor }` for custom error class                                              |
| `diff(before?, after?)`                 | Structural diff between two objects                               | Sync      | Returns `DiffResult` with `added`, `removed`, `changed` arrays — no sentinel symbols                                                                |
| `parseJSON(json, options?)`             | Safe JSON parse with fallback                                     | Sync      | Accepts `string \| null \| undefined`; returns `undefined` on failure                                   |
| `stash(options?)`                       | TTL-aware key-value cache with stampede prevention                | Sync      | `undefined` is a valid cached value — `getOrSet` will not re-invoke the factory                          |
| `hash(value, options?)`                 | Deterministic JSON-like string for any value                      | Sync      | Pass `{ onClassInstance: 'throw' }` to throw on class instances instead of coercing to `String()`        |
| `getPath(item, path, options?)`         | Nested dot-notation access                                        | Sync      | Bracket notation auto-converted by default; pass `{ bracketNotation: false }` to throw instead           |
| `deepMerge(...items)`                   | Recursive object merge                                            | Sync      | Arrays are replaced by default; pass `{ arrayStrategy: 'concat' }` as last arg to concatenate            |
| `isMatch(object, source)`               | Partial deep structural comparison                                | Sync      | `Map` and `Set` sources are never matched — use `isEqual` for those                                      |
| `isEqual(a, b, options?)`               | Deep or shallow equality                                          | Sync      | `depth: 'shallow'` compares one level by reference                                                       |
| `backoff(attempt, maxMs?)`              | Compute exponential backoff delay for retry loops                 | Async     | Default cap `30 000 ms`; multiply by `Math.random()` for full-jitter                                     |

<!-- markdownlint-enable MD060 -->

## Package Entry Points

| Import                       | Purpose                                                |
| ---------------------------- | ------------------------------------------------------ |
| `@vielzeug/arsenal`          | All public exports                                     |
| `@vielzeug/arsenal/array`    | Array utilities only                                   |
| `@vielzeug/arsenal/async`    | Async utilities only                                   |
| `@vielzeug/arsenal/cache`    | `memo` and `stash`                                     |
| `@vielzeug/arsenal/function` | `debounce`, `throttle`, `pipe`, `assert`, and more     |
| `@vielzeug/arsenal/guards`   | Typed predicates and combinators (`allOf`, `anyOf`, …) |
| `@vielzeug/arsenal/math`     | Math utilities only                                    |
| `@vielzeug/arsenal/object`   | `deepMerge`, `diff`, `getPath`, `parseJSON`, `hash`, and more |
| `@vielzeug/arsenal/random`   | `draw`, `random`, `shuffle`, `uuid`                    |
| `@vielzeug/arsenal/string`   | String utilities only                                  |

## Array

- `chunk(input, size?)` — splits array or string into chunks of `size` (default: `1`)
- `compact(array)` — removes falsy values (`false`, `0`, `''`, `null`, `undefined`, `NaN`)
- `compare(a, b)` — general-purpose comparator (numbers, strings, dates); string comparison uses `localeCompare`
- `compareBy(selectors)` — multi-key comparator factory
- `contains(array, value)` — `true` if array contains `value` using deep equality
- `countBy(array, selector)` — group items and count occurrences per key
- `difference(source, other, selector?)` — items in `source` not in `other`
- `drop(array, n?)` — remove first `n` elements (default: 1)
- `dropLast(array, n?)` — remove last `n` elements (default: 1)
- `filterMap(array, callback)` — map + filter; return `undefined` to skip an item (`null` is kept)
- `first(array, fallback?)` — first element or `fallback`
- `flatten(array, depth?)` — flatten nested arrays; default depth `1`
- `fuzzy(array, query, options?)` — see [fuzzy / fuzzyFilter / fuzzyScore](#fuzzy--fuzzyfilter--fuzzyscore)
- `fuzzyFilter(array, query, options?)` — see [fuzzy / fuzzyFilter / fuzzyScore](#fuzzy--fuzzyfilter--fuzzyscore)
- `fuzzyScore(array, query, options?)` — see [fuzzy / fuzzyFilter / fuzzyScore](#fuzzy--fuzzyfilter--fuzzyscore)
- `groupBy(array, selector)` — group items into a record by key
- `indexBy(array, selector)` — index items into a map by key (last value wins on collision)
- `intersection(source, other, selector?)` — items in both arrays
- `last(array, fallback?)` — last element or `fallback`
- `partition(array, predicate)` — split into `[truthy, falsy]` tuples
- `replace(array, predicate, value)` — replace first item matching predicate
- `rotate(array, positions, options?)` — shift elements left or right
- `sample(array, n)` — random `n` items without replacement
- `sort(array, selectorOrSelectors, direction?)` — multi-key sort; does not mutate
- `take(array, n?)` — first `n` elements (default: 1)
- `takeLast(array, n?)` — last `n` elements (default: 1)
- `toggle(array, item, selector?, options?)` — add if absent, remove if present
- `union(source, other, selector?)` — unique items from both arrays
- `uniq(array, selector?)` — deduplicate; uses deep equality without selector
- `unzip(rows)` — transpose an array of tuples
- `zip(...arrays)` — combine arrays into tuples

### fuzzy / fuzzyFilter / fuzzyScore

```ts
// Unified entry point — prefer this over the lower-level functions
fuzzy<T>(array: T[], query: string, options: FuzzyOptions<T> & { scored: true }): ScoredResult<T>[]
fuzzy<T>(array: T[], query: string, options?: FuzzyOptions<T> & { scored?: false }): T[]

// Lower-level variants (also exported)
fuzzyFilter<T>(array: T[], query: string, options?: FuzzyOptions<T>): T[]
fuzzyScore<T>(array: T[], query: string, options?: FuzzyOptions<T>): ScoredResult<T>[]

type FuzzyOptions<T> = {
  fields?: ReadonlyArray<keyof T & string>; // limit to specific object keys; searches all values when omitted
  normalize?: boolean;                      // NFKD Unicode normalization — 'café' matches 'cafe'; default: false
  threshold?: number;                       // 0–1 similarity cutoff; default: 0.25
  // Note: scored is NOT a field on FuzzyOptions — it is only accepted by the fuzzy() overload call site
};

type ScoredResult<T> = { item: T; score: number };
```

- `fuzzy(arr, q)` returns `T[]` (filter mode); `fuzzy(arr, q, { scored: true })` returns `ScoredResult<T>[]`.
- `fuzzyFilter` preserves array order; returns items whose best-field score meets `threshold`.
- `fuzzyScore` returns items above `threshold`, sorted by score descending. Empty query returns all items at score `1`.
- Nested object traversal is limited to **10 levels**. Values beyond that depth are skipped.

---

## Async

- `abortError(signal?)` — constructs a `DOMException('AbortError')` or extracts the reason from `signal.reason`
- `attempt(fn)` — wrap a **sync or async** function; returns `AttemptResult` — never throws; use `isOk(result)` / `isFail(result)` to narrow
- `backoff(attempt, maxMs?)` — `min(1000 × 2ⁿ, maxMs)`; default cap `30_000 ms`; multiply by `Math.random()` for full jitter
- `isOk(result)` — type guard: narrows `AttemptResult<T>` to `{ ok: true; value: T }`
- `isFail(result)` — type guard: narrows `AttemptResult<T>` to `{ ok: false; error: unknown }`
- `parallel(array, callback, options?)` — bounded concurrent fan-out; `options.limit` caps concurrency
- `queue(options?)` — see [queue](#queue)
- `retry(fn, options?)` — see [retry](#retry)
- `sleep(ms, signal?)` — delay that resolves after `ms` or rejects when `signal` fires
- `waitFor(condition, options?)` — poll until `condition()` returns `true` or timeout fires

### queue

```ts
queue(options?: { concurrency?: number }): Queue

interface Queue {
  add<T>(fn: () => Promise<T>, options?: { priority?: number }): Promise<T>;
  clear(reason?: unknown): void;
  onIdle(): Promise<void>;
  onSettled<T>(cb: QueueSettledCallback<T>): () => void;
  readonly active: number;  // running tasks
  readonly pending: number; // queued tasks
  readonly size: number;    // active + pending
}

// onSettled uses the shared AttemptResult type
type QueueSettledCallback<T = unknown> = (result: AttemptResult<T>) => void;
```

- `concurrency` defaults to `1`.
- `add()` accepts `{ priority?: number }` — higher numbers run first; equal-priority tasks run FIFO.
- `clear(reason?)` rejects all pending tasks; running tasks are unaffected.
- `onSettled(cb)` fires once per settled task with an `AttemptResult`; returns an unsubscribe function.
- `onIdle()` resolves when both `active` and `pending` reach zero.

### retry

```ts
retry(
  fn: (signal?: AbortSignal) => Promise<T>,
  options?: {
    times?: number;           // total attempts; default: 3
    delay?: number | ((failureIndex: number) => number); // ms between retries; default: 250
    timeout?: number;         // per-attempt timeout in ms
    signal?: AbortSignal;     // external cancellation
    shouldRetry?: (error: unknown, failureIndex: number) => boolean;
    // failureIndex is 0-based; NOT called on the final exhausting attempt
    onError?: (error: unknown) => void; // called on exhaustion and when shouldRetry returns false
  },
): Promise<T>
```

---

## Cache

### memo

```ts
memo<T extends Fn>(fn: SyncFn<T>, options?: MemoOptions<T>): Memoized<T>

type MemoOptions<T extends Fn> = {
  key?: (...args: Parameters<T>) => PropertyKey; // custom cache key; defaults to JSON.stringify(args)
  maxSize?: number;                              // LRU eviction when exceeded; default: Infinity
};

type Memoized<T extends Fn> = ((...args: Parameters<T>) => ReturnType<T>) & {
  clear(): void;
  invalidate(...args: Parameters<T>): void;
  readonly size: number;
};
```

**`memo` only accepts sync functions.** Passing an async function is a compile-time error. Use `stash.getOrSet` for async caching with TTL and stampede prevention.

### stash

```ts
stash<T, K = string>(options?: CacheOptions<K, T>): Stash<T, K>

type CacheOptions<K = string, T = unknown> = {
  hash?: (key: K) => string;  // defaults to String(key) — override for object keys
  maxSize?: number;           // FIFO eviction when exceeded; default: Infinity
  onEvict?: (key: K, value: T) => void;
  persistence?: CachePersistence<T>; // serialization pair for persistent caches
  ttlMs?: number;                    // global default TTL; overridable per set() call
};

type CachePersistence<T> = {
  serialize: (value: T) => string;   // called in set()
  deserialize: (raw: string) => T;   // called in get() / entries()
};

type Stash<T, K = string> = {
  get(key: K): T | undefined;
  set(key: K, value: T, options?: CacheSetOptions): void;
  delete(key: K): boolean;
  clear(): void;
  entries(): IterableIterator<[K, T]>;
  // Sync factory — caches result (including undefined); factory called only once per key
  getOrSet(key: K, factory: () => T, options?: CacheSetOptions): T;
  // Async factory — concurrent callers share one in-flight Promise (stampede prevention)
  getOrSet(key: K, factory: () => Promise<T>, options?: CacheSetOptions): Promise<T>;
  readonly size: number;
};

type CacheSetOptions = {
  forceRefresh?: boolean; // skip cache and in-flight; always calls factory
  ttlMs?: number;         // override global ttlMs for this entry
};
```

- `undefined` is a valid cached value — `getOrSet` returns it without calling the factory again.
- `delete()` during an in-flight `getOrSet` prevents the resolved value from writing to the cache; callers already awaiting still receive the value.
- `clear()` increments an internal generation counter so in-flight results from the previous generation are discarded.
- `persistence.serialize` and `persistence.deserialize` must both be present; providing a partial object is a TypeScript error.

---

## Function

- `allOf(...predicates)` — AND combinator; zero predicates → always `true`
- `anyOf(...predicates)` — OR combinator; zero predicates → always `false`
- `assert(condition, message?, options?)` — throws if `condition` is falsy; narrows via `asserts condition`; `options.type` sets the error constructor (e.g. `RangeError`)
- `constant(value)` — returns a function that always returns `value`
- `debounce(fn, delay?, options?)` — **trailing-only by default** (`{ leading: false, trailing: true }`); returns `.cancel()`, `.flush()`, `.pending()`; calling the function returns `ReturnType<T> | undefined`
- `identity(value)` — returns its argument unchanged
- `memo(fn, options?)` — see [Cache → memo](#memo)
- `noneOf(...predicates)` — NOR combinator
- `not(predicate)` — negates a single predicate; prefer over `noneOf` for single-predicate negation
- `once(fn)` — run once; `.reset()` allows re-invocation
- `pipe(...fns)` — left-to-right function composition; zero args returns identity `<T>(x: T) => T`
- `runAll(fns, options?)` — run all functions; errors are collected into `AggregateError`, not thrown individually; `{ reverse: true }` runs in reverse order
- `tap(value, callback)` — call `callback(value)` for side effects and return `value` unchanged
- `throttle(fn, delay?, options?)` — **leading-only by default** (`{ leading: true, trailing: false }`); returns `.cancel()`, `.flush()`, `.pending()`

> **Note:** `allOf`, `anyOf`, and `noneOf` are also exported from `@vielzeug/arsenal/guards` and re-exported from the root package.

## Math

- `abs(value)`
- `allocate(amount, ratiosOrParts)`
- `average(array, callback?)`
- `clamp(n, min, max)`
- `gcd(a, b)`
- `lcm(a, b)`
- `lerp(a, b, t)`
- `linspace(start, end, steps?)`
- `max(array, callback?)`
- `median(array, callback?)`
- `min(array, callback?)`
- `mod(a, b)` — sign-correct modulo (result always has the sign of the divisor)
- `normalize(value, min, max)` — maps `value` to `0–1` relative to range; clamps
- `percent(value, total)`
- `range(stop)` / `range(start, stop)` / `range(start, stop, step)`
- `round(value, precision?, parser?)`
- `standardDeviation(array, callback?)`
- `sum(array, callback?)`
- `variance(array, callback?)`

## Object

- `defaults(target, ...sources)` — fills `undefined` keys from sources; first source wins
- `diff(before?, after?, compareFn?)` — see [diff](#diff)
- `diffArrays(before, after, options?)` — see [diffArrays](#diffarrays)
- `deepMerge(...items)` — recursive merge; arrays replaced by default; see [deepMerge](#deepmerge--shallowmerge)
- `shallowMerge(...items)` — one-level `Object.assign`-style merge; variadic: `shallowMerge(a, b, c)`
- `filterValues(obj, predicate)` — keep only entries where predicate returns `true`
- `invert(obj)` — swap keys and values
- `mapKeys(obj, mapper)` — transform all keys
- `mapValues(obj, mapper)` — transform all values
- `omit(obj, keys)` — return object without specified keys
- `pick(obj, keys)` — return object with only specified keys
- `prune(value)` — recursively remove null, undefined, empty strings, empty objects/arrays

### diff

```ts
diff<T extends Obj>(
  before?: T,
  after?: T,
  compareFn?: (a: unknown, b: unknown) => boolean,
): DiffResult<T>

type DiffResult<T> = {
  added: Array<keyof T & string>;                              // keys in after but not before
  removed: Array<keyof T & string>;                            // keys in before but not after
  changed: { [K in keyof T]?: { before: T[K]; after: T[K] } }; // keys present in both with differing values
};
```

Computes the structural difference between two plain objects. Both arguments default to `{}`. The custom `compareFn` defaults to deep `isEqual`.

```ts
diff({ a: 1, b: 2, c: 3 }, { a: 1, b: 99 });
// { added: [], removed: ['c'], changed: { b: { before: 2, after: 99 } } }
```

### deepMerge / shallowMerge

```ts
deepMerge<T extends Obj[]>(...items: [...T] | [...T, DeepMergeOptions]): Merge<T>
shallowMerge<T extends Obj[]>(...items: [...T]): Merge<T>

type DeepMergeOptions = { arrayStrategy?: 'concat' | 'replace' }; // default: 'replace'
```

- Both functions are **variadic** — pass any number of objects as positional arguments.
- `deepMerge` accepts an optional `DeepMergeOptions` as the **last** argument, detected only when it is a single-key object `{ arrayStrategy: 'concat' | 'replace' }`.
- Prototype pollution is prevented: `__proto__`, `constructor`, and `prototype` keys are silently skipped.

```ts
deepMerge({ a: { x: 1 } }, { a: { y: 2 } });                           // { a: { x: 1, y: 2 } }
deepMerge({ tags: ['a'] }, { tags: ['b'] }, { arrayStrategy: 'concat' }); // { tags: ['a', 'b'] }
shallowMerge({ a: 1 }, { b: 2 }, { c: 3 });                             // { a: 1, b: 2, c: 3 }
```

### diffArrays

```ts
diffArrays<T>(before: T[], after: T[], options?: ArrayDiffOptions<T>): ArrayDiff<T>

type ArrayDiffOptions<T> = {
  compareFn?: (a: T, b: T) => boolean; // default: deep equality
};

type ArrayDiff<T> = { added: T[]; removed: T[] };
```

Order-independent set-difference. Items in `after` not in `before` → `added`; items in `before` not in `after` → `removed`.

### getPath / flattenPaths / unflattenPaths

```ts
getPath<T, P extends string>(item: T, path: P, options?: GetPathOptions): PathValue<T, P> | undefined

type GetPathOptions = {
  bracketNotation?: boolean; // auto-convert a[0].b → a.0.b; default: true
  fallback?: unknown;        // returned when path is missing or resolves to undefined
  strict?: boolean;          // throw Error if any segment is missing; default: false
};
```

- Bracket notation is **auto-converted by default** (`a[0].b` → `a.0.b`). Pass `{ bracketNotation: false }` to throw a `TypeError` on bracket syntax.
- Unsafe path segments (`__proto__`, `constructor`, `prototype`) return `options.fallback` silently.
- `strict` takes precedence over `fallback` when both are set.

```ts
const obj = { a: { b: { c: 3 } }, d: [1, 2, 3] };

getPath(obj, 'a.b.c');                               // 3
getPath(obj, 'a.b.x', { fallback: 'fallback' });     // 'fallback'
getPath(obj, 'd[1]');                                // 2  (bracket auto-converted)
getPath(obj, 'e.f.g', { strict: true });             // throws Error
getPath(obj, 'a[0]', { bracketNotation: false });    // throws TypeError
```

```ts
flattenPaths(obj: Record<string, unknown>): Record<string, unknown>
unflattenPaths(flat: Record<string, unknown>): Record<string, unknown>
```

- `flattenPaths` flattens nested objects to `{ 'a.b': value }` maps. Nesting beyond 10 levels is treated as an opaque leaf. Unsafe path segments are silently skipped.
- `unflattenPaths` reconstructs nested objects from dot-notation flat maps. Unsafe segments are silently skipped.

### parseJSON / hash

```ts
parseJSON<T>(json: string | null | undefined, options?: ParseJSONOptions<T>): T | undefined

type ParseJSONOptions<T> = {
  fallback?: T;
  reviver?: (key: string, value: unknown) => unknown;
  validator?: (parsed: unknown) => boolean;
};
```

- `null`/`undefined` input → `fallback`; invalid JSON → `fallback`.
- The JSON string `"null"` returns `null` (not `fallback`).
- `validator` receives the parsed value; returning `false` falls back to `fallback`.

```ts
hash(value: unknown, options?: HashOptions): string

type HashOptions = {
  onClassInstance?: 'coerce' | 'throw'; // default: 'coerce' — calls String(value)
};
```

Produces a deterministic, order-independent JSON-like string. Object keys are sorted alphabetically. Handles `Date`, `RegExp`, `Set`, `Map`, and `bigint`. Circular references produce `'[Circular]'`.

```ts
hash({ b: 2, a: 1 })                            // '{"a":1,"b":2}'
hash([3, 1, 2])                                  // '[3,1,2]'
hash(new Date('2024-01-01T00:00:00Z'))            // '[Date:2024-01-01T00:00:00.000Z]'
hash(new Set([3, 1, 2]))                          // '[Set:1,2,3]'
hash(new Map([['b', 2], ['a', 1]]))               // '[Map:"a"=>1,"b"=>2]'
hash(42n)                                         // '42n'
hash(new MyClass())                               // String(instance) by default
hash(new MyClass(), { onClassInstance: 'throw' }) // throws TypeError
const o: Record<string, unknown> = { x: 1 }; o.self = o;
hash(o)                                           // '{"self":[Circular],"x":1}'
```

## Random

- `draw(array)` — pick one element at random; returns `undefined` for empty arrays
- `random(min, max)` — random float in `[min, max]`
- `shuffle(array)` — Fisher-Yates shuffle; returns a new array
- `uuid()` — `crypto.randomUUID()` wrapper

## String

- `camelCase(str)`
- `endsWith(value, suffix)`
- `escape(value)` — HTML-escape `& < > " '`
- `kebabCase(str)`
- `pad(str, targetLength, fillString?)`
- `pascalCase(str)`
- `similarity(str1, str2)` — 0–1 Levenshtein similarity; throws `RangeError` if either input exceeds 10 000 characters
- `snakeCase(str)`
- `startsWith(value, prefix)`
- `titleCase(str)`
- `truncate(str, limit?, options?)`
- `unescape(value)` — reverse HTML escape
- `words(str)` — split into word tokens

## Guards / Typed Predicates

All predicates are standalone named exports. There is no `is` namespace.

- `isAbortError(value)` — `Error` with `name === 'AbortError'`
- `isArray(value, itemGuard?)` — optionally narrows item type when `itemGuard` is provided
- `isBoolean(value)`
- `isDate(value)`
- `isDefined(value)` — not `undefined`
- `isEmpty(value)` — empty string, array, object, Map, or Set
- `isEqual(a, b, options?)` — deep equality by default; handles circular refs, `Date`, `Map`, `Set`; `Map`/`Set` are never equal to plain objects; `{ depth: 'shallow' }` for reference-level comparison
- `isError(value)`
- `isFunction(value)`
- `isMatch(object, source)` — partial structural match; `Map`/`Set` sources always return `false`
- `isNil(value)` — `null` or `undefined`
- `isNumber(value)`
- `isPlainObject(value)` — `Object.prototype` or `null` prototype only; excludes class instances and built-ins
- `isPrimitive(value)` — `string`, `number`, or `boolean`
- `isPromise(value)`
- `isRegex(value)`
- `isString(value)`
- `shallowEqual(a, b)` — shallow (one-level reference) equality check

---

## Types

```ts
export type Fn<Args extends unknown[] = unknown[], Result = unknown> = (...args: Args) => Result;
export type Obj = Record<string, unknown>;
export type Predicate<T> = (value: T) => boolean;
export type Primitive = string | number | boolean;
export type Sorter<T> = (a: T, b: T) => number;
export type Unsubscribe = () => void;

export type AttemptResult<T> = { ok: true; value: T } | { error: unknown; ok: false };

export interface Queue {
  add<T>(fn: () => Promise<T>, options?: { priority?: number }): Promise<T>;
  clear(reason?: unknown): void;
  onIdle(): Promise<void>;
  onSettled<T>(cb: QueueSettledCallback<T>): () => void;
  readonly active: number;
  readonly pending: number;
  readonly size: number;
}
// QueueSettledResult was removed — onSettled callbacks now receive AttemptResult<T>
export type QueueSettledCallback<T = unknown> = (result: AttemptResult<T>) => void;

export type RetryOptions = {
  times?: number;
  delay?: number | ((attempt: number) => number);
  timeout?: number;
  signal?: AbortSignal;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onError?: (error: unknown) => void;
};
export type WaitForOptions = { interval?: number; signal?: AbortSignal; timeout?: number };

export type MemoOptions<T extends Fn> = {
  key?: (...args: Parameters<T>) => PropertyKey;
  maxSize?: number;
};
export type Memoized<T extends Fn> = ((...args: Parameters<T>) => ReturnType<T>) & {
  clear(): void;
  invalidate(...args: Parameters<T>): void;
  readonly size: number;
};

export type CachePersistence<T> = {
  deserialize: (raw: string) => T;
  serialize: (value: T) => string;
};
export type CacheOptions<K = string, T = unknown> = {
  hash?: (key: K) => string;
  maxSize?: number;
  onEvict?: (key: K, value: T) => void;
  persistence?: CachePersistence<T>;
  ttlMs?: number;
};
export type CacheSetOptions = { forceRefresh?: boolean; ttlMs?: number };

export type HashOptions = { onClassInstance?: 'coerce' | 'throw' };

export type GetPathOptions = { bracketNotation?: boolean; fallback?: unknown; strict?: boolean };

export type DeepMergeOptions = { arrayStrategy?: 'concat' | 'replace' };

export type DebounceOptions = { leading?: boolean; trailing?: boolean };
export type ThrottleOptions = { leading?: boolean; trailing?: boolean };

export type SortDirection = 'asc' | 'desc';
export type SortSelectors<T> = Partial<Record<keyof T, SortDirection>>;

export type FuzzyOptions<T> = {
  fields?: ReadonlyArray<keyof T & string>;
  normalize?: boolean;
  threshold?: number;
};
// Note: scored is accepted only at the fuzzy() overload call site, not a field on FuzzyOptions itself
export type ScoredResult<T> = { item: T; score: number };

export type ArrayDiff<T> = { added: T[]; removed: T[] };
export type ArrayDiffOptions<T> = { compareFn?: (a: T, b: T) => boolean };

export type DiffResult<T> = {
  added: Array<keyof T & string>;
  changed: { [K in keyof T]?: { after: T[K]; before: T[K] } };
  removed: Array<keyof T & string>;
};

export type Once<T extends Fn> = T & { reset: () => void };

export type ParseJSONOptions<T> = {
  fallback?: T;
  reviver?: (key: string, value: unknown) => unknown;
  validator?: (parsed: unknown) => boolean;
};

export type TruncateOptions = { completeWords?: boolean; ellipsis?: string };
```

## See Also

- [`@vielzeug/coins`](/coins/) — money formatting and currency conversion (`currency`, `exchange`)
- [`@vielzeug/tempo`](/tempo/) — date/time utilities (`expires`, `timeDiff`, `dateRange`)
- [`@vielzeug/sourcerer`](/sourcerer/) — reactive paginated sources (`createLocalSource`, `createRemoteSource`)
- [`@vielzeug/spell`](/spell/) — schema validation to pair with `parseJSON` and `assert`
