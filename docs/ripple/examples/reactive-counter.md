---
title: 'Ripple Examples: Reactive Counter'
description: Derive and observe a counter value in one reactive graph.
---

## Reactive Counter

### Problem

A counter display needs to update whenever its value changes without manual listener bookkeeping. The effect must stop when the feature lifetime ends.

### Solution

Create a signal, derive a display value, and dispose the effect after use.

```ts
import { computed, createScope, effect, signal } from '@vielzeug/ripple';

const scope = createScope({ name: 'counter' });
const count = scope.run(() => {
  const count = signal(0);
  const label = computed(() => `Count: ${count.value}`);
  effect(() => console.log(label.value));
  return count;
});

count.value = 1;
count.value = 2;

scope.dispose();
```

### Pitfalls

- Keep computed callbacks pure.
- Create work inside the scope that owns its lifetime.

### Related

- [Batch and Untrack](./batch-and-untrack.md)
- [Scope Ownership](./scope-ownership.md)
- [Ore](/ore/)
