---
title: 'Arsenal Examples — abortError'
description: 'abortError example for @vielzeug/arsenal.'
---

## abortError

### Problem

You need to extract an abort reason from a signal or construct a standard `AbortError` `DOMException` — for example propagating cancellation in a custom async helper.

### Solution

Use `abortError(signal?, message?)` to get the signal's `reason` if set, or create a new `DOMException` with the optional fallback message.

```ts
import { abortError } from '@vielzeug/arsenal/async';

// Construct a standard AbortError
throw abortError(undefined, 'Request cancelled');

// Propagate the signal's own reason
async function runWithSignal(signal: AbortSignal) {
  if (signal.aborted) throw abortError(signal);
  // ... do work
}
```

### Pitfalls

- When a signal has no explicit `reason`, the returned error is a plain `DOMException` with name `'AbortError'`. Check with `isAbortError` rather than `instanceof DOMException`.

### Related

- [abortable](./abortable.md)
- [isAbortError](../typed/isAbortError.md)
