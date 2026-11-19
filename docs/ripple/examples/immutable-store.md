---
title: 'Ripple Examples: Immutable State'
description: Update one replacement-based object value through signal.update().
---

## Replacement-Based State

### Problem

A feature needs one object value with explicit replacement operations while derived consumers should react to individual property reads.

### Solution

Create a signal, return replacement objects from `update()`, and derive the selected property through `computed()`.

```ts
import { computed, createScope, signal } from '@vielzeug/ripple';

const scope = createScope();
const user = signal({ name: 'Ada', visits: 0 });
const visits = scope.run(() => computed(() => user.value.visits));

user.update((value) => ({ ...value, visits: value.visits + 1 }));
user.value = { name: 'Grace', visits: 5 };

console.log(visits.value);
scope.dispose();
```

### Pitfalls

- Replace nested objects instead of mutating them in place.
- Do not use signals as a deep-mutation proxy.
- Use computed values for selected derived reads.

### Related

- [Reactive Counter](./reactive-counter.md)
- [Watch Selected Value](./watch-selected-value.md)
- [Ledger](/ledger/)
