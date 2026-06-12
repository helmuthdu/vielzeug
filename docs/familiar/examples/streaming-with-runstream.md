---
title: Streaming With runStream
description: Yield incremental results from a long-running task using runStream and async iteration.
---

## Streaming With runStream

### Problem

A task produces partial results over time (e.g., a chunked LLM response, a progressive image decode, a line-by-line CSV parse). Waiting for the full result before displaying anything causes noticeable latency.

### Solution

Use `runStream()`. The task function must return an async iterable. Each yielded value is forwarded to the caller immediately.

```ts
import { createWorker } from '@vielzeug/familiar';

type Input = { rows: string[]; batchSize: number };
type Chunk = { processed: number; total: number };

// Each call to the task processes rows in batches and yields progress
const worker = createWorker<Input, Chunk[]>(
  ({ rows, batchSize }) =>
    // Return value must be castable to TOutput for the type signature,
    // but at runtime the worker protocol transmits chunks individually.
    (async function* () {
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        // Do work on each batch
        for (const row of batch) {
          row.toUpperCase(); // placeholder
        }
        yield { processed: Math.min(i + batchSize, rows.length), total: rows.length };
      }
    })() as unknown as Chunk[],
);

const rows = Array.from({ length: 1000 }, (_, i) => `row-${i}`);

for await (const chunk of worker.runStream({ rows, batchSize: 100 })) {
  console.log(`Processed ${chunk.processed} / ${chunk.total}`);
  // Processed 100 / 1000
  // Processed 200 / 1000
  // ... 10 chunks total
}

worker.dispose();
```

### Early Exit

Break from the `for-await-of` loop to stop early. The slot is released cleanly — no leak, no stale timers.

```ts
for await (const chunk of worker.runStream({ rows, batchSize: 100 })) {
  if (chunk.processed >= 300) break; // stop after 300 rows
}
// Slot is free again immediately
```

### Pitfalls

- `runStream()` requires a free slot. If all slots are busy it throws `WorkerRuntimeError` on the first `next()` call — it cannot be queued. For queueable work, use `run()`.
- The type parameter `TOutput` must match the chunk type, not an array of chunks.
- `runStream()` is not supported by `createTestWorker` — test the underlying logic directly.

### Related

- [API Reference — runStream](../api.md#runstreaminput-options)
- [Usage Guide — Streaming](../usage.md#streaming-runstream)
