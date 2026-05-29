---
title: 'Relay Examples — Awaiting a one-time event'
description: 'Awaiting a one-time event example for @vielzeug/relay.'
---

## Awaiting a one-time event

### Problem

You need to wait for a single event to fire before continuing — without polling, without a callback, and without coupling the waiting code to the emitting code directly.

### Solution

Use `wait()` for async coordination between modules:

```ts
// Module A: waits for auth before doing work
async function loadDashboard() {
  const { userId } = await appBus.wait('user:login', AbortSignal.timeout(10_000));
  const data = await fetchDashboard(userId);
  renderDashboard(data);
}

// Module B: triggers the event independently
function onAuthSuccess(user: User) {
  appBus.emit('user:login', { userId: user.id, email: user.email });
}
```


### Pitfalls

- If the event fires before `wait()` is called, `wait()` hangs forever — there is no replay buffer. Ensure the emitter always fires after the listener is registered.
- Calling `wait()` in a loop without awaiting creates multiple concurrent pending waits that all resolve with the same first emission. Await each one sequentially.
- If the bus is disposed before the event fires, `wait()` rejects with `BusDisposedError`. Always handle this rejection in async code that awaits events on a scoped bus.

### Related

- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](../usage.md#framework-integration)
- [Handling disposal in async code](./handling-disposal-in-async-code.md)
