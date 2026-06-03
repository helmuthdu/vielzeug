---
title: Arsenal — API Reference
description: Complete API reference for the current Arsenal surface.
---

[[toc]]

## Package Entry Point

| Import              | Purpose                    |
| ------------------- | -------------------------- |
| `@vielzeug/arsenal` | All public Arsenal exports |

## API At a Glance

<!-- markdownlint-disable MD060 -->

| Symbol                                    | Purpose                                                           | Execution | Common gotcha                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `chunk(input, size?)`                     | Split array or string into pages                                  | Sync      | Returns `string[]` for string input, `T[][]` for arrays                                                  |
| `filterMap(array, fn)`                    | Map + filter in one pass, skipping `undefined`                    | Sync      | Return `undefined` to drop an item; `null` is kept                                                       |
| `groupBy(array, selector)`                | Group items into a record by key                                  | Sync      | Key must be a `PropertyKey`                                                                              |
| `search(array, query, options?)`          | Fuzzy search with optional scored results                         | Sync      | `mode: 'scored'` returns `ScoredResult<T>[]` sorted by relevance                                         |
| `sort(array, selectors)`                  | Multi-key sort without mutation                                   | Sync      | Pass an object `{ key: 'asc' }` or a comparator                                                          |
| `uniq(array, selector?)`                  | Deduplicate by value or key                                       | Sync      | Uses deep equality without a selector                                                                    |
| `parallel(array, fn, options?)`           | Bounded async fan-out                                             | Async     | `limit` defaults to unbounded                                                                            |
| `queue(options?)`                         | Serialise async jobs with concurrency cap                         | Async     | `.onIdle()` resolves when queue drains                                                                   |
| `attempt(fn)`                             | Run an async function and return `AttemptResult` — never throws   | Async     | Returns `{ ok: true, value }` or `{ ok: false, error }`                                                  |
| `retry(fn, options?)`                     | Retry a throwing async function with timeout and signal           | Async     | Rethrows on exhaustion; `shouldRetry` receives `(error, failureIndex)` — not called on the final attempt |
| `allOf(...predicates)`                    | AND combinator — all must pass                                    | Sync      | Zero predicates → vacuous truth (always `true`)                                                          |
| `anyOf(...predicates)`                    | OR combinator — at least one must pass                            | Sync      | Zero predicates → vacuous falsity (always `false`)                                                       |
| `noneOf(...predicates)`                   | NOR combinator — none must pass                                   | Sync      | Single predicate is equivalent to logical NOT                                                            |
| `debounce(fn, delay?)`                    | Delay execution until input settles                               | Sync      | Returns a new function; reuse it across renders                                                          |
| `memo(fn, options?)`                      | Memoize with optional TTL and LRU size cap                        | Sync      | Pass a `key` function when arguments are objects                                                         |
| `partial(fn, ...args)`                    | Bind leading arguments                                            | Sync      | Type-safe — remaining params are inferred                                                                |
| `assert(condition, message?, options?)`   | Throw if condition is falsy; narrows type via `asserts condition` | Sync      | Accepts `{ type: ErrorConstructor }` for custom error class                                              |
| `diff(before?, after?)`                   | Structural diff between two objects                               | Sync      | Returns `DELETED` symbol for removed keys                                                                |
| `parseJSON(json, options?)`               | Safe JSON parse with fallback                                     | Sync      | Accepts `string \| null \| undefined`; returns `undefined` on failure                                    |
| `stash(options)`                          | TTL-aware key-value cache with stampede prevention                | Sync      | Use `store.has()` semantics — correctly handles `undefined` values                                       |
| `stableStringify(value, options?)`        | Deterministic JSON-like string for any value                      | Sync      | Pass `{ strict: true }` to throw on class instances instead of falling back to `String()`                |
| `getPath(item, path, default?, options?)` | Nested dot-notation access                                        | Sync      | **Dot notation only** — `'a.1.b'` not `'a[1].b'`; bracket notation throws `TypeError`                    |
| `deepMerge(...items)`                     | Recursive object merge                                            | Sync      | Arrays are replaced by default; use `deepMergeWith` for concat strategy                                  |
| `isMatch(object, source)`                 | Partial deep structural comparison                                | Sync      | `Map` and `Set` sources are never matched by key iteration — use `isEqual` for those                     |
| `isEqual(a, b, options?)`                 | Deep or shallow equality                                          | Sync      | `depth: 'shallow'` compares one level by reference                                                       |
| `backoff(attempt, maxMs?)`                | Compute backoff delay for retry loops                             | Sync      | Returns `min(1000 × 2ⁿ, maxMs)` — multiply by `Math.random()` for full-jitter                            |

