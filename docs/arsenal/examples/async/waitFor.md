---
title: 'Arsenal Examples — waitFor'
description: 'waitFor example for @vielzeug/arsenal.'
---

## waitFor

### Problem

You need to poll until a condition becomes true — for example waiting for a DOM element to appear, a flag to be set, or a resource to become available.

### Solution

Use `waitFor(condition, options?)` to poll `condition` until it returns `true` or the `timeout` fires.

```ts
import { waitFor } from '@vielzeug/arsenal';

// Wait for a DOM element
await waitFor(() => document.querySelector('#app') !== null, { timeout: 3_000 });

// Wait for a flag
let ready = false;
setTimeout(() => { ready = true; }, 500);
await waitFor(() => ready);
```

#### With AbortSignal

```ts
import { waitFor } from '@vielzeug/arsenal';

const controller = new AbortController();
setTimeout(() => controller.abort(), 1_000);

await waitFor(() => isServiceReady(), {
  timeout: 5_000,
  signal: controller.signal,
});
```

### Pitfalls

- Throws a `TimeoutError` (or `AbortError`) when the condition never becomes true within the timeout or the signal fires.
- The condition function is called on a polling interval — avoid expensive operations inside it.

### Related

- [sleep](./sleep.md)
- [abortable](./abortable.md)
