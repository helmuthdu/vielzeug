---
title: 'Workit Examples — Fibonacci with Pool and Timeout'
description: 'Fibonacci with Pool and Timeout examples for workit.'
---

## Fibonacci with Pool and Timeout

## Problem

Implement fibonacci with pool and timeout in a production-friendly way with `@vielzeug/workit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/workit` installed.

Classic CPU-bound example with a safety timeout:

```ts
import { createWorker, WorkerError } from '@vielzeug/workit';

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
    if (error instanceof WorkerError && error.code === 'timeout') {
      console.error(`Fibonacci(${n}) exceeded 5 second timeout`);
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

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- Fibonacci values are computed concurrently across 4 worker threads.
- Long-running computations are interrupted after 5 seconds.
- Results are returned in the same order as inputs.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling timeout errors makes failures silent and hard to debug.
- Not disposing the pool after processing can prevent process exit.

## Related Recipes

- [Cancellable Batch](./cancellable-batch.md)
- [Data Transformation Pipeline](./data-transformation-pipeline.md)
- [Image Processing](./image-processing.md)
