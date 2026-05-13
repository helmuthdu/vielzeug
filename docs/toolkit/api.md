---
title: Toolkit — API Reference
description: Complete API reference for the current Toolkit surface.
---

[[toc]]

## Package Entry

| Import | Purpose |
| --- | --- |
| `@vielzeug/toolkit` | All public Toolkit exports |

## API At a Glance

| Category | Exports |
| --- | --- |
| Array | `chunk`, `compact`, `contains`, `countBy`, `difference`, `drop`, `dropLast`, `filterMap`, `first`, `flatten`, `groupBy`, `indexBy`, `intersection`, `last`, `partition`, `replace`, `rotate`, `sample`, `search`, `sort`, `take`, `takeLast`, `toggle`, `union`, `uniq`, `unzip`, `zip` |
| Async | `abortable`, `attempt`, `defer`, `parallel`, `predict`, `queue`, `retry`, `sleep`, `timeout`, `waitFor`, `Scheduler`, `polyfillScheduler` |
| Date | `expires`, `interval`, `timeDiff` |
| Function | `assert`, `compare`, `compareBy`, `compose`, `constant`, `curry`, `debounce`, `identity`, `memo`, `negate`, `once`, `partial`, `pipe`, `and`, `or`, `not`, `tap`, `throttle` |
| Math | `abs`, `allocate`, `average`, `clamp`, `gcd`, `lcm`, `lerp`, `linspace`, `max`, `median`, `min`, `mod`, `normalize`, `percent`, `range`, `round`, `standardDeviation`, `sum`, `variance` |
| Money | `currency`, `exchange`, `Money` |
| Object | `stash`, `deepClone`, `defaults`, `diff`, `deepMerge`, `shallowMerge`, `entries`, `filterValues`, `fromEntries`, `get`, `has`, `invert`, `keys`, `mapKeys`, `mapValues`, `omit`, `parseJSON`, `pick`, `prune`, `seek`, `values` |
| Random | `draw`, `random`, `shuffle`, `uuid` |
| String | `camelCase`, `endsWith`, `escape`, `kebabCase`, `pad`, `pascalCase`, `similarity`, `snakeCase`, `startsWith`, `titleCase`, `truncate`, `unescape`, `words` |
| Typed | `is` namespace, `isGreaterThan`, `isGreaterThanOrEqual`, `isLessThan`, `isLessThanOrEqual`, `isWithin` |

## Array

- `chunk(input, size?, options?)`
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
- `search(array, query, tone?)`
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
- `attempt(fn, options?)`
- `defer<T>()`
- `parallel(array, callback, options?)`
- `predict(fn, options?)`
- `queue(options?)`
- `retry(fn, options?)`
- `sleep(timeout)`
- `timeout(promise, ms, message?)`
- `waitFor(condition, options?)`
- `new Scheduler()`
- `polyfillScheduler()`

## Date

- `expires(date, days?)`
- `interval(start, end, options?)`
- `timeDiff(a, b?, allowedUnits?)`

## Function

- `assert(condition, message?, options?)`
- `compare(a, b)`
- `compareBy(selectors)`
- `compose(...fns)`
- `constant(value)`
- `curry(fn, arity?)`
- `debounce(fn, delay?)`
- `identity(value)`
- `memo(fn, options?)`
- `negate(predicate)`
- `once(fn)`
- `partial(fn, ...args)`
- `pipe(...fns)`
- `and(...predicates)`
- `or(...predicates)`
- `not(predicate)`
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

## Money

- `currency(money, options?)`
- `exchange(money, rate)`
- `type Money = { amount: bigint; currency: string }`

## Object

- `stash(options)`
- `deepClone(value)`
- `defaults(target, ...sources)`
- `diff(prev?, curr?, compareFn?)`
- `deepMerge(...items)`
- `shallowMerge(...items)`
- `entries(obj)`
- `filterValues(obj, predicate)`
- `fromEntries(input)`
- `get(item, path, defaultValue?, options?)`
- `has(item, key)`
- `invert(obj)`
- `keys(obj)`
- `mapKeys(obj, mapper)`
- `mapValues(obj, mapper)`
- `omit(obj, keys)`
- `parseJSON(json, options?)`
- `pick(obj, keys)`
- `prune(value)`
- `seek(item, query, tone?)`
- `values(obj)`

## Random

- `draw(array)`
- `random(min, max)`
- `shuffle(array)`
- `uuid()`

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
- Standalone predicates: `isGreaterThan`, `isGreaterThanOrEqual`, `isLessThan`, `isLessThanOrEqual`, `isWithin`

## Note

Reactive paginated source models are available in `@vielzeug/sourceit` via `createLocalSource()` and `createRemoteSource()`.
