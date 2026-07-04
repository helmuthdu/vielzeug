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
  FamiliarQueueFullError,
  FamiliarRuntimeError,
  FamiliarTaskError,
  FamiliarTerminatedError,
  FamiliarTimeoutError,
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
    if (err instanceof FamiliarTimeoutError) {
      // .timeoutMs tells you the configured limit
      console.warn(`[${input.id}] Timed out after ${err.timeoutMs}ms — will retry`);
      return null; // signal caller to retry
    }

    if (err instanceof FamiliarTaskError) {
      // .cause is the original error thrown inside the task function
      const cause = err.cause instanceof Error ? err.cause : new Error(String(err.cause));
      console.error(`[${input.id}] Task error: ${cause.message}`);
      throw err; // propagate application errors
    }

    if (err instanceof FamiliarQueueFullError) {
      // .maxQueue is the configured cap
      console.error(`Queue exhausted (max ${err.maxQueue}) — shedding load`);
      return null;
    }

    if (err instanceof FamiliarTerminatedError) {
      // Pool was disposed during in-flight task
      console.error('Pool disposed — shutting down');
      throw err;
    }

    if (err instanceof FamiliarRuntimeError) {
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

| Class                         | Extra fields         |
| ----------------------------- | --------------------- |
| `FamiliarTimeoutError`        | `.timeoutMs: number` |
| `FamiliarTaskError`           | `.cause: unknown`    |
| `FamiliarQueueFullError`      | `.maxQueue: number`  |
| `FamiliarTerminatedError`     | —                    |
| `FamiliarRuntimeError`        | `.cause?: unknown`   |
| `FamiliarInvalidOptionsError` | —                    |

All extend `FamiliarError` — use it as a catch-all when you only need the specific class name:

```ts
import { FamiliarError } from '@vielzeug/familiar';

try {
  await pool.run(input);
} catch (err) {
  if (err instanceof FamiliarError) {
    // err.name is the specific subclass, e.g. 'FamiliarTimeoutError'
    metrics.increment(`worker.error.${err.name}`);
  }
}
```

### Pitfalls

- Task errors are wrapped in `FamiliarTaskError`. Check `err.cause` (not `err.message`) for the original `Error` instance.
- `DOMException` with name `'AbortError'` indicates a signal-cancelled task — it is not a `FamiliarError` subclass.
- `createTestWorker` does not wrap errors in `FamiliarError` by default — task errors propagate unwrapped for better test DX. Set `{ errorWrapping: true }` to mirror real-worker behavior (errors are then wrapped in `FamiliarTaskError` with `.cause` preserved).

### Related

- [API Reference — Error Model](../api.md#error-model)
- [Usage Guide — Typed Errors](../usage.md#typed-errors)
