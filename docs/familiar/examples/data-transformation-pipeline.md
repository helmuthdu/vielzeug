---
title: Data Transformation Pipeline
description: Process typed data in a module-worker pool.
---

## Data Transformation Pipeline

### Problem

Large CPU-bound transforms block rendering.

### Solution

Keep transform code in worker module and submit rows through a pool.

```ts
// stats.worker.ts
import { exposeTask } from '@vielzeug/familiar/protocol';

exposeTask((values: number[]) => values.reduce((total, value) => total + value, 0) / values.length);
```

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<number[], number>(new URL('./stats.worker.ts', import.meta.url), { concurrency: 'auto' });
const rows = [{ values: [1, 2, 3] }, { values: [4, 5, 6] }];

try {
  const means = await Promise.all(rows.map((row) => pool.run(row.values)));
  console.log(means);
} finally {
  pool.dispose();
}
```

### Pitfalls

- Choose explicit concurrency when application has other CPU work.
- Dispose owner-scoped pools after all submitted work settles.

### Related

- [Using Transferables](./using-transferables.md)
