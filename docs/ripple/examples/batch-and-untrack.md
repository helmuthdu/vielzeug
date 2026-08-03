---
title: 'Ripple Examples — Batch and Untrack'
description: Coalesce related writes while reading non-reactive context.
---

## Batch and Untrack

### Problem

Changing a first and last name should produce one reactive update. A locale read should not make the effect rerun when only locale changes.

### Solution

Wrap related writes in `batch()` and read locale through `untrack()`.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const first = ripple.signal('Ada');
const last = ripple.signal('Lovelace');
const locale = ripple.signal('en-US');
const stop = ripple.effect(() => {
  console.log({ locale: ripple.untrack(() => locale.value), name: `${first.value} ${last.value}` });
});

ripple.batch(() => {
  first.value = 'Grace';
  last.value = 'Hopper';
});

locale.value = 'de-DE';
stop.dispose();
ripple.dispose();
```

### Pitfalls

- Batch does not roll back writes when its callback throws.
- Untracked reads still return current values immediately.
- Do not use untrack for values that should rerun the effect.

### Related

- [Reactive Counter](./reactive-counter.md)
- [Watch Selected Value](./watch-selected-value.md)
- [Arsenal](/arsenal/)
