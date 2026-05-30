---
title: 'Herald Examples — Handling disposal in async code'
description: 'Handling disposal in async code example for @vielzeug/herald.'
---

## Handling disposal in async code

### Problem

Your async function is awaiting a bus event when the bus gets disposed mid-flight. Without explicit handling, `wait()` rejects with `BusDisposedError` and the unhandled rejection crashes the caller.

### Solution

Use `BusDisposedError` for `instanceof` checks instead of string matching:

```ts
import { BusDisposedError } from '@vielzeug/herald';

async function waitForLogin(bus: Bus<AppEvents>) {
  try {
    const { userId } = await bus.wait('user:login', AbortSignal.timeout(10_000));
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
- A disposed bus silently drops all `emit()` calls. Code that expects post-disposal emissions to arrive will hang indefinitely.

### Related

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](../usage.md#framework-integration)