<!-- markdownlint-enable MD060 -->

## Array

- `chunk(input, size?)`
- `compact(array)`
- `contains(array, value)`
- `countBy(array, selector)`
- `difference(source, other, selector?)`
- `drop(array, n?)`
- `dropLast(array, n?)`
- `filterMap(array, callback)`
- `first(array, fallback?)`
- `flatten(array, depth?)`
- `groupBy(array, selector)`
- `indexBy(array, selector)`
- `intersection(source, other, selector?)`
- `last(array, fallback?)`
- `partition(array, predicate)`
- `replace(array, predicate, value)`
- `rotate(array, positions, options?)`
- `sample(array, n)`
- `search(array, query, options?)` — see [search options](#search)
- `sort(array, selectorOrSelectors, direction?)`
- `take(array, n?)`
- `takeLast(array, n?)`
- `toggle(array, item, selector?, options?)`
- `union(source, other, selector?)`
- `uniq(array, selector?)`
- `unzip(rows)`
- `zip(...arrays)`

### search

```ts
// Filter mode (default) — returns T[]
search(array, query, options?: SearchOptions): T[]

// Scored mode — returns ScoredResult<T>[] sorted by score descending
search(array, query, { mode: 'scored', ...options }): ScoredResult<T>[]

type SearchOptions<T> = {
  fields?: ReadonlyArray<keyof T & string>; // limit to specific object keys
  mode?: 'filter' | 'scored';              // default: 'filter'
  threshold?: number;                       // 0–1 similarity cutoff, default: 0.25
};

type ScoredResult<T> = { item: T; score: number };
```

## Async

- `abortable(promise, signal)` — reject a promise when a signal fires
- `abortError(signal?)` — extract the abort reason or construct a `DOMException('AbortError')`
- `parallel(array, callback, options?)` — bounded concurrent fan-out; `options.limit` caps concurrency
- `queue(options?)` — serialised promise queue; `options.concurrency` defaults to 1; returned object exposes `.active` (running), `.pending` (queued), `.size` (total), `.add()`, `.clear()`, `.onIdle()`
- `retry(fn, options?)` — see [retry options](#retry)
- `sleep(ms, signal?)` — delay that respects an AbortSignal
- `attempt(fn)` — wrap an async function; returns `{ ok: true, value } | { ok: false, error }` — never throws
- `waitFor(condition, options?)` — poll until `condition(signal)` returns `true` or timeout fires; condition receives the merged `AbortSignal`

### retry

```ts
retry(
  fn: (signal?: AbortSignal) => Promise<T>,
  options?: {
    times?: number;             // total attempts, default 3
    delay?: number | ((failureIndex: number) => number); // ms between retries, default 250
    timeout?: number;           // per-attempt timeout in ms
    signal?: AbortSignal;       // external cancellation signal
    shouldRetry?: (error: unknown, failureIndex: number) => boolean;
    //   failureIndex is 0-based (0 = first failure, 1 = second, …)
    //   NOT called on the final (exhausting) attempt
    onError?: (error: unknown) => void; // called with the last error before re-throwing
  },
): Promise<T>
```

## Function

- `allOf(...predicates)` — AND combinator
- `anyOf(...predicates)` — OR combinator
- `assert(condition, message?, options?)` — throws if `condition` is false; narrows the TypeScript type via `asserts condition`; `options.type` sets the error class (e.g. `RangeError`)
- `compare(a, b)` — general-purpose comparator (numbers, strings, dates); **string comparison uses `localeCompare`** and may return values other than `−1/0/1`
- `compareBy(selectors)` — multi-key comparator factory
- `compose(...fns)` — right-to-left function composition
- `constant(value)` — returns a function that always returns the same value
- `curry(fn, arity?)` — auto-curried wrapper
- `debounce(fn, delay?)` — trailing-edge debounce; returns `.cancel()`, `.flush()`, `.pending()`
- `identity(value)` — returns its argument unchanged
- `memo(fn, options?)` — memoize with `ttl`, `maxSize` (LRU), and custom `key` function; returns a `Memoized<T>` with `.clear()`, `.invalidate()`, and `.size` (number of cached entries)
- `noneOf(...predicates)` — NOR combinator
- `once(fn)` — run once; returns `.reset()` to allow re-invocation
- `partial(fn, ...args)` — bind leading arguments
- `pipe(...fns)` — left-to-right function composition
- `runAll(fns, options?)` — run all functions, collecting errors into an `AggregateError`
- `tap(value, callback)` — side-effect passthrough
- `throttle(fn, delay?, options?)` — leading/trailing throttle

## Math

- `abs(value)`
- `allocate(amount, ratiosOrParts)`
- `average(array, callback?)`
- `clamp(n, min, max)`
- `backoff(attempt, maxMs?)` — `min(1000 × 2ⁿ, maxMs)` for retry delay loops
- `gcd(a, b)`
- `lcm(a, b)`
- `lerp(a, b, t)`
- `linspace(start, end, steps?)`
- `max(array, callback?)`
- `median(array, callback?)`
- `min(array, callback?)`
- `mod(a, b)`
- `normalize(value, min, max)`
- `percent(value, total)`
- `range(stop)` / `range(start, stop)` / `range(start, stop, step)`
- `round(value, precision?, parser?)`
- `standardDeviation(array, callback?)`
- `sum(array, callback?)`
- `variance(array, callback?)`

## Object

- `cache(maxSize)` — simple bounded FIFO cache (`get` / `set`)
- `defaults(target, ...sources)`
- `diff(before?, after?, compareFn?)`
- `deepMerge(...items)` — arrays replaced by default
- `deepMergeWith(options)` — `{ arrayStrategy: 'concat' }` to concatenate
- `entries(obj)`
- `filterValues(obj, predicate)`
- `flattenPaths(obj)` — flatten nested object to `{ 'a.b': value }` map; throws `RangeError` if nesting exceeds 10 levels
- `fromEntries(input)`
- `getOrCreate(cache, key, build)` — lazy-initialise a `Map` entry
- `getPath(item, path, defaultValue?, options?)` — see [getPath](#getpath)
- `has(item, key)`
- `invert(obj)`
- `isSafePath(key)` — returns `false` for paths containing `__proto__`, `constructor`, `prototype`
- `keys(obj)`
- `mapKeys(obj, mapper)`
- `mapValues(obj, mapper)`
- `omit(obj, keys)`
- `parseJSON(json, options?)`
- `pick(obj, keys)`
- `prune(value)`
- `stableStringify(value, options?)` — see [stableStringify](#stablestringify)
- `stash(options)` — see [stash](#stash)
- `values(obj)`

### getPath

```ts
getPath(item, path, defaultValue?, options?: { throwOnMissing?: boolean })

// Dot notation only — bracket notation throws TypeError with a helpful correction
getPath(obj, 'a.b.c');         // 3
getPath(obj, 'd.1');           // array index access
getPath(obj, 'x.y', 'fallback'); // fallback when path is missing
getPath(obj, 'a[0]');          // ✗ TypeError: use 'a.0' instead
```

### stableStringify

```ts
stableStringify(value, options?: { strict?: boolean }): string

// Object keys are sorted; Dates, Sets, Maps, bigints all have deterministic representations
stableStringify({ b: 2, a: 1 })          // '{"a":1,"b":2}'
stableStringify(new Set([3, 1, 2]))       // '[Set:1,2,3]'
stableStringify(new Date('2024-01-01T00:00:00Z')) // '[Date:2024-01-01T00:00:00.000Z]'
stableStringify(new MyClass())            // String(instance) by default
stableStringify(new MyClass(), { strict: true }) // throws TypeError
```

### stash

```ts
stash<T, K = string>(options: CacheOptions<K, T>): Stash<T, K>

type CacheOptions<K, T> = {
  hash: (key: K) => string;
  onEvict?: (key: K, value: T) => void;
};

type Stash<T, K> = {
  get(key: K): T | undefined;
  set(key: K, value: T, options?: { ttlMs?: number }): void;
  delete(key: K): boolean;
  clear(): void;
  readonly size: number;
  entries(): IterableIterator<[K, T]>;
  // Sync factory — caches result (including undefined) and returns it
  getOrSet(key: K, factory: () => T, options?: { ttlMs?: number }): T;
  // Async factory — deduplicates in-flight calls (stampede prevention)
  getOrSet(key: K, factory: () => Promise<T>, options?: { ttlMs?: number }): Promise<T>;
};
```

## Random

- `draw(array)` — pick one element at random
- `random(min, max)` — random number in `[min, max]`
- `shuffle(array)` — Fisher-Yates shuffle (returns a new array)
- `uuid()` — `crypto.randomUUID()` wrapper

## String

- `camelCase(str)`
- `endsWith(value, suffix)`
- `escape(value)`
- `kebabCase(str)`
- `pad(str, targetLength, fillString?)`
- `pascalCase(str)`
- `similarity(str1, str2)` — returns 0–1 Levenshtein similarity; throws `RangeError` if either input exceeds 10 000 characters
- `snakeCase(str)`
- `startsWith(value, prefix)`
- `titleCase(str)`
- `truncate(str, limit?, options?)`
- `unescape(value)`
- `words(str)`

## Typed Predicates

All predicates are standalone named exports. There is no `is` namespace.

- `isAbortError(value)` — `Error` with `name === 'AbortError'`
- `isArray(value, itemGuard?)` — true if `value` is an array; optionally narrows item type when `itemGuard` is provided
- `isBoolean(value)`
- `isDate(value)`
- `isDefined(value)` — not `undefined`
- `isEmpty(value)` — empty string, array, object, Map, or Set
- `isEqual(a, b, options?)` — deep or shallow equality; handles circular refs, `Date`, `Map`, `Set`
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
- `not(predicate)` — exported from the `function` domain; negates a predicate

## Types

```ts
export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
export type Sorter<T> = (a: T, b: T) => number;
export type Fn<Args extends unknown[] = unknown[], Result = unknown> = (...args: Args) => Result;
export type Obj = Record<string, unknown>;
export type Primitive = string | number | boolean;
export type Unsubscribe = () => void;
export type AttemptResult<T> = { ok: true; value: T } | { error: unknown; ok: false };
export type Memoized<T extends Fn> = ((...args: Parameters<T>) => ReturnType<T>) & {
  clear(): void;
  invalidate(...args: Parameters<T>): void;
  readonly size: number;
};
export type TruncateOptions = { completeWords?: boolean; ellipsis?: string };
export type DeepMergeOptions = { arrayStrategy?: 'concat' | 'replace' };
export type ScoredResult<T> = { item: T; score: number };
export type SearchOptions<T> = {
  fields?: ReadonlyArray<keyof T & string>;
  mode?: 'filter' | 'scored';
  threshold?: number;
};
export const DELETED: unique symbol;
```

## See Also

- [`@vielzeug/coins`](/coins/) — money formatting and currency conversion (`currency`, `exchange`)
- [`@vielzeug/tempo`](/tempo/) — date/time utilities (`expires`, `timeDiff`, `dateRange`)
- [`@vielzeug/sourcerer`](/sourcerer/) — reactive paginated sources (`createLocalSource`, `createRemoteSource`)
- [`@vielzeug/spell`](/spell/) — schema validation to pair with `parseJSON` and `assert`
