---
title: 'Ripple Examples — Derive and Filter'
description: 'Project and filter reactive sources with derive() and filter().'
---

## Derive and Filter

### Problem

You want to create a computed signal that projects a reactive source to a new value (`derive()`), or passes the source value through only when a condition holds (`filter()`), without the overload ambiguity of `selector()`.

### Solution

Use the `derive()` and `filter()` standalone utilities. Both return a `ComputedSignal` that disposes independently from the source.

#### `derive()` — project a source

```ts
import { signal, derive, effect } from '@vielzeug/ripple';

const price = signal(100);
const withTax = derive(price, (p) => p * 1.19);

effect(() => {
  console.log('price with tax:', withTax.value);
});

price.value = 200; // → 'price with tax: 238'
withTax.dispose();
```

#### `filter()` — gate values by a predicate

```ts
import { signal, filter, effect } from '@vielzeug/ripple';

const count = signal(3);
const evens = filter(count, (n) => n % 2 === 0);

effect(() => {
  if (evens.value !== undefined) {
    console.log('even count:', evens.value);
  }
});

count.value = 4; // → 'even count: 4'
count.value = 5; // no log — predicate is false
evens.dispose();
```

#### Type-guard narrowing

`filter()` accepts type-guard predicates, which narrow the output type from `T | undefined` to `SubT | undefined`:

```ts
import { signal, filter } from '@vielzeug/ripple';

const input = signal<string | null>(null);
const nonNull = filter(input, (v): v is string => v !== null);
// nonNull: ComputedSignal<string | undefined>

input.value = 'hello';
nonNull.value; // 'hello'

input.value = null;
nonNull.value; // undefined
```

#### `derive()` + `filter()` in sequence

Chain them for a project-then-filter pipeline:

```ts
import { signal, derive, filter } from '@vielzeug/ripple';

const items = signal([1, 2, 3, 4, 5]);
const sum = derive(items, (arr) => arr.reduce((a, b) => a + b, 0));
const largeSum = filter(sum, (s) => s > 10);

items.value = [4, 5, 6]; // sum=15, largeSum=15
items.value = [1, 2, 3]; // sum=6, largeSum=undefined

largeSum.dispose();
sum.dispose();
```

#### `selector()` for combined project + filter

When you need projection and filtering in a single step, `selector()` covers the combined case:

```ts
import { signal, selector } from '@vielzeug/ripple';

const count = signal(3);
const bigDoubles = selector(
  count,
  (n) => n * 2, // project
  (n) => n > 5, // filter the projected value
);

bigDoubles.value; // 6 (3*2=6, 6>5 is true)

count.value = 2;
bigDoubles.value; // undefined (2*2=4, 4>5 is false)

bigDoubles.dispose();
```

### Pitfalls

- `filter()` returns `undefined` when the predicate is `false` — always guard against `undefined` before rendering.
- Disposing the source signal does not automatically dispose a derived `filter()`/`derive()` signal — call `.dispose()` on each independently.
- Both utilities track their source reactively. Do not call them inside an `effect()` callback without disposing the result — each call creates a new computed.

### Related

- [API Reference — `derive`](../api.md#derive)
- [API Reference — `filter`](../api.md#filter)
- [API Reference — `selector`](../api.md#selector)
- [Usage Guide — Signal Combinators](../usage.md#signal-combinators)
- [Signals](./signals.md)
