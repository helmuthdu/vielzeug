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
| Array | `chunk`, `contains`, `group`, `keyBy`, `list`, `pick`, `remoteList`, `replace`, `rotate`, `search`, `select`, `sort`, `toggle`, `uniq` |
| Async | `attempt`, `defer`, `parallel`, `Scheduler`, `polyfillScheduler`, `queue`, `race`, `retry`, `sleep`, `waitFor` |
| Date | `expires`, `interval`, `timeDiff` |
| Function | `assert`, `compare`, `compareBy`, `compose`, `configure`, `curry`, `debounce`, `memo`, `once`, `pipe`, `throttle` |
| Math | `abs`, `allocate`, `average`, `clamp`, `linspace`, `max`, `median`, `min`, `percent`, `range`, `round`, `sum` |
| Money | `currency`, `exchange`, `Money` |
| Object | `stash`, `diff`, `merge`, `parseJSON`, `get`, `proxy`, `prune`, `seek` |
| Random | `draw`, `random`, `shuffle`, `uuid` |
| String | `camelCase`, `kebabCase`, `pascalCase`, `similarity`, `snakeCase`, `truncate` |
| Typed | `is` namespace |

## Array Utilities

- `chunk(input, size?, options?)`
- `contains(array, value)`
- `group(array, selector)`
- `keyBy(array, selector)`
- `list(initialData, config?)`
- `pick(array, callback, predicate?)`
- `remoteList(config)`
- `replace(array, predicate, value)`
- `rotate(array, positions, options?)`
- `search(array, query, tone?)`
- `select(array, callback, predicate?)`
- `sort(array, selectorOrSelectors, direction?)`
- `toggle(array, item, selector?, options?)`
- `uniq(array, selector?)`

## Async Utilities

- `attempt(fn, options?)`
- `defer<T>()`
- `parallel(limit, array, callback, signal?)`
- `queue(options?)`
- `race(promise, minDelay)`
- `retry(fn, options?)`
- `sleep(timeout)`
- `waitFor(condition, options?)`
- `new Scheduler()`
- `polyfillScheduler()`

## Date Utilities

- `expires(date, days?)`
- `interval(start, end, options?)`
- `timeDiff(a, b?, allowedUnits?)`

## Function Utilities

- `assert(condition, message?, options?)`
- `compare(a, b)`
- `compareBy(selectors)`
- `compose(...fns)`
- `configure(callback, ...args)`
- `curry(fn, arity?)`
- `debounce(fn, delay?)`
- `memo(fn, options?)`
- `once(fn)`
- `pipe(...fns)`
- `throttle(fn, delay?, options?)`

## Math Utilities

- `abs(value)`
- `allocate(amount, ratiosOrParts)`
- `average(array, callback?)`
- `clamp(n, min, max)`
- `linspace(start, end, steps?)`
- `max(array, callback?)`
- `median(array, callback?)`
- `min(array, callback?)`
- `percent(value, total)`
- `range(start, stop, step)`
- `round(value, precision?, parser?)`
- `sum(array, callback?)`

## Money Utilities

- `currency(money, options?)`
- `exchange(money, rate)`
- `type Money = { amount: bigint; currency: string }`

## Object Utilities

- `stash(options)`
- `diff(prev?, curr?, compareFn?)`
- `merge(strategy?, ...items)`
- `parseJSON(json, options?)`
- `get(item, path, defaultValue?, options?)`
- `proxy(item, options)`
- `prune(value)`
- `seek(item, query, tone?)`

## Random Utilities

- `draw(array)`
- `random(min, max)`
- `shuffle(array)`
- `uuid()`

## String Utilities

- `camelCase(str)`
- `kebabCase(str)`
- `pascalCase(str)`
- `similarity(str1, str2)`
- `snakeCase(str)`
- `truncate(str, limit?, options?)`

## Typed Utilities

`is` namespace methods:

- `is.array`
- `is.boolean`
- `is.date`
- `is.defined`
- `is.empty`
- `is.equal`
- `is.fn`
- `is.match`
- `is.nil`
- `is.number`
- `is.object`
- `is.primitive`
- `is.promise`
- `is.regex`
- `is.string`
- `is.typeOf`

## Examples

- [Array Examples](./examples/array.md)
- [Async Examples](./examples/async.md)
- [Date Examples](./examples/date.md)
- [Function Examples](./examples/function.md)
- [Math Examples](./examples/math.md)
- [Money Examples](./examples/money.md)
- [Object Examples](./examples/object.md)
- [Random Examples](./examples/random.md)
- [String Examples](./examples/string.md)
- [Typed Examples](./examples/typed.md)
