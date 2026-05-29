---
title: Worker — API Reference
description: Complete API reference for @vielzeug/worker.
---

[[toc]]

## API At a Glance

| Symbol               | Purpose                               | Execution mode | Common gotcha                                      |
| -------------------- | ------------------------------------- | -------------- | -------------------------------------------------- |
| `createWorker()`     | Create a typed worker or worker pool  | Sync           | Task functions must be self-contained              |
| `worker.run()`       | Execute a typed task in a Worker      | Async          | Pass transferables for large buffers when possible |
| `createTestWorker()` | Run worker tasks in-process for tests | Async          | Use call recording assertions to verify behavior   |

## Package Entry Point

| Import               | Purpose                |
| -------------------- | ---------------------- |
| `@vielzeug/worker`   | Main exports and types |

## Package Exports

```ts
export { createWorker, WorkerError } from '@vielzeug/worker';

export type { RunOptions, TaskFn, WorkerErrorCode, WorkerHandle, WorkerOptions, WorkerStatus } from '@vielzeug/worker';

export { createTestWorker } from '@vielzeug/worker/test';
export type { TestWorkerHandle } from '@vielzeug/worker/test';
```

## Types

### `TaskFn`

```ts
type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;
```

The signature for the task function passed to `createWorker`. Accepts a single typed input and returns a value or a Promise.

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
  maxQueue?: number;
  timeout?: number;
};
```

- `concurrency`: `number | 'auto'`, defaults to `1`. `'auto'` uses `navigator.hardwareConcurrency` when available.
- `maxQueue`: `number | undefined`. Queue capacity before `run()` rejects with `WorkerError` code `'queue_full'`. Defaults to unlimited.
- `timeout`: `number | undefined`. Milliseconds before a task rejects with `WorkerError` code `'timeout'`.

---

### `RunOptions`

```ts
type RunOptions = {
  signal?: AbortSignal;
  transferables?: Transferable[];
};
```

- `signal`: `AbortSignal` — cancel a queued task. In-flight tasks cannot be interrupted.
- `transferables`: `Transferable[]` — objects to move (not copy) to the worker thread.

---

### `WorkerHandle`

```ts
type WorkerHandle<TInput, TOutput> = {
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
  readonly active: number;
  close(): Promise<void>;
  readonly completed: number;
  readonly concurrency: number;
  dispose(): void;
  readonly queued: number;
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  readonly status: WorkerStatus;
  readonly utilization: number;
  warmup(): void;
};
```

The return type of `createWorker`. See [WorkerHandle Interface](#workerhandle-interface) for per-member documentation.

## createWorker

```ts
declare function createWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: WorkerOptions,
): WorkerHandle<TInput, TOutput>;
```

Creates a worker (or pool) that executes `fn` in a Web Worker. `createWorker()` is safe to call in any runtime, but `run()` requires a real Worker implementation and rejects with `WorkerError` when the Worker API is unavailable.

### Parameters

| Parameter | Type                      | Description                                                              |
| --------- | ------------------------- | ------------------------------------------------------------------------ |
| `fn`      | `TaskFn<TInput, TOutput>` | The task function. Must be self-contained — no closure over outer scope. |
| `options` | `WorkerOptions`           | Optional configuration (`concurrency`, `maxQueue`, `timeout`).           |

Returns `WorkerHandle<TInput, TOutput>`.

### Example

```ts
import { createWorker } from '@vielzeug/worker';

// Single worker
const worker = createWorker<string, string>((text) => text.toUpperCase());

// Pool of 4 with a 3 s timeout
const pool = createWorker<number, number>((n) => n ** 2, { concurrency: 4, timeout: 3000 });

// Use navigator.hardwareConcurrency
const autoPool = createWorker<number, number>((n) => n ** 2, { concurrency: 'auto' });
```

## WorkerHandle Interface

### `run(input, options?)`

`run(input: TInput, options?: RunOptions): Promise<TOutput>`

Dispatches a task to the next available worker slot. If all slots are busy, the task is queued.

Rejects with:

- `WorkerError` code `'queue_full'` — if `maxQueue` is configured and the queue is already full
- `WorkerError` code `'timeout'` — if `timeout` is configured and the task exceeds it
- `WorkerError` code `'terminated'` — if `dispose()` was called before or during the task
- `WorkerError` code `'task'` — if the task function throws
- `DOMException` (AbortError) — if the provided `signal` is aborted before the task starts
- `WorkerError` code `'worker'` — worker runtime/setup failures

::: warning
The task function is serialized via `.toString()` and runs in an isolated scope. It cannot close over variables from the surrounding module. Keep task functions entirely self-contained.
:::

---

### `dispose()`

`dispose(): void`

Terminates all worker threads and rejects any pending or in-flight tasks with `WorkerError` code `'terminated'`. After calling `dispose()`, `status` becomes `'terminated'` and further calls to `run()` reject immediately.

---

### `active`

`readonly active: number`

Number of worker slots currently executing a task.

---

### `close()`

`close(): Promise<void>`

Graceful shutdown. Waits until queued and in-flight tasks settle, then terminates all workers.

---

### `completed`

`readonly completed: number`

Total number of successfully completed tasks since handle creation.

---

### `concurrency`

`readonly concurrency: number`

The number of worker slots configured for this handle (always ≥ 1).

---

### `queued`

`readonly queued: number`

Current queue depth (tasks waiting to start).

---

### `status`

`readonly status: WorkerStatus`

Current lifecycle state of the worker. See [`WorkerStatus`](#workerstatus).

---

### `utilization`

`readonly utilization: number`

Fraction of worker slots currently executing a task, from `0` (all idle) to `1` (all busy).

---

### `warmup()`

`warmup(): void`

Pre-initializes all worker slots by spawning their underlying `Worker` instances immediately. Call this during application startup to eliminate first-task latency when you know tasks will arrive soon.

```ts
import { createWorker } from '@vielzeug/worker';

