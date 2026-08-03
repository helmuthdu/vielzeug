---
title: 'Ripple Examples — Immutable Store'
description: Update one replacement-based object value through a small store wrapper.
---

## Replacement-Based Store

### Problem

A feature needs one object value with explicit replacement operations while derived consumers should react to individual property reads.

### Solution

Create a store, return replacement objects from `update()`, and derive the selected property through `computed()`.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const user = ripple.createStore({ name: 'Ada', visits: 0 });
const visits = ripple.computed(() => user.value.visits);

user.update((value) => ({ ...value, visits: value.visits + 1 }));
user.set({ name: 'Grace', visits: 5 });

console.log(visits.value);
ripple.dispose();
```

### Pitfalls

- Replace nested objects instead of mutating them in place.
- Do not use store as a deep-mutation proxy.
- Use computed values for selected derived reads.

### Related

- [Reactive Counter](./reactive-counter.md)
- [Watch Selected Value](./watch-selected-value.md)
- [Ledger](/ledger/)
