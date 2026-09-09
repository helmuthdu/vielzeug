---
title: 'Ripple Examples — Watch Selected Value'
description: React only when a selected derived value changes.
---

## Watch Selected Value

### Problem

An audit event should run when a full name changes, not for every reactive read in an unrelated effect.

### Solution

Use `watch()` with a selected source and dispose its handle when observation ends.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const first = ripple.signal('Ada');
const last = ripple.signal('Lovelace');
const fullName = ripple.computed(() => `${first.value} ${last.value}`);
const stop = ripple.watch(fullName, (value, previous) => console.log({ previous, value }), { immediate: true });

first.value = 'Grace';
last.value = 'Hopper';

stop.dispose();
ripple.dispose();
```

### Pitfalls

- Reactive reads made only inside the callback are untracked; use `effect()` when all callback reads should become dependencies.
- `once` disposes after the first callback invocation, including a callback that throws.
- Supply `equals` when selection needs custom equality.

### Related

- [Batch and Untrack](./batch-and-untrack.md)
- [Herald](/herald/)
