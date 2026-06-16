---
title: Familiar — API Reference
description: Complete API reference for @vielzeug/familiar.
---

[[toc]]

## API At a Glance

| Symbol                 | Purpose                                          | Execution mode | Common gotcha                                   |
| ---------------------- | ------------------------------------------------ | -------------- | ----------------------------------------------- |
| `createWorker()`       | Create an inline worker or pool                  | Sync           | Task functions must be entirely self-contained  |
| `createModuleWorker()` | Create a pool from a real module-worker file     | Sync           | Worker file must implement the message protocol |
| `worker.run()`         | Execute a task in a Worker                       | Async          | Pass transferables for large buffers            |
| `worker.runStream()`   | Execute a streaming task, yield partial results  | Async iterator | Requires a free slot — cannot be queued         |
| `worker.batch()`       | Run multiple inputs, yield results               | Async iterator | Cancels remaining tasks on first failure        |
| `worker.group()`       | Submit related tasks that share an abort + drain | Sync           | `drain()` only waits for tasks added so far     |
| `createTestWorker()`   | Run tasks in-process for tests                   | Async          | Does not enforce serialization constraints      |

## Package Entry Point

| Import                        | Purpose                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `@vielzeug/familiar`          | All public exports and types                                                                                         |
| `@vielzeug/familiar/testing`  | Test utilities (not in main bundle)                                                                                  |
| `@vielzeug/familiar/protocol` | `handleMessages()`, `handleStreamMessages()` helpers + `PROTOCOL_VERSION` constant for module worker implementations |

## Package Exports

```ts
// Main entry
export {
  createWorker,
  createModuleWorker,
  task,
  WorkerError,
  WorkerInvalidOptionsError,
  WorkerQueueFullError,
  WorkerRuntimeError,
  WorkerTaskError,
  WorkerTerminatedError,
  WorkerTimeoutError,
} from '@vielzeug/familiar';

export type {
  BatchOptions,
  GroupOptions,
  RunOptions,
  TaskFn,
  TaskGroup,
  WorkerErrorCode,
  WorkerHandle,
  WorkerOptions,
  WorkerStatus,
} from '@vielzeug/familiar';

// Test utilities
export { createTestWorker } from '@vielzeug/familiar/testing';
export type { TestWorkerHandle, TestWorkerOptions } from '@vielzeug/familiar/testing';

// Protocol helpers (module worker implementations only)
export { handleMessages, handleStreamMessages, PROTOCOL_VERSION } from '@vielzeug/familiar/protocol';
```

## Types

### `TaskFn`

```ts
type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;
```

The signature for the task function passed to `createWorker`. Accepts a single typed input and returns a value or a Promise.

::: warning Self-contained functions only
The function is serialized via `.toString()` and runs in an isolated Worker scope. It cannot reference variables, imports, or helpers from the outer module.
:::

---

### `WorkerStatus`

```ts
type WorkerStatus = 'idle' | 'running' | 'terminated';
```

| Value          | Meaning                                |
| -------------- | -------------------------------------- |
| `'idle'`       | All worker slots are free              |
| `'running'`    | One or more slots are executing a task |
| `'terminated'` | `dispose()` was called                 |

---

### `WorkerOptions`

```ts
type WorkerOptions = {
  concurrency?: number | 'auto';
  heartbeatWindow?: number;
  maxQueue?: number;
  onFull?: 'reject' | 'wait';
  onSlotError?: (error: WorkerRuntimeError, restart: () => void) => void;
  timeout?: number;
};
```

