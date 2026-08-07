---
title: Priority Queue
description: Dispatch urgent module-worker jobs before lower-priority queued work.
---

## Priority Queue

### Problem

Urgent jobs need precedence after worker slots become free.

### Solution

Set `priority` for each submission. Higher values run first; equal values remain FIFO.

```ts
import { createWorker } from '@vielzeug/familiar';

type Job = { id: string };
type Result = Job;
const warmupJob = { id: 'warmup' };
const backgroundJob = { id: 'background' };
const criticalJob = { id: 'critical' };

const pool = createWorker<Job, Result>(new URL('./job.worker.ts', import.meta.url), { concurrency: 1 });

try {
  const blocker = pool.run(warmupJob);
  const background = pool.run(backgroundJob, { priority: 1 });
  const critical = pool.run(criticalJob, { priority: 10 });

  await Promise.all([blocker, background, critical]);
} finally {
  pool.dispose();
}
```

### Pitfalls

- Priority affects queued work only.
- Keep priority ranges small and documented.

### Related

- [Usage Guide](../usage.md)
