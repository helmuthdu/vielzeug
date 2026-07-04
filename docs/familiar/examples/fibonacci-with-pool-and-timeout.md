---
title: 'Familiar Examples — Fibonacci with Pool and Timeout'
description: 'Fibonacci with Pool and Timeout example for @vielzeug/familiar.'
---

## Fibonacci with Pool and Timeout

### Problem

A recursive CPU-bound computation (e.g., Fibonacci) can run arbitrarily long with a large input. You need to run it off the main thread and terminate it if it exceeds a time budget.

### Solution

Classic CPU-bound example with a safety timeout:

```ts
import { createWorker, FamiliarTimeoutError } from '@vielzeug/familiar';

const fibPool = createWorker<number, number>(
  function fib(n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  },
  { concurrency: 4, timeout: 5000 },
);

async function computeFibonacci(n: number): Promise<number | null> {
  try {
    return await fibPool.run(n);
  } catch (error) {
    if (error instanceof FamiliarTimeoutError) {
      console.error(`Fibonacci(${n}) exceeded ${error.timeoutMs}ms timeout`);
      return null;
    }
    throw error;
  }
}

// Usage
const inputs = [30, 32, 34, 36, 38, 40];
const results = await Promise.all(inputs.map((n) => computeFibonacci(n)));
console.log(results);

fibPool.dispose();
```

### Pitfalls

- Set `timeout` based on the largest input you expect, not an arbitrary constant. Fibonacci is exponential — `fib(40)` can take several seconds on a slow device, so a 1-second timeout would silently discard valid results.
- Avoid passing an arrow function that references a helper defined outside `createWorker`. The function is serialized via `.toString()` and runs in an isolated scope, so outer-scope names are `undefined` at runtime. Keep all helpers inside the task function body.

### Related

- [Cancellable Batch](./cancellable-batch.md) — abort a group of tasks when results are no longer needed
- [Data Transformation Pipeline](./data-transformation-pipeline.md) — processing multiple inputs across a pool
