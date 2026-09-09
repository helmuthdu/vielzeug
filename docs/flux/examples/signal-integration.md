---
title: 'Flux Examples — Structural State Integration'
description: 'Bridge subscribable state through Flux operators without package-specific adapters.'
---

## Structural State Integration

### Problem

A state source needs time-based stream operators before UI consumes its next value.

### Solution

Use `fromStore()` with any `{ getSnapshot, subscribe }` source, then write stream output where the application needs it.

```ts
import { debounce, fromStore, map, pipe } from '@vielzeug/flux';
import { signal } from '@vielzeug/ripple';

const query = signal('');
const normalized = pipe(
  fromStore({ getSnapshot: () => query.peek(), subscribe: (listener) => query.subscribe(listener) }),
  debounce(300),
  map((value) => value.trim().toLowerCase()),
);
const result = signal('');
const subscription = normalized.subscribe({
  error: reportError,
  next: (value) => {
    result.value = value;
  },
});

query.value = ' Hello ';
subscription.unsubscribe();
```

### Pitfalls

- `fromStore()` emits `getSnapshot()`'s the current value before later notifications.
- Dispose long-lived stream subscriptions with their owner.

### Related

- [Combining Streams](./combine-streams.md)
- [Debounced Search Input](./debounce-search.md)
- [Flux API](../api.md)
