---
title: Familiar — API Reference
description: API reference for module-worker pools and worker-side protocol registration.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createWorker()` | Create single-result module-worker pool | Sync | Worker must call `exposeTask()` |
| `createStreamWorker()` | Create stream-only module-worker pool | Sync | Worker must call `exposeStream()` |
| `batch()` | Yield ordered task-pool results | Async iterator | Stops remaining work on first failure |
| `createTaskGroup()` | Coordinate related task-pool jobs | Sync | Call `abort()` to stop group work |
| `createTestWorker()` | Create an in-process task-pool test double | Sync | Task modules are not executed |
| `exposeTask()` | Register worker task handler | Sync | Worker-only import |
| `exposeStream()` | Register worker stream handler | Sync | Worker-only import |
| `createTestWorker()` | Faithful in-process task-pool test adapter | Sync | Does not execute worker modules |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/familiar` | Pool factories, helpers, types, errors |
| `@vielzeug/familiar/protocol` | Versioned worker protocol and registration helpers |
| `@vielzeug/familiar/testing` | Task-pool testing adapter |

## Pool Factories

### `createWorker()`

```ts
function createWorker<TInput, TOutput>(url: URL | string, options?: WorkerOptions): WorkerPool<TInput, TOutput>;
```

Creates a task pool for a worker module registered with `exposeTask()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `url` | `URL \| string` | Module-worker URL, usually `new URL('./task.worker.ts', import.meta.url)` |
| `options` | `WorkerOptions` | Pool concurrency, queue, timeout, and worker-error policy |

**Returns:** `WorkerPool<TInput, TOutput>`.

**Example:**

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<number, number>(new URL('./double.worker.ts', import.meta.url));

try {
  console.log(await pool.run(21));
} finally {
  pool.dispose();
}
```

### `createStreamWorker()`

```ts
function createStreamWorker<TInput, TChunk>(url: URL | string, options?: WorkerOptions): StreamWorkerPool<TInput, TChunk>;
```

Creates a stream-only pool for a worker module registered with `exposeStream()`.

**Returns:** `StreamWorkerPool<TInput, TChunk>`.

---

### `batch()`

```ts
function batch<TInput, TOutput>(
  pool: WorkerPool<TInput, TOutput>,
  inputs: readonly TInput[],
  options?: BatchOptions,
): AsyncIterable<TOutput>;
```

Yields results in submission order. A failure or cancellation aborts remaining batch work.

**Returns:** `AsyncIterable<TOutput>`.

---

### `createTaskGroup()`

```ts
function createTaskGroup<TInput, TOutput>(
  pool: WorkerPool<TInput, TOutput>,
  name?: string,
  options?: TaskGroupOptions,
): TaskGroup<TInput, TOutput>;
```

Creates group-scoped cancellation and settlement tracking for one task pool.

**Returns:** `TaskGroup<TInput, TOutput>`.

## Testing

### `createTestWorker()`

```ts
function createTestWorker<TInput, TOutput>(
  handler: (input: TInput) => TOutput | Promise<TOutput>,
  options?: TestWorkerOptions,
): TestWorkerHandle<TInput, TOutput>;
```

Creates an in-process task-pool double. It structured-clones values, records settlement, and matches task-pool timeout and cancellation behavior without loading a worker module.

**Returns:** `TestWorkerHandle<TInput, TOutput>`.

## Worker Protocol

### `exposeTask()`

```ts
function exposeTask<TInput, TOutput>(handler: TaskHandler<TInput, TOutput>): void;
```

Registers one single-result handler in a module worker.

### `exposeStream()`

```ts
function exposeStream<TInput, TChunk>(handler: StreamHandler<TInput, TChunk>): void;
```

Registers one chunk-producing handler in a module worker.

### `PROTOCOL_VERSION`

```ts
const PROTOCOL_VERSION: 1;
```

Version included in every host request and worker response.

## Types

### `WorkerOptions`

```ts
type WorkerOptions = {
  concurrency?: number | 'auto';
  maxQueue?: number;
  onFull?: 'reject' | 'wait';
  timeout?: number;
  onSlotError?: (error: FamiliarRuntimeError) => void;
};
```

