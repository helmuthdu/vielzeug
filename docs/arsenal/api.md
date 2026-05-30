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

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `chunk(input, size?)` | Split array or string into pages | Sync | Returns `string[]` for string input, `T[][]` for arrays |
| `filterMap(array, fn)` | Map + filter in one pass, skipping `undefined` | Sync | Return `undefined` to drop an item; `null` is kept |
| `groupBy(array, selector)` | Group items into a record by key | Sync | Key must be a `PropertyKey` |
| `search(array, query, threshold?)` | Fuzzy search over any array | Sync | `threshold` is a 0–1 similarity threshold (default `0.25`) |
| `sort(array, selectors)` | Multi-key sort without mutation | Sync | Pass an object `{ key: 'asc' }` or a comparator |
| `uniq(array, selector?)` | Deduplicate by value or key | Sync | Uses deep equality without a selector |
| `parallel(array, fn, options?)` | Bounded async fan-out | Async | `limit` defaults to unbounded |
| `queue(options?)` | Serialise async jobs with concurrency cap | Async | `.onIdle()` resolves when queue drains |
| `retry(fn, options?)` | Retry a throwing async function with timeout and signal | Async | Rethrows on exhaustion; `fn` receives an `AbortSignal` |
| `allOf(...predicates)` | AND combinator — all must pass | Sync | Zero predicates → vacuous truth (always `true`) |
| `anyOf(...predicates)` | OR combinator — at least one must pass | Sync | Zero predicates → vacuous falsity (always `false`) |
| `noneOf(...predicates)` | NOR combinator — none must pass | Sync | Single predicate is equivalent to logical NOT |
| `debounce(fn, delay?)` | Delay execution until input settles | Sync | Returns a new function; reuse it across renders |
| `memo(fn, options?)` | Memoize with optional TTL and size cap | Sync | Pass a `key` function when arguments are objects |
| `partial(fn, ...args)` | Bind leading arguments | Sync | Type-safe — remaining params are inferred |
| `assert(condition, message?, options?)` | Throw if condition is falsy | Sync | Accepts an options object for custom error type |
| `diff(before?, after?)` | Structural diff between two objects | Sync | Returns `DELETED` symbol for removed keys |
| `parseJSON(json, options?)` | Safe JSON parse with fallback | Sync | Accepts `string \| null \| undefined`; returns `undefined` on failure |
| `stash(options)` | TTL-aware key-value cache with GC | Sync | Key is a tuple — supply a `hash` function |
| `deepMerge(...items)` | Recursive object merge | Sync | Arrays are replaced by default |
| `deepMergeWith(options)` | Create a configured `deepMerge` | Sync | Pass `{ arrayStrategy: 'concat' }` to concatenate arrays |
| `is` namespace | Type-narrowing predicate collection | Sync | `is.equal` does deep equality |

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
- `search(array, query, threshold?)`
- `sort(array, selectorOrSelectors, direction?)`
- `take(array, n?)`
- `takeLast(array, n?)`
- `toggle(array, item, selector?, options?)`
- `union(source, other, selector?)`
- `uniq(array, selector?)`
- `unzip(rows)`
- `zip(...arrays)`

## Async

- `abortable(promise, signal)`
- `parallel(array, callback, options?)`
- `queue(options?)`
- `retry(fn, options?)`
- `sleep(timeout)`
- `timeout(promise, ms, message?)`
- `waitFor(condition, options?)`

## Date

Date utilities (`expires`, `timeDiff`, `dateRange`) have moved to [`@vielzeug/tempo`](/tempo/).

## Function

- `allOf(...predicates)`
- `anyOf(...predicates)`
- `assert(condition, message?, options?)`
- `compare(a, b)`
- `compareBy(selectors)`
- `compose(...fns)`
- `constant(value)`
- `curry(fn, arity?)`
- `debounce(fn, delay?)`
- `identity(value)`
- `memo(fn, options?)`
- `noneOf(...predicates)`
- `once(fn)`
- `partial(fn, ...args)`
- `pipe(...fns)`
- `tap(value, callback)`
- `throttle(fn, delay?, options?)`

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
- `mod(a, b)`
- `normalize(value, min, max)`
- `percent(value, total)`
- `range(start, stop, step)`
- `round(value, precision?, parser?)`
- `standardDeviation(array, callback?)`
- `sum(array, callback?)`
- `variance(array, callback?)`

## Object

- `stash(options)`
- `defaults(target, ...sources)`
- `diff(before?, after?, compareFn?)`
- `deepMerge(...items)`
- `deepMergeWith(options)`
- `shallowMerge(...items)`
- `entries(obj)`
- `filterValues(obj, predicate)`
- `fromEntries(input)`
- `getPath(item, path, defaultValue?, options?)`
- `has(item, key)`
- `invert(obj)`
- `keys(obj)`
- `mapKeys(obj, mapper)`
- `mapValues(obj, mapper)`
- `omit(obj, keys)`
- `parseJSON(json, options?)`
- `pick(obj, keys)`
- `prune(value)`
- `values(obj)`

## Random

- `draw(array)`
- `random(min, max)`
- `shuffle(array)`

## String

- `camelCase(str)`
- `endsWith(value, suffix)`
- `escape(value)`
- `kebabCase(str)`
- `pad(str, targetLength, fillString?)`
- `pascalCase(str)`
- `similarity(str1, str2)`
- `snakeCase(str)`
- `startsWith(value, prefix)`
- `titleCase(str)`
- `truncate(str, limit?, options?)`
- `unescape(value)`
- `words(str)`

## Typed

- `is` namespace: `is.array`, `is.boolean`, `is.date`, `is.defined`, `is.empty`, `is.equal`, `is.fn`, `is.greaterThan`, `is.greaterThanOrEqual`, `is.lessThan`, `is.lessThanOrEqual`, `is.match`, `is.nil`, `is.number`, `is.object`, `is.primitive`, `is.promise`, `is.regex`, `is.string`, `is.typeOf`, `is.within`
- Standalone predicates: `isArray`, `isBoolean`, `isDate`, `isDefined`, `isEmpty`, `isEqual`, `isFunction`, `isGreaterThan`, `isGreaterThanOrEqual`, `isLessThan`, `isLessThanOrEqual`, `isMatch`, `isNil`, `isNumber`, `isObject`, `isPrimitive`, `isPromise`, `isRegex`, `isString`, `isWithin`

## Types

```ts
export type Predicate<T> = (value: T, index: number, array: readonly T[]) => boolean;
export type Sorter<T> = (a: T, b: T) => number;
export type Fn<Args extends unknown[] = unknown[], Result = unknown> = (...args: Args) => Result;
export type Obj = Record<string, unknown>;
export type Primitive = string | number | boolean;
export type AttemptResult<T> = { ok: true; value: T } | { ok: false; error: unknown };
export type DeepMergeOptions = { arrayStrategy?: 'concat' | 'replace' };
export const DELETED: unique symbol;
```

## See Also

- [`@vielzeug/coins`](/coins/) — money formatting and currency conversion (`currency`, `exchange`)
- [`@vielzeug/tempo`](/tempo/) — date/time utilities (`expires`, `timeDiff`, `dateRange`)
- [`@vielzeug/sourcerer`](/sourcerer/) — reactive paginated sources (`createLocalSource`, `createRemoteSource`)
- [`@vielzeug/spell`](/spell/) — schema validation to pair with `parseJSON` and `assert`
