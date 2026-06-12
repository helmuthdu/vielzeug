---
title: 'Arsenal Examples — abortable'
description: 'abortable example for @vielzeug/arsenal.'
---

## abortable

### Problem

You have a long-running promise that has no built-in cancellation support and need to race it against an `AbortSignal` so it rejects when the signal fires.

### Solution

Use `abortable(promise, signal)` to wrap any promise and reject it when the signal aborts.

```ts
import { abortable, isAbortError } from '@vielzeug/arsenal';

const controller = new AbortController();

const task = abortable(
  fetch('/api/slow').then((r) => r.json()),
  controller.signal,
);

setTimeout(() => controller.abort(), 2_000);

try {
  const data = await task;
} catch (err) {
  if (isAbortError(err)) console.log('cancelled');
  else throw err;
}
```

### Pitfalls

- The wrapped promise continues running after cancellation — `abortable` only rejects the returned promise, it does not stop the underlying work. Pair with `fetch`'s `signal` option for true cancellation.
- If the signal is already aborted when `abortable` is called, the returned promise rejects immediately.

### Related

- [retry](./retry.md)
- [abortError](./abortError.md)
- [isAbortError](../typed/isAbortError.md)
