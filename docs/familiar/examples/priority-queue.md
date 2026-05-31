---
title: Priority Queue
description: Run high-priority tasks before queued lower-priority ones using the priority option.
---

## Priority Queue

### Problem

A pool processes a mix of critical and background tasks. Critical tasks should pre-empt background work and run as soon as a slot is free, regardless of submission order.

### Solution

Pass `priority` in `RunOptions`. Higher numbers run first. Equal priorities are FIFO.

```ts
import { createWorker } from '@vielzeug/familiar';

type Task = { id: string; payload: number };

const pool = createWorker<Task, number>(
  ({ payload }) => {
    // Simulate variable-cost work
    const end = Date.now() + payload;
    while (Date.now() < end) {}
    return payload;
  },
  { concurrency: 1 }, // single slot so priority ordering is visible
);

// Occupy the single slot
const blocker = pool.run({ id: 'warm-up', payload: 50 });

// Queue three tasks with different priorities
const low = pool.run({ id: 'background', payload: 10 }, { priority: 1 });
const high = pool.run({ id: 'critical', payload: 10 }, { priority: 100 });
const mid = pool.run({ id: 'normal', payload: 10 }, { priority: 10 });

// Execution order (after blocker): critical → normal → background
await Promise.all([blocker, low, high, mid]);

pool.dispose();
```

- Tasks at the same priority level are ordered FIFO within that priority.
- Default priority is `0`. Negative priorities are valid.
- Priority only affects queued tasks. A task that goes directly to a free slot is unaffected.

### Pitfalls

- Priority ordering requires a queue. If all tasks get a free slot immediately there is nothing to reorder.
- For strict deadlines, combine `priority` with `timeout` — a high-priority task can still time out while waiting if the pool is saturated.

### Related

- [API Reference — RunOptions](../api.md#runoptions)
- [Usage Guide — Priority Queue](../usage.md#priority-queue)