| Field             | Type                       | Default    | Description                                                                                                                                                                                                                         |
| ----------------- | -------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `concurrency`     | `number \| 'auto'`         | `1`        | Worker slot count (1–512). `'auto'` uses `navigator.hardwareConcurrency`. Throws `WorkerInvalidOptionsError` if out of range.                                                                                                       |
| `heartbeatWindow` | `number`                   | —          | Watchdog window in ms applied to every task in the pool. If no heartbeat arrives within this window, the task is killed with `WorkerTimeoutError`. Inline workers send heartbeats automatically at `heartbeatWindow / 2` intervals. |
| `maxQueue`        | `number`                   | unlimited  | Maximum queued tasks. Exceeding this rejects with `WorkerQueueFullError` (or suspends when `onFull='wait'`).                                                                                                                        |
| `onFull`          | `'reject' \| 'wait'`       | `'reject'` | Behavior when queue is full. `'wait'` suspends the caller until a slot opens (natural backpressure).                                                                                                                                |
| `onSlotError`     | `(error, restart) => void` | —          | Called when a Worker slot encounters an unhandled runtime error. `restart()` pre-warms a replacement Worker.                                                                                                                        |
| `timeout`         | `number`                   | —          | Pool-level task timeout in milliseconds. Can be overridden per-run via `RunOptions.timeout`.                                                                                                                                        |

---

### `RunOptions`

```ts
type RunOptions = {
  priority?: number;
  signal?: AbortSignal;
  timeout?: number;
  transferables?: Transferable[];
};
```

| Field           | Type             | Default | Description                                                                                  |
| --------------- | ---------------- | ------- | -------------------------------------------------------------------------------------------- |
| `priority`      | `number`         | `0`     | Scheduling priority. Higher values run first when tasks queue up. Equal priorities are FIFO. |
| `signal`        | `AbortSignal`    | —       | Cancel a queued task before it starts. In-flight tasks cannot be interrupted.                |
| `timeout`       | `number`         | —       | Per-run timeout in ms. Overrides `WorkerOptions.timeout` for this task.                      |
| `transferables` | `Transferable[]` | `[]`    | Objects to move (not copy) to the Worker thread.                                             |

::: tip Heartbeat window is pool-level
`heartbeatWindow` is set on `WorkerOptions`, not per-run. All tasks in the pool share the same heartbeat watchdog window.
:::

---

### `BatchOptions`

```ts
type BatchOptions = Omit<RunOptions, 'signal'> & {
  ordered?: boolean;
};
```

Extends `RunOptions` (minus `signal`) with:

- `ordered`: `boolean`, default `true`. When `false`, results are yielded as each task completes (unordered, maximum throughput).

---

### `WorkerHandle`

`WorkerHandle` is a flat interface — all capabilities on one type, no need to reference sub-types:

```ts
interface WorkerHandle<TInput, TOutput> {
  // Lifecycle
  close(timeoutMs?: number): Promise<void>;
  dispose(): void;
  prime(): Promise<void>;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  readonly status: WorkerStatus;
  [Symbol.dispose](): void;
  [Symbol.asyncDispose](): Promise<void>;

  // Metrics
  readonly active: number;
  readonly completed: number;
  readonly concurrency: number;
  readonly failed: number;
  readonly queued: number;

  // Execution
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  runStream(input: TInput, options?: Omit<RunOptions, 'signal'>): AsyncIterable<TOutput>;
  batch(inputs: TInput[], options?: BatchOptions): AsyncIterable<TOutput>;
  group(name?: string, options?: GroupOptions): TaskGroup<TInput, TOutput>;
}
```

---

### `GroupOptions`

```ts
type GroupOptions = {
  signal?: AbortSignal;
};
```

| Field    | Type          | Description                                                                                      |
| -------- | ------------- | ------------------------------------------------------------------------------------------------ |
| `signal` | `AbortSignal` | When aborted, the group is aborted automatically. Composable with `WorkerHandle.disposalSignal`. |

---

### `TaskGroup`

```ts
type TaskGroup<TInput, TOutput> = {
  abort(reason?: unknown): void;
  drain(): Promise<PromiseSettledResult<TOutput>[]>;
  run(input: TInput, options?: Omit<RunOptions, 'signal'>): Promise<TOutput>;
  readonly name: string | undefined;
  readonly pending: number;
  readonly size: number;
};
```

