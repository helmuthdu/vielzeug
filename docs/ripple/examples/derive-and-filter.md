---
title: 'Ripple Examples — Projecting Signals'
description: 'Project reactive sources with computed().'
---

## Projecting Signals

### Problem

You want to create a derived signal that projects a reactive source to a new value.

### Solution

Use `computed()`. It returns a `Computed<T>` that tracks its dependencies and disposes independently from the source.

#### `computed()` — project a source

```ts
import { signal, computed, effect } from '@vielzeug/ripple';

const price = signal(100);
const withTax = computed(() => price.value * 1.19);

effect(() => {
  console.log('price with tax:', withTax.value);
});

price.value = 200; // → 'price with tax: 238'
withTax.dispose();
```

#### Chaining computed signals

Chain `computed()` calls to build a projection pipeline:

```ts
import { signal, computed } from '@vielzeug/ripple';

const items = signal([1, 2, 3, 4, 5]);
const sum = computed(() => items.value.reduce((a, b) => a + b, 0));
const label = computed(() => `Total: ${sum.value}`);

items.value = [4, 5, 6]; // label.value → 'Total: 15'

label.dispose();
sum.dispose();
```

#### `computed()` on `readonly()` wrappers

`computed()` accepts any `Readable<T>` — including `readonly()` wrappers:

```ts
import { signal, readonly, computed } from '@vielzeug/ripple';

const count = signal(0);
const ro = readonly(count); // Readable<number> — no setter
const doubled = computed(() => ro.value * 2);

count.value = 5;
doubled.value; // 10
doubled.dispose();
```

### Pitfalls

- Disposing the source signal does not automatically dispose a derived computed — call `.dispose()` on each independently.
- Do not call `computed()` inside an `effect()` callback without disposing the result — each call creates a new computed node.

### Related

- [API Reference — `computed`](../api.md#computed)
- [Usage Guide — Signal Combinators](../usage.md#signal-combinators)
- [Signals](./signals.md)
