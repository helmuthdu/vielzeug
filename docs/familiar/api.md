---
title: Familiar — API Reference
description: Complete API reference for @vielzeug/familiar.
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
| `@vielzeug/familiar`   | Main exports and types |

## Package Exports

```ts
export { createWorker, WorkerError } from '@vielzeug/familiar';

export type { RunOptions, TaskFn, WorkerErrorCode, WorkerHandle, WorkerOptions, WorkerStatus } from '@vielzeug/familiar';

export { createTestWorker } from '@vielzeug/familiar/test';
export type { TestWorkerHandle } from '@vielzeug/familiar/test';
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
- `timeout`: `number | undefined` — per-run timeout in milliseconds. Overrides the pool-level timeout for this task only.
- `transferables`: `Transferable[]` — objects to move (not copy) to the worker thread.

---

### `WorkerHandle`

```ts
type WorkerHandle<TInput, TOutput> = {
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
  readonly active: number;
  batch(inputs: TInput[], options?: Omit<RunOptions, 'signal'>): AsyncIterable<TOutput>;
  close(timeoutMs?: number): Promise<void>;
  readonly completed: number;
  readonly concurrency: number;
  dispose(): void;
  readonly failed: number;
  prime(): Promise<void[]>;
  readonly queued: number;
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  readonly status: WorkerStatus;
  readonly utilization: number;
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
import { createWorker } from '@vielzeug/familiar';

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
- `WorkerError` code `'timeout'` — if `timeout` (pool-level or per-run) is configured and the task exceeds it
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

### `batch(inputs, options?)`

`batch(inputs: TInput[], options?: Omit<RunOptions, 'signal'>): AsyncIterable<TOutput>`

Runs all inputs through the pool and yields results in submission order as each task completes. Cancels remaining tasks automatically if any task throws.

```ts
const pool = createWorker<number, number>((n) => n * 2, { concurrency: 4 });

for await (const result of pool.batch([1, 2, 3, 4, 5])) {
  console.log(result); // 2, 4, 6, 8, 10
}

// With per-run timeout
for await (const result of pool.batch([1, 2, 3], { timeout: 500 })) {
  console.log(result);
}

pool.dispose();
```

---

### `close(timeoutMs?)`

`close(timeoutMs?: number): Promise<void>`

Graceful shutdown. Waits until queued and in-flight tasks settle, then terminates all workers. If `timeoutMs` is provided and the pool has not gone idle within that window, rejects with `WorkerError` code `'timeout'` and force-terminates.

```ts
// Drain then terminate (no deadline)
await pool.close();

// Must be idle within 5 s or reject
await pool.close(5000);
```

---

### `completed`

`readonly completed: number`

Total number of successfully completed tasks since handle creation.

---

### `concurrency`

`readonly concurrency: number`

The number of worker slots configured for this handle (always ≥ 1).

---

### `failed`

`readonly failed: number`

Total number of tasks that have been rejected with a task / timeout / worker error since handle creation. Aborted tasks and termination-caused rejections are not counted.

```ts
const worker = createWorker<number, number>((n) => {
  if (n < 0) throw new Error('negative');

  return n;
});

await worker.run(1);
await worker.run(-1).catch(() => {});
console.log(worker.completed); // 1
console.log(worker.failed);    // 1
```

---

### `prime()`

`prime(): Promise<void[]>`

Pre-initializes all worker slots by spawning their underlying `Worker` instances immediately. Returns a Promise that resolves when all slots are ready.

Call this during application startup to eliminate first-task latency when you know tasks will arrive soon.

```ts
const pool = createWorker<number, number>((n) => n * 2, { concurrency: 4 });

// Pre-spawn all 4 Worker threads during app init and await readiness
await pool.prime();

// Later — first run() has no cold-start overhead
const result = await pool.run(21);
```

Prime is best-effort: if the Worker API is unavailable (SSR, Node without Worker support), it silently does nothing and errors surface on the first `run()` call.

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

## Error Model

Worker uses a single error class: `WorkerError`.

```ts
class WorkerError extends Error {
  readonly code: WorkerErrorCode;
}
```

Use `instanceof WorkerError` plus `err.code` for branching:

```ts
import { WorkerError } from '@vielzeug/familiar';

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
import { createTestWorker } from '@vielzeug/familiar/test';
import type { TestWorkerHandle } from '@vielzeug/familiar/test';
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

All `WorkerHandle` members are implemented. Notable differences from the real familiar:

- `concurrency` is always `1`.
- `prime()` is a no-op that resolves immediately (tasks run in-process).
- `active`, `queued`, `utilization`, `completed`, `status` reflect in-process state accurately.
