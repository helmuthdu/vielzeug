---
title: Workit — Usage Guide
description: Core concepts and patterns for workit — task functions, single workers, worker pools, timeouts, AbortSignal, external scripts, and testing.
---

# Workit Usage Guide

::: tip New to Workit?
Start with the [Overview](./index.md) for installation and a quick example, then come back here for in-depth patterns.
:::

[[toc]]

## Task Functions

A **task function** is a plain TypeScript function that takes one input and returns a value or Promise. This is what runs inside the Web Worker:

```ts
import type { TaskFn } from '@vielzeug/workit';

type Input = { data: number[] };
type Output = { mean: number; max: number };

const analyze: TaskFn<Input, Output> = ({ data }) => {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const max = Math.max(...data);
  return { mean, max };
};
```

Important constraints for native Worker execution:
- The function must be **self-contained** — it cannot close over variables from the outer scope
- It can use `async`/`await` and any Web API available inside a Worker context
- It cannot use DOM APIs (`document`, `window`, etc.)
- Inputs and outputs are serialized via `postMessage` (structured clone) — classes and functions are not cloneable

## Single Worker

`createWorker` creates a single worker backed by one Web Worker thread:

```ts
import { createWorker } from '@vielzeug/workit';

const worker = createWorker<number, number>((n) => n * n);

const result = await worker.run(9); // 81
worker.terminate();
```

Multiple tasks can be in-flight simultaneously; they're identified by internal IDs and resolved independently:

```ts
const [a, b, c] = await Promise.all([
  worker.run(10),
  worker.run(20),
  worker.run(30),
]);
```

Always call `terminate()` when the worker is no longer needed to free the Worker thread.

## Worker Pool

`createWorkerPool` manages N workers and an internal task queue. Tasks are dispatched to the next available slot; extras wait in-queue automatically:

```ts
import { createWorkerPool } from '@vielzeug/workit';

const pool = createWorkerPool<number, number>(
  (n) => computeExpensive(n),
  { size: 4 }, // 4 concurrent workers
);

// Single task
const result = await pool.run(42);

// Multiple tasks — results in input order, runs concurrently
const results = await pool.runAll([1, 2, 3, 4, 5, 6, 7, 8]);

pool.terminate();
```

The default pool size is `navigator.hardwareConcurrency ?? 4`.

## Timeouts

Pass a `timeout` (milliseconds) to reject tasks that take too long:

```ts
const worker = createWorker<string, string>(
  async (url) => fetch(url).then((r) => r.text()),
  { timeout: 5000 }, // reject after 5 seconds
);

try {
  const html = await worker.run('https://example.com');
} catch (err) {
  console.error(err.message); // "[workit] Task timed out after 5000ms"
}
```

Works the same way with pools:

```ts
const pool = createWorkerPool<Input, Output>(heavyFn, {
  size: 2,
  timeout: 10_000,
});
```

## AbortSignal

Pool tasks support the standard `AbortController` API. Aborting cancels tasks that are still **queued** (not yet dispatched to a worker):

```ts
const ac = new AbortController();
const pool = createWorkerPool<number, number>(heavyFn, { size: 1 });

// First task runs immediately
const first = pool.run(1);
// Second task is queued (pool is full)
const second = pool.run(2, ac.signal);

// Cancel the queued task
ac.abort();
await second; // rejects with DOMException: Aborted

await first;
pool.terminate();
```

Passing an already-aborted signal rejects immediately without queuing:

```ts
const ac = new AbortController();
ac.abort();
await pool.run(input, ac.signal); // rejects immediately
```

## Worker Status

`WorkerHandle` exposes a `status` property:

```ts
const worker = createWorker<number, number>((n) => n);

worker.status; // 'idle'
worker.run(42);
worker.status; // 'running'
// ...after task completes
worker.status; // 'idle'
worker.terminate();
worker.status; // 'terminated'
```

## Fallback Mode

When a Web Worker can't be created (no `Worker` global, `URL.createObjectURL` unavailable, Node.js, SSR), workit automatically falls back to running the task function as a regular async call in the main thread.

To opt out of the fallback and throw instead:

```ts
const worker = createWorker<number, number>(fn, { fallback: false });
// throws if Workers are unavailable
```

## External Scripts

Pass `scripts` to load external URLs into the Worker via `importScripts()` before the task function runs. This is how you give your worker access to third-party libraries that are not bundled into your app:

```ts
import { createWorker } from '@vielzeug/workit';

// lodash will be available as the global `_` inside the worker
const sum = createWorker<number[], number>(
  (nums) => _.sum(nums),
  { scripts: ['https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js'] },
);

const result = await sum.run([1, 2, 3, 4, 5]); // 15
sum.terminate();
```

Multiple URLs are loaded in order:

```ts
const worker = createWorker<Input, Output>(fn, {
  scripts: [
    'https://cdn.example.com/polyfill.js',
    'https://cdn.example.com/lib.js',
  ],
});
```

::: warning Fallback behaviour
In environments where native Workers are unavailable (SSR, Node.js, test environments), `importScripts` is not called — the task function runs in the main thread as-is. Make sure the libraries your task depends on are also available in the main thread if you need the fallback to work.
:::

Works identically with pools:

```ts
const pool = createWorkerPool<string, string>(
  (text) => _.camelCase(text),
  {
    size: 4,
    scripts: ['https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js'],
  },
);
```

## Testing

`createTestWorker` skips Worker creation entirely and runs the fn in the same thread. It records all successful calls for easy assertions:

```ts
import { createTestWorker } from '@vielzeug/workit';

type Input = { values: number[] };
type Output = { sum: number };

test('sum task', async () => {
  const { worker, calls, dispose } = createTestWorker<Input, Output>(
    ({ values }) => ({ sum: values.reduce((a, b) => a + b, 0) }),
  );

  const result = await worker.run({ values: [1, 2, 3] });
  expect(result).toEqual({ sum: 6 });
  expect(calls).toEqual([
    { input: { values: [1, 2, 3] }, output: { sum: 6 } },
  ]);

  dispose();
});
```

For pool behavior in tests, use `createWorkerPool` directly — it works with the main-thread fallback in test environments without any special setup.
