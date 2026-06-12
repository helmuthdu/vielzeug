---
title: Typed Error Handling
description: Distinguish timeout, task, queue-full, and termination errors using instanceof checks on typed error classes.
---

## Typed Error Handling

### Problem

Generic `catch (err)` blocks can't distinguish between a task that threw an application error, a task that timed out, a queue that filled up, or a pool that was disposed. Each scenario requires a different recovery strategy.

### Solution

Every failure reason has a dedicated typed error class with context-specific fields. Use `instanceof` to branch on the exact cause.

```ts
import {
  createWorker,
  WorkerQueueFullError,
  WorkerRuntimeError,
  WorkerTaskError,
  WorkerTerminatedError,
  WorkerTimeoutError,
} from '@vielzeug/familiar';

type ProcessInput = { id: string; data: unknown };
type ProcessOutput = { id: string; status: 'ok' };

const pool = createWorker<ProcessInput, ProcessOutput>(
  ({ id, data }) => {
    if (!data) throw new RangeError(`Missing data for item ${id}`);
    return { id, status: 'ok' };
  },
  {
    concurrency: 2,
    maxQueue: 50,
    timeout: 5000,
  },
);

async function processItem(input: ProcessInput): Promise<ProcessOutput | null> {
  try {
    return await pool.run(input);
  } catch (err) {
    if (err instanceof WorkerTimeoutError) {
      // .timeoutMs tells you the configured limit
      console.warn(`[${input.id}] Timed out after ${err.timeoutMs}ms — will retry`);
      return null; // signal caller to retry
    }

    if (err instanceof WorkerTaskError) {
      // .cause is the original error thrown inside the task function
      const cause = err.cause instanceof Error ? err.cause : new Error(String(err.cause));
      console.error(`[${input.id}] Task error: ${cause.message}`);
      throw err; // propagate application errors
    }

    if (err instanceof WorkerQueueFullError) {
      // .maxQueue is the configured cap
      console.error(`Queue exhausted (max ${err.maxQueue}) — shedding load`);
      return null;
    }

    if (err instanceof WorkerTerminatedError) {
      // Pool was disposed during in-flight task
      console.error('Pool disposed — shutting down');
      throw err;
    }

    if (err instanceof WorkerRuntimeError) {
      // Worker slot crashed (uncaught error inside Worker thread)
      console.error('Worker runtime error:', err.message);
      throw err;
    }

    throw err; // unknown error — re-throw
  }
}

// Usage
const results = await Promise.allSettled(items.map((item) => processItem(item)));

pool.dispose();
```

### Error Hierarchy

| Class                       | Code                | Extra fields         |
| --------------------------- | ------------------- | -------------------- |
| `WorkerTimeoutError`        | `'timeout'`         | `.timeoutMs: number` |
| `WorkerTaskError`           | `'task'`            | `.cause: unknown`    |
| `WorkerQueueFullError`      | `'queue_full'`      | `.maxQueue: number`  |
| `WorkerTerminatedError`     | `'terminated'`      | —                    |
| `WorkerRuntimeError`        | `'worker'`          | `.cause?: unknown`   |
| `WorkerInvalidOptionsError` | `'invalid_options'` | —                    |

All extend `WorkerError` — use it as a catch-all when you only need `err.code`:

```ts
import { WorkerError } from '@vielzeug/familiar';

try {
  await pool.run(input);
} catch (err) {
  if (err instanceof WorkerError) {
    metrics.increment(`worker.error.${err.code}`);
  }
}
```

### Pitfalls

- Task errors are wrapped in `WorkerTaskError`. Check `err.cause` (not `err.message`) for the original `Error` instance.
- `DOMException` with name `'AbortError'` indicates a signal-cancelled task — it is not a `WorkerError` subclass.
- `createTestWorker` does not wrap errors in `WorkerError` — task errors propagate unwrapped for better test DX.

### Related

- [API Reference — Error Model](../api.md#error-model)
- [Usage Guide — Typed Errors](../usage.md#typed-errors)