Returned by `worker.group()`. See [`group()`](#group) below.

| Member    | Description                                                              |
| --------- | ------------------------------------------------------------------------ |
| `abort`   | Cancels all pending tasks. In-flight tasks run to completion.            |
| `drain`   | Resolves with `PromiseSettledResult[]` for every task submitted so far.  |
| `name`    | Optional name passed to `group(name)`, useful for logging and debugging. |
| `pending` | Tasks not yet settled — decrements as tasks complete.                    |
| `size`    | Total tasks ever submitted to this group (never decrements).             |

---

### `task(fn)` — optional validator

```ts
function task<TInput, TOutput>(fn: TaskFn<TInput, TOutput>): TaskFn<TInput, TOutput>;
```

Optional helper that validates `fn` is safe to serialize before passing to `createWorker`. `createWorker` accepts any `TaskFn` directly — `task()` exists only to catch the common mistake of passing a bound or native function.

Throws `WorkerInvalidOptionsError` if `fn` is a bound or native function.

```ts
import { createWorker, task } from '@vielzeug/familiar';

// task() is optional — both forms are equivalent:
const worker1 = createWorker((n: number) => n * 2);
const worker2 = createWorker(task((n: number) => n * 2)); // validates fn is not native/bound

// Catches mistakes at construction time:
createWorker(task(Math.sqrt)); // throws WorkerInvalidOptionsError
```

## createWorker

```ts
function createWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: WorkerOptions,
): WorkerHandle<TInput, TOutput>;
```

Creates a typed worker or pool that executes `fn` in a Web Worker. `fn` is serialized via `.toString()` and runs in an isolated scope — it cannot close over module-level variables.

Safe to call in any runtime — errors from Worker unavailability surface on the first `run()` call.

### Parameters

| Parameter | Type                      | Description                                                                                                              |
| --------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `fn`      | `TaskFn<TInput, TOutput>` | Task function. Serialized via `.toString()`, runs in an isolated scope. Use `task()` to validate it is not native/bound. |
| `options` | `WorkerOptions`           | Optional pool configuration.                                                                                             |

Returns `WorkerHandle<TInput, TOutput>`.

```ts
import { createWorker, task } from '@vielzeug/familiar';

// Single worker (concurrency=1) — pass fn directly:
const worker = createWorker((text: string) => text.toUpperCase());

// Pool of 4 with a 3 s timeout:
const pool = createWorker((n: number) => n ** 2, { concurrency: 4, timeout: 3000 });

// CPU-count concurrency:
const autoPool = createWorker((n: number) => n * 2, { concurrency: 'auto' });
```

## createModuleWorker

```ts
function createModuleWorker<TInput, TOutput>(url: URL | string, options?: WorkerOptions): WorkerHandle<TInput, TOutput>;
```

Creates a pool where each slot is a `{ type: 'module' }` Web Worker loaded from `url`. The Worker file is a normal ES module — it can use imports, top-level await, and module-scope helpers.

### Parameters

| Parameter | Type            | Description                                                                             |
| --------- | --------------- | --------------------------------------------------------------------------------------- |
| `url`     | `URL \| string` | URL of the worker module. Use `new URL('./my-worker.ts', import.meta.url)` in bundlers. |
| `options` | `WorkerOptions` | Optional pool configuration (same as `createWorker`).                                   |

### Worker File Protocol

The module must handle `postMessage` with this schema:

```ts
// Incoming from host:
{ id: number; input: TInput; stream?: boolean }

// Reply with success:
self.postMessage({ id, result: TOutput });

// Reply with error (any Error is structured-cloned natively — no manual serialization needed):
self.postMessage({ id, error });

// Streaming — send chunks then a final result:
self.postMessage({ id, chunk: TOutput });    // one or more chunks
self.postMessage({ id, result: undefined }); // signals end of stream

// Heartbeat (sent automatically by inline workers; module workers must send manually):
self.postMessage({ id, heartbeat: true });   // sent at heartbeatWindow / 2 ms
```

### `@vielzeug/familiar/protocol`

Import from the `/protocol` sub-path in module worker files to implement the message protocol without boilerplate.

#### `handleMessages(fn)`

```ts
function handleMessages<TInput, TOutput>(fn: (input: TInput) => TOutput | Promise<TOutput>): void;
```

Sets up `self.onmessage` to handle the familiar host↔worker protocol. Errors from `fn` are caught and forwarded as structured `{ id, error }` messages — no manual try/catch needed.

```ts
// my-worker.ts — zero boilerplate:
import { handleMessages } from '@vielzeug/familiar/protocol';

handleMessages(async (input: { a: number; b: number }) => input.a + input.b);

// main.ts
import { createModuleWorker } from '@vielzeug/familiar';

const pool = createModuleWorker<{ a: number; b: number }, number>(new URL('./my-worker.ts', import.meta.url), {
  concurrency: 4,
});
```

#### `handleStreamMessages(fn)`

```ts
function handleStreamMessages<TInput, TOutput>(
  fn: (input: TInput) => AsyncIterable<TOutput> | Promise<AsyncIterable<TOutput>>,
): void;
```

Sets up `self.onmessage` for a module worker that **yields streaming results**. The function must return an `AsyncIterable<TOutput>` (e.g. an `async function*`). Each yielded value is forwarded as a `{ id, chunk }` message, followed by `{ id, result: undefined }` to signal completion — the same protocol used by inline blob workers.

```ts
// my-streaming-worker.ts
import { handleStreamMessages } from '@vielzeug/familiar/protocol';

handleStreamMessages(async function* (n: number) {
  for (let i = 0; i < n; i++) {
    yield i;
  }
});

// main.ts
const pool = createModuleWorker<number, number>(new URL('./my-streaming-worker.ts', import.meta.url));

for await (const chunk of pool.runStream(5)) {
  console.log(chunk); // 0, 1, 2, 3, 4
}
```

#### `PROTOCOL_VERSION`

```ts
export const PROTOCOL_VERSION: 2;
```

Numeric constant for the current host↔worker message protocol. Include in a startup message (`self.postMessage({ protocol: PROTOCOL_VERSION })`) as a debugging convention to detect version skew from cached module workers. The host does **not** validate this value at runtime.

## WorkerHandle Members

### `run(input, options?)`

`run(input: TInput, options?: RunOptions): Promise<TOutput>`

Dispatches a task to the next available slot. If all slots are busy, the task enters the queue.

**Rejects with:**

| Error                       | Code           | Condition                                                          |
| --------------------------- | -------------- | ------------------------------------------------------------------ |
| `WorkerQueueFullError`      | `'queue_full'` | `maxQueue` is set and the queue is at capacity (`onFull='reject'`) |
| `WorkerTimeoutError`        | `'timeout'`    | Task exceeded its timeout or heartbeat window                      |
| `WorkerTerminatedError`     | `'terminated'` | `dispose()` was called before or during the task                   |
| `WorkerTaskError`           | `'task'`       | Task function threw an error                                       |
| `WorkerRuntimeError`        | `'worker'`     | Worker runtime or setup failure                                    |
| `DOMException (AbortError)` | —              | Provided `signal` was aborted before the task started              |

---

### `runStream(input, options?)`

`runStream(input: TInput, options?: Omit<RunOptions, 'signal'>): AsyncIterable<TOutput>`

Runs a streaming task and yields partial results as they arrive. The task function must return an async iterable; each yielded value is forwarded as a chunk.

::: warning Requires a free slot — throws synchronously
`runStream()` cannot be queued. If all slots are busy it **throws `WorkerRuntimeError` synchronously** at the call site. Use `run()` for queueable work.
:::

```ts
import { createWorker, task } from '@vielzeug/familiar';

const counter = task<number, number[]>(
  (n) =>
    (async function* () {
      for (let i = 0; i < n; i++) yield i;
    })() as unknown as number[],
);
const worker = createWorker(counter);

for await (const chunk of worker.runStream(5)) {
  console.log(chunk); // 0, 1, 2, 3, 4
}

worker.dispose();
```

Breaking out of a `for-await-of` loop (or throwing from the body) releases the slot cleanly — no leak, no stale timers.

The `timeout` option works the same as for `run()`: if the stream task exceeds the timeout, it is killed and the iterator throws `WorkerTimeoutError`.

---

### `batch(inputs, options?)`

`batch(inputs: TInput[], options?: BatchOptions): AsyncIterable<TOutput>`

Runs all inputs through the pool and yields results. By default yields in submission order. Pass `ordered: false` to yield as each task completes (maximum throughput).

```ts
const pool = createWorker<number, number>((n) => n * 2, { concurrency: 4 });

// Submission order (default)
for await (const result of pool.batch([1, 2, 3, 4, 5])) {
  console.log(result); // 2, 4, 6, 8, 10
}

// Completion order — maximum throughput
for await (const result of pool.batch([1, 2, 3], { ordered: false })) {
  console.log(result); // arrives as soon as each task finishes
}

pool.dispose();
```

If any task throws, `batch()` aborts remaining queued tasks and re-throws the error.

::: tip Memory — `ordered: false`
When `ordered: false`, all settled results are buffered in memory until the consumer reads them. For very large batches, consider processing in smaller chunks.
:::

---

### `group(name?, options?)`

`group(name?: string, options?: GroupOptions): TaskGroup<TInput, TOutput>`

Creates a task group. All tasks submitted via `group.run()` share an `AbortController` and can be cancelled or awaited as a unit. An optional `name` is stored on the group for logging and debugging.

Pass `options.signal` to tie the group's lifetime to an external `AbortSignal` — when the signal aborts, the group aborts automatically:

```ts
import { createWorker, task } from '@vielzeug/familiar';

const square = task<number, number>((n) => n * 2);
const pool = createWorker(square, { concurrency: 4 });

// Tied to pool lifetime — group aborts automatically when pool disposes:
const g = pool.group('batch-1', { signal: pool.disposalSignal });

const p1 = g.run(1);
const p2 = g.run(2);
const p3 = g.run(3);

const results = await g.drain(); // resolves with PromiseSettledResult[]
console.log(results[0]); // { status: 'fulfilled', value: 2 }

// Cancel all pending tasks in the group
g.abort();
pool.dispose();
```

#### `TaskGroup.drain()`

`drain(): Promise<PromiseSettledResult<TOutput>[]>`

Waits for all tasks submitted to the group _so far_ to settle. Returns an array of `PromiseSettledResult` — one per task, in submission order. Unlike `Promise.allSettled`, the group's individual promises still reject normally; `drain()` collects all outcomes without throwing.

Calling `abort()` concurrently while `drain()` is pending is safe: aborted tasks appear as `{ status: 'rejected' }` entries in the result.

::: tip Memory — long-lived groups
`drain()` clears its internal task list after snapshotting, so settled Promise references become eligible for GC. For groups that cycle through many drain() calls, this prevents accumulation of settled Promise objects.
:::

#### `TaskGroup.abort(reason?)`

`abort(reason?: unknown): void`

Cancels all pending group tasks. In-flight tasks run to natural completion.

#### `TaskGroup.name`

`readonly name: string | undefined`

Optional name provided when the group was created via `group(name)`.

#### `TaskGroup.pending`

`readonly pending: number`

Number of tasks not yet settled (active + queued). Decrements as tasks complete or fail.

#### `TaskGroup.size`

`readonly size: number`

Total tasks ever submitted to this group (never decrements).

---

### `close(timeoutMs?)`

`close(timeoutMs?: number): Promise<void>`

Graceful shutdown. Waits until all queued and in-flight tasks settle, then terminates all workers. Calling `run()` after `close()` has started rejects with `WorkerTerminatedError`.

If `timeoutMs` is given and the pool has not gone idle within that window, rejects with `WorkerTimeoutError` and force-terminates.

```ts
await pool.close(); // drain then terminate
await pool.close(5000); // must drain within 5 s
```

---

### `dispose()`

`dispose(): void`

Immediate forceful termination. Rejects all in-flight and queued tasks with `WorkerTerminatedError`. After `dispose()`, `status` is `'terminated'` and further `run()` calls reject immediately.

---

### `disposed`

`readonly disposed: boolean`

`true` after `dispose()` has been called or `close()` has settled. Use to guard against post-termination calls.

---

### `disposalSignal`

`readonly disposalSignal: AbortSignal`

`AbortSignal` aborted when the pool is terminated (via `dispose()` or `close()` settling). Use to tie external lifetimes (polling loops, SSE connections, etc.) to the pool's lifecycle.

```ts
const pool = createWorker<number, number>((n) => n * 2);

startPolling({ signal: pool.disposalSignal });
// polling stops automatically when the pool is disposed
```

---

### `prime()`

`prime(): Promise<void>`

Pre-initializes all worker slots by spawning their `Worker` instances now. Resolves when all slots are ready. Call during application startup to eliminate first-task cold-start latency.

::: tip Best-effort
If the Worker API is unavailable (e.g. SSR), `prime()` silently resolves. Errors surface on the first `run()` call.
:::

```ts
const pool = createWorker<number, number>((n) => n * 2, { concurrency: 4 });
await pool.prime(); // pre-spawn all 4 threads
const result = await pool.run(21); // no cold-start
```

---

### Metrics

| Member        | Type           | Description                                                                      |
| ------------- | -------------- | -------------------------------------------------------------------------------- |
| `active`      | `number`       | Slots currently executing a task                                                 |
| `completed`   | `number`       | Successful tasks since creation                                                  |
| `concurrency` | `number`       | Configured slot count                                                            |
| `failed`      | `number`       | Tasks rejected with task/timeout/worker error (excludes aborts and terminations) |
| `queued`      | `number`       | Tasks waiting in queue (accurate — excludes cancelled items)                     |
| `status`      | `WorkerStatus` | Current lifecycle state                                                          |

---

### `[Symbol.dispose]()` / `[Symbol.asyncDispose]()`

`[Symbol.dispose](): void` — alias for `dispose()`, enables the `using` keyword.

`[Symbol.asyncDispose](): Promise<void>` — alias for `close()`, enables `await using`.

```ts
import { createWorker, task } from '@vielzeug/familiar';

const double = task<number, number>((n) => n * 2);

// Synchronous dispose — terminates immediately
{
  using worker = createWorker(double);
  await worker.run(21); // 42
} // dispose() called automatically

// Async dispose — drains then terminates
{
  await using pool = createWorker(double, { concurrency: 4 });
  const results = await Promise.all([1, 2, 3].map((n) => pool.run(n)));
} // close() called automatically
```

## Error Model

All worker errors extend `WorkerError`. Use `instanceof` against the specific subclass for precise handling.

```ts
class WorkerError extends Error {
  readonly code: WorkerErrorCode;
  toString(): string; // returns "[@vielzeug/familiar] ClassName: message"
}
```

::: tip `.message` vs `.toString()`
`err.message` contains the raw error message without any package prefix — safe for programmatic checks (`err.message.includes('timed out')`). `err.toString()` includes the `[@vielzeug/familiar]` prefix for human-readable output in logs.
:::

### Error Hierarchy

| Class                       | Code                | Extra fields         | When thrown                                           |
| --------------------------- | ------------------- | -------------------- | ----------------------------------------------------- |
| `WorkerTimeoutError`        | `'timeout'`         | `.timeoutMs: number` | Task exceeded timeout or heartbeat window             |
| `WorkerTaskError`           | `'task'`            | `.cause: unknown`    | Task function threw                                   |
| `WorkerQueueFullError`      | `'queue_full'`      | `.maxQueue: number`  | Queue at capacity (`onFull='reject'`)                 |
| `WorkerTerminatedError`     | `'terminated'`      | —                    | `dispose()` called; task was in-flight or queued      |
| `WorkerRuntimeError`        | `'worker'`          | `.cause?: unknown`   | Worker API unavailable or unhandled thread error      |
| `WorkerInvalidOptionsError` | `'invalid_options'` | —                    | Invalid `createWorker` / `createModuleWorker` options |

```ts
import { WorkerQueueFullError, WorkerTaskError, WorkerTerminatedError, WorkerTimeoutError } from '@vielzeug/familiar';

try {
  await worker.run(input, { timeout: 500 });
} catch (err) {
  if (err instanceof WorkerTimeoutError) {
    console.error(`Timed out after ${err.timeoutMs}ms`);
  } else if (err instanceof WorkerTaskError) {
    console.error('Task threw:', err.cause);
  } else if (err instanceof WorkerQueueFullError) {
    console.error(`Queue full (maxQueue=${err.maxQueue})`);
  } else if (err instanceof WorkerTerminatedError) {
    console.error('Worker was disposed');
  }
}
```

## Testing Utilities

Import from the `/test` subpath — not included in the main bundle:

```ts
import { createTestWorker } from '@vielzeug/familiar/testing';
import type { TestWorkerHandle, TestWorkerOptions } from '@vielzeug/familiar/testing';
```

Error classes are also re-exported from the test subpath so test files need only one import.

---

### `createTestWorker`

```ts
function createTestWorker<TInput, TOutput>(
  fn: (input: TInput) => TOutput | Promise<TOutput>,
  options?: TestWorkerOptions,
): TestWorkerHandle<TInput, TOutput>;
```

Creates an in-process test double. `fn` runs on the same thread — no Worker is spawned. Successful calls are recorded in `handle.calls`. Errors propagate unwrapped (not wrapped in `WorkerError`), so vitest assertion errors surface directly in test output.

---

### `TestWorkerOptions`

```ts
type TestWorkerOptions = {
  concurrency?: number;
  errorWrapping?: boolean;
  maxQueue?: number;
  onFull?: 'reject' | 'wait';
};
```

| Field           | Type                 | Default    | Description                                                                                                                                                    |
| --------------- | -------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `concurrency`   | `number`             | `1`        | In-process slot count. Default `1` for deterministic ordering. Increase only when testing concurrency-specific behavior.                                       |
| `errorWrapping` | `boolean`            | `false`    | When `true`, errors from `fn` are wrapped in `WorkerTaskError`, mirroring real worker behavior. Useful when testing code that checks `instanceof WorkerError`. |
| `maxQueue`      | `number`             | unlimited  | Queue capacity before rejecting with `WorkerQueueFullError`.                                                                                                   |
| `onFull`        | `'reject' \| 'wait'` | `'reject'` | Queue-full behavior.                                                                                                                                           |

---

### `TestWorkerHandle`

```ts
type TestWorkerHandle<TInput, TOutput> = WorkerHandle<TInput, TOutput> & {
  readonly calls: ReadonlyArray<{ input: TInput; output: TOutput }>;
};
```

Extends `WorkerHandle` with `.calls` — all successful `run()` invocations in call order.

**Differences from the real worker:**

- Tasks run in-process — serialization constraints are not enforced.
- `prime()` is a no-op (tasks run in-process).
- `runStream()` is not supported (rejects with `WorkerRuntimeError` on first `next()`).
- Error wrapping is skipped by default — task errors propagate as-is for better test DX. Set `errorWrapping: true` to mirror real worker behavior.

```ts
import { createTestWorker } from '@vielzeug/familiar/testing';
import { describe, expect, it } from 'vitest';

describe('add worker', () => {
  it('records calls', async () => {
    const worker = createTestWorker<{ a: number; b: number }, number>(({ a, b }) => a + b);

    expect(await worker.run({ a: 2, b: 3 })).toBe(5);
    expect(await worker.run({ a: 10, b: 20 })).toBe(30);

    expect(worker.calls).toHaveLength(2);
    expect(worker.calls[0]!.input).toEqual({ a: 2, b: 3 });
    expect(worker.calls[1]!.output).toBe(30);

    worker.dispose();
  });
});
```
