---
title: 'Workit Examples — Data Transformation Pipeline'
description: 'Data Transformation Pipeline examples for workit.'
---

## Data Transformation Pipeline

## Problem

Implement data transformation pipeline in a production-friendly way with `@vielzeug/workit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/workit` installed.

Apply CPU-bound transforms to large datasets without blocking the UI:

```ts
import { createWorker } from '@vielzeug/workit';

type Row = { id: number; values: number[] };
type Stats = { id: number; mean: number; stdDev: number };

const statsPool = createWorker<Row, Stats>(
  ({ id, values }) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return { id, mean, stdDev: Math.sqrt(variance) };
  },
  { size: 'auto' },
);

// Process 10 000 rows concurrently
const rows: Row[] = loadDataset();
const stats = await Promise.all(rows.map((row) => statsPool.run(row)));

statsPool.dispose();
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
- [Fibonacci with Pool and Timeout](./fibonacci-with-pool-and-timeout.md)
- [Image Processing](./image-processing.md)