const pool = createWorker<number, number>((n) => n * 2, { concurrency: 4 });

// Pre-spawn all 4 Worker threads during app init
pool.warmup();

// Later — first run() has no cold-start overhead
const result = await pool.run(21);
```

Warmup is best-effort: if the Worker API is unavailable (SSR, Node without Worker support), it silently does nothing and errors surface on the first `run()` call instead.

---

### `[Symbol.dispose]()` / `[Symbol.asyncDispose]()`

`[Symbol.dispose](): void` — alias for `dispose()`, enables the `using` keyword.

`[Symbol.asyncDispose](): Promise<void>` — alias for `close()`, enables `await using`.

```ts
// Synchronous dispose — terminates immediately
{
  using worker = createWorker<number, number>((n) => n * 2);
  await worker.run(21); // 42
} // dispose() called automatically

// Async dispose — drains then terminates
{
  await using worker = createWorker<number, number>((n) => n * 2);
  await worker.run(21); // 42
} // close() called automatically — waits for in-flight tasks
```
---

### `status`

`readonly status: WorkerStatus`

The current state of the worker handle. See [`WorkerStatus`](#workerstatus).

---

### `utilization`

`readonly utilization: number`

Current active-slot ratio from `0` to `1`.

---

### `[Symbol.dispose]()`

`[Symbol.dispose](): void`

Alias for `dispose()`. Enables the ES2025 explicit resource management `using` keyword:

```ts
{
  using worker = createWorker<number, number>((n) => n * 2);
  const result = await worker.run(21); // 42
} // automatically disposed here
```

## Error Model

Worker uses a single error class: `WorkerError`.

```ts
class WorkerError extends Error {
  readonly code: WorkerErrorCode;
}
```

Use `instanceof WorkerError` plus `err.code` for branching:

```ts
import { WorkerError } from '@vielzeug/worker';

try {
  await worker.run(input);
} catch (err) {
  if (err instanceof WorkerError && err.code === 'timeout') {
    // task exceeded timeout
  }
}
```

Supported `WorkerErrorCode` values:

- `'invalid_options'`
- `'queue_full'`
- `'task'`
- `'terminated'`
- `'timeout'`
- `'worker'`

## Testing Utilities

Import from the `/test` subpath — not included in the main bundle:

```ts
import { createTestWorker } from '@vielzeug/worker/test';
import type { TestWorkerHandle } from '@vielzeug/worker/test';
```

---

### `createTestWorker`

```ts
declare function createTestWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: TestWorkerOptions,
): TestWorkerHandle<TInput, TOutput>;
```

Creates a `TestWorkerHandle` that runs `fn` in-process on the same thread and records successful calls. No Worker is ever spawned, so tests work in any environment.

---

### `TestWorkerOptions`

```ts
type TestWorkerOptions = {
  maxQueue?: number;
};
```

- `maxQueue`: `number | undefined`. Queue capacity before `run()` rejects with `WorkerError` code `'queue_full'`. Defaults to unlimited.

---

### `TestWorkerHandle`

```ts
type TestWorkerHandle<TInput, TOutput> = WorkerHandle<TInput, TOutput> & {
  readonly calls: ReadonlyArray<{ input: TInput; output: TOutput }>;
};
```

Extends `WorkerHandle` with:

| Member  | Type                               | Description                            |
| ------- | ---------------------------------- | -------------------------------------- |
| `calls` | `ReadonlyArray<{ input, output }>` | All successful `run()` calls in order. |

All `WorkerHandle` members are implemented. Notable differences from the real worker:

- `concurrency` is always `1`.
- `warmup()` is a no-op (tasks run in-process).
- `active`, `queued`, `utilization`, `completed`, `status` reflect in-process state accurately.
