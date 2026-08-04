---
title: 'Flux Examples — Ripple Signal Integration'
description: 'Bridge Ripple signal updates through Flux operators into a derived signal binding.'
---

## Ripple Signal Integration

### Problem

A Ripple signal needs time-based stream operators before UI reads its next value.

### Solution

Convert source signal to stream, compose operators, then bind output back to Ripple.

```ts
import { debounce, map, pipe } from '@vielzeug/flux';
import { fromSignal, toSignal } from '@vielzeug/flux/ripple';
import { effect, signal } from '@vielzeug/ripple';

const query = signal('');
const normalized = pipe(
  fromSignal(query),
  debounce({ for: 300 }),
  map((value) => value.trim().toLowerCase()),
);
const result = toSignal(normalized, { initial: '' });

effect(() => console.log(result.value));
query.value = ' Hello ';

result.dispose();
```

### Pitfalls

- `fromSignal()` emits current value synchronously on subscription.
- `toSignal()` preserves final value, then disposes when source completes, errors, or external signal aborts.
- Bindings from long-lived streams should be disposed by their owner.

### Related

- [Combining Streams](./combine-streams.md)
- [Debounced Search Input](./debounce-search.md)
- [API: Ripple adapters](../api.md#adapters)
