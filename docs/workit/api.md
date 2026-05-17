---
title: Workit — API Reference
description: Complete type signatures and documentation for createWorker, WorkerHandle, error classes, and testing utilities.
---

[[toc]]

## Package Entry Point

| Import               | Purpose                |
| -------------------- | ---------------------- |
| `@vielzeug/workit`   | Main exports and types |

## API At a Glance

| Symbol               | Purpose                               | Execution mode | Common gotcha                                      |
| -------------------- | ------------------------------------- | -------------- | -------------------------------------------------- |
| `createWorker()`     | Create a typed worker or worker pool  | Sync           | Task functions must be self-contained              |
| `worker.run()`       | Execute a typed task in a Worker      | Async          | Pass transferables for large buffers when possible |
| `createTestWorker()` | Run worker tasks in-process for tests | Async          | Use call recording assertions to verify behavior   |

## Package Exports

```ts
export { createWorker, WorkerError } from '@vielzeug/workit';

export type { RunOptions, TaskFn, WorkerErrorCode, WorkerHandle, WorkerOptions, WorkerStatus } from '@vielzeug/workit';

export { createTestWorker } from '@vielzeug/workit/test';
export type { TestWorkerHandle } from '@vielzeug/workit/test';
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
  maxQueue?: number | 'auto';
  timeout?: number;
};
```

- `concurrency`: `number | 'auto'`, defaults to `1`. `'auto'` uses `navigator.hardwareConcurrency` when available.
- `maxQueue`: `number | 'auto' | undefined`. Queue capacity before `run()` rejects with `WorkerError` code `'queue_full'`. `'auto'` resolves to `concurrency * 2`.
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
  close(): Promise<void>;
  readonly completed: number;
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  dispose(): void;
  readonly concurrency: number;
  readonly size: number;
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
import { createWorker } from '@vielzeug/workit';

// Single worker
const worker = createWorker<string, string>((text) => text.toUpperCase());

// Pool of 4
const pool = createWorker<number, number>((n) => n ** 2, { concurrency: 4, maxQueue: 'auto', timeout: 3000 });
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

### `size`

`readonly size: number`

Current queue depth (tasks waiting to start).

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

Workit uses a single error class: `WorkerError`.

```ts
class WorkerError extends Error {
  readonly code: WorkerErrorCode;
}
```

Use `instanceof WorkerError` plus `err.code` for branching:

```ts
import { WorkerError } from '@vielzeug/workit';

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
import { createTestWorker } from '@vielzeug/workit/test';
import type { TestWorkerHandle } from '@vielzeug/workit/test';
```

---

### `createTestWorker`

```ts
declare function createTestWorker<TInput, TOutput>(fn: TaskFn<TInput, TOutput>): TestWorkerHandle<TInput, TOutput>;
```

Creates a `TestWorkerHandle` that runs `fn` in-process on the same thread and records successful calls. No Worker is ever spawned, so tests work in any environment.

---

### `TestWorkerHandle`

```ts
type TestWorkerHandle<TInput, TOutput> = WorkerHandle<TInput, TOutput> & {
  readonly calls: ReadonlyArray<{ input: TInput; output: TOutput }>;
};
```

Extends `WorkerHandle` with:

| Member               | Type                               | Description                            |
| -------------------- | ---------------------------------- | -------------------------------------- |
| `calls`              | `ReadonlyArray<{ input, output }>` | All successful `run()` calls in order. |
| `[Symbol.dispose]()` | `void`                             | Same as `dispose()`.                   |
