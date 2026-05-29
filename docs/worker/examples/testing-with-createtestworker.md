---
title: 'Worker Examples — Testing with createTestWorker'
description: 'Testing with createTestWorker examples for worker.'
---

## Testing with createTestWorker

### Problem

You want to unit-test the logic inside a worker task function without spawning real Web Workers or relying on the browser's `Worker` API — running the task synchronously in the test process.

### Solution

```ts
import { createTestWorker } from '@vielzeug/worker/test';
import { describe, expect, it } from 'vitest';

type Input = { a: number; b: number };
type Output = { sum: number; product: number };

describe('math worker', () => {
  it('computes sum and product', async () => {
    const worker = createTestWorker<Input, Output>(({ a, b }) => ({ sum: a + b, product: a * b }));

    expect(await worker.run({ a: 3, b: 4 })).toEqual({ sum: 7, product: 12 });
    expect(await worker.run({ a: 5, b: 6 })).toEqual({ sum: 11, product: 30 });

    // Inspect call history to verify behavior
    expect(worker.calls).toHaveLength(2);
    expect(worker.calls[0]!.input).toEqual({ a: 3, b: 4 });
    expect(worker.calls[1]!.output.sum).toBe(11);

    worker.dispose();
  });

  it('rejects with error when task fails', async () => {
    const worker = createTestWorker<number, number>((n) => {
      if (n < 0) throw new Error('negative input');
      return n * 2;
    });

    const result = await worker.run(5);
    expect(result).toBe(10);

    await expect(worker.run(-1)).rejects.toThrow('negative input');
    expect(worker.calls).toHaveLength(1); // Failed calls are not recorded
    worker.dispose();
  });

  it('rejects after terminate', async () => {
    const worker = createTestWorker<number, number>((n) => n);
    worker.dispose();
    await expect(worker.run(1)).rejects.toThrow('terminated');
  });
});
```

- Call history can be inspected for verification and debugging.
- Errors are properly caught and tested.

### Pitfalls

- `createTestWorker` runs the task function synchronously in the test process. If your task relies on browser-only APIs (e.g., `OffscreenCanvas`, `ImageData`), those are unavailable in a Node.js test environment.
- `createTestWorker` does not enforce Worker serialization constraints. A task that passes non-serializable values (functions, class instances) will work in tests but fail at runtime with a real Worker.
- Timeouts configured on the real `WorkerPool` are not honoured by `createTestWorker`. Test timeout behavior with a real worker and `vi.useFakeTimers` instead.

### Related

- [Cancellable Batch](./cancellable-batch.md)
- [Data Transformation Pipeline](./data-transformation-pipeline.md)
- [Fibonacci with Pool and Timeout](./fibonacci-with-pool-and-timeout.md)
