---
title: 'Worker Examples — Data Transformation Pipeline'
description: 'Data Transformation Pipeline example for @vielzeug/worker.'
---

## Data Transformation Pipeline

### Problem

You need to apply a sequence of CPU-bound transforms to a large dataset — parsing, filtering, aggregating — without blocking the main thread and freezing the UI.

### Solution

Apply CPU-bound transforms to large datasets without blocking the UI:

```ts
import { createWorker } from '@vielzeug/worker';

type Row = { id: number; values: number[] };
type Stats = { id: number; mean: number; stdDev: number };

const statsPool = createWorker<Row, Stats>(
  ({ id, values }) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return { id, mean, stdDev: Math.sqrt(variance) };
  },
  { concurrency: 'auto' },
);

async function processDataset(rows: Row[]): Promise<Stats[]> {
  try {
    const stats = await Promise.all(rows.map((row) => statsPool.run(row)));
    return stats;
  } finally {
    statsPool.dispose();
  }
}
```

### Pitfalls

- The example calls `statsPool.dispose()` inside `processDataset`'s `finally` block, making the pool single-use. Calling `processDataset` a second time will reject immediately with `WorkerError` code `'terminated'`. Create the pool at module level and dispose at app shutdown if you need to call the function more than once.
- Using `concurrency: 'auto'` saturates all CPU threads, which may degrade other concurrent operations on the page. Set an explicit count when other workers are running in parallel.

### Related

- [Image Processing](./image-processing.md)
- [Using Transferables](./using-transferables.md)
- [Cancellable Batch](./cancellable-batch.md)
