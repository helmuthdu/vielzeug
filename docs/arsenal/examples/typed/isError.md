---
title: 'Arsenal Examples — isError'
description: 'isError example for @vielzeug/arsenal.'
---

## isError

### Problem

You need to distinguish `Error` instances from other thrown values — TypeScript `catch` clauses type `err` as `unknown`.

### Solution

Use `isError(value)` to narrow to `Error`.

```ts
import { isError } from '@vielzeug/arsenal';

try {
  riskyOperation();
} catch (err) {
  if (isError(err)) {
    console.error(err.message);
  }
}
```

### Related

- [isAbortError](./isAbortError.md)
- [attempt](../async/attempt.md)