### `RunOptions`

```ts
type RunOptions = {
  priority?: number;
  signal?: AbortSignal;
  timeout?: number;
  transferables?: Transferable[];
};
```

`signal` cancels capacity waits, queued work, and executing work. Executing cancellation terminates and replaces its worker slot.

### `WorkerPool`

```ts
interface WorkerPool<TInput, TOutput> {
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  prime(): Promise<void>;
  drain(options?: DrainOptions): Promise<void>;
  dispose(): void;
  readonly stats: WorkerStats;
  readonly status: WorkerStatus;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
}
```

### `StreamWorkerPool`

```ts
interface StreamWorkerPool<TInput, TChunk> {
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
  runStream(input: TInput, options?: RunOptions): AsyncIterable<TChunk>;
  prime(): Promise<void>;
  drain(options?: DrainOptions): Promise<void>;
  dispose(): void;
  readonly stats: WorkerStats;
  readonly status: WorkerStatus;
}
```

### `WorkerStats`

```ts
type WorkerStats = {
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly queued: number;
};
```

### `WorkerStatus`

```ts
type WorkerStatus = 'idle' | 'running' | 'terminated';
```

### `BatchOptions`

```ts
type BatchOptions = RunOptions;
```

### `DrainOptions`

```ts
type DrainOptions = {
  timeout?: number;
};
```

### `TaskGroup`

```ts
type TaskGroup<TInput, TOutput> = {
  abort(reason?: unknown): void;
  drain(): Promise<PromiseSettledResult<TOutput>[]>;
  readonly name: string | undefined;
  readonly pending: number;
  run(input: TInput, options?: Omit<RunOptions, 'signal'>): Promise<TOutput>;
  readonly size: number;
};
```

### `TaskGroupOptions`

```ts
type TaskGroupOptions = {
  signal?: AbortSignal;
};
```

### `TestWorkerOptions`

```ts
type TestWorkerOptions = Omit<WorkerOptions, 'concurrency' | 'onSlotError'> & {
  concurrency?: number;
};
```

### `TestWorkerCall`

```ts
type TestWorkerCall<TInput, TOutput> =
  | { input: TInput; status: 'fulfilled'; value: TOutput }
  | { input: TInput; reason: unknown; status: 'rejected' };
```

### `TestWorkerHandle`

```ts
type TestWorkerHandle<TInput, TOutput> = WorkerPool<TInput, TOutput> & {
  readonly calls: ReadonlyArray<TestWorkerCall<TInput, TOutput>>;
};
```

### `SerializedError`

```ts
type SerializedError = {
  message: string;
  name: string;
  stack?: string;
};
```

### `WorkerRequest`

```ts
type WorkerRequest<TInput> =
  | { id: number; input: TInput; kind: 'run'; version: 1 }
  | { id: number; input: TInput; kind: 'stream'; version: 1 };
```

### `WorkerResponse`

```ts
type WorkerResponse<TOutput> =
  | { id: number; kind: 'chunk'; value: TOutput; version: 1 }
  | { error: SerializedError; id: number; kind: 'error'; version: 1 }
  | { id: number; kind: 'result'; value: TOutput; version: 1 };
```

### `TaskHandler` and `StreamHandler`

```ts
type TaskHandler<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;
type StreamHandler<TInput, TChunk> = (input: TInput) => AsyncIterable<TChunk> | Promise<AsyncIterable<TChunk>>;
```

## Errors

| Error | Trigger | Notable property |
| --- | --- | --- |
| `FamiliarError` | Base class for all Familiar errors | `FamiliarError.is(error)` |
| `FamiliarInvalidOptionsError` | Invalid factory or test options | — |
| `FamiliarQueueFullError` | Queue limit reached with `onFull: 'reject'` | `maxQueue` |
| `FamiliarTaskError` | Worker handler throws or payload cannot clone | `cause` |
| `FamiliarTimeoutError` | Task or drain deadline expires | `timeoutMs` |
| `FamiliarTerminatedError` | Pool is disposed or draining | — |
| `FamiliarRuntimeError` | Worker API or worker process fails | `cause` |
