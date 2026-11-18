---
title: 'Ripple Examples: Batch and Untrack'
description: Coalesce related writes while reading non-reactive context.
---

## Batch and Untrack

### Problem

Changing a first and last name should produce one reactive update. A locale read should not make the effect rerun when only locale changes.

### Solution

Wrap related writes in `batch()` and read locale through `untrack()`.

```ts
import { batch, effect, signal, untrack } from '@vielzeug/ripple';

const first = signal('Ada');
const last = signal('Lovelace');
const locale = signal('en-US');
const stop = effect(() => {
  console.log({ locale: untrack(() => locale.value), name: `${first.value} ${last.value}` });
});

batch(() => {
  first.value = 'Grace';
  last.value = 'Hopper';
});

locale.value = 'de-DE';
stop.dispose();
```

### Pitfalls

- Batch does not roll back writes when its callback throws.
- Untracked reads still return current values immediately.
- Do not use untrack for values that should rerun the effect.

### Related

- [Reactive Counter](./reactive-counter.md)
- [Watch Selected Value](./watch-selected-value.md)
- [Arsenal](/arsenal/)
