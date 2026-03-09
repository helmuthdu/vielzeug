---
title: Workit — API Reference
description: Complete type signatures and documentation for createWorker, WorkerHandle, error classes, and testing utilities.
---

# API Reference

[[toc]]

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

| Value | Meaning |
|---|---|
| `'idle'` | All worker slots are free |
| `'running'` | One or more slots are executing a task |
| `'terminated'` | `dispose()` was called |

---

### `WorkerOptions`

```ts
type WorkerOptions = {
  size?: number | 'auto';
  timeout?: number;
  fallback?: boolean;
  scripts?: string[];
};
```

| Property | Type | Default | Description |
|---|---|---|---|
| `size` | `number \| 'auto'` | `1` | Number of concurrent worker slots. `'auto'` uses `navigator.hardwareConcurrency`. |
| `timeout` | `number` | `undefined` | Milliseconds before a task rejects with `TaskTimeoutError`. |
| `fallback` | `boolean` | `true` | Run on the main thread when Web Workers are unavailable. |
| `scripts` | `string[]` | `[]` | URLs loaded via `importScripts()` inside each Worker. |

---

### `RunOptions`

```ts
type RunOptions = {
  signal?: AbortSignal;
  transfer?: Transferable[];
};
```

| Property | Type | Description |
|---|---|---|
| `signal` | `AbortSignal` | Cancel a queued task. In-flight tasks cannot be interrupted. |
| `transfer` | `Transferable[]` | Objects to move (not copy) to the worker thread. |

---

### `WorkerHandle`

```ts
type WorkerHandle<TInput, TOutput> = {
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  dispose(): void;
  readonly size: number;
  readonly status: WorkerStatus;
  readonly isNative: boolean;
  [Symbol.dispose](): void;
};
```

The return type of `createWorker`. See [WorkerHandle Interface](#workerhandle-interface) for per-member documentation.

## createWorker

```ts
function createWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: WorkerOptions,
): WorkerHandle<TInput, TOutput>
```

Creates a worker (or pool) that executes `fn` in a Web Worker. If Workers are unavailable and `fallback` is `true`, tasks run on the main thread and a warning is logged.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `fn` | `TaskFn<TInput, TOutput>` | The task function. Must be self-contained — no closure over outer scope. |
| `options` | `WorkerOptions` | Optional configuration (size, timeout, fallback, scripts). |

**Returns** `WorkerHandle<TInput, TOutput>`

**Example**

```ts
import { createWorker } from '@vielzeug/workit';

// Single worker
const worker = createWorker<string, string>((text) => text.toUpperCase());

// Pool of 4
const pool = createWorker<number, number>((n) => n ** 2, { size: 4, timeout: 3000 });
```

## WorkerHandle Interface

### `run(input, options?)`

```ts
run(input: TInput, options?: RunOptions): Promise<TOutput>
```

Dispatches a task to the next available worker slot. If all slots are busy, the task is queued.

Rejects with:
- `TaskTimeoutError` — if `timeout` is configured and the task exceeds it
- `TerminatedError` — if `dispose()` was called before or during the task
- `TaskError` — if the task function throws
- `DOMException` (AbortError) — if the provided `signal` is aborted before the task starts

::: warning
The task function is serialized via `.toString()` and runs in an isolated scope. It cannot close over variables from the surrounding module. Keep task functions entirely self-contained.
:::

---

### `dispose()`

```ts
dispose(): void
```

Terminates all worker threads and rejects any pending or in-flight tasks with `TerminatedError`. After calling `dispose()`, `status` becomes `'terminated'` and further calls to `run()` reject immediately.

---

### `size`

```ts
readonly size: number
```

The number of worker slots configured for this handle (always ≥ 1).

---

### `status`

```ts
readonly status: WorkerStatus
```

The current state of the worker handle. See [`WorkerStatus`](#workerstatus).

---

### `isNative`

```ts
readonly isNative: boolean
```

`true` when tasks run in a real Web Worker; `false` when falling back to the main thread. Useful for logging or telemetry.

---

### `[Symbol.dispose]()`

```ts
[Symbol.dispose](): void
```

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

```ts
class TaskTimeoutError extends WorkerError {
  constructor(ms: number)
}
```

Thrown when a task exceeds the configured `timeout`. The error message includes the configured limit in milliseconds.

---

### `TerminatedError`

```ts
class TerminatedError extends WorkerError {
  constructor()
}
```

Thrown when `run()` is called on a disposed handle, or when `dispose()` is called while a task is in flight.

---

### `TaskError`

```ts
class TaskError extends WorkerError {
  constructor(message: string, cause?: unknown)
}
```

Thrown when the task function itself throws. The `message` is the stringified original error.

::: warning
`cause` is only populated in fallback (main-thread) mode. In native Worker mode, errors cross the message boundary as strings, so `cause` is always `undefined`.
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
function createTestWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
): TestWorkerHandle<TInput, TOutput>
```

Creates a `TestWorkerHandle` that runs `fn` synchronously in the same thread and records every call. No Worker is ever spawned, so tests work in any environment.

---

### `TestWorkerHandle`

```ts
type TestWorkerHandle<TInput, TOutput> = WorkerHandle<TInput, TOutput> & {
  readonly calls: ReadonlyArray<{ input: TInput; output: TOutput }>;
};
```

Extends `WorkerHandle` with:

| Member | Type | Description |
|---|---|---|
| `calls` | `ReadonlyArray<{ input, output }>` | All successful `run()` calls in order. |
| `isNative` | `boolean` | Always `false` — no Worker is spawned. |
| `[Symbol.dispose]()` | `void` | Same as `dispose()`. |
