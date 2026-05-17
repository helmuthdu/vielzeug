---
title: 'Workit Examples — Fibonacci with Pool and Timeout'
description: 'Fibonacci with Pool and Timeout examples for workit.'
---

## Fibonacci with Pool and Timeout

### Problem

A recursive CPU-bound computation (e.g., Fibonacci) can run arbitrarily long with a large input. You need to run it off the main thread and terminate it if it exceeds a time budget.

### Solution

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
