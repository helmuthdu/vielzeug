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
| `runBatch()` | Yield ordered results with shared cancellation | Async iterable | Transferables need a per-input selector |
| `createTestWorker()` | Create an in-process task-pool test double | Sync | Task modules are not executed |
| `exposeTask()` | Register worker task handler | Sync | Worker-only import |
| `exposeStream()` | Register worker stream handler | Sync | Worker-only import |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/familiar` | Pool factories, types, and errors |
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

### `runBatch()`

```ts
function runBatch<TInput, TOutput>(
  pool: WorkerPool<TInput, TOutput>,
  inputs: readonly TInput[],
  options?: BatchOptions<TInput>,
): AsyncIterable<TOutput>;
```

Starts related pool tasks concurrently and yields results in input order. The first failure aborts siblings, early iterator exit cancels unfinished work, and cleanup waits for every task to settle. The iterable is one-shot once consumption begins; an unused iterator may be discarded.

Use `getTransferables(input, index)` to return a fresh transfer list for each task. A shared transfer list is intentionally unsupported because transferred values can be detached only once.

**Returns:** `AsyncIterable<TOutput>`.

## Testing

### `createTestWorker()`

```ts
function createTestWorker<TInput, TOutput>(
  handler: (input: TInput) => TOutput | Promise<TOutput>,
  options?: TestWorkerOptions,
): TestWorkerHandle<TInput, TOutput>;
```

Creates an in-process task-pool double. It structured-clones values, records settlement, and matches pool timeout and cancellation results without loading a worker module. Cancellation rejects the test task but cannot stop side effects inside an already-running in-process handler.

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

Version included in every host request and worker response. Identifiers must be non-negative safe integers. Task/stream capability mismatches return a protocol-category error that maps to `FamiliarRuntimeError`; malformed host responses reject active work with the same class.

## Types

### `BatchOptions`

```ts
type BatchOptions<TInput> = Pick<RunOptions, 'priority' | 'signal' | 'timeout'> & {
  getTransferables?: (input: TInput, index: number) => readonly Transferable[];
};
```

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

`concurrency` is limited to 512; `"auto"` clamps the reported hardware concurrency to that limit. `maxQueue` must be a positive integer and `onFull` must be `"reject"` or `"wait"`. Timeout values must be integer milliseconds from 1 through 2,147,483,647. `onSlotError` runs after active work settles, and callback failures cannot interrupt slot replacement.

### `RunOptions`

```ts
type RunOptions = {
  priority?: number;
  signal?: AbortSignal;
  timeout?: number;
  transferables?: readonly Transferable[];
};
```

`signal` cancels capacity waits, queued work, and executing work. Executing cancellation terminates and replaces its worker slot without incrementing `failed`. `priority` must be finite and timeout values use the same bounds as pool defaults. The transfer list is copied at submission. Queued inputs remain caller-owned until a slot dispatches them, so do not mutate input objects while work is queued.

### `WorkerPool`

```ts
interface WorkerPool<TInput, TOutput> {
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
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
  drain(options?: DrainOptions): Promise<void>;
  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  readonly stats: WorkerStats;
  readonly status: WorkerStatus;
}
```

`runStream()` returns a one-shot iterable. Consumption begins on the first iterator operation, so an unused iterator can be discarded. A second active iterator rejects with `FamiliarRuntimeError`, and `return()` immediately cancels a pending chunk request. Caller abort listeners are owned by the active iterator rather than an unconsumed iterable. Incoming chunks are buffered without protocol backpressure.

### `WorkerStats`

```ts
type WorkerStats = {
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly queued: number;
};
```

`queued` includes admitted queue entries and calls waiting for queue capacity. Cancellation is not counted as failure even when a caller supplies a custom abort reason.

### `RunningStream`

```ts
type RunningStream<TChunk> = {
  done: Promise<void>;
  iterable: AsyncIterable<TChunk>;
};
```

### `WorkerStatus`

```ts
type WorkerStatus = 'idle' | 'running' | 'terminated';
```

### `DrainOptions`

```ts
type DrainOptions = {
  timeout?: number;
};
```

`drain()` accepts no argument for an unbounded graceful drain. A supplied timeout must be an integer from 1 through 2,147,483,647; expiry disposes the pool and rejects with `FamiliarTimeoutError`.

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
  category?: 'protocol';
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
| `FamiliarError` | Base class for all Familiar errors | Use `instanceof FamiliarError` to narrow |
| `FamiliarInvalidOptionsError` | Invalid factory or test options | — |
| `FamiliarQueueFullError` | Queue limit reached with `onFull: 'reject'` | `maxQueue` |
| `FamiliarTaskError` | Worker handler throws or payload cannot clone | `cause` |
| `FamiliarTimeoutError` | Task or drain deadline expires | `timeoutMs` |
| `FamiliarTerminatedError` | Pool is disposed or draining | — |
| `FamiliarRuntimeError` | Worker API or worker process fails | `cause` |
