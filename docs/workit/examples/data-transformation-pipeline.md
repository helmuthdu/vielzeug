---
title: 'Workit Examples — Data Transformation Pipeline'
description: 'Data Transformation Pipeline examples for workit.'
---

## Data Transformation Pipeline

### Problem

You need to apply a sequence of CPU-bound transforms to a large dataset — parsing, filtering, aggregating — without blocking the main thread and freezing the UI.

### Solution

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

### Related

- [Image Processing](./image-processing.md)
- [Using Transferables](./using-transferables.md)
- [Cancellable Batch](./cancellable-batch.md)
- [Async Workflows (Stateit)](/stateit/examples/pattern-nextvalue-in-async-workflows)
