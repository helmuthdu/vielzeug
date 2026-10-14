---
title: 'Ripple Examples: Async Resource'
description: Load reactive async state with stale-request cancellation and explicit ownership.
---

## Load Reactive Async State

### Problem

A value must reload when reactive input changes, abort stale work, retain the previous success while pending, and expose failures as state.

### Solution

Create a resource inside an isolated graph and forward its loader signal.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const userId = ripple.signal('42');
const user = ripple.resource(
  () => userId.value,
  async (id, { signal }) => {
    const response = await fetch(`/users/${id}`, { signal });
    if (!response.ok) throw new Error(`User request failed: ${response.status}`);
    return response.json() as Promise<{ id: string; name: string }>;
  },
  { name: 'user' },
);

const stop = ripple.effect(() => {
  const state = user.value;

  if (state.status === 'pending') console.log('Loading', state.previous);
  if (state.status === 'success') console.log(state.value);
  if (state.status === 'error') console.error(state.error, state.previous);
});

userId.value = '43';
user.reload();

// Keep the owner alive until the current request settles.
await new Promise<void>((resolve) => {
  if (user.peek().status !== 'pending') return resolve();
  const unsubscribe = user.subscribe(() => {
    if (user.peek().status === 'pending') return;
    unsubscribe();
    resolve();
  });
});
stop.dispose();
ripple.dispose();
```

### Pitfalls

- Construction starts loading immediately; forward the loader signal for transport cancellation.
- Source and loader failures appear in state, not `onError`.
- `reload()` returns `void`; observe completion through resource state.
- Disposed state remains readable, but `reload()` and new subscriptions throw `RippleDisposedError`.

Use Sourcerer for paginated collections and a dedicated server-state cache for shared keyed reads.

### Related

- [Usage Guide](../usage.md#load-async-resources)
- [API Reference](../api.md#resource-source-loader-options)
- [Sourcerer](/sourcerer/)
