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
import { createWorker } from '@vielzeug/workit';

const fibPool = createWorker<number, number>(
  function fib(n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  },
  { concurrency: 4, timeout: 5000 },
);

const inputs = [30, 32, 34, 36, 38, 40];
const results = await Promise.all(inputs.map((n) => fibPool.run(n)));
console.log(results); // [832040, 2178309, 5702887, 14930352, 39088169, 102334155]

fibPool.dispose();
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Cancellable Batch](./cancellable-batch.md)
- [Data Transformation Pipeline](./data-transformation-pipeline.md)
- [Image Processing](./image-processing.md)
