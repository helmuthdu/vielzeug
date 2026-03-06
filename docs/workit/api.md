---
title: Workit — API Reference
description: Complete API reference for workit with type signatures and parameter documentation.
---

# Workit API Reference

[[toc]]

## Types

### TaskFn

```ts
type TaskFn<TInput, TOutput> = (input: TInput) => TOutput | Promise<TOutput>;
```

The function that runs inside the Worker. Must be self-contained (no outer-scope closures for native Workers).

---

### WorkerStatus

```ts
type WorkerStatus = 'idle' | 'running' | 'terminated';
```

- **idle** — no pending tasks
- **running** — one or more tasks in flight
- **terminated** — `terminate()` was called; rejects all new `run()` calls

---

### WorkerOptions

```ts
type WorkerOptions = {
  timeout?: number;
  fallback?: boolean;
  scripts?: string[];
};
```

**Properties:**

- **timeout** _(optional)_ — Milliseconds before a task is rejected with a timeout error. Default: none (tasks wait indefinitely).
- **fallback** _(optional)_ — When `true` (default), run tasks in the main thread if Web Workers are unavailable. When `false`, throw if Workers can't be created.
- **scripts** _(optional)_ — Array of URLs loaded into the Worker via `importScripts()` before the task function executes. Use this to make third-party CDN libraries available as globals inside the worker. Not called in fallback (main-thread) mode.

---

### PoolOptions

```ts
type PoolOptions = WorkerOptions & {
  size?: number;
};
```

Extends `WorkerOptions` with:

- **size** _(optional)_ — Number of concurrent worker slots. Default: `navigator.hardwareConcurrency ?? 4`. Clamped to a minimum of 1.

---

### WorkerHandle

```ts
type WorkerHandle<TInput, TOutput> = {
  run(input: TInput): Promise<TOutput>;
  terminate(): void;
  readonly status: WorkerStatus;
};
```

Returned by `createWorker`.

---

### PoolHandle

```ts
type PoolHandle<TInput, TOutput> = {
  run(input: TInput, signal?: AbortSignal): Promise<TOutput>;
  runAll(inputs: TInput[], signal?: AbortSignal): Promise<TOutput[]>;
  terminate(): void;
  readonly size: number;
};
```

Returned by `createWorkerPool`.

---

### TestWorkerHandle

```ts
type TestWorkerHandle<TInput, TOutput> = {
  worker: WorkerHandle<TInput, TOutput>;
  calls: { input: TInput; output: TOutput }[];
  dispose(): void;
};
```

Returned by `createTestWorker`.

---

## createWorker

```ts
function createWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: WorkerOptions,
): WorkerHandle<TInput, TOutput>
```

Creates a single typed worker backed by a Web Worker thread (or main-thread fallback).

**Type Parameters:**

- **TInput** — Type of the task input.
- **TOutput** — Type of the task output.

**Parameters:**

- **fn** — The task function. Runs inside the Worker; must be self-contained.
- **options** _(optional)_ — `WorkerOptions`.

**Returns:** `WorkerHandle<TInput, TOutput>`

**Example:**

```ts
const worker = createWorker<{ nums: number[] }, number>(
  ({ nums }) => nums.reduce((a, b) => a + b, 0),
  { timeout: 3000 },
);

const result = await worker.run({ nums: [1, 2, 3] }); // 6
worker.terminate();
```

With external scripts:

```ts
const worker = createWorker<number[], number>(
  (nums) => _.sum(nums),
  { scripts: ['https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js'] },
);
```

---

## WorkerHandle Interface

### `run`

```ts
run(input: TInput): Promise<TOutput>
```

Submits the task for execution. Resolves with the function's return value. Rejects if the task throws, times out, or the worker is terminated.

---

### `terminate`

```ts
terminate(): void
```

Permanently terminates the worker. Any pending tasks are rejected with `"[workit] Worker was terminated"`. Calling `terminate()` on an already-terminated worker is a no-op.

---

### `status`

```ts
readonly status: WorkerStatus
```

Current state of the worker. Set synchronously — `'running'` immediately after `run()` is called.

---

## createWorkerPool

```ts
function createWorkerPool<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
  options?: PoolOptions,
): PoolHandle<TInput, TOutput>
```

Creates a pool of N workers with a shared task queue.

**Parameters:**

- **fn** — Task function shared by all workers in the pool.
- **options** _(optional)_ — `PoolOptions`.

**Returns:** `PoolHandle<TInput, TOutput>`

**Example:**

```ts
const pool = createWorkerPool<number, number>(
  (n) => fibonacci(n),
  { size: 4, timeout: 10_000 },
);

const results = await pool.runAll([35, 36, 37, 38, 39, 40]);
pool.terminate();
```

---

## PoolHandle Interface

### `run`

```ts
run(input: TInput, signal?: AbortSignal): Promise<TOutput>
```

Runs one task. If all workers are busy, the task is queued until a slot is free.

- **signal** _(optional)_ — An `AbortSignal`. If aborted while queued, the task is dequeued and the promise rejects with `DOMException('Aborted', 'AbortError')`. If the signal is already aborted when `run()` is called, rejects immediately.

---

### `runAll`

```ts
runAll(inputs: TInput[], signal?: AbortSignal): Promise<TOutput[]>
```

Runs all tasks concurrently (respecting pool size) and returns results **in input order**.

Equivalent to `Promise.all(inputs.map(i => pool.run(i, signal)))`.

---

### `terminate`

```ts
terminate(): void
```

Terminates all worker slots and rejects any queued tasks.

---

### `size`

```ts
readonly size: number
```

Number of worker slots in the pool.

---

## Testing Utilities

### createTestWorker

```ts
function createTestWorker<TInput, TOutput>(
  fn: TaskFn<TInput, TOutput>,
): TestWorkerHandle<TInput, TOutput>
```

Creates a test-friendly worker that runs `fn` directly in the current thread (no Worker creation) and records all successful calls.

**Returns:** `TestWorkerHandle<TInput, TOutput>` with:

- **worker** — A full `WorkerHandle<TInput, TOutput>` backed by direct `fn` invocation.
- **calls** — Array of `{ input, output }` pairs in call order. Failed tasks are not recorded.
- **dispose** — Terminates the worker (alias for `worker.terminate()`).

**Example:**

```ts
import { createTestWorker } from '@vielzeug/workit';

type Events = { value: number };

test('processes input correctly', async () => {
  const { worker, calls, dispose } = createTestWorker<number, number>((n) => n * 2);

  expect(await worker.run(5)).toBe(10);
  expect(await worker.run(7)).toBe(14);
  expect(calls).toEqual([
    { input: 5, output: 10 },
    { input: 7, output: 14 },
  ]);

  dispose();
});
```
