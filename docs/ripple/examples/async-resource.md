---
title: Ripple Examples — Async Resource
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
    return response.json() as Promise<{ id: string; name: string }>;
  },
  { name: 'user' },
);

const stop = ripple.effect(() => {
  const state = user.value;

  if (state.status === 'pending') renderPending(state.previous);
  if (state.status === 'success') renderUser(state.value);
  if (state.status === 'error') renderError(state.error, state.previous);
});

userId.value = '43';
user.reload();

stop.dispose();
user.dispose();
ripple.dispose();
```

### Pitfalls

- Construction starts loading immediately.
- The loader must forward or observe its signal for transport-level cancellation.
- `reload()` returns `void`; observe completion through resource state.
- Disposed state remains readable, but `reload()` and new subscriptions throw `RippleDisposedResourceError`.
- Use Sourcerer for paginated collections or shared keyed server-query caching.

### Related

- [Usage Guide](../usage.md#load-async-resources)
- [API Reference](../api.md#resource-source-loader-options)
- [Sourcerer](/sourcerer/)
