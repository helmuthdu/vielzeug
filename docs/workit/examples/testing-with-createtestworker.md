---
title: 'Workit Examples — Testing with createTestWorker'
description: 'Testing with createTestWorker examples for workit.'
---

## Testing with createTestWorker

## Problem

Implement testing with createtestworker in a production-friendly way with `@vielzeug/workit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/workit` installed.

```ts
import { createTestWorker } from '@vielzeug/workit/test';
import { describe, expect, it } from 'vitest';

type Input = { a: number; b: number };
type Output = { sum: number; product: number };

describe('math worker', () => {
  it('computes sum and product', async () => {
    const worker = createTestWorker<Input, Output>(({ a, b }) => ({ sum: a + b, product: a * b }));

    expect(await worker.run({ a: 3, b: 4 })).toEqual({ sum: 7, product: 12 });
    expect(await worker.run({ a: 5, b: 6 })).toEqual({ sum: 11, product: 30 });

    expect(worker.calls).toHaveLength(2);
    expect(worker.calls[0]!.input).toEqual({ a: 3, b: 4 });
    expect(worker.calls[1]!.output.sum).toBe(11);

    worker.dispose();
  });

  it('rejects after terminate', async () => {
    const worker = createTestWorker<number, number>((n) => n);
    worker.dispose();
    await expect(worker.run(1)).rejects.toThrow('terminated');
  });
});
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
- [Fibonacci with Pool and Timeout](./fibonacci-with-pool-and-timeout.md)
