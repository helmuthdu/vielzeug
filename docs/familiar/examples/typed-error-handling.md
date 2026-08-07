---
title: Typed Error Handling
description: Handle task, timeout, queue, termination, and runtime failures.
---

## Typed Error Handling

### Problem

Retry, load shedding, and shutdown require different worker failure handling.

### Solution

Branch on Familiar's typed errors.

```ts
import {
  FamiliarQueueFullError,
  FamiliarTaskError,
  FamiliarTimeoutError,
} from '@vielzeug/familiar';

function handleWorkerError(error: unknown): void {
  if (error instanceof FamiliarTimeoutError) console.log('retry later');
  else if (error instanceof FamiliarQueueFullError) console.log('shed load');
  else if (error instanceof FamiliarTaskError) throw error.cause;
  else throw error;
}

try {
  throw new FamiliarTimeoutError(500);
} catch (error) {
  handleWorkerError(error);
}
```

### Pitfalls

- `AbortError` represents caller cancellation, not Familiar failure.
- `FamiliarTaskError.cause` carries worker handler failure.

### Related

- [API Reference](../api.md)
