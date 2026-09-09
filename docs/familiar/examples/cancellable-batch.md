---
title: Cancellable Batch
description: Run an ordered progressive batch with shared failure and cancellation.
---

## Cancellable Batch

### Problem

Several worker tasks share one lifetime and should stop together when input becomes obsolete, one task fails, or the consumer stops reading.

### Solution

Use `runBatch()` with an application-owned signal. Familiar starts pool work concurrently, yields results in input order, and settles cancelled siblings before iteration ends.

```ts
import { createWorker, runBatch } from '@vielzeug/familiar';

const pool = createWorker<string, string>(new URL('./normalize.worker.ts', import.meta.url));
const controller = new AbortController();

try {
  for await (const value of runBatch(pool, ['a', 'b', 'c'], {
    signal: controller.signal,
    timeout: 5_000,
  })) {
    console.log(value);
  }
} finally {
  pool.dispose();
}
```

Provide a separate transfer list for each input when required:

```ts
for await (const result of runBatch(pool, buffers, {
  getTransferables: (buffer) => [buffer],
})) {
  consume(result);
}
```

### Pitfalls

- Each transferable can be detached only once; never return one shared transfer list for multiple inputs.
- Aborting active work terminates and lazily replaces occupied worker slots.
- Results are yielded in input order while later tasks continue running concurrently.
- The first failure aborts unfinished siblings and is rethrown.
- Breaking or calling `return()` cancels unfinished work and waits for settlement.
- Use `Promise.allSettled()` over individual `pool.run()` calls when failures should remain independent.

### Related

- [Migration](../migration.md)
- [Usage Guide](../usage.md)
- [API Reference](../api.md)
