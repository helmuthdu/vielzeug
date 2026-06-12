---
title: 'Arsenal Examples — isAbortError'
description: 'isAbortError example for @vielzeug/arsenal.'
---

## isAbortError

### Problem

You need to distinguish an abort-caused rejection from other errors — for example silently ignoring cancellations while reporting real failures.

### Solution

Use `isAbortError(value)` to check whether an error has `name === 'AbortError'`.

```ts
import { isAbortError } from '@vielzeug/arsenal';

try {
  await abortableTask;
} catch (err) {
  if (isAbortError(err)) return; // cancelled — ignore
  throw err; // real failure — re-throw
}
```

### Pitfalls

- Checks `error.name === 'AbortError'`, not `instanceof DOMException`. Works for `DOMException` and any `Error` subclass with that name.

### Related

- [abortable](../async/abortable.md)
- [abortError](../async/abortError.md)
