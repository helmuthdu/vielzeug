---
title: 'Ripple Examples — Reactive Counter'
description: Derive and observe a counter value in one reactive graph.
---

## Reactive Counter

### Problem

A counter display needs to update whenever its value changes without manual listener bookkeeping. The effect must stop when the feature lifetime ends.

### Solution

Create a signal, derive a display value, and dispose the effect after use.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const count = ripple.signal(0);
const label = ripple.computed(() => `Count: ${count.value}`);
const stop = ripple.effect(() => console.log(label.value));

count.value = 1;
count.value = 2;

stop.dispose();
ripple.dispose();
```

### Pitfalls

- Keep computed callbacks pure.
- Dispose effects created outside a scope or graph lifetime.
- Do not mix signals from separate graphs.

### Related

- [Batch and Untrack](./batch-and-untrack.md)
- [Isolated Graph](./isolated-runtime.md)
- [Ore](/ore/)
