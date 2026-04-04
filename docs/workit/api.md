---
title: Workit — API Reference
description: Complete type signatures and documentation for createWorker, WorkerHandle, error classes, and testing utilities.
---

[[toc]]

## API At a Glance

| Symbol               | Purpose                              | Execution mode | Common gotcha                                      |
| -------------------- | ------------------------------------ | -------------- | -------------------------------------------------- |
| `createWorker()`     | Create a typed worker or worker pool | Sync           | Task functions must be self-contained              |
| `worker.run()`       | Execute a typed task in a Worker     | Async          | Pass transferables for large buffers when possible |
| `createTestWorker()` | Run worker tasks in-process for tests| Async          | Use call recording assertions to verify behavior   |

## Package Exports

```ts
export { createWorker, TaskError, TaskTimeoutError, TerminatedError, WorkerError } from '@vielzeug/workit';

export type { RunOptions, TaskFn, WorkerHandle, WorkerOptions, WorkerStatus } from '@vielzeug/workit';

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
  timeout?: number;
};
```

- `concurrency`: `number | 'auto'`, defaults to `1`. `'auto'` uses `navigator.hardwareConcurrency` when available.
- `timeout`: `number | undefined`. Milliseconds before a task rejects with `TaskTimeoutError`. The timed-out worker is recycled.

---

### `RunOptions`

```ts
type RunOptions = {
  signal?: AbortSignal;
  transfer?: Transferable[];
};
```

| Property   | Type             | Description                                                  |
| ---------- | ---------------- | ------------------------------------------------------------ |
| `signal`   | `AbortSignal`    | Cancel a queued task. In-flight tasks cannot be interrupted. |
| `transfer` | `Transferable[]` | Objects to move (not copy) to the worker thread.             |

---

### `WorkerHandle`

```ts
type WorkerHandle<TInput, TOutput> = {
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  dispose(): void;
  readonly concurrency: number;
  readonly status: WorkerStatus;
  [Symbol.dispose](): void;
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
| `options` | `WorkerOptions`           | Optional configuration (`concurrency`, `timeout`).                       |

Returns `WorkerHandle<TInput, TOutput>`.

### Example

```ts
import { createWorker } from '@vielzeug/workit';

// Single worker
const worker = createWorker<string, string>((text) => text.toUpperCase());

// Pool of 4
const pool = createWorker<number, number>((n) => n ** 2, { concurrency: 4, timeout: 3000 });
```

## WorkerHandle Interface

### `run(input, options?)`

`run(input: TInput, options?: RunOptions): Promise<TOutput>`

Dispatches a task to the next available worker slot. If all slots are busy, the task is queued.

Rejects with:

- `TaskTimeoutError` — if `timeout` is configured and the task exceeds it
- `TerminatedError` — if `dispose()` was called before or during the task
- `TaskError` — if the task function throws
- `DOMException` (AbortError) — if the provided `signal` is aborted before the task starts
- `WorkerError` — if the Worker API is unavailable when the task starts

::: warning
The task function is serialized via `.toString()` and runs in an isolated scope. It cannot close over variables from the surrounding module. Keep task functions entirely self-contained.
:::

---

### `dispose()`

`dispose(): void`

Terminates all worker threads and rejects any pending or in-flight tasks with `TerminatedError`. After calling `dispose()`, `status` becomes `'terminated'` and further calls to `run()` reject immediately.

---

### `concurrency`

`readonly concurrency: number`

The number of worker slots configured for this handle (always ≥ 1).

---

### `status`

`readonly status: WorkerStatus`

The current state of the worker handle. See [`WorkerStatus`](#workerstatus).

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

## Error Classes

All error classes extend `WorkerError`, so a single `catch` can cover every workit error:

```ts
import { WorkerError, TaskTimeoutError, TerminatedError, TaskError } from '@vielzeug/workit';

try {
  await worker.run(input);
} catch (err) {
  if (err instanceof WorkerError) {
    // handles TaskTimeoutError, TerminatedError, or TaskError
  }
}
```

---

### `WorkerError`

```ts
class WorkerError extends Error {}
```

Base class for all workit errors. Use `instanceof WorkerError` to catch any error thrown by this library.

---

### `TaskTimeoutError`

```txt
class TaskTimeoutError extends WorkerError {
  constructor(ms: number)
}
```

Thrown when a task exceeds the configured `timeout`. The error message includes the configured limit in milliseconds.

---

### `TerminatedError`

```txt
class TerminatedError extends WorkerError {
  constructor()
}
```

Thrown when `run()` is called on a disposed handle, or when `dispose()` is called while a task is in flight.

---

### `TaskError`

```txt
class TaskError extends WorkerError {
  constructor(message: string, cause?: unknown)
}
```

Thrown when the task function itself throws. The `message` is the stringified original error.

::: warning
For task failures inside the Worker, `message` is preserved and `cause` is usually `undefined` because Worker messages cross the structured clone boundary.
:::

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
