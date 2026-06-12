---
title: 'Arsenal Examples — sleep'
description: 'sleep example for @vielzeug/arsenal.'
---

## sleep

### Problem

You need a cancellable async delay — for example adding a minimum display time for a loading spinner or spacing retries.

### Solution

Use `sleep(ms, signal?)` to wait `ms` milliseconds. When a signal is provided, the sleep rejects early with an `AbortError` if the signal fires.

```ts
import { sleep } from '@vielzeug/arsenal';

await sleep(500); // wait 500 ms

// Cancellable sleep
const controller = new AbortController();
setTimeout(() => controller.abort(), 200);

try {
  await sleep(1_000, controller.signal);
} catch {
  // aborted after 200 ms
}
```

### Pitfalls

- Without a signal, `sleep` is not cancellable — the promise will always resolve after `ms` ms.
- The rejection value when aborted is an `AbortError` — check with `isAbortError`.

### Related

- [waitFor](./waitFor.md)
- [retry](./retry.md)
