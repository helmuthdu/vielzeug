---
title: 'Ripple Examples — Immutable State'
description: Update one replacement-based object value through signal.update().
---

## Replacement-Based State

### Problem

A feature needs one object value with explicit replacement operations while derived consumers should react to individual property reads.

### Solution

Create a signal, return replacement objects from `update()`, and derive the selected property through `computed()`.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const user = ripple.signal({ name: 'Ada', visits: 0 });
const visits = ripple.computed(() => user.value.visits);

user.update((value) => ({ ...value, visits: value.visits + 1 }));
user.value = { name: 'Grace', visits: 5 };

console.log(visits.value);
ripple.dispose();
```

### Pitfalls

- Replace nested objects instead of mutating them in place.
- Do not use signals as a deep-mutation proxy.
- Use computed values for selected derived reads.

### Related

- [Reactive Counter](./reactive-counter.md)
- [Watch Selected Value](./watch-selected-value.md)
- [Ledger](/ledger/)
