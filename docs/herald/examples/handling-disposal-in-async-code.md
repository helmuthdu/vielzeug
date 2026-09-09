---
title: 'Herald Examples — Handling disposal in async code'
description: 'Handling disposal in async code example for @vielzeug/herald.'
---

## Handling disposal in async code

### Problem

Your async function is awaiting a bus event when the bus gets disposed mid-flight. Without explicit handling, `wait()` rejects with `BusDisposedError` and can become an unhandled rejection.

### Solution

Use `BusDisposedError` for `instanceof` checks instead of string matching:

```ts
import { BusDisposedError } from '@vielzeug/herald';

async function waitForLogin(bus: Bus<AppEvents>) {
  try {
    const { userId } = await bus.wait('user:login', { signal: AbortSignal.timeout(10_000) });
    return userId;
  } catch (err) {
    if (err instanceof BusDisposedError) return null; // bus torn down — graceful exit
    throw err; // timeout or unexpected error — propagate
  }
}
```

### Pitfalls

- Checking `err.message === 'Bus is disposed'` instead of `err instanceof BusDisposedError` breaks when the message changes or the class is minified. Always use `instanceof`.
- Catching `BusDisposedError` without re-throwing other errors silently swallows unexpected failures. Only catch the specific class and let everything else propagate.
- A disposed bus silently drops `emit()` calls, while `wait()` and `waitAny()` reject immediately with the disposal reason.

### Related

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Observe listener failures](./custom-error-boundary.md)
- [Dispose the bus](../usage.md#dispose-the-bus)
