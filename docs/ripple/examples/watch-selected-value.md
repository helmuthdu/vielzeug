---
title: 'Ripple Examples: Watch Selected Value'
description: React only when a selected derived value changes.
---

## Watch Selected Value

### Problem

An audit event should run when a full name changes, not for every reactive read in an unrelated effect.

### Solution

Use `watch()` with a selected source and dispose its handle when observation ends.

```ts
import { computed, createScope, signal, watch } from '@vielzeug/ripple';

const scope = createScope();
const first = signal('Ada');
const last = signal('Lovelace');
const fullName = scope.run(() => computed(() => `${first.value} ${last.value}`));
const stop = watch(fullName, (value, previous) => console.log({ previous, value }), { immediate: true });

first.value = 'Grace';
last.value = 'Hopper';

stop.dispose();
scope.dispose();
```

### Pitfalls

- Reactive reads made only inside the callback are untracked; use `effect()` when all callback reads should become dependencies.
- For one-shot observation, dispose the returned handle from inside the callback; with `immediate: true` the callback runs before the handle exists, so do the first invocation at the call site.
- Supply `equals` when selection needs custom equality.

### Related

- [Batch and Untrack](./batch-and-untrack.md)
- [Herald](/herald/)
